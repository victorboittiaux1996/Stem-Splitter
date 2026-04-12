import { NextRequest, NextResponse } from "next/server";
import { getJobForWorkspace, getPresignedUrl, listStemsForWorkspace, stemKey } from "@/lib/r2";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check — only authenticated users can download stems
  const { getAuthUser, getUserPlan } = await import("@/lib/supabase/auth-helpers");
  const { PLANS } = await import("@/lib/plans");
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { plan } = await getUserPlan(user.id);
  const wavAllowed = PLANS[plan].exportFormats.includes("WAV 24-bit");

  const { id } = await params;
  const stem = request.nextUrl.searchParams.get("stem");
  const wsId = request.headers.get("x-workspace-id") || null;

  try {
    if (stem) {
      const requestedFormat = request.nextUrl.searchParams.get("format") || "wav";
      // Graceful downgrade: Free users requesting WAV get MP3 (both exist on R2)
      const format = (!wavAllowed && requestedFormat === "wav") ? "mp3" : requestedFormat;
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
