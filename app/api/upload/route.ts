import { NextRequest, NextResponse, after } from "next/server";
import { nanoid } from "nanoid";
import { getPresignedUploadUrl, writeJsonToR2, readJsonFromR2, getObjectSize, jobKey } from "@/lib/r2";
import { getAuthUser, getUserPlan, checkUsage, userWorkspaceId } from "@/lib/supabase/auth-helpers";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { PLANS } from "@/lib/plans";
import { sendTelegramAlert } from "@/lib/telegram";
import { detectPlatform, detectRejectedStreaming, detectInvalidShareLink } from "@/lib/platforms";

export const maxDuration = 300; // Modal processing can take up to 200s; after() keeps function alive

const ALLOWED_EXTENSIONS = /\.(mp3|wav|flac|ogg|m4a|aac|aif|aiff|webm)$/i;
const MODAL_WEBHOOK_URL = process.env.MODAL_WEBHOOK_URL!;
const MODAL_DOWNLOAD_URL = process.env.MODAL_DOWNLOAD_URL!;
const STEM_MODE_MAP: Record<string, number> = { "2stem": 2, "4stem": 4, "6stem": 6 };

export async function POST(request: NextRequest) {
  const _t0 = Date.now();
  try {
    // Auth + quota enforcement
    const _tAuth = Date.now();
    const user = await getAuthUser();
    console.log(`[TIMING] POST /api/upload phase=getAuthUser dur=${Date.now() - _tAuth}ms`);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const _tQuota = Date.now();
    const { plan, periodStart } = await getUserPlan(user.id);
    const { allowed } = await checkUsage(user.id, plan, periodStart);
    console.log(`[TIMING] POST /api/upload phase=quota_check dur=${Date.now() - _tQuota}ms plan=${plan}`);
    if (!allowed) {
      return NextResponse.json(
        { error: "Processing limit reached. Upgrade your plan for more processing time." },
        { status: 429 }
      );
    }

    const maxFileSize = PLANS[plan].maxFileSizeMB * 1024 * 1024;

    const appUrl = (
      process.env.APP_URL ??
      `${request.headers.get("x-forwarded-proto") ?? "http"}://${request.headers.get("host")}`
    ).trim();

    const body = await request.json();
    const { url, mode = "4stem", filename, size, contentType, title = null, batchId: rawBatchId = null } = body;
    const batchId = typeof rawBatchId === "string" && rawBatchId.length <= 32 ? rawBatchId : null;

    // Validate stem mode against plan
    const stemCountFromMode = STEM_MODE_MAP[mode] ?? 4;
    if (!PLANS[plan].stems.includes(stemCountFromMode)) {
      return NextResponse.json(
        { error: "6-stem processing requires a Pro or Studio plan.", upgradeUrl: "/pricing" },
        { status: 403 }
      );
    }
    const overlap = 8;
    const wsId = userWorkspaceId(user.id);

    // ── URL mode: { url, mode } ──────────────────────────────────────────────
    if (url) {
      if (typeof url !== "string") {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
      }
      // Gate URL import by plan (Free plan cannot import from URLs)
      if (!PLANS[plan].urlImport) {
        return NextResponse.json(
          { error: "URL import requires a Pro or Studio plan.", upgradeUrl: "/pricing" },
          { status: 403 }
        );
      }
      // Validate URL — only allow http/https protocols to prevent SSRF
      try {
        const parsed = new URL(url);
        if (!["http:", "https:"].includes(parsed.protocol)) {
          return NextResponse.json({ error: "Invalid URL protocol" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
      }

      // Platform enforcement — streaming services are explicitly rejected.
      // /api/url-info does the same check for the UI metadata flow; duplicating
      // here is intentional: this is the gateway to the worker, scripted clients
      // can bypass /api/url-info entirely by POSTing directly to /api/upload.
      const rejected = detectRejectedStreaming(url);
      if (rejected) {
        return NextResponse.json(
          {
            error: `${rejected} links are no longer supported. Download the audio locally and upload it, or paste a Dropbox / Google Drive / SoundCloud link.`,
            guideUrl: "/docs/download-before-upload",
          },
          { status: 400 }
        );
      }
      // Supported domain but private/browsing URL — targeted hint so user can fix it
      const invalidShare = detectInvalidShareLink(url);
      if (invalidShare) {
        return NextResponse.json(
          {
            error: `This ${invalidShare.service} link isn't a public share link.`,
            hint: invalidShare.hint,
            service: invalidShare.service,
          },
          { status: 400 }
        );
      }
      if (!detectPlatform(url)) {
        return NextResponse.json(
          { error: "Unsupported link. We accept Dropbox, Google Drive, and SoundCloud." },
          { status: 400 }
        );
      }

      const jobId = nanoid(12);
      const callbackUrl = `${appUrl}/api/jobs/${jobId}`;
      const key = jobKey(wsId, jobId);

      const _tR2Write = Date.now();
      await writeJsonToR2(key, {
        id: jobId, status: "processing", mode, progress: 5,
        stage: "Downloading audio...", createdAt: Date.now(), fileName: (typeof title === "string" && title) ? title : url, workspaceId: wsId, userId: user.id,
        batchId: (typeof batchId === "string" && batchId) ? batchId : null,
      });
      console.log(`[TIMING] POST /api/upload phase=r2_write_job dur=${Date.now() - _tR2Write}ms`);

      // Best-effort Supabase insert for monitoring queries
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      void (supabaseAdmin.from("jobs") as any).upsert({
        id: jobId, user_id: user.id, workspace_id: wsId,
        file_name: (typeof title === "string" && title) ? title : url,
        status: "processing", mode,
        batch_id: (typeof batchId === "string" && batchId) ? batchId : null,
      });

      const _tModal = Date.now();
      after(async () => {
        // Step 1: CPU download — offloads the 45-80s download off the H100
        let dlResult: { inputKey?: string; downloadDuration?: number; error?: string } = {};
        try {
          const dlRes = await fetch(MODAL_DOWNLOAD_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId, url, workspaceId: wsId }),
            signal: AbortSignal.timeout(180_000),
          });
          dlResult = await dlRes.json().catch(() => ({}));
          if (!dlRes.ok || dlResult.error) {
            // download_audio already wrote "failed" to R2 — just alert
            sendTelegramAlert(`❌ <b>URL Download Failed</b>\n🔗 CPU download error\n📋 <code>${dlResult.error ?? `HTTP ${dlRes.status}`}</code>\n🆔 job=${jobId}`).catch(() => {});
            console.log(`[TIMING] POST /api/upload phase=cpu_download_failed dur=${Date.now() - _tModal}ms`);
            return;
          }
        } catch (err) {
          console.error(`CPU download failed for job ${jobId}:`, err);
          await writeJsonToR2(key, {
            id: jobId, status: "failed", mode, progress: 0,
            stage: "Error", error: "Failed to reach download server. Please try again.",
            createdAt: Date.now(), workspaceId: wsId, userId: user.id,
          });
          sendTelegramAlert(`❌ <b>CPU Download Unreachable</b>\n🔗 URL import download step failed\n📋 <code>${String(err).slice(0, 200)}</code>\n🆔 job=${jobId}`).catch(() => {});
          return;
        }
        console.log(`[TIMING] POST /api/upload phase=cpu_download_done dur=${Date.now() - _tModal}ms key=${dlResult.inputKey}`);

        // Step 2: GPU separate — audio already in R2, download_cpu saved ~45-80s of H100
        // 110s timeout leaves room for R2 cleanup before Vercel kills the after() at 300s
        await fetch(MODAL_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            jobId, mode,
            inputKey: dlResult.inputKey,
            callbackUrl, overlap, workspaceId: wsId,
            downloadDuration: dlResult.downloadDuration,
            transcoded: true,
          }),
          signal: AbortSignal.timeout(110_000),
        }).then(async (res) => {
          const result = await res.json().catch(() => ({}));
          if (!res.ok || result.error) {
            const errMsg = result.error || `GPU server error (${res.status})`;
            await writeJsonToR2(key, {
              id: jobId, status: "failed", mode, progress: 0,
              stage: "Error", error: errMsg, createdAt: Date.now(), workspaceId: wsId, userId: user.id,
            });
            sendTelegramAlert(`❌ <b>URL Import Failed</b>\n🔗 Modal error (${res.status})\n📋 <code>${errMsg}</code>\n🆔 job=${jobId}`).catch(() => {});
          }
        }).catch(async (err) => {
          console.error(`Modal webhook failed for job ${jobId}:`, err);
          await writeJsonToR2(key, {
            id: jobId, status: "failed", mode, progress: 0,
            stage: "Error", error: "Failed to reach processing server. Please try again.",
            createdAt: Date.now(), workspaceId: wsId, userId: user.id,
          });
          sendTelegramAlert(`❌ <b>Modal Unreachable</b>\n🔗 URL import GPU dispatch failed\n📋 <code>${String(err).slice(0, 200)}</code>\n🆔 job=${jobId}`).catch(() => {});
        });
        console.log(`[TIMING] POST /api/upload phase=modal_dispatch_done dur=${Date.now() - _tModal}ms total=${Date.now() - _t0}ms`);
      });

      return NextResponse.json({ jobId });
    }

    // ── File mode: presigned upload flow ─────────────────────────────────────
    // Step 1 — POST /api/upload { filename, size, contentType, mode }
    //        → { jobId, uploadUrl }  (no file goes through Vercel)
    // Step 2 — browser PUTs file directly to R2 via uploadUrl
    // Step 3 — PUT /api/upload { jobId } → triggers Modal worker
    if (!filename || typeof filename !== "string") {
      return NextResponse.json({ error: "filename required" }, { status: 400 });
    }
    // Sanitize filename — strip HTML tags and control characters
    const sanitizedFilename = filename.replace(/<[^>]*>/g, "").replace(/[<>"'&]/g, "").trim();
    if (!sanitizedFilename) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }
    if (!ALLOWED_EXTENSIONS.test(sanitizedFilename)) {
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }
    if (typeof size === "number" && size > maxFileSize) {
      const mb = PLANS[plan].maxFileSizeMB;
      const limit = mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`;
      return NextResponse.json({ error: `File too large (${limit} max)` }, { status: 400 });
    }

    const jobId = nanoid(12);
    const ext = filename.match(/\.[^.]+$/)?.[0] ?? ".mp3";
    const inputKey = `inputs/${jobId}${ext}`;
    const mimeType = (typeof contentType === "string" && contentType) ? contentType : "audio/mpeg";
    const key = jobKey(wsId, jobId);

    await writeJsonToR2(key, {
      id: jobId, status: "uploading", mode, progress: 0,
      stage: "Uploading...", createdAt: Date.now(), fileName: sanitizedFilename, inputKey, overlap, workspaceId: wsId, userId: user.id,
      batchId: (typeof batchId === "string" && batchId) ? batchId : null,
    });

    // Best-effort Supabase insert for monitoring queries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabaseAdmin.from("jobs") as any).upsert({
      id: jobId, user_id: user.id, workspace_id: wsId,
      file_name: sanitizedFilename, status: "uploading", mode,
      batch_id: (typeof batchId === "string" && batchId) ? batchId : null,
    });

    // Presigned PUT URL — valid 2 hours (large files on slow connections)
    const uploadUrl = await getPresignedUploadUrl(inputKey, mimeType, 7200);

    return NextResponse.json({ jobId, uploadUrl, inputKey });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// Step 3: called after browser finishes uploading to R2 — triggers Modal worker
export async function PUT(request: NextRequest) {
  const _t0 = Date.now();
  try {
    const _tAuth = Date.now();
    const user = await getAuthUser();
    console.log(`[TIMING] PUT /api/upload phase=getAuthUser dur=${Date.now() - _tAuth}ms`);
    if (!user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const appUrl = (
      process.env.APP_URL ??
      `${request.headers.get("x-forwarded-proto") ?? "http"}://${request.headers.get("host")}`
    ).trim();

    const { jobId } = await request.json();
    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    // Re-validate plan against job mode (prevents bypassing POST gate)
    const { plan: planPut, periodStart: periodStartPut } = await getUserPlan(user.id);
    const { allowed: allowedPut } = await checkUsage(user.id, planPut, periodStartPut);
    if (!allowedPut) {
      return NextResponse.json({ error: "Processing limit reached." }, { status: 429 });
    }

    const wsIdPut = userWorkspaceId(user.id);
    const keyPut = jobKey(wsIdPut, jobId);
    const _tR2Read = Date.now();
    const job = await readJsonFromR2<{
      id: string; mode: string; fileName: string; inputKey: string; createdAt: number; overlap?: number; workspaceId?: string | null; status?: string; batchId?: string | null;
    }>(keyPut);
    console.log(`[TIMING] PUT /api/upload phase=r2_read_job dur=${Date.now() - _tR2Read}ms`);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Double-dispatch guard: only dispatch if job is still in uploading state
    if (job.status === "processing" || job.status === "completed" || job.status === "failed") {
      return NextResponse.json({ ok: true });
    }

    if (!job.inputKey) {
      return NextResponse.json({ error: "Job has no inputKey — cannot trigger processing" }, { status: 400 });
    }

    // Re-validate stem mode against plan
    const stemCountPut = STEM_MODE_MAP[job.mode] ?? 4;
    if (!PLANS[planPut].stems.includes(stemCountPut)) {
      return NextResponse.json({ error: "6-stem processing requires a Pro or Studio plan.", upgradeUrl: "/pricing" }, { status: 403 });
    }

    // Verify the file was actually uploaded (not empty/corrupted)
    const _tSizeCheck = Date.now();
    const fileSize = await getObjectSize(job.inputKey);
    console.log(`[TIMING] PUT /api/upload phase=r2_size_check dur=${Date.now() - _tSizeCheck}ms size=${fileSize}`);
    if (fileSize < 1000) {
      const resolvedWsId = job.workspaceId ?? wsIdPut;
      await writeJsonToR2(jobKey(resolvedWsId ?? null, jobId), {
        id: job.id, status: "failed", mode: job.mode, progress: 0,
        stage: "Error", error: "Upload incomplete — please try again",
        createdAt: job.createdAt, fileName: job.fileName, workspaceId: resolvedWsId,
      });
      return NextResponse.json({ error: "Upload incomplete — please try again" }, { status: 400 });
    }

    const callbackUrl = `${appUrl}/api/jobs/${jobId}`;
    const resolvedWsId = job.workspaceId ?? wsIdPut;
    const finalKey = jobKey(resolvedWsId ?? null, jobId);

    const _tR2Write2 = Date.now();
    await writeJsonToR2(finalKey, {
      id: job.id, status: "processing", mode: job.mode, progress: 5,
      stage: "Sending to GPU...", createdAt: job.createdAt, fileName: job.fileName,
      inputKey: job.inputKey, workspaceId: resolvedWsId, userId: user.id,
      batchId: job.batchId ?? null,
    });
    console.log(`[TIMING] PUT /api/upload phase=r2_write_processing dur=${Date.now() - _tR2Write2}ms`);

    // Best-effort status update for monitoring queries
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    void (supabaseAdmin.from("jobs") as any).upsert({
      id: job.id, user_id: user.id, workspace_id: resolvedWsId ?? wsIdPut,
      file_name: job.fileName, status: "processing", mode: job.mode,
      batch_id: job.batchId ?? null,
    });

    const _tModal2 = Date.now();
    after(async () => {
      await fetch(MODAL_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: job.id, mode: job.mode, inputKey: job.inputKey, callbackUrl, overlap: job.overlap ?? 8, workspaceId: resolvedWsId }),
      }).then(async (res) => {
        const result = await res.json().catch(() => ({}));
        if (!res.ok || result.error) {
          const errMsg = result.error || `GPU server error (${res.status})`;
          await writeJsonToR2(finalKey, {
            id: job.id, status: "failed", mode: job.mode, progress: 0,
            stage: "Error", error: errMsg, createdAt: job.createdAt, fileName: job.fileName, workspaceId: resolvedWsId, userId: user.id,
          });
          sendTelegramAlert(`❌ <b>File Upload Failed</b>\n🎵 ${job.fileName ?? "unknown"}\n📋 <code>${errMsg}</code>\n🆔 job=${job.id}`).catch(() => {});
        }
      }).catch(async (err) => {
        console.error(`Modal webhook failed for job ${job.id}:`, err);
        await writeJsonToR2(finalKey, {
          id: job.id, status: "failed", mode: job.mode, progress: 0,
          stage: "Error", error: "Failed to reach processing server. Please try again.",
          createdAt: job.createdAt, fileName: job.fileName, workspaceId: resolvedWsId, userId: user.id,
        });
        sendTelegramAlert(`❌ <b>Modal Unreachable</b>\n🎵 ${job.fileName ?? "unknown"}\n📋 <code>${String(err).slice(0, 200)}</code>\n🆔 job=${job.id}`).catch(() => {});
      });
      console.log(`[TIMING] PUT /api/upload phase=modal_dispatch_fired dur=${Date.now() - _tModal2}ms total=${Date.now() - _t0}ms`);
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Confirm error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
