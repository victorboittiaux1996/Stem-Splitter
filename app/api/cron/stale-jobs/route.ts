import { NextRequest, NextResponse } from "next/server";
import { readJsonFromR2, writeJsonToR2, jobKey } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function GET(request: NextRequest) {
  // Validate Vercel cron secret — fail closed if not configured
  const expectedSecret = process.env.CRON_SECRET?.trim();
  if (!expectedSecret) {
    console.error("[cron/stale-jobs] CRON_SECRET not set — rejecting request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Query Supabase for jobs stuck in processing/uploading for >15 minutes
    const { data: staleJobs, error } = await supabaseAdmin
      .from("jobs")
      .select("id, workspace_id")
      .in("status", ["processing", "uploading"])
      .lt("created_at", new Date(Date.now() - 15 * 60 * 1000).toISOString())
      .limit(50);

    if (error) {
      console.error("[cron/stale-jobs] Supabase query failed:", error);
      return NextResponse.json({ error: "Query failed" }, { status: 500 });
    }

    if (!staleJobs || staleJobs.length === 0) {
      return NextResponse.json({ cleaned: 0 });
    }

    let cleaned = 0;

    await Promise.allSettled(
      staleJobs.map(async ({ id, workspace_id }: { id: string; workspace_id: string | null }) => {
        try {
          const key = jobKey(workspace_id, id);

          // Re-read from R2 to guard against race condition with a late Modal callback
          const existing = await readJsonFromR2<{ status?: string }>(key);
          if (!existing) return;

          // Skip if Modal already completed/failed the job after our Supabase query
          if (existing.status === "completed" || existing.status === "failed") return;

          await writeJsonToR2(key, {
            ...existing,
            status: "failed",
            error: "Processing timed out",
            progress: 0,
            stage: "",
          });

          await supabaseAdmin
            .from("jobs")
            .update({ status: "failed" })
            .eq("id", id);

          cleaned++;
        } catch (err) {
          console.error(`[cron/stale-jobs] Failed to clean job ${id}:`, err);
        }
      })
    );

    console.log(`[cron/stale-jobs] Cleaned ${cleaned}/${staleJobs.length} stale jobs`);
    return NextResponse.json({ cleaned });
  } catch (err) {
    console.error("[cron/stale-jobs] Unexpected error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
