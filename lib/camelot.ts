/**
 * Camelot wheel helpers — notation format + soft pastel color per position.
 *
 * The detector (worker/analyzer.py) emits two fields per track:
 *   - key      → Camelot, e.g. "8A", "10B"
 *   - key_raw  → standard musical notation, e.g. "A minor", "C# Major"
 */

export type KeyNotation = "camelot" | "standard" | "both";

export const KEY_NOTATION_VALUES: readonly KeyNotation[] = ["camelot", "standard", "both"] as const;

export const KEY_NOTATION_LABEL: Record<KeyNotation, string> = {
  camelot: "Camelot",
  standard: "Standard",
  both: "Both",
};

export function cycleNotation(n: KeyNotation): KeyNotation {
  const i = KEY_NOTATION_VALUES.indexOf(n);
  return KEY_NOTATION_VALUES[(i + 1) % KEY_NOTATION_VALUES.length];
}

interface CamelotColor {
  bg: string;
  fg: string;
}

/**
 * 12-hue pastel palette, one per Camelot position (1–12). Saturation kept
 * moderate (not bright) to stay coherent with the sober Ableton-inspired
 * 44Stems charter.
 */
const POSITION_COLORS: Record<number, CamelotColor> = {
  1:  { bg: "#D6F0E8", fg: "#1F4D43" },
  2:  { bg: "#CFE6F1", fg: "#1D4757" },
  3:  { bg: "#D3DDF3", fg: "#23355E" },
  4:  { bg: "#DCD7F2", fg: "#2F2A5D" },
  5:  { bg: "#E5D3EE", fg: "#452858" },
  6:  { bg: "#F0D0E3", fg: "#5A274C" },
  7:  { bg: "#F5CEC9", fg: "#65292A" },
  8:  { bg: "#F5D3BC", fg: "#5C2F14" },
  9:  { bg: "#F3DCB1", fg: "#5C3F10" },
  10: { bg: "#EEE5AE", fg: "#54460F" },
  11: { bg: "#DCEAAF", fg: "#3C4C13" },
  12: { bg: "#CCE9BB", fg: "#2F4D20" },
};

const FALLBACK_COLOR: CamelotColor = { bg: "#E8E8E8", fg: "#555555" };

export function camelotPosition(camelot: string | null | undefined): number | null {
  if (!camelot) return null;
  const m = camelot.match(/^(\d{1,2})([AB])$/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  if (n < 1 || n > 12) return null;
  return n;
}

export function camelotColor(camelot: string | null | undefined): CamelotColor {
  const pos = camelotPosition(camelot);
  if (pos === null) return FALLBACK_COLOR;
  return POSITION_COLORS[pos] ?? FALLBACK_COLOR;
}

export function formatKey(
  camelot: string | null | undefined,
  keyRaw: string | null | undefined,
  notation: KeyNotation
): string {
  const c = camelot || "";
  const r = keyRaw || "";
  if (notation === "camelot") return c || "—";
  if (notation === "standard") return r || c || "—";
  if (c && r) return `${c} — ${r}`;
  return c || r || "—";
}
