"use client";

// Internal preview page for choosing the My Files layout (filters vs table
// separation). NOT linked from anywhere — open /files-layout-test directly.
// Delete this folder once a layout is picked.

import { useState } from "react";
import { Search } from "lucide-react";
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

type Mode = "dark" | "light";
type Layout = "A" | "B" | "C" | "D" | "E";

const LAYOUTS: { id: Layout; label: string; hint: string }[] = [
  { id: "A", label: "A — actuel",       hint: "2 cards (filters | table) · gap 16px" },
  { id: "B", label: "B — large gap",    hint: "2 cards · gap 32px (très aéré)" },
  { id: "C", label: "C — 3 cards",      hint: "search | chips | table · gap 12/16" },
  { id: "D", label: "D — labels",       hint: "FILTERS / FILES sections labellisées" },
  { id: "E", label: "E — search w/ table", hint: "chips globaux séparés · search collé au-dessus de la table" },
];

const MOCK_TRACKS: { name: string; key: string; bpm: number; time: string }[] = [
  { name: "SpotiDownloader.com - Meu Verão - Vintage Culture.mp3",                     key: "8A",  bpm: 127, time: "3m 35s" },
  { name: "Catz n Dogz, Dope Earth Alien - Fired Up (Extended Mix).mp3",               key: "8A",  bpm: 128, time: "5m 15s" },
  { name: "Fired Up - Extended Mix - Catz n Dogz.mp3",                                  key: "5A",  bpm: 127, time: "5m 17s" },
  { name: "10A - 126 - Jamming - FISHER Rework - Bob Marley The Wailers.mp3",          key: "10A", bpm: 126, time: "3m 22s" },
  { name: "10A - 124 - Tony Romera - Cosmic Slop.mp3",                                  key: "10A", bpm: 124, time: "3m 22s" },
  { name: "OMG - Cardi B (Acapella).wav",                                               key: "3B",  bpm: 130, time: "2m 50s" },
  { name: "Bonobo - Linked.wav",                                                        key: "12A", bpm: 100, time: "4m 12s" },
];

// ─── Mock pieces — visually faithful to the real My Files components ──

function SearchRow({ C }: { C: { bg: string; bgCard: string; bgHover: string; text: string; textMuted: string; accent: string } }) {
  return (
    <div className="flex items-center" style={{ gap: 10, padding: "10px 16px", borderBottom: `1px solid ${C.text}08` }}>
      <Search style={{ height: 14, width: 14, flexShrink: 0, color: C.textMuted }} strokeWidth={1.6} />
      <input
        type="text"
        placeholder="SEARCH FILES"
        className="bg-transparent outline-none"
        style={{ flex: 1, fontSize: 13, color: C.text, letterSpacing: "0.03em" }}
      />
    </div>
  );
}

