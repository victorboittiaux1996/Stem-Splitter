/**
 * One-shot backfill: populate subscriptions.period_start from Polar API
 * for all Pro/Studio subscribers who don't have it yet.
 *
 * Run once after deploying the anniversary-reset migration:
 *   npx tsx scripts/backfill-period-start.ts
 *
 * Requires env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, POLAR_ACCESS_TOKEN
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../types/supabase";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const polarToken = process.env.POLAR_ACCESS_TOKEN!;

if (!supabaseUrl || !supabaseServiceKey || !polarToken) {
  console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, POLAR_ACCESS_TOKEN");
  process.exit(1);
}

const supabase = createClient<Database>(supabaseUrl, supabaseServiceKey);

async function getPolarSubscriptions(): Promise<{ customerEmail: string; periodStart: string }[]> {
  const results: { customerEmail: string; periodStart: string }[] = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.polar.sh/v1/subscriptions?page=${page}&limit=100&status=active`,
      { headers: { Authorization: `Bearer ${polarToken}` } }
    );

    if (!res.ok) {
      console.error("Polar API error:", res.status, await res.text());
      break;
    }

    const json = await res.json() as {
      items: { customer: { email: string } | null; current_period_start: string }[];
      pagination: { total_count: number; max_page: number };
    };

    for (const sub of json.items) {
      const email = sub.customer?.email;
      if (email && sub.current_period_start) {
        results.push({
          customerEmail: email,
          periodStart: new Date(sub.current_period_start).toISOString().slice(0, 10),
        });
      }
    }

    if (page >= json.pagination.max_page) break;
    page++;
  }

  return results;
}

async function main() {
  console.log("Fetching active Polar subscriptions...");
  const polarSubs = await getPolarSubscriptions();
  console.log(`Found ${polarSubs.length} active subscriptions in Polar.`);

  let updated = 0;
  let skipped = 0;
  let notFound = 0;

  for (const { customerEmail, periodStart } of polarSubs) {
    // Find user by email in profiles
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .maybeSingle();

    if (!profile?.id) {
      console.warn(`  No profile found for ${customerEmail}`);
      notFound++;
      continue;
    }

    // Check if already set
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("period_start")
      .eq("user_id", profile.id)
      .maybeSingle();

    if (sub?.period_start) {
      skipped++;
      continue;
    }

    // Update period_start
    const { error } = await supabase
      .from("subscriptions")
      .update({ period_start: periodStart })
      .eq("user_id", profile.id);

    if (error) {
      console.error(`  Failed to update ${customerEmail}:`, error.message);
    } else {
      console.log(`  ✓ ${customerEmail} → period_start = ${periodStart}`);
      updated++;
    }
  }

  console.log(`\nDone. Updated: ${updated}, Skipped (already set): ${skipped}, Not found: ${notFound}`);
}

main().catch(console.error);
