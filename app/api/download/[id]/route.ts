import { NextRequest, NextResponse } from "next/server";
import { readFile, readdir, stat } from "fs/promises";
import { join } from "path";
import { createReadStream } from "fs";

const JOB_DIR = join(process.cwd(), ".jobs");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stem = request.nextUrl.searchParams.get("stem");
  const jobDir = join(JOB_DIR, id);
  const stemDir = join(jobDir, "stems");

  try {
    if (stem) {
      const filePath = join(stemDir, `${stem}.wav`);
      const fileStat = await stat(filePath);
      const fileSize = fileStat.size;
      const range = request.headers.get("range");

      if (range) {
        // Support range requests for audio streaming
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunkSize = end - start + 1;

        const data = await readFile(filePath);
        const chunk = data.subarray(start, end + 1);

        return new NextResponse(chunk, {
          status: 206,
          headers: {
            "Content-Range": `bytes ${start}-${end}/${fileSize}`,
            "Accept-Ranges": "bytes",
            "Content-Length": String(chunkSize),
            "Content-Type": "audio/wav",
          },
        });
      }

      const data = await readFile(filePath);
      return new NextResponse(data, {
        headers: {
          "Content-Type": "audio/wav",
          "Content-Disposition": `attachment; filename="${stem}.wav"`,
          "Content-Length": String(fileSize),
          "Accept-Ranges": "bytes",
        },
      });
    }

    const jobData = JSON.parse(await readFile(join(jobDir, "job.json"), "utf-8"));
    if (jobData.status !== "completed") {
      return NextResponse.json({ error: "Job not completed" }, { status: 400 });
    }

    const files = await readdir(stemDir);
    const stems = files
      .filter((f: string) => f.endsWith(".wav"))
      .map((f: string) => ({
        name: f.replace(".wav", ""),
        url: `/api/download/${id}?stem=${f.replace(".wav", "")}`,
      }));

    return NextResponse.json({ stems });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
