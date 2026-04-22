import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLANS, type PlanId, type BillingPeriod } from "@/lib/plans";
import { stripe, getPriceId } from "@/lib/stripe";

// Subscription change preview — uses stripe.invoices.createPreview to get the
// EXACT amount Stripe will charge (or refund). No math on our side.
//
// Supported kinds:
//   new              : user is free → checkout flow, preview shows sticker price
//   same             : user is already on this plan → no-op
//   resume           : user canceled but still active, target = current plan → uncancel
//   upgrade          : tier up (Pro → Studio) or monthly→annual → charge today
//   billing_switch   : same tier monthly→annual (commit longer) → charge today
//   downgrade        : tier down OR annual→monthly → applied at next renewal
//
// Optional body: { discountCode?: string } — passes the coupon/promotion code
// to Stripe's createPreview so the preview reflects the real invoice total.
// When confirming via /api/subscription/change the same code is attached to
// the subscription, ensuring modal total = invoice charged, to the cent.

type Body = { plan: PlanId; billing: BillingPeriod; discountCode?: string };
type ChangeKind = "new" | "upgrade" | "downgrade" | "billing_switch" | "same" | "resume";

function planRank(plan: PlanId): number {
  return plan === "free" ? 0 : plan === "pro" ? 1 : 2;
}

