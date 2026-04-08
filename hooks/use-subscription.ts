"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLANS, formatMinutes, getRemainingSeconds, type PlanId } from "@/lib/plans";

interface SubscriptionState {
  plan: PlanId;
  minutesUsed: number; // decimal minutes (e.g. 3.5 = 3min 30s)
  daysUntilReset: number;
  loading: boolean;
}

function getDaysUntilReset(): number {
  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return Math.max(1, Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

export function useSubscription(userId: string | undefined) {
  const [state, setState] = useState<SubscriptionState>({
    plan: "free",
    minutesUsed: 0,
    daysUntilReset: getDaysUntilReset(),
    loading: true,
  });

  useEffect(() => {
    if (!userId) return;

    const supabase = createClient();
    const month = new Date().toISOString().slice(0, 7);

    Promise.all([
      supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", userId)
        .single(),
      supabase
        .from("usage")
        .select("tracks_used")
        .eq("user_id", userId)
        .eq("month", month)
        .single(),
    ]).then(([subResult, usageResult]) => {
      const plan: PlanId =
        subResult.data?.status === "active"
          ? (subResult.data.plan as PlanId)
          : "free";

      // tracks_used stores minutes as a decimal number
      const minutesUsed = usageResult.data?.tracks_used ?? 0;

      setState({
        plan,
        minutesUsed,
        daysUntilReset: getDaysUntilReset(),
        loading: false,
      });
    });
  }, [userId]);

  const planConfig = PLANS[state.plan];
  const remainingSeconds = getRemainingSeconds(state.minutesUsed, state.plan);
  const usagePercent = planConfig.minutesIncluded > 0
    ? Math.min(100, (state.minutesUsed / planConfig.minutesIncluded) * 100)
    : 0;

  return {
    ...state,
    planLabel: planConfig.label,
    isPro: state.plan === "pro" || state.plan === "studio",
    minutesIncluded: planConfig.minutesIncluded,
    remainingFormatted: formatMinutes(remainingSeconds), // "8:27"
    usagePercent,
    overLimit: state.minutesUsed >= planConfig.minutesIncluded,
  };
}
