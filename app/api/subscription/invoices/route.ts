import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { getAuthUser } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";

// GET /api/subscription/invoices — list the authenticated user's paid
// invoices (Billing history card). For each paid invoice we surface the
// essentials: date, total, currency, invoice number. PDF download is served
// directly via Stripe's hosted URL (signed, expires ~30 days).

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
      const invoice = await stripe.invoices.retrieve(downloadId);
      const invoiceCustomer = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
      if (invoiceCustomer !== sub.stripe_customer_id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const url = invoice.invoice_pdf ?? invoice.hosted_invoice_url;
      if (!url) return NextResponse.json({ error: "Invoice not ready" }, { status: 404 });
      return NextResponse.redirect(url);
    }

    const list = await stripe.invoices.list({
      customer: sub.stripe_customer_id,
      limit: 24,
    });

    const invoices = list.data.map((inv) => ({
      id: inv.id,
      createdAt: new Date(inv.created * 1000).toISOString(),
      totalMajor: (inv.total ?? 0) / 100,
      currency: (inv.currency ?? "usd").toUpperCase(),
      invoiceNumber: inv.number ?? null,
      status: inv.status ?? "unknown",
      paid: inv.status === "paid",
    }));

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("Invoices list error:", error);
    return NextResponse.json({ error: "Failed to load invoices" }, { status: 500 });
  }
}
