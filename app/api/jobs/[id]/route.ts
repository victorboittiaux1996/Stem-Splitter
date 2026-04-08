import { NextRequest, NextResponse } from "next/server";
import { getJobForWorkspace, writeJsonToR2, jobKey } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wsId = request.headers.get("x-workspace-id") || null;
  const job = await getJobForWorkspace(wsId, id);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json(job);
}

// Called by the Modal worker to push real-time progress updates
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Verify caller is the Modal worker via shared secret
  const expectedSecret = process.env.MODAL_CALLBACK_SECRET;
  if (!expectedSecret) {
    console.warn("MODAL_CALLBACK_SECRET not set — PATCH /api/jobs is unprotected");
  }
  const secret = request.headers.get("x-modal-secret");
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const updates = await request.json();
    const wsId = (updates.workspaceId as string | null) ?? request.headers.get("x-workspace-id") ?? null;
    const existing = await getJobForWorkspace(wsId, id);
    if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const key = jobKey(existing.workspaceId ?? wsId, id);
    const merged = { ...existing, ...updates };
    await writeJsonToR2(key, merged);

    // Track minutes when job completes with a duration
    if (updates.status === "completed" && typeof merged.duration === "number" && merged.userId) {
      trackMinutesUsed(merged.userId, merged.duration).catch((err) =>
        console.error("Failed to track usage:", err)
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

/**
 * Add audio duration to user's monthly minutes.
 * Uses admin client (no cookies — called from Modal worker callback).
 * Atomic via PostgreSQL function — no read-then-write race condition.
 */
async function trackMinutesUsed(userId: string, durationSeconds: number) {
  if (durationSeconds <= 0) return; // guard against spoofed/zero durations
  const month = new Date().toISOString().slice(0, 7);
  const minutesToAdd = durationSeconds / 60;

  const { error } = await supabaseAdmin.rpc("increment_usage", {
    p_user_id: userId,
    p_month: month,
    p_minutes: minutesToAdd,
  });

  if (error) throw error;
}
