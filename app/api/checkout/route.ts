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

    const { plan, billing = "monthly" } = await req.json() as { plan: string; billing?: string };
    if (plan !== "pro" && plan !== "studio") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (billing !== "monthly" && billing !== "annual") {
      return NextResponse.json({ error: "Invalid billing period" }, { status: 400 });
    }

    if (!user.email) {
      return NextResponse.json({ error: "Account has no email address" }, { status: 400 });
    }

    // If user already has an active paid subscription, redirect to the Polar
    // customer portal so they can change plan / billing interval with proration.
    // Polar's checkout rejects a second active sub and shows an ugly error mid-payment.
    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id, plan, status")
      .eq("user_id", user.id)
      .maybeSingle();

    const hasActivePaidSub =
      existingSub &&
      existingSub.stripe_customer_id &&
      existingSub.plan !== "free" &&
      (existingSub.status === "active" || existingSub.status === "trialing" || existingSub.status === "past_due");

    if (hasActivePaidSub) {
      const session = await polar.customerSessions.create({
        customerId: existingSub.stripe_customer_id!,
      });
      if (!session.customerPortalUrl) {
        return NextResponse.json({ error: "Failed to create portal session" }, { status: 502 });
      }
      return NextResponse.json({ url: session.customerPortalUrl });
    }

    const productId = getProductId(plan, billing);
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ??
      `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("host")}`
    ).trim();

    const checkout = await polar.checkouts.create({
      products: [productId],
      customerEmail: user.email,
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
