import { createClient } from "./server";
import { PLANS, type PlanId } from "@/lib/plans";
import { computePeriodKey } from "@/lib/period";

export function userWorkspaceId(userId: string): string {
  return `ws-${userId}`;
}

export async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function getUserPlan(userId: string): Promise<{ plan: PlanId; periodStart: string | null }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status, period_start")
    .eq("user_id", userId)
    .single();

  if (!data || data.status !== "active") return { plan: "free", periodStart: null };
  return { plan: data.plan as PlanId, periodStart: data.period_start ?? null };
}

async function getAnchorDate(userId: string, plan: PlanId, periodStart: string | null): Promise<Date> {
  if ((plan === "pro" || plan === "studio") && periodStart) {
    return new Date(periodStart + "T00:00:00");
  }
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("created_at").eq("id", userId).maybeSingle();
  if (data?.created_at) return new Date(data.created_at);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function checkUsage(userId: string, plan: PlanId, periodStart: string | null = null) {
  const planConfig = PLANS[plan];
  const anchor = await getAnchorDate(userId, plan, periodStart);
  const periodKey = computePeriodKey(anchor);
  const supabase = await createClient();
  const { data } = await supabase
    .from("usage")
    .select("tracks_used")
    .eq("user_id", userId)
    .eq("month", periodKey)
    .maybeSingle();
  const minutesUsed = data?.tracks_used ?? 0;
  return { allowed: minutesUsed < planConfig.minutesIncluded, minutesUsed, minutesIncluded: planConfig.minutesIncluded };
}
