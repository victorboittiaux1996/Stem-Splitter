"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLANS, formatMinutes, getRemainingSeconds, type PlanId } from "@/lib/plans";
import { computePeriodKey, getDaysUntilPeriodEnd } from "@/lib/period";

interface SubscriptionState {
  plan: PlanId;
  minutesUsed: number;
  daysUntilReset: number;
  loading: boolean;
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
    return { plan: cached.plan, minutesUsed: cached.minutesUsed, daysUntilReset: 30, loading: true };
  });

  const fetchSubscription = useCallback(() => {
    if (!userId) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("subscriptions").select("plan, status, period_start").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("created_at").eq("id", userId).maybeSingle(),
    ]).then(([subResult, profileResult]) => {
      const plan: PlanId = subResult.data?.status === "active" ? (subResult.data.plan as PlanId) : "free";
      const periodStart = subResult.data?.period_start ?? null;
      const isPaidPlan = plan === "pro" || plan === "studio";

      let anchor: Date;
      if (isPaidPlan && periodStart) {
        anchor = new Date(periodStart + "T00:00:00");
      } else if (profileResult.data?.created_at) {
        anchor = new Date(profileResult.data.created_at);
      } else {
        const now = new Date();
        anchor = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const periodKey = computePeriodKey(anchor);
      const daysUntilReset = getDaysUntilPeriodEnd(anchor);

      supabase.from("usage").select("tracks_used").eq("user_id", userId).eq("month", periodKey).maybeSingle()
        .then(({ data }) => {
          const minutesUsed = data?.tracks_used ?? 0;
          localStorage.setItem(SUB_CACHE_KEY, JSON.stringify({ plan, minutesUsed }));
          setState({ plan, minutesUsed, daysUntilReset, loading: false });
        });
    }).catch(() => setState(prev => ({ ...prev, loading: false })));
  }, [userId]);

  useEffect(() => { fetchSubscription(); }, [fetchSubscription]);
  useEffect(() => {
    const handler = () => fetchSubscription();
    window.addEventListener("usage-updated", handler);
    return () => window.removeEventListener("usage-updated", handler);
  }, [fetchSubscription]);

  const planConfig = PLANS[state.plan];
  const remainingSeconds = getRemainingSeconds(state.minutesUsed, state.plan);
  const usagePercent = planConfig.minutesIncluded > 0 ? Math.min(100, (state.minutesUsed / planConfig.minutesIncluded) * 100) : 0;

  return {
    ...state,
    refetch: fetchSubscription,
    planLabel: planConfig.label,
    isPro: state.plan === "pro" || state.plan === "studio",
    minutesIncluded: planConfig.minutesIncluded,
    remainingFormatted: formatMinutes(remainingSeconds),
    usagePercent,
    overLimit: state.minutesUsed >= planConfig.minutesIncluded,
    batchLimit: planConfig.batchLimit,
    urlImport: planConfig.urlImport,
    stems: planConfig.stems,
    wavAllowed: planConfig.exportFormats.includes("WAV 24-bit"),
    queuePriority: planConfig.queuePriority,
    shareLinksPerMonth: planConfig.shareLinksPerMonth,
    minutesNeverReset: planConfig.minutesNeverReset,
  };
}
