import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { uploadToR2, writeJsonToR2 } from "@/lib/r2";

const MAX_SIZE = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = /\.(mp3|wav|flac|ogg|m4a|aac)$/i;
const MODAL_WEBHOOK_URL = process.env.MODAL_WEBHOOK_URL!;

export async function POST(request: NextRequest) {
  try {
    const appUrl =
      process.env.APP_URL ??
      `${request.headers.get("x-forwarded-proto") ?? "http"}://${request.headers.get("host")}`;

    const contentType = request.headers.get("content-type") || "";

    // URL mode: JSON body with { url, mode }
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { url, mode = "4stem" } = body;

      if (!url || typeof url !== "string") {
        return NextResponse.json({ error: "No URL provided" }, { status: 400 });
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

      // Fire-and-forget: Modal handles download from URL
      fetch(MODAL_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, mode, downloadUrl: url, callbackUrl }),
      }).then(async (res) => {
        const result = await res.json().catch(() => ({}));
        if (result.error) {
          await writeJsonToR2(`jobs/${jobId}.json`, {
            id: jobId, status: "failed", mode, progress: 0,
            stage: "Error", error: result.error, createdAt: Date.now(),
          });
        }
        // If result.data: stems already uploaded to R2 by worker via inputKey flow
        // If using direct base64 return (legacy): save stems
        if (result.data) {
          const stemNames: string[] = [];
          for (const [name, b64] of Object.entries(result.data)) {
            if (typeof b64 === "string" && b64.length > 0) {
              const buf = Buffer.from(b64, "base64");
              await uploadToR2(`stems/${jobId}/${name}.wav`, buf, "audio/wav");
              stemNames.push(name);
            }
          }
          await writeJsonToR2(`jobs/${jobId}.json`, {
            id: jobId, status: "completed", mode, progress: 100, stage: "Done",
            createdAt: Date.now(), completedAt: Date.now(), stems: stemNames,
            fileName: url, bpm: result.bpm ?? null,
            key: result.key ?? null, key_raw: result.key_raw ?? null,
          });
        }
      }).catch(() => {});

      return NextResponse.json({ jobId });
    }

    // File mode: FormData with file
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const mode = (formData.get("mode") as string) || "4stem";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_EXTENSIONS.test(file.name)) {
      return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (50MB max)" }, { status: 400 });
    }

    const jobId = nanoid(12);
    const callbackUrl = `${appUrl}/api/jobs/${jobId}`;

    // Upload audio to R2
    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.match(/\.[^.]+$/)?.[0] ?? ".mp3";
    const inputKey = `inputs/${jobId}${ext}`;
    await uploadToR2(inputKey, buffer, file.type || "audio/mpeg");

    // Create job in R2
    await writeJsonToR2(`jobs/${jobId}.json`, {
      id: jobId,
      status: "processing",
      mode,
      progress: 10,
      stage: "Uploading to GPU...",
      createdAt: Date.now(),
      fileName: file.name,
    });

    // Fire-and-forget: worker fetches from R2 via inputKey
    fetch(MODAL_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, mode, inputKey, callbackUrl }),
    }).then(async (res) => {
      const result = await res.json().catch(() => ({}));
      if (result.error) {
        await writeJsonToR2(`jobs/${jobId}.json`, {
          id: jobId, status: "failed", mode, progress: 0,
          stage: "Error", error: result.error,
          createdAt: Date.now(), fileName: file.name,
        });
      }
      // Worker using inputKey flow updates R2 directly via update_job_status
      // If worker returns base64 data (fallback), save stems here
      if (result.data) {
        const stemNames: string[] = [];
        for (const [name, b64] of Object.entries(result.data)) {
          if (typeof b64 === "string" && b64.length > 0) {
            const buf = Buffer.from(b64, "base64");
            await uploadToR2(`stems/${jobId}/${name}.wav`, buf, "audio/wav");
            stemNames.push(name);
          }
        }
        await writeJsonToR2(`jobs/${jobId}.json`, {
          id: jobId, status: "completed", mode, progress: 100, stage: "Done",
          createdAt: Date.now(), completedAt: Date.now(), stems: stemNames,
          fileName: file.name, bpm: result.bpm ?? null,
          key: result.key ?? null, key_raw: result.key_raw ?? null,
        });
      }
    }).catch(() => {});

    return NextResponse.json({ jobId });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
