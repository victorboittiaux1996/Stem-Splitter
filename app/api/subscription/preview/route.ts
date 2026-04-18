import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PlanId, BillingPeriod } from "@/lib/plans";
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
      .select("plan, status, period_start, current_period_end, stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentPlan = (sub?.status === "active" ? (sub?.plan as PlanId) : "free") ?? "free";
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
        notice: "Tax may apply based on your billing country.",
      });
    }

    let currentBilling: BillingPeriod = "monthly";
    let currentAmountMinor = 0;
    let currentCurrency = targetCurrency;
    if (sub?.stripe_subscription_id) {
      try {
        const polarSub = await polar.subscriptions.get({ id: sub.stripe_subscription_id });
        if (polarSub.recurringInterval === "year") currentBilling = "annual";
        const amt = (polarSub as { amount?: number }).amount;
        const cur = (polarSub as { currency?: string }).currency;
        if (typeof amt === "number") currentAmountMinor = amt;
        if (typeof cur === "string") currentCurrency = cur.toUpperCase();
      } catch {
        // fall through with monthly assumption + target currency
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
    const canComputeCredit = sameCurrency && !missingCurrentAmount;
    const creditMinor = canComputeCredit ? Math.round(currentAmountMinor * ratio) : 0;
    const chargeMinor = Math.round(targetAmountMinor * ratio);
    const netMinor = chargeMinor - creditMinor;

    let kind: ChangeKind;
    if (currentPlan === targetPlan) kind = "billing_switch";
    else if (planRank(targetPlan) > planRank(currentPlan)) kind = "upgrade";
    else kind = "downgrade";

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
      notice: canComputeCredit
        ? "Tax may apply based on your billing country."
        : "A credit for unused time will be applied automatically.",
    });
  } catch (error) {
    console.error("Preview error:", error);
    return NextResponse.json({ error: "Failed to compute preview" }, { status: 500 });
  }
}
