/** Supported platforms for URL-based stem separation. */

export const PLATFORMS = [
  { name: "YOUTUBE" as const, pattern: /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=)/ },
  { name: "SPOTIFY" as const, pattern: /^(https?:\/\/)?(www\.)?open\.spotify\.com\/(intl-[a-z]{2}\/)?(track|album)\// },
  { name: "DEEZER" as const, pattern: /^(https?:\/\/)?(www\.)?deezer\.com\/(track|album)\// },
  { name: "SOUNDCLOUD" as const, pattern: /^(https?:\/\/)?(www\.)?soundcloud\.com\// },
  { name: "APPLE MUSIC" as const, pattern: /^(https?:\/\/)?(www\.)?music\.apple\.com\// },
  { name: "DROPBOX" as const, pattern: /^(https?:\/\/)?(www\.)?(dropbox\.com\/|dropboxusercontent\.com\/)/ },
];

/** Playlist URL patterns — matched separately because they need different handling. */
const PLAYLIST_PATTERNS = [
  { platform: "SPOTIFY" as const, pattern: /^(https?:\/\/)?(www\.)?open\.spotify\.com\/(intl-[a-z]{2}\/)?playlist\// },
  { platform: "YOUTUBE" as const, pattern: /^(https?:\/\/)?(www\.)?(youtube\.com\/(playlist\?list=|watch\?.*list=)|music\.youtube\.com\/playlist\?list=)/ },
  { platform: "SOUNDCLOUD" as const, pattern: /^(https?:\/\/)?(www\.)?soundcloud\.com\/[^/]+\/sets\// },
  { platform: "DEEZER" as const, pattern: /^(https?:\/\/)?(www\.)?deezer\.com\/playlist\// },
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
