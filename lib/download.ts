/**
 * Fetch a URL as a blob and trigger a browser download with the given filename.
 * Works around browsers ignoring the `download` attribute on cross-origin redirects
 * (e.g., API → 302 → R2 presigned URL).
 */
export async function downloadBlob(url: string, filename: string): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5 * 60 * 1000);
  let res: Response;
  try {
    res = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const blob = await res.blob();
  const objUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = filename;
  a.click();
  // Revoke after delay so browser has time to initiate the download
  setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);
}

/**
 * Append the format query param to a stem URL.
 * Centralised here to avoid duplicating the `?` vs `&` logic across callers.
 */
function buildStemUrl(url: string, format: string): string {
  return `${url}${url.includes("?") ? "&" : "?"}format=${format}`;
}

/**
 * Download a single stem with the correct filename.
 * Handles the format URL param and delegates to downloadBlob.
 */
export async function downloadStem(
  url: string,
  filename: string,
  format: "wav" | "mp3" = "wav"
): Promise<void> {
  await downloadBlob(buildStemUrl(url, format), filename);
}

/**
 * Fetch multiple stems, zip them, and trigger a download.
 * Naming: `{trackName} - Vocals.wav`, zip: `{trackName} - Stems.zip`
 */
export async function downloadStemsZip(
  stems: { url: string; name: string }[],
  trackName: string,
  format: "wav" | "mp3" = "wav"
): Promise<void> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const fmtExt = format === "mp3" ? ".mp3" : ".wav";
  await Promise.all(
    stems.map(async ({ url, name }) => {
      const res = await fetch(buildStemUrl(url, format));
      if (!res.ok) throw new Error(`Failed to fetch stem "${name}": ${res.status}`);
      const blob = await res.blob();
      const label = name.charAt(0).toUpperCase() + name.slice(1);
      // STORE (no compression): audio is already compressed (MP3/FLAC) or
      // incompressible (raw PCM in WAV). DEFLATE just burns CPU for <1% size
      // savings — skipping it makes finalize ~5-10× faster on big batches.
      zip.file(`${trackName} - ${label}${fmtExt}`, blob, { compression: "STORE" });
    })
  );
  const content = await zip.generateAsync({
    type: "blob",
    compression: "STORE",
    streamFiles: true,
  });
  const objUrl = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = `${trackName} - Stems.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);
}
