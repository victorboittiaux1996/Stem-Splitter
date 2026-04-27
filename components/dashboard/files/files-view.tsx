"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { StemModal } from "@/components/stem-modal";
import type { HistoryItem, OutputFormat } from "@/lib/types";
import type { Theme } from "./theme";
import { FilesFilters } from "./files-filters";
import { FilesTable, type SortColumn } from "./files-table";
import { ExportModal } from "./export-modal";
import { DeleteConfirm } from "./delete-confirm";
import { ShareConfirm } from "./share-confirm";
import { FilesEmptyState } from "./files-empty-state";
import { downloadAllStemsZip } from "@/lib/download-stems";
import { toast } from "sonner";

interface Props {
  C: Theme;
  isDark: boolean;
  stemColors: Record<string, string>;
  labels: Record<string, string>;
  wavAllowed: boolean;
  isPro: boolean;
  outputFormat: OutputFormat;
  workspaceId: string;
  history: HistoryItem[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
  expandedFile: string | null;
  setExpandedFile: (id: string | null) => void;
  onNavigateToSplit: () => void;
  stemUrlCacheRef: React.MutableRefObject<Record<string, Record<string, string>>>;
  stemPeaksCacheRef: React.MutableRefObject<Record<string, Record<string, number[]>>>;
  onShare: ((jobId: string) => Promise<{ reused: boolean } | void>) | null;
}

const DownloadIcon = ({ size = 13, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 2V9.5M5 8L8 11L11 8" stroke={color} strokeWidth="0.7" fill="none" strokeLinejoin="miter" />
    <line x1="3" y1="14" x2="13" y2="14" stroke={color} strokeWidth="0.7" />
  </svg>
);

export function FilesView(props: Props) {
  const {
    C, isDark, stemColors, labels,
    wavAllowed, isPro, outputFormat, workspaceId,
    history, setHistory,
    expandedFile, setExpandedFile,
    onNavigateToSplit,
    stemUrlCacheRef, stemPeaksCacheRef,
    onShare,
  } = props;

  // Filters
  const [fileSearch, setFileSearch] = useState("");
  const [filterKey, setFilterKey] = useState<string | null>(null);
  const [filterStems, setFilterStems] = useState<Set<number>>(new Set());
  const [filterBatch, setFilterBatch] = useState<string | null>(null);

  // Bounds derived from history. Sane defaults keep the sliders functional
  // even on an empty or not-yet-loaded library.
  const bpmBounds = useMemo<[number, number]>(() => {
    let lo = 60;
    let hi = 180;
    for (const h of history) {
      if (typeof h.bpm === "number") {
        if (h.bpm < lo) lo = Math.max(40, Math.floor(h.bpm));
        if (h.bpm > hi) hi = Math.min(240, Math.ceil(h.bpm));
      }
    }
    return [Math.floor(lo), Math.ceil(hi)];
  }, [history]);

  const durBounds = useMemo<[number, number]>(() => {
    let maxSec = 600;
    for (const h of history) {
      if (typeof h.durationSeconds === "number" && h.durationSeconds > maxSec) {
        maxSec = h.durationSeconds;
      }
    }
    return [0, Math.ceil(maxSec / 30) * 30];
  }, [history]);

  const DAY_MS = 86_400_000;
  const dateBounds = useMemo<[number, number]>(() => {
    if (history.length === 0) {
      const now = Date.now();
      return [now - 30 * DAY_MS, now];
    }
    let lo = Infinity;
    let hi = -Infinity;
    for (const h of history) {
      const ts = h.completedAt ?? h.createdAt;
      if (ts < lo) lo = ts;
      if (ts > hi) hi = ts;
    }
    // Snap to whole days so the slider step (1 day) always aligns with bounds.
    const floorDay = (ts: number) => Math.floor(ts / DAY_MS) * DAY_MS;
    const ceilDay = (ts: number) => Math.ceil(ts / DAY_MS) * DAY_MS;
    return [floorDay(lo), ceilDay(hi)];
  }, [history]);

  const [bpmRange, setBpmRange] = useState<[number, number]>([60, 180]);
  const [durRange, setDurRange] = useState<[number, number]>([0, 600]);
  const [dateRange, setDateRange] = useState<[number, number]>(dateBounds);

  const bpmRangeActive = bpmRange[0] > bpmBounds[0] || bpmRange[1] < bpmBounds[1];
  const durRangeActive = durRange[0] > durBounds[0] || durRange[1] < durBounds[1];
  const dateRangeActive = dateRange[0] > dateBounds[0] || dateRange[1] < dateBounds[1];

  // Follow bounds when history changes so the full span stays selected by default.
  useEffect(() => {
    setBpmRange(([lo, hi]) => {
      if (lo < bpmBounds[0] || lo > bpmBounds[1]) lo = bpmBounds[0];
      if (hi > bpmBounds[1] || hi < bpmBounds[0]) hi = bpmBounds[1];
      return [lo, hi];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bpmBounds[0], bpmBounds[1]]);

  useEffect(() => {
    setDurRange(([lo, hi]) => {
      if (lo < durBounds[0] || lo > durBounds[1]) lo = durBounds[0];
      if (hi > durBounds[1] || hi < durBounds[0]) hi = durBounds[1];
      return [lo, hi];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durBounds[0], durBounds[1]]);

  useEffect(() => {
    setDateRange(([lo, hi]) => {
      if (lo < dateBounds[0] || lo > dateBounds[1]) lo = dateBounds[0];
      if (hi > dateBounds[1] || hi < dateBounds[0]) hi = dateBounds[1];
      return [lo, hi];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateBounds[0], dateBounds[1]]);

  // Sort
  const [sortBy, setSortBy] = useState<SortColumn>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  // Selection / bulk export — always active, no mode toggle
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [singleExportId, setSingleExportId] = useState<string | null>(null);

  // Delete
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [shareConfirmId, setShareConfirmId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const toggleSort = (col: SortColumn) => {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortBy(col);
      setSortDir("asc");
    }
  };

  const hasActiveFilters =
    fileSearch !== "" ||
    bpmRangeActive ||
    durRangeActive ||
    dateRangeActive ||
    filterKey !== null ||
    filterStems.size > 0 ||
    filterBatch !== null;

  const clearFilters = () => {
    setFileSearch("");
    setBpmRange([bpmBounds[0], bpmBounds[1]]);
    setDurRange([durBounds[0], durBounds[1]]);
    setDateRange([dateBounds[0], dateBounds[1]]);
    setFilterKey(null);
    setFilterStems(new Set());
    setFilterBatch(null);
  };

  const filtered = useMemo(() => {
    return history.filter((item) => {
      if (fileSearch && !item.name.toLowerCase().includes(fileSearch.toLowerCase())) return false;

      if (bpmRangeActive) {
        if (item.bpm == null) return false;
        if (item.bpm < bpmRange[0] || item.bpm > bpmRange[1]) return false;
      }

      if (durRangeActive) {
        const sec = item.durationSeconds;
        if (typeof sec !== "number") return false;
        if (sec < durRange[0] || sec > durRange[1]) return false;
      }

      if (dateRangeActive) {
        const ts = item.completedAt ?? item.createdAt;
        if (ts < dateRange[0] || ts > dateRange[1]) return false;
      }

      if (filterKey !== null && item.key !== filterKey) return false;
      if (filterStems.size > 0 && !filterStems.has(item.stems)) return false;
      if (filterBatch !== null && item.batchId !== filterBatch) return false;

      return true;
    });
  }, [history, fileSearch, bpmRange, bpmRangeActive, durRange, durRangeActive, dateRange, dateRangeActive, filterKey, filterStems, filterBatch]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "date":
          cmp = (a.completedAt ?? a.createdAt) - (b.completedAt ?? b.createdAt);
          break;
        case "duration":
          cmp = (a.durationSeconds ?? 0) - (b.durationSeconds ?? 0);
          break;
        case "format":
          cmp = a.format.localeCompare(b.format);
          break;
        case "bpm":
          cmp = (a.bpm ?? 0) - (b.bpm ?? 0);
          break;
        case "key":
          cmp = (a.key ?? "").localeCompare(b.key ?? "");
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortBy, sortDir]);

  const allTrackIds = sorted.map((h) => h.id);
  const allTracksSelected = allTrackIds.length > 0 && allTrackIds.every((id) => selectedTracks.has(id));
  const visibleSelectedCount = useMemo(
    () => sorted.reduce((n, h) => (selectedTracks.has(h.id) ? n + 1 : n), 0),
    [sorted, selectedTracks]
  );
  const toggleTrack = (id: string) =>
    setSelectedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAllTracks = () => {
    if (allTracksSelected) setSelectedTracks(new Set());
    else setSelectedTracks(new Set(allTrackIds));
  };

  const deselectAll = () => setSelectedTracks(new Set());

  const openBulkExport = () => {
    if (visibleSelectedCount === 0) return;
    setSingleExportId(null);
    setExportModalOpen(true);
  };

  const exportTracks = useMemo(() => {
    if (singleExportId) {
      const one = history.find((h) => h.id === singleExportId);
      return one ? [one] : [];
    }
    return sorted.filter((h) => selectedTracks.has(h.id));
  }, [singleExportId, history, sorted, selectedTracks]);

  // Direct ZIP download for the row "↓" icon — all stems, current format, no modal.
  // The bulk EXPORT button at the top still opens the full ExportModal for selection.
  const handleRowDownload = async (id: string) => {
    const item = history.find((h) => h.id === id);
    if (!item) return;
    setDownloadingId(id);
    try {
      const fmt: OutputFormat = wavAllowed ? outputFormat : "mp3";
      const { failed } = await downloadAllStemsZip(item, fmt, workspaceId);
      if (failed > 0) {
        toast.warning(`${item.stemList.length - failed}/${item.stemList.length} stems downloaded (${failed} failed)`);
      } else {
        toast.success("ZIP downloaded");
      }
    } catch (err) {
      console.error("[row-download]", err);
      toast.error("Download failed");
    } finally {
      setDownloadingId(null);
    }
  };

  const handleRowDelete = (id: string) => {
    setDeleteId(id);
  };

  /**
   * Row-level share. If a public link already exists, copy it directly.
   * Otherwise open a confirmation modal — generating from a row needs an
   * explicit "yes" since it's public + counts toward the monthly quota.
   */
  const handleRowShare = async (id: string) => {
    const item = history.find((h) => h.id === id);
    if (!item) return;
    if (item.shareLinkId) {
      const slug = item.shareLinkSlug ? `/${item.shareLinkSlug}` : "";
      const url = `${window.location.origin}/share/${item.shareLinkId}${slug}`;
      try {
        await navigator.clipboard.writeText(url);
        const { toast } = await import("sonner");
        toast.success("Share link copied to clipboard!");
      } catch {
        const { toast } = await import("sonner");
        toast.error("Failed to copy");
      }
      return;
    }
    setShareConfirmId(id);
  };

  const confirmShare = async () => {
    const id = shareConfirmId;
    if (!id || !onShare) return;
    setSharingId(id);
    try {
      await onShare(id);
    } finally {
      setSharingId(null);
      setShareConfirmId(null);
    }
  };

  const handleDeleted = (id: string) => {
    setHistory((prev) => prev.filter((h) => h.id !== id));
    setSelectedTracks((prev) => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setDeleteId(null);
  };

  const deleteItem = deleteId ? history.find((h) => h.id === deleteId) ?? null : null;

  const isEmpty = history.length === 0;

  return (
    <>
      <div className="px-[24px] pt-[24px] pb-[40px]">
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-[24px]">
            <h2 style={{ fontSize: 21, fontWeight: 700, letterSpacing: "-0.02em", color: C.text }}>
              My Files
            </h2>
            {!isEmpty && (
              <div className="flex items-center gap-[8px]">
                {visibleSelectedCount > 0 && (
                  <button
                    onClick={deselectAll}
                    className="px-[14px] py-[8px] transition-colors cursor-pointer"
                    style={{
                      fontSize: 15,
                      fontWeight: 500,
                      color: C.textMuted,
                      letterSpacing: "0.03em",
                    }}
                  >
                    DESELECT
                  </button>
                )}
                <button
                  onClick={openBulkExport}
                  disabled={visibleSelectedCount === 0}
                  className="flex items-center gap-[6px] px-[14px] py-[8px] transition-colors"
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    letterSpacing: "0.03em",
                    color: visibleSelectedCount > 0 ? C.accentText : C.textMuted,
                    backgroundColor: visibleSelectedCount > 0 ? C.accent : C.bgHover,
                    cursor: visibleSelectedCount > 0 ? "pointer" : "not-allowed",
                    opacity: visibleSelectedCount > 0 ? 1 : 0.6,
                  }}
                >
                  <DownloadIcon
                    size={13}
                    color={visibleSelectedCount > 0 ? C.accentText : C.textMuted}
                  />
                  EXPORT{visibleSelectedCount > 0 ? ` (${visibleSelectedCount})` : ""}
                </button>
              </div>
            )}
          </div>

          {isEmpty ? (
            <FilesEmptyState C={C} onSplit={onNavigateToSplit} />
          ) : (
            <div style={{ backgroundColor: C.bgCard, overflow: "hidden" }}>
              <FilesFilters
                C={C}
                history={history}
                fileSearch={fileSearch}
                setFileSearch={setFileSearch}
                bpmRange={bpmRange}
                setBpmRange={setBpmRange}
                bpmBounds={bpmBounds}
                durRange={durRange}
                setDurRange={setDurRange}
                durBounds={durBounds}
                dateRange={dateRange}
                setDateRange={setDateRange}
                dateBounds={dateBounds}
                filterKey={filterKey}
                setFilterKey={setFilterKey}
                filterStems={filterStems}
                setFilterStems={setFilterStems}
                filterBatch={filterBatch}
                setFilterBatch={setFilterBatch}
                clearFilters={clearFilters}
                hasActiveFilters={hasActiveFilters}
              />

              <FilesTable
                C={C}
                isDark={isDark}
                isPro={isPro}
                items={sorted}
                selectedTracks={selectedTracks}
                toggleTrack={toggleTrack}
                toggleAllTracks={toggleAllTracks}
                allTracksSelected={allTracksSelected}
                sortBy={sortBy}
                sortDir={sortDir}
                toggleSort={toggleSort}
                onOpenFile={setExpandedFile}
                onRowDownload={handleRowDownload}
                onRowDelete={handleRowDelete}
                onRowShare={handleRowShare}
                sharingId={sharingId}
                downloadingId={downloadingId}
              />

              {sorted.length === 0 && (
                <div className="px-[16px] py-[40px] text-center">
                  <p style={{ fontSize: 13, color: C.textMuted }}>
                    No files match the current filters.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <ExportModal
        open={exportModalOpen}
        onClose={() => {
          setExportModalOpen(false);
          setSingleExportId(null);
        }}
        C={C}
        tracks={exportTracks}
        stemColors={stemColors}
        labels={labels}
        wavAllowed={wavAllowed}
        defaultFormat={outputFormat}
        workspaceId={workspaceId}
      />

      <ShareConfirm
        open={shareConfirmId !== null}
        onClose={() => sharingId === null && setShareConfirmId(null)}
        C={C}
        fileId={shareConfirmId}
        fileName={shareConfirmId ? history.find((h) => h.id === shareConfirmId)?.name ?? null : null}
        generating={sharingId !== null}
        onConfirm={confirmShare}
      />

      <DeleteConfirm
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        C={C}
        fileId={deleteId}
        fileName={deleteItem?.name ?? null}
        onDeleted={handleDeleted}
      />

      <AnimatePresence>
        {expandedFile && (
          <StemModal
            expandedFile={expandedFile}
            items={sorted}
            onClose={() => setExpandedFile(null)}
            onNavigate={setExpandedFile}
            C={C}
            stemColors={stemColors}
            isDark={isDark}
            labels={labels}
            cachedStemUrls={stemUrlCacheRef.current[expandedFile]}
            cachedPeaks={stemPeaksCacheRef.current[expandedFile]}
            outputFormat={outputFormat}
            workspaceId={workspaceId}
            onShare={isPro && onShare ? () => onShare(expandedFile) : null}
          />
        )}
      </AnimatePresence>
    </>
  );
}
