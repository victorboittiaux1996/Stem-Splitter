import { NextRequest, NextResponse } from "next/server";
import { getJob, writeJsonToR2 } from "@/lib/r2";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const job = await getJob(id);
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  return NextResponse.json(job);
}

// Called by the Modal worker to push real-time progress updates
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const updates = await request.json();
    const existing = await getJob(id);
    if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    await writeJsonToR2(`jobs/${id}.json`, { ...existing, ...updates });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
