/**
 * Central plan configuration — single source of truth.
 * Change limits here and everything updates: sidebar, upload enforcement, settings UI.
 */

export type PlanId = "free" | "pro" | "studio";

export interface PlanConfig {
  id: PlanId;
  label: string;
  minutesIncluded: number; // minutes per month (0 = unlimited concept doesn't apply here)
  maxFileSizeMB: number;
  priceUSD: number; // monthly price in dollars (0 = free)
  features: string[];
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    label: "Free Plan",
    minutesIncluded: 10,
    maxFileSizeMB: 200,
    priceUSD: 0,
    features: ["10 min/month", "200MB file limit", "Standard queue"],
  },
  pro: {
    id: "pro",
    label: "Pro Plan",
    minutesIncluded: 90,
    maxFileSizeMB: 2048,
    priceUSD: 9.99,
    features: ["90 min/month", "2GB uploads", "Fast queue", "Batch processing"],
  },
  studio: {
    id: "studio",
    label: "Studio Plan",
    minutesIncluded: 250,
    maxFileSizeMB: 2048,
    priceUSD: 29.99,
    features: ["250 min/month", "2GB uploads", "Fast queue", "Batch processing", "VST plugin", "API access"],
  },
};

/** Format seconds as "M:SS" (e.g. 567 → "9:27") */
export function formatMinutes(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

/** Get remaining seconds from minutes used and plan limit */
export function getRemainingSeconds(minutesUsed: number, plan: PlanId): number {
  const limit = PLANS[plan].minutesIncluded;
  const remainingMinutes = Math.max(0, limit - minutesUsed);
  return remainingMinutes * 60;
}
