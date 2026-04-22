import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, priceIdToPlan, priceIdToInterval } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Stripe webhook handler — source of truth for subscription state.
//
// Pattern ported from the battle-tested Polar handler:
//   1. HMAC verification via stripe.webhooks.constructEvent (timestamp check
//      included — rejects replays older than 5 min by default).
//   2. Idempotency: check event.id against webhook_events table; skip if seen.
//      Insert AFTER successful processing so a thrown handler doesn't lock
//      out legitimate retries.
//   3. Stale-write guard: the Stripe Subscription's `updated` timestamp is
//      compared against our DB `updated_at` — out-of-order events are skipped.
//   4. User resolution (3-path): metadata.supabase_user_id first (trusted,
//      set at checkout), then stripe_customer_id lookup, then email with
//      hijack guard.

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!.trim(),
    );
  } catch (err) {
    console.error("Stripe webhook verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
  }

  // Idempotency check: if we've already processed this event, short-circuit.
  const { data: seen } = await supabaseAdmin
    .from("webhook_events")
    .select("event_id")
    .eq("event_id", event.id)
    .maybeSingle();
  if (seen) {
    return NextResponse.json({ received: true, deduped: true }, { status: 202 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpsert(event.data.object as Stripe.Subscription, event.created);
        break;

      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;

      case "invoice.paid":
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      case "charge.refunded":
        // Log only for now — refund policy TBD (revoke minutes or not).
        console.log(`Stripe webhook: charge.refunded ${(event.data.object as Stripe.Charge).id}`);
        break;

      default:
        // Unknown event — log and acknowledge so Stripe doesn't retry.
        console.log(`Stripe webhook: unhandled event type ${event.type}`);
    }

    // Record event_id after successful processing so retries of this exact
    // event are short-circuited at the top. If the insert races (concurrent
    // delivery), handlers are idempotent — next retry is a no-op.
    await supabaseAdmin
      .from("webhook_events")
      .insert({ event_id: event.id, event_type: event.type })
      .then(({ error }) => {
        if (error && (error as { code?: string }).code !== "23505") {
          console.error("Webhook dedupe insert failed:", error);
        }
      });

    return NextResponse.json({ received: true }, { status: 202 });
  } catch (error) {
    console.error("Stripe webhook handler error:", error);
    // Return 500 so Stripe retries (default: 3 times over ~72h with backoff).
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  // checkout.session.completed is the first event we get on a new signup.
  // We expand subscription + customer to write the full row immediately,
  // even before customer.subscription.created arrives. The subsequent events
  // will upsert the same row with up-to-date state (stale-write guard wins).
  if (session.mode !== "subscription" || !session.subscription) return;

  const userId =
    session.client_reference_id ??
    (session.metadata?.supabase_user_id as string | undefined) ??
    null;

  if (!userId) {
    console.error("Stripe webhook: checkout.session.completed with no user id", session.id);
    return;
  }

  const subscriptionId = typeof session.subscription === "string"
    ? session.subscription
    : session.subscription.id;
  const customerId = typeof session.customer === "string"
    ? session.customer
    : session.customer?.id ?? null;

  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  await writeSubscription(userId, sub, customerId);
}

async function handleSubscriptionUpsert(sub: Stripe.Subscription, eventCreated: number) {
  const userId = await resolveUserForSub(sub);
  if (!userId) {
    console.error(
      `Stripe webhook: could not resolve user for sub ${sub.id} customer=${sub.customer} — returning 500 so Stripe retries`,
    );
    throw new Error("User not found");
  }

  // Stale-write guard: the Stripe subscription carries no `updated` field,
  // but the webhook `event.created` is a unix timestamp of when Stripe
  // emitted it. Compare to our DB updated_at.
  const eventCreatedIso = new Date(eventCreated * 1000).toISOString();
  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("updated_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (
    existing?.updated_at &&
    new Date(existing.updated_at) > new Date(eventCreatedIso)
  ) {
    console.warn(
      `Stripe webhook: skipping stale event for ${userId} (event=${eventCreatedIso} < db=${existing.updated_at})`,
    );
    return;
  }

  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer.id;
  await writeSubscription(userId, sub, customerId, eventCreatedIso);
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  // Terminal state — access revoked (end of period reached, or hard cancel).
  // Reset plan to free and clear the Stripe subscription id so the app treats
  // the user as a fresh Free account.
  const userId = await resolveUserForSub(sub);
  if (!userId) {
    console.error(`Stripe webhook: cannot resolve user for deleted sub ${sub.id}`);
    throw new Error("User not found");
  }

  const { data: existing } = await supabaseAdmin
    .from("subscriptions")
    .select("stripe_subscription_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.stripe_subscription_id && existing.stripe_subscription_id !== sub.id) {
    console.warn(
      `Stripe webhook deleted: sub id mismatch (event=${sub.id}, db=${existing.stripe_subscription_id}) — skipping`,
    );
    return;
  }

  await supabaseAdmin
    .from("subscriptions")
    .update({
      plan: "free",
      status: "canceled",
      cancel_at_period_end: false,
      stripe_subscription_id: null,
      current_period_end: null,
      price_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
}

function getInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  // API 2024+: invoice.subscription removed, moved under parent.subscription_details.
  const sub = invoice.parent?.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  // Used for renewals + first payment confirmation. If subscription state
  // changed at this moment (new period_end), subscription.updated fires too,
  // so we're mostly a safety net here. Log for traceability.
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  if (!subscriptionId) return;
  console.log(
    `Stripe webhook: invoice.paid invoice=${invoice.id} sub=${subscriptionId} amount=${invoice.amount_paid}`,
  );
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  // Don't demote the user — Stripe retries automatically. The associated
  // subscription.updated event will set status=past_due and our banner UI
  // handles it. If retries are exhausted, subscription.deleted comes and
  // revokes access.
  const subscriptionId = getInvoiceSubscriptionId(invoice);
  console.warn(
    `Stripe webhook: invoice.payment_failed invoice=${invoice.id} sub=${subscriptionId}`,
  );
}

// Shared helper — writes a Stripe Subscription into our DB with all the fields
// we care about. Picks the first active item's price as the source for
// plan/interval/currency/price_id (we only ever ship one-item subscriptions).
async function writeSubscription(
  userId: string,
  sub: Stripe.Subscription,
  customerId: string | null,
  updatedAtIso?: string,
) {
  const item = sub.items.data[0];
  if (!item) {
    console.error(`Stripe webhook: subscription ${sub.id} has no items`);
    return;
  }

  const priceId = item.price.id;
  const plan = priceIdToPlan(priceId);
  const billingInterval = priceIdToInterval(priceId);
  const currency = (item.price.currency ?? "usd").toLowerCase();

  // Refuse to silently demote a paid active sub to "free" — same defensive
  // check we ran for Polar when an env-var typo broke productIdToPlan.
  if (sub.status === "active" && plan === "free") {
    console.error(
      `Stripe webhook: active sub ${sub.id} mapped to "free" — price id ${priceId} unknown. Refusing demote.`,
    );
    throw new Error("Unknown price id");
  }

  // Period dates moved from subscription root to items in API 2024+.
  const firstItem = sub.items.data[0];
  const periodEndIso = firstItem?.current_period_end
    ? new Date(firstItem.current_period_end * 1000).toISOString()
    : null;
  const periodStartDate = firstItem?.current_period_start
    ? new Date(firstItem.current_period_start * 1000).toISOString().slice(0, 10)
    : null;

  await supabaseAdmin
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        plan,
        status: sub.status,
        cancel_at_period_end: sub.cancel_at_period_end === true,
        stripe_customer_id: customerId,
        stripe_subscription_id: sub.id,
        current_period_end: periodEndIso,
        currency,
        billing_interval: billingInterval,
        price_id: priceId,
        ...(periodStartDate ? { period_start: periodStartDate } : {}),
        updated_at: updatedAtIso ?? new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
}

/**
 * Resolve the Supabase user for a Stripe subscription event.
 *
 * Priority (closes email-hijack vectors we fixed on Polar):
 *   1. sub.metadata.supabase_user_id — trusted, set at checkout creation
 *   2. stripe_customer_id already linked in our DB
 *   3. Email match, but only if the matched user has no DIFFERENT stripe
 *      customer id on file (prevents a new Stripe customer with the same
 *      email from hijacking the victim's subscription link)
 */
async function resolveUserForSub(sub: Stripe.Subscription): Promise<string | null> {
  const metadataUserId = (sub.metadata?.supabase_user_id as string | undefined) ?? null;
  const customerId = typeof sub.customer === "string" ? sub.customer : sub.customer?.id ?? null;

  // Path 1 — trusted metadata from checkout
  if (metadataUserId) {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("id", metadataUserId)
      .maybeSingle();
    if (data?.id) {
      // Defense in depth: cross-check email if we can fetch it from Stripe.
      // Skip in this function — fetching customer adds latency; only do it if
      // the metadata path fails and we fall through.
      return data.id;
    }
  }

  // Path 2 — Stripe customer already linked
  if (customerId) {
    const { data: existing } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    if (existing?.user_id) return existing.user_id;
  }

  // Path 3 — email match with hijack guard
  if (!customerId) return null;
  try {
    const customer = await stripe.customers.retrieve(customerId);
    if ((customer as Stripe.Customer).deleted) return null;
    const email = (customer as Stripe.Customer).email?.toLowerCase();
    if (!email) return null;

    const { data: userByEmail } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    if (!userByEmail?.id) return null;

    const { data: theirSub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", userByEmail.id)
      .maybeSingle();

    if (
      theirSub?.stripe_customer_id &&
      theirSub.stripe_customer_id !== customerId
    ) {
      console.error(
        `Stripe webhook: email ${email} → user ${userByEmail.id} but their stripe_customer_id ${theirSub.stripe_customer_id} ≠ event ${customerId}. Refusing to reassign.`,
      );
      return null;
    }
    return userByEmail.id;
  } catch (err) {
    console.error(`Stripe webhook: failed to retrieve customer ${customerId}`, err);
    return null;
  }
}
