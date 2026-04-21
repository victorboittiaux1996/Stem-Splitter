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
    let currentCustomerId: string | null = null;
    let currentDiscountPct = 0; // 0..1, e.g. 0.9 for 90% off
    // Polar period boundaries (to the second) — matches the server-side proration
    // factor. Falls back to DB YYYY-MM-DD dates if the API call fails.
    let polarPeriodStartMs: number | null = null;
    let polarPeriodEndMs: number | null = null;
    if (sub?.stripe_subscription_id) {
      try {
        const polarSub = await polar.subscriptions.get({ id: sub.stripe_subscription_id });
        if (polarSub.recurringInterval === "year") currentBilling = "annual";
        const amt = polarSub.amount;
        const cur = polarSub.currency;
        if (typeof amt === "number") currentAmountMinor = amt;
        if (typeof cur === "string") currentCurrency = cur.toUpperCase();
        currentCustomerId = polarSub.customerId ?? null;
        if (polarSub.currentPeriodStart) {
          polarPeriodStartMs = new Date(polarSub.currentPeriodStart).getTime();
        }
        if (polarSub.currentPeriodEnd) {
          polarPeriodEndMs = new Date(polarSub.currentPeriodEnd).getTime();
        }

        // Read existing discount. Polar's proration formula subtracts the
        // discount from the base BEFORE multiplying by the proration factor on
        // both credit and debit lines (verified against polarsource/polar
        // server/polar/subscription/update.py). Our currentAmountMinor already
        // reflects the post-discount recurring amount, so for the credit line
        // we just multiply by ratio. For the charge line we apply the discount
        // explicitly to the target product's sticker price.
        const discountId = (polarSub as { discountId?: string | null }).discountId;
        if (discountId) {
          try {
            const discount = await polar.discounts.get({ id: discountId });
            const type = (discount as { type?: string }).type;
            const basisPoints = (discount as { basisPoints?: number }).basisPoints;
            if (type === "percentage" && typeof basisPoints === "number") {
              currentDiscountPct = Math.max(0, Math.min(1, basisPoints / 10000));
            }
          } catch {
            // Discount removed / not accessible — continue without it.
          }
        }
      } catch (err) {
        console.error("Preview: failed to fetch current subscription from Polar", err);
      }
    }

    // VAT rate is stable per customer (tied to their billing address, not to the
    // plan). Derive from the last paid order — that's exactly the rate Polar
    // will apply to this new invoice. For B2B customers with a valid VAT ID,
    // tax_amount is 0 → rate 0 → we correctly skip tax.
    let vatRate = 0;
    let vatKnown = false;
    if (currentCustomerId) {
      try {
        const orders = await polar.orders.list({ customerId: [currentCustomerId], limit: 3 });
        const items = (orders as { result?: { items?: Array<unknown> } }).result?.items ?? [];
        // Pick the first order with a plausible breakdown (netAmount > 0).
        for (const raw of items) {
          const o = raw as { netAmount?: number; taxAmount?: number };
          if (typeof o.netAmount === "number" && typeof o.taxAmount === "number" && o.netAmount > 0) {
            const rate = o.taxAmount / o.netAmount;
            // Sanity bounds — real VAT rates are 0–27% (Hungary highest in EU).
            if (rate >= 0 && rate <= 0.35) {
              vatRate = rate;
              vatKnown = true;
              break;
            }
          }
        }
      } catch {
        // Swallow — VAT fallback "+ tax at checkout" is handled in the notice.
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

    // Proration factor to the second — matches Polar's server-side math:
    //   proration_factor = (period_end - now).total_seconds() / (period_end - period_start).total_seconds()
    // Prefer the Polar subscription's exact timestamps over our DB's date-only
    // column (periodStartStr is YYYY-MM-DD, which drops sub-day precision).
    let totalSeconds = 30 * 86400;
    let remainingSeconds = 30 * 86400;
    if (polarPeriodStartMs !== null && polarPeriodEndMs !== null) {
      totalSeconds = Math.max(1, (polarPeriodEndMs - polarPeriodStartMs) / 1000);
      remainingSeconds = Math.max(0, (polarPeriodEndMs - Date.now()) / 1000);
    } else if (periodEndStr && periodStartStr) {
      // Fallback: DB values. UTC to avoid ±1 day TZ slide.
      const start = new Date(periodStartStr + "T00:00:00Z").getTime();
      const end = new Date(periodEndStr).getTime();
      totalSeconds = Math.max(1, (end - start) / 1000);
      remainingSeconds = Math.max(0, (end - Date.now()) / 1000);
    }
    const ratio = totalSeconds > 0 ? remainingSeconds / totalSeconds : 0;
    const daysInPeriod = Math.max(1, Math.round(totalSeconds / 86400));
    const daysRemaining = Math.max(0, Math.round(remainingSeconds / 86400));

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

    // Proration math — ports Polar's exact formula from
    // server/polar/subscription/update.py (open source):
    //
    //   credit_line = round((current_base - current_discount) × ratio)
    //   charge_line = round((target_base - target_discount) × new_cycle_ratio)
    //
    // Where "ratio" = remainingSeconds / totalSeconds of the CURRENT period
    // (seconds-level precision, not days) and "new_cycle_ratio" is either 1.0
    // for a billing_switch (fresh new cycle) or the same `ratio` for a
    // tier change mid-period.
    //
    // Our currentAmountMinor = polarSub.amount is ALREADY the post-discount
    // recurring amount, so `(current_base - current_discount)` for the credit
    // line = currentAmountMinor directly (no further discount subtraction
    // needed). For the charge line we must apply the discount explicitly since
    // targetAmountMinor is the sticker price of the target product.
    //
    // Verified against Victor's real invoice (2026-04-21, customer 8581e27e,
    // Pro monthly → Pro annual with 90% off S1ULT41A):
    //   credit = $0.80 × 1.0           = $0.80  ✓
    //   charge = ($67.08 × 10%) × 1.0  = $6.71  ✓
    //   net = $6.71 - $0.80            = $5.91  ✓
    const newCycleRatio = kind === "billing_switch" ? 1.0 : ratio;
    const creditMinor = Math.round(creditBaseMinor * ratio);
    const chargeBaseMinor = targetAmountMinor;
    const chargeDiscountMinor = Math.round(chargeBaseMinor * currentDiscountPct);
    const chargeAfterDiscountMinor = chargeBaseMinor - chargeDiscountMinor;
    const chargeMinor = Math.round(chargeAfterDiscountMinor * newCycleRatio);
    const netMinor = chargeMinor - creditMinor;
    const taxMinor = vatKnown ? Math.max(0, Math.round(netMinor * vatRate)) : 0;
    const totalMinor = netMinor + taxMinor;

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
    if (!vatKnown && (kind === "upgrade" || kind === "billing_switch")) {
      notice += ` Tax calculated by Polar at checkout based on your billing address.`;
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
      taxMajor: toMajor(taxMinor),
      totalMajor: toMajor(netMinor + taxMinor),
      vatRate,
      vatKnown,
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
