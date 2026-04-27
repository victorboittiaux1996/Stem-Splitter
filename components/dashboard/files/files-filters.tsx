"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { HistoryItem } from "@/lib/types";
import type { Theme } from "./theme";
import { useKeyNotation } from "@/hooks/use-key-notation";
import { camelotColor, formatKey } from "@/lib/camelot";

function pad2Num(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export function formatDurSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${pad2Num(s)}`;
}

const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatDateShort(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const sameYear = d.getFullYear() === now.getFullYear();
  if (sameYear) return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()} ${d.getFullYear() % 100}`;
}

export const DAY_MS = 86_400_000;

/**
 * Custom dual-handle range slider. Pointer-based (no native <input type="range">
 * to avoid its browser-specific thumb offsets). Pixel-perfect alignment:
 *  - Track spans full container width inset by HALF thumb on each side
 *  - Active blue range spans leftPct% to rightPct% of container (full width at bounds)
 *  - Handles are absolute-positioned with transform: translateX(-50%) so their
 *    CENTRE sits exactly at leftPct%/rightPct% of the container
 *  - At leftPct=0 the handle's left edge aligns flush with the container left edge
 *  - At rightPct=100 the handle's right edge aligns flush with the container right edge
 */
function DualRangeSlider({
  min, max, step, value, onChange, C,
}: {
  min: number;
  max: number;
  step: number;
  value: [number, number];
  onChange: (v: [number, number]) => void;
  C: Theme;
}) {
  const [lo, hi] = value;
  const span = Math.max(1, max - min);
  const leftPct = ((lo - min) / span) * 100;
  const rightPct = ((hi - min) / span) * 100;

  const trackRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"lo" | "hi" | null>(null);

  const pctFromClientX = (clientX: number): number => {
    const el = trackRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    return Math.min(100, Math.max(0, (x / rect.width) * 100));
  };

  const snap = (raw: number): number => {
    const stepped = Math.round((raw - min) / step) * step + min;
    return Math.min(max, Math.max(min, stepped));
  };

  const startDrag = (which: "lo" | "hi") => (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(which);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: PointerEvent) => {
      const pct = pctFromClientX(e.clientX);
      const raw = min + (pct / 100) * span;
      const v = snap(raw);
      if (dragging === "lo") onChange([Math.min(v, hi), hi]);
      else onChange([lo, Math.max(v, lo)]);
    };
    const onUp = () => setDragging(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragging, lo, hi, min, max, step, span]);

  const HANDLE = 14;

  return (
    <div style={{ position: "relative", width: "100%", height: 20, userSelect: "none" }}>
      {/* Track rail — positioned so its extremities line up with handle centres at bounds */}
      <div
        ref={trackRef}
        style={{
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
          left: HANDLE / 2,
          right: HANDLE / 2,
          height: 3,
          backgroundColor: `${C.text}18`,
        }}
      >
        {/* Active blue range — positioned relative to the track rail (not the outer container) */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: `${leftPct}%`,
            width: `${rightPct - leftPct}%`,
            height: "100%",
            backgroundColor: C.accent,
          }}
        />
      </div>

      {/* Low handle — centre at leftPct% of the TRACK RAIL coordinate space */}
      <div
        onPointerDown={startDrag("lo")}
        style={{
          position: "absolute",
          top: "50%",
          left: `calc(${HANDLE / 2}px + ${leftPct}% - ${(leftPct * HANDLE) / 100}px - ${HANDLE / 2}px)`,
          width: HANDLE,
          height: HANDLE,
          transform: "translateY(-50%)",
          backgroundColor: C.accent,
          cursor: dragging === "lo" ? "grabbing" : "grab",
          touchAction: "none",
          zIndex: 2,
        }}
      />

      {/* High handle — centre at rightPct% of the TRACK RAIL coordinate space */}
      <div
        onPointerDown={startDrag("hi")}
        style={{
          position: "absolute",
          top: "50%",
          left: `calc(${HANDLE / 2}px + ${rightPct}% - ${(rightPct * HANDLE) / 100}px - ${HANDLE / 2}px)`,
          width: HANDLE,
          height: HANDLE,
          transform: "translateY(-50%)",
          backgroundColor: C.accent,
          cursor: dragging === "hi" ? "grabbing" : "grab",
          touchAction: "none",
          zIndex: 2,
        }}
      />
    </div>
  );
}

/** Compact trigger + popover wrapper around DualRangeSlider. Shows a pill-style
 *  button with the current range, opens a small floating panel on click. */
