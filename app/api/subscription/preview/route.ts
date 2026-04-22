import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getAuthUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLANS, type PlanId, type BillingPeriod } from "@/lib/plans";
import { stripe, getPriceId } from "@/lib/stripe";

// Subscription change preview — uses stripe.invoices.createPreview to get the
// EXACT amount Stripe will charge (or refund). No math on our side, no
// approximation, no currency handling — Stripe does it all natively.
//
// Three kinds we preview:
//   - upgrade   : higher tier OR monthly→annual same tier → charge today
//   - downgrade : lower tier OR annual→monthly same tier → applied at renewal
//   - billing_switch : same tier, different interval (counts as upgrade if
//                      monthly→annual since user commits longer)
//
// "resume" (uncancel) and "same" are handled without a Stripe preview call.

type Body = { plan: PlanId; billing: BillingPeriod };
type ChangeKind = "new" | "upgrade" | "downgrade" | "billing_switch" | "same" | "resume";

function planRank(plan: PlanId): number {
  return plan === "free" ? 0 : plan === "pro" ? 1 : 2;
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

    // Brand-new customer (never paid). Return the sticker price — real
    // currency + tax resolve at Checkout via Stripe Tax + currency_options.
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
        currency: (price.currency ?? "usd").toUpperCase(),
        currencyOptions: Object.fromEntries(
          Object.entries(currencyOpts).map(([c, v]) => [c, (v.unit_amount ?? 0) / 100]),
        ),
        subtitle: `${defaultAmount / 100} ${(price.currency ?? "usd").toUpperCase()} ${targetBilling === "annual" ? "per year" : "per month"}`,
        notice: `You'll start a new ${targetLabel} subscription at checkout. Tax calculated at checkout.`,
      });
    }

    // Same plan + same billing cycle — either "same" or "resume" if canceled.
    const currentSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id);
    const currentPriceId = currentSub.items.data[0]?.price.id;

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

    // Downgrade: no charge today, change applied at period end. We still show
    // a preview of the next invoice so the user knows what they'll pay.
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
        perPeriodMajor: (currentSub.items.data[0]?.price.unit_amount ?? 0) / 100,
        currency: (sub.currency ?? "usd").toUpperCase(),
        minutesLost,
        notice: buildDowngradeNotice(currentPlan, targetPlan, minutesLost, currentSub.items.data[0]?.current_period_end ?? null),
      });
    }

    // Upgrade / billing_switch → preview the invoice Stripe will create.
    // This is the exact amount the customer will be charged today (with tax,
    // discount, proration all handled by Stripe).
    const itemId = currentSub.items.data[0]?.id;
    if (!itemId) {
      return NextResponse.json({ error: "Subscription has no items" }, { status: 500 });
    }

    const preview = await stripe.invoices.createPreview({
      subscription: sub.stripe_subscription_id,
      subscription_details: {
        items: [{ id: itemId, price: targetPriceId }],
        proration_behavior: "always_invoice",
      },
    });

    const currency = (preview.currency ?? "usd").toLowerCase();
    const subtotalMajor = (preview.subtotal ?? 0) / 100;
    const totalMajor = (preview.total ?? 0) / 100;
    // `total_taxes` replaces the old `tax` root field in API 2024+.
    const taxMinor = (preview.total_taxes ?? []).reduce(
      (sum: number, t: { amount: number | null }) => sum + (t.amount ?? 0),
      0,
    );
    const taxMajor = taxMinor / 100;

    // Extract the proration credit vs charge lines for display.
    let creditMinor = 0;
    let chargeMinor = 0;
    for (const line of preview.lines.data) {
      const amount = line.amount ?? 0;
      if (amount < 0) creditMinor += Math.abs(amount);
      else chargeMinor += amount;
    }

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
      perPeriodMajor: (currentSub.items.data[0]?.price.unit_amount ?? 0) / 100,
      currency: currency.toUpperCase(),
      subtitle: kind === "upgrade" ? "Effective immediately." : "New cycle starts today.",
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
  const targetLabel = PLANS[targetPlan].label;
  if (kind === "billing_switch") {
    return targetBilling === "annual"
      ? `New annual cycle starts today — you save 30% vs monthly.`
      : `New monthly cycle starts today.`;
  }
  // upgrade
  const currentLabel = PLANS[currentPlan].label;
  return `Effective immediately. Credit for unused ${currentLabel} time applied to the new ${targetLabel} charge. Your renewal date is unchanged.`;
}
