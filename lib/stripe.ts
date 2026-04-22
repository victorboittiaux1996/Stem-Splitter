import Stripe from "stripe";

// Single Stripe client used across all API routes + server components.
// .trim() on every env read guards against trailing whitespace/newlines from
// Vercel (same class of bug that bit us on Polar — see feedback_307_redirect).
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!.trim(), {
  // Omitting apiVersion uses the SDK's built-in default. Pinning to a future
  // date causes type incompatibilities (e.g. 2025-09-30 moves
  // current_period_end off the subscription root, breaking callers).
  apiVersion: undefined,
  typescript: true,
  appInfo: {
    name: "44Stems",
    version: "1.0.0",
    url: "https://www.44stems.com",
  },
});

// One Stripe Price per plan+billing combo. Each Price carries USD (default)
// + EUR + GBP inside `currency_options` — the actual amount charged is
// picked automatically at Checkout based on the customer's currency.
export const STRIPE_PRICES = {
  pro_monthly: process.env.STRIPE_PRICE_PRO_MONTHLY?.trim() ?? "",
  pro_annual: process.env.STRIPE_PRICE_PRO_ANNUAL?.trim() ?? "",
  studio_monthly: process.env.STRIPE_PRICE_STUDIO_MONTHLY?.trim() ?? "",
  studio_annual: process.env.STRIPE_PRICE_STUDIO_ANNUAL?.trim() ?? "",
} as const;

export type StripeCurrency = "usd" | "eur" | "gbp";

export const SUPPORTED_CURRENCIES: StripeCurrency[] = ["usd", "eur", "gbp"];

/** Get the Stripe Price id for a plan + billing combination. */
export function getPriceId(
  plan: "pro" | "studio",
  billing: "monthly" | "annual",
): string {
  if (billing === "annual") {
    return plan === "studio" ? STRIPE_PRICES.studio_annual : STRIPE_PRICES.pro_annual;
  }
  return plan === "studio" ? STRIPE_PRICES.studio_monthly : STRIPE_PRICES.pro_monthly;
}

/** Map a Stripe Price id back to a plan name. Returns "free" on unknown. */
export function priceIdToPlan(priceId: string): "free" | "pro" | "studio" {
  if (priceId === STRIPE_PRICES.pro_monthly || priceId === STRIPE_PRICES.pro_annual) return "pro";
  if (priceId === STRIPE_PRICES.studio_monthly || priceId === STRIPE_PRICES.studio_annual) return "studio";
  return "free";
}

/** Map a Stripe Price id to its billing interval. */
export function priceIdToInterval(priceId: string): "month" | "year" {
  if (priceId === STRIPE_PRICES.pro_annual || priceId === STRIPE_PRICES.studio_annual) return "year";
  return "month";
}

/**
 * Map an ISO 3166-1 alpha-2 country code to the currency we bill in.
 *
 * V1 supports 3 currencies (USD / EUR / GBP). Every other country falls back
 * to USD. The mapping only covers countries where we offer a distinct local
 * price — other EU countries still pay in EUR, UK in GBP, everyone else USD.
 */
const EU_COUNTRIES = new Set([
  "AT", "BE", "BG", "CY", "CZ", "DE", "DK", "EE", "ES", "FI", "FR", "GR",
  "HR", "HU", "IE", "IT", "LT", "LU", "LV", "MT", "NL", "PL", "PT", "RO",
  "SE", "SI", "SK",
]);

export function countryToCurrency(country: string | null | undefined): StripeCurrency {
  if (!country) return "usd";
  const c = country.toUpperCase();
  if (c === "GB") return "gbp";
  if (EU_COUNTRIES.has(c)) return "eur";
  return "usd";
}

/**
 * Read the visitor's country from Cloudflare's CF-IPCountry header.
 * Falls back to Vercel's geo header. Both are trusted — set by the edge.
 */
export function getCurrencyFromHeaders(headers: Headers): StripeCurrency {
  const country =
    headers.get("cf-ipcountry")?.trim() ??
    headers.get("x-vercel-ip-country")?.trim() ??
    null;
  return countryToCurrency(country);
}
