"use client";

import { useEffect, useState } from "react";

// Shared hook for multi-currency price display across all surfaces that
// show pricing (/pricing page, /app Plans & Pricing, homepage hero).
//
// Two-phase rendering to avoid the USD→EUR flash:
//   1. Synchronous: guess currency from navigator.language → render
//      hardcoded fallback amounts immediately (zero network). Works for
//      99%+ of real EU/UK users whose browser locale matches their country.
//   2. Async: fetch /api/pricing/prices which reads CF-IPCountry
//      server-side. Replaces the guess if different (handles VPN, laptop
//      locale ≠ actual country).
//
// Source of truth is always Stripe Price.currency_options — the displayed
// price equals what the customer is charged at checkout.

export type LocalPrices = {
  currency: string;
  prices: {
    pro_monthly: { amount: number; display: string };
    pro_annual: { amount: number; display: string };
    studio_monthly: { amount: number; display: string };
    studio_annual: { amount: number; display: string };
  };
};

// Fallback amounts for instant render — MUST mirror the currency_options
// on the Stripe Prices. If you run scripts to re-create prices, update
// here too or you'll briefly show the wrong amount before the API replaces
// it.
const FALLBACK_PRICES: Record<string, LocalPrices["prices"]> = {
  usd: {
    pro_monthly: { amount: 799, display: "$7.99" },
    pro_annual: { amount: 6708, display: "$67.08" },
    studio_monthly: { amount: 1599, display: "$15.99" },
    studio_annual: { amount: 13428, display: "$134.28" },
  },
  eur: {
    pro_monthly: { amount: 749, display: "€7.49" },
    pro_annual: { amount: 6299, display: "€62.99" },
    studio_monthly: { amount: 1499, display: "€14.99" },
    studio_annual: { amount: 12588, display: "€125.88" },
  },
  gbp: {
    pro_monthly: { amount: 649, display: "£6.49" },
    pro_annual: { amount: 5499, display: "£54.99" },
    studio_monthly: { amount: 1299, display: "£12.99" },
    studio_annual: { amount: 10999, display: "£109.99" },
  },
};

const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR",
  "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO",
  "SE", "SI", "SK",
]);

function guessCurrencyFromBrowser(): "usd" | "eur" | "gbp" {
  if (typeof window === "undefined") return "usd";
  const langs = (navigator.languages && navigator.languages.length)
    ? navigator.languages
    : [navigator.language || "en-US"];
  for (const lang of langs) {
    const country = lang.split("-")[1]?.toUpperCase();
    if (country === "GB") return "gbp";
    if (country && EU_COUNTRIES.has(country)) return "eur";
  }
  return "usd";
}

function initialGuess(): LocalPrices | null {
  // SSR-safe: navigator is undefined during server render → return null
  // so the caller falls back to its own USD sticker without flash.
  if (typeof window === "undefined") return null;
  const currency = guessCurrencyFromBrowser();
  return { currency, prices: FALLBACK_PRICES[currency] };
}

export function useLocalPrices(): LocalPrices | null {
  const [data, setData] = useState<LocalPrices | null>(initialGuess);

  useEffect(() => {
    let canceled = false;
    fetch("/api/pricing/prices")
      .then((r) => r.json())
      .then((json: LocalPrices) => {
        if (!canceled && json?.prices) setData(json);
      })
      .catch(() => {
        // Silent — initialGuess already gave a reasonable display.
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
