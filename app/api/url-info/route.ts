import { NextRequest, NextResponse } from "next/server";
import { detectPlatform, isPlaylistUrl } from "@/lib/platforms";

const MODAL_URL_INFO_URL = process.env.MODAL_URL_INFO_URL;

// ── Platform-specific metadata fetchers (no yt-dlp needed) ──────────────

/** Spotify: scrape the embed page for track metadata. */
async function fetchSpotifyTrackInfo(url: string) {
  const trackIdMatch = url.match(/track\/([a-zA-Z0-9]+)/);
  if (!trackIdMatch) return null;

  const embedUrl = `https://open.spotify.com/embed/track/${trackIdMatch[1]}`;
  const res = await fetch(embedUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;

  const html = await res.text();
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
  if (!match) return null;

  const data = JSON.parse(match[1]);
  const entity = data.props?.pageProps?.state?.data?.entity;
  if (!entity) return null;

  const title = entity.name ?? "";
  const artist = entity.artists?.map((a: { name: string }) => a.name).join(", ") ?? "";
  const rawDuration = entity.duration;
  const durationMs = typeof rawDuration === "number" ? rawDuration : (rawDuration?.milliseconds ?? 0);

  return {
    duration: Math.round(durationMs / 1000),
    title: artist ? `${artist} - ${title}` : title,
  };
}

/** Spotify: scrape embed page for playlist tracks. */
async function fetchSpotifyPlaylistInfo(url: string) {
  const listIdMatch = url.match(/playlist\/([a-zA-Z0-9]+)/);
  if (!listIdMatch) return null;

  const embedUrl = `https://open.spotify.com/embed/playlist/${listIdMatch[1]}`;
  const res = await fetch(embedUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return null;

  const html = await res.text();
  const match = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/);
  if (!match) return null;

  const data = JSON.parse(match[1]);
  const entity = data.props?.pageProps?.state?.data?.entity;
  if (!entity) return null;

  interface SpotifyTrackItem {
    uid?: string;
    title?: string;
    subtitle?: string;
    duration?: number | { milliseconds?: number };
    uri?: string;
  }

  const trackList: SpotifyTrackItem[] = entity.trackList ?? [];
  const tracks = trackList.map((t: SpotifyTrackItem) => {
    const trackTitle = t.title ?? "";
    const artist = t.subtitle ?? "";
    const rawDur = t.duration;
    const durationMs = typeof rawDur === "number" ? rawDur : (rawDur?.milliseconds ?? 0);
    // Reconstruct Spotify track URL from URI (spotify:track:ID → https://open.spotify.com/track/ID)
    const uri = t.uri ?? "";
    const trackId = uri.startsWith("spotify:track:") ? uri.replace("spotify:track:", "") : "";
    const trackUrl = trackId ? `https://open.spotify.com/track/${trackId}` : "";

    return {
      url: trackUrl,
      title: artist ? `${artist} - ${trackTitle}` : trackTitle,
      duration: Math.round(durationMs / 1000),
    };
  }).filter((t: { url: string }) => t.url);

  return { tracks, count: tracks.length };
}

/** Deezer: free public API, no auth needed. */
async function fetchDeezerTrackInfo(url: string) {
  const trackIdMatch = url.match(/track\/(\d+)/);
  if (!trackIdMatch) return null;

  const res = await fetch(`https://api.deezer.com/track/${trackIdMatch[1]}`, {
    signal: AbortSignal.timeout(5000),
  });
  if (!res.ok) return null;

  const data = await res.json();
  if (data.error) return null;

  const title = data.title ?? "";
  const artist = data.artist?.name ?? "";
  return {
    duration: data.duration ?? 0,
    title: artist ? `${artist} - ${title}` : title,
  };
}

// ── yt-dlp based fetcher (local dev or via Modal in prod) ───────────────

async function fetchViaYtDlp(url: string, isPlaylist: boolean, platform: string): Promise<Response> {
  // Try local yt-dlp first (works in dev)
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
          let trackUrl = entry.url || entry.webpage_url || "";
          if (trackUrl && !trackUrl.startsWith("http") && platform === "YOUTUBE") {
            trackUrl = `https://www.youtube.com/watch?v=${trackUrl}`;
          }
          return { url: trackUrl, title: entry.title || "", duration: entry.duration || 0 };
        });
        return NextResponse.json({ isPlaylist: true, tracks, count: tracks.length, platform });
      }

      const data = JSON.parse(result);
      return NextResponse.json({ duration: data.duration ?? 0, title: data.title ?? "", platform, isPlaylist: false });
    } catch {
      return NextResponse.json({ error: "Could not fetch URL info" }, { status: 422 });
    }
  }

  // Production: call Modal CPU endpoint
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

  const platform = detectPlatform(url);
  if (!platform) {
    return NextResponse.json({ error: "Unsupported platform" }, { status: 400 });
  }

  const isPlaylist = isPlaylistUrl(url);

  try {
    // ── Spotify: native embed scraping (no yt-dlp, works on Vercel) ────
    if (platform === "SPOTIFY") {
      if (isPlaylist) {
        const playlist = await fetchSpotifyPlaylistInfo(url);
        if (playlist) return NextResponse.json({ isPlaylist: true, ...playlist, platform });
        return NextResponse.json({ error: "Could not fetch Spotify playlist" }, { status: 422 });
      }
      const track = await fetchSpotifyTrackInfo(url);
      if (track) return NextResponse.json({ ...track, platform, isPlaylist: false });
      return NextResponse.json({ error: "Could not fetch Spotify track info" }, { status: 422 });
    }

    // ── Deezer: free public API (no yt-dlp, works on Vercel) ───────────
    if (platform === "DEEZER" && !isPlaylist) {
      const track = await fetchDeezerTrackInfo(url);
      if (track) return NextResponse.json({ ...track, platform, isPlaylist: false });
      // Fallback to yt-dlp
    }

    // ── Dropbox: direct file link ──────────────────────────────────────
    if (platform === "DROPBOX") {
      const pathname = new URL(url).pathname;
      const filename = decodeURIComponent(pathname.split("/").pop() || "audio");
      return NextResponse.json({ duration: null, title: filename, platform, isPlaylist: false });
    }

    // ── YouTube, SoundCloud, Apple Music, Deezer playlists: yt-dlp ─────
    return await fetchViaYtDlp(url, isPlaylist, platform);
  } catch (err) {
    console.error("url-info error:", err);
    return NextResponse.json({ error: "Could not fetch URL info" }, { status: 422 });
  }
}
