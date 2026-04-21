import { NextRequest, NextResponse } from "next/server";
import { polar } from "@/lib/polar";
import { getAuthUser } from "@/lib/supabase/auth-helpers";

// Look up a discount by code on the Polar side. Authenticated only (prevents
// anonymous scraping that would leak codes). We intentionally do NOT enforce
// a strict rate limit here — Polar itself rate-limits and frontend debouncing
// keeps load low. If we ever see abuse, add a per-user counter in Supabase.

type Body = { code: string; productId?: string };

type ApiResponse =
  | { valid: true; discountId: string; percentOff?: number; amountOff?: number; duration?: string; reason?: string }
  | { valid: false; reason: string };

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json<ApiResponse>({ valid: false, reason: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as Body;
    const code = (body.code ?? "").trim();
    if (!code) {
      return NextResponse.json<ApiResponse>({ valid: false, reason: "Missing code" }, { status: 400 });
    }

    // .trim() defends against env vars with trailing whitespace/newline, a recurring
    // issue with Vercel dashboard paste behavior.
    const orgId = process.env.POLAR_ORGANIZATION_ID?.trim();
    if (!orgId) {
      return NextResponse.json<ApiResponse>({ valid: false, reason: "Server not configured" }, { status: 500 });
    }

    // Polar's discounts.list supports pagination. We fetch one page and filter by code.
    // If the user has more than ~100 discounts this will need paging; fine for now.
    const list = await polar.discounts.list({ organizationId: orgId, limit: 100 });
    const items = list.result?.items ?? [];

    // We intentionally collapse every failure reason to the same message. Distinct
    // reasons (expired / fully redeemed / wrong product / etc.) are an info leak:
    // an authenticated attacker can enumerate valid codes by iterating a dictionary
    // and treating any response other than "Invalid or expired code" as a hit.
    const GENERIC_INVALID = "Invalid or expired code";

    const match = items.find(
      (d) => typeof d.code === "string" && d.code.toUpperCase() === code.toUpperCase(),
    );

    if (!match) {
      return NextResponse.json<ApiResponse>({ valid: false, reason: GENERIC_INVALID }, { status: 200 });
    }

    const now = Date.now();
    const startsAt = match.startsAt ? new Date(match.startsAt).getTime() : null;
    const endsAt = match.endsAt ? new Date(match.endsAt).getTime() : null;
    if (startsAt && now < startsAt) {
      return NextResponse.json<ApiResponse>({ valid: false, reason: GENERIC_INVALID }, { status: 200 });
    }
    if (endsAt && now > endsAt) {
      return NextResponse.json<ApiResponse>({ valid: false, reason: GENERIC_INVALID }, { status: 200 });
    }

    const maxRedemptions = match.maxRedemptions ?? null;
    const redemptionsCount = match.redemptionsCount ?? 0;
    if (typeof maxRedemptions === "number" && redemptionsCount >= maxRedemptions) {
      return NextResponse.json<ApiResponse>({ valid: false, reason: GENERIC_INVALID }, { status: 200 });
    }

    // Product scope: if the discount restricts to specific products and the target
    // productId isn't in the list, reject with the same generic message.
    if (body.productId && Array.isArray(match.products) && match.products.length > 0) {
      const allowedIds = match.products.map((p) => p.id);
      if (!allowedIds.includes(body.productId)) {
        return NextResponse.json<ApiResponse>(
          { valid: false, reason: GENERIC_INVALID },
          { status: 200 },
        );
      }
    }

    const basisPoints = (match as { basisPoints?: number }).basisPoints;
    const amount = (match as { amount?: number }).amount;
    const duration = (match as { duration?: string }).duration;

    return NextResponse.json<ApiResponse>({
      valid: true,
      discountId: match.id,
      ...(typeof basisPoints === "number" ? { percentOff: basisPoints / 100 } : {}),
      ...(typeof amount === "number" ? { amountOff: amount } : {}),
      ...(typeof duration === "string" ? { duration } : {}),
    });
  } catch (error) {
    console.error("validate-discount error:", error);
    return NextResponse.json<ApiResponse>({ valid: false, reason: "Lookup failed" }, { status: 500 });
  }
}
