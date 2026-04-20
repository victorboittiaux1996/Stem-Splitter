import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getUserPlan, userWorkspaceId } from "@/lib/supabase/auth-helpers";
import { PLANS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { getJobForWorkspace } from "@/lib/r2";

function slugify(name: string): string {
  return name
    .replace(/\.[^/.]+$/, "") // strip extension
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9]+/g, "-") // non-alphanum → dash
    .replace(/^-+|-+$/g, "") // trim dashes
    .slice(0, 80); // cap length
}

// POST /api/share — create a share link for a completed job
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { plan } = await getUserPlan(user.id);
  const quota = PLANS[plan].shareLinksPerMonth;

  if (quota === 0) {
    return NextResponse.json(
      { error: "Share links require a Pro plan.", upgradeUrl: "/pricing" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { jobId } = body;
  if (!jobId || typeof jobId !== "string") {
    return NextResponse.json({ error: "jobId required" }, { status: 400 });
  }

  // Derive workspace from auth — never trust client-supplied workspaceId
  const wsId = userWorkspaceId(user.id);
  const job = await getJobForWorkspace(wsId, jobId);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.userId && job.userId !== user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();

  // Count links created this calendar month
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count } = await (supabase as any)
    .from("share_links")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", monthStart.toISOString());

  if ((count ?? 0) >= quota) {
    return NextResponse.json(
      { error: `Share link quota reached (${quota}/${quota} used this month).` },
      { status: 429 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("share_links")
    .insert({
      user_id: user.id,
      job_id: jobId,
      workspace_id: wsId,
      slug: slugify(job.fileName ?? "track"),
    })
    .select("id, slug")
    .single();

  if (error || !data) {
    console.error("share_links insert error:", error);
    return NextResponse.json({ error: "Failed to create share link" }, { status: 500 });
  }

  const appUrl = (
    process.env.APP_URL ??
    `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("host")}`
  ).trim();

  const slug = data.slug ? `/${data.slug}` : "";
  return NextResponse.json({ id: data.id, url: `${appUrl}/share/${data.id}${slug}` });
}
