"use client";

// Internal preview page for choosing the track-icon variant in
// Recent splits / My files. NOT linked from anywhere — open /icon-test
// directly. Delete this folder once a variant is picked.

import { useState } from "react";
import { camelotColor } from "@/lib/camelot";

const THEMES = {
  dark: {
    bg: "#111111",
    bgCard: "#1C1C1C",
    bgHover: "#242424",
    text: "#FFFFFF",
    textMuted: "#9E9E9E",
    accent: "#1B10FD",
  },
  light: {
    bg: "#F3F3F3",
    bgCard: "#FFFFFF",
    bgHover: "#E0E0E0",
    text: "#000000",
    textMuted: "#555555",
    accent: "#1B10FD",
  },
} as const;

const ABLETON_MUTED = [
  "#FFB4A2", "#B5EAD7", "#C7CEEA", "#FFDAC1",
  "#FF9AA2", "#E2F0CB", "#B0DEFF", "#FFCBF2",
];

const POP_PALETTE = [
  "#FF3366", "#00CC66", "#1B10FD", "#FF6B00",
  "#FFD700", "#00BBFF", "#B100FF", "#FF1744",
];

function hashIndex(s: string, mod: number): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % mod;
}

// Mock tracks with Camelot keys so we can preview key-colored variants.
const MOCK_TRACKS: { name: string; key: string }[] = [
  { name: "SpotiDownloader.com - Meu Verão - Vintage Culture.mp3",                     key: "8A" },
  { name: "Catz n Dogz, Dope Earth Alien - Fired Up (Extended Mix).mp3",               key: "8A" },
  { name: "Fired Up - Extended Mix - Catz n Dogz.mp3",                                  key: "5A" },
  { name: "10A - 126 - Jamming - FISHER Rework - Bob Marley The Wailers.mp3",          key: "10A" },
  { name: "10A - 124 - Tony Romera - Cosmic Slop.mp3",                                  key: "10A" },
  { name: "OMG - Cardi B (Acapella).wav",                                               key: "3B" },
  { name: "Bonobo - Linked.wav",                                                        key: "12A" },
  { name: "Disclosure - You & Me (Flume Remix).flac",                                   key: "1B" },
];

type Mode = "dark" | "light";

type Variant =
  | "current"
  | "empty"
  | "block-muted"
  | "block-pop"
  | "block-key"
  | "single-line"
  | "diagonal"
  | "stripes"
  | "corner"
  | "corner-key"
  | "vinyl"
  | "vinyl-rings"
  | "vinyl-key"
  | "center-square"
  | "center-square-key"
  | "center-circle"
  | "center-circle-key"
  | "center-dot";

// Note: *KEY variants removed — colorizing the icon by key duplicates the
// info already shown in the colored KEY pill on the right. Visually redundant.
const VARIANTS: { id: Variant; label: string; hint: string }[] = [
  { id: "current",       label: "Current",        hint: "5-bar glyph (baseline — too 'skype call')" },
  { id: "empty",         label: "Empty",          hint: "pure square, zero glyph" },
  { id: "single-line",   label: "Single line",    hint: "one horizontal stroke (monochrome, sober)" },
  { id: "diagonal",      label: "Diagonal",       hint: "one diagonal stroke" },
  { id: "vinyl-rings",   label: "Vinyl rings",    hint: "concentric circles (monochrome music ref)" },
  { id: "vinyl",         label: "Vinyl",          hint: "filled disc + center hole (monochrome)" },
  { id: "center-dot",    label: "Center dot",     hint: "tiny dot, ultra minimal" },
  { id: "center-square", label: "Center square",  hint: "small pop-colored square (hash, not key)" },
  { id: "center-circle", label: "Center circle",  hint: "small pop-colored circle (hash, not key)" },
  { id: "block-muted",   label: "Block muted",    hint: "pastel block (hash) — competes with KEY pill" },
  { id: "block-pop",     label: "Block POP",      hint: "saturated block (hash) — loud" },
  { id: "stripes",       label: "Stripes",        hint: "3 stem-colored bars (busy)" },
];

