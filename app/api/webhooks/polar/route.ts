import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { productIdToPlan } from "@/lib/polar";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  let event;
  try {
    event = validateEvent(body, headers, process.env.POLAR_WEBHOOK_SECRET!);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
    console.error("Webhook parse error:", error);
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "subscription.created":
      case "subscription.updated":
      case "subscription.active": {
        const sub = event.data;
        const email = sub.customer?.email;
        if (!email) break;

        // Find the Supabase user by email
        const userId = await findUserByEmail(email);
        if (!userId) {
          console.error("Polar webhook: no user found for email", email, "— returning 500 so Polar retries");
          return NextResponse.json({ error: "User not found" }, { status: 500 });
        }

        const plan = sub.product ? productIdToPlan(sub.product.id) : "free";

        const periodEnd = sub.currentPeriodEnd
          ? new Date(sub.currentPeriodEnd).toISOString()
          : null;

        await supabaseAdmin
          .from("subscriptions")
          .upsert(
            {
              user_id: userId,
              plan,
              status: sub.status === "active" ? "active" : sub.status,
              stripe_customer_id: sub.customer?.id ?? null,   // stores Polar customer ID
              stripe_subscription_id: sub.id,                  // stores Polar subscription ID
              current_period_end: periodEnd,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );
        break;
      }

      case "subscription.canceled":
      case "subscription.revoked": {
        const sub = event.data;
        const email = sub.customer?.email;
        if (!email) break;

        const userId = await findUserByEmail(email);
        if (!userId) {
          console.error("Polar webhook: no user found for email", email, "— returning 500 so Polar retries");
          return NextResponse.json({ error: "User not found" }, { status: 500 });
        }

        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "canceled", // both canceled and revoked map to "canceled" (DB CHECK constraint)
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
        break;
      }
    }

    return NextResponse.json({ received: true }, { status: 202 });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function findUserByEmail(email: string): Promise<string | null> {
  // Check profiles table first (faster, no admin API needed)
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (data?.id) return data.id;

  // Fallback: paginate through auth users (only hit if profiles table miss)
  let page = 1;
  const perPage = 50;
  while (true) {
    const { data: authData } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    const users = authData?.users ?? [];
    const match = users.find((u) => u.email === email);
    if (match) return match.id;
    if (users.length < perPage) break;
    page++;
  }
  return null;
}
