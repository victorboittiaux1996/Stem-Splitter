import { NextRequest, NextResponse } from "next/server";
import { stripe, getPriceId, getCurrencyFromHeaders } from "@/lib/stripe";
import { getAuthUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Stripe Checkout Session creation.
//   - New customer (no existing Stripe customer_id in our DB): plain Checkout
//     with customer_email + client_reference_id=user.id for the webhook link.
//   - Existing customer (already has stripe_customer_id): pass `customer` so
//     Stripe reuses their stored payment methods and tax address.
//   - Existing paid sub: redirect to Billing Portal (plan changes happen in
//     our in-app modal via /api/subscription/change, not via checkout).
//   - Existing paid sub canceled-but-active: bounce back to /app so the in-app
//     modal handles resume.

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.email) return NextResponse.json({ error: "Account has no email" }, { status: 400 });

    const { plan, billing = "monthly" } = (await req.json()) as {
      plan: string;
      billing?: string;
    };
    if (plan !== "pro" && plan !== "studio") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }
    if (billing !== "monthly" && billing !== "annual") {
      return NextResponse.json({ error: "Invalid billing period" }, { status: 400 });
    }

    const priceId = getPriceId(plan, billing);
    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ??
      `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("host")}`
    ).trim();

    const { data: existingSub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id, plan, status, cancel_at_period_end")
      .eq("user_id", user.id)
      .maybeSingle();

    const hasActivePaidSub =
      existingSub &&
      existingSub.plan !== "free" &&
      (existingSub.status === "active" || existingSub.status === "trialing" || existingSub.status === "past_due");

    if (hasActivePaidSub && existingSub.cancel_at_period_end) {
      return NextResponse.json({
        url: `${appUrl}/app?upgrade=${plan}&billing=${billing}`,
      });
    }

    if (hasActivePaidSub && existingSub.stripe_customer_id) {
      const portal = await stripe.billingPortal.sessions.create({
        customer: existingSub.stripe_customer_id,
        return_url: `${appUrl}/app`,
      });
      return NextResponse.json({ url: portal.url });
    }

    const currency = getCurrencyFromHeaders(req.headers);

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      currency,
      automatic_tax: { enabled: true },
      tax_id_collection: { enabled: true },
      billing_address_collection: "required",
      customer_email: existingSub?.stripe_customer_id ? undefined : user.email,
      customer: existingSub?.stripe_customer_id ?? undefined,
      client_reference_id: user.id,
      subscription_data: {
        metadata: { supabase_user_id: user.id },
      },
      metadata: { supabase_user_id: user.id },
      allow_promotion_codes: true,
      success_url: `${appUrl}/app?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/app?checkout=canceled`,
    });

    if (!session.url) {
      return NextResponse.json({ error: "Failed to create Checkout session" }, { status: 502 });
    }
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    const msg = error instanceof Error ? error.message : "Failed to create checkout";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