function TrackIcon({ name, camelot, variant, mode }: { name: string; camelot: string; variant: Variant; mode: Mode }) {
  const C = THEMES[mode];
  const SIZE = 36;
  const popColor = POP_PALETTE[hashIndex(name, POP_PALETTE.length)];
  const mutedColor = ABLETON_MUTED[hashIndex(name, ABLETON_MUTED.length)];
  const keyBg = camelotColor(camelot).bg;
  const keyFg = camelotColor(camelot).fg;
  const wrap = (children: React.ReactNode, bg: string = C.bgHover) => (
    <div style={{ width: SIZE, height: SIZE, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
      {children}
    </div>
  );

  if (variant === "empty") return wrap(null);
  if (variant === "block-muted") return wrap(null, mutedColor);
  if (variant === "block-pop") return wrap(null, popColor);
  if (variant === "block-key") return wrap(null, keyBg);
  if (variant === "single-line") return wrap(
    <svg width="20" height="2" viewBox="0 0 20 2" fill="none">
      <line x1="0" y1="1" x2="20" y2="1" stroke={C.textMuted} strokeWidth="0.7" />
    </svg>
  );
  if (variant === "diagonal") return wrap(
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
      <line x1="3" y1="17" x2="17" y2="3" stroke={C.textMuted} strokeWidth="0.7" />
    </svg>
  );
  if (variant === "stripes") {
    return (
      <div style={{ width: SIZE, height: SIZE, backgroundColor: C.bgHover, display: "flex", flexDirection: "column", justifyContent: "center", gap: 3, padding: "0 8px" }}>
        <div style={{ height: 3, backgroundColor: "#1B10FD" }} />
        <div style={{ height: 3, backgroundColor: "#FF6B00" }} />
        <div style={{ height: 3, backgroundColor: "#00CC66" }} />
      </div>
    );
  }
  if (variant === "corner") {
    return (
      <div style={{ width: SIZE, height: SIZE, backgroundColor: C.bgHover, position: "relative" }}>
        <div style={{ position: "absolute", top: 6, left: 6, width: 8, height: 8, backgroundColor: popColor }} />
      </div>
    );
  }
  if (variant === "corner-key") {
    return (
      <div style={{ width: SIZE, height: SIZE, backgroundColor: C.bgHover, position: "relative" }}>
        <div style={{ position: "absolute", top: 6, left: 6, width: 8, height: 8, backgroundColor: keyBg }} />
      </div>
    );
  }
  if (variant === "vinyl") return wrap(
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="10" fill={C.textMuted} opacity="0.85" />
      <circle cx="11" cy="11" r="2" fill={C.bgHover} />
    </svg>
  );
  if (variant === "vinyl-rings") return wrap(
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="10" stroke={C.textMuted} strokeWidth="0.7" fill="none" />
      <circle cx="11" cy="11" r="7" stroke={C.textMuted} strokeWidth="0.7" fill="none" opacity="0.6" />
      <circle cx="11" cy="11" r="4" stroke={C.textMuted} strokeWidth="0.7" fill="none" opacity="0.4" />
      <circle cx="11" cy="11" r="1.5" fill={C.textMuted} />
    </svg>
  );
  if (variant === "vinyl-key") return wrap(
    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
      <circle cx="11" cy="11" r="10" fill={keyBg} />
      <circle cx="11" cy="11" r="2" fill={keyFg} opacity="0.9" />
    </svg>
  );
  if (variant === "center-square") return wrap(
    <div style={{ width: 12, height: 12, backgroundColor: popColor }} />
  );
  if (variant === "center-square-key") return wrap(
    <div style={{ width: 12, height: 12, backgroundColor: keyBg }} />
  );
  if (variant === "center-circle") return wrap(
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" fill={popColor} />
    </svg>
  );
  if (variant === "center-circle-key") return wrap(
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="7" cy="7" r="6" fill={keyBg} />
    </svg>
  );
  if (variant === "center-dot") return wrap(
    <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
      <circle cx="3" cy="3" r="3" fill={popColor} />
    </svg>
  );
  // current — existing waveform-bars glyph
  return wrap(
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="5" width="1.8" height="6" fill={C.textMuted} opacity="0.5" />
      <rect x="4.8" y="3" width="1.8" height="10" fill={C.textMuted} opacity="0.7" />
      <rect x="7.6" y="1" width="1.8" height="14" fill={C.textMuted} />
      <rect x="10.4" y="4" width="1.8" height="8" fill={C.textMuted} opacity="0.7" />
      <rect x="13.2" y="6" width="1.8" height="4" fill={C.textMuted} opacity="0.5" />
    </svg>
  );
}

export default function IconTestPage() {
  const [variant, setVariant] = useState<Variant>("current");
  const [mode, setMode] = useState<Mode>("dark");
  const C = THEMES[mode];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, color: C.text, fontFamily: "var(--font-futura), sans-serif", padding: "60px 80px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Track icon picker</h1>
          <div style={{ display: "flex", gap: 4 }}>
            {(["dark", "light"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                style={{
                  padding: "6px 14px",
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  color: mode === m ? "#FFFFFF" : C.textMuted,
                  backgroundColor: mode === m ? C.accent : C.bgCard,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 32 }}>Click a variant. Toggle dark/light. Variants tagged KEY use the Camelot wheel color (musical meaning).</p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {VARIANTS.map((v) => (
            <button
              key={v.id}
              onClick={() => setVariant(v.id)}
              style={{
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: variant === v.id ? "#FFFFFF" : C.textMuted,
                backgroundColor: variant === v.id ? C.accent : C.bgCard,
                border: "none",
                cursor: "pointer",
              }}
            >
              {v.label}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 24, letterSpacing: "0.03em" }}>
          {VARIANTS.find((v) => v.id === variant)?.hint}
        </p>

        <div style={{ backgroundColor: C.bgCard }}>
          {/* Header — matches app/page.tsx:1453 exactly */}
          <div className="flex items-center" style={{ padding: "8px 16px", color: C.textMuted, fontSize: 12, fontWeight: 500, letterSpacing: "0.05em", borderBottom: `1px solid ${C.text}08` }}>
            <span className="flex-1">NAME</span>
            <span className="text-right" style={{ width: 60 }}>BPM</span>
            <span className="text-right" style={{ width: 70, flexShrink: 0 }}>KEY</span>
            <span className="text-right" style={{ width: 80 }}>TIME</span>
            <span style={{ width: 100 }} />
          </div>
          {MOCK_TRACKS.map((t, i) => {
            const { bg: kBg, fg: kFg } = camelotColor(t.key);
            return (
              <div
                key={t.name}
                className="flex items-center"
                style={{
                  padding: "14px 16px",
                  borderBottom: i < MOCK_TRACKS.length - 1 ? `1px solid ${C.text}08` : undefined,
                }}
              >
                <div className="flex items-center" style={{ gap: 12, flex: 1, minWidth: 0 }}>
                  <TrackIcon name={t.name} camelot={t.key} variant={variant} mode={mode} />
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 14, fontWeight: 500, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</p>
                    <p style={{ fontSize: 13, color: C.textMuted, marginTop: 1 }}>5 days ago · 4 stems</p>
                  </div>
                </div>
                {/* BPM */}
                <span className="text-right" style={{ width: 60, fontSize: 13, color: C.textMuted, flexShrink: 0 }}>127</span>
                {/* KEY — real KeyBadge style (Camelot pill) */}
                <div className="flex items-center justify-end" style={{ width: 70, flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      padding: "3px 7px",
                      backgroundColor: kBg,
                      color: kFg,
                      fontVariantNumeric: "tabular-nums",
                      minWidth: 30,
                      textAlign: "center",
                      display: "inline-block",
                    }}
                  >
                    {t.key}
                  </span>
                </div>
                {/* TIME */}
                <span className="text-right" style={{ width: 80, fontSize: 13, color: C.textMuted, flexShrink: 0 }}>3m 35s</span>
                {/* Actions: link · download · trash (stroke 0.7 SVGs, p-[5px], gap-[2px]) */}
                <div className="flex items-center justify-end" style={{ gap: 2, width: 100 }}>
                  <span style={{ padding: 5, color: C.textMuted, opacity: 0.45 }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M10 3h3v3" stroke={C.textMuted} strokeWidth="0.7" fill="none" strokeLinejoin="miter"/>
                      <line x1="13" y1="3" x2="7.5" y2="8.5" stroke={C.textMuted} strokeWidth="0.7"/>
                      <path d="M11 9v4H3V5h4" stroke={C.textMuted} strokeWidth="0.7" fill="none" strokeLinejoin="miter"/>
                    </svg>
                  </span>
                  <span style={{ padding: 5, color: C.textMuted }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2V9.5M5 8L8 11L11 8" stroke={C.textMuted} strokeWidth="0.7" fill="none" strokeLinejoin="miter"/>
                      <line x1="3" y1="14" x2="13" y2="14" stroke={C.textMuted} strokeWidth="0.7"/>
                    </svg>
                  </span>
                  <span style={{ padding: 5, color: C.textMuted }}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                      <line x1="2" y1="4" x2="14" y2="4" stroke={C.textMuted} strokeWidth="0.7"/>
                      <line x1="6" y1="2" x2="10" y2="2" stroke={C.textMuted} strokeWidth="0.7"/>
                      <path d="M4 4V14H12V4" stroke={C.textMuted} strokeWidth="0.7" fill="none" strokeLinejoin="miter"/>
                    </svg>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
