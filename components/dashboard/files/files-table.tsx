"use client";

import type { HistoryItem } from "@/lib/types";
import type { Theme } from "./theme";
import { useKeyNotation } from "@/hooks/use-key-notation";
import { cycleNotation } from "@/lib/camelot";
import { KeyBadge, keyColumnWidth } from "./key-badge";

const DownloadIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 2V9.5M5 8L8 11L11 8" stroke={color} strokeWidth="0.7" fill="none" strokeLinejoin="miter" />
    <line x1="3" y1="14" x2="13" y2="14" stroke={color} strokeWidth="0.7" />
  </svg>
);

/** Simple square selector. Blue when selected, grey when not. Same tokens
 *  drive both light and dark mode automatically. */
const Checkbox = ({ checked, C }: { checked: boolean; C: Theme }) => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <rect
      x="0"
      y="0"
      width="14"
      height="14"
      fill={checked ? C.accent : C.text}
      fillOpacity={checked ? 1 : 0.12}
    />
  </svg>
);

const TrashIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <line x1="2" y1="4" x2="14" y2="4" stroke={color} strokeWidth="0.7" />
    <line x1="6" y1="2" x2="10" y2="2" stroke={color} strokeWidth="0.7" />
    <path d="M4 4V14H12V4" stroke={color} strokeWidth="0.7" fill="none" strokeLinejoin="miter" />
  </svg>
);

const LinkIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M10 3h3v3" stroke={color} strokeWidth="0.7" fill="none" strokeLinejoin="miter" />
    <line x1="13" y1="3" x2="7.5" y2="8.5" stroke={color} strokeWidth="0.7" />
    <path d="M11 9v4H3V5h4" stroke={color} strokeWidth="0.7" fill="none" strokeLinejoin="miter" />
  </svg>
);

const SpinnerIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg className="animate-spin" width={size} height={size} viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="5" stroke={color} strokeWidth="0.7" strokeDasharray="20 8" strokeLinecap="round" opacity="0.7" />
  </svg>
);

export type SortColumn = "name" | "date" | "duration" | "format" | "bpm" | "key";

interface Props {
  C: Theme;
  isDark: boolean;
  isPro: boolean;
  items: HistoryItem[];
  selectedTracks: Set<string>;
  toggleTrack: (id: string) => void;
  toggleAllTracks: () => void;
  allTracksSelected: boolean;
  sortBy: SortColumn;
  sortDir: "asc" | "desc";
  toggleSort: (col: SortColumn) => void;
  onOpenFile: (id: string) => void;
  onRowDownload: (id: string) => void;
  onRowDelete: (id: string) => void;
  onRowShare: (id: string) => void;
  sharingId: string | null;
  downloadingId: string | null;
}

