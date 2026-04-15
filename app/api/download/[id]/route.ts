import { NextRequest, NextResponse } from "next/server";
import { getJobForWorkspace, getPresignedUrl, listStemsForWorkspace, stemKey } from "@/lib/r2";
import { getAuthUser, getUserPlan, userWorkspaceId } from "@/lib/supabase/auth-helpers";
import { PLANS } from "@/lib/plans";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth check — only authenticated users can download stems
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { plan } = await getUserPlan(user.id);
  const wavAllowed = PLANS[plan].exportFormats.includes("WAV 24-bit");

  // Derive workspace from auth — never trust client-supplied ws param or header
  const wsId = userWorkspaceId(user.id);

  const { id } = await params;
  const stem = request.nextUrl.searchParams.get("stem");

  try {
    if (stem) {
      const requestedFormat = request.nextUrl.searchParams.get("format") || "wav";
      // Graceful downgrade: Free users requesting WAV get MP3 (both exist on R2)
      const format = (!wavAllowed && requestedFormat === "wav") ? "mp3" : requestedFormat;
      const ext = format === "mp3" ? ".mp3" : ".wav";
      const key = stemKey(wsId, id, stem, ext);
      const url = await getPresignedUrl(key, 3600);
      return NextResponse.redirect(url);
    }

    const job = await getJobForWorkspace(wsId, id);
    if (!job || job.status !== "completed") {
      return NextResponse.json({ error: "Job not completed" }, { status: 400 });
    }
    if (job.userId && job.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const keys = await listStemsForWorkspace(wsId, id);
    const stemsPrefix = `workspaces/${wsId}/stems/${id}/`;
    const stems = keys.map((key) => {
      const name = key.replace(stemsPrefix, "").replace(".wav", "");
      return { name, url: `/api/download/${id}?stem=${name}&ws=${wsId}` };
    });

    return NextResponse.json({ stems });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
