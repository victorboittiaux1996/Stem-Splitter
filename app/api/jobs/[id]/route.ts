import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";

const JOB_DIR = join(process.cwd(), ".jobs");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const data = await readFile(join(JOB_DIR, id, "job.json"), "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
}

// Called by the Modal worker to push real-time progress updates
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const jobPath = join(JOB_DIR, id, "job.json");

  try {
    const updates = await request.json();
    const existing = JSON.parse(await readFile(jobPath, "utf-8"));
    await writeFile(jobPath, JSON.stringify({ ...existing, ...updates }));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
}
