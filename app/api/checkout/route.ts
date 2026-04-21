import { NextRequest, NextResponse } from "next/server";
import { polar, getProductId } from "@/lib/polar";
import { getAuthUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan, billing = "monthly", discountId } = await req.json() as {
      plan: string;
      billing?: string;
      discountId?: string;
    };
    if (plan !== "pro" && plan !== "studio") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (billing !== "monthly" && billing !== "annual") {
      return NextResponse.json({ error: "Invalid billing period" }, { status: 400 });
    }

    if (!user.email) {
      return NextResponse.json({ error: "Account has no email address" }, { status: 400 });
    }

    const productId = getProductId(plan, billing);
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ??
      `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("host")}`
    ).trim();

    // Fetch subscription + profile in parallel to minimize latency.
    const [{ data: existingSub }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from("subscriptions")
        .select("stripe_customer_id, plan, status, cancel_at_period_end")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabaseAdmin
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .maybeSingle(),
    ]);

    // User has an active paid sub. Three sub-states:
    //  (a) active, not canceled → portal for billing/plan change
    //  (b) active, canceled at period end → redirect to in-app modal (resume/change)
    //  (c) canceled (status=canceled, period ended) → fall through to new checkout
    const hasActivePaidSub =
      existingSub &&
      existingSub.stripe_customer_id &&
      existingSub.plan !== "free" &&
      (existingSub.status === "active" || existingSub.status === "trialing" || existingSub.status === "past_due");

    if (hasActivePaidSub && existingSub.cancel_at_period_end) {
      // User canceled but still has access. Bounce to in-app settings so the
      // ChangePlanModal can handle resume or plan change with proration preview.
      return NextResponse.json({
        url: `${appUrl}/app?upgrade=${plan}&billing=${billing}`,
      });
    }

    if (hasActivePaidSub) {
      const session = await polar.customerSessions.create({
        customerId: existingSub.stripe_customer_id!,
      });
      if (!session.customerPortalUrl) {
        return NextResponse.json({ error: "Failed to create portal session" }, { status: 502 });
      }
      return NextResponse.json({ url: session.customerPortalUrl });
    }

    const customerName = profile?.name ?? undefined;

    const checkout = await polar.checkouts.create({
      products: [productId],
      customerEmail: user.email,
      customerName,
      externalCustomerId: user.id,
      requireBillingAddress: true,
      ...(discountId ? { discountId } : {}),
      successUrl: `${appUrl}/app?checkout=success&checkoutId={CHECKOUT_ID}`,
    });

    if (!checkout.url) {
      return NextResponse.json({ error: "Failed to get checkout URL" }, { status: 502 });
    }

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
