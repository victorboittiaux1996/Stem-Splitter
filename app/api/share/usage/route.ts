import { NextResponse } from "next/server";
import { getAuthUser, getUserPlan } from "@/lib/supabase/auth-helpers";
import { PLANS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

// GET /api/share/usage — returns share links used this month vs quota
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { plan } = await getUserPlan(user.id);
  const total = PLANS[plan].shareLinksPerMonth;

  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from("share_links")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", monthStart.toISOString());

  return NextResponse.json({ used: count ?? 0, total });
}
