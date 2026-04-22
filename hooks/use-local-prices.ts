"use client";

import { useEffect, useState } from "react";

// Shared hook for multi-currency price display across all surfaces that
// show pricing (/pricing page, /app Plans & Pricing, homepage hero).
//
// Fetches /api/pricing/prices once on mount — the API reads CF-IPCountry
// from the request and returns amounts + formatted display strings in the
// visitor's local currency (USD/EUR/GBP in V1). Server is the source of
// truth, driven by Stripe Price.currency_options, so the display here
// always matches what the customer will be charged at checkout.
//
// Returns null while loading or on failure — callers should fall back to
// their hardcoded USD sticker price (lib/plans.ts) so the UI degrades
// gracefully.

export type LocalPrices = {
  currency: string;
  prices: {
    pro_monthly: { amount: number; display: string };
    pro_annual: { amount: number; display: string };
    studio_monthly: { amount: number; display: string };
    studio_annual: { amount: number; display: string };
  };
};

export function useLocalPrices(): LocalPrices | null {
  const [data, setData] = useState<LocalPrices | null>(null);

  useEffect(() => {
    let canceled = false;
    fetch("/api/pricing/prices")
      .then((r) => r.json())
      .then((json: LocalPrices) => {
        if (!canceled && json?.prices) setData(json);
      })
      .catch(() => {
        // Silent fallback — caller uses their hardcoded USD sticker.
      });
    return () => { canceled = true; };
  }, []);

  return data;
}

/**
 * Format a minor-unit amount as a currency string.
 * Uses Intl.NumberFormat with sensible defaults (no trailing zeros when
 * the amount is a whole unit, e.g. €62 instead of €62.00).
 */
export function formatCurrency(
  amountMinor: number,
  currency: string,
  opts?: { maxFractionDigits?: number },
): string {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
      maximumFractionDigits: opts?.maxFractionDigits ?? 2,
    }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency.toUpperCase()}`;
  }
}
