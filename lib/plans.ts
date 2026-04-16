/**
 * Central plan configuration — single source of truth.
 * Change limits here and everything updates: sidebar, upload enforcement, settings UI.
 */

export type PlanId = "free" | "pro" | "studio";

export type BillingPeriod = "monthly" | "annual";

export interface PlanConfig {
  id: PlanId;
  label: string;
  tagline: string;
  minutesIncluded: number;
  maxFileSizeMB: number;
  priceUSD: number;
  yearlyPriceUSD: number; // per month when billed annually
  minutesNeverReset: boolean;
  batchLimit: number; // 0 = no batch
  shareLinksPerMonth: number; // 0 = no share links
  queuePriority: boolean;
  stems: number[];
  exportFormats: string[];
  urlImport: boolean;
  features: string[];
  comingSoon: string[];
}

export const PLANS: Record<PlanId, PlanConfig> = {
  free: {
    id: "free",
    label: "Free",
    tagline: "For trying it out",
    minutesIncluded: 10,
    maxFileSizeMB: 200,
    priceUSD: 0,
    yearlyPriceUSD: 0,
    minutesNeverReset: false,
    batchLimit: 0,
    shareLinksPerMonth: 0,
    queuePriority: false,
    stems: [2, 4],
    exportFormats: ["MP3 320kbps"],
    urlImport: false,
    features: [
      "10 min/month",
      "200 MB file limit",
      "2 & 4 stems",
      "MP3 export",
      "Standard queue",
    ],
    comingSoon: [],
  },
  pro: {
    id: "pro",
    label: "Pro",
    tagline: "For regular use",
    minutesIncluded: 90,
    maxFileSizeMB: 2048,
    priceUSD: 7.99,
    yearlyPriceUSD: 5.59,
    minutesNeverReset: true,
    batchLimit: 5,
    shareLinksPerMonth: 3,
    queuePriority: false,
    stems: [2, 4, 6],
    exportFormats: ["WAV 24-bit", "MP3 320kbps"],
    urlImport: true,
    features: [
      "Minutes never reset",
      "90 min/month",
      "2 GB uploads",
      "2, 4 and 6 stems",
      "MP3 & WAV export",
      "Batch up to 5 tracks",
      "Import from YouTube, Spotify, Dropbox",
      "3 share links/month",
    ],
    comingSoon: [],
  },
  studio: {
    id: "studio",
    label: "Studio",
    tagline: "For heavy sessions",
    minutesIncluded: 250,
    maxFileSizeMB: 2048,
    priceUSD: 15.99,
    yearlyPriceUSD: 11.19,
    minutesNeverReset: true,
    batchLimit: 30,
    shareLinksPerMonth: 10,
    queuePriority: true,
    stems: [2, 4, 6],
    exportFormats: ["WAV 24-bit", "MP3 320kbps"],
    urlImport: true,
    features: [
      "Minutes never reset",
      "250 min/month",
      "2 GB uploads",
      "2, 4 and 6 stems",
      "MP3 & WAV export",
      "Batch up to 30 tracks",
      "Import from YouTube, Spotify, Dropbox",
      "10 share links/month",
      "Priority queue",
    ],
    comingSoon: ["Multi-workspace", "Mobile app", "VST plugin"],
  },
};

/** Annual price for a plan (total per year) */
export function getAnnualPrice(plan: PlanId): number {
  return Math.round(PLANS[plan].yearlyPriceUSD * 12 * 100) / 100;
}

/** Savings percentage for annual vs monthly */
export const ANNUAL_DISCOUNT_PERCENT = 30;

/** Format seconds as "M:SS" (e.g. 567 → "9:27") */
export function formatMinutes(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

