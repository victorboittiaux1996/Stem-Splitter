import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { getPresignedUploadUrl, writeJsonToR2, readJsonFromR2, getObjectSize } from "@/lib/r2";

const MAX_SIZE = 2 * 1024 * 1024 * 1024; // 2 GB
const ALLOWED_EXTENSIONS = /\.(mp3|wav|flac|ogg|m4a|aac|webm)$/i;
const MODAL_WEBHOOK_URL = process.env.MODAL_WEBHOOK_URL!;

export async function POST(request: NextRequest) {
  try {
    const appUrl =
      process.env.APP_URL ??
      `${request.headers.get("x-forwarded-proto") ?? "http"}://${request.headers.get("host")}`;

    const body = await request.json();
    const { url, mode = "4stem", filename, size, contentType, overlap = 8 } = body;

    // ── URL mode: { url, mode } ──────────────────────────────────────────────
    if (url) {
      if (typeof url !== "string") {
        return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
      }

      const jobId = nanoid(12);
      const callbackUrl = `${appUrl}/api/jobs/${jobId}`;

      await writeJsonToR2(`jobs/${jobId}.json`, {
        id: jobId,
        status: "processing",
        mode,
        progress: 5,
        stage: "Downloading audio...",
        createdAt: Date.now(),
        fileName: url,
      });

      fetch(MODAL_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, mode, downloadUrl: url, callbackUrl, overlap }),
      }).then(async (res) => {
        const result = await res.json().catch(() => ({}));
        if (result.error) {
          await writeJsonToR2(`jobs/${jobId}.json`, {
            id: jobId, status: "failed", mode, progress: 0,
            stage: "Error", error: result.error, createdAt: Date.now(),
          });
        }
      }).catch(() => {});

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
    if (!ALLOWED_EXTENSIONS.test(filename)) {
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }
    if (typeof size === "number" && size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (2 GB max)" }, { status: 400 });
    }

    const jobId = nanoid(12);
    const ext = filename.match(/\.[^.]+$/)?.[0] ?? ".mp3";
    const inputKey = `inputs/${jobId}${ext}`;
    const mimeType = (typeof contentType === "string" && contentType) ? contentType : "audio/mpeg";

    await writeJsonToR2(`jobs/${jobId}.json`, {
      id: jobId,
      status: "uploading",
      mode,
      progress: 0,
      stage: "Uploading...",
      createdAt: Date.now(),
      fileName: filename,
      inputKey,
      overlap,
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
  try {
    const appUrl =
      process.env.APP_URL ??
      `${request.headers.get("x-forwarded-proto") ?? "http"}://${request.headers.get("host")}`;

    const { jobId } = await request.json();
    if (!jobId || typeof jobId !== "string") {
      return NextResponse.json({ error: "jobId required" }, { status: 400 });
    }

    const job = await readJsonFromR2<{
      id: string; mode: string; fileName: string; inputKey: string; createdAt: number; overlap?: number;
    }>(`jobs/${jobId}.json`);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
    if (!job.inputKey) {
      return NextResponse.json({ error: "Job has no inputKey — cannot trigger processing" }, { status: 400 });
    }

    // Verify the file was actually uploaded (not empty/corrupted)
    const fileSize = await getObjectSize(job.inputKey);
    if (fileSize < 1000) {
      await writeJsonToR2(`jobs/${jobId}.json`, {
        id: job.id, status: "failed", mode: job.mode, progress: 0,
        stage: "Error", error: "Upload incomplete — please try again",
        createdAt: job.createdAt, fileName: job.fileName,
      });
      return NextResponse.json({ error: "Upload incomplete — please try again" }, { status: 400 });
    }

    const callbackUrl = `${appUrl}/api/jobs/${jobId}`;

    await writeJsonToR2(`jobs/${jobId}.json`, {
      id: job.id,
      status: "processing",
      mode: job.mode,
      progress: 5,
      stage: "Sending to GPU...",
      createdAt: job.createdAt,
      fileName: job.fileName,
      inputKey: job.inputKey,
    });

    fetch(MODAL_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId: job.id, mode: job.mode, inputKey: job.inputKey, callbackUrl, overlap: job.overlap ?? 8 }),
    }).then(async (res) => {
      const result = await res.json().catch(() => ({}));
      if (result.error) {
        await writeJsonToR2(`jobs/${jobId}.json`, {
          id: job.id, status: "failed", mode: job.mode, progress: 0,
          stage: "Error", error: result.error, createdAt: job.createdAt, fileName: job.fileName,
        });
      }
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Confirm error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
