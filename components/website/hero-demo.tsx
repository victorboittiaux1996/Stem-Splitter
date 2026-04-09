"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { stemColors, fonts } from "./theme";
import {
  RiFileUploadFill,
  RiMicFill,
  RiEqualizerFill,
} from "@remixicon/react";

// ─── Dark tokens (exact classicThemes.dark from app/app/page.tsx line 37-44) ─
const D = {
  bg: "#111111",
  bgCard: "#1C1C1C",
  bgSubtle: "#161616",
  bgHover: "#242424",
  text: "#FFFFFF",
  textSec: "#999999",
  textMuted: "#666666",
  accent: "#1B10FD",
  navActive: "#222222",
} as const;

// Font — exact from app (line 28)
const F = "'Futura PT', 'futura-pt', sans-serif";

type DemoView = "split" | "results" | "files";

// ─── SVG Icons — verbatim from app/app/page.tsx ─────────────

// Nav icons (lines 677-708)
const SplitIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="1" y="2" width="6" height="12" stroke={color} strokeWidth="0.7"/>
    <line x1="7" y1="4" x2="7" y2="12" stroke={color} strokeWidth="0.7"/>
    <line x1="9" y1="3.5" x2="14" y2="3.5" stroke={color} strokeWidth="0.7"/>
    <line x1="9" y1="6.5" x2="14" y2="6.5" stroke={color} strokeWidth="0.7"/>
    <line x1="9" y1="9.5" x2="14" y2="9.5" stroke={color} strokeWidth="0.7"/>
    <line x1="9" y1="12.5" x2="14" y2="12.5" stroke={color} strokeWidth="0.7"/>
  </svg>
);
const FilesIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 4V13H14V6H8L6 4H2Z" stroke={color} strokeWidth="0.7" strokeLinejoin="miter" fill="none"/>
  </svg>
);
const StatsIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <line x1="3.5" y1="7" x2="3.5" y2="13" stroke={color} strokeWidth="0.7"/>
    <line x1="6.5" y1="4" x2="6.5" y2="13" stroke={color} strokeWidth="0.7"/>
    <line x1="9.5" y1="9" x2="9.5" y2="13" stroke={color} strokeWidth="0.7"/>
    <line x1="12.5" y1="2" x2="12.5" y2="13" stroke={color} strokeWidth="0.7"/>
    <line x1="2" y1="13" x2="14" y2="13" stroke={color} strokeWidth="0.7"/>
  </svg>
);
const GamesIcon = ({ color }: { color: string }) => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="5" height="5" stroke={color} strokeWidth="0.7"/>
    <rect x="9" y="2" width="5" height="5" stroke={color} strokeWidth="0.7"/>
    <rect x="2" y="9" width="5" height="5" stroke={color} strokeWidth="0.7"/>
    <rect x="9" y="9" width="5" height="5" stroke={color} strokeWidth="0.7"/>
  </svg>
);