function RangePopover({
  label, bounds, value, step, onChange, formatValue, C, triggerMinWidth = 0,
}: {
  label: string;
  bounds: [number, number];
  value: [number, number];
  step: number;
  onChange: (v: [number, number]) => void;
  formatValue: (n: number) => string;
  C: Theme;
  triggerMinWidth?: number;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const active = value[0] > bounds[0] || value[1] < bounds[1];

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} style={{ position: "relative" }} className="flex items-center gap-[6px]">
      <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", color: C.textMuted }}>
        {label}
      </span>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          fontSize: 11,
          fontWeight: 500,
          letterSpacing: "0.02em",
          padding: "3px 8px",
          backgroundColor: active ? C.accent : `${C.text}10`,
          color: active ? C.accentText : C.textSec,
          cursor: "pointer",
          fontFamily: "var(--font-futura), sans-serif",
          minWidth: triggerMinWidth,
          textAlign: "center" as const,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {active ? `${formatValue(value[0])} – ${formatValue(value[1])}` : "ANY"}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              left: 0,
              zIndex: 30,
              backgroundColor: C.bgCard,
              boxShadow: `0 1px 0 ${C.text}10, 0 8px 24px ${C.text}18`,
              padding: "14px 16px",
              minWidth: 240,
            }}
          >
            <div className="flex items-center justify-between mb-[10px]">
              <span
                style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: C.textMuted }}
              >
                {label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 500,
                  color: C.text,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {formatValue(value[0])} – {formatValue(value[1])}
              </span>
            </div>
            <DualRangeSlider
              min={bounds[0]}
              max={bounds[1]}
              step={step}
              value={value}
              onChange={onChange}
              C={C}
            />
            <div className="flex items-center justify-between mt-[8px]">
              <span style={{ fontSize: 10, color: C.textMuted }}>{formatValue(bounds[0])}</span>
              <button
                onClick={() => onChange([bounds[0], bounds[1]])}
                disabled={!active}
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.05em",
                  color: active ? C.textSec : C.textMuted,
                  opacity: active ? 1 : 0.5,
                  cursor: active ? "pointer" : "default",
                }}
              >
                RESET
              </button>
              <span style={{ fontSize: 10, color: C.textMuted }}>{formatValue(bounds[1])}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export type BatchGroup = {
  batchId: string;
  count: number;
  latest: number;
  label: string;
};

