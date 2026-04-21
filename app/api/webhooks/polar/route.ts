import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { productIdToPlan } from "@/lib/polar";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  let event;
  try {
    event = validateEvent(body, headers, process.env.POLAR_WEBHOOK_SECRET!.trim());
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
    console.error("Webhook parse error:", error);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Idempotency guard: Polar retries with backoff and may deliver out of order.
  // Insert event_id first — if it already exists (unique violation), skip. This
  // means late retries of an older event do not overwrite newer state.
  const eventId = (event as { id?: string } | null)?.id;
  if (eventId) {
    const { error: dedupeErr } = await supabaseAdmin
      .from("webhook_events")
      .insert({ event_id: eventId, event_type: event.type });
    if (dedupeErr) {
      // 23505 = unique_violation in Postgres. Any other error is unexpected; log
      // and continue rather than block the webhook entirely.
      const code = (dedupeErr as { code?: string }).code;
      if (code === "23505") {
        return NextResponse.json({ received: true, deduped: true }, { status: 202 });
      }
      console.error("Webhook dedupe insert failed (continuing):", dedupeErr);
    }
  }

  try {
    switch (event.type) {
      case "subscription.created":
      case "subscription.updated":
      case "subscription.active":
      case "subscription.canceled":
      case "subscription.uncanceled": {
        // subscription.canceled fires when user schedules cancel. Polar keeps
        // status="active" until endsAt is reached. We persist cancelAtPeriodEnd
        // so the app can render "canceled, ends on X" without losing access.
        // subscription.uncanceled fires when user resumes before period end.
        const sub = event.data;
        const email = sub.customer?.email;
        if (!email) break;

        const userId = await findUserByEmail(email);
        if (!userId) {
          console.error("Polar webhook: no user found for email", email, "— returning 500 so Polar retries");
          return NextResponse.json({ error: "User not found" }, { status: 500 });
        }

        // Safety: a paid active sub mapping to "free" means a product-ID
        // mismatch (typically a trailing whitespace/newline on a Vercel env var
        // — POLAR_PRODUCT_*_ID). Return 500 so Polar retries after the fix,
        // and don't silently demote the user to free in the meantime.
        const mappedPlan = sub.product ? productIdToPlan(sub.product.id) : "free";
        if (sub.status === "active" && sub.product?.id && mappedPlan === "free") {
          console.error(
            `Polar webhook: active sub mapped to "free" — product id ${sub.product.id} doesn't match any POLAR_PRODUCT_*_ID env. Refusing to demote.`,
          );
          return NextResponse.json({ error: "Unknown product id" }, { status: 500 });
        }
        const plan = mappedPlan;

        const periodEnd = sub.currentPeriodEnd
          ? new Date(sub.currentPeriodEnd).toISOString()
          : null;

        const periodStart = sub.currentPeriodStart
          ? new Date(sub.currentPeriodStart).toISOString().slice(0, 10)
          : null;

        // Stale-write protection: Polar may deliver events out of order. We use
        // the subscription's modifiedAt as source of truth and only write if it's
        // at least as fresh as what we already have.
        const subModifiedAt = sub.modifiedAt
          ? new Date(sub.modifiedAt).toISOString()
          : new Date().toISOString();

        const { data: existingRow } = await supabaseAdmin
          .from("subscriptions")
          .select("updated_at")
          .eq("user_id", userId)
          .maybeSingle();

        if (existingRow?.updated_at && new Date(existingRow.updated_at) > new Date(subModifiedAt)) {
          console.warn(
            `Polar webhook: skipping stale event ${event.type} (event modifiedAt=${subModifiedAt} < db updated_at=${existingRow.updated_at})`,
          );
          break;
        }

        await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              plan,
              status: sub.status === "active" ? "active" : sub.status,
              cancel_at_period_end: sub.cancelAtPeriodEnd === true,
              stripe_customer_id: sub.customer?.id ?? null,
              stripe_subscription_id: sub.id,
              current_period_end: periodEnd,
              ...(periodStart ? { period_start: periodStart } : {}),
              updated_at: subModifiedAt,
            },
            { onConflict: "user_id" }
          );
        break;
      }

      case "subscription.revoked": {
        // subscription.revoked fires when access is actually removed (at endsAt,
        // or immediately on hard revoke / unpaid). This is the terminal state.
        // We reset plan="free" and clear the Polar subscription id so the app
        // treats the user as a fresh Free account going forward.
        const sub = event.data;
        const email = sub.customer?.email;
        if (!email) break;

        const userId = await findUserByEmail(email);
        if (!userId) {
          console.error("Polar webhook: no user found for email", email, "— returning 500 so Polar retries");
          return NextResponse.json({ error: "User not found" }, { status: 500 });
        }

        const subModifiedAt = sub.modifiedAt
          ? new Date(sub.modifiedAt).toISOString()
          : new Date().toISOString();

        // Stale guard: skip if a newer event already landed (e.g. a later
        // subscription.updated for a new sub using the same customer).
        const { data: existingRow } = await supabaseAdmin
          .from("subscriptions")
          .select("updated_at, stripe_subscription_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (existingRow?.updated_at && new Date(existingRow.updated_at) > new Date(subModifiedAt)) {
          console.warn(
            `Polar webhook revoked: skipping stale event (modifiedAt=${subModifiedAt} < db updated_at=${existingRow.updated_at})`,
          );
          break;
        }

        // Safety: only revoke if the event's subscription id matches what we
        // have on file. Prevents an old revoked event from wiping a freshly
        // created subscription.
        if (existingRow?.stripe_subscription_id && existingRow.stripe_subscription_id !== sub.id) {
          console.warn(
            `Polar webhook revoked: sub id mismatch (event=${sub.id}, db=${existingRow.stripe_subscription_id}) — skipping`,
          );
          break;
        }

        await supabaseAdmin
          .from("subscriptions")
          .update({
            plan: "free",
            status: "canceled",
            cancel_at_period_end: false,
            stripe_subscription_id: null,
            current_period_end: null,
            updated_at: subModifiedAt,
          })
          .eq("user_id", userId);
        break;
      }
    }

    return NextResponse.json({ received: true }, { status: 202 });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function findUserByEmail(email: string): Promise<string | null> {
  // Check profiles table first (faster, no admin API needed)
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (data?.id) return data.id;

  // Fallback: paginate through auth users (only hit if profiles table miss)
  let page = 1;
  const perPage = 50;
  while (true) {
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    const users = authData?.users ?? [];
    const match = users.find((u) => u.email === email);
    if (match) return match.id;
    if (users.length < perPage) break;
    page++;
  }
  return null;
}
