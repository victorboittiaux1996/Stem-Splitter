/** Supported platforms for URL-based stem separation.
 *
 *  Dropbox + Google Drive: user's own files (cloud storage).
 *  SoundCloud: only tracks explicitly flagged `downloadable` by the artist are accepted
 *  (the /api/url-info route enforces this — non-downloadable SoundCloud tracks are
 *  stream-only and importing them would violate SoundCloud's ToS).
 *
 *  Patterns are intentionally strict: they match only public share links, not the
 *  private browsing URLs the user sees while logged into Dropbox / Drive / SoundCloud.
 *  detectInvalidShareLink() catches the near-miss URLs so the UI can show a
 *  targeted hint ("Right-click → Share → Create link") instead of a generic rejection.
 *
 *  Streaming services (YouTube, Spotify, Deezer, Apple Music) were removed for legal
 *  reasons (DRM circumvention, ToS violations, RIAA jurisprudence). See archive tag
 *  `archive/streaming-imports-v2` to restore the code if jurisdiction evolves.
 */

// SoundCloud paths that are NOT user tracks (home, discover, search, etc.) — excluded
// from the single-track pattern so we don't accept a URL like soundcloud.com/discover.
const SOUNDCLOUD_RESERVED = "discover|charts|tags|stream|upload|search|pages|feed|notifications|messages|you|mobile|settings|terms|pro|creators|help|imprint|jobs|press|privacy|popular|trending";

export const PLATFORMS = [
  // Dropbox: share links /s/{id}/{filename} or /scl/fi/{id}/{filename}, or
  // direct CDN (dropboxusercontent.com). Rejects /home, /preview, /work, etc.
  {
    name: "DROPBOX" as const,
    pattern: /^(https?:\/\/)?(www\.)?(dropbox\.com\/(s\/|scl\/fi\/)|(dl\.)?dropboxusercontent\.com\/)/,
  },
  // Google Drive: /file/d/{id}/... or /open?id=... or /uc?id=... — not /drive/my-drive.
  {
    name: "GOOGLE DRIVE" as const,
    pattern: /^(https?:\/\/)?(www\.)?drive\.google\.com\/(file\/d\/|open\?|uc\?)/,
  },
  // SoundCloud: /{artist}/{track} single-track URL. Excludes reserved paths
  // (/discover, /charts, /you, …) that are the SoundCloud UI surfaces rather than tracks.
  {
    name: "SOUNDCLOUD" as const,
    pattern: new RegExp(
      "^(https?://)?(www\\.|m\\.)?soundcloud\\.com/" +
        `(?!(${SOUNDCLOUD_RESERVED})(/|$|\\?))` +
        "[^/\\?]+/[^/\\?]+"
    ),
  },
];

/** Playlist URL patterns — matched separately because they need different handling. */
const PLAYLIST_PATTERNS = [
  {
    platform: "SOUNDCLOUD" as const,
    pattern: /^(https?:\/\/)?(www\.|m\.)?soundcloud\.com\/[^/]+\/sets\/[^/]+/,
  },
];

export type PlatformName = (typeof PLATFORMS)[number]["name"];

/** Detect which platform a URL belongs to. Returns null if unsupported. */
export function detectPlatform(url: string): PlatformName | null {
  const trimmed = url.trim();
  // Check playlists first (they also belong to a platform)
  const playlist = PLAYLIST_PATTERNS.find(p => p.pattern.test(trimmed));
  if (playlist) return playlist.platform;
  return PLATFORMS.find(p => p.pattern.test(trimmed))?.name ?? null;
}

/** Check if a URL is a playlist/album (multiple tracks). */
export function isPlaylistUrl(url: string): boolean {
  const trimmed = url.trim();
  return PLAYLIST_PATTERNS.some(p => p.pattern.test(trimmed));
}

/** Streaming sources that are explicitly rejected (removed for legal risk). */
export const REJECTED_STREAMING_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "YouTube", pattern: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com|m\.youtube\.com|youtube-nocookie\.com)\// },
  { name: "Spotify", pattern: /^(https?:\/\/)?(www\.|open\.|play\.)?spotify\.com\// },
  { name: "Deezer", pattern: /^(https?:\/\/)?(www\.)?deezer\.com\// },
  { name: "Apple Music", pattern: /^(https?:\/\/)?(www\.)?music\.apple\.com\// },
];

export function detectRejectedStreaming(url: string): string | null {
  const trimmed = url.trim();
  return REJECTED_STREAMING_PATTERNS.find(p => p.pattern.test(trimmed))?.name ?? null;
}

/** A URL that's on a supported domain but doesn't match the strict share-link shape.
 *  Examples:
 *    - dropbox.com/home/... (private browsing UI)
 *    - drive.google.com/drive/my-drive (private browsing UI)
 *    - soundcloud.com/discover (SoundCloud home surface, not a track)
 *
 *  The UI shows the returned hint so the user can fix their link without starting a job
 *  that will only fail minutes later with "Import failed". */
export interface InvalidShareHint {
  service: "Dropbox" | "Google Drive" | "SoundCloud";
  hint: string;
}

export function detectInvalidShareLink(url: string): InvalidShareHint | null {
  const trimmed = url.trim();
  // Already a valid share link → nothing to warn about
  if (detectPlatform(trimmed) !== null) return null;

  if (/(^|\/\/)(www\.|dl\.)?(dropbox\.com|dropboxusercontent\.com)/i.test(trimmed)) {
    return {
      service: "Dropbox",
      hint: "This isn't a public share link. In Dropbox, right-click the file → Share → Create link → Copy link. The share URL should contain /s/ or /scl/fi/.",
    };
  }
  if (/(^|\/\/)drive\.google\.com/i.test(trimmed)) {
    return {
      service: "Google Drive",
      hint: "This isn't a public share link. Open the file → Share → set access to \"Anyone with the link\" → Copy link. The URL should contain /file/d/.",
    };
  }
  if (/(^|\/\/)(www\.|m\.)?soundcloud\.com/i.test(trimmed)) {
    return {
      service: "SoundCloud",
      hint: "This isn't a track URL. Open a track page on SoundCloud and copy its URL. It should look like soundcloud.com/{artist}/{track}.",
    };
  }
  return null;
}
