"use client";

import { camelotColor, formatKey, type KeyNotation } from "@/lib/camelot";
import type { Theme } from "./theme";

/**
 * Premium key tag — Mix in Key-style. Colored Camelot badge + standard
 * notation rendered according to the user's `keyNotation` preference.
 *
 *   camelot  → [8A]
 *   standard → A minor
 *   both     → [8A] / A minor (stacked vertically — keeps column compact)
 *
 * Click cycles notation (camelot → standard → both → camelot).
 */
export function KeyBadge({
  camelot,
  keyRaw,
  notation,
  onCycle,
  C,
}: {
  camelot: string | null;
  keyRaw: string | null;
  notation: KeyNotation;
  onCycle: (e: React.MouseEvent) => void;
  C: Theme;
}) {
  if (!camelot && !keyRaw) {
    return <span style={{ fontSize: 13, color: C.textMuted }}>—</span>;
  }

  const { bg, fg } = camelotColor(camelot);
  const title = formatKey(camelot, keyRaw, "both");

  const badge = camelot ? (
    <span
      style={{
        fontSize: notation === "both" ? 10 : 11,
        fontWeight: 700,
        letterSpacing: "0.04em",
        padding: notation === "both" ? "2px 6px" : "3px 7px",
        backgroundColor: bg,
        color: fg,
        fontVariantNumeric: "tabular-nums",
        minWidth: notation === "both" ? 28 : 30,
        textAlign: "center" as const,
        display: "inline-block",
      }}
    >
      {camelot}
    </span>
  ) : null;

  const standard = keyRaw ? (
    <span
      style={{
        fontSize: notation === "both" ? 11 : 13,
        color: C.textMuted,
        whiteSpace: "nowrap",
      }}
    >
      {keyRaw}
    </span>
  ) : null;

  let content: React.ReactNode;
  if (notation === "camelot") content = badge;
  else if (notation === "standard") content = standard;
  else
    content = (
      <span
        style={{
          display: "inline-flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: 2,
          lineHeight: 1.1,
        }}
      >
        {badge}
        {standard}
      </span>
    );

  return (
    <button
      onClick={onCycle}
      title={`${title} — click to change notation`}
      className="flex items-center justify-end cursor-pointer outline-none focus:outline-none"
      style={{ background: "transparent", border: "none", padding: 0 }}
    >
      {content}
    </button>
  );
}

/**
 * Fixed column width — content stacks vertically in "both" mode so the
 * column stays narrow and other columns never shift when cycling notation.
 */
export function keyColumnWidth(): number {
  return 70;
}
