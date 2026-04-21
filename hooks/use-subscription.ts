"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PLANS, formatMinutes, type PlanId } from "@/lib/plans";
import { computePeriodKey, getDaysUntilPeriodEnd } from "@/lib/period";

interface SubscriptionState {
  plan: PlanId;
  minutesUsed: number;
  rolloverMinutes: number;
  daysUntilReset: number;
  cancelAtPeriodEnd: boolean;
  periodEnd: string | null;
  currentBilling: "monthly" | "annual";
  loading: boolean;
}

const SUB_CACHE_KEY = "44stems-subscription";

function getCachedSubscription(): { plan: PlanId; minutesUsed: number; rolloverMinutes: number } {
  if (typeof window === "undefined") return { plan: "free", minutesUsed: 0, rolloverMinutes: 0 };
  try {
    const cached = localStorage.getItem(SUB_CACHE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached);
      const plan = parsed.plan === "pro" || parsed.plan === "studio" ? parsed.plan : "free";
      const minutes = Number(parsed.minutesUsed);
      const rollover = Number(parsed.rolloverMinutes);
      return {
        plan,
        minutesUsed: Number.isFinite(minutes) ? minutes : 0,
        rolloverMinutes: Number.isFinite(rollover) ? rollover : 0,
      };
    }
  } catch {}
  return { plan: "free", minutesUsed: 0, rolloverMinutes: 0 };
}

export function useSubscription(userId: string | undefined) {
  const [state, setState] = useState<SubscriptionState>(() => {
    const cached = getCachedSubscription();
    return { plan: cached.plan, minutesUsed: cached.minutesUsed, rolloverMinutes: cached.rolloverMinutes, daysUntilReset: 30, cancelAtPeriodEnd: false, periodEnd: null, currentBilling: "monthly", loading: true };
  });

  const fetchSubscription = useCallback(() => {
    if (!userId) { setState(prev => ({ ...prev, loading: false })); return; }
    const supabase = createClient();
    Promise.all([
      supabase.from("subscriptions").select("plan, status, period_start, current_period_end, cancel_at_period_end").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("created_at").eq("id", userId).maybeSingle(),
    ]).then(([subResult, profileResult]) => {
      const plan: PlanId = subResult.data?.status === "active" ? (subResult.data.plan as PlanId) : "free";
      const cancelAtPeriodEnd = subResult.data?.cancel_at_period_end === true;
      const periodEnd = subResult.data?.current_period_end ?? null;
      const periodStart = subResult.data?.period_start ?? null;
      const isPaidPlan = plan === "pro" || plan === "studio";

      // Derive billing cycle from period length (~30 days monthly vs ~365 annual).
      let currentBilling: "monthly" | "annual" = "monthly";
      if (periodStart && periodEnd) {
        const s = new Date(periodStart + "T00:00:00").getTime();
        const e = new Date(periodEnd).getTime();
        const days = Math.round((e - s) / 86400000);
        currentBilling = days > 60 ? "annual" : "monthly";
      }

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

      supabase.from("usage").select("tracks_used, rollover_minutes").eq("user_id", userId).eq("month", periodKey).maybeSingle()
        .then(({ data }) => {
          const minutesUsed = data?.tracks_used ?? 0;
          const rolloverMinutes = PLANS[plan].minutesNeverReset ? (data?.rollover_minutes ?? 0) : 0;
          localStorage.setItem(SUB_CACHE_KEY, JSON.stringify({ plan, minutesUsed, rolloverMinutes }));
          setState({ plan, minutesUsed, rolloverMinutes, daysUntilReset, cancelAtPeriodEnd, periodEnd, currentBilling, loading: false });
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
  const minutesAvailable = planConfig.minutesIncluded + state.rolloverMinutes;
  const remainingMinutes = Math.max(0, minutesAvailable - state.minutesUsed);
  const remainingSeconds = remainingMinutes * 60;
  const usagePercent = minutesAvailable > 0 ? Math.min(100, (state.minutesUsed / minutesAvailable) * 100) : 0;

  return {
    ...state,
    refetch: fetchSubscription,
    planLabel: planConfig.label,
    isPro: state.plan === "pro" || state.plan === "studio",
    minutesIncluded: planConfig.minutesIncluded,
    rolloverMinutes: state.rolloverMinutes,
    minutesAvailable,
    remainingFormatted: formatMinutes(remainingSeconds),
    usagePercent,
    overLimit: state.minutesUsed >= minutesAvailable,
    batchLimit: planConfig.batchLimit,
    urlImport: planConfig.urlImport,
    stems: planConfig.stems,
    wavAllowed: planConfig.exportFormats.includes("WAV 24-bit"),
    queuePriority: planConfig.queuePriority,
    shareLinksPerMonth: planConfig.shareLinksPerMonth,
    minutesNeverReset: planConfig.minutesNeverReset,
    cancelAtPeriodEnd: state.cancelAtPeriodEnd,
    isCanceledButActive: (state.plan === "pro" || state.plan === "studio") && state.cancelAtPeriodEnd,
    periodEnd: state.periodEnd,
    currentBilling: state.currentBilling,
  };
}
