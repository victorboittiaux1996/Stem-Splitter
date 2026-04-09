import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  // Validate protocol
  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const result = await new Promise<{ duration: number; title: string }>((resolve, reject) => {
      execFile(
        "yt-dlp",
        ["--dump-json", "--no-download", "--no-warnings", "--socket-timeout", "10", url],
        { timeout: 15000 },
        (err, stdout) => {
          if (err) return reject(err);
          try {
            const data = JSON.parse(stdout);
            resolve({ duration: data.duration ?? 0, title: data.title ?? "" });
          } catch {
            reject(new Error("Failed to parse yt-dlp output"));
          }
        }
      );
    });

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Could not fetch URL info" }, { status: 422 });
  }
}
