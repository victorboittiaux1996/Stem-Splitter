import { NextRequest, NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const MAX_SIZE = 50 * 1024 * 1024;
const ALLOWED_EXTENSIONS = /\.(mp3|wav|flac|ogg|m4a|aac)$/i;
const MODAL_WEBHOOK_URL = process.env.MODAL_WEBHOOK_URL!;
const JOB_DIR = join(process.cwd(), ".jobs");

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";

    // URL mode: JSON body with { url, mode }
    if (contentType.includes("application/json")) {
      const body = await request.json();
      const { url, mode = "4stem" } = body;

      if (!url || typeof url !== "string") {
        return NextResponse.json({ error: "No URL provided" }, { status: 400 });
      }

      const jobId = nanoid(12);
      const jobDir = join(JOB_DIR, jobId);
      const stemDir = join(jobDir, "stems");
      await mkdir(stemDir, { recursive: true });

      await writeFile(
        join(jobDir, "job.json"),
        JSON.stringify({
          id: jobId,
          status: "processing",
          mode,
          progress: 5,
          stage: "Downloading audio...",
          createdAt: Date.now(),
          fileName: url,
        })
      );

      const appUrl = process.env.APP_URL ?? `${request.headers.get("x-forwarded-proto") ?? "http"}://${request.headers.get("host")}`;
      const callbackUrl = `${appUrl}/api/jobs/${jobId}`;

      processUrlJob(jobId, jobDir, stemDir, url, mode, callbackUrl);
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
    const jobDir = join(JOB_DIR, jobId);
    const stemDir = join(jobDir, "stems");
    await mkdir(stemDir, { recursive: true });

    await writeFile(
      join(jobDir, "job.json"),
      JSON.stringify({
        id: jobId,
        status: "processing",
        mode,
        progress: 10,
        stage: "Uploading to GPU...",
        createdAt: Date.now(),
        fileName: file.name,
      })
    );

    const buffer = Buffer.from(await file.arrayBuffer());
    const audioBase64 = buffer.toString("base64");

    const appUrl = process.env.APP_URL ?? `${request.headers.get("x-forwarded-proto") ?? "http"}://${request.headers.get("host")}`;
    const callbackUrl = `${appUrl}/api/jobs/${jobId}`;

    processJob(jobId, jobDir, stemDir, audioBase64, file.name, mode, callbackUrl);

    return NextResponse.json({ jobId });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function processUrlJob(
  jobId: string,
  jobDir: string,
  stemDir: string,
  url: string,
  mode: string,
  callbackUrl: string
) {
  const updateJob = async (updates: Record<string, unknown>) => {
    const existing = JSON.parse(
      await require("fs/promises").readFile(join(jobDir, "job.json"), "utf-8")
    );
    await writeFile(join(jobDir, "job.json"), JSON.stringify({ ...existing, ...updates }));
  };

  try {
    await updateJob({ progress: 10, stage: "Downloading audio..." });

    const response = await fetch(MODAL_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, mode, downloadUrl: url, callbackUrl }),
    });

    const result = await response.json();

    if (result.error) {
      await updateJob({ status: "failed", progress: 0, stage: "Error", error: result.error });
      return;
    }

    const stemNames: string[] = [];
    if (result.data) {
      for (const [name, b64] of Object.entries(result.data)) {
        if (typeof b64 === "string" && b64.length > 0) {
          const buf = Buffer.from(b64, "base64");
          await writeFile(join(stemDir, `${name}.wav`), buf);
          stemNames.push(name);
        }
      }
    }

    await updateJob({
      status: "completed",
      progress: 100,
      stage: "Done",
      stems: stemNames,
      completedAt: Date.now(),
      bpm: result.bpm ?? null,
      key: result.key ?? null,
      key_raw: result.key_raw ?? null,
    });

    console.log(`Job ${jobId} (URL) completed with ${stemNames.length} stems`);
  } catch (err) {
    console.error(`Job ${jobId} (URL) failed:`, err);
    await updateJob({ status: "failed", progress: 0, stage: "Error", error: String(err) });
  }
}

async function processJob(
  jobId: string,
  jobDir: string,
  stemDir: string,
  audioBase64: string,
  filename: string,
  mode: string,
  callbackUrl: string
) {
  const updateJob = async (updates: Record<string, unknown>) => {
    const existing = JSON.parse(
      await require("fs/promises").readFile(join(jobDir, "job.json"), "utf-8")
    );
    await writeFile(join(jobDir, "job.json"), JSON.stringify({ ...existing, ...updates }));
  };

  try {
    await updateJob({ progress: 20, stage: "Processing on GPU..." });

    // Call Modal
    const response = await fetch(MODAL_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, mode, audio_base64: audioBase64, filename, callbackUrl }),
    });

    const result = await response.json();

    if (result.error) {
      await updateJob({ status: "failed", progress: 0, stage: "Error", error: result.error });
      return;
    }

    // Save each stem to disk
    const stemNames: string[] = [];
    if (result.data) {
      for (const [name, b64] of Object.entries(result.data)) {
        if (typeof b64 === "string" && b64.length > 0) {
          const buf = Buffer.from(b64, "base64");
          await writeFile(join(stemDir, `${name}.wav`), buf);
          stemNames.push(name);
          console.log(`Saved stem: ${name}.wav (${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
        }
      }
    }

    await updateJob({
      status: "completed",
      progress: 100,
      stage: "Done",
      stems: stemNames,
      completedAt: Date.now(),
      bpm: result.bpm ?? null,
      key: result.key ?? null,
      key_raw: result.key_raw ?? null,
    });

    console.log(`Job ${jobId} completed with ${stemNames.length} stems`);
  } catch (err) {
    console.error(`Job ${jobId} failed:`, err);
    await updateJob({ status: "failed", progress: 0, stage: "Error", error: String(err) });
  }
}
