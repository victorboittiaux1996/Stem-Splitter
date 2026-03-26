import { NextRequest, NextResponse } from "next/server";
import { getJob, getPresignedUrl, listStems } from "@/lib/r2";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stem = request.nextUrl.searchParams.get("stem");

  try {
    if (stem) {
      // Redirect to a presigned R2 URL for direct download
      const key = `stems/${id}/${stem}.wav`;
      const url = await getPresignedUrl(key, 3600);
      return NextResponse.redirect(url);
    }

    const job = await getJob(id);
    if (!job || job.status !== "completed") {
      return NextResponse.json({ error: "Job not completed" }, { status: 400 });
    }

    const keys = await listStems(id);
    const stems = keys.map((key) => {
      const name = key.replace(`stems/${id}/`, "").replace(".wav", "");
      return {
        name,
        url: `/api/download/${id}?stem=${name}`,
      };
    });

    return NextResponse.json({ stems });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
