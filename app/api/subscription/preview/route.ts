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

/**
 * Return the unit amount (minor units) for a Stripe Price in the given
 * currency. Reads currency_options[currency].unit_amount when available
 * (multi-currency price) and falls back to price.unit_amount otherwise
 * (single-currency price or missing currency_options).
 *
 * Without this helper, reading `price.unit_amount` directly always returns
 * the default-currency amount (USD for our Prices) regardless of what
 * currency the subscription is billed in — leading to modals that show
 * "€67.08" with the EUR symbol but the USD amount.
 */
function amountForCurrency(
  price: Stripe.Price,
  currency: string,
): number {
  const options = (price as Stripe.Price & {
    currency_options?: Record<string, { unit_amount: number | null }> | null;
  }).currency_options;
  const fromOptions = options?.[currency.toLowerCase()]?.unit_amount;
  if (typeof fromOptions === "number") return fromOptions;
  return price.unit_amount ?? 0;
}

type DiscountInfo = {
  label: string | undefined;
  percentOff: number | null;
  amountOff: { amount: number; currency: string } | null;
};

/**
 * Extract a display label + percent/amount off from a Stripe Subscription's
 * existing discounts. Used when the user has a coupon attached via
 * subscriptions.update (either at checkout or by us via API) so the modal
 * can show the promo name even when the user didn't type it this session.
 */
