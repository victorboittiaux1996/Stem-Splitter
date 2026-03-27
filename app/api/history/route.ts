import { NextResponse } from "next/server";
import {
  S3Client,
  ListObjectsV2Command,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});
const BUCKET = process.env.R2_BUCKET_NAME || "stem-splitter-storage";

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function relativeDate(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  const h = Math.floor(diff / 3600000);
  const d = Math.floor(diff / 86400000);
  if (min < 2) return "Just now";
  if (min < 60) return `${min}m ago`;
  if (h < 24) return `${h}h ago`;
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d} days ago`;
  return `${Math.floor(d / 7)} week${d >= 14 ? "s" : ""} ago`;
}

export async function GET() {
  try {
    const list = await s3.send(
      new ListObjectsV2Command({ Bucket: BUCKET, Prefix: "jobs/" })
    );

    const keys = (list.Contents ?? [])
      .map((o) => o.Key!)
      .filter((k) => k.endsWith(".json"));

    const jobs = (
      await Promise.all(
        keys.map(async (key) => {
          try {
            const res = await s3.send(
              new GetObjectCommand({ Bucket: BUCKET, Key: key })
            );
            const text = await res.Body?.transformToString();
            if (!text) return null;
            const job = JSON.parse(text);
            if (job.status !== "completed") return null;
            return job;
          } catch {
            return null;
          }
        })
      )
    )
      .filter(Boolean)
      .sort((a, b) => (b.completedAt ?? b.createdAt) - (a.completedAt ?? a.createdAt))
      .map((job) => ({
        id: job.id,
        name: job.fileName ?? "Unknown",
        date: relativeDate(job.completedAt ?? job.createdAt),
        stems: (job.stems ?? []).length,
        stemList: job.stems ?? [],
        format: "wav",
        bpm: job.bpm ?? null,
        key: job.key ?? null,
        key_raw: job.key_raw ?? null,
        mode: job.mode ?? "4stem",
        model: "MelBand RoFormer",
        createdAt: job.createdAt,
        completedAt: job.completedAt ?? job.createdAt,
        duration: job.duration != null ? formatDuration(job.duration) : undefined,
      }));

    return NextResponse.json({ jobs });
  } catch (err) {
    console.error("History error:", err);
    return NextResponse.json({ jobs: [] });
  }
}
