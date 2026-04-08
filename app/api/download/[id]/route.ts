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
      const resolvedWsId = wsId || request.nextUrl.searchParams.get("ws") || null;
      const key = stemKey(resolvedWsId, id, stem, ext);
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
    const wsParam = resolvedWsId ? `&ws=${resolvedWsId}` : "";
    const stems = keys.map((key) => {
      const name = key.replace(stemsPrefix, "").replace(".wav", "");
      return { name, url: `/api/download/${id}?stem=${name}${wsParam}` };
    });

    return NextResponse.json({ stems });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