export interface FilesFiltersProps {
  C: Theme;
  history: HistoryItem[];
  fileSearch: string;
  setFileSearch: (v: string) => void;
  bpmRange: [number, number];
  setBpmRange: (v: [number, number]) => void;
  bpmBounds: [number, number];
  durRange: [number, number];
  setDurRange: (v: [number, number]) => void;
  durBounds: [number, number];
  dateRange: [number, number];
  setDateRange: (v: [number, number]) => void;
  dateBounds: [number, number];
  filterKey: string | null;
  setFilterKey: (v: string | null) => void;
  filterStems: Set<number>;
  setFilterStems: (updater: (prev: Set<number>) => Set<number>) => void;
  filterBatch: string | null;
  setFilterBatch: (v: string | null) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function batchLabel(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getFullYear() === yesterday.getFullYear() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getDate() === yesterday.getDate();

  const time = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  if (sameDay) return `Today ${time}`;
  if (isYesterday) return `Yesterday ${time}`;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[d.getMonth()]} ${d.getDate()} ${time}`;
}

export function useBatchGroups(history: HistoryItem[]): BatchGroup[] {
  return useMemo(() => {
    const groups = new Map<string, { count: number; latest: number; firstName: string }>();
    for (const item of history) {
      if (!item.batchId) continue;
      const existing = groups.get(item.batchId);
      const ts = item.completedAt ?? item.createdAt;
      if (existing) {
        existing.count += 1;
        if (ts > existing.latest) {
          existing.latest = ts;
        }
      } else {
        groups.set(item.batchId, { count: 1, latest: ts, firstName: item.name });
      }
    }
    return Array.from(groups.entries())
      .map(([batchId, v]) => ({
        batchId,
        count: v.count,
        latest: v.latest,
        label: `${batchLabel(v.latest)} · ${v.count} tracks`,
      }))
      .filter((g) => g.count > 1)
      .sort((a, b) => b.latest - a.latest);
  }, [history]);
}

export function FilesFilters(props: FilesFiltersProps) {
  const {
    C, history,
    fileSearch, setFileSearch,
    bpmRange, setBpmRange, bpmBounds,
    durRange, setDurRange, durBounds,
    dateRange, setDateRange, dateBounds,
    filterKey, setFilterKey,
    filterStems, setFilterStems,
    filterBatch, setFilterBatch,
    clearFilters, hasActiveFilters,
  } = props;

  const [keyNotation] = useKeyNotation();

  // Build { camelot, keyRaw } pairs — one per unique Camelot slot, sorted around the wheel.
  const availableKeys = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const h of history) {
      if (!h.key) continue;
      if (!map.has(h.key)) map.set(h.key, h.key_raw ?? null);
    }
    const parse = (k: string) => {
      const m = k.match(/(\d+)([AB])/);
      return m ? parseInt(m[1]) * 2 + (m[2] === "B" ? 1 : 0) : 999;
    };
    return Array.from(map.entries())
      .map(([camelot, keyRaw]) => ({ camelot, keyRaw }))
      .sort((a, b) => parse(a.camelot) - parse(b.camelot));
  }, [history]);

  const batchGroups = useBatchGroups(history);

  return (
    <>
      <div
        className="flex items-center gap-[10px] px-[16px] py-[10px]"
        style={{ borderBottom: `1px solid ${C.text}08` }}
      >
        <Search className="h-[14px] w-[14px] shrink-0" style={{ color: C.textMuted }} strokeWidth={1.6} />
        <input
          type="text"
          value={fileSearch}
          onChange={(e) => setFileSearch(e.target.value)}
          placeholder="SEARCH FILES"
          className="flex-1 bg-transparent text-[13px] outline-none"
          style={{ color: C.text, letterSpacing: "0.03em" }}
        />
      </div>

      {history.length > 0 && (
        <div
          className="flex items-center gap-[16px] px-[16px] py-[10px] flex-wrap"
          style={{ borderBottom: `1px solid ${C.text}08` }}
        >
          {/* BPM popover */}
          <RangePopover
            label="BPM"
            bounds={bpmBounds}
            value={bpmRange}
            step={1}
            onChange={setBpmRange}
            formatValue={(n) => `${n}`}
            C={C}
            triggerMinWidth={54}
          />

          {/* KEY dropdown */}
          {availableKeys.length > 0 && (
            <div className="flex items-center gap-[6px]">
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", color: C.textMuted }}>
                KEY
              </span>
              {filterKey && (() => {
                const c = camelotColor(filterKey);
                return (
                  <span
                    aria-hidden="true"
                    style={{
                      width: 10,
                      height: 10,
                      backgroundColor: c.bg,
                      display: "inline-block",
                    }}
                  />
                );
              })()}
              <select
                value={filterKey ?? ""}
                onChange={(e) => setFilterKey(e.target.value || null)}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  padding: "3px 6px",
                  backgroundColor: filterKey ? C.accent : `${C.text}10`,
                  color: filterKey ? C.accentText : C.textSec,
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-futura), sans-serif",
                }}
              >
                <option value="">ALL KEYS</option>
                {availableKeys.map(({ camelot, keyRaw }) => (
                  <option key={camelot} value={camelot}>
                    {formatKey(camelot, keyRaw, keyNotation)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* STEMS pills (kept as-is per Victor) */}
          <div className="flex items-center gap-[5px]">
            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", color: C.textMuted }}>
              STEMS
            </span>
            {([2, 4, 6] as const).map((n) => {
              const active = filterStems.has(n);
              return (
                <button
                  key={n}
                  onClick={() =>
                    setFilterStems((prev) => {
                      const next = new Set(prev);
                      if (active) next.delete(n);
                      else next.add(n);
                      return next;
                    })
                  }
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                    padding: "2px 7px",
                    color: active ? C.accentText : C.textSec,
                    backgroundColor: active ? C.accent : `${C.text}10`,
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>

          {/* DURATION popover */}
          <RangePopover
            label="DUR"
            bounds={durBounds}
            value={durRange}
            step={15}
            onChange={setDurRange}
            formatValue={formatDurSec}
            C={C}
            triggerMinWidth={74}
          />

          {/* DATE popover */}
          {dateBounds[1] > dateBounds[0] && (
            <RangePopover
              label="DATE"
              bounds={dateBounds}
              value={dateRange}
              step={DAY_MS}
              onChange={setDateRange}
              formatValue={formatDateShort}
              C={C}
              triggerMinWidth={96}
            />
          )}

          {/* BATCH dropdown (only if ≥1 batch exists) */}
          {batchGroups.length > 0 && (
            <div className="flex items-center gap-[6px]">
              <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", color: C.textMuted }}>
                BATCH
              </span>
              <select
                value={filterBatch ?? ""}
                onChange={(e) => setFilterBatch(e.target.value || null)}
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: "0.02em",
                  padding: "3px 6px",
                  backgroundColor: filterBatch ? C.accent : `${C.text}10`,
                  color: filterBatch ? C.accentText : C.textSec,
                  border: "none",
                  outline: "none",
                  cursor: "pointer",
                  fontFamily: "var(--font-futura), sans-serif",
                }}
              >
                <option value="">ALL BATCHES</option>
                {batchGroups.map((g) => (
                  <option key={g.batchId} value={g.batchId}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              style={{
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: "0.05em",
                color: C.textMuted,
                marginLeft: "auto",
              }}
            >
              CLEAR
            </button>
          )}
        </div>
      )}
    </>
  );
}