// Bottom icons (lines 736-738, 757, 768)
const FeedbackIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M2 2H14V11H9L5 14V11H2V2Z" stroke="currentColor" strokeWidth="0.7" fill="none" strokeLinejoin="miter"/>
  </svg>
);
const DocsIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="0.7" fill="none"/>
    <line x1="5" y1="5.5" x2="11" y2="5.5" stroke="currentColor" strokeWidth="0.7"/>
    <line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="0.7"/>
    <line x1="5" y1="10.5" x2="9" y2="10.5" stroke="currentColor" strokeWidth="0.7"/>
  </svg>
);
const AskIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="0.7"/>
    <path d="M6 6.5C6 5.4 6.9 4.5 8 4.5C9.1 4.5 10 5.4 10 6.5C10 7.6 9 8 8 8.5V9.5" stroke="currentColor" strokeWidth="0.7" fill="none" strokeLinecap="square"/>
    <line x1="8" y1="11" x2="8" y2="11.5" stroke="currentColor" strokeWidth="0.7"/>
  </svg>
);
const SunIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="0.7"/>
    <line x1="8" y1="1.5" x2="8" y2="3" stroke="currentColor" strokeWidth="0.7"/>
    <line x1="8" y1="13" x2="8" y2="14.5" stroke="currentColor" strokeWidth="0.7"/>
    <line x1="1.5" y1="8" x2="3" y2="8" stroke="currentColor" strokeWidth="0.7"/>
    <line x1="13" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="0.7"/>
    <line x1="3.4" y1="3.4" x2="4.5" y2="4.5" stroke="currentColor" strokeWidth="0.7"/>
    <line x1="11.5" y1="11.5" x2="12.6" y2="12.6" stroke="currentColor" strokeWidth="0.7"/>
    <line x1="12.6" y1="3.4" x2="11.5" y2="4.5" stroke="currentColor" strokeWidth="0.7"/>
    <line x1="4.5" y1="11.5" x2="3.4" y2="12.6" stroke="currentColor" strokeWidth="0.7"/>
  </svg>
);
const ActivityIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M4 10V7C4 4.8 5.8 3 8 3C10.2 3 12 4.8 12 7V10L13 12H3L4 10Z" stroke="currentColor" strokeWidth="0.7" fill="none" strokeLinejoin="miter"/>
    <path d="M6.5 12C6.5 13.4 7.2 14 8 14C8.8 14 9.5 13.4 9.5 12" stroke="currentColor" strokeWidth="0.7" fill="none"/>
  </svg>
);

// Waveform icon — exact rect-based from app (line 1115)
const WaveformIcon = ({ color }: { color: string }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
    <rect x="2" y="5" width="1.8" height="6" fill={color} opacity="0.5"/>
    <rect x="4.8" y="3" width="1.8" height="10" fill={color} opacity="0.7"/>
    <rect x="7.6" y="1" width="1.8" height="14" fill={color}/>
    <rect x="10.4" y="4" width="1.8" height="8" fill={color} opacity="0.7"/>
    <rect x="13.2" y="6" width="1.8" height="4" fill={color} opacity="0.5"/>
  </svg>
);

// Download + Trash — exact from app (lines 77-89)
const DownloadIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M8 2V9.5M5 8L8 11L11 8" stroke={color} strokeWidth="0.7" fill="none" strokeLinejoin="miter"/>
    <line x1="3" y1="14" x2="13" y2="14" stroke={color} strokeWidth="0.7"/>
  </svg>
);
const TrashIcon = ({ color }: { color: string }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <line x1="2" y1="4" x2="14" y2="4" stroke={color} strokeWidth="0.7"/>
    <line x1="6" y1="2" x2="10" y2="2" stroke={color} strokeWidth="0.7"/>
    <path d="M4 4V14H12V4" stroke={color} strokeWidth="0.7" fill="none" strokeLinejoin="miter"/>
  </svg>
);

// ─── Seeded waveform generator (DAW-style mirrored SVG) ─────
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function generateWaveformPath(seed: number, count = 100): string {
  const rng = mulberry32(seed);
  const cy = 18, amp = 14; // viewBox 0 0 100 36
  const peaks: number[] = [];
  for (let i = 0; i < count; i++) {
    const env = Math.sin((i / count) * Math.PI) * 0.6 + 0.4;
    peaks.push(env * (rng() * 0.7 + 0.3));
  }
  const top = peaks.map((p, i) => `${(i / count) * 100},${cy - p * amp}`).join(" L");
  const bot = [...peaks].reverse().map((p, i) => `${((count - 1 - i) / count) * 100},${cy + p * amp}`).join(" L");
  return `M0,${cy} L${top} L100,${cy} L${bot} Z`;
}

const WAVEFORM_SEEDS = [42, 137, 256, 891];

// Nav items
const NAV_ICONS = [SplitIcon, FilesIcon, StatsIcon, GamesIcon];

