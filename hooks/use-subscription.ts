"use client";

import { useCallback, useEffect, useState } from "react";
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

const SUB_CACHE_KEY = "44stems-subscription";

function getCachedSubscription(): { plan: PlanId; minutesUsed: number } {
  if (typeof window === "undefined") return { plan: "free", minutesUsed: 0 };
  try {
    const cached = localStorage.getItem(SUB_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      const plan = parsed.plan === "pro" || parsed.plan === "studio" ? parsed.plan : "free";
      const minutes = Number(parsed.minutesUsed);
      return { plan, minutesUsed: Number.isFinite(minutes) ? minutes : 0 };
    }
  } catch {}
  return { plan: "free", minutesUsed: 0 };
}

export function useSubscription(userId: string | undefined) {
  const [state, setState] = useState<SubscriptionState>(() => {
    const cached = getCachedSubscription();
    return {
      plan: cached.plan,
      minutesUsed: cached.minutesUsed,
      daysUntilReset: getDaysUntilReset(),
      loading: true,
    };
  });

  const fetchSubscription = useCallback(() => {
    if (!userId) return;

    const supabase = createClient();
    const month = new Date().toISOString().slice(0, 7);

    Promise.all([
      supabase
        .from("subscriptions")
        .select("plan, status")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("usage")
        .select("tracks_used")
        .eq("user_id", userId)
        .eq("month", month)
        .maybeSingle(),
    ]).then(([subResult, usageResult]) => {
      const plan: PlanId =
        subResult.data?.status === "active"
          ? (subResult.data.plan as PlanId)
          : "free";

      const minutesUsed = usageResult.data?.tracks_used ?? 0;

      localStorage.setItem(SUB_CACHE_KEY, JSON.stringify({ plan, minutesUsed }));
      setState({
        plan,
        minutesUsed,
        daysUntilReset: getDaysUntilReset(),
        loading: false,
      });
    }).catch(() => {
      setState(prev => ({ ...prev, loading: false }));
    });
  }, [userId]);

  // Fetch on mount
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Re-fetch when a split completes (fired from queue-context)
  useEffect(() => {
    const handler = () => fetchSubscription();
    window.addEventListener("usage-updated", handler);
    return () => window.removeEventListener("usage-updated", handler);
  }, [fetchSubscription]);

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
    batchLimit: planConfig.batchLimit,
    urlImport: planConfig.urlImport,
  };
}
