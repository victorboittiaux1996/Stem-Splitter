import { NextRequest, NextResponse } from "next/server";
import { polar } from "@/lib/polar";
import { getAuthUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the Polar customer ID from our subscriptions table
    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    const session = await polar.customerSessions.create({
      customerId: sub.stripe_customer_id,
    });

    if (!session.customerPortalUrl) {
      return NextResponse.json({ error: "Failed to create portal session" }, { status: 502 });
    }

    return NextResponse.json({ url: session.customerPortalUrl });
  } catch (error) {
    console.error("Portal error:", error);
    return NextResponse.json({ error: "Failed to create portal session" }, { status: 500 });
  }
}
