import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLANS, type PlanId, type BillingPeriod } from "@/lib/plans";
import { polar, getProductId } from "@/lib/polar";

// Proration preview for a subscription change.
// Prices and currency come from Polar (per-product pricing).
// Math: credit = currentPrice × (daysRemaining / daysInPeriod), charge = targetPrice × ratio.
// This is an approximation — Polar may use finer time granularity or different rounding.

type Body = { plan: PlanId; billing: BillingPeriod };

type ChangeKind = "new" | "upgrade" | "downgrade" | "billing_switch" | "same" | "resume";

function planRank(plan: PlanId): number {
  return plan === "free" ? 0 : plan === "pro" ? 1 : 2;
}

/** Pull first fixed-price amount (minor units) + currency from a Polar product. */
async function getProductPrice(productId: string): Promise<{ amount: number; currency: string } | null> {
  try {
    const product = await polar.products.get({ id: productId });
    const price = product.prices?.[0];
    if (!price) return null;
    const amount = (price as { priceAmount?: number }).priceAmount ?? 0;
    const currency = (price as { priceCurrency?: string }).priceCurrency ?? "USD";
    return { amount, currency: currency.toUpperCase() };
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Body;
    if (!body?.plan || (body.plan !== "pro" && body.plan !== "studio")) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (body.billing !== "monthly" && body.billing !== "annual") {
      return NextResponse.json({ error: "Invalid billing period" }, { status: 400 });
    }

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, status, period_start, current_period_end, stripe_subscription_id, cancel_at_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentPlan = (sub?.status === "active" ? (sub?.plan as PlanId) : "free") ?? "free";
    const isCanceledButActive = sub?.status === "active" && sub?.cancel_at_period_end === true;
    const targetPlan = body.plan;
    const targetBilling = body.billing;
    const targetProductId = getProductId(targetPlan, targetBilling);

    const targetPrice = await getProductPrice(targetProductId);
    if (!targetPrice) {
      console.error("Preview: failed to fetch Polar product price", { targetProductId });
      return NextResponse.json(
        { error: "Unable to fetch pricing. Please try again." },
        { status: 502 },
      );
    }
    const targetAmountMinor = targetPrice.amount;
    const targetCurrency = targetPrice.currency;

    const toMajor = (minor: number) => Math.round(minor) / 100;

    if (currentPlan === "free") {
      const targetLabel = PLANS[targetPlan].label;
      const perPeriodPhrase = targetBilling === "annual" ? "per year" : "per month";
      const priceStr = `${targetCurrency} ${toMajor(targetAmountMinor).toFixed(2)}`;
      return NextResponse.json({
        kind: "new" as ChangeKind,
        currentPlan,
        targetPlan,
        targetBilling,
        creditMajor: 0,
        chargeMajor: toMajor(targetAmountMinor),
        netMajor: toMajor(targetAmountMinor),
        perPeriodMajor: toMajor(targetAmountMinor),
        currency: targetCurrency,
        subtitle: `${priceStr} ${perPeriodPhrase} • ${PLANS[targetPlan].minutesIncluded} min/month`,
        notice: `You'll be charged ${priceStr} today for your first ${targetBilling === "annual" ? "year" : "month"} of ${targetLabel}. Tax may apply.`,
      });
    }

    let currentBilling: BillingPeriod = "monthly";
    let currentAmountMinor = 0;
    let currentCurrency = targetCurrency;
    if (sub?.stripe_subscription_id) {
      try {
        const polarSub = await polar.subscriptions.get({ id: sub.stripe_subscription_id });
        if (polarSub.recurringInterval === "year") currentBilling = "annual";
        const amt = polarSub.amount;
        const cur = polarSub.currency;
        if (typeof amt === "number") currentAmountMinor = amt;
        if (typeof cur === "string") currentCurrency = cur.toUpperCase();
      } catch (err) {
        console.error("Preview: failed to fetch current subscription from Polar", err);
      }
    }
    // If Polar didn't give us the current sub amount (rate limit, transient error),
    // we skip the credit line rather than mixing currencies. Polar still applies
    // real proration on the actual update call — the UI just won't preview it.
    const missingCurrentAmount = currentAmountMinor === 0;

    // If the two prices are in different currencies we can't honestly do proration math.
    // Show charge only (no credit) and warn — this is cosmetic; Polar still applies real proration.
    const sameCurrency = currentCurrency === targetCurrency;
    const displayCurrency = targetCurrency;

    if (currentPlan === targetPlan && currentBilling === targetBilling) {
      // Same plan + same billing: normally "same" (no-op). But if user has canceled
      // at period end, the right action is "resume" — they can keep this plan by
      // unscheduling the cancel. No prorated charge, no credit.
      if (isCanceledButActive) {
        return NextResponse.json({
          kind: "resume" as ChangeKind,
          currentPlan,
          currentBilling,
          targetPlan,
          targetBilling,
          creditMajor: 0,
          chargeMajor: 0,
          netMajor: 0,
          perPeriodMajor: toMajor(targetAmountMinor),
          currency: displayCurrency,
          notice: "Your subscription will continue without interruption.",
        });
      }
      return NextResponse.json({
        kind: "same" as ChangeKind,
        currentPlan,
        currentBilling,
        targetPlan,
        targetBilling,
        creditMajor: 0,
        chargeMajor: 0,
        netMajor: 0,
        perPeriodMajor: toMajor(targetAmountMinor),
        currency: displayCurrency,
        notice: "You are already on this plan.",
      });
    }

    const periodEndStr = sub?.current_period_end ?? null;
    const periodStartStr = sub?.period_start ?? null;

    let daysRemaining = 30;
    let daysInPeriod = 30;
    if (periodEndStr && periodStartStr) {
      const start = new Date(periodStartStr + "T00:00:00").getTime();
      const end = new Date(periodEndStr).getTime();
      const now = Date.now();
      daysInPeriod = Math.max(1, Math.round((end - start) / 86400000));
      daysRemaining = Math.max(0, Math.round((end - now) / 86400000));
    }

    const ratio = daysInPeriod > 0 ? daysRemaining / daysInPeriod : 0;

    // Credit fallback: if Polar didn't return the current sub amount or currencies
    // differ, estimate from the plan config so the modal still shows a breakdown.
    // Polar will apply the real proration at update time regardless of this estimate.
    let creditBaseMinor = currentAmountMinor;
    let creditIsEstimate = false;
    if (!sameCurrency || missingCurrentAmount) {
      const planCfg = PLANS[currentPlan];
      const monthlyMajor = currentBilling === "annual" ? planCfg.yearlyPriceUSD : planCfg.priceUSD;
      creditBaseMinor = Math.round(monthlyMajor * 100);
      creditIsEstimate = true;
    }

    // Determine kind first so we can pick the right proration formula.
    let kind: ChangeKind;
    if (currentPlan === targetPlan) kind = "billing_switch";
    else if (planRank(targetPlan) > planRank(currentPlan)) kind = "upgrade";
    else kind = "downgrade";

    // Proration math:
    //   - Credit = currentPrice × (daysRemaining_current / daysInPeriod_current)
    //     (user paid for the old plan; we credit the unused remainder)
    //   - For a tier upgrade on the SAME billing cycle (e.g. Pro monthly → Studio
    //     monthly), we prorate the target too (user pays delta for the remainder
    //     of the month).
    //   - For a billing_switch (e.g. Pro monthly → Pro annual), the new period
    //     STARTS FRESH — charge the full new-plan price, don't prorate.
    const creditMinor = Math.round(creditBaseMinor * ratio);
    const chargeMinor = kind === "billing_switch"
      ? targetAmountMinor                         // new cycle starts fresh (full price)
      : Math.round(targetAmountMinor * ratio);    // tier change mid-period
    const netMinor = chargeMinor - creditMinor;

    // Minutes warning for downgrade: if the user's current rollover + used balance
    // exceeds the new plan quota, minutes above the cap will be forfeited (per
    // ensure_period_with_rollover RPC — rollover capped to new plan_minutes).
    let minutesLost = 0;
    if (kind === "downgrade") {
      const { data: usageRow } = await supabaseAdmin
        .from("usage")
        .select("rollover_minutes, tracks_used")
        .eq("user_id", user.id)
        .eq("month", sub?.period_start ?? new Date().toISOString().slice(0, 10))
        .maybeSingle();
      const currentRollover = Number(usageRow?.rollover_minutes ?? 0);
      const currentMonthUsed = Number(usageRow?.tracks_used ?? 0);
      const currentPlanMinutes = PLANS[currentPlan].minutesIncluded;
      const newPlanMinutes = PLANS[targetPlan].minutesIncluded;
      // What would carry into the new period: unused portion of current period + rollover,
      // capped at the NEW plan quota.
      const unusedCurrent = Math.max(0, currentPlanMinutes + currentRollover - currentMonthUsed);
      minutesLost = Math.max(0, unusedCurrent - newPlanMinutes);
    }

    // Build notice + subtitle specific to the kind. Avoid generic "a credit will be
    // applied" messaging — users want to know what happens today and going forward.
    const currentLabel = PLANS[currentPlan].label;
    const targetLabel = PLANS[targetPlan].label;
    const perPeriodPhrase = targetBilling === "annual" ? "per year" : "per month";
    const perPeriod = toMajor(targetAmountMinor).toFixed(2);

    let subtitle: string;
    let notice: string;
    if (kind === "upgrade") {
      subtitle = `Effective immediately. Net prorated charge today.`;
      notice = `Credit for ${daysRemaining} unused day${daysRemaining === 1 ? "" : "s"} on ${currentLabel} applied. From next cycle: ${targetCurrency} ${perPeriod} ${perPeriodPhrase}.`;
    } else if (kind === "downgrade") {
      // With prorationBehavior:"prorate" Polar defers credit/charge to the NEXT
      // invoice — nothing is charged today. Wording must reflect that.
      subtitle = `Change takes effect now. No charge today.`;
      const base = `Your next invoice will be ${targetCurrency} ${perPeriod} for ${targetLabel} (${perPeriodPhrase}). Unused ${currentLabel} time is credited against that invoice, not refunded.`;
      notice = Math.round(minutesLost) >= 1
        ? `You will lose ${Math.round(minutesLost)} rollover minute${Math.round(minutesLost) === 1 ? "" : "s"} above the ${targetLabel} quota (${PLANS[targetPlan].minutesIncluded} min/month). ${base}`
        : base;
    } else if (kind === "billing_switch") {
      // No subtitle — title already says "Switch to Pro annual" etc.
      subtitle = "";
      notice = targetBilling === "annual"
        ? `New annual cycle starts today — you save 30% vs monthly.`
        : `New monthly cycle starts today.`;
    } else if (kind === "resume") {
      subtitle = `No charge. Subscription continues.`;
      notice = `Your ${currentLabel} subscription will renew as scheduled.`;
    } else if (kind === "same") {
      subtitle = `Already on this plan.`;
      notice = `No changes will be made.`;
    } else {
      subtitle = `${targetCurrency} ${perPeriod} ${perPeriodPhrase}.`;
      notice = `Tax may apply based on your billing country.`;
    }

    if (creditIsEstimate && (kind === "upgrade" || kind === "downgrade" || kind === "billing_switch")) {
      notice += ` Credit is an estimate — Polar applies the exact proration on the invoice.`;
    }
    if (!sameCurrency && (kind === "upgrade" || kind === "downgrade" || kind === "billing_switch")) {
      notice += ` Currency differs (${currentCurrency} → ${targetCurrency}) — Polar converts at transaction time.`;
    }

    return NextResponse.json({
      kind,
      currentPlan,
      currentBilling,
      targetPlan,
      targetBilling,
      daysRemaining,
      daysInPeriod,
      creditMajor: toMajor(creditMinor),
      chargeMajor: toMajor(chargeMinor),
      netMajor: toMajor(netMinor),
      perPeriodMajor: toMajor(targetAmountMinor),
      currency: displayCurrency,
      creditIsEstimate,
      minutesLost,
      subtitle,
      notice,
    });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json({ error: "Failed to compute preview" }, { status: 500 });
  }
}
