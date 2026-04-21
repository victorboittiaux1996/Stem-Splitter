"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { toast } from "sonner";
import type { HistoryItem, OutputFormat } from "@/lib/types";
import type { Theme } from "./theme";

interface Props {
  open: boolean;
  onClose: () => void;
  C: Theme;
  tracks: HistoryItem[];
  stemColors: Record<string, string>;
  labels: Record<string, string>;
  wavAllowed: boolean;
  defaultFormat: OutputFormat;
  workspaceId: string;
}

const STEM_ORDER = ["vocals", "drums", "bass", "guitar", "piano", "other", "instrumental"];

const WAV_BYTES_PER_SEC = 176_400;
const MP3_BYTES_PER_SEC = 40_000;

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(0)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function ExportModal(props: Props) {
  const { open, onClose, C, tracks, stemColors, labels, wavAllowed, defaultFormat, workspaceId } = props;

  const [format, setFormat] = useState<OutputFormat>(wavAllowed ? defaultFormat : "mp3");
  const [selectedStems, setSelectedStems] = useState<Set<string>>(new Set());
  const [downloading, setDownloading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Re-seed default selection (all available stems) each time the modal opens
  // with a fresh set of tracks. The useState initializer only runs once so
  // reopening with different tracks would otherwise keep stale state.
  useEffect(() => {
    if (!open) return;
    const union = new Set<string>();
    tracks.forEach((t) => t.stemList.forEach((s) => union.add(s)));
    setSelectedStems(union);
  }, [open, tracks]);

  const handleClose = () => {
    if (abortRef.current) abortRef.current.abort();
    onClose();
  };

  // Stems union (ordered) + per-stem presence
  const stemsData = useMemo(() => {
    const counts = new Map<string, number>();
    for (const t of tracks) {
      for (const s of t.stemList) counts.set(s, (counts.get(s) ?? 0) + 1);
    }
    const union = Array.from(counts.keys());
    union.sort((a, b) => {
      const ia = STEM_ORDER.indexOf(a);
      const ib = STEM_ORDER.indexOf(b);
      if (ia === -1 && ib === -1) return a.localeCompare(b);
      if (ia === -1) return 1;
      if (ib === -1) return -1;
      return ia - ib;
    });
    return union.map((stem) => ({
      stem,
      presentIn: counts.get(stem) ?? 0,
      total: tracks.length,
    }));
  }, [tracks]);

  const toggleStem = (s: string) =>
    setSelectedStems((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  const allChecked = stemsData.length > 0 && stemsData.every((d) => selectedStems.has(d.stem));
  const toggleAll = () =>
    setSelectedStems(allChecked ? new Set() : new Set(stemsData.map((d) => d.stem)));

  // Real file count = sum over tracks of (stems selected AND present in that track)
  const { totalFiles, totalSeconds } = useMemo(() => {
    let files = 0;
    let secs = 0;
    for (const t of tracks) {
      const present = t.stemList.filter((s) => selectedStems.has(s)).length;
      files += present;
      if (present > 0 && typeof t.durationSeconds === "number") secs += t.durationSeconds * present;
    }
    return { totalFiles: files, totalSeconds: secs };
  }, [tracks, selectedStems]);

  const bytesPerSec = format === "wav" ? WAV_BYTES_PER_SEC : MP3_BYTES_PER_SEC;
  const estimatedSize = totalSeconds * bytesPerSec;

  const canDownload = totalFiles > 0 && !downloading && (format === "mp3" || wavAllowed);

  async function handleDownload() {
    if (!canDownload) return;
    setDownloading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    const targets: { track: HistoryItem; stem: string }[] = [];
    for (const track of tracks) {
      for (const stem of track.stemList) {
        if (selectedStems.has(stem)) targets.push({ track, stem });
      }
    }

    try {
      const JSZipModule = await import("jszip");
      const JSZip = JSZipModule.default;
      const zip = new JSZip();
      const ext = format === "mp3" ? ".mp3" : ".wav";
      type ZipFolder = typeof zip;
      const folderCache = new Map<string, ZipFolder>();

      const results = await Promise.allSettled(
        targets.map(async ({ track, stem }) => {
          const url = `/api/download/${track.id}?stem=${encodeURIComponent(stem)}&format=${format}&ws=${encodeURIComponent(workspaceId)}`;
          const res = await fetch(url, { signal: controller.signal });
          if (!res.ok) throw new Error(`${track.name}/${stem}: ${res.status}`);
          const blob = await res.blob();
          let folder = folderCache.get(track.id);
          if (!folder) {
            folder = zip.folder(sanitizeFolder(track.name)) ?? zip;
            folderCache.set(track.id, folder);
          }
          const label = stem.charAt(0).toUpperCase() + stem.slice(1);
          // STORE: audio is already compressed/incompressible — skip DEFLATE.
          folder.file(`${label}${ext}`, blob, { compression: "STORE" });
        })
      );

      if (controller.signal.aborted) return;

      const succeeded = results.filter((r) => r.status === "fulfilled").length;
      const failed = targets.length - succeeded;

      if (succeeded === 0) {
        toast.error("Download failed. Try again.");
        return;
      }

      const content = await zip.generateAsync({
        type: "blob",
        compression: "STORE",
        streamFiles: true,
      });
      const objUrl = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = objUrl;
      const zipName =
        tracks.length === 1
          ? `${sanitizeFolder(tracks[0].name)} - Stems.zip`
          : `${tracks.length}-tracks-stems.zip`;
      a.download = zipName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);

      if (failed > 0) {
        toast.warning(`Downloaded ${succeeded}/${targets.length} files (${failed} failed)`);
      } else {
        toast.success(`Downloaded ${succeeded} file${succeeded !== 1 ? "s" : ""}`);
      }
      onClose();
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error("[export]", err);
      toast.error("Download failed. Try again.");
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setDownloading(false);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={downloading ? undefined : handleClose}
        >
          <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="relative w-[480px] max-h-[85vh] overflow-hidden flex flex-col"
            style={{ backgroundColor: C.bgCard }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-[20px] py-[16px] shrink-0"
              style={{ backgroundColor: C.bgHover }}
            >
              <div>
                <p style={{ fontSize: 16, fontWeight: 600, color: C.text, letterSpacing: "0.03em" }}>
                  EXPORT STEMS
                </p>
                <p style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
                  {tracks.length} track{tracks.length > 1 ? "s" : ""} · {totalFiles} file
                  {totalFiles !== 1 ? "s" : ""} · {format.toUpperCase()}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="p-[6px]"
                style={{ color: C.textMuted }}
                aria-label="Close"
              >
                <X className="h-[16px] w-[16px]" strokeWidth={1.6} />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {/* Tracks list */}
              <div className="px-[20px] pt-[16px] pb-[8px]">
                <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: C.textMuted, marginBottom: 8 }}>
                  TRACKS ({tracks.length})
                </p>
                <div className="space-y-[4px]" style={{ maxHeight: 140, overflowY: "auto" }}>
                  {tracks.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-[8px]">
                      <span style={{ fontSize: 14, color: C.text }} className="truncate flex-1">
                        {t.name}
                      </span>
                      <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap" }}>
                        {t.stemList.length} stems
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Stems section */}
              <div className="px-[20px] pt-[12px] pb-[8px]" style={{ borderTop: `1px solid ${C.text}08` }}>
                <div className="flex items-center justify-between mb-[6px]">
                  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: C.textMuted }}>
                    STEMS
                  </p>
                  <button
                    onClick={toggleAll}
                    style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", color: C.textMuted }}
                  >
                    {allChecked ? "NONE" : "ALL"}
                  </button>
                </div>
                <div className="space-y-[2px]">
                  {stemsData.map(({ stem, presentIn, total }) => {
                    const color = stemColors[stem] ?? "#999";
                    const isChecked = selectedStems.has(stem);
                    const partial = presentIn < total;
                    return (
                      <button
                        key={stem}
                        onClick={() => toggleStem(stem)}
                        className="flex w-full items-center gap-[10px] px-[4px] py-[8px] transition-colors"
                      >
                        {/* Checkbox: takes the stem's own colour when checked. */}
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <rect
                            x="0"
                            y="0"
                            width="14"
                            height="14"
                            fill={isChecked ? color : C.text}
                            fillOpacity={isChecked ? 1 : 0.12}
                          />
                        </svg>
                        <span
                          style={{
                            fontSize: 14,
                            fontWeight: 500,
                            color: isChecked ? color : C.text,
                            letterSpacing: "0.02em",
                            flex: 1,
                            textAlign: "left",
                          }}
                        >
                          {labels[stem] ?? stem.toUpperCase()}
                        </span>
                        {partial && (
                          <span style={{ fontSize: 11, color: C.textMuted }}>
                            {presentIn}/{total} tracks
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {stemsData.length === 0 && (
                    <p style={{ fontSize: 13, color: C.textMuted, padding: "8px 4px" }}>
                      No stems in selection.
                    </p>
                  )}
                </div>
              </div>

              {/* Format + totals */}
              <div className="px-[20px] pt-[12px] pb-[16px]" style={{ borderTop: `1px solid ${C.text}08` }}>
                <div className="flex items-center gap-[16px] mb-[10px]">
                  <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: C.textMuted }}>
                    FORMAT
                  </p>
                  <div className="flex items-center gap-[10px]">
                    <FormatRadio
                      C={C}
                      label="WAV"
                      value="wav"
                      checked={format === "wav"}
                      onChange={() => wavAllowed && setFormat("wav")}
                      disabled={!wavAllowed}
                    />
                    <FormatRadio
                      C={C}
                      label="MP3"
                      value="mp3"
                      checked={format === "mp3"}
                      onChange={() => setFormat("mp3")}
                      disabled={false}
                    />
                  </div>
                  {!wavAllowed && (
                    <Link
                      href="/pricing"
                      style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: C.accent, marginLeft: "auto" }}
                    >
                      UPGRADE FOR WAV →
                    </Link>
                  )}
                </div>
                <div className="flex items-center gap-[16px]">
                  <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: C.textMuted }}>
                    TOTAL
                  </span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>
                    {totalFiles} file{totalFiles !== 1 ? "s" : ""}
                    {totalSeconds > 0 && (
                      <span style={{ color: C.textMuted, marginLeft: 8 }}>
                        ~{formatBytes(estimatedSize)}
                      </span>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div
              className="flex items-center justify-end gap-[8px] px-[20px] py-[14px] shrink-0"
              style={{ backgroundColor: C.bgSubtle }}
            >
              <button
                onClick={handleClose}
                className="px-[16px] py-[8px] transition-colors"
                style={{ fontSize: 14, fontWeight: 500, color: C.textSec, letterSpacing: "0.03em" }}
              >
                {downloading ? "STOP" : "CANCEL"}
              </button>
              <button
                onClick={handleDownload}
                disabled={!canDownload}
                className="flex items-center justify-center gap-[6px] px-[16px] py-[8px] transition-all disabled:opacity-30"
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: C.accentText,
                  backgroundColor: C.accent,
                  letterSpacing: "0.03em",
                  minWidth: 160,
                }}
              >
                {downloading && (
                  <span
                    className="animate-spin inline-block"
                    style={{
                      width: 12,
                      height: 12,
                      border: `1.5px solid ${C.accentText}`,
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                    }}
                  />
                )}
                {downloading ? "BUILDING ZIP…" : "DOWNLOAD ZIP"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function FormatRadio({
  C, label, value, checked, onChange, disabled,
}: {
  C: Theme;
  label: string;
  value: string;
  checked: boolean;
  onChange: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      data-value={value}
      className="flex items-center gap-[6px]"
      style={{ opacity: disabled ? 0.35 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
    >
      <span
        style={{
          width: 12,
          height: 12,
          backgroundColor: checked ? C.accent : "transparent",
          border: `1px solid ${checked ? C.accent : C.text}`,
          display: "inline-block",
        }}
      />
      <span style={{ fontSize: 13, fontWeight: 500, color: C.text, letterSpacing: "0.03em" }}>
        {label}
      </span>
    </button>
  );
}

function sanitizeFolder(name: string): string {
  // Strip the original source-file extension (.mp3/.wav/.aiff/.flac/...)
  // so folder names are consistent regardless of the input format.
  const withoutExt = name.replace(/\.[^/.]+$/, "");
  return withoutExt.replace(/[\\/:*?"<>|]/g, "_").trim() || "track";
}
