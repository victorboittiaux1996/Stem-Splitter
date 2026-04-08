import { NextRequest, NextResponse } from "next/server";
import { polar, POLAR_PRODUCTS } from "@/lib/polar";
import { getAuthUser } from "@/lib/supabase/auth-helpers";

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json() as { plan: string };
    if (plan !== "pro" && plan !== "studio") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    if (!user.email) {
      return NextResponse.json({ error: "Account has no email address" }, { status: 400 });
    }

    const productId = POLAR_PRODUCTS[plan as "pro" | "studio"];
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ??
      `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("host")}`;

    const checkout = await polar.checkouts.create({
      products: [productId],
      customerEmail: user.email,
      successUrl: `${appUrl}/app?checkout=success`,
    });

    if (!checkout.url) {
      return NextResponse.json({ error: "Failed to get checkout URL" }, { status: 502 });
    }

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Failed to create checkout" }, { status: 500 });
  }
}
