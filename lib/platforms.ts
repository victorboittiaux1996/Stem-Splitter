/** Supported platforms for URL-based stem separation.
 *
 *  Dropbox + Google Drive: user's own files (cloud storage).
 *  SoundCloud: only tracks explicitly flagged `downloadable` by the artist are accepted
 *  (the /api/url-info route enforces this — non-downloadable SoundCloud tracks are
 *  stream-only and importing them would violate SoundCloud's ToS).
 *
 *  Streaming services (YouTube, Spotify, Deezer, Apple Music) were removed for legal
 *  reasons (DRM circumvention, ToS violations, RIAA jurisprudence). See archive tag
 *  `archive/streaming-imports-v2` to restore the code if jurisdiction evolves.
 */

export const PLATFORMS = [
  { name: "DROPBOX" as const, pattern: /^(https?:\/\/)?(www\.)?(dropbox\.com\/|dropboxusercontent\.com\/)/ },
  { name: "GOOGLE DRIVE" as const, pattern: /^(https?:\/\/)?(www\.)?drive\.google\.com\// },
  { name: "SOUNDCLOUD" as const, pattern: /^(https?:\/\/)?(www\.)?soundcloud\.com\// },
];

/** Playlist URL patterns — matched separately because they need different handling. */
const PLAYLIST_PATTERNS = [
  { platform: "SOUNDCLOUD" as const, pattern: /^(https?:\/\/)?(www\.)?soundcloud\.com\/[^/]+\/sets\// },
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

/** Streaming sources that are explicitly rejected (removed for legal risk).
 *  The /api/url-info route matches against these before the supported-platform
 *  check so the user gets a specific message pointing to the download-before-upload
 *  guide instead of a generic "unsupported link" error. */
export const REJECTED_STREAMING_PATTERNS: Array<{ name: string; pattern: RegExp }> = [
  { name: "YouTube", pattern: /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|music\.youtube\.com|m\.youtube\.com|youtube-nocookie\.com)\// },
  { name: "Spotify", pattern: /^(https?:\/\/)?(www\.|open\.|play\.)?spotify\.com\// },
  { name: "Deezer", pattern: /^(https?:\/\/)?(www\.)?deezer\.com\// },
  { name: "Apple Music", pattern: /^(https?:\/\/)?(www\.)?music\.apple\.com\// },
];

/** Returns the display name of the rejected streaming service a URL belongs to, or null. */
export function detectRejectedStreaming(url: string): string | null {
  const trimmed = url.trim();
  return REJECTED_STREAMING_PATTERNS.find(p => p.pattern.test(trimmed))?.name ?? null;
}
