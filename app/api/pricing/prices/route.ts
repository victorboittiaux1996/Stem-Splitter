import { NextRequest, NextResponse } from "next/server";
import { stripe, STRIPE_PRICES, getCurrencyFromHeaders, type StripeCurrency } from "@/lib/stripe";

// GET /api/pricing/prices — returns the display prices for all 4 plans,
// localized to the caller's currency based on CF-IPCountry (or overridable
// via ?currency=eur). Reads from Stripe as the source of truth so the
// public /pricing page and the checkout always agree.
//
// Response shape:
//   {
//     currency: "eur",
//     prices: {
//       pro_monthly: { amount: 749, display: "€7.49" },
//       pro_annual: { amount: 6299, display: "€62.99" },
//       studio_monthly: { amount: 1499, display: "€14.99" },
//       studio_annual: { amount: 12588, display: "€125.88" }
//     }
//   }
//
// Amounts are in minor units (cents/pence/…). `display` is a formatted
// string using Intl.NumberFormat for the caller's locale.

// Force dynamic rendering — we read CF-IPCountry from headers and accept
// ?currency=... query params, so this must not be statically pre-rendered.
export const dynamic = "force-dynamic";

type StripePrice = {
  id: string;
  currency: string;
  unit_amount: number | null;
  currency_options?: Record<string, { unit_amount: number | null }> | null;
};

const PRICE_KEYS = ["pro_monthly", "pro_annual", "studio_monthly", "studio_annual"] as const;
type PriceKey = typeof PRICE_KEYS[number];

export async function GET(req: NextRequest) {
  try {
    const override = req.nextUrl.searchParams.get("currency")?.toLowerCase();
    const currency: StripeCurrency =
      override === "eur" || override === "gbp" || override === "usd"
        ? (override as StripeCurrency)
        : getCurrencyFromHeaders(req.headers);

    const entries = await Promise.all(
      PRICE_KEYS.map(async (key) => {
        const price = (await stripe.prices.retrieve(STRIPE_PRICES[key], {
          expand: ["currency_options"],
        })) as unknown as StripePrice;
        return [key, price] as const;
      }),
    );

    const prices: Record<PriceKey, { amount: number; display: string }> = {
      pro_monthly: { amount: 0, display: "" },
      pro_annual: { amount: 0, display: "" },
      studio_monthly: { amount: 0, display: "" },
      studio_annual: { amount: 0, display: "" },
    };

    for (const [key, price] of entries) {
      const amount =
        price.currency_options?.[currency]?.unit_amount ??
        price.unit_amount ??
        0;
      prices[key] = {
        amount,
        display: formatMoney(amount, currency),
      };
    }

    return NextResponse.json({ currency, prices });
  } catch (err) {
    console.error("pricing/prices error:", err);
    return NextResponse.json({ error: "Failed to fetch pricing" }, { status: 500 });
  }
}

function formatMoney(amountMinor: number, currency: string): string {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      // Keep the "7.99" / "€7.49" feel — never show decimals when the trailing
      // digits are zero (€62 instead of €62.00). Stripe rounds display to the
      // major unit automatically via formatMoney callers when they use Intl.
      minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency.toUpperCase()}`;
  }
}