function formatDate(tsSec: number | null | undefined): string | null {
  if (!tsSec) return null;
  return new Date(tsSec * 1000).toISOString();
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Body;
    if (body.plan !== "pro" && body.plan !== "studio") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (body.billing !== "monthly" && body.billing !== "annual") {
      return NextResponse.json({ error: "Invalid billing period" }, { status: 400 });
    }

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, status, stripe_subscription_id, cancel_at_period_end, billing_interval, currency, period_start")
      .eq("user_id", user.id)
      .maybeSingle();

    const currentPlan = (sub?.status === "active" ? (sub?.plan as PlanId) : "free") ?? "free";
    const isCanceledButActive = sub?.status === "active" && sub?.cancel_at_period_end === true;
    const targetPlan = body.plan;
    const targetBilling = body.billing;
    const currentBilling: BillingPeriod = (sub?.billing_interval === "year" ? "annual" : "monthly") as BillingPeriod;
    const targetPriceId = getPriceId(targetPlan, targetBilling);

    // Resolve promo code if provided — valid + get the coupon id for preview.
    let discountCoupon: string | undefined;
    let discountLabel: string | undefined;
    let discountPercentOff: number | null = null;
    let discountAmountOff: { amount: number; currency: string } | null = null;
    if (body.discountCode && body.discountCode.trim()) {
      const code = body.discountCode.trim();
      try {
        const search = await stripe.promotionCodes.list({ code, active: true, limit: 1 });
        const promo = search.data[0];
        if (!promo) {
          return NextResponse.json({ error: "Invalid or expired promo code" }, { status: 400 });
        }
        const couponRef = promo.promotion?.coupon;
        const couponObj = typeof couponRef === "string"
          ? await stripe.coupons.retrieve(couponRef)
          : couponRef;
        if (!couponObj) {
          return NextResponse.json({ error: "Invalid or expired promo code" }, { status: 400 });
        }
        discountCoupon = couponObj.id;
        discountLabel = promo.code;
        if (typeof couponObj.percent_off === "number") {
          discountPercentOff = couponObj.percent_off;
        }
        if (typeof couponObj.amount_off === "number" && couponObj.currency) {
          discountAmountOff = { amount: couponObj.amount_off, currency: couponObj.currency };
        }
      } catch {
        return NextResponse.json({ error: "Invalid or expired promo code" }, { status: 400 });
      }
    }

    // Brand-new customer (never paid). Return the sticker price (currency_options
    // resolved at Checkout). No createPreview call — no subscription yet.
    if (currentPlan === "free" || !sub?.stripe_subscription_id) {
      const price = await stripe.prices.retrieve(targetPriceId, {
        expand: ["currency_options"],
      });
      const currencyOpts =
        (price as { currency_options?: Record<string, { unit_amount: number | null }> }).currency_options ?? {};
      const defaultAmount = price.unit_amount ?? 0;
      const targetLabel = PLANS[targetPlan].label;
      return NextResponse.json({
        kind: "new" as ChangeKind,
        currentPlan,
        targetPlan,
        targetBilling,
        creditMajor: 0,
        chargeMajor: defaultAmount / 100,
        netMajor: defaultAmount / 100,
        totalMajor: defaultAmount / 100,
        taxMajor: 0,
        perPeriodMajor: defaultAmount / 100,
        nextBillingDate: null,
        nextBillingAmountMajor: defaultAmount / 100,
        currency: (price.currency ?? "usd").toUpperCase(),
        currencyOptions: Object.fromEntries(
          Object.entries(currencyOpts).map(([c, v]) => [c, (v.unit_amount ?? 0) / 100]),
        ),
        notice: `You'll start a new ${targetLabel} subscription at checkout. Tax calculated at checkout.`,
      });
    }

    const currentSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const currentPriceId = currentSub.items.data[0]?.price.id;
    const currentPeriodEnd = currentSub.items.data[0]?.current_period_end ?? null;

    // Same plan + same billing cycle — either "same" or "resume" if canceled.
    if (currentPriceId === targetPriceId) {
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
          totalMajor: 0,
          taxMajor: 0,
          perPeriodMajor: (currentSub.items.data[0]?.price.unit_amount ?? 0) / 100,
          nextBillingDate: formatDate(currentPeriodEnd),
          nextBillingAmountMajor: (currentSub.items.data[0]?.price.unit_amount ?? 0) / 100,
          currency: (sub.currency ?? "usd").toUpperCase(),
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
        totalMajor: 0,
        taxMajor: 0,
        perPeriodMajor: (currentSub.items.data[0]?.price.unit_amount ?? 0) / 100,
        nextBillingDate: formatDate(currentPeriodEnd),
        nextBillingAmountMajor: (currentSub.items.data[0]?.price.unit_amount ?? 0) / 100,
        currency: (sub.currency ?? "usd").toUpperCase(),
        notice: "You are already on this plan.",
      });
    }

    // Determine kind. Annual→monthly same plan is a "downgrade" (less commitment).
    let kind: ChangeKind;
    if (currentPlan === targetPlan) {
      kind = targetBilling === "annual" ? "billing_switch" : "downgrade";
    } else if (planRank(targetPlan) > planRank(currentPlan)) {
      kind = "upgrade";
    } else {
      kind = "downgrade";
    }

    // Target plan price for "next renewal amount" display. Retrieve explicitly
    // so we can show the correct local-currency price whether or not the user
    // will be charged today.
    const targetPrice = await stripe.prices.retrieve(targetPriceId);

    // Downgrade: no charge today, change applied at period end. The next
    // invoice (at renewal) will be the target plan's full price.
    if (kind === "downgrade") {
      const minutesLost = await computeMinutesLost(user.id, currentPlan, targetPlan, sub.period_start);
      return NextResponse.json({
        kind,
        currentPlan,
        currentBilling,
        targetPlan,
        targetBilling,
        creditMajor: 0,
        chargeMajor: 0,
        netMajor: 0,
        totalMajor: 0,
        taxMajor: 0,
        perPeriodMajor: (targetPrice.unit_amount ?? 0) / 100,
        nextBillingDate: formatDate(currentPeriodEnd),
        nextBillingAmountMajor: (targetPrice.unit_amount ?? 0) / 100,
        currency: (targetPrice.currency ?? "usd").toUpperCase(),
        minutesLost,
        notice: buildDowngradeNotice(currentPlan, targetPlan, minutesLost, currentPeriodEnd),
      });
    }

    // Upgrade / billing_switch → createPreview returns the EXACT invoice.
    const itemId = currentSub.items.data[0]?.id;
    if (!itemId) {
      return NextResponse.json({ error: "Subscription has no items" }, { status: 500 });
    }

    const previewParams: Stripe.InvoiceCreatePreviewParams = {
      subscription: sub.stripe_subscription_id,
      subscription_details: {
        items: [{ id: itemId, price: targetPriceId }],
        proration_behavior: "always_invoice",
      },
    };
    // Apply promo code to the preview (Stripe supports this on subscription
    // updates — contrast with Polar where codes only applied at next cycle).
    if (discountCoupon) {
      previewParams.discounts = [{ coupon: discountCoupon }];
    }

    const preview = await stripe.invoices.createPreview(previewParams);

    const currency = (preview.currency ?? "usd").toLowerCase();
    const subtotalMajor = (preview.subtotal ?? 0) / 100;
    const totalMajor = (preview.total ?? 0) / 100;
    const taxMinor = (preview.total_taxes ?? []).reduce(
      (sum: number, t: { amount: number | null }) => sum + (t.amount ?? 0),
      0,
    );
    const taxMajor = taxMinor / 100;
    const discountTotalMinor = (preview.total_discount_amounts ?? []).reduce(
      (sum: number, d: { amount: number | null }) => sum + (d.amount ?? 0),
      0,
    );

    // Split proration lines into credit (negative) and charge (positive).
    // Ignore lines that are purely discount adjustments.
    let creditMinor = 0;
    let chargeMinor = 0;
    for (const line of preview.lines.data) {
      const amount = line.amount ?? 0;
      if (amount < 0) creditMinor += Math.abs(amount);
      else chargeMinor += amount;
    }

    // Next billing: when and how much. For billing_switch monthly→annual the
    // new cycle starts today → next billing = today + 1 year at annual price.
    // For tier upgrade same-interval → period_end unchanged, at target price.
    const nextBillingEnd = preview.lines.data[preview.lines.data.length - 1]?.period?.end ?? currentPeriodEnd;

    return NextResponse.json({
      kind,
      currentPlan,
      currentBilling,
      targetPlan,
      targetBilling,
      creditMajor: creditMinor / 100,
      chargeMajor: chargeMinor / 100,
      netMajor: subtotalMajor,
      taxMajor,
      totalMajor,
      discountMajor: discountTotalMinor / 100,
      discountLabel,
      discountPercentOff,
      discountAmountOff,
      perPeriodMajor: (targetPrice.unit_amount ?? 0) / 100,
      nextBillingDate: formatDate(nextBillingEnd ?? currentPeriodEnd),
      nextBillingAmountMajor: (targetPrice.unit_amount ?? 0) / 100,
      currency: currency.toUpperCase(),
      notice: buildUpgradeNotice(kind, currentPlan, targetPlan, targetBilling),
    });
  } catch (err) {
    console.error("Preview error:", err);
    if (err instanceof Stripe.errors.StripeError) {
      return NextResponse.json({ error: err.message }, { status: 502 });
    }
    return NextResponse.json({ error: "Failed to compute preview" }, { status: 500 });
  }
}

