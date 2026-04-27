/**
 * Downloads ALL stems of a track as a ZIP — used by the row "download" icon
 * in Recent splits / My Files. The full ExportModal is still available for
 * partial selections, format toggling, and bulk multi-track exports.
 */

import type { HistoryItem, OutputFormat } from "@/lib/types";

function sanitizeFolder(name: string): string {
  return name
    .replace(/\.[^/.]+$/, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "track";
}

export async function downloadAllStemsZip(
  track: HistoryItem,
  format: OutputFormat,
  workspaceId: string,
  signal?: AbortSignal,
): Promise<{ succeeded: number; failed: number }> {
  const stems = track.stemList ?? [];
  if (stems.length === 0) {
    throw new Error("No stems available for this track");
  }

  const JSZipModule = await import("jszip");
  const JSZip = JSZipModule.default;
  const zip = new JSZip();
  const ext = format === "mp3" ? ".mp3" : ".wav";
  const baseName = sanitizeFolder(track.name);

  const results = await Promise.allSettled(
    stems.map(async (stem) => {
      const url = `/api/download/${track.id}?stem=${encodeURIComponent(stem)}&format=${format}&ws=${encodeURIComponent(workspaceId)}`;
      const res = await fetch(url, { signal });
      if (!res.ok) throw new Error(`${stem}: ${res.status}`);
      const blob = await res.blob();
      const label = stem.charAt(0).toUpperCase() + stem.slice(1);
      zip.file(`${baseName} - ${label}${ext}`, blob);
    }),
  );

  if (signal?.aborted) {
    return { succeeded: 0, failed: stems.length };
  }

  const succeeded = results.filter((r) => r.status === "fulfilled").length;
  const failed = stems.length - succeeded;

  if (succeeded === 0) {
    throw new Error("All stem downloads failed");
  }

  const content = await zip.generateAsync({ type: "blob" });
  const objUrl = URL.createObjectURL(content);
  const a = document.createElement("a");
  a.href = objUrl;
  a.download = `${sanitizeFolder(track.name)} - Stems.zip`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);

  return { succeeded, failed };
}
