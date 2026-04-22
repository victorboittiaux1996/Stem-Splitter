import { NextRequest, NextResponse } from "next/server";
import { detectPlatform, isPlaylistUrl, detectRejectedStreaming, detectInvalidShareLink } from "@/lib/platforms";

const MODAL_URL_INFO_URL = process.env.MODAL_URL_INFO_URL;

// ── Direct-link metadata (no yt-dlp needed) ─────────────────────────────

/** Dropbox: filename from URL path, duration resolved later by worker. */
function fetchDropboxInfo(url: string) {
  const pathname = new URL(url).pathname;
  const filename = decodeURIComponent(pathname.split("/").pop() || "audio");
  return { duration: null, title: filename };
}

/** Google Drive: extract file ID from share URL. Duration unknown until download.
 *  Supported URL shapes:
 *    - https://drive.google.com/file/d/{id}/view?usp=sharing
 *    - https://drive.google.com/open?id={id}
 *    - https://drive.google.com/uc?id={id}&export=download
 */
function fetchGDriveInfo(url: string): { duration: null; title: string } | null {
  const idMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/)
    || url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (!idMatch) return null;
  return { duration: null, title: "Google Drive audio" };
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
      return NextResponse.json({ ...fetchDropboxInfo(url), platform, isPlaylist: false });
    }
    if (platform === "GOOGLE DRIVE") {
      const info = fetchGDriveInfo(url);
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