async function extractActiveSubDiscount(
  sub: Stripe.Subscription,
): Promise<DiscountInfo | null> {
  const discounts = (sub as Stripe.Subscription & { discounts?: Array<string | Stripe.Discount> }).discounts;
  if (!discounts || discounts.length === 0) return null;
  const first = discounts[0];
  const discount = typeof first === "string"
    ? await stripe.subscriptions.retrieve(sub.id, { expand: ["discounts"] }).then((s) => {
        const d = (s as Stripe.Subscription & { discounts?: Array<Stripe.Discount> }).discounts?.[0];
        return d && typeof d !== "string" ? d : null;
      })
    : first;
  if (!discount) return null;
  // API 2024+: Discount.coupon moved to Discount.source.coupon.
  const couponRef = discount.source?.coupon;
  const coupon = typeof couponRef === "string"
    ? await stripe.coupons.retrieve(couponRef).catch(() => null)
    : couponRef;
  if (!coupon) return null;
  return {
    label: coupon.name ?? coupon.id,
    percentOff: typeof coupon.percent_off === "number" ? coupon.percent_off : null,
    amountOff: typeof coupon.amount_off === "number" && coupon.currency
      ? { amount: coupon.amount_off, currency: coupon.currency }
      : null,
  };
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

    // Brand-new customer (never paid). Return the sticker price for the
    // visitor's detected currency (EUR/GBP/USD), not the default USD — the
    // Checkout page will charge the same amount via currency_options.
    if (currentPlan === "free" || !sub?.stripe_subscription_id) {
      const price = await stripe.prices.retrieve(targetPriceId, {
        expand: ["currency_options"],
      });
      const visitorCurrency = (sub?.currency
        ?? req.headers.get("cf-ipcountry") === "GB" ? "gbp"
        : ["FR","DE","IT","ES","NL","BE","AT","PT","IE","FI","SE","DK","PL","CZ","HU","GR","RO","BG","HR","SI","SK","LT","LV","EE","MT","CY","LU"].includes(req.headers.get("cf-ipcountry") ?? "") ? "eur"
        : "usd");
      const currencyOpts =
        (price as { currency_options?: Record<string, { unit_amount: number | null }> }).currency_options ?? {};
      const amount = amountForCurrency(price, visitorCurrency);
      const targetLabel = PLANS[targetPlan].label;
      return NextResponse.json({
        kind: "new" as ChangeKind,
        currentPlan,
        targetPlan,
        targetBilling,
        creditMajor: 0,
        chargeMajor: amount / 100,
        netMajor: amount / 100,
        totalMajor: amount / 100,
        taxMajor: 0,
        perPeriodMajor: amount / 100,
        nextBillingDate: null,
        nextBillingAmountMajor: amount / 100,
        currency: visitorCurrency.toUpperCase(),
        currencyOptions: Object.fromEntries(
          Object.entries(currencyOpts).map(([c, v]) => [c, (v.unit_amount ?? 0) / 100]),
        ),
        notice: `You'll start a new ${targetLabel} subscription at checkout. Tax calculated at checkout.`,
      });
    }

    const currentSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const currentPriceId = currentSub.items.data[0]?.price.id;
    const currentPeriodEnd = currentSub.items.data[0]?.current_period_end ?? null;
    // Currency the sub is billed in — source of truth over the DB column,
    // because Stripe is the only system that actually charges the customer.
    const subCurrency = (currentSub.currency ?? sub.currency ?? "usd").toLowerCase();
    // Discount currently attached to the sub (if any). Exposed on all kinds
    // so the modal can show "Promo code X (−100%)" even when the user didn't
    // re-type it this session.
    const activeDiscount = await extractActiveSubDiscount(currentSub);

    // Same plan + same billing cycle — either "same" or "resume" if canceled.
    if (currentPriceId === targetPriceId) {
      const currentPrice = currentSub.items.data[0]?.price;
      const perPeriod = currentPrice ? amountForCurrency(currentPrice, subCurrency) : 0;
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
          perPeriodMajor: perPeriod / 100,
          nextBillingDate: formatDate(currentPeriodEnd),
          nextBillingAmountMajor: perPeriod / 100,
          currency: subCurrency.toUpperCase(),
          discountLabel: activeDiscount?.label,
          discountPercentOff: activeDiscount?.percentOff ?? null,
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
        perPeriodMajor: perPeriod / 100,
        nextBillingDate: formatDate(currentPeriodEnd),
        nextBillingAmountMajor: perPeriod / 100,
        currency: subCurrency.toUpperCase(),
        discountLabel: activeDiscount?.label,
        discountPercentOff: activeDiscount?.percentOff ?? null,
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

    // Target plan price for "next renewal amount" display. Expand
    // currency_options so we can read the price in the sub's currency.
    const targetPrice = await stripe.prices.retrieve(targetPriceId, {
      expand: ["currency_options"],
    });
    const targetAmountInSubCurrency = amountForCurrency(targetPrice, subCurrency);

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
        perPeriodMajor: targetAmountInSubCurrency / 100,
        nextBillingDate: formatDate(currentPeriodEnd),
        nextBillingAmountMajor: targetAmountInSubCurrency / 100,
        currency: subCurrency.toUpperCase(),
        discountLabel: activeDiscount?.label,
        discountPercentOff: activeDiscount?.percentOff ?? null,
        minutesLost,
        notice: buildDowngradeNotice(currentPlan, targetPlan, minutesLost, currentPeriodEnd),
      });
    }

    // Upgrade / billing_switch → createPreview returns the EXACT invoice.
    const itemId = currentSub.items.data[0]?.id;
    if (!itemId) {
      return NextResponse.json({ error: "Subscription has no items" }, { status: 500 });
    }

    // Pin the proration timestamp so that when the user confirms, we can
    // pass the SAME value to subscriptions.update via `proration_date`.
    // This guarantees displayed total = invoice charged, to the cent.
    // Stripe docs: https://docs.stripe.com/billing/subscriptions/prorations#preview-the-prorations
    const prorationDate = Math.floor(Date.now() / 1000);

    const previewParams: Stripe.InvoiceCreatePreviewParams = {
      subscription: sub.stripe_subscription_id,
      subscription_details: {
        items: [{ id: itemId, price: targetPriceId }],
        proration_behavior: "always_invoice",
        proration_date: prorationDate,
      },
      // Force tax calculation in the preview even when the sub itself was
      // created without automatic_tax (legacy). Mirror of what change/route
      // sets on the actual update so preview total = invoice total.
      automatic_tax: { enabled: true },
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

    // If no code was typed this session but the sub already has a discount
    // (e.g. from initial checkout or attached via API), surface its label so
    // the modal can show "Promo code X (-Y%)" transparently.
    const effectiveDiscountLabel = discountLabel ?? activeDiscount?.label;
    const effectiveDiscountPercent = discountPercentOff ?? activeDiscount?.percentOff ?? null;
    const effectiveDiscountAmount = discountAmountOff ?? activeDiscount?.amountOff ?? null;

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
      discountLabel: effectiveDiscountLabel,
      discountPercentOff: effectiveDiscountPercent,
      discountAmountOff: effectiveDiscountAmount,
      perPeriodMajor: targetAmountInSubCurrency / 100,
      nextBillingDate: formatDate(nextBillingEnd ?? currentPeriodEnd),
      nextBillingAmountMajor: targetAmountInSubCurrency / 100,
      currency: (currency || subCurrency).toUpperCase(),
      prorationDate,
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