const STEMS = [
  { label: "VOCALS", color: stemColors.vocals },
  { label: "DRUMS", color: stemColors.drums },
  { label: "BASS", color: stemColors.bass },
  { label: "OTHER", color: stemColors.other },
];

const MOCK_FILES = [
  { name: "Daft Punk - Get Lucky (feat. Pharrell Williams).wav", time: "2h ago", stems: 4, bpm: "116", key: "5B", dur: "6m 09s", fmt: "WAV / MP3" },
  { name: "Stardust - Music Sounds Better With You.wav", time: "3h ago", stems: 4, bpm: "124", key: "3B", dur: "6m 43s", fmt: "WAV / MP3" },
  { name: "Prospa - This Rhythm (feat. RAHH) (Extended Mix).wav", time: "6h ago", stems: 4, bpm: "127", key: "6A", dur: "4m 19s", fmt: "WAV / MP3" },
  { name: "Billie Eilish - bad guy.mp3", time: "12h ago", stems: 4, bpm: "135", key: "9B", dur: "3m 14s", fmt: "WAV / MP3" },
  { name: "Michael Jackson - Billie Jean.wav", time: "1 day ago", stems: 4, bpm: "117", key: "10A", dur: "4m 54s", fmt: "WAV / MP3" },
  { name: "Fred again.. - Delilah (pull me out of this).mp3", time: "2 days ago", stems: 4, bpm: "134", key: "11B", dur: "4m 10s", fmt: "WAV / MP3" },
  { name: "Flume - Say It (feat. Tove Lo).wav", time: "3 days ago", stems: 4, bpm: "77", key: "1A", dur: "4m 43s", fmt: "WAV / MP3" },
];

// ─── Main component ─────────────────────────────────────────
export function HeroDemo() {
  const [view, setView] = useState<DemoView>("split");
  const [activeNav, setActiveNav] = useState(0);

  // Auto-cycle views
  useEffect(() => {
    const sequence: { view: DemoView; nav: number }[] = [
      { view: "split", nav: 0 },
      { view: "results", nav: 0 },
      { view: "files", nav: 1 },
    ];
    let step = 0;
    const interval = setInterval(() => {
      step = (step + 1) % sequence.length;
      setView(sequence[step].view);
      setActiveNav(sequence[step].nav);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ backgroundColor: "#F3F3F3", padding: "48px 0" }}>
      <div style={{
        display: "flex", overflow: "hidden",
        backgroundColor: D.bg,
        aspectRatio: "16 / 9",
        maxWidth: 880, margin: "0 auto",
        boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
      }}>
        {/* ── Sidebar COLLAPSED (52px) — exact from app with sidebarCollapsed=true ── */}
        <div style={{
          width: 52, flexShrink: 0,
          backgroundColor: D.bgSubtle,
          display: "flex", flexDirection: "column",
          overflow: "hidden",
          fontFamily: F,
        }}>
          {/* Logo — just the 4 bars, centered (app line 593-594) */}
          <div style={{
            height: 52, display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0 14px", cursor: "default",
          }}>
            <svg height="14" viewBox="0 0 24 21" fill="none" overflow="visible" style={{ flexShrink: 0 }}>
              <rect x="0" y="0" width="24" height="3" fill={D.text}/>
              <rect x="0" y="6" width="24" height="3" fill={D.text}/>
              <rect x="0" y="12" width="24" height="3" fill={D.text}/>
              <rect x="0" y="18" width="24" height="3" fill={D.text}/>
            </svg>
          </div>

          {/* Profile avatar — centered (app line 611-614) */}
          <div style={{ padding: "6px 0", display: "flex", justifyContent: "center" }}>
            <div style={{
              width: 30, height: 30, borderRadius: "50%",
              background: "linear-gradient(135deg, #1B10FD 0%, #7C3AED 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fff", fontFamily: F }}>VB</span>
            </div>
          </div>

          {/* Nav icons — centered, no labels (app line 719-721 sidebarCollapsed) */}
          <nav style={{ flex: 1, padding: "8px 0 0" }}>
            {NAV_ICONS.map((Icon, i) => {
              const isActive = i === activeNav;
              return (
                <div
                  key={i}
                  onClick={() => { setActiveNav(i); setView(i === 1 ? "files" : "split"); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center",
                    padding: "9px 0", marginBottom: 2, cursor: "default",
                    backgroundColor: isActive ? D.navActive : "transparent",
                  }}
                >
                  <Icon color={isActive ? D.text : D.textSec} />
                </div>
              );
            })}
          </nav>

          {/* Bottom icons — centered, no labels (app line 734-775 sidebarCollapsed) */}
          <div style={{ backgroundColor: D.bgSubtle, padding: "6px 0" }}>
            {[<FeedbackIcon key="fb" />, <DocsIcon key="doc" />, <AskIcon key="ask" />].map((icon, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "9px 0", color: D.textSec,
              }}>
                {icon}
              </div>
            ))}
            {/* Divider */}
            <div style={{ height: 1, backgroundColor: D.textMuted, opacity: 0.15, margin: "4px 12px" }} />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "9px 0", color: D.textSec }}>
              <SunIcon />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "9px 0", color: D.textSec }}>
              <ActivityIcon />
            </div>
          </div>
        </div>

        {/* ── Main content ── */}
        <div style={{ flex: 1, overflow: "hidden" }}>
          <AnimatePresence mode="wait">
            {view === "split" && <SplitView key="split" />}
            {view === "results" && <ResultsView key="results" />}
            {view === "files" && <FilesView key="files" />}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Split Audio View — exact structure from app ────────────