async function computeMinutesLost(
  userId: string,
  currentPlan: PlanId,
  targetPlan: PlanId,
  periodStart: string | null,
): Promise<number> {
  const { data: usageRow } = await supabaseAdmin
    .from("usage")
    .select("rollover_minutes, tracks_used")
    .eq("user_id", userId)
    .eq("month", periodStart ?? new Date().toISOString().slice(0, 10))
    .maybeSingle();
  const currentRollover = Number(usageRow?.rollover_minutes ?? 0);
  const currentMonthUsed = Number(usageRow?.tracks_used ?? 0);
  const currentPlanMinutes = PLANS[currentPlan].minutesIncluded;
  const newPlanMinutes = PLANS[targetPlan].minutesIncluded;
  const unusedCurrent = Math.max(0, currentPlanMinutes + currentRollover - currentMonthUsed);
  return Math.max(0, unusedCurrent - newPlanMinutes);
}

function buildDowngradeNotice(
  currentPlan: PlanId,
  targetPlan: PlanId,
  minutesLost: number,
  currentPeriodEnd: number | null,
): string {
  const currentLabel = PLANS[currentPlan].label;
  const targetLabel = PLANS[targetPlan].label;
  const renewalDate = currentPeriodEnd
    ? new Date(currentPeriodEnd * 1000).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "the end of your current period";
  const base = `You'll keep ${currentLabel} access until ${renewalDate}, then switch to ${targetLabel} automatically. No charge today, no refund.`;
  if (Math.round(minutesLost) >= 1) {
    return `You will lose ${Math.round(minutesLost)} rollover minute${Math.round(minutesLost) === 1 ? "" : "s"} above the ${targetLabel} quota (${PLANS[targetPlan].minutesIncluded} min/month). ${base}`;
  }
  return base;
}

function buildUpgradeNotice(
  kind: ChangeKind,
  currentPlan: PlanId,
  targetPlan: PlanId,
  targetBilling: BillingPeriod,
): string {
  if (kind === "billing_switch") {
    return targetBilling === "annual"
      ? `New annual cycle starts today — you save 30% vs monthly.`
      : `New monthly cycle starts today.`;
  }
  const currentLabel = PLANS[currentPlan].label;
  const targetLabel = PLANS[targetPlan].label;
  return `Effective immediately. Credit for unused ${currentLabel} time applied to the new ${targetLabel} charge. Your renewal date is unchanged.`;
}
