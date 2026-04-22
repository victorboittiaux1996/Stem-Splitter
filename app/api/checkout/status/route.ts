import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthUser } from "@/lib/supabase/auth-helpers";

// GET /api/checkout/status?session_id=cs_xxx — poll Stripe for the result of
// a Checkout Session. Used by the post-checkout bounce UI to know when the
// payment has succeeded (and webhook has synced) vs still processing.

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sessionId =
    req.nextUrl.searchParams.get("session_id") ??
    req.nextUrl.searchParams.get("checkoutId");
  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    // Authorization: ensure the session was created for this user.
    if (session.client_reference_id && session.client_reference_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Map Stripe's payment_status to our legacy "succeeded"/"pending"/"failed"
    // shape so the frontend polling code doesn't care about the backend swap.
    let status: "succeeded" | "pending" | "failed";
    if (session.payment_status === "paid" || session.payment_status === "no_payment_required") {
      status = "succeeded";
    } else if (session.status === "expired") {
      status = "failed";
    } else {
      status = "pending";
    }

    return NextResponse.json({ status });
  } catch (error) {
    console.error("Checkout status error:", error);
    return NextResponse.json({ error: "Failed to get checkout status" }, { status: 500 });
  }
}
