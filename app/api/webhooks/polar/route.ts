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

        const userId = await resolveUserForSub(sub);
        if (!userId) {
          console.error(
            "Polar webhook: could not resolve user for sub",
            sub.id,
            "customerId=",
            sub.customer?.id,
            "externalId=",
            sub.customer?.externalId,
            "email=",
            sub.customer?.email,
            "— returning 500 so Polar retries",
          );
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

        const userId = await resolveUserForSub(sub);
        if (!userId) {
          console.error(
            "Polar webhook revoked: could not resolve user for sub",
            sub.id,
            "— returning 500 so Polar retries",
          );
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

/**
 * Resolve the Supabase user for an incoming Polar subscription event.
 *
 * Priority order (closes the email-hijack vector):
 *   1. sub.customer.externalId — we set this at checkout creation; it's the
 *      trusted link. If present but not found in profiles, refuse to fall back.
 *   2. sub.customer.id matches a subscriptions.stripe_customer_id row — this
 *      Polar customer is already linked to a Supabase user. Trust the link.
 *   3. Email match (case-insensitive), but only if the matched user does NOT
 *      already have a different stripe_customer_id on file. This prevents an
 *      attacker from registering a Polar account with a victim's email and
 *      overwriting their paid subscription row.
 */
async function resolveUserForSub(sub: {
  id?: string;
  customer?: {
    id?: string | null;
    email?: string | null;
    externalId?: string | null;
  } | null;
}): Promise<string | null> {
  const polarCustomerId = sub.customer?.id ?? null;
  const externalId = sub.customer?.externalId ?? null;
  const email = sub.customer?.email?.toLowerCase() ?? null;

  // Path 1 — trusted: externalCustomerId set at checkout creation.
  if (externalId) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", externalId)
      .maybeSingle();
    if (data?.id) return data.id;
    // externalId was forged or points to a deleted user. Don't silently fall
    // through to email match — that's exactly the hijack vector we're closing.
    return null;
  }

  // Path 2 — Polar customer already linked in our DB.
  if (polarCustomerId) {
    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", polarCustomerId)
      .maybeSingle();
    if (existing?.user_id) return existing.user_id;
  }

  // Path 3 — email match (first-ever sub, legacy customer).
  if (!email) return null;

  const { data: userByEmail } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .ilike("email", email)
    .maybeSingle();

  if (!userByEmail?.id) return null;

  const { data: theirSub } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userByEmail.id)
    .maybeSingle();

  // Hijack guard: if this Supabase user already has a different Polar customer
  // on file, refuse — don't let a new Polar customer with the same email
  // overwrite an existing paid subscription link.
  if (
    theirSub?.stripe_customer_id &&
    polarCustomerId &&
    theirSub.stripe_customer_id !== polarCustomerId
  ) {
    console.error(
      `Polar webhook: email ${email} → user ${userByEmail.id} but their stripe_customer_id ${theirSub.stripe_customer_id} ≠ event ${polarCustomerId}. Refusing to reassign.`,
    );
    return null;
  }

  return userByEmail.id;
}
