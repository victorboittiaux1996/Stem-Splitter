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

/**
 * Python 3's built-in round() uses banker's rounding (ROUND_HALF_EVEN):
 * exactly-.5 values round to the nearest EVEN integer, not up.
 * round(0.5) == 0, round(1.5) == 2, round(2.5) == 2.
 *
 * Polar's proration code (server/polar/subscription/update.py:78,126) calls
 * this built-in round() on Decimal values. JS Math.round always rounds
 * half UP, so for fractional-.5 cases we'd drift by 1 cent vs the real
 * invoice. This function reproduces Python's behavior deterministically.
 *
 * Discount math uses Polar's `polar_round()` (server/polar/kit/math.py)
 * which is half-AWAY-from-zero — equivalent to Math.round for positive
 * numbers, so we keep Math.round for those sites.
 */
function pythonRound(n: number): number {
  const floor = Math.floor(n);
  const frac = n - floor;
  if (frac < 0.5) return floor;
  if (frac > 0.5) return floor + 1;
  // frac === 0.5 exactly: pick the even neighbor
  return floor % 2 === 0 ? floor : floor + 1;
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
    let currentDiscountFixedMinor = 0; // Fixed-amount discount (alternative to pct)
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
            const products = (discount as { products?: Array<{ id?: string }> | null }).products;

            // Product scope check. Per Polar docs: "By default the discount can
            // be applied to all products" — so an empty/null products array
            // means global scope. If products are listed, the discount only
            // applies when the target product is in the list. This is exactly
            // how Polar's server enforces it — mimic to avoid a preview that
            // assumes a discount Polar won't actually honor.
            const appliesToTarget =
              !products ||
              products.length === 0 ||
              products.some((p) => p?.id === targetProductId);

            if (appliesToTarget) {
              if (type === "percentage") {
                const basisPoints = (discount as { basisPoints?: number }).basisPoints;
                if (typeof basisPoints === "number") {
                  currentDiscountPct = Math.max(0, Math.min(1, basisPoints / 10000));
                }
              } else if (type === "fixed") {
                const amt = (discount as { amount?: number }).amount;
                if (typeof amt === "number" && amt > 0) {
                  currentDiscountFixedMinor = amt;
                }
              }
            }
          } catch {
            // Discount removed / not accessible — continue without it.
          }
        }
      } catch (err) {
        console.error("Preview: failed to fetch current subscription from Polar", err);
      }
    }

    // VAT rate + tax behavior per customer. Both are derived from the user's
    // last paid order — that's exactly what Polar will apply to this invoice.
    //
    // Tax behavior semantics (Polar server/polar/order/service.py:724-729):
    //   INCLUSIVE (EU default): tax is inside subtotal
    //       subtotal = 591, tax = 99, net = 492, total = 591
    //       → user pays `subtotal`; tax is informational
    //   EXCLUSIVE (US default): tax added on top
    //       subtotal = 591, tax = 119, net = 591, total = 710
    //       → user pays `subtotal + tax`
    //
    // Detect via two signals (whichever is reliable):
    //   1. SDK exposes `taxBehavior` string field on the order
    //   2. Fallback: `totalAmount === subtotalAmount && taxAmount > 0` → inclusive
    //
    // VAT rate = taxAmount / netAmount. For inclusive orders this is the
    // conventional "20%" rate (FR VAT is 20% on net). For B2B with valid
    // VAT ID, taxAmount=0 → rate=0 → we correctly skip tax.
    let vatRate = 0;
    let vatKnown = false;
    let taxInclusive = false;
    if (currentCustomerId) {
      try {
        const orders = await polar.orders.list({ customerId: [currentCustomerId], limit: 3 });
        const items = (orders as { result?: { items?: Array<unknown> } }).result?.items ?? [];
        for (const raw of items) {
          const o = raw as {
            netAmount?: number;
            taxAmount?: number;
            subtotalAmount?: number;
            totalAmount?: number;
            taxBehavior?: string;
            status?: string;
          };
          // Require a paid order with a plausible breakdown.
          if (
            (o.status === undefined || o.status === "paid") &&
            typeof o.netAmount === "number" &&
            typeof o.taxAmount === "number" &&
            o.netAmount > 0
          ) {
            const rate = o.taxAmount / o.netAmount;
            if (rate >= 0 && rate <= 0.35) {
              vatRate = rate;
              vatKnown = true;
              if (typeof o.taxBehavior === "string") {
                taxInclusive = o.taxBehavior === "inclusive";
              } else if (
                typeof o.totalAmount === "number" &&
                typeof o.subtotalAmount === "number" &&
                o.taxAmount > 0
              ) {
                taxInclusive = o.totalAmount === o.subtotalAmount;
              }
              break;
            }
          }
        }
      } catch {
        // VAT fallback "+ tax at checkout" is handled in the notice.
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
    // server/polar/subscription/update.py (open source, lines 45-135):
    //
    //   credit_line = round((current_base - current_discount) × initial_cycle_pct_remaining)
    //   charge_line = round((target_base - target_discount) × new_cycle_pct_remaining)
    //
    // Polar's `new_cycle_pct_remaining` (line 150-164 of update.py):
    //   - If the BILLING INTERVAL changes (monthly → annual or annual → monthly),
    //     the new cycle starts NOW and runs for the full new interval →
    //     new_cycle_pct_remaining = 1.0 (the new plan is charged at full price
    //     for a fresh cycle).
    //   - Otherwise (same interval, tier change only): keep the current period
    //     boundaries → new_cycle_pct_remaining = same ratio as the credit side.
    //
    // IMPORTANT: this is interval-based, NOT kind-based. Pro monthly → Studio
    // annual is kind=upgrade, but the interval changes → new_cycle_ratio = 1.0.
    //
    // Our currentAmountMinor = polarSub.amount is ALREADY the post-discount
    // recurring amount, so `(current_base - current_discount)` for the credit
    // line = currentAmountMinor directly (no further discount subtraction
    // needed). For the charge line we must apply the discount explicitly since
    // targetAmountMinor is the sticker price of the target product. Polar
    // checks discount.is_applicable(new_price.product) for the charge line
    // (line 114-119) — we mirror that via the discount.products scope check.
    //
    // Verified against Victor's real invoice (2026-04-21, customer 8581e27e,
    // Pro monthly → Pro annual with 90% off S1ULT41A):
    //   interval_changed = true → new_cycle_ratio = 1.0
    //   credit = $0.80 × 1.0           = $0.80  ✓
    //   charge = ($67.08 × 10%) × 1.0  = $6.71  ✓
    //   net = $6.71 - $0.80            = $5.91  ✓
    const intervalChanged = currentBilling !== targetBilling;
    const newCycleRatio = intervalChanged ? 1.0 : ratio;
    const creditMinor = pythonRound(creditBaseMinor * ratio);
    const chargeBaseMinor = targetAmountMinor;
    // Discount amount — mirrors Polar's DiscountPercentage/DiscountFixed:
    //   percentage: polar_round(amount * basis_points / 10_000)
    //   fixed:      min(amounts[currency], amount)
    // polar_round is half-away-from-zero; for positive numbers this equals
    // JS Math.round. We still use Math.round (same behavior here).
    const chargeDiscountMinor = currentDiscountPct > 0
      ? Math.round(chargeBaseMinor * currentDiscountPct)
      : Math.min(currentDiscountFixedMinor, chargeBaseMinor);
    const chargeAfterDiscountMinor = chargeBaseMinor - chargeDiscountMinor;
    // Proration result uses Python's built-in round() which is HALF-TO-EVEN
    // (banker's rounding), NOT half-up like JS Math.round. Rare cases where
    // the fractional part is exactly 0.5 differ by 1 cent. pythonRound()
    // reproduces Python's behavior deterministically.
    const chargeMinor = pythonRound(chargeAfterDiscountMinor * newCycleRatio);

    // Order subtotal = sum of billing_entry amounts (order/service.py:678).
    // For proration orders, order-level discount_amount = 0 because
    // proration billing_entries have discountable=False (already baked in
    // at entry creation — order/service.py:683-688 comment explains this).
    const subtotalMinor = chargeMinor - creditMinor;
    const taxableMinor = subtotalMinor; // no order-level discount on prorations

    // Tax computation — mirrors order/service.py:707-729
    //   inclusive: tax is extracted from subtotal (user pays = subtotal)
    //   exclusive: tax added on top (user pays = subtotal + tax)
    let taxMinor = 0;
    if (vatKnown && taxableMinor > 0) {
      if (taxInclusive) {
        // Inclusive: subtotal already contains tax. Extract:
        //   tax = subtotal × rate / (1 + rate)
        taxMinor = Math.round((taxableMinor * vatRate) / (1 + vatRate));
      } else {
        // Exclusive: tax on top
        taxMinor = Math.round(taxableMinor * vatRate);
      }
    }
    // Total the user is actually charged:
    //   inclusive → subtotal (tax is inside)
    //   exclusive → subtotal + tax
    const totalMinor = taxInclusive ? subtotalMinor : subtotalMinor + taxMinor;
    // netMinor kept for the legacy response field — pre-tax subtotal.
    const netMinor = subtotalMinor;

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
