import { NextRequest, NextResponse } from "next/server";
import { getJobForWorkspace, writeJsonToR2, jobKey } from "@/lib/r2";
import { getAuthUser, userWorkspaceId } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { computePeriodKey, getPreviousPeriodKey } from "@/lib/period";
import { PLANS, type PlanId } from "@/lib/plans";
import { sendTelegramAlert } from "@/lib/telegram";

export const maxDuration = 30;


const OVERLAP_LABEL: Record<number, string> = { 2: "Fast", 8: "Balanced", 16: "High" };

function fmtSeconds(s: number) {
  if (s < 60) return `${s.toFixed(0)}s`;
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}m${sec > 0 ? `${sec}s` : ""}`;
}

async function notifyJob(status: "completed" | "failed", job: Record<string, unknown>) {
  if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) return;
  const fileName = (job.fileName as string | undefined) ?? "unknown";
  const mode = (job.mode as string | undefined) ?? "?";
  const trackDur = typeof job.duration === "number" ? job.duration : null; // audio duration from Modal
  const errorCode = (job.error_code as string | undefined) ?? null;
  const phase = job.phase_timings as Record<string, number> | undefined;
  const processingDur = phase?.total_wall_time ?? null; // actual GPU processing time
  const overlap = typeof job.overlap === "number" ? job.overlap : null;
  const bpm = typeof job.bpm === "number" ? job.bpm : null;
  const key = (job.key as string | undefined) ?? null;

  let msg = status === "completed" ? `✅ <b>Completed</b>\n` : `❌ <b>Failed</b>\n`;
  msg += `🎵 ${fileName}\n`;

  // Settings
  const settings = [
    mode,
    overlap != null ? (OVERLAP_LABEL[overlap] ?? `overlap=${overlap}`) : null,
  ].filter(Boolean).join(" · ");
  if (settings) msg += `⚙️ ${settings}\n`;

  // Track info
  const trackInfo = [
    trackDur != null ? fmtSeconds(trackDur) : null,
    bpm != null ? `${Math.round(bpm)} BPM` : null,
    key ?? null,
  ].filter(Boolean).join(" · ");
  if (trackInfo) msg += `🎼 ${trackInfo}\n`;

  if (status === "completed") {
    if (processingDur != null) {
      msg += `⏱ <b>${fmtSeconds(processingDur)}</b> processing\n`;
    }
    if (phase) {
      const steps: Array<[string, string]> = [
        ["download_input",   "download  "],
        ["wav24_transcode",  "transcode "],
        ["analyze_track",    "analyze   "],
        ["sep_vocal_infer",  "infer_voc "],
        ["sep_instru_infer", "infer_inst"],
        ["upload_r2_total",  "upload    "],
      ];
      const lines = steps
        .map(([k, label]) => phase[k] != null ? `  ${label}  ${fmtSeconds(phase[k])}` : null)
        .filter(Boolean);
      if (phase.cold === 1) {
        const loadVoc = phase.sep_vocal_load_model ?? 0;
        const loadInst = phase.sep_instru_load_model ?? 0;
        const coldLoad = loadVoc + loadInst;
        if (coldLoad > 0) lines.push(`  load_model  ${fmtSeconds(coldLoad)}`);
      }
      if (lines.length) msg += `<pre>${lines.join("\n")}</pre>`;
      if (phase.cold === 1) msg += "🥶 Cold start\n";
    }
  }

  if (status === "failed" && errorCode) {
    msg += `❌ <code>${errorCode}</code>\n`;
  }

  await sendTelegramAlert(msg);
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { id } = await params;
  const wsId = userWorkspaceId(user.id);
  const job = await getJobForWorkspace(wsId, id);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (job.userId && job.userId !== user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json(job);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const _t0 = Date.now();
  const expectedSecret = process.env.MODAL_CALLBACK_SECRET?.trim();
  if (!expectedSecret) console.warn("MODAL_CALLBACK_SECRET not set — PATCH /api/jobs is unprotected");
  const secret = request.headers.get("x-modal-secret");
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  try {
    const updates = await request.json();
    const wsId = (updates.workspaceId as string | null) ?? null;
    const _tGetJob = Date.now();
    const existing = await getJobForWorkspace(wsId, id);
    console.log(`[TIMING] PATCH /api/jobs/${id} phase=getJob dur=${Date.now() - _tGetJob}ms`);
    if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const key = jobKey(existing.workspaceId ?? wsId, id);
    const merged = { ...existing, ...updates };
    if (updates.status === "completed" && typeof merged.duration === "number" && merged.userId) {
      const _tTrack = Date.now();
      try {
        await trackMinutesUsed(merged.userId, merged.duration);
        console.log(`[TIMING] PATCH /api/jobs/${id} phase=trackMinutesUsed dur=${Date.now() - _tTrack}ms duration_s=${merged.duration}`);
      } catch (err) {
        console.error("Failed to track usage:", err);
      }
    }
    if (updates.status === "completed") merged.completedAt = Date.now();
    const _tWrite = Date.now();
    await writeJsonToR2(key, merged);
    console.log(`[TIMING] PATCH /api/jobs/${id} phase=r2_write_completed dur=${Date.now() - _tWrite}ms total=${Date.now() - _t0}ms`);

    // Persist stats + notify on completion/failure (best-effort)
    if (updates.status === "completed" || updates.status === "failed") {
      const phaseTims = merged.phase_timings as Record<string, number> | undefined;
      console.log(`[MONITOR] job=${id} status=${updates.status} phase_timings_at_callback=${JSON.stringify(phaseTims ?? null)}`);
      const _notifyStatus = updates.status as "completed" | "failed";
      const _mergedSnapshot = merged as Record<string, unknown>;
      // phase_timings now included in Modal's PATCH payload — notify immediately, no delay needed
      notifyJob(_notifyStatus, _mergedSnapshot as Record<string, unknown>).catch(() => {});
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabaseAdmin.from("jobs") as any).upsert({
        id,
        user_id: existing.userId ?? null,
        workspace_id: existing.workspaceId ?? wsId ?? null,
        file_name: existing.fileName ?? null,
        status: merged.status,
        mode: merged.mode ?? null,
        format: merged.format ?? null,
        stems_count: merged.stems_count ?? null,
        bpm: merged.bpm ?? null,
        key: merged.key ?? null,
        completed_at: updates.status === "completed" ? new Date().toISOString() : null,
        duration_seconds: typeof merged.duration === "number" ? merged.duration : null,
        error_code: merged.error_code ?? null,
        phase_timings: phaseTims ?? null,
        cold_start: phaseTims ? (phaseTims.cold === 1) : null,
        batch_id: existing.batchId ?? null,
      }).then(() => {}).catch((err: unknown) => console.error("Supabase jobs upsert failed:", err));
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function getUserPlanAndAnchor(userId: string): Promise<{ plan: PlanId; anchor: Date }> {
  const [subResult, profileResult] = await Promise.all([
    supabaseAdmin.from("subscriptions").select("plan, status, period_start").eq("user_id", userId).maybeSingle(),
    supabaseAdmin.from("profiles").select("created_at").eq("id", userId).maybeSingle(),
  ]);
  const sub = subResult.data;
  const isPaidActive = sub?.status === "active" && (sub.plan === "pro" || sub.plan === "studio");
  const plan: PlanId = isPaidActive ? (sub!.plan as PlanId) : "free";
  let anchor: Date;
  if (isPaidActive && sub!.period_start) {
    anchor = new Date(sub!.period_start + "T00:00:00");
  } else if (profileResult.data?.created_at) {
    anchor = new Date(profileResult.data.created_at);
  } else {
    const now = new Date();
    anchor = new Date(now.getFullYear(), now.getMonth(), 1);
  }
  return { plan, anchor };
}

async function trackMinutesUsed(userId: string, durationSeconds: number) {
  if (durationSeconds <= 0) return;
  const { plan, anchor } = await getUserPlanAndAnchor(userId);
  const periodKey = computePeriodKey(anchor);

  // For paid plans (minutesNeverReset=true), ensure the period row exists with correct rollover
  // before incrementing. Idempotent — safe to call multiple times per period.
  if (PLANS[plan].minutesNeverReset) {
    const prevPeriodKey = getPreviousPeriodKey(anchor);
    await supabaseAdmin.rpc("ensure_period_with_rollover", {
      p_user_id: userId,
      p_new_month: periodKey,
      p_prev_month: prevPeriodKey,
      p_plan_minutes: PLANS[plan].minutesIncluded,
    });
  }

  const { error } = await supabaseAdmin.rpc("increment_usage", {
    p_user_id: userId,
    p_month: periodKey,
    p_minutes: durationSeconds / 60,
  });
  if (error) throw error;
}
