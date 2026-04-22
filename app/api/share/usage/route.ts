import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getUserPlan } from "@/lib/supabase/auth-helpers";
import { PLANS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

// GET /api/share/usage — returns share links used this month vs quota.
// Optional ?jobId=X — if the user already has a share link for that job,
// also returns { existingUrl } so the UI can show "COPY LINK" instead of "SHARE".
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { plan } = await getUserPlan(user.id);
  const total = PLANS[plan].shareLinksPerMonth;

  const supabase = await createClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  // Count DISTINCT tracks shared this month (matches the semantic
  // "3 share links/month" = 3 distinct tracks, not 3 API calls).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: monthRows } = await (supabase as any)
    .from("share_links")
    .select("job_id")
    .eq("user_id", user.id)
    .gte("created_at", monthStart.toISOString());

  const used = new Set((monthRows ?? []).map((r: { job_id: string }) => r.job_id)).size;

  const jobId = request.nextUrl.searchParams.get("jobId");
  let existingUrl: string | null = null;

  if (jobId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from("share_links")
      .select("id, slug")
      .eq("user_id", user.id)
      .eq("job_id", jobId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      const appUrl = (
        process.env.APP_URL ??
        `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("host")}`
      ).trim();
      const slug = existing.slug ? `/${existing.slug}` : "";
      existingUrl = `${appUrl}/share/${existing.id}${slug}`;
    }
  }

  return NextResponse.json({ used, total, existingUrl });
}
