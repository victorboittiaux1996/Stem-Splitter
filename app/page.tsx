"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Sidebar, type SidebarView } from "@/components/dashboard/sidebar";
import {
  type StemCount,
  type OutputFormat,
} from "@/components/dashboard/settings-panel";
import { ProcessingView } from "@/components/dashboard/processing-view";
import { ResultsView } from "@/components/dashboard/results-view";
import {
  Clock,
  FileAudio,
  CheckCircle2,
  Settings2,
  Download,
  Trash2,
  Scissors,
  HelpCircle,
  Bell,
  Upload,
  Mic,
  Mic2,
  Music,
  Waves,
  ChevronDown,
  ChevronRight,
  AudioLines,
  Filter,
  Check,
  Square,
  CheckSquare,
  SquareCheckBig,
  Copy,
  Play,
  Pause,
  Sun,
  Moon,
  Search,
  ArrowUpDown,
  X,
  ChevronLeft,
  SendHorizonal,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Waveform } from "@/components/dashboard/waveform";
import { BpmTap } from "@/components/dashboard/games/bpm-tap";
import { MpcPad } from "@/components/dashboard/games/mpc-pad";
import { MelodyMemory } from "@/components/dashboard/games/melody-memory";
import { TomatoToss } from "@/components/dashboard/games/tomato-toss";
import { FrequencyQuiz } from "@/components/dashboard/games/frequency-quiz";
import { GuessTheStem } from "@/components/dashboard/games/guess-the-stem";

type AppState = "idle" | "file-selected" | "processing" | "complete";

const STEM_MAP: Record<StemCount, string[]> = {
  2: ["vocals", "instrumental"],
  4: ["vocals", "drums", "bass", "other"],
  6: ["vocals", "drums", "bass", "guitar", "piano", "other"],
};

const STAGES = [
  "Uploading to GPU cluster...",
  "Running spectral analysis...",
  "AI agents separating layers...",
  "Cross-validating between models...",
  "Removing artifacts & bleed...",
  "Studio-grade mastering...",
  "Quality check by AI reviewer...",
  "Rendering final stems...",
];

const MOCK_FILES = [
  { name: "summer_vibes_remix.mp3", date: "2 hours ago", stems: 4, size: "8.2 MB" },
  { name: "midnight_drive_v2.wav", date: "Yesterday", stems: 6, size: "24.1 MB" },
  { name: "acoustic_demo.flac", date: "3 days ago", stems: 2, size: "31.7 MB" },
];

const STEM_TYPES = ["vocals", "drums", "bass", "guitar", "piano", "other", "instrumental"] as const;

const STEM_LABELS: Record<string, string> = {
  vocals: "Vocals", drums: "Drums", bass: "Bass", guitar: "Guitar",
  piano: "Piano", other: "Other", instrumental: "Instrumental",
};

const STEM_ICON_COLORS: Record<string, string> = {
  vocals: "#8B5CF6", drums: "#F59E0B", bass: "#10B981", guitar: "#F97316",
  piano: "#0EA5E9", other: "#EE575A", instrumental: "#6366F1",
};

const HISTORY = [
  { id: "1", name: "Baime - Human Needs [BULKMIXMSTRV2]", date: "7 hours ago", stems: 4, duration: "5m 41s", format: "wav", bpm: 128, key: "Am",
    stemList: ["vocals", "drums", "bass", "other"], model: "MelBand RoFormer", quality: 75, stability: 80 },
  { id: "2", name: "summer_vibes_remix", date: "Yesterday", stems: 6, duration: "3m 24s", format: "mp3", bpm: 95, key: "Db",
    stemList: ["vocals", "drums", "bass", "guitar", "piano", "other"], model: "MelBand RoFormer", quality: 70, stability: 75 },
  { id: "3", name: "midnight_drive_v2", date: "3 days ago", stems: 2, duration: "4m 12s", format: "wav", bpm: 140, key: "F#m",
    stemList: ["vocals", "instrumental"], model: "BS-RoFormer", quality: 90, stability: 85 },
  { id: "4", name: "acoustic_demo_final", date: "1 week ago", stems: 4, duration: "2m 58s", format: "flac", bpm: 72, key: "G",
    stemList: ["vocals", "drums", "bass", "other"], model: "MelBand RoFormer", quality: 70, stability: 75 },
];

const STEM_OPTIONS: { value: StemCount; label: string; desc: string; icon: typeof Mic2 }[] = [
  { value: 2, label: "2 Stems", desc: "Vocals + Instrumental", icon: Mic2 },
  { value: 4, label: "4 Stems", desc: "Vocals, Drums, Bass, Other", icon: Music },
  { value: 6, label: "6 Stems", desc: "All instruments separated", icon: Waves },
];

const themes = {
  dark: {
    bg: "#0F0F0F",
    bgCard: "#1A1A1B",
    bgSubtle: "#1C1C1D",
    bgHover: "#252527",
    border: "rgba(255,255,255,0.12)",
    text: "#E8E8E8",
    textMuted: "#7A7A82",
    textLight: "#555558",
    textSec: "#A6A6AF",
    accent: "#1B10FD",
    hoverBg: "#222224",
    // Sidebar
    sidebarBg: "#1C1C1D",
    sidebarBorder: "rgba(255,255,255,0.12)",
    sidebarText: "#A6A6AF",
    sidebarTextActive: "#E8E8E8",
    sidebarActiveItem: "#252527",
    sidebarHover: "#252527",
    sidebarLogoBg: "#E8E8E8",
    sidebarLogoText: "#0F0F0F",
    sidebarLabel: "#555558",
    // Top bar
    topBarPillBorder: "rgba(255,255,255,0.12)",
    topBarPillText: "#BBBBC4",
    topBarPillHover: "#252527",
    // Badges
    badgeBg: "#252527",
    badgeText: "#A6A6AF",
    // Success
    successBg: "#0D2818",
    successText: "#34D399",
  },
  light: {
    bg: "#FFFFFF",
    bgCard: "#FFFFFF",
    bgSubtle: "#FAFAFA",
    bgHover: "#F4F4F5",
    border: "#E5E5E8",
    text: "#0F0F10",
    textMuted: "#949494",
    textLight: "#BBBBC4",
    textSec: "#6B6B73",
    accent: "#1B10FD",
    hoverBg: "#F0EFEF",
    // Sidebar
    sidebarBg: "#FAFAFA",
    sidebarBorder: "#E5E5E8",
    sidebarText: "#6B6B73",
    sidebarTextActive: "#0F0F10",
    sidebarActiveItem: "#F4F4F5",
    sidebarHover: "#F4F4F5",
    sidebarLogoBg: "#0F0F10",
    sidebarLogoText: "#FFFFFF",
    sidebarLabel: "#949494",
    // Top bar
    topBarPillBorder: "#E5E5E8",
    topBarPillText: "#3D3D42",
    topBarPillHover: "#FAFAFA",
    // Badges
    badgeBg: "#F4F4F5",
    badgeText: "#6B6B73",
    // Success
    successBg: "#ECFDF5",
    successText: "#059669",
  },
} as const;

type FontStyle = "aeonik" | "inter";

const FONT_FAMILIES: Record<FontStyle, string> = {
  aeonik: "'Aeonik', sans-serif",
  inter: "'Inter', system-ui, sans-serif",
};