export function FilesTable(props: Props) {
  const {
    C, isDark, isPro, items,
    selectedTracks, toggleTrack, toggleAllTracks, allTracksSelected,
    sortBy, sortDir, toggleSort,
    onOpenFile, onRowDownload, onRowDelete, onRowShare, sharingId, downloadingId,
  } = props;

  const anySelected = selectedTracks.size > 0;
  const [keyNotation, setKeyNotation] = useKeyNotation();
  const keyColWidth = keyColumnWidth();
  const cycleKeyNotation = (e: React.MouseEvent) => {
    e.stopPropagation();
    setKeyNotation(cycleNotation(keyNotation));
  };

  const SortIcon = ({ col }: { col: SortColumn }) => (
    <svg
      width="8"
      height="8"
      viewBox="0 0 8 8"
      fill="none"
      className="ml-[4px]"
      style={{
        opacity: sortBy === col ? 1 : 0.4,
        transform: sortBy === col && sortDir === "asc" ? "scaleY(-1)" : undefined,
      }}
    >
      <path d="M2 3L4 5L6 3" stroke={C.textMuted} strokeWidth="0.8" fill="none" />
    </svg>
  );

  return (
    <>
      {/* Column headers */}
      <div
        className="flex items-center px-[16px] py-[8px] select-none"
        style={{
          color: C.textMuted,
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.05em",
          borderBottom: `1px solid ${C.text}08`,
        }}
      >
        <button
          onClick={toggleAllTracks}
          className="shrink-0 flex items-center justify-start cursor-pointer"
          style={{
            width: 52,
            marginLeft: -16,
            paddingLeft: 16,
            marginTop: -8,
            marginBottom: -8,
            paddingTop: 8,
            paddingBottom: 8,
          }}
          title={allTracksSelected ? "Deselect all" : "Select all"}
        >
          <Checkbox checked={allTracksSelected} C={C} />
        </button>
        <button
          onClick={() => toggleSort("name")}
          className="flex-1 text-left flex items-center cursor-pointer outline-none focus:outline-none"
        >
          NAME <SortIcon col="name" />
        </button>
        <button
          onClick={() => toggleSort("bpm")}
          className="w-[60px] text-right flex items-center justify-end cursor-pointer outline-none focus:outline-none"
        >
          BPM <SortIcon col="bpm" />
        </button>
        <button
          onClick={() => toggleSort("key")}
          className="text-right flex items-center justify-end cursor-pointer outline-none focus:outline-none shrink-0"
          style={{ width: keyColWidth }}
        >
          KEY <SortIcon col="key" />
        </button>
        <button
          onClick={() => toggleSort("duration")}
          className="w-[80px] text-right flex items-center justify-end cursor-pointer outline-none focus:outline-none"
        >
          TIME <SortIcon col="duration" />
        </button>
        <span className="w-[100px]" />
      </div>

      {/* Rows */}
      {items.map((item, i) => {
        const isTrackSelected = selectedTracks.has(item.id);
        return (
          <div
            key={item.id}
            className="flex items-center transition-colors"
            style={{
              ...(i < items.length - 1 ? { borderBottom: `1px solid ${C.text}08` } : {}),
              // Default (nothing selected): all rows bright (bgCard).
              // As soon as ≥1 track is selected: selected rows stay bright, others dim to bgSubtle.
              // Same logic in light + dark — tokens carry the palette.
              backgroundColor: anySelected
                ? isTrackSelected
                  ? C.bgCard
                  : C.bgSubtle
                : C.bgCard,
            }}
          >
            {/* Left zone — click anywhere here toggles selection. Covers the
                full row height and the left padding — no dead pixels. */}
            <button
              onClick={() => toggleTrack(item.id)}
              className="shrink-0 flex items-center cursor-pointer"
              style={{
                width: 60,
                alignSelf: "stretch",
                paddingLeft: 16,
                background: "transparent",
                border: "none",
              }}
              aria-label={isTrackSelected ? "Deselect" : "Select"}
            >
              <Checkbox checked={isTrackSelected} C={C} />
            </button>

            {/* Right zone — click opens stem modal. Everything else (icon, name, metadata) lives here. */}
            <div
              className="flex items-center flex-1 min-w-0 cursor-pointer"
              style={{ paddingTop: 14, paddingBottom: 14, paddingRight: 16 }}
              onClick={() => onOpenFile(item.id)}
            >
              <div className="flex items-center flex-1 min-w-0" style={{ gap: 12 }}>
                <div
                  className="flex items-center justify-center shrink-0"
                  style={{ height: 36, width: 36, backgroundColor: C.bgHover, borderRadius: 0 }}
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <rect x="2" y="5" width="1.8" height="6" fill={C.textMuted} opacity="0.5" />
                    <rect x="4.8" y="3" width="1.8" height="10" fill={C.textMuted} opacity="0.7" />
                    <rect x="7.6" y="1" width="1.8" height="14" fill={C.textMuted} />
                    <rect x="10.4" y="4" width="1.8" height="8" fill={C.textMuted} opacity="0.7" />
                    <rect x="13.2" y="6" width="1.8" height="4" fill={C.textMuted} opacity="0.5" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p style={{ fontSize: 14, fontWeight: 500, color: C.text }} className="truncate">
                    {item.name}
                  </p>
                  <p style={{ fontSize: 13, color: C.textMuted, marginTop: 1 }}>
                    {item.date} · {item.stems} stems
                  </p>
                </div>
              </div>
              <span className="w-[60px] text-right shrink-0" style={{ fontSize: 13, color: C.textMuted }}>
                {item.bpm != null ? Math.round(item.bpm) : "—"}
              </span>
              <div
                className="flex items-center justify-end shrink-0"
                style={{ width: keyColWidth }}
                onClick={(e) => e.stopPropagation()}
              >
                <KeyBadge
                  camelot={item.key}
                  keyRaw={item.key_raw}
                  notation={keyNotation}
                  onCycle={cycleKeyNotation}
                  C={C}
                />
              </div>
              <span className="w-[80px] text-right shrink-0" style={{ fontSize: 13, color: C.textMuted }}>
                {item.duration ?? "—"}
              </span>
              <div className="flex items-center justify-end gap-[2px] w-[100px]">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowShare(item.id);
                  }}
                  disabled={!isPro || sharingId === item.id}
                  className="p-[5px] transition-colors hover:opacity-80 cursor-pointer"
                  style={{
                    color: C.textMuted,
                    opacity: !isPro ? 0.3 : item.shareLinkId ? 1 : 0.45,
                    cursor: !isPro ? "not-allowed" : "pointer",
                  }}
                  title={
                    !isPro
                      ? "Public sharing requires a Pro plan"
                      : item.shareLinkId
                        ? "Copy public link"
                        : "Generate public link"
                  }
                >
                  {sharingId === item.id
                    ? <SpinnerIcon size={14} color={C.textMuted} />
                    : <LinkIcon size={14} color={C.textMuted} />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowDownload(item.id);
                  }}
                  disabled={downloadingId === item.id}
                  className="p-[5px] transition-colors hover:opacity-80 cursor-pointer disabled:cursor-wait"
                  style={{ color: C.textMuted }}
                  title="Download all stems (ZIP)"
                >
                  {downloadingId === item.id
                    ? <SpinnerIcon size={14} color={C.textMuted} />
                    : <DownloadIcon size={14} color={C.textMuted} />}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRowDelete(item.id);
                  }}
                  className="p-[5px] transition-colors hover:opacity-80 cursor-pointer"
                  style={{ color: C.textMuted }}
                  title="Delete file"
                >
                  <TrashIcon size={14} color={C.textMuted} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
