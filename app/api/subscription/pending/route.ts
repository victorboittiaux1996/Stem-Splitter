import { NextResponse } from "next/server";
import { stripe, priceIdToPlan } from "@/lib/stripe";
import { getAuthUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /api/subscription/pending — returns the scheduled plan change on the
// user's Stripe subscription, if any. Reads from subscription.schedule (a
// Subscription Schedule with multiple phases). The next phase's first item
// price id tells us the target plan, and phase.start_date is when it applies.

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

    const stripeSub = await stripe.subscriptions.retrieve(sub.stripe_subscription_id, {
      expand: ["schedule"],
    });

    const schedule = stripeSub.schedule;
    if (!schedule || typeof schedule === "string") {
      return NextResponse.json({ pending: null });
    }

    // Find the NEXT phase (not the current one). Phases are ordered; the one
    // whose start_date is in the future is the pending change.
    const nowSec = Math.floor(Date.now() / 1000);
    const nextPhase = schedule.phases.find((p) => (p.start_date ?? 0) > nowSec);
    if (!nextPhase) return NextResponse.json({ pending: null });

    const firstItem = nextPhase.items[0];
    const priceRef = firstItem?.price;
    const priceId = typeof priceRef === "string" ? priceRef : priceRef?.id;
    if (!priceId) return NextResponse.json({ pending: null });

    return NextResponse.json({
      pending: {
        plan: priceIdToPlan(priceId),
        appliesAt: new Date((nextPhase.start_date ?? 0) * 1000).toISOString(),
      },
    });
  } catch (err) {
    console.error("pending route error:", err);
    return NextResponse.json({ pending: null }, { status: 200 });
  }
}
