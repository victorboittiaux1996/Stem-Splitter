import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
});

// Product IDs from Polar dashboard.
// .trim() defends against trailing whitespace/newlines in Vercel env vars —
// without it, productIdToPlan() strict-equality fails for annual plans and
// users get silently demoted to "free" after switching billing cycles.
export const POLAR_PRODUCTS = {
  free: process.env.POLAR_PRODUCT_FREE_ID?.trim() ?? "",
  pro: process.env.POLAR_PRODUCT_PRO_ID?.trim() ?? "",
  studio: process.env.POLAR_PRODUCT_STUDIO_ID?.trim() ?? "",
  pro_annual: process.env.POLAR_PRODUCT_PRO_ANNUAL_ID?.trim() ?? "",
  studio_annual: process.env.POLAR_PRODUCT_STUDIO_ANNUAL_ID?.trim() ?? "",
} as const;

/** Get the right product ID for a plan + billing period */
export function getProductId(plan: "pro" | "studio", billing: "monthly" | "annual"): string {
  if (billing === "annual") {
    return plan === "studio" ? POLAR_PRODUCTS.studio_annual : POLAR_PRODUCTS.pro_annual;
  }
  return plan === "studio" ? POLAR_PRODUCTS.studio : POLAR_PRODUCTS.pro;
}

// Map Polar product IDs back to plan names
export function productIdToPlan(productId: string): "free" | "pro" | "studio" {
  if (productId === POLAR_PRODUCTS.pro || productId === POLAR_PRODUCTS.pro_annual) return "pro";
  if (productId === POLAR_PRODUCTS.studio || productId === POLAR_PRODUCTS.studio_annual) return "studio";
  return "free";
}
