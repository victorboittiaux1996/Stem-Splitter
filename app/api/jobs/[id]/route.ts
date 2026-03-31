import { NextRequest, NextResponse } from "next/server";
import { getJobForWorkspace, writeJsonToR2, jobKey } from "@/lib/r2";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const wsId = request.headers.get("x-workspace-id") || null;
  const job = await getJobForWorkspace(wsId, id);
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
    const wsId = (updates.workspaceId as string | null) ?? request.headers.get("x-workspace-id") ?? null;
    const existing = await getJobForWorkspace(wsId, id);
    if (!existing) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    const key = jobKey(existing.workspaceId ?? wsId, id);
    await writeJsonToR2(key, { ...existing, ...updates });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
