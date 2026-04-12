import { NextRequest, NextResponse } from "next/server";
import { polar } from "@/lib/polar";
import { getAuthUser } from "@/lib/supabase/auth-helpers";

export async function GET(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const checkoutId = req.nextUrl.searchParams.get("checkoutId");
  if (!checkoutId) {
    return NextResponse.json({ error: "Missing checkoutId" }, { status: 400 });
  }

  try {
    const checkout = await polar.checkouts.get({ id: checkoutId });
    // Verify this checkout belongs to the authenticated user
    if (!checkout.customerEmail || !user.email || checkout.customerEmail !== user.email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json({ status: checkout.status });
  } catch (error) {
    console.error("Checkout status error:", error);
    return NextResponse.json({ error: "Failed to get checkout status" }, { status: 500 });
  }
}
