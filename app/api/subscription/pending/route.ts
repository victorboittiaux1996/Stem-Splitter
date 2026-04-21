import { NextResponse } from "next/server";
import { polar, productIdToPlan } from "@/lib/polar";
import { getAuthUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /api/subscription/pending — returns the scheduled (pending) plan change
// on the user's Polar subscription, if any. Used to display the "Your plan will
// change to X on DATE" banner when the user has scheduled a downgrade (or other
// plan change) via the Polar customer portal.

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sub?.stripe_subscription_id) {
      return NextResponse.json({ pending: null });
    }

    const polarSub = await polar.subscriptions.get({ id: sub.stripe_subscription_id });
    const pending = polarSub.pendingUpdate;
    if (!pending || !pending.productId) {
      return NextResponse.json({ pending: null });
    }

    const pendingPlan = productIdToPlan(pending.productId);
    return NextResponse.json({
      pending: {
        plan: pendingPlan,
        appliesAt: pending.appliesAt instanceof Date ? pending.appliesAt.toISOString() : String(pending.appliesAt),
      },
    });
  } catch (err) {
    console.error("pending route error:", err);
    return NextResponse.json({ pending: null }, { status: 200 });
  }
}
