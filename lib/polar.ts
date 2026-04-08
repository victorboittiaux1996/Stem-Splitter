import { Polar } from "@polar-sh/sdk";

export const polar = new Polar({
  accessToken: process.env.POLAR_ACCESS_TOKEN!,
});

// Product IDs from Polar dashboard
export const POLAR_PRODUCTS = {
  free: process.env.POLAR_PRODUCT_FREE_ID!,
  pro: process.env.POLAR_PRODUCT_PRO_ID!,
  studio: process.env.POLAR_PRODUCT_STUDIO_ID!,
} as const;

// Map Polar product IDs back to plan names
export function productIdToPlan(productId: string): "free" | "pro" | "studio" {
  if (productId === POLAR_PRODUCTS.pro) return "pro";
  if (productId === POLAR_PRODUCTS.studio) return "studio";
  return "free";
}
