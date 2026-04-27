import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe, getPriceId, STRIPE_PRICES } from "@/lib/stripe";
import { getAuthUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PlanId, BillingPeriod } from "@/lib/plans";

// Apply a subscription change for an existing customer.
//
//   Action             | Stripe call
//   ─────────────────────────────────────────────────────────────────────────
//   cancel             | subscriptions.update(cancel_at_period_end=true)
//   resume             | subscriptions.update(cancel_at_period_end=false)
//   upgrade            | subscriptions.update(items, proration='always_invoice')
//   billing_switch annual  | idem upgrade (new annual cycle starts today)
//   downgrade same-interval| subscriptions.update(items, proration='none',
//                             billing_cycle_anchor='unchanged') — effect at
//                             next renewal, no charge today
//   downgrade cross-interval (annual→monthly)
//                      | subscriptionSchedules for clean phase boundary
//
// The authoritative source of truth remains Stripe webhooks. We do an
// optimistic DB write from the API response to avoid a visible lag in the
// UI, but webhooks re-sync within seconds.

type Body = {
  plan: PlanId;
  billing: BillingPeriod;
  action?: "change" | "cancel" | "resume";
  discountCode?: string;
  // Unix timestamp from /api/subscription/preview. When provided, Stripe
  // calculates the proration as of that exact moment — guaranteeing the
  // invoice total matches what the modal displayed. Without this, the few
  // seconds between preview and confirm produce a small drift (extra credit
  // for elapsed unused time). See:
  // https://docs.stripe.com/billing/subscriptions/prorations#preview-the-prorations
  prorationDate?: number;
};

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Body;
    const action = body.action ?? "change";

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, status, stripe_subscription_id, stripe_customer_id, cancel_at_period_end, billing_interval")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found. Use /api/checkout for first-time purchase." },
        { status: 404 },
      );
    }

    if (action === "cancel") {
      const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: true,
      });
      return NextResponse.json({
        ok: true,
        action: "canceled",
        endsAt: updated.items.data[0]?.current_period_end ? new Date(updated.items.data[0].current_period_end * 1000).toISOString() : null,
      });
    }

    if (action === "resume") {
      const updated = await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: false,
      });
      return NextResponse.json({
        ok: true,
        action: "resumed",
        currentPeriodEnd: updated.items.data[0]?.current_period_end ? new Date(updated.items.data[0].current_period_end * 1000).toISOString() : null,
      });
    }

    if (body.plan !== "pro" && body.plan !== "studio") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (body.billing !== "monthly" && body.billing !== "annual") {
      return NextResponse.json({ error: "Invalid billing period" }, { status: 400 });
    }

    const targetPriceId = getPriceId(body.plan, body.billing);

    const currentSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const item = currentSub.items.data[0];
    if (!item) {
      return NextResponse.json({ error: "Subscription has no items" }, { status: 500 });
    }
    const currentPriceId = item.price.id;

    if (currentPriceId === targetPriceId && !sub.cancel_at_period_end) {
      return NextResponse.json({ error: "Already on this plan", action: "same" }, { status: 400 });
    }

    // If user had canceled and selects the same plan, just uncancel — no
    // product change needed.
    if (currentPriceId === targetPriceId && sub.cancel_at_period_end) {
      await stripe.subscriptions.update(sub.stripe_subscription_id, {
        cancel_at_period_end: false,
      });
      await supabaseAdmin
        .from("subscriptions")
        .update({ cancel_at_period_end: false, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      return NextResponse.json({
        ok: true,
        action: "resumed",
        plan: body.plan,
        billing: body.billing,
      });
    }

    const tier = (pid: string): number => {
      if (pid === STRIPE_PRICES.studio_monthly || pid === STRIPE_PRICES.studio_annual) return 2;
      if (pid === STRIPE_PRICES.pro_monthly || pid === STRIPE_PRICES.pro_annual) return 1;
      return 0;
    };
    const isAnnualCurrent =
      currentPriceId === STRIPE_PRICES.pro_annual || currentPriceId === STRIPE_PRICES.studio_annual;
    const isAnnualTarget =
      targetPriceId === STRIPE_PRICES.pro_annual || targetPriceId === STRIPE_PRICES.studio_annual;
    const intervalChanged = isAnnualCurrent !== isAnnualTarget;

    // Downgrade logic:
    //   - tier goes down         → downgrade
    //   - same tier, annual→monthly → downgrade (less commitment)
    //   - tier up OR monthly→annual → upgrade (charge now)
    const isDowngrade =
      tier(targetPriceId) < tier(currentPriceId) ||
      (tier(targetPriceId) === tier(currentPriceId) && isAnnualCurrent && !isAnnualTarget);

    // Uncancel upfront if needed (one atomic update can do uncancel + product
    // change thanks to Stripe's richer API — no rollback gymnastics).
    const needsUncancel = sub.cancel_at_period_end === true;

    // Note: body.prorationDate is intentionally ignored on the downgrade
    // branches below — they use proration_behavior 'none' (no charge today),
    // so there's nothing to align with the preview.
    let updatedSub: Stripe.Subscription;
    if (isDowngrade && intervalChanged) {
      // Annual → monthly: use a schedule so the new phase cleanly starts at
      // the next period boundary. Simpler alternatives don't cleanly handle
      // the cycle reset.
      const existingScheduleId =
        typeof currentSub.schedule === "string" ? currentSub.schedule : currentSub.schedule?.id;
      if (existingScheduleId) {
        // Release any existing schedule first — rare but possible if a prior
        // downgrade was scheduled and the user changed their mind.
        await stripe.subscriptionSchedules.release(existingScheduleId);
      }
      const schedule = await stripe.subscriptionSchedules.create({
        from_subscription: sub.stripe_subscription_id,
      });
      const currentPhase = schedule.phases[0];
      await stripe.subscriptionSchedules.update(schedule.id, {
        phases: [
          {
            items: [{ price: currentPriceId, quantity: 1 }],
            start_date: currentPhase.start_date,
            end_date: currentPhase.end_date,
          },
          {
            items: [{ price: targetPriceId, quantity: 1 }],
            proration_behavior: "none",
          },
        ],
      });
      // Schedule is set — pull the latest sub state for the DB write.
      updatedSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    } else if (isDowngrade) {
      // Same interval, tier goes down — simple update with no proration.
      updatedSub = await stripe.subscriptions.update(sub.stripe_subscription_id, {
        items: [{ id: item.id, price: targetPriceId }],
        proration_behavior: "none",
        billing_cycle_anchor: "unchanged",
        ...(needsUncancel ? { cancel_at_period_end: false } : {}),
      });
    } else {
      // Upgrade (tier up, or monthly→annual same tier) — charge prorata now.
      // payment_behavior: 'default_incomplete' surfaces SCA/3DS challenges
      // cleanly: sub.status = 'incomplete' + latest_invoice.confirmation_secret
      // carries the client_secret the frontend uses to confirm.
      //
      // Optional discountCode: resolved via promotion_codes.list(active=true)
      // then attached via the `discounts` param. Because we use
      // proration_behavior: 'always_invoice', the discount is applied to the
      // proration invoice immediately — not deferred to next cycle (unlike
      // the old Polar behavior which was spec'd the other way).
      let resolvedCoupon: string | undefined;
      if (body.discountCode && body.discountCode.trim()) {
        try {
          const search = await stripe.promotionCodes.list({
            code: body.discountCode.trim(),
            active: true,
            limit: 1,
          });
          const promo = search.data[0];
          if (!promo) {
            return NextResponse.json({ error: "Invalid or expired promo code" }, { status: 400 });
          }
          const couponRef = promo.promotion?.coupon;
          resolvedCoupon = typeof couponRef === "string" ? couponRef : couponRef?.id;
          if (!resolvedCoupon) {
            return NextResponse.json({ error: "Promo code has no coupon" }, { status: 400 });
          }
        } catch {
          return NextResponse.json({ error: "Failed to validate promo code" }, { status: 400 });
        }
      }

      // Drop a stale prorationDate. Stripe rejects timestamps older than the
      // current period (and gets cranky about anything > ~1h). If the user
      // left the modal open for hours, fall back to "now" — accept the small
      // drift over surfacing a 502.
      const FRESH_PRORATION_WINDOW_SEC = 50 * 60;
      const nowSec = Math.floor(Date.now() / 1000);
      const freshProrationDate =
        typeof body.prorationDate === "number"
        && nowSec - body.prorationDate < FRESH_PRORATION_WINDOW_SEC
          ? body.prorationDate
          : undefined;

      updatedSub = await stripe.subscriptions.update(sub.stripe_subscription_id, {
        items: [{ id: item.id, price: targetPriceId }],
        proration_behavior: "always_invoice",
        payment_behavior: "default_incomplete",
        expand: ["latest_invoice.confirmation_secret"],
        ...(typeof freshProrationDate === "number" ? { proration_date: freshProrationDate } : {}),
        ...(resolvedCoupon ? { discounts: [{ coupon: resolvedCoupon }] } : {}),
        ...(needsUncancel ? { cancel_at_period_end: false } : {}),
      });

      const latestInvoice = updatedSub.latest_invoice;
      if (
        typeof latestInvoice !== "string" &&
        latestInvoice?.confirmation_secret?.client_secret &&
        updatedSub.status === "incomplete"
      ) {
        // 3DS / SCA challenge required — return the client secret so the
        // frontend can open Stripe's confirm flow. DB write deferred until
        // webhook invoice.paid arrives.
        return NextResponse.json({
          ok: true,
          action: "requires_action",
          clientSecret: latestInvoice.confirmation_secret.client_secret,
          plan: body.plan,
          billing: body.billing,
        });
      }
    }

    // Optimistic DB write — webhook will re-sync shortly.
    // Period dates live on subscription items in API 2024+ (not the root).
    const firstItem = updatedSub.items.data[0];
    const newPeriodEnd = firstItem?.current_period_end
      ? new Date(firstItem.current_period_end * 1000).toISOString()
      : null;
    const newPeriodStart = firstItem?.current_period_start
      ? new Date(firstItem.current_period_start * 1000).toISOString().slice(0, 10)
      : null;
    await supabaseAdmin
      .from("subscriptions")
      .update({
        plan: body.plan,
        status: updatedSub.status,
        cancel_at_period_end: updatedSub.cancel_at_period_end === true,
        currency: (updatedSub.items.data[0]?.price.currency ?? "usd").toLowerCase(),
        billing_interval: body.billing === "annual" ? "year" : "month",
        price_id: updatedSub.items.data[0]?.price.id ?? targetPriceId,
        updated_at: new Date().toISOString(),
        ...(newPeriodEnd ? { current_period_end: newPeriodEnd } : {}),
        ...(newPeriodStart ? { period_start: newPeriodStart } : {}),
      })
      .eq("user_id", user.id);

    return NextResponse.json({
      ok: true,
      action: isDowngrade ? "downgrade_scheduled" : "plan_changed",
      plan: body.plan,
      billing: body.billing,
      currentPeriodEnd: newPeriodEnd,
    });
  } catch (error) {
    console.error("Subscription change error:", error);
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }
    const msg = error instanceof Error ? error.message : "Failed to change subscription";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