export default function Dashboard() {
  const [isDark, setIsDark] = useState(true);
  const [fontStyle, setFontStyle] = useState<FontStyle>("inter");
  const C = isDark ? themes.dark : themes.light;
  const fontFamily = FONT_FAMILIES[fontStyle];

  const [sidebarView, setSidebarView] = useState<SidebarView>("split");
  const [appState, setAppState] = useState<AppState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [stemCount, setStemCount] = useState<StemCount>(4);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("wav");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [extraOpen, setExtraOpen] = useState(false);
  const [stemsOpen, setStemsOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  // Files view state
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [selectedStems, setSelectedStems] = useState<Set<string>>(new Set());
  const [stemFilter, setStemFilter] = useState<string | null>(null);
  const [formatFilter, setFormatFilter] = useState<string | null>(null);
  const [exportMode, setExportMode] = useState(false);
  const [exportStemPicker, setExportStemPicker] = useState(false);
  const [playingStem, setPlayingStem] = useState<string | null>(null);
  const [activeGame, setActiveGame] = useState<string>("");
  const [sortBy, setSortBy] = useState<"name" | "date" | "duration" | "format" | "bpm" | "key">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [fileSearch, setFileSearch] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const extraRef = useRef<HTMLDivElement>(null);
  const stemsRef = useRef<HTMLDivElement>(null);
  const formatRef = useRef<HTMLDivElement>(null);

  const credits = 10000;

  useEffect(() => {
    if (!extraOpen && !stemsOpen && !formatOpen) return;
    const handler = (e: MouseEvent) => {
      if (extraOpen && extraRef.current && !extraRef.current.contains(e.target as Node)) setExtraOpen(false);
      if (stemsOpen && stemsRef.current && !stemsRef.current.contains(e.target as Node)) setStemsOpen(false);
      if (formatOpen && formatRef.current && !formatRef.current.contains(e.target as Node)) setFormatOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [extraOpen, stemsOpen, formatOpen]);

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    setAppState("file-selected");
  }, []);

  const handleFileClear = useCallback(() => {
    setFile(null);
    setAppState("idle");
  }, []);

  const handleSplit = useCallback(() => {
    if (!file) return;
    setAppState("processing");
    setProgress(0);
    setStage(STAGES[0]);
    let p = 0;
    let stageIdx = 0;
    intervalRef.current = setInterval(() => {
      p += Math.random() * 0.4 + 0.15;
      if (p >= 100) {
        p = 100;
        setProgress(100);
        setStage("Complete!");
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeout(() => setAppState("complete"), 500);
        return;
      }
      setProgress(p);
      const newIdx = Math.min(
        STAGES.length - 1,
        Math.floor(p / (100 / STAGES.length))
      );
      if (newIdx !== stageIdx) {
        stageIdx = newIdx;
        setStage(STAGES[stageIdx]);
      }
    }, 180);
  }, [file]);

  const handleNewSplit = useCallback(() => {
    setFile(null);
    setAppState("idle");
    setProgress(0);
    setStage("");
  }, []);


  const isUploadState = appState === "idle" || appState === "file-selected";
  const stemLabel = stemCount === 2 ? "2 Stems" : stemCount === 4 ? "4 Stems" : "6 Stems";

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: C.bg, color: C.text, fontFamily, "--font-sans": fontFamily, "--font-heading": fontFamily } as React.CSSProperties}>
      {/* Sidebar */}
      <Sidebar activeView={sidebarView} onViewChange={setSidebarView} theme={C} fontStyle={fontStyle} onFontChange={setFontStyle} />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Content column */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <div className="flex h-[52px] shrink-0 items-center justify-between px-[20px]" style={{ borderBottom: `1px solid ${C.border}` }}>
            <div />
            <div className="flex items-center gap-[8px]">
              <TopBarPill label="Feedback" theme={C} />
              <TopBarPill label="Docs" theme={C} />
              <button
                className="flex items-center gap-[6px] rounded-full px-[14px] py-[6px] text-[13px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                style={{ color: C.topBarPillText, border: `1px solid ${C.border}` }}
              >
                <HelpCircle className="h-[14px] w-[14px]" style={{ color: C.textSec }} strokeWidth={1.8} />
                Ask
              </button>
              <div className="mx-[4px] h-[16px] w-px" style={{ backgroundColor: C.border }} />
              <button onClick={() => setIsDark(!isDark)}
                className="rounded-full p-[8px] transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ color: C.textSec }}>
                {isDark ? <Sun className="h-[16px] w-[16px]" strokeWidth={1.6} /> : <Moon className="h-[16px] w-[16px]" strokeWidth={1.6} />}
              </button>
              <button className="rounded-full p-[8px] transition-colors hover:bg-black/5 dark:hover:bg-white/5" style={{ color: C.textSec }}>
                <Bell className="h-[16px] w-[16px]" strokeWidth={1.6} />
              </button>
              <div
                className="ml-[2px] flex h-[28px] w-[28px] items-center justify-center rounded-full overflow-hidden"
                style={{ backgroundColor: C.bgHover }}
              >
                <span className="text-[11px] font-semibold" style={{ color: C.textSec }}>V</span>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="flex flex-1 flex-col overflow-y-auto">
            {sidebarView === "split" && (
              <>
                {isUploadState && (
                  <div className="px-[32px] pb-[40px] pt-[24px]">
                    <div style={{ maxWidth: 900, margin: "0 auto" }}>
                      <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: C.text, marginBottom: 24 }}>
                        Split Audio
                      </h2>
                      {/* Drop zone — ElevenLabs style: outer subtle bg + inner white card */}
                      <div className="rounded-[16px] p-[6px]" style={{ backgroundColor: C.bgSubtle }}>
                      <div
                        onClick={() => !file && document.getElementById("inline-file-input")?.click()}
                        className="flex items-center justify-center transition-all duration-150 rounded-[12px]"
                        style={{
                          minHeight: 148,
                          backgroundColor: C.bgCard,
                          cursor: file ? "default" : "pointer",
                        }}>
                        <input id="inline-file-input" type="file" className="hidden" accept=".mp3,.wav,.flac,.ogg,.m4a,.aac"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                        {file ? (
                          <div className="flex flex-col items-center gap-[8px]">
                            <FileAudio className="h-[20px] w-[20px]" style={{ color: C.textMuted }} strokeWidth={1.4} />
                            <p style={{ fontSize: 14, fontWeight: 600 }}>{file.name}</p>
                            <button onClick={(e) => { e.stopPropagation(); handleFileClear(); }}
                              className="flex items-center gap-[4px] rounded-[6px] px-[8px] py-[3px] transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ fontSize: 13, color: C.textMuted }}>
                              <Trash2 className="h-[11px] w-[11px]" /> Remove
                            </button>
                          </div>
                        ) : (
                          <p style={{ fontSize: 15, color: C.textMuted }}>Drop files here</p>
                        )}
                      </div>
                      </div>

                      {/* Action bar */}
                      <div className="flex items-center justify-between mt-[12px]">
                        <div className="flex items-center gap-[4px]">
                          <button onClick={() => document.getElementById("inline-file-input")?.click()}
                            className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                            <Upload className="h-[16px] w-[16px]" style={{ color: C.textSec }} strokeWidth={1.6} />
                          </button>
                          <button className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                            <Mic className="h-[16px] w-[16px]" style={{ color: C.textSec }} strokeWidth={1.6} />
                          </button>
                          <div className="w-[1px] h-[16px] mx-[8px]" style={{ backgroundColor: C.textSec, opacity: 0.3 }} />
                          {/* Stems dropdown */}
                          <div className="relative" ref={stemsRef}>
                            <button onClick={() => { setStemsOpen(!stemsOpen); setFormatOpen(false); }}
                              className="flex items-center gap-[5px] rounded-[8px] px-[10px] py-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ fontSize: 14, fontWeight: 500, color: C.textSec, backgroundColor: stemsOpen ? C.hoverBg : undefined }}>
                              {stemLabel}
                              <ChevronDown className="h-[11px] w-[11px]" style={{ color: C.textSec, opacity: 0.6, transform: stemsOpen ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} strokeWidth={2} />
                            </button>
                            <AnimatePresence>
                              {stemsOpen && (
                                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute left-0 top-full mt-[4px] z-30 w-[240px] rounded-[12px] overflow-hidden"
                                  style={{ backgroundColor: C.bgCard, border: `1px solid ${C.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
                                  {STEM_OPTIONS.map(opt => (
                                    <button key={opt.value} onClick={() => { setStemCount(opt.value); setStemsOpen(false); }}
                                      className="flex w-full items-center gap-[10px] px-[14px] py-[11px] text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                      style={stemCount === opt.value ? { backgroundColor: C.bgHover } : undefined}>
                                      <div className="flex h-[28px] w-[28px] items-center justify-center rounded-full shrink-0" style={{ backgroundColor: C.bgHover }}>
                                        <opt.icon className="h-[13px] w-[13px]" style={{ color: C.textMuted }} strokeWidth={1.6} />
                                      </div>
                                      <div>
                                        <p style={{ fontSize: 14, fontWeight: 600 }}>{opt.label}</p>
                                        <p style={{ fontSize: 12, color: C.textMuted }}>{opt.desc}</p>
                                      </div>
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          {/* Format dropdown */}
                          <div className="relative" ref={formatRef}>
                            <button onClick={() => { setFormatOpen(!formatOpen); setStemsOpen(false); }}
                              className="flex items-center gap-[5px] rounded-[8px] px-[10px] py-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ fontSize: 14, fontWeight: 500, color: C.textSec, backgroundColor: formatOpen ? C.hoverBg : undefined }}>
                              {outputFormat.toUpperCase()}
                              <ChevronDown className="h-[11px] w-[11px]" style={{ color: C.textSec, opacity: 0.6, transform: formatOpen ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} strokeWidth={2} />
                            </button>
                            <AnimatePresence>
                              {formatOpen && (
                                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute left-0 top-full mt-[4px] z-30 w-[160px] rounded-[10px] overflow-hidden"
                                  style={{ backgroundColor: C.bgCard, border: `1px solid ${C.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
                                  {([["wav", "WAV (Lossless)"], ["mp3", "MP3 (128kbps)"]] as const).map(([val, label]) => (
                                    <button key={val} onClick={() => { setOutputFormat(val as OutputFormat); setFormatOpen(false); }}
                                      className="flex w-full px-[14px] py-[10px] text-left transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                      style={{ fontSize: 14, fontWeight: outputFormat === val ? 600 : 400, backgroundColor: outputFormat === val ? C.bgHover : undefined }}>
                                      {label}
                                    </button>
                                  ))}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          {/* Gear popover */}
                          <div className="relative" ref={extraRef}>
                            <button onClick={() => setExtraOpen(!extraOpen)}
                              className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                              style={{ backgroundColor: extraOpen ? C.hoverBg : undefined }}>
                              <Settings2 className="h-[15px] w-[15px]" style={{ color: extraOpen ? C.text : C.textSec }} strokeWidth={1.6} />
                            </button>
                            <AnimatePresence>
                              {extraOpen && (
                                <motion.div initial={{ opacity: 0, y: 4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.97 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute left-0 top-full mt-[6px] z-30 w-[280px]"
                                  style={{ backgroundColor: C.bgCard, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: "0 8px 30px rgba(0,0,0,0.1)" }}>
                                  <div className="px-[16px] py-[12px]" style={{ borderBottom: `1px solid ${C.border}` }}>
                                    <span style={{ fontSize: 14, fontWeight: 600 }}>Advanced settings</span>
                                  </div>
                                  <div className="px-[16px] py-[14px] space-y-[16px]">
                                    <div className="space-y-[6px]">
                                      <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: "0.03em", textTransform: "uppercase" as const }}>Model</label>
                                      <button className="flex w-full items-center gap-[8px] rounded-[8px] px-[10px] py-[7px] transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                                        style={{ backgroundColor: C.hoverBg }}>
                                        <div className="flex h-[16px] items-center rounded-[3px] px-[4px]" style={{ backgroundColor: C.accent }}>
                                          <span style={{ fontSize: 8, fontWeight: 700, color: "#fff" }}>AI</span>
                                        </div>
                                        <span style={{ fontSize: 13, fontWeight: 500 }} className="flex-1 text-left">MelBand RoFormer</span>
                                        <ChevronDown className="h-[11px] w-[11px]" style={{ color: C.textLight }} strokeWidth={2} />
                                      </button>
                                    </div>
                                    <div className="space-y-[6px]">
                                      <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: "0.03em", textTransform: "uppercase" as const }}>Stability</label>
                                      <input type="range" min={0} max={1} step={0.01} defaultValue={0.75} className="w-full h-[3px] cursor-pointer" style={{ accentColor: C.accent }} />
                                    </div>
                                    <div className="space-y-[6px]">
                                      <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: "0.03em", textTransform: "uppercase" as const }}>Quality</label>
                                      <input type="range" min={0} max={1} step={0.01} defaultValue={0.7} className="w-full h-[3px] cursor-pointer" style={{ accentColor: C.accent }} />
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <span style={{ fontSize: 12 }}>Clean Vocals</span>
                                      <button className="relative h-[20px] w-[38px] rounded-full" style={{ backgroundColor: C.border }} aria-label="Toggle">
                                        <div className="absolute left-[2px] top-[2px] h-[16px] w-[16px] rounded-full" style={{ backgroundColor: C.bgCard, boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }} />
                                      </button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                        <div className="flex items-center gap-[12px]">
                          <span style={{ fontSize: 14, color: C.textSec }}>0 / 10,000 credits</span>
                          <button onClick={handleSplit} disabled={!file}
                            className="flex h-[36px] w-[36px] items-center justify-center rounded-full text-white transition-all hover:opacity-90 disabled:opacity-25 disabled:cursor-not-allowed"
                            style={{ backgroundColor: file ? C.accent : C.textLight }}>
                            <SendHorizonal className="h-[14px] w-[14px]" strokeWidth={2} />
                          </button>
                        </div>
                      </div>

                      {/* Recent splits */}
                      <div className="mt-[40px]">
                        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", color: C.text, marginBottom: 20 }}>Recent splits</h2>

                        <div className="rounded-[14px] overflow-hidden" style={{ border: `1px solid ${C.border}`, backgroundColor: C.bgCard }}>
                          {/* Search */}
                          <div className="flex items-center gap-[10px] px-[16px] py-[12px]" style={{ borderBottom: `1px solid ${C.border}` }}>
                            <Search className="h-[15px] w-[15px] shrink-0" style={{ color: C.textMuted }} strokeWidth={1.6} />
                            <input type="text" placeholder="Search history" className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[13px]" style={{ color: C.text }} />
                          </div>
                          {/* Column headers */}
                          <div className="flex items-center px-[16px] py-[10px]" style={{ color: C.textMuted, fontSize: 12, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>
                            <span className="flex-1">Name</span>
                            <span className="w-[80px] text-right">Duration</span>
                            <span className="w-[80px] text-right">Format</span>
                            <span className="w-[72px]" />
                          </div>
                          {/* Rows */}
                          {HISTORY.map((item, i) => (
                            <motion.div key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.03 * i }}
                              className="flex items-center px-[16px] py-[14px] transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                              style={i < HISTORY.length - 1 ? { borderBottom: `1px solid ${C.border}` } : undefined}
                              onClick={() => setExpandedFile(item.id)}>
                              <div className="flex items-center gap-[12px] flex-1 min-w-0">
                                <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[8px] shrink-0" style={{ backgroundColor: C.bgHover }}>
                                  <AudioLines className="h-[15px] w-[15px]" style={{ color: C.textMuted }} strokeWidth={1.4} />
                                </div>
                                <div className="min-w-0">
                                  <p style={{ fontSize: 14, fontWeight: 500, color: C.text }} className="truncate">{item.name}</p>
                                  <p style={{ fontSize: 13, color: C.textMuted, marginTop: 1 }}>{item.date}</p>
                                </div>
                              </div>
                              <span className="w-[80px] text-right" style={{ fontSize: 14, color: C.textMuted }}>{item.duration}</span>
                              <span className="w-[80px] text-right" style={{ fontSize: 14, color: C.textMuted }}>{item.format}</span>
                              <div className="flex items-center justify-end gap-[2px] w-[72px]">
                                <button onClick={(e) => e.stopPropagation()} className="p-[5px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                  <Download className="h-[14px] w-[14px]" style={{ color: C.textMuted }} strokeWidth={1.5} />
                                </button>
                                <button onClick={(e) => e.stopPropagation()} className="p-[5px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                  <Trash2 className="h-[14px] w-[14px]" style={{ color: C.textMuted }} strokeWidth={1.5} />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>

                      {/* Stem detail modal — Recent splits */}
                      <AnimatePresence>
                        {expandedFile && (() => {
                          const currentItem = HISTORY.find(h => h.id === expandedFile);
                          if (!currentItem) return null;
                          const currentIdx = HISTORY.findIndex(h => h.id === expandedFile);
                          const prevItem = currentIdx > 0 ? HISTORY[currentIdx - 1] : null;
                          const nextItem = currentIdx < HISTORY.length - 1 ? HISTORY[currentIdx + 1] : null;

                          return (
                            <motion.div key="recent-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                              className="fixed inset-0 z-50 flex items-center justify-center"
                              onClick={() => setExpandedFile(null)}>
                              <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} />
                              {prevItem && (
                                <button onClick={(e) => { e.stopPropagation(); setExpandedFile(prevItem.id); setPlayingStem(null); }}
                                  className="absolute left-[24px] z-10 flex h-[40px] w-[40px] items-center justify-center rounded-full transition-colors hover:bg-white/10"
                                  style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                                  <ChevronLeft className="h-[18px] w-[18px] text-white" strokeWidth={1.8} />
                                </button>
                              )}
                              {nextItem && (
                                <button onClick={(e) => { e.stopPropagation(); setExpandedFile(nextItem.id); setPlayingStem(null); }}
                                  className="absolute right-[24px] z-10 flex h-[40px] w-[40px] items-center justify-center rounded-full transition-colors hover:bg-white/10"
                                  style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                                  <ChevronRight className="h-[18px] w-[18px] text-white" strokeWidth={1.8} />
                                </button>
                              )}
                              <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                transition={{ duration: 0.15 }}
                                className="relative rounded-[16px] w-[720px] max-h-[85vh] overflow-y-auto"
                                style={{ backgroundColor: C.bgCard, border: `1px solid ${C.border}` }}
                                onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-between px-[24px] py-[18px]" style={{ borderBottom: `1px solid ${C.border}` }}>
                                  <div className="flex items-center gap-[14px] min-w-0">
                                    <div className="flex h-[40px] w-[40px] items-center justify-center rounded-[10px] shrink-0" style={{ backgroundColor: C.bgHover }}>
                                      <AudioLines className="h-[16px] w-[16px]" style={{ color: C.textMuted }} strokeWidth={1.4} />
                                    </div>
                                    <div className="min-w-0">
                                      <p style={{ fontSize: 15, fontWeight: 600, color: C.text }} className="truncate">{currentItem.name}</p>
                                      <p style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
                                        {currentItem.date} · {currentItem.duration} · {currentItem.bpm} BPM · {currentItem.key} · {currentItem.format.toUpperCase()}
                                      </p>
                                    </div>
                                  </div>
                                  <button onClick={() => setExpandedFile(null)} className="p-[6px] rounded-[8px] transition-colors hover:bg-black/5 dark:hover:bg-white/5 shrink-0 ml-[12px]">
                                    <X className="h-[16px] w-[16px]" style={{ color: C.textMuted }} strokeWidth={1.6} />
                                  </button>
                                </div>
                                <div className="px-[16px] py-[12px] space-y-[4px]">
                                  {currentItem.stemList.map((stem, si) => {
                                    const stemKey = `${currentItem.id}:${stem}`;
                                    const isPlayingThis = playingStem === stemKey;
                                    const color = STEM_ICON_COLORS[stem] || "#949494";
                                    return (
                                      <motion.div key={stem} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * si }}
                                        className="flex items-center gap-[10px] rounded-[12px] px-[14px] py-[12px] transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                        <button onClick={() => setPlayingStem(isPlayingThis ? null : stemKey)}
                                          className="flex h-[32px] w-[32px] items-center justify-center rounded-full shrink-0 transition-transform hover:scale-105 active:scale-95"
                                          style={{ backgroundColor: color }}>
                                          {isPlayingThis
                                            ? <Pause className="h-[11px] w-[11px] text-white" />
                                            : <Play className="h-[11px] w-[11px] text-white ml-[1px]" />}
                                        </button>
                                        <div className="w-[80px] shrink-0">
                                          <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{STEM_LABELS[stem] || stem}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <Waveform seed={(si + 1) * 3571 + parseInt(currentItem.id) * 7919} color={color} playedColor={color} progress={isPlayingThis ? 0.35 : 0} height={32} onSeek={() => {}} barCount={100} />
                                        </div>
                                        <button className="p-[6px] rounded-[8px] transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                          <Download className="h-[14px] w-[14px]" style={{ color: C.textMuted }} strokeWidth={1.5} />
                                        </button>
                                      </motion.div>
                                    );
                                  })}
                                </div>
                                <div className="flex items-center justify-between px-[24px] py-[14px]" style={{ borderTop: `1px solid ${C.border}` }}>
                                  <span style={{ fontSize: 13, color: C.textMuted }}>{currentIdx + 1} / {HISTORY.length}</span>
                                  <button className="flex items-center gap-[6px] rounded-[10px] px-[14px] py-[8px] text-white transition-opacity hover:opacity-90"
                                    style={{ fontSize: 14, fontWeight: 600, backgroundColor: C.text }}>
                                    <Download className="h-[13px] w-[13px]" strokeWidth={1.8} /> Download all stems
                                  </button>
                                </div>
                              </motion.div>
                            </motion.div>
                          );
                        })()}
                      </AnimatePresence>
                    </div>
                  </div>
                )}

                {appState === "processing" && (
                  <div className="flex flex-1">
                    <ProcessingView progress={progress} stage={stage} isDark={isDark} />
                  </div>
                )}

                {appState === "complete" && (
                  <ResultsView
                    stemNames={STEM_MAP[stemCount]}
                    duration={214}
                    fileName={file?.name || "Unknown"}
                    onNewSplit={handleNewSplit}
                    isDark={isDark}
                  />
                )}
              </>
            )}

            {sidebarView === "files" && (() => {
              // Sort
              const toggleSort = (col: typeof sortBy) => {
                if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
                else { setSortBy(col); setSortDir("asc"); }
              };
              const SortIcon = ({ col }: { col: typeof sortBy }) => (
                <ArrowUpDown className="inline h-[10px] w-[10px] ml-[3px]" strokeWidth={1.8}
                  style={{ opacity: sortBy === col ? 1 : 0.4, transform: sortBy === col && sortDir === "desc" ? "scaleY(-1)" : undefined }} />
              );

              // Parse duration to seconds for sorting
              const durToSec = (d: string) => {
                const m = d.match(/(\d+)m\s*(\d+)s/);
                return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0;
              };

              // Filter + sort
              const searched = HISTORY.filter(item =>
                !fileSearch || item.name.toLowerCase().includes(fileSearch.toLowerCase())
              );
              const sorted = [...searched].sort((a, b) => {
                let cmp = 0;
                switch (sortBy) {
                  case "name": cmp = a.name.localeCompare(b.name); break;
                  case "duration": cmp = durToSec(a.duration) - durToSec(b.duration); break;
                  case "format": cmp = a.format.localeCompare(b.format); break;
                  case "bpm": cmp = a.bpm - b.bpm; break;
                  case "key": cmp = a.key.localeCompare(b.key); break;
                  default: cmp = 0;
                }
                return sortDir === "asc" ? cmp : -cmp;
              });

              // Track selection helpers
              const allTrackIds = sorted.map(h => h.id);
              const allTracksSelected = allTrackIds.length > 0 && allTrackIds.every(id => selectedTracks.has(id));
              const someTracksSelected = selectedTracks.size > 0;

              const toggleTrack = (id: string) => setSelectedTracks(prev => {
                const next = new Set(prev);
                next.has(id) ? next.delete(id) : next.add(id);
                return next;
              });
              const toggleAllTracks = () => {
                if (allTracksSelected) setSelectedTracks(new Set());
                else setSelectedTracks(new Set(allTrackIds));
              };

              // Export stem selection helpers
              const allStemTypes = Array.from(new Set(sorted.filter(h => selectedTracks.has(h.id)).flatMap(h => h.stemList)));
              const toggleExportStem = (stem: string) => setSelectedStems(prev => {
                const next = new Set(prev);
                next.has(stem) ? next.delete(stem) : next.add(stem);
                return next;
              });
              const allStemsSelected = allStemTypes.length > 0 && allStemTypes.every(s => selectedStems.has(s));
              const toggleAllStems = () => {
                if (allStemsSelected) setSelectedStems(new Set());
                else setSelectedStems(new Set(allStemTypes));
              };

              const exitExport = () => { setExportMode(false); setSelectedTracks(new Set()); setSelectedStems(new Set()); setExportStemPicker(false); };

              return (
                <>
                <div className="px-[32px] pt-[24px] pb-[40px]">
                  <div style={{ maxWidth: 900, margin: "0 auto" }}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-[20px]">
                      <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: C.text }}>My Files</h2>
                      <div className="flex items-center gap-[8px]">
                        {exportMode && (
                          <button onClick={exitExport}
                            className="rounded-[10px] px-[14px] py-[8px] transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ fontSize: 14, fontWeight: 500, color: C.textMuted }}>
                            Cancel
                          </button>
                        )}
                        <button onClick={() => {
                          if (exportMode) {
                            if (selectedTracks.size > 0) setExportStemPicker(true);
                          } else {
                            setExportMode(true);
                          }
                        }}
                          className="flex items-center gap-[6px] rounded-[10px] px-[14px] py-[8px] transition-colors"
                          style={{
                            fontSize: 14, fontWeight: 500,
                            color: exportMode && selectedTracks.size > 0 ? "#fff" : exportMode ? C.textLight : C.textSec,
                            backgroundColor: exportMode && selectedTracks.size > 0 ? C.text : undefined,
                            border: exportMode && selectedTracks.size > 0 ? undefined : `1px solid ${C.border}`,
                            cursor: exportMode && selectedTracks.size === 0 ? "not-allowed" : "pointer",
                          }}>
                          <Download className="h-[14px] w-[14px]" strokeWidth={1.6} />
                          {exportMode ? `Export${selectedTracks.size > 0 ? ` (${selectedTracks.size})` : ""}` : "Export"}
                        </button>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="rounded-[14px] overflow-hidden" style={{ border: `1px solid ${C.border}`, backgroundColor: C.bgCard }}>
                      {/* Search */}
                      <div className="flex items-center gap-[10px] px-[16px] py-[12px]" style={{ borderBottom: `1px solid ${C.border}` }}>
                        <Search className="h-[15px] w-[15px] shrink-0" style={{ color: C.textMuted }} strokeWidth={1.6} />
                        <input type="text" value={fileSearch} onChange={e => setFileSearch(e.target.value)}
                          placeholder="Search files" className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[13px]" style={{ color: C.text }} />
                      </div>
                      {/* Column headers — sortable */}
                      <div className="flex items-center px-[16px] py-[10px] select-none" style={{ color: C.textMuted, fontSize: 12, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>
                        {exportMode && (
                          <button onClick={toggleAllTracks} className="w-[28px] shrink-0 flex items-center">
                            {allTracksSelected
                              ? <SquareCheckBig className="h-[13px] w-[13px]" style={{ color: C.text }} strokeWidth={1.8} />
                              : <Square className="h-[13px] w-[13px]" strokeWidth={1.6} />}
                          </button>
                        )}
                        <button onClick={() => toggleSort("name")} className="flex-1 text-left flex items-center cursor-pointer hover:opacity-80">
                          Name <SortIcon col="name" />
                        </button>
                        <button onClick={() => toggleSort("bpm")} className="w-[60px] text-right flex items-center justify-end cursor-pointer hover:opacity-80">
                          BPM <SortIcon col="bpm" />
                        </button>
                        <button onClick={() => toggleSort("key")} className="w-[50px] text-right flex items-center justify-end cursor-pointer hover:opacity-80">
                          Key <SortIcon col="key" />
                        </button>
                        <button onClick={() => toggleSort("duration")} className="w-[80px] text-right flex items-center justify-end cursor-pointer hover:opacity-80">
                          Duration <SortIcon col="duration" />
                        </button>
                        <button onClick={() => toggleSort("format")} className="w-[60px] text-right flex items-center justify-end cursor-pointer hover:opacity-80">
                          Format <SortIcon col="format" />
                        </button>
                        <span className="w-[72px]" />
                      </div>
                      {/* Rows */}
                      {sorted.map((item, i) => {
                        const isTrackSelected = selectedTracks.has(item.id);
                        return (
                          <div key={item.id} style={i < sorted.length - 1 ? { borderBottom: `1px solid ${C.border}` } : undefined}>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.03 * i }}
                              className="flex items-center px-[16px] py-[14px] transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                              onClick={() => exportMode ? toggleTrack(item.id) : setExpandedFile(item.id)}>
                              {exportMode && (
                                <button onClick={(e) => { e.stopPropagation(); toggleTrack(item.id); }} className="w-[28px] shrink-0 flex items-center">
                                  {isTrackSelected
                                    ? <SquareCheckBig className="h-[14px] w-[14px]" style={{ color: C.text }} strokeWidth={1.8} />
                                    : <Square className="h-[14px] w-[14px]" style={{ color: C.textLight }} strokeWidth={1.6} />}
                                </button>
                              )}
                              <div className="flex items-center gap-[12px] flex-1 min-w-0">
                                <div className="flex h-[36px] w-[36px] items-center justify-center rounded-[8px] shrink-0" style={{ backgroundColor: C.bgHover }}>
                                  <AudioLines className="h-[15px] w-[15px]" style={{ color: C.textMuted }} strokeWidth={1.4} />
                                </div>
                                <div className="min-w-0">
                                  <p style={{ fontSize: 14, fontWeight: 500, color: C.text }} className="truncate">{item.name}</p>
                                  <p style={{ fontSize: 13, color: C.textMuted, marginTop: 1 }}>{item.date} · {item.stems} stems</p>
                                </div>
                              </div>
                              <span className="w-[60px] text-right" style={{ fontSize: 13, color: C.textMuted }}>{item.bpm}</span>
                              <span className="w-[50px] text-right" style={{ fontSize: 13, color: C.textMuted }}>{item.key}</span>
                              <span className="w-[80px] text-right" style={{ fontSize: 14, color: C.textMuted }}>{item.duration}</span>
                              <span className="w-[60px] text-right" style={{ fontSize: 14, color: C.textMuted }}>{item.format}</span>
                              <div className="flex items-center justify-end gap-[2px] w-[72px]">
                                <button onClick={(e) => e.stopPropagation()} className="p-[5px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                  <Download className="h-[14px] w-[14px]" style={{ color: C.textMuted }} strokeWidth={1.5} />
                                </button>
                                <button onClick={(e) => e.stopPropagation()} className="p-[5px] rounded-[6px] transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                  <Trash2 className="h-[14px] w-[14px]" style={{ color: C.textMuted }} strokeWidth={1.5} />
                                </button>
                              </div>
                            </motion.div>

                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Export stem picker modal */}
                <AnimatePresence>
                  {exportStemPicker && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      className="fixed inset-0 z-50 flex items-center justify-center"
                      onClick={() => setExportStemPicker(false)}>
                      <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
                      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        className="relative rounded-[16px] w-[400px] overflow-hidden"
                        style={{ backgroundColor: C.bgCard, border: `1px solid ${C.border}` }}
                        onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-[20px] py-[16px]" style={{ borderBottom: `1px solid ${C.border}` }}>
                          <div>
                            <p style={{ fontSize: 15, fontWeight: 600, color: C.text }}>Export stems</p>
                            <p style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{selectedTracks.size} track{selectedTracks.size > 1 ? "s" : ""} selected</p>
                          </div>
                          <button onClick={() => setExportStemPicker(false)} className="p-[6px] rounded-[8px] transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                            <X className="h-[16px] w-[16px]" style={{ color: C.textMuted }} strokeWidth={1.6} />
                          </button>
                        </div>
                        {/* Stem checkboxes */}
                        <div className="px-[20px] py-[16px] space-y-[2px]">
                          {/* Select all */}
                          <button onClick={toggleAllStems}
                            className="flex w-full items-center gap-[10px] rounded-[10px] px-[12px] py-[10px] transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ marginBottom: 4 }}>
                            {allStemsSelected
                              ? <SquareCheckBig className="h-[15px] w-[15px]" style={{ color: C.text }} strokeWidth={1.8} />
                              : <Square className="h-[15px] w-[15px]" style={{ color: C.textLight }} strokeWidth={1.6} />}
                            <span style={{ fontSize: 14, fontWeight: 600, color: C.text }}>All stems</span>
                          </button>
                          {allStemTypes.map(stem => {
                            const color = STEM_ICON_COLORS[stem] || "#949494";
                            const isChecked = selectedStems.has(stem);
                            return (
                              <button key={stem} onClick={() => toggleExportStem(stem)}
                                className="flex w-full items-center gap-[10px] rounded-[10px] px-[12px] py-[10px] transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                {isChecked
                                  ? <SquareCheckBig className="h-[15px] w-[15px]" style={{ color: C.text }} strokeWidth={1.8} />
                                  : <Square className="h-[15px] w-[15px]" style={{ color: C.textLight }} strokeWidth={1.6} />}
                                <div className="h-[8px] w-[8px] rounded-full shrink-0" style={{ backgroundColor: color }} />
                                <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{STEM_LABELS[stem] || stem}</span>
                              </button>
                            );
                          })}
                        </div>
                        {/* Footer */}
                        <div className="flex items-center justify-end gap-[8px] px-[20px] py-[14px]" style={{ borderTop: `1px solid ${C.border}` }}>
                          <button onClick={() => setExportStemPicker(false)}
                            className="rounded-[10px] px-[16px] py-[8px] transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                            style={{ fontSize: 14, fontWeight: 500, color: C.textSec }}>
                            Cancel
                          </button>
                          <button onClick={() => { setExportStemPicker(false); exitExport(); }}
                            disabled={selectedStems.size === 0}
                            className="rounded-[10px] px-[16px] py-[8px] text-white transition-all disabled:opacity-30"
                            style={{ fontSize: 14, fontWeight: 600, backgroundColor: C.text }}>
                            Download {selectedStems.size > 0 ? `${selectedTracks.size * selectedStems.size} files` : ""}
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Stem detail modal */}
                <AnimatePresence>
                  {expandedFile && (() => {
                    const currentItem = sorted.find(h => h.id === expandedFile);
                    if (!currentItem) return null;
                    const currentIdx = sorted.findIndex(h => h.id === expandedFile);
                    const prevItem = currentIdx > 0 ? sorted[currentIdx - 1] : null;
                    const nextItem = currentIdx < sorted.length - 1 ? sorted[currentIdx + 1] : null;

                    return (
                      <motion.div key="stem-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        onClick={() => setExpandedFile(null)}>
                        <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} />

                        {/* Nav left */}
                        {prevItem && (
                          <button onClick={(e) => { e.stopPropagation(); setExpandedFile(prevItem.id); setPlayingStem(null); }}
                            className="absolute left-[24px] z-10 flex h-[40px] w-[40px] items-center justify-center rounded-full transition-colors hover:bg-white/10"
                            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                            <ChevronLeft className="h-[18px] w-[18px] text-white" strokeWidth={1.8} />
                          </button>
                        )}
                        {/* Nav right */}
                        {nextItem && (
                          <button onClick={(e) => { e.stopPropagation(); setExpandedFile(nextItem.id); setPlayingStem(null); }}
                            className="absolute right-[24px] z-10 flex h-[40px] w-[40px] items-center justify-center rounded-full transition-colors hover:bg-white/10"
                            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
                            <ChevronRight className="h-[18px] w-[18px] text-white" strokeWidth={1.8} />
                          </button>
                        )}

                        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          transition={{ duration: 0.15 }}
                          className="relative rounded-[16px] w-[720px] max-h-[85vh] overflow-y-auto"
                          style={{ backgroundColor: C.bgCard, border: `1px solid ${C.border}` }}
                          onClick={e => e.stopPropagation()}>

                          {/* Header */}
                          <div className="flex items-center justify-between px-[24px] py-[18px]" style={{ borderBottom: `1px solid ${C.border}` }}>
                            <div className="flex items-center gap-[14px] min-w-0">
                              <div className="flex h-[40px] w-[40px] items-center justify-center rounded-[10px] shrink-0" style={{ backgroundColor: C.bgHover }}>
                                <AudioLines className="h-[16px] w-[16px]" style={{ color: C.textMuted }} strokeWidth={1.4} />
                              </div>
                              <div className="min-w-0">
                                <p style={{ fontSize: 15, fontWeight: 600, color: C.text }} className="truncate">{currentItem.name}</p>
                                <p style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
                                  {currentItem.date} · {currentItem.duration} · {currentItem.bpm} BPM · {currentItem.key} · {currentItem.format.toUpperCase()}
                                </p>
                              </div>
                            </div>
                            <button onClick={() => setExpandedFile(null)} className="p-[6px] rounded-[8px] transition-colors hover:bg-black/5 dark:hover:bg-white/5 shrink-0 ml-[12px]">
                              <X className="h-[16px] w-[16px]" style={{ color: C.textMuted }} strokeWidth={1.6} />
                            </button>
                          </div>

                          {/* Stems */}
                          <div className="px-[16px] py-[12px] space-y-[4px]">
                            {currentItem.stemList.map((stem, si) => {
                              const stemKey = `${currentItem.id}:${stem}`;
                              const isPlayingThis = playingStem === stemKey;
                              const color = STEM_ICON_COLORS[stem] || "#949494";
                              return (
                                <motion.div key={stem} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * si }}
                                  className="flex items-center gap-[10px] rounded-[12px] px-[14px] py-[12px] transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                  <button onClick={() => setPlayingStem(isPlayingThis ? null : stemKey)}
                                    className="flex h-[32px] w-[32px] items-center justify-center rounded-full shrink-0 transition-transform hover:scale-105 active:scale-95"
                                    style={{ backgroundColor: color }}>
                                    {isPlayingThis
                                      ? <Pause className="h-[11px] w-[11px] text-white" />
                                      : <Play className="h-[11px] w-[11px] text-white ml-[1px]" />}
                                  </button>
                                  <div className="w-[80px] shrink-0">
                                    <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{STEM_LABELS[stem] || stem}</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <Waveform seed={(si + 1) * 3571 + parseInt(currentItem.id) * 7919} color={color} playedColor={color} progress={isPlayingThis ? 0.35 : 0} height={32} onSeek={() => {}} barCount={100} />
                                  </div>
                                  <button className="p-[6px] rounded-[8px] transition-colors hover:bg-black/5 dark:hover:bg-white/5">
                                    <Download className="h-[14px] w-[14px]" style={{ color: C.textMuted }} strokeWidth={1.5} />
                                  </button>
                                </motion.div>
                              );
                            })}
                          </div>

                          {/* Footer */}
                          <div className="flex items-center justify-between px-[24px] py-[14px]" style={{ borderTop: `1px solid ${C.border}` }}>
                            <span style={{ fontSize: 13, color: C.textMuted }}>{currentIdx + 1} / {sorted.length}</span>
                            <button className="flex items-center gap-[6px] rounded-[10px] px-[14px] py-[8px] text-white transition-opacity hover:opacity-90"
                              style={{ fontSize: 14, fontWeight: 600, backgroundColor: C.text }}>
                              <Download className="h-[13px] w-[13px]" strokeWidth={1.8} /> Download all stems
                            </button>
                          </div>
                        </motion.div>
                      </motion.div>
                    );
                  })()}
                </AnimatePresence>
                </>
              );
            })()}

            {sidebarView === "stats" && (() => {
              // Compute stats from HISTORY
              const totalTracks = HISTORY.length;
              const totalStems = HISTORY.reduce((acc, h) => acc + h.stemList.length, 0);
              const totalMinutes = HISTORY.reduce((acc, h) => {
                const m = h.duration.match(/(\d+)m\s*(\d+)s/);
                return acc + (m ? parseInt(m[1]) + parseInt(m[2]) / 60 : 0);
              }, 0);

              // Most used format
              const formatCounts: Record<string, number> = {};
              HISTORY.forEach(h => { formatCounts[h.format] = (formatCounts[h.format] || 0) + 1; });
              const topFormat = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0];

              // Most common stem
              const stemCounts: Record<string, number> = {};
              HISTORY.forEach(h => h.stemList.forEach(s => { stemCounts[s] = (stemCounts[s] || 0) + 1; }));
              const topStem = Object.entries(stemCounts).sort((a, b) => b[1] - a[1])[0];

              // Average BPM
              const avgBpm = Math.round(HISTORY.reduce((acc, h) => acc + h.bpm, 0) / totalTracks);

              // Most common key
              const keyCounts: Record<string, number> = {};
              HISTORY.forEach(h => { keyCounts[h.key] = (keyCounts[h.key] || 0) + 1; });
              const topKey = Object.entries(keyCounts).sort((a, b) => b[1] - a[1])[0];

              // Most used stem count
              const stemCountCounts: Record<number, number> = {};
              HISTORY.forEach(h => { stemCountCounts[h.stems] = (stemCountCounts[h.stems] || 0) + 1; });
              const topStemCount = Object.entries(stemCountCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];

              // Stem distribution for bar chart
              const stemDistribution = Object.entries(stemCounts).sort((a, b) => b[1] - a[1]);
              const maxStemCount = stemDistribution[0]?.[1] || 1;

              const stats = [
                { label: "Total tracks split", value: totalTracks.toString(), sub: "all time" },
                { label: "Total stems generated", value: totalStems.toString(), sub: `across ${totalTracks} tracks` },
                { label: "Minutes processed", value: totalMinutes.toFixed(1), sub: "of audio" },
                { label: "Average BPM", value: avgBpm.toString(), sub: "across all tracks" },
                { label: "Top format", value: topFormat?.[0]?.toUpperCase() || "—", sub: `${topFormat?.[1] || 0} tracks` },
                { label: "Top key", value: topKey?.[0] || "—", sub: `${topKey?.[1] || 0} tracks` },
                { label: "Most exported stem", value: STEM_LABELS[topStem?.[0]] || "—", sub: `${topStem?.[1] || 0} times` },
                { label: "Preferred split", value: `${topStemCount?.[0] || "—"} stems`, sub: `${topStemCount?.[1] || 0} tracks` },
              ];

              return (
                <div className="px-[32px] pt-[24px] pb-[40px] overflow-y-auto">
                  <div style={{ maxWidth: 900, margin: "0 auto" }}>
                    <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: C.text, marginBottom: 24 }}>Statistics</h2>

                    {/* Stat cards grid */}
                    <div className="grid grid-cols-4 gap-[12px] mb-[32px]">
                      {stats.map((stat, i) => (
                        <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}
                          className="rounded-[14px] px-[18px] py-[16px]"
                          style={{ border: `1px solid ${C.border}`, backgroundColor: C.bgCard }}>
                          <p style={{ fontSize: 12, fontWeight: 500, color: C.textMuted, letterSpacing: "0.03em", textTransform: "uppercase" }}>{stat.label}</p>
                          <p style={{ fontSize: 28, fontWeight: 700, color: C.text, marginTop: 6, letterSpacing: "-0.02em" }}>{stat.value}</p>
                          <p style={{ fontSize: 12, color: C.textLight, marginTop: 2 }}>{stat.sub}</p>
                        </motion.div>
                      ))}
                    </div>

                    {/* Stem distribution */}
                    <div className="rounded-[14px] overflow-hidden mb-[20px]" style={{ border: `1px solid ${C.border}`, backgroundColor: C.bgCard }}>
                      <div className="px-[20px] py-[14px]" style={{ borderBottom: `1px solid ${C.border}` }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Stem distribution</p>
                      </div>
                      <div className="px-[20px] py-[16px] space-y-[10px]">
                        {stemDistribution.map(([stem, count]) => {
                          const color = STEM_ICON_COLORS[stem] || "#949494";
                          return (
                            <div key={stem} className="flex items-center gap-[12px]">
                              <span className="w-[80px] shrink-0" style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{STEM_LABELS[stem] || stem}</span>
                              <div className="flex-1 h-[8px] rounded-full overflow-hidden" style={{ backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }}>
                                <motion.div initial={{ width: 0 }} animate={{ width: `${(count / maxStemCount) * 100}%` }}
                                  transition={{ duration: 0.6, delay: 0.1 }}
                                  className="h-full rounded-full" style={{ backgroundColor: color }} />
                              </div>
                              <span className="w-[24px] text-right" style={{ fontSize: 13, color: C.textMuted }}>{count}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Format breakdown */}
                    <div className="rounded-[14px] overflow-hidden" style={{ border: `1px solid ${C.border}`, backgroundColor: C.bgCard }}>
                      <div className="px-[20px] py-[14px]" style={{ borderBottom: `1px solid ${C.border}` }}>
                        <p style={{ fontSize: 14, fontWeight: 600, color: C.text }}>Format breakdown</p>
                      </div>
                      <div className="px-[20px] py-[16px] flex items-center gap-[24px]">
                        {Object.entries(formatCounts).sort((a, b) => b[1] - a[1]).map(([fmt, count]) => {
                          const pct = Math.round((count / totalTracks) * 100);
                          return (
                            <div key={fmt} className="flex flex-col items-center gap-[6px]">
                              <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
                                <svg width="64" height="64" viewBox="0 0 64 64">
                                  <circle cx="32" cy="32" r="28" fill="none" stroke={isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"} strokeWidth="4" />
                                  <motion.circle cx="32" cy="32" r="28" fill="none" stroke={C.accent} strokeWidth="4"
                                    strokeDasharray={`${2 * Math.PI * 28}`}
                                    initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                                    animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - pct / 100) }}
                                    transition={{ duration: 0.8, delay: 0.2 }}
                                    strokeLinecap="round" transform="rotate(-90 32 32)" />
                                </svg>
                                <span className="absolute" style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{pct}%</span>
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 600, color: C.textSec }}>{fmt.toUpperCase()}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {sidebarView === "games" && (
                <div className="flex flex-1 flex-col overflow-y-auto px-[32px] pt-[24px] pb-[40px]">
                  <div style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
                    <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: C.text, marginBottom: 6 }}>Games</h2>
                    <p style={{ fontSize: 14, color: C.textMuted, marginBottom: 24 }}>Take a break between splits</p>

                    {activeGame === "" ? (
                      /* Game grid hub */
                      <div className="grid grid-cols-2 gap-[12px]" style={{ maxWidth: 520 }}>
                        {[
                          { id: "bpm", name: "BPM Tap", desc: "Tap the tempo of famous tracks", emoji: "🎯", available: true },
                          { id: "tomato", name: "Tomato Toss", desc: "Throw tomatoes at a bad DJ", emoji: "🍅", available: true },
                          { id: "mpc", name: "MPC Pad", desc: "Play beats on a drum machine", emoji: "🥁", available: true },
                          { id: "melody", name: "Melody Memory", desc: "Replay melodies from memory", emoji: "🎹", available: true },
                          { id: "freq", name: "Frequency Quiz", desc: "Guess the frequency of a tone", emoji: "📡", available: true },
                          { id: "stem", name: "Guess The Stem", desc: "Which stem is playing?", emoji: "🎧", available: true },
                        ].map(g => (
                          <button
                            key={g.id}
                            onClick={() => g.available && setActiveGame(g.id)}
                            className="relative rounded-[12px] p-[20px] text-left transition-all"
                            style={{
                              backgroundColor: C.bgHover,
                              border: `1px solid ${C.border}`,
                              opacity: g.available ? 1 : 0.5,
                              cursor: g.available ? "pointer" : "default",
                            }}
                          >
                            <span style={{ fontSize: 28 }}>{g.emoji}</span>
                            <p style={{ fontSize: 15, fontWeight: 600, color: C.text, marginTop: 10 }}>{g.name}</p>
                            <p style={{ fontSize: 12, color: C.textMuted, marginTop: 4, lineHeight: 1.4 }}>{g.desc}</p>
                            {!g.available && (
                              <span className="absolute top-[12px] right-[12px] rounded-full px-[8px] py-[2px]"
                                style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)" }}>
                                Soon
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    ) : (
                      /* Active game */
                      <div>
                        <button onClick={() => setActiveGame("")}
                          className="flex items-center gap-[6px] mb-[20px] rounded-[8px] px-[12px] py-[6px] transition-colors"
                          style={{ fontSize: 13, fontWeight: 500, color: C.textMuted, border: `1px solid ${C.border}` }}>
                          <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={1.8} />
                          All games
                        </button>
                        {activeGame === "bpm" && <BpmTap isDark={isDark} />}
                        {activeGame === "tomato" && <TomatoToss isDark={isDark} />}
                        {activeGame === "mpc" && <MpcPad isDark={isDark} />}
                        {activeGame === "melody" && <MelodyMemory isDark={isDark} />}
                        {activeGame === "freq" && <FrequencyQuiz isDark={isDark} />}
                        {activeGame === "stem" && <GuessTheStem isDark={isDark} />}
                      </div>
                    )}
                  </div>
                </div>
            )}

            {sidebarView === "settings" && (
              <div className="px-[32px] pt-[24px] pb-[40px]">
                <div style={{ maxWidth: 900, margin: "0 auto" }}>
                  <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: C.text, marginBottom: 24 }}>Settings</h2>
                  <div className="flex flex-col items-center justify-center py-[80px]">
                    <div className="flex h-[48px] w-[48px] items-center justify-center rounded-[12px]" style={{ backgroundColor: C.bgHover }}>
                      <Settings2 className="h-[22px] w-[22px]" style={{ color: C.textMuted }} strokeWidth={1.5} />
                    </div>
                    <p style={{ fontSize: 14, color: C.textMuted, marginTop: 12 }}>Account settings coming soon</p>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

function TopBarPill({ label, theme }: { label: string; theme: typeof themes.dark | typeof themes.light }) {
  return (
    <button
      style={{ border: `1px solid ${theme.border}`, color: theme.topBarPillText }}
      className="rounded-full px-[14px] py-[6px] text-[13px] font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
    >
      {label}
    </button>
  );
}
