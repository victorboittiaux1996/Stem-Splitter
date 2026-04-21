import { NextRequest, NextResponse } from "next/server";
import { polar, getProductId, POLAR_PRODUCTS } from "@/lib/polar";
import { getAuthUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { PlanId, BillingPeriod } from "@/lib/plans";

// Apply a subscription change for an existing customer.
// - Same product = no-op (400)
// - Different product/billing = polar.subscriptions.update with proration: invoice
// - Free customers must use /api/checkout (creates a new sub)

type Body = {
  plan: PlanId;
  billing: BillingPeriod;
  action?: "change" | "cancel" | "resume";
  discountId?: string;
};

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Body;
    const action = body.action ?? "change";

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("plan, status, stripe_subscription_id, stripe_customer_id, cancel_at_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found. Use /api/checkout for first-time purchase." },
        { status: 404 },
      );
    }

    if (action === "cancel") {
      const updated = await polar.subscriptions.update({
        id: sub.stripe_subscription_id,
        subscriptionUpdate: { cancelAtPeriodEnd: true },
      });
      return NextResponse.json({
        ok: true,
        action: "canceled",
        endsAt: updated.endsAt ?? updated.currentPeriodEnd ?? null,
      });
    }

    if (action === "resume") {
      const updated = await polar.subscriptions.update({
        id: sub.stripe_subscription_id,
        subscriptionUpdate: { cancelAtPeriodEnd: false },
      });
      return NextResponse.json({
        ok: true,
        action: "resumed",
        currentPeriodEnd: updated.currentPeriodEnd ?? null,
      });
    }

    if (body.plan !== "pro" && body.plan !== "studio") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (body.billing !== "monthly" && body.billing !== "annual") {
      return NextResponse.json({ error: "Invalid billing period" }, { status: 400 });
    }

    const targetProductId = getProductId(body.plan, body.billing);

    const polarSub = await polar.subscriptions.get({ id: sub.stripe_subscription_id });
    const currentProductId = polarSub.product?.id ?? polarSub.productId;

    if (currentProductId === targetProductId && !sub.cancel_at_period_end) {
      return NextResponse.json({ error: "Already on this plan", action: "same" }, { status: 400 });
    }

    const isBillingSwitch =
      (currentProductId === POLAR_PRODUCTS.pro && targetProductId === POLAR_PRODUCTS.pro_annual) ||
      (currentProductId === POLAR_PRODUCTS.pro_annual && targetProductId === POLAR_PRODUCTS.pro) ||
      (currentProductId === POLAR_PRODUCTS.studio && targetProductId === POLAR_PRODUCTS.studio_annual) ||
      (currentProductId === POLAR_PRODUCTS.studio_annual && targetProductId === POLAR_PRODUCTS.studio);

    // Standard SaaS pattern (matches Claude, Netflix, Notion):
    //   - Upgrade:   effective immediately, customer pays the delta today.
    //                → prorationBehavior: "invoice"
    //   - Downgrade: customer keeps the current plan until period end, then the
    //                lower plan takes over at the next renewal. No charge today,
    //                no refund.
    //                → prorationBehavior: "next_period"
    // Annual → monthly on the same plan counts as a downgrade (less commitment).
    const tier = (pid: string): number => {
      if (pid === POLAR_PRODUCTS.studio || pid === POLAR_PRODUCTS.studio_annual) return 2;
      if (pid === POLAR_PRODUCTS.pro || pid === POLAR_PRODUCTS.pro_annual) return 1;
      return 0;
    };
    const isAnnualCurrent = currentProductId === POLAR_PRODUCTS.pro_annual || currentProductId === POLAR_PRODUCTS.studio_annual;
    const isAnnualTarget = targetProductId === POLAR_PRODUCTS.pro_annual || targetProductId === POLAR_PRODUCTS.studio_annual;
    const isDowngrade =
      tier(targetProductId) < tier(currentProductId) ||
      (tier(targetProductId) === tier(currentProductId) && isAnnualCurrent && !isAnnualTarget);
    const prorationBehavior: "invoice" | "next_period" = isDowngrade ? "next_period" : "invoice";

    // If user previously canceled but is now changing plan or resuming same plan,
    // uncancel first. SubscriptionUpdate is a union in the Polar SDK, so resume
    // (cancelAtPeriodEnd=false) and product change require two sequential calls.
    // To keep the two-step operation atomic we roll back the uncancel if the
    // product update fails — otherwise the user ends up uncanceled on the old
    // plan, which is not what they asked for.
    const didUncancel = sub.cancel_at_period_end === true;
    if (didUncancel) {
      await polar.subscriptions.update({
        id: sub.stripe_subscription_id,
        subscriptionUpdate: { cancelAtPeriodEnd: false },
      });
    }

    // Same product but user was canceled → just resume, no product change needed.
    if (currentProductId === targetProductId && didUncancel) {
      await supabaseAdmin
        .from("subscriptions")
        .update({
          cancel_at_period_end: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
      return NextResponse.json({
        ok: true,
        action: "resumed",
        plan: body.plan,
        billing: body.billing,
      });
    }

    let updated;
    try {
      updated = await polar.subscriptions.update({
        id: sub.stripe_subscription_id,
        subscriptionUpdate: {
          productId: targetProductId,
          prorationBehavior,
        },
      });
    } catch (err) {
      // Atomicity: if we just uncanceled and the product update fails, put the
      // sub back into its previous canceled state so the user isn't stuck on
      // the old plan without the cancel they had scheduled.
      if (didUncancel) {
        try {
          await polar.subscriptions.update({
            id: sub.stripe_subscription_id,
            subscriptionUpdate: { cancelAtPeriodEnd: true },
          });
        } catch (rollbackErr) {
          console.error("Rollback failed after product update failure:", rollbackErr);
        }
      }
      throw err;
    }

    // Apply discount separately if provided — SubscriptionUpdate is a union, so product
    // change and discount application are two separate calls. If the discount call fails
    // the plan change still stands; we log and continue.
    if (body.discountId) {
      try {
        await polar.subscriptions.update({
          id: sub.stripe_subscription_id,
          subscriptionUpdate: { discountId: body.discountId },
        });
      } catch (discountErr) {
        console.error("Failed to apply discount on plan change:", discountErr);
      }
    }

    // Optimistic DB update from Polar's authoritative response — webhook will re-sync
    // shortly. We write the full set of fields from `updated` to avoid a drift
    // window where period_end / period_start still point to the old product.
    const newPeriodEnd = updated.currentPeriodEnd ? new Date(updated.currentPeriodEnd).toISOString() : null;
    const newPeriodStart = updated.currentPeriodStart ? new Date(updated.currentPeriodStart).toISOString().slice(0, 10) : null;
    await supabaseAdmin
      .from("subscriptions")
      .update({
        plan: body.plan,
        status: "active",
        cancel_at_period_end: false,
        updated_at: new Date().toISOString(),
        ...(newPeriodEnd ? { current_period_end: newPeriodEnd } : {}),
        ...(newPeriodStart ? { period_start: newPeriodStart } : {}),
      })
      .eq("user_id", user.id);

    return NextResponse.json({
      ok: true,
      action: isBillingSwitch ? "billing_switch" : "plan_change",
      plan: body.plan,
      billing: body.billing,
      currentPeriodEnd: updated.currentPeriodEnd ?? null,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to change subscription";
    console.error("Subscription change error:", error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
