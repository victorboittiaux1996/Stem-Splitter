import { createClient } from "./server";
import { PLANS, type PlanId } from "@/lib/plans";

/**
 * Get the authenticated user from the request cookies.
 * Returns null if not authenticated.
 */
export async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Get the authenticated user's subscription plan.
 * Returns 'free' if no subscription found.
 */
export async function getUserPlan(userId: string): Promise<PlanId> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("subscriptions")
    .select("plan, status")
    .eq("user_id", userId)
    .single();

  if (!data || data.status !== "active") return "free";
  return data.plan as PlanId;
}

/**
 * Check if user has enough minutes remaining this month.
 */
export async function checkUsage(userId: string, plan: PlanId) {
  const month = new Date().toISOString().slice(0, 7);
  const planConfig = PLANS[plan];

  const supabase = await createClient();
  const { data } = await supabase
    .from("usage")
    .select("tracks_used")
    .eq("user_id", userId)
    .eq("month", month)
    .single();

  const minutesUsed = data?.tracks_used ?? 0;

  return {
    allowed: minutesUsed < planConfig.minutesIncluded,
    minutesUsed,
    minutesIncluded: planConfig.minutesIncluded,
  };
}

