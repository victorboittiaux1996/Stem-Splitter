import { NextRequest, NextResponse } from "next/server";
import { detectPlatform, isPlaylistUrl, detectRejectedStreaming, detectInvalidShareLink } from "@/lib/platforms";

const MODAL_URL_INFO_URL = process.env.MODAL_URL_INFO_URL;

// ── Direct-link metadata (no yt-dlp needed) ─────────────────────────────

/** Probe the duration of an audio file by HTTP-Range fetching the first 256 KB
 *  and parsing the header with music-metadata. Works for MP3, WAV, FLAC, AIFF,
 *  M4A/AAC, OGG — covers everything we accept.
 *
 *  Returns null on any error (timeout, range not supported, HTML response from a
 *  Drive confirm page, parse failure, exotic format). The full-file download at
 *  SPLIT time is unaffected — this is purely a UX preview to show "X min" before
 *  the user clicks SPLIT. */
async function probeDurationFromUrl(directUrl: string): Promise<number | null> {
  try {
    const res = await fetch(directUrl, {
      headers: { Range: "bytes=0-262143" },  // 256 KB headroom for M4A `moov` near start
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    if (!res.ok && res.status !== 206) return null;
    const contentType = (res.headers.get("Content-Type") || "").toLowerCase();
    // If Drive returned the >100MB confirm HTML page, bail — duration stays null.
    if (contentType.includes("text/html")) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength < 100) return null;
    const { parseBuffer } = await import("music-metadata");
    const metadata = await parseBuffer(buf, contentType || undefined, { duration: true });
    const dur = metadata.format?.duration;
    return typeof dur === "number" && isFinite(dur) && dur > 0 ? Math.round(dur) : null;
  } catch {
    return null;
  }
}

/** Transform a Dropbox share URL to a direct download URL by forcing dl=1.
 *  Mirrors the worker's _download_dropbox transformation so the probe and the
 *  actual download both fetch from the same canonical endpoint. */
function dropboxDirectUrl(url: string): string {
  try {
    const u = new URL(url);
    if (u.hostname.includes("dropbox.com")) {
      u.searchParams.set("dl", "1");
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

/** Dropbox: filename from URL path + duration probe via Range request. */
async function fetchDropboxInfo(url: string) {
  const pathname = new URL(url).pathname;
  const filename = decodeURIComponent(pathname.split("/").pop() || "audio");
  const duration = await probeDurationFromUrl(dropboxDirectUrl(url));
  return { duration, title: filename };
}

/** Google Drive: extract file ID from share URL + duration probe via Range request.
 *  For files >100MB Google serves a confirm page instead of bytes; the probe falls
 *  back to null silently and the worker handles the confirm token at SPLIT time.
 *
 *  Supported URL shapes:
 *    - https://drive.google.com/file/d/{id}/view?usp=sharing
 *    - https://drive.google.com/open?id={id}
 *    - https://drive.google.com/uc?id={id}&export=download
 */
async function fetchGDriveInfo(url: string): Promise<{ duration: number | null; title: string } | null> {
  const idMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (!idMatch) return null;
  const directUrl = `https://drive.google.com/uc?export=download&id=${idMatch[1]}`;
  const duration = await probeDurationFromUrl(directUrl);
  return { duration, title: "Google Drive audio" };
}

// ── SoundCloud metadata via yt-dlp (local dev) or Modal CPU (prod) ─────

async function fetchViaYtDlp(url: string, isPlaylist: boolean, platform: string): Promise<Response> {
  // Dev: spawn yt-dlp locally
  if (!MODAL_URL_INFO_URL) {
    try {
      const { execFile } = await import("child_process");
      const args = isPlaylist
        ? ["--flat-playlist", "--dump-json", "--no-download", "--no-warnings", "--socket-timeout", "10", url]
        : ["--dump-json", "--no-download", "--no-warnings", "--socket-timeout", "10", url];
      const timeout = isPlaylist ? 45000 : 15000;

      const result = await new Promise<string>((resolve, reject) => {
        execFile("yt-dlp", args, { timeout, maxBuffer: 10 * 1024 * 1024 }, (err, stdout) => {
          if (err) return reject(err);
          resolve(stdout);
        });
      });

      if (isPlaylist) {
        const tracks = result.trim().split("\n").filter(Boolean).map(line => {
          const entry = JSON.parse(line);
          const trackUrl = entry.url || entry.webpage_url || "";
          return { url: trackUrl, title: entry.title || "", duration: entry.duration || 0 };
        });
        return NextResponse.json({ isPlaylist: true, tracks, count: tracks.length, platform });
      }

      const data = JSON.parse(result);
      // SoundCloud downloadability check: only tracks with the artist-enabled
      // `downloadable` flag are accepted. Stream-only tracks would violate the
      // SoundCloud ToS even though yt-dlp can fetch their stream URL.
      // Fail-closed: only accept when the flag is explicitly true. If yt-dlp omits
      // the field (undefined/null), we treat the track as stream-only and reject it.
      if (platform === "SOUNDCLOUD" && data.downloadable !== true) {
        return NextResponse.json({
          error: "This SoundCloud track is not marked as downloadable by the artist. Please use a file upload, Dropbox, or Google Drive link.",
        }, { status: 400 });
      }
      return NextResponse.json({ duration: data.duration ?? 0, title: data.title ?? "", platform, isPlaylist: false });
    } catch {
      return NextResponse.json({ error: "Could not fetch URL info" }, { status: 422 });
    }
  }

  // Prod: Modal CPU endpoint
  const params = new URLSearchParams({ url });
  if (isPlaylist) params.set("playlist", "1");
  const modalUrl = `${MODAL_URL_INFO_URL}?${params.toString()}`;

  const res = await fetch(modalUrl, {
    signal: AbortSignal.timeout(isPlaylist ? 50000 : 20000),
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Could not fetch URL info" }, { status: 422 });
  }

  const data = await res.json();
  if (data.error && !data.tracks?.length) {
    return NextResponse.json({ error: data.error, platform }, { status: 422 });
  }

  if (data.isPlaylist) {
    return NextResponse.json({ isPlaylist: true, tracks: data.tracks || [], count: data.count || 0, platform });
  }

  if (platform === "SOUNDCLOUD" && data.downloadable === false) {
    return NextResponse.json({
      error: "This SoundCloud track is not marked as downloadable by the artist. Please use a file upload, Dropbox, or Google Drive link.",
    }, { status: 400 });
  }

  return NextResponse.json({ duration: data.duration ?? 0, title: data.title ?? "", platform, isPlaylist: false });
}

// ── Main handler ─────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  // Early rejection of streaming services (YouTube, Spotify, Deezer, Apple Music)
  // for legal risk reasons. The user gets a specific message pointing to the
  // download-before-upload guide rather than a generic "unsupported" error.
  const rejected = detectRejectedStreaming(url);
  if (rejected) {
    return NextResponse.json({
      error: `${rejected} links are no longer supported. Download the audio locally and upload it, or paste a Dropbox / Google Drive / SoundCloud link.`,
      guideUrl: "/docs/download-before-upload",
    }, { status: 400 });
  }

  // Supported domain but not a public share link — return a targeted hint
  // instead of the generic "unsupported" error so the user can fix their link.
  const invalidShare = detectInvalidShareLink(url);
  if (invalidShare) {
    return NextResponse.json({
      error: `This ${invalidShare.service} link isn't a public share link.`,
      hint: invalidShare.hint,
      service: invalidShare.service,
    }, { status: 400 });
  }

  const platform = detectPlatform(url);
  if (!platform) {
    return NextResponse.json({
      error: "Unsupported link. We accept Dropbox, Google Drive, and SoundCloud.",
    }, { status: 400 });
  }

  const isPlaylist = isPlaylistUrl(url);

  try {
    if (platform === "DROPBOX") {
      return NextResponse.json({ ...(await fetchDropboxInfo(url)), platform, isPlaylist: false });
    }
    if (platform === "GOOGLE DRIVE") {
      const info = await fetchGDriveInfo(url);
      if (!info) {
        return NextResponse.json({
          error: "Invalid Google Drive link. Make sure you copied a share URL (the file must be shared publicly or with 'anyone with the link').",
        }, { status: 400 });
      }
      return NextResponse.json({ ...info, platform, isPlaylist: false });
    }
    // SoundCloud via yt-dlp (handles both single tracks and /sets/ playlists)
    return await fetchViaYtDlp(url, isPlaylist, platform);
  } catch (err) {
    console.error("url-info error:", err);
    return NextResponse.json({ error: "Could not fetch URL info" }, { status: 422 });
  }
}
