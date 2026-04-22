import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Stripe Billing Portal session — used for cancel, update payment method,
// view invoices. Plan changes are NOT exposed here (they happen in our
// in-app modal), configured in Dashboard → Settings → Billing → Customer
// Portal → Subscriptions → uncheck "Allow customers to update their plan".

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    // Legacy Polar customer IDs are raw UUIDs; Stripe customer IDs always
    // start with "cus_". Reject anything that isn't a Stripe customer so
    // migrated users don't blow up with "No such customer".
    const stripeCustomerId = sub?.stripe_customer_id?.startsWith("cus_")
      ? sub.stripe_customer_id
      : null;
    if (!stripeCustomerId) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    const appUrl = (
      process.env.NEXT_PUBLIC_APP_URL ??
      `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("host")}`
    ).trim();

    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${appUrl}/app?portal_return=true`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}
