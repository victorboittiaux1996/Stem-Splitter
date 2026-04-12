import { NextRequest, NextResponse } from "next/server";
import { getJobForWorkspace, writeJsonToR2, jobKey } from "@/lib/r2";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { computePeriodKey } from "@/lib/period";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const wsId = request.headers.get("x-workspace-id") || null;
  const job = await getJobForWorkspace(wsId, id);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json(job);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const expectedSecret = process.env.MODAL_CALLBACK_SECRET?.trim();
  if (!expectedSecret) console.warn("MODAL_CALLBACK_SECRET not set — PATCH /api/jobs is unprotected");
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
    if (updates.status === "completed" && typeof merged.duration === "number" && merged.userId) {
      try { await trackMinutesUsed(merged.userId, merged.duration); }
      catch (err) { console.error("Failed to track usage:", err); }
    }
    if (updates.status === "completed") merged.completedAt = Date.now();
    await writeJsonToR2(key, merged);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function getUserAnchorDate(userId: string): Promise<Date> {
  const [subResult, profileResult] = await Promise.all([
    supabaseAdmin.from("subscriptions").select("plan, status, period_start").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("profiles").select("created_at").eq("id", userId).maybeSingle(),
  ]);
  const sub = subResult.data;
  if (sub?.status === "active" && (sub.plan === "pro" || sub.plan === "studio") && sub.period_start) {
    return new Date(sub.period_start + "T00:00:00");
  }
  if (profileResult.data?.created_at) return new Date(profileResult.data.created_at);
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function trackMinutesUsed(userId: string, durationSeconds: number) {
  if (durationSeconds <= 0) return;
  const anchor = await getUserAnchorDate(userId);
  const periodKey = computePeriodKey(anchor);
  const { error } = await supabaseAdmin.rpc("increment_usage", {
    p_user_id: userId,
    p_month: periodKey,
    p_minutes: durationSeconds / 60,
  });
  if (error) throw error;
}