function FilterChips({ C, lastNoBorder = false }: { C: { bg: string; bgCard: string; bgHover: string; text: string; textMuted: string; accent: string }; lastNoBorder?: boolean }) {
  const Chip = ({ label, active = false }: { label: string; active?: boolean }) => (
    <button
      style={{
        padding: "5px 10px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: "0.04em",
        color: active ? "#FFFFFF" : C.textMuted,
        backgroundColor: active ? C.accent : `${C.text}10`,
        border: "none",
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
  return (
    <div
      className="flex items-center flex-wrap"
      style={{
        gap: 16,
        padding: "10px 16px",
        borderBottom: lastNoBorder ? undefined : `1px solid ${C.text}08`,
      }}
    >
      <Chip label="BPM" />
      <Chip label="KEY 8A" active />
      <Chip label="DURATION" />
      <Chip label="DATE" />
      <Chip label="STEMS" />
      <Chip label="BATCH" />
    </div>
  );
}

function TrackTable({ C }: { C: { bg: string; bgCard: string; bgHover: string; text: string; textMuted: string; accent: string } }) {
  return (
    <>
      {/* Header */}
      <div className="flex items-center" style={{ padding: "8px 16px", color: C.textMuted, fontSize: 12, fontWeight: 500, letterSpacing: "0.05em", borderBottom: `1px solid ${C.text}08` }}>
        <span style={{ width: 24, marginRight: 12 }} />
        <span style={{ flex: 1 }}>NAME</span>
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
            <span style={{ width: 24, marginRight: 12, height: 14, backgroundColor: `${C.text}10`, flexShrink: 0 }} />
            <div className="flex items-center" style={{ gap: 12, flex: 1, minWidth: 0 }}>
              {/* Track icon — Single line */}
              <div style={{ width: 36, height: 36, backgroundColor: C.bgHover, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="20" height="2" viewBox="0 0 20 2" fill="none">
                  <line x1="0" y1="1" x2="20" y2="1" stroke={C.textMuted} strokeWidth="0.7" />
                </svg>
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 500, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</p>
                <p style={{ fontSize: 13, color: C.textMuted, marginTop: 1 }}>5 days ago · 4 stems</p>
              </div>
            </div>
            <span className="text-right" style={{ width: 60, fontSize: 13, color: C.textMuted, flexShrink: 0 }}>{t.bpm}</span>
            <div className="flex items-center justify-end" style={{ width: 70, flexShrink: 0 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", padding: "3px 7px", backgroundColor: kBg, color: kFg, fontVariantNumeric: "tabular-nums", minWidth: 30, textAlign: "center", display: "inline-block" }}>
                {t.key}
              </span>
            </div>
            <span className="text-right" style={{ width: 80, fontSize: 13, color: C.textMuted, flexShrink: 0 }}>{t.time}</span>
            <div className="flex items-center justify-end" style={{ gap: 2, width: 100 }}>
              <span style={{ padding: 5, color: C.textMuted, opacity: 0.45 }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3h3v3" stroke={C.textMuted} strokeWidth="0.7" fill="none" strokeLinejoin="miter" />
                  <line x1="13" y1="3" x2="7.5" y2="8.5" stroke={C.textMuted} strokeWidth="0.7" />
                  <path d="M11 9v4H3V5h4" stroke={C.textMuted} strokeWidth="0.7" fill="none" strokeLinejoin="miter" />
                </svg>
              </span>
              <span style={{ padding: 5, color: C.textMuted }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M8 2V9.5M5 8L8 11L11 8" stroke={C.textMuted} strokeWidth="0.7" fill="none" strokeLinejoin="miter" />
                  <line x1="3" y1="14" x2="13" y2="14" stroke={C.textMuted} strokeWidth="0.7" />
                </svg>
              </span>
              <span style={{ padding: 5, color: C.textMuted }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <line x1="2" y1="4" x2="14" y2="4" stroke={C.textMuted} strokeWidth="0.7" />
                  <line x1="6" y1="2" x2="10" y2="2" stroke={C.textMuted} strokeWidth="0.7" />
                  <path d="M4 4V14H12V4" stroke={C.textMuted} strokeWidth="0.7" fill="none" strokeLinejoin="miter" />
                </svg>
              </span>
            </div>
          </div>
        );
      })}
    </>
  );
}

function SectionLabel({ C, children }: { C: { bg: string; bgCard: string; bgHover: string; text: string; textMuted: string; accent: string }; children: React.ReactNode }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", color: C.textMuted, marginBottom: 10, textTransform: "uppercase" }}>
      {children}
    </p>
  );
}

function LayoutA({ C }: { C: { bg: string; bgCard: string; bgHover: string; text: string; textMuted: string; accent: string } }) {
  return (
    <>
      <div style={{ backgroundColor: C.bgCard, marginBottom: 16 }}>
        <SearchRow C={C} />
        <FilterChips C={C} lastNoBorder />
      </div>
      <div style={{ backgroundColor: C.bgCard }}>
        <TrackTable C={C} />
      </div>
    </>
  );
}

function LayoutB({ C }: { C: { bg: string; bgCard: string; bgHover: string; text: string; textMuted: string; accent: string } }) {
  return (
    <>
      <div style={{ backgroundColor: C.bgCard, marginBottom: 32 }}>
        <SearchRow C={C} />
        <FilterChips C={C} lastNoBorder />
      </div>
      <div style={{ backgroundColor: C.bgCard }}>
        <TrackTable C={C} />
      </div>
    </>
  );
}

function LayoutC({ C }: { C: { bg: string; bgCard: string; bgHover: string; text: string; textMuted: string; accent: string } }) {
  return (
    <>
      <div style={{ backgroundColor: C.bgCard, marginBottom: 12 }}>
        <SearchRow C={C} />
      </div>
      <div style={{ backgroundColor: C.bgCard, marginBottom: 16 }}>
        <FilterChips C={C} lastNoBorder />
      </div>
      <div style={{ backgroundColor: C.bgCard }}>
        <TrackTable C={C} />
      </div>
    </>
  );
}

function LayoutD({ C }: { C: { bg: string; bgCard: string; bgHover: string; text: string; textMuted: string; accent: string } }) {
  return (
    <>
      <SectionLabel C={C}>Filters</SectionLabel>
      <div style={{ backgroundColor: C.bgCard, marginBottom: 24 }}>
        <SearchRow C={C} />
        <FilterChips C={C} lastNoBorder />
      </div>
      <SectionLabel C={C}>Files (7)</SectionLabel>
      <div style={{ backgroundColor: C.bgCard }}>
        <TrackTable C={C} />
      </div>
    </>
  );
}

function LayoutE({ C }: { C: { bg: string; bgCard: string; bgHover: string; text: string; textMuted: string; accent: string } }) {
  return (
    <>
      <h2 style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.01em", color: C.text, marginBottom: 12 }}>Filters</h2>
      <div style={{ backgroundColor: C.bgCard, marginBottom: 24 }}>
        <FilterChips C={C} lastNoBorder />
      </div>
      <div style={{ backgroundColor: C.bgCard }}>
        <SearchRow C={C} />
        <TrackTable C={C} />
      </div>
    </>
  );
}

export default function FilesLayoutTestPage() {
  const [layout, setLayout] = useState<Layout>("A");
  const [mode, setMode] = useState<Mode>("dark");
  const C = THEMES[mode];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: C.bg, color: C.text, fontFamily: "var(--font-futura), sans-serif", padding: "60px 80px" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.02em" }}>Files layout picker</h1>
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
        <p style={{ fontSize: 13, color: C.textMuted, marginBottom: 32 }}>Click a layout. Toggle dark/light. Delete /app/files-layout-test once you&apos;ve picked.</p>

        <div className="flex flex-wrap" style={{ gap: 6, marginBottom: 16 }}>
          {LAYOUTS.map((l) => (
            <button
              key={l.id}
              onClick={() => setLayout(l.id)}
              style={{
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: layout === l.id ? "#FFFFFF" : C.textMuted,
                backgroundColor: layout === l.id ? C.accent : C.bgCard,
                border: "none",
                cursor: "pointer",
              }}
            >
              {l.label}
            </button>
          ))}
        </div>

        <p style={{ fontSize: 12, color: C.textMuted, marginBottom: 24, letterSpacing: "0.03em" }}>
          {LAYOUTS.find((l) => l.id === layout)?.hint}
        </p>

        {layout === "A" && <LayoutA C={C} />}
        {layout === "B" && <LayoutB C={C} />}
        {layout === "C" && <LayoutC C={C} />}
        {layout === "D" && <LayoutD C={C} />}
        {layout === "E" && <LayoutE C={C} />}
      </div>
    </div>
  );
}
