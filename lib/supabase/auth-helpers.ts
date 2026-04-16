import { createClient } from "./server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLANS, type PlanId } from "@/lib/plans";
import { computePeriodKey, getPreviousPeriodKey } from "@/lib/period";

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

  // For paid plans: ensure the period row exists with computed rollover before reading.
  // This handles the case where a user uploads at the start of a new period before any job completes.
  // Idempotent — subsequent calls within the same period are no-ops.
  if (planConfig.minutesNeverReset) {
    const prevPeriodKey = getPreviousPeriodKey(anchor);
    await supabaseAdmin.rpc("ensure_period_with_rollover", {
      p_user_id: userId,
      p_new_month: periodKey,
      p_prev_month: prevPeriodKey,
      p_plan_minutes: planConfig.minutesIncluded,
    });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("usage")
    .select("tracks_used, rollover_minutes")
    .eq("user_id", userId)
    .eq("month", periodKey)
    .maybeSingle();

  const minutesUsed = data?.tracks_used ?? 0;
  const rolloverMinutes = planConfig.minutesNeverReset ? (data?.rollover_minutes ?? 0) : 0;
  const minutesAvailable = planConfig.minutesIncluded + rolloverMinutes;

  return {
    allowed: minutesUsed < minutesAvailable,
    minutesUsed,
    minutesIncluded: planConfig.minutesIncluded,
    rolloverMinutes,
    minutesAvailable,
  };
}
