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

    // Save initial job status
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

    // Convert to base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const audioBase64 = buffer.toString("base64");

    // Process in background
    processJob(jobId, jobDir, stemDir, audioBase64, file.name, mode);

    return NextResponse.json({ jobId });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function processJob(
  jobId: string,
  jobDir: string,
  stemDir: string,
  audioBase64: string,
  filename: string,
  mode: string
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
      body: JSON.stringify({ jobId, mode, audio_base64: audioBase64, filename }),
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
    });

    console.log(`Job ${jobId} completed with ${stemNames.length} stems`);
  } catch (err) {
    console.error(`Job ${jobId} failed:`, err);
    await updateJob({ status: "failed", progress: 0, stage: "Error", error: String(err) });
  }
}
