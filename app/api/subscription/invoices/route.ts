import { NextRequest, NextResponse } from "next/server";
import { polar } from "@/lib/polar";
import { getAuthUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /api/subscription/invoices — list the authenticated user's paid orders
// (the customer-facing "Billing history"). For each paid order we surface the
// essentials: date, total, currency, and invoiceNumber. The PDF is downloaded
// on demand via ?download=<orderId>, which proxies to Polar's signed URL.

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: sub } = await supabaseAdmin
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!sub?.stripe_customer_id) {
      return NextResponse.json({ invoices: [] });
    }

    const downloadId = req.nextUrl.searchParams.get("download");
    if (downloadId) {
      // Ownership check: only allow downloading an invoice that belongs to this customer.
      const order = await polar.orders.get({ id: downloadId });
      if (order.customerId !== sub.stripe_customer_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const inv = await polar.orders.invoice({ id: downloadId });
      if (!inv?.url) return NextResponse.json({ error: "Invoice not ready" }, { status: 404 });
      return NextResponse.redirect(inv.url);
    }

    const iter = await polar.orders.list({ customerId: sub.stripe_customer_id });
    const invoices: Array<{
      id: string;
      createdAt: string;
      totalMajor: number;
      currency: string;
      invoiceNumber: string | null;
      status: string;
      paid: boolean;
    }> = [];

    for await (const page of iter) {
      for (const order of page.result.items) {
        invoices.push({
          id: order.id,
          createdAt: (order.createdAt instanceof Date ? order.createdAt : new Date(order.createdAt)).toISOString(),
          totalMajor: Math.round((order.totalAmount ?? 0)) / 100,
          currency: (order.currency ?? "USD").toUpperCase(),
          invoiceNumber: order.invoiceNumber ?? null,
          status: String(order.status),
          paid: !!order.paid,
        });
      }
      if (invoices.length >= 24) break;
    }

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("Invoices list error:", error);
    return NextResponse.json({ error: "Failed to load invoices" }, { status: 500 });
  }
}
