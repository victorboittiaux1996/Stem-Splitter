import { NextRequest, NextResponse } from "next/server";
import { getJobForWorkspace, writeJsonToR2, jobKey } from "@/lib/r2";
import { getAuthUser, userWorkspaceId } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { computePeriodKey, getPreviousPeriodKey } from "@/lib/period";
import { PLANS, type PlanId } from "@/lib/plans";
import { sendTelegramAlert } from "@/lib/telegram";

export const maxDuration = 30;


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
  const processingDur = phase?.total_wall_time ?? null; // worker wall time (used as fallback)
  const modalCost = typeof job.modal_cost === "number" ? job.modal_cost : (phase?.modal_cost ?? null);
  const bpm = typeof job.bpm === "number" ? job.bpm : null;
  const key = (job.key as string | undefined) ?? null;
  // User-perceived wall time: from upload click → result ready in UI
  const userStart = typeof job.createdAt === "number" ? job.createdAt : null;
  const userEnd = typeof job.completedAt === "number" ? job.completedAt : null;
  const userWall = (userStart != null && userEnd != null && userEnd > userStart)
    ? (userEnd - userStart) / 1000
    : null;

  let msg = status === "completed" ? `✅ <b>Completed</b>\n` : `❌ <b>Failed</b>\n`;
  msg += `🎵 ${fileName}\n`;

  // Combined settings + track info on one line
  const headerParts = [
    mode,
    trackDur != null ? fmtSeconds(trackDur) : null,
    bpm != null ? `${Math.round(bpm)} BPM` : null,
    key ?? null,
  ].filter(Boolean);
  if (headerParts.length) msg += `⚙️ ${headerParts.join(" · ")}\n`;

  if (status === "completed") {
    const wall = phase?.total_wall_time ?? processingDur ?? 0;
    const boot = phase?.container_boot ?? 0;
    const idleSec = typeof phase?.idle_seconds === "number" ? phase.idle_seconds : 0;
    const isCold = phase?.cold === 1;
    const billedGpu = wall + boot;
    const billedTotal = billedGpu + idleSec;
    const callbackFree = userWall != null ? Math.max(0, userWall - wall - boot) : 0;

    // ─── User time + billed segments ───
    if (userWall != null) {
      msg += `\n⏱ <b>${fmtSeconds(userWall)}</b> user time\n`;
      const fmtVal = (s: number) => fmtSeconds(s).padStart(4);
      const segs: string[] = [];
      if (boot > 0) segs.push(`   ❄️ ${fmtVal(boot)}   container boot      ← billed`);
      if (wall > 0) segs.push(`   ⚙️ ${fmtVal(wall)}   processing          ← billed`);
      if (callbackFree >= 1) segs.push(`   📡 ${fmtVal(callbackFree)}   callbacks           free`);
      if (segs.length) msg += `<pre>${segs.join("\n")}</pre>\n`;
    }

    // ─── Phase breakdown (grouped, wall-time aligned) ───
    if (phase) {
      const dl = (phase.download_cpu ?? 0) + (phase.download_input ?? 0);
      const transcode = phase.wav24_transcode ?? 0;
      const warmup = phase.warmup ?? 0;
      const prepSec = dl + transcode + warmup;
      const voc = phase.sep_vocal_infer ?? 0;
      const inst = phase.sep_instru_infer ?? 0;
      const gpuWall = phase.sep_parallel_wall ?? Math.max(voc, inst);
      const merge = phase.merge_stems ?? 0;
      const postParallel = phase.post_parallel ?? 0;
      const postWall = merge + postParallel;
      const analyze = phase.analyze_track ?? 0;

      const lines: string[] = [];
      const fmtVal = (s: number) => fmtSeconds(s).padStart(4);
      if (prepSec > 0) {
        const det: string[] = [];
        if (dl > 0) det.push(`dl ${fmtSeconds(dl)}`);
        if (transcode > 0) det.push(`transcode ${fmtSeconds(transcode)}`);
        if (warmup > 0) det.push(`warmup ${fmtSeconds(warmup)}`);
        lines.push(`prep    ${fmtVal(prepSec)}  (${det.join(" · ")})`);
      }
      if (gpuWall > 0) {
        lines.push(`GPU     ${fmtVal(gpuWall)}  (voc ${fmtSeconds(voc)} + inst ${fmtSeconds(inst)}, parallel)`);
      }
      if (postWall > 0) {
        lines.push(`post    ${fmtVal(postWall)}  (merge + encode + upload, parallel)`);
      }
      if (analyze > 0) {
        lines.push(`analyze ${fmtVal(analyze)}  (free, parallel with GPU)`);
      }
      if (lines.length) msg += `<pre>${lines.join("\n")}</pre>\n`;
    }

    // ─── Cost breakdown ───
    if (modalCost != null) {
      const costPerMin = trackDur != null && trackDur > 0 ? (modalCost / (trackDur / 60)) : null;
      msg += `\n💰 <b>$${modalCost.toFixed(4)}</b>`;
      if (costPerMin != null) msg += ` ($${costPerMin.toFixed(3)}/min audio)`;
      msg += "\n";
      const costGpu = typeof phase?.modal_cost_gpu === "number" ? phase.modal_cost_gpu : null;
      const costIdle = typeof phase?.modal_cost_idle === "number" ? phase.modal_cost_idle : null;
      if (costGpu != null && costIdle != null) {
        const idleNote = isCold ? "scaledown, container kept warm" : "gap user→next";
        const lines: string[] = [];
        const gpuNote = isCold
          ? `(boot ${fmtSeconds(boot)} + processing ${fmtSeconds(wall)})`
          : `(processing ${fmtSeconds(wall)}, warm)`;
        lines.push(`GPU      $${costGpu.toFixed(4)}  · billed ${billedGpu.toFixed(0).padStart(2)}s  ${gpuNote}`);
        lines.push(`idle     $${costIdle.toFixed(4)}  · billed ${idleSec.toFixed(0).padStart(2)}s  (${idleNote})`);
        lines.push(`total billed                ${billedTotal.toFixed(0).padStart(3)}s`);
        msg += `<pre>${lines.join("\n")}</pre>\n`;
      }
    }

    // ─── GPU diagnostics (last line) ───
    if (phase) {
      const gpuName = (phase as Record<string, unknown>).gpu_name as string | undefined;
      if (gpuName) {
        const shortName = gpuName.replace("NVIDIA ", "").replace(" 80GB HBM3", "").replace(" 80GB HBM3e", "");
        // Prefer under-load metrics
        const clock = phase.gpu_clock_post_mhz ?? phase.gpu_clock_mhz;
        const temp = phase.gpu_temp_post_c ?? phase.gpu_temp_c;
        const power = phase.gpu_power_post_w ?? phase.gpu_power_w;
        const parts: string[] = [shortName];
        if (clock) parts.push(`${clock}MHz`);
        if (temp) parts.push(`${temp}°C`);
        if (power) parts.push(`${Math.round(power)}W`);
        msg += `🖥 ${parts.join(" · ")}\n`;
      }
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
      const modalCost = typeof updates.modal_cost === "number" ? updates.modal_cost : null;
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
        // Preserve real user-start time from R2 (survives Vercel killing the best-effort insert at upload)
        created_at: typeof existing.createdAt === "number" ? new Date(existing.createdAt).toISOString() : undefined,
        completed_at: updates.status === "completed" ? new Date().toISOString() : null,
        duration_seconds: typeof merged.duration === "number" ? merged.duration : null,
        error_code: merged.error_code ?? null,
        phase_timings: phaseTims ?? null,
        cold_start: phaseTims ? (phaseTims.cold === 1) : null,
        batch_id: existing.batchId ?? null,
        modal_cost: modalCost,
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
