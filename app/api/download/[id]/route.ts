import { NextRequest, NextResponse } from "next/server";
import { getJobForWorkspace, getPresignedUrl, listStemsForWorkspace, stemKey } from "@/lib/r2";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stem = request.nextUrl.searchParams.get("stem");
  const wsId = request.headers.get("x-workspace-id") || null;

  try {
    if (stem) {
      const format = request.nextUrl.searchParams.get("format") || "wav";
      const ext = format === "mp3" ? ".mp3" : ".wav";
      const key = stemKey(wsId, id, stem, ext);
      const url = await getPresignedUrl(key, 3600);
      return NextResponse.redirect(url);
    }

    const job = await getJobForWorkspace(wsId, id);
    if (!job || job.status !== "completed") {
      return NextResponse.json({ error: "Job not completed" }, { status: 400 });
    }

    const resolvedWsId = job.workspaceId ?? wsId;
    const keys = await listStemsForWorkspace(resolvedWsId ?? null, id);
    const stemsPrefix = resolvedWsId ? `workspaces/${resolvedWsId}/stems/${id}/` : `stems/${id}/`;
    const stems = keys.map((key) => {
      const name = key.replace(stemsPrefix, "").replace(".wav", "");
      return { name, url: `/api/download/${id}?stem=${name}` };
    });

    return NextResponse.json({ stems });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
