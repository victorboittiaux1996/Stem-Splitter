import { NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";

const JOB_DIR = join(process.cwd(), ".jobs");

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
    let dirs: string[] = [];
    try {
      dirs = await readdir(JOB_DIR);
    } catch {
      // .jobs doesn't exist yet
      return NextResponse.json({ jobs: [] });
    }

    const jobs = (
      await Promise.all(
        dirs.map(async (id) => {
          try {
            const raw = await readFile(join(JOB_DIR, id, "job.json"), "utf-8");
            const job = JSON.parse(raw);
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
      }));

    return NextResponse.json({ jobs });
  } catch (err) {
    console.error("History error:", err);
    return NextResponse.json({ jobs: [] });
  }
}