function SplitView() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ padding: "24px 24px", height: "100%", overflow: "hidden", fontFamily: F }}
    >
      {/* Title (app: fontSize 22, fontWeight 700) */}
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: D.text, marginBottom: 20 }}>
        Split Audio
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
        <span style={{
          fontSize: 13, fontWeight: 600, color: D.text,
          borderBottom: `2px solid ${D.accent}`, paddingBottom: 8, letterSpacing: "0.04em",
        }}>UPLOAD</span>
        <span style={{ fontSize: 13, color: D.textMuted, paddingBottom: 8, letterSpacing: "0.04em" }}>LINK</span>
      </div>

      {/* Drop zone (app: bgCard, dashed border) */}
      <div style={{
        backgroundColor: D.bgCard, border: `1px dashed ${D.bgHover}`,
        padding: "36px 24px", textAlign: "center", marginBottom: 0,
      }}>
        <div style={{ fontSize: 14, color: D.textMuted, marginBottom: 14, letterSpacing: "0.02em" }}>
          DROP FILES HERE OR
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: D.text, padding: "6px 0", backgroundColor: D.bgHover, width: 120, textAlign: "center", letterSpacing: "0.03em" }}>
            SELECT FILES
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: D.text, padding: "6px 0", backgroundColor: D.bgHover, width: 120, textAlign: "center", letterSpacing: "0.03em" }}>
            SELECT FOLDER
          </div>
        </div>
      </div>

      {/* Action bar — exact from app (lines 988-1079) */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <div style={{ padding: 8, color: D.textMuted, display: "flex" }}>
            <RiFileUploadFill size={16} />
          </div>
          <div style={{ padding: 8, color: D.textMuted, display: "flex" }}>
            <RiMicFill size={16} />
          </div>
          <div style={{ width: 1, height: 14, backgroundColor: D.textMuted, opacity: 0.3, margin: "0 6px" }} />
          <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "6px 8px" }}>
            <span style={{ fontSize: 15, fontWeight: 500, color: D.textMuted, letterSpacing: "0.03em" }}>4 STEMS</span>
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M3 4L5.5 7L8 4" stroke={D.textMuted} strokeWidth="1.2"/>
            </svg>
          </div>
          <div style={{ padding: 8, color: D.textMuted, display: "flex" }}>
            <RiEqualizerFill size={15} />
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 15, color: D.textMuted }}>0 / 10,000 credits</span>
          <div style={{ fontSize: 15, fontWeight: 600, color: D.textMuted, backgroundColor: D.bgCard, padding: "8px 16px", letterSpacing: "0.03em", opacity: 0.25 }}>
            SPLIT
          </div>
        </div>
      </div>

      {/* Recent splits (app: marginTop 40, fontSize 22) */}
      <div style={{ marginTop: 40 }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: D.text, marginBottom: 20 }}>Recent splits</div>
        <div style={{ backgroundColor: D.bgCard }}>
          {/* Search bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: `1px solid ${D.text}08` }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="5" stroke={D.textMuted} strokeWidth="1.6"/>
              <line x1="11" y1="11" x2="14" y2="14" stroke={D.textMuted} strokeWidth="1.6"/>
            </svg>
            <span style={{ fontSize: 13, color: D.textMuted, letterSpacing: "0.03em" }}>SEARCH HISTORY</span>
          </div>
          {/* Column header (app line 1098-1105) */}
          <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", fontSize: 12, fontWeight: 500, letterSpacing: "0.05em", color: D.textMuted, borderBottom: `1px solid ${D.text}08` }}>
            <span style={{ flex: 1 }}>NAME</span>
            <span style={{ width: 60, textAlign: "right" }}>BPM</span>
            <span style={{ width: 50, textAlign: "right" }}>KEY</span>
            <span style={{ width: 80, textAlign: "right" }}>DURATION</span>
            <span style={{ width: 80, textAlign: "right" }}>FORMAT</span>
            <span style={{ width: 72 }} />
          </div>
          {/* File rows (app lines 1106-1131) */}
          {MOCK_FILES.map((f, i) => (
            <div key={f.name} style={{
              display: "flex", alignItems: "center", padding: "14px 16px",
              borderBottom: i < MOCK_FILES.length - 1 ? `1px solid ${D.text}08` : undefined,
              cursor: "default",
            }}>
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                <div style={{ width: 36, height: 36, backgroundColor: D.bgHover, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <WaveformIcon color={D.textMuted} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 500, color: D.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                  <div style={{ fontSize: 13, color: D.textMuted, marginTop: 1 }}>{f.time} · {f.stems} stems</div>
                </div>
              </div>
              <span style={{ width: 60, fontSize: 13, color: D.textMuted, textAlign: "right", flexShrink: 0 }}>{f.bpm}</span>
              <span style={{ width: 50, fontSize: 13, color: D.textMuted, textAlign: "right", flexShrink: 0 }}>{f.key}</span>
              <span style={{ width: 80, fontSize: 13, color: D.textMuted, textAlign: "right", flexShrink: 0 }}>{f.dur}</span>
              <span style={{ width: 80, fontSize: 13, color: D.textMuted, textAlign: "right", flexShrink: 0 }}>{f.fmt}</span>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 2, width: 72 }}>
                <div style={{ padding: 5 }}><DownloadIcon color={D.textMuted} /></div>
                <div style={{ padding: 5 }}><TrashIcon color={D.textMuted} /></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Results View ───────────────────────────────────────────
function ResultsView() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ padding: "24px 24px", height: "100%", overflow: "hidden", fontFamily: F }}
    >
      <div style={{ backgroundColor: D.bgCard }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 16px", borderBottom: `1px solid ${D.bgHover}` }}>
          <div style={{ width: 36, height: 36, backgroundColor: D.bgHover, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <WaveformIcon color={D.textSec} />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: D.text }}>Daft Punk - Get Lucky.wav</div>
            <div style={{ fontSize: 13, color: D.textMuted, marginTop: 3 }}>116 BPM · 5B · WAV · 4 stems</div>
          </div>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#00CC66", letterSpacing: "0.04em" }}>COMPLETE</span>
        </div>

        {/* Stem cards with animated bars */}
        {STEMS.map((s, i) => (
          <div key={s.label} style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 16px", borderBottom: i < STEMS.length - 1 ? `1px solid ${D.bgHover}` : "none",
          }}>
            <div style={{
              width: 28, height: 28, backgroundColor: s.color,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="10" height="12" viewBox="0 0 10 12" fill="none">
                <path d="M1 1V11L9 6L1 1Z" fill="#FFFFFF"/>
              </svg>
            </div>
            <span style={{
              width: 100, fontSize: 13, fontWeight: 600,
              color: D.text, letterSpacing: "0.04em", flexShrink: 0,
            }}>
              {s.label}
            </span>
            <div style={{ flex: 1, height: 36, backgroundColor: D.bgHover, overflow: "hidden", position: "relative" }}>
              <div style={{ position: "absolute", top: "50%", left: 0, right: 0, height: 1, backgroundColor: s.color, opacity: 0.1 }} />
              <svg viewBox="0 0 100 36" preserveAspectRatio="none" style={{ width: "100%", height: 36, display: "block" }}>
                <path d={generateWaveformPath(WAVEFORM_SEEDS[i])} fill={s.color} opacity={0.85} />
              </svg>
            </div>
            <span style={{ fontSize: 13, color: D.textMuted, width: 32, textAlign: "right" }}>WAV</span>
            <DownloadIcon color={D.textMuted} />
          </div>
        ))}

        {/* Footer */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 16px", backgroundColor: D.bgSubtle,
        }}>
          <span style={{ fontSize: 13, color: D.textMuted }}>4 stems · 6m 09s</span>
          <div style={{
            display: "flex", alignItems: "center", gap: 6,
            backgroundColor: D.accent, padding: "8px 16px",
          }}>
            <DownloadIcon color="#FFFFFF" />
            <span style={{ fontSize: 15, fontWeight: 600, color: "#FFFFFF", letterSpacing: "0.04em" }}>
              DOWNLOAD .ZIP
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── My Files View ──────────────────────────────────────────
function FilesView() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ padding: "24px 24px", height: "100%", overflow: "hidden", fontFamily: F }}
    >
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: D.text, marginBottom: 20 }}>
        My Files
      </div>

      <div style={{ backgroundColor: D.bgCard }}>
        <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", fontSize: 12, fontWeight: 500, letterSpacing: "0.05em", color: D.textMuted, borderBottom: `1px solid ${D.text}08` }}>
          <span style={{ flex: 1 }}>NAME</span>
          <span style={{ width: 50, textAlign: "right" }}>STEMS</span>
          <span style={{ width: 60, textAlign: "right" }}>BPM</span>
          <span style={{ width: 50, textAlign: "right" }}>KEY</span>
          <span style={{ width: 80, textAlign: "right" }}>DURATION</span>
        </div>
        {MOCK_FILES.map((f, i) => (
          <div key={f.name} style={{
            display: "flex", alignItems: "center", padding: "14px 16px",
            borderBottom: i < MOCK_FILES.length - 1 ? `1px solid ${D.text}08` : undefined,
            cursor: "default",
          }}>
            <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
              <div style={{ width: 36, height: 36, backgroundColor: D.bgHover, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <WaveformIcon color={D.textMuted} />
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 500, color: D.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.name}</div>
                <div style={{ fontSize: 13, color: D.textMuted, marginTop: 2 }}>{f.fmt} · {f.dur}</div>
              </div>
            </div>
            <span style={{ width: 50, fontSize: 13, color: D.textMuted, textAlign: "right", flexShrink: 0 }}>{f.stems}</span>
            <span style={{ width: 60, fontSize: 13, color: D.textMuted, textAlign: "right", flexShrink: 0 }}>{f.bpm}</span>
            <span style={{ width: 50, fontSize: 13, color: D.textMuted, textAlign: "right", flexShrink: 0 }}>{f.key}</span>
            <span style={{ width: 80, fontSize: 13, color: D.textMuted, textAlign: "right", flexShrink: 0 }}>{f.dur}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
