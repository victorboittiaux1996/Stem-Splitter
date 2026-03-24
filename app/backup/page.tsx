"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileUp, FileAudio, X, Mic, Play, Pause, Download, SkipBack, Trash2,
  RotateCcw, Scissors, FolderOpen, Settings2, Home, Sparkles,
  ChevronRight, ChevronDown, Loader2, Mic2, Music,
  Waves, Search, Upload, Zap, AudioLines,
} from "lucide-react";
import { toast } from "sonner";
import { Waveform } from "@/components/dashboard/waveform";

// ─── Types ───────────────────────────────────────────────────
type AppState = "idle" | "file-selected" | "processing" | "complete";
type StemCount = 2 | 4 | 6;
type SidebarView = "split" | "files" | "settings";
type LayoutVariant = "v1a" | "v1b" | "v1c";

const STEM_MAP: Record<StemCount, string[]> = {
  2: ["vocals", "instrumental"],
  4: ["vocals", "drums", "bass", "other"],
  6: ["vocals", "drums", "bass", "guitar", "piano", "other"],
};

const STEM_COLORS: Record<string, { label: string; color: string; played: string }> = {
  vocals: { label: "Vocals", color: "#8B5CF6", played: "#7C3AED" },
  drums: { label: "Drums", color: "#F59E0B", played: "#D97706" },
  bass: { label: "Bass", color: "#10B981", played: "#059669" },
  guitar: { label: "Guitar", color: "#F97316", played: "#EA580C" },
  piano: { label: "Piano", color: "#0EA5E9", played: "#0284C7" },
  other: { label: "Other", color: "#EE575A", played: "#DC2626" },
  instrumental: { label: "Instrumental", color: "#6366F1", played: "#4F46E5" },
};

const STAGES = [
  "Uploading audio...", "Analyzing waveform...",
  "Separating vocals with MelBand RoFormer...",
  "Separating instruments with BS-RoFormer...",
  "Finalizing stems...",
];

const ACCEPTED = /\.(mp3|wav|flac|ogg|m4a|aac)$/i;
const MAX_SIZE = 50 * 1024 * 1024;

const STEM_OPTIONS: { value: StemCount; label: string; desc: string; icon: typeof Mic2 }[] = [
  { value: 2, label: "2 Stems", desc: "Vocals + Instrumental", icon: Mic2 },
  { value: 4, label: "4 Stems", desc: "Vocals, Drums, Bass, Other", icon: Music },
  { value: 6, label: "6 Stems", desc: "All instruments separated", icon: Waves },
];

// ─── Design tokens ──────────────────────────────────────────
const C = {
  bg: "#F7F6F6",
  card: "#FFFFFF",
  border: "#E8E7E7",
  text: "#1A1A1A",
  textSec: "#6B6B73",
  textMuted: "#939397",
  textLight: "#B5B5B8",
  accent: "#EE575A",
  hoverBg: "#F0EFEF",
};

// ─── Mock history ───────────────────────────────────────────
const HISTORY = [
  { name: "Baime - Human Needs [BULKMIXMSTRV2]", date: "7 hours ago", stems: 4, duration: "5m 41s", format: "wav", bpm: 128, key: "Am" },
  { name: "summer_vibes_remix", date: "Yesterday", stems: 6, duration: "3m 24s", format: "mp3", bpm: 95, key: "Db" },
  { name: "midnight_drive_v2", date: "3 days ago", stems: 2, duration: "4m 12s", format: "wav", bpm: 140, key: "F#m" },
  { name: "acoustic_demo_final", date: "1 week ago", stems: 4, duration: "2m 58s", format: "flac", bpm: 72, key: "G" },
];

export default function Dashboard() {
  const [variant, setVariant] = useState<LayoutVariant>("v1a");
  const [sidebarView, setSidebarView] = useState<SidebarView>("split");
  const [appState, setAppState] = useState<AppState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [stemCount, setStemCount] = useState<StemCount>(4);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [stemsOpen, setStemsOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const extraRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [soloTrack, setSoloTrack] = useState<string | null>(null);
  const [mutedTracks, setMutedTracks] = useState<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const duration = 214;
  const playProgress = duration > 0 ? currentTime / duration : 0;
  const currentStem = STEM_OPTIONS.find((o) => o.value === stemCount)!;

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); if (playRef.current) clearInterval(playRef.current); }, []);

  useEffect(() => {
    if (!extraOpen) return;
    const handler = (e: MouseEvent) => { if (extraRef.current && !extraRef.current.contains(e.target as Node)) setExtraOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [extraOpen]);

  const handleFile = useCallback((f: File) => {
    if (!ACCEPTED.test(f.name)) { toast.error("Unsupported format"); return; }
    if (f.size > MAX_SIZE) { toast.error("File too large"); return; }
    setFile(f); setAppState("file-selected");
  }, []);

  const handleSplit = useCallback(() => {
    if (!file) return;
    setAppState("processing"); setProgress(0); setStage(STAGES[0]);
    let p = 0, si = 0;
    intervalRef.current = setInterval(() => {
      p += Math.random() * 3 + 1.5;
      if (p >= 100) { setProgress(100); setStage("Complete!"); if (intervalRef.current) clearInterval(intervalRef.current); setTimeout(() => setAppState("complete"), 500); return; }
      setProgress(p);
      const ns = Math.min(STAGES.length - 1, Math.floor(p / (100 / STAGES.length)));
      if (ns !== si) { si = ns; setStage(STAGES[si]); }
    }, 180);
  }, [file]);

  const handleNewSplit = useCallback(() => { setFile(null); setAppState("idle"); setProgress(0); setCurrentTime(0); setIsPlaying(false); }, []);

  const togglePlay = () => {
    if (!isPlaying) {
      playRef.current = setInterval(() => { setCurrentTime(t => { if (t >= duration) { setIsPlaying(false); return 0; } return t + 0.05; }); }, 50);
    } else if (playRef.current) clearInterval(playRef.current);
    setIsPlaying(!isPlaying);
  };
  const seek = (p: number) => setCurrentTime(p * duration);
  const ft = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  const fs = (b: number) => b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  const isUploadState = appState === "idle" || appState === "file-selected";
  const hasRightPanel = false;
  const contentMaxWidth = variant === "v1a" ? "none" : variant === "v1b" ? 1000 : 900;

  return (
    <div className="flex h-screen overflow-hidden font-sans" style={{ backgroundColor: C.bg, color: C.text, fontFamily: "'Aeonik', sans-serif" }}>

      {/* ─── Sidebar ─── */}
      <aside className="flex h-full w-[240px] shrink-0 flex-col" style={{ backgroundColor: C.bg, borderRight: `1px solid ${C.border}` }}>
        <div className="flex items-center gap-[10px] px-[20px] py-[18px]">
          <div className="flex h-[30px] w-[30px] items-center justify-center rounded-[9px]" style={{ backgroundColor: C.text }}>
            <svg className="h-[14px] w-[14px] text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 12v2"/><path d="M6 8v8"/><path d="M10 4v16"/><path d="M14 7v10"/><path d="M18 5v14"/><path d="M22 10v4"/>
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: "-0.03em" }}>44Stems</span>
        </div>

        <nav className="flex-1 px-[10px] pt-[4px] space-y-[1px]">
          <SidebarBtn icon={Home} label="Home" active={false} onClick={() => setSidebarView("split")} />
          <div className="pt-[20px] pb-[6px] px-[12px]">
            <span style={{ fontSize: 12, fontWeight: 500, color: C.textLight, letterSpacing: "0.02em" }}>Pinned</span>
          </div>
          <SidebarBtn icon={Scissors} label="Split Audio" active={sidebarView === "split"} onClick={() => setSidebarView("split")} />
          <SidebarBtn icon={FolderOpen} label="My Files" active={sidebarView === "files"} onClick={() => setSidebarView("files")} />
          <SidebarBtn icon={Settings2} label="Settings" active={sidebarView === "settings"} onClick={() => setSidebarView("settings")} />
        </nav>

        {/* Version switcher */}
        <div className="px-[10px] pb-[8px]">
          <div className="flex items-center rounded-[10px] p-[3px]" style={{ backgroundColor: C.hoverBg }}>
            {(["v1a", "v1b", "v1c"] as const).map(v => (
              <button key={v} onClick={() => { setVariant(v); setStemsOpen(false); }}
                className="flex-1 rounded-[7px] py-[5px] text-center transition-all"
                style={{
                  fontSize: 11, fontWeight: variant === v ? 600 : 400,
                  color: variant === v ? C.text : C.textMuted,
                  backgroundColor: variant === v ? C.card : "transparent",
                  boxShadow: variant === v ? "0 1px 2px rgba(0,0,0,0.06)" : undefined,
                }}>
                {v === "v1a" ? "Full" : v === "v1b" ? "1000" : "900"}
              </button>
            ))}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${C.border}` }} className="mx-[10px]" />
        <div className="px-[10px] py-[6px] space-y-[1px]">
          <SidebarBtn icon={Sparkles} label="Upgrade" active={false} onClick={() => {}} />
          <div className="flex items-center gap-[4px] px-[12px] py-[6px]">
            <button className="transition-colors hover:text-[#1A1A1A]" style={{ fontSize: 12, fontWeight: 500, color: C.textMuted }}>Feedback</button>
            <span style={{ fontSize: 12, color: C.textLight }}>·</span>
            <button className="transition-colors hover:text-[#1A1A1A]" style={{ fontSize: 12, fontWeight: 500, color: C.textMuted }}>Docs</button>
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${C.border}` }} className="mx-[10px]" />
        <div className="px-[10px] py-[10px]">
          <button className="flex w-full items-center gap-[10px] rounded-[10px] px-[12px] py-[8px] transition-colors hover:bg-[#EEEDEC]">
            <div className="flex h-[28px] w-[28px] items-center justify-center rounded-full shrink-0" style={{ backgroundColor: C.border }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: C.textMuted }}>V</span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p style={{ fontSize: 13, fontWeight: 500 }} className="truncate">Victor Boittiaux</p>
              <p style={{ fontSize: 11, color: C.textMuted }}>Free plan</p>
            </div>
            <ChevronDown className="h-[12px] w-[12px] shrink-0" style={{ color: C.textLight }} strokeWidth={2} />
          </button>
        </div>
      </aside>

      {/* ─── Main area ─── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">

          {/* Top spacer */}
          <div className="h-[16px] shrink-0" />

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {sidebarView === "split" && (
              <>
                {isUploadState && (
                  <div className="px-[32px] pb-[40px]">
                    <div style={{ maxWidth: contentMaxWidth === "none" ? undefined : contentMaxWidth, margin: contentMaxWidth === "none" ? undefined : "0 auto" }}>
                    {/* Page heading */}
                    <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 24 }}>
                      Split Audio
                    </h1>
                        <DropZone file={file} isDragging={isDragging} inputRef={inputRef}
                          onFile={handleFile} onDrag={setIsDragging} onClear={() => { setFile(null); setAppState("idle"); }} />

                        <div className="flex items-center justify-between mt-[12px]">
                          <div className="flex items-center gap-[4px]">
                            <button onClick={() => inputRef.current?.click()}
                              className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] transition-colors hover:bg-[#EEEDEC]">
                              <Upload className="h-[16px] w-[16px]" style={{ color: C.textMuted }} strokeWidth={1.6} />
                            </button>
                            <button className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] transition-colors hover:bg-[#EEEDEC]">
                              <Mic className="h-[16px] w-[16px]" style={{ color: C.textMuted }} strokeWidth={1.6} />
                            </button>
                            <div className="w-[1px] h-[16px] mx-[8px]" style={{ backgroundColor: C.border }} />
                            <SettingsPill label={currentStem.label} onClick={() => setStemsOpen(!stemsOpen)} hasChevron />
                            <SettingsPill label="WAV" onClick={() => {}} />
                            {/* V1A: gear popover for extra settings */}
                            {variant === "v1a" && (
                              <div className="relative" ref={extraRef}>
                                <button onClick={() => setExtraOpen(!extraOpen)}
                                  className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] transition-colors hover:bg-[#EEEDEC]"
                                  style={{ backgroundColor: extraOpen ? C.hoverBg : undefined }}>
                                  <Settings2 className="h-[15px] w-[15px]" style={{ color: extraOpen ? C.text : C.textMuted }} strokeWidth={1.6} />
                                </button>
                                <AnimatePresence>
                                  {extraOpen && (
                                    <motion.div initial={{ opacity: 0, y: 4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.97 }}
                                      transition={{ duration: 0.12 }}
                                      className="absolute left-0 top-full mt-[6px] z-30 w-[280px]"
                                      style={{ backgroundColor: C.card, borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: "0 8px 30px rgba(0,0,0,0.1)" }}>
                                      <div className="px-[16px] py-[12px]" style={{ borderBottom: `1px solid ${C.border}` }}>
                                        <span style={{ fontSize: 13, fontWeight: 600 }}>Advanced settings</span>
                                      </div>
                                      <div className="px-[16px] py-[14px] space-y-[16px]">
                                        <div className="space-y-[6px]">
                                          <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: "0.03em", textTransform: "uppercase" as const }}>Model</label>
                                          <button className="flex w-full items-center gap-[8px] rounded-[8px] px-[10px] py-[7px] transition-colors hover:bg-[#FAFAFA]"
                                            style={{ backgroundColor: C.hoverBg }}>
                                            <div className="flex h-[16px] items-center rounded-[3px] px-[4px]" style={{ backgroundColor: C.accent }}>
                                              <span style={{ fontSize: 8, fontWeight: 700, color: "#fff" }}>AI</span>
                                            </div>
                                            <span style={{ fontSize: 12, fontWeight: 500 }} className="flex-1 text-left">MelBand RoFormer</span>
                                            <ChevronDown className="h-[11px] w-[11px]" style={{ color: C.textLight }} strokeWidth={2} />
                                          </button>
                                        </div>
                                        <div className="space-y-[6px]">
                                          <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: "0.03em", textTransform: "uppercase" as const }}>Stability</label>
                                          <input type="range" min={0} max={1} step={0.01} defaultValue={0.75} className="w-full h-[3px] cursor-pointer" style={{ accentColor: C.accent }} />
                                          <div className="flex justify-between"><span style={{ fontSize: 10, color: C.textLight }}>Variable</span><span style={{ fontSize: 10, color: C.textLight }}>Stable</span></div>
                                        </div>
                                        <div className="space-y-[6px]">
                                          <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: "0.03em", textTransform: "uppercase" as const }}>Quality</label>
                                          <input type="range" min={0} max={1} step={0.01} defaultValue={0.7} className="w-full h-[3px] cursor-pointer" style={{ accentColor: C.accent }} />
                                          <div className="flex justify-between"><span style={{ fontSize: 10, color: C.textLight }}>Faster</span><span style={{ fontSize: 10, color: C.textLight }}>Higher quality</span></div>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <span style={{ fontSize: 12 }}>Clean Vocals</span>
                                          <button className="relative h-[20px] w-[38px] rounded-full" style={{ backgroundColor: C.border }} aria-label="Toggle">
                                            <div className="absolute left-[2px] top-[2px] h-[16px] w-[16px] rounded-full bg-white" style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.1)" }} />
                                          </button>
                                        </div>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-[12px]">
                            <span style={{ fontSize: 13, color: C.textLight }}>0 / 10,000 credits</span>
                            <button onClick={handleSplit} disabled={!file}
                              className="flex h-[36px] w-[36px] items-center justify-center rounded-full text-white transition-all hover:opacity-90 disabled:opacity-25 disabled:cursor-not-allowed"
                              style={{ backgroundColor: file ? C.accent : C.textLight }}>
                              <Scissors className="h-[14px] w-[14px]" strokeWidth={2} />
                            </button>
                          </div>
                        </div>

                        <StemsDropdown open={stemsOpen} stemCount={stemCount} onSelect={(v) => { setStemCount(v); setStemsOpen(false); }} />

                    {/* ─── History section ─── */}
                    <div className="mt-[40px]">
                      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 20 }}>Recent splits</h2>

                      {/* List rows with BPM + key */}
                      {(variant === "v1a" || variant === "v1b" || variant === "v1c") && (
                        <div className="space-y-[6px]">
                          {HISTORY.map((item, i) => (
                            <motion.div key={item.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}
                              className="flex items-center gap-[14px] rounded-[12px] px-[16px] py-[14px] transition-colors hover:bg-white/60 cursor-pointer"
                              style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[8px] shrink-0" style={{ backgroundColor: C.hoverBg }}>
                                <AudioLines className="h-[16px] w-[16px]" style={{ color: C.textMuted }} strokeWidth={1.4} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p style={{ fontSize: 14, fontWeight: 500 }} className="truncate">{item.name}</p>
                                <p style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}>{item.date} · {item.stems} stems · {item.duration}</p>
                              </div>
                              <div className="flex items-center gap-[6px] shrink-0">
                                <span className="rounded-[6px] px-[7px] py-[2px]" style={{ fontSize: 11, fontWeight: 600, color: C.textSec, backgroundColor: C.hoverBg }}>{item.bpm} BPM</span>
                                <span className="rounded-[6px] px-[7px] py-[2px]" style={{ fontSize: 11, fontWeight: 600, color: C.textSec, backgroundColor: C.hoverBg }}>{item.key}</span>
                              </div>
                              <span style={{ fontSize: 12, color: C.textLight, marginRight: 4 }}>{item.format.toUpperCase()}</span>
                              <div className="flex items-center gap-[2px]">
                                <button className="p-[6px] rounded-[6px] transition-colors hover:bg-[#EEEDEC]">
                                  <Download className="h-[14px] w-[14px]" style={{ color: C.textMuted }} strokeWidth={1.5} />
                                </button>
                                <button className="p-[6px] rounded-[6px] transition-colors hover:bg-[#EEEDEC]">
                                  <Trash2 className="h-[14px] w-[14px]" style={{ color: C.textMuted }} strokeWidth={1.5} />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      )}

                    </div>
                    </div>
                  </div>
                )}

                {/* Processing */}
                {appState === "processing" && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-[32px] min-h-full">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                      <Loader2 className="h-[32px] w-[32px]" style={{ color: C.accent }} strokeWidth={1.5} />
                    </motion.div>
                    <div className="text-center">
                      <span style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-0.03em" }}>{Math.floor(progress)}</span>
                      <span style={{ fontSize: 28, fontWeight: 700, color: C.textLight }}>%</span>
                    </div>
                    <div className="h-[4px] w-full max-w-[320px] overflow-hidden rounded-full" style={{ backgroundColor: C.border }}>
                      <motion.div className="h-full rounded-full" style={{ backgroundColor: C.accent }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
                    </div>
                    <p style={{ fontSize: 14, color: C.textMuted }}>{stage}</p>
                  </div>
                )}

                {/* Results */}
                {appState === "complete" && (
                  <div className="px-[32px] py-[24px] space-y-[16px]">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Separation Complete</h2>
                        <p style={{ fontSize: 14, color: C.textMuted, marginTop: 4 }}>{file?.name} — {STEM_MAP[stemCount].length} stems</p>
                      </div>
                      <button onClick={handleNewSplit}
                        style={{ border: `1px solid ${C.border}`, borderRadius: 100, fontSize: 13, fontWeight: 500, color: C.textMuted }}
                        className="flex items-center gap-[6px] px-[16px] py-[8px] transition-colors hover:bg-white">
                        <RotateCcw className="h-[13px] w-[13px]" /> New split
                      </button>
                    </div>

                    <div className="flex items-center gap-[12px] rounded-[14px] px-[20px] py-[12px]" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                      <button onClick={() => { setCurrentTime(0); setIsPlaying(false); }} style={{ color: C.textMuted }} className="hover:text-[#1A1A1A] transition-colors">
                        <SkipBack className="h-[15px] w-[15px]" />
                      </button>
                      <button onClick={togglePlay}
                        className="flex h-[38px] w-[38px] items-center justify-center rounded-full text-white transition-transform hover:scale-105 active:scale-95"
                        style={{ backgroundColor: C.accent }}>
                        {isPlaying ? <Pause className="h-[14px] w-[14px]" /> : <Play className="h-[14px] w-[14px] ml-[1px]" />}
                      </button>
                      <span className="w-[90px] text-center tabular-nums" style={{ fontSize: 13, color: C.textMuted }}>
                        {ft(currentTime)} / {ft(duration)}
                      </span>
                      <div className="relative flex-1 h-[4px] rounded-full cursor-pointer group" style={{ backgroundColor: C.border }}
                        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek((e.clientX - r.left) / r.width); }}>
                        <div className="absolute inset-y-0 left-0 rounded-full" style={{ width: `${playProgress * 100}%`, backgroundColor: C.accent }} />
                        <div className="absolute top-1/2 -translate-y-1/2 h-[12px] w-[12px] rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ left: `calc(${playProgress * 100}% - 6px)`, boxShadow: "0 1px 4px rgba(0,0,0,0.15)", border: `2px solid ${C.accent}` }} />
                      </div>
                      <button className="flex items-center gap-[6px] rounded-full px-[14px] py-[8px] text-white transition-opacity hover:opacity-90"
                        style={{ backgroundColor: C.accent, fontSize: 13, fontWeight: 600 }}>
                        <Download className="h-[13px] w-[13px]" /> Download All
                      </button>
                    </div>

                    <div className="space-y-[4px]">
                      {STEM_MAP[stemCount].map((name, i) => {
                        const c = STEM_COLORS[name] || { label: name, color: "#939397", played: "#6B6B73" };
                        const isMuted = mutedTracks.has(name); const isSolo = soloTrack === name;
                        const isActive = soloTrack ? isSolo : !isMuted;
                        return (
                          <motion.div key={name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 + i * 0.04 }}
                            className="flex items-center gap-[12px] rounded-[12px] px-[16px] py-[12px] transition-all"
                            style={{ backgroundColor: C.card, border: `1px solid ${C.border}`, opacity: isActive ? 1 : 0.35 }}>
                            <div className="flex w-[80px] shrink-0 items-center gap-[8px]">
                              <div className="h-[8px] w-[8px] rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                              <span style={{ fontSize: 13, fontWeight: 600 }}>{c.label}</span>
                            </div>
                            <div className="flex gap-[3px] shrink-0">
                              <button onClick={() => setSoloTrack(soloTrack === name ? null : name)}
                                style={{ backgroundColor: isSolo ? "#FBBF24" : C.hoverBg, color: isSolo ? C.text : C.textMuted, fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "2px 7px" }}
                                className="transition-colors">S</button>
                              <button onClick={() => { if (soloTrack === name) { setSoloTrack(null); return; } setMutedTracks(p => { const n = new Set(p); n.has(name) ? n.delete(name) : n.add(name); return n; }); }}
                                style={{ backgroundColor: isMuted ? "#EF4444" : C.hoverBg, color: isMuted ? "#fff" : C.textMuted, fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "2px 7px" }}
                                className="transition-colors">M</button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <Waveform seed={(i+1)*7919+42} color={c.color} playedColor={c.played} progress={playProgress} height={40} onSeek={seek} barCount={160} />
                            </div>
                            <button className="shrink-0 p-[5px] rounded-[6px] transition-colors hover:bg-[#EEEDEC]" style={{ color: C.textMuted }}>
                              <Download className="h-[14px] w-[14px]" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* My Files */}
            {sidebarView === "files" && (
              <div className="px-[32px] pt-[8px]">
                <div style={{ maxWidth: contentMaxWidth === "none" ? undefined : contentMaxWidth, margin: contentMaxWidth === "none" ? undefined : "0 auto" }}>
                  <h1 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 24 }}>Your files</h1>
                  <div className="space-y-[4px]">
                    {HISTORY.map((f) => (
                      <div key={f.name}
                        className="flex items-center gap-[14px] rounded-[12px] px-[16px] py-[14px] transition-colors hover:bg-white/60 cursor-pointer"
                        style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
                        <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[8px] shrink-0" style={{ backgroundColor: C.hoverBg }}>
                          <FileAudio className="h-[16px] w-[16px]" style={{ color: C.textMuted }} strokeWidth={1.4} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p style={{ fontSize: 14, fontWeight: 500 }} className="truncate">{f.name}</p>
                          <p style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}>{f.date} · {f.stems} stems · {f.duration}</p>
                        </div>
                        <div className="flex items-center gap-[4px] rounded-full px-[10px] py-[3px]" style={{ backgroundColor: "#F0FDF4" }}>
                          <div className="h-[5px] w-[5px] rounded-full" style={{ backgroundColor: "#22C55E" }} />
                          <span style={{ fontSize: 11, fontWeight: 500, color: "#16A34A" }}>Complete</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Settings */}
            {sidebarView === "settings" && (
              <div className="flex flex-1 items-center justify-center min-h-full">
                <div className="text-center space-y-[8px]">
                  <div className="flex h-[48px] w-[48px] mx-auto items-center justify-center rounded-full" style={{ backgroundColor: C.card }}>
                    <Settings2 className="h-[20px] w-[20px]" style={{ color: C.textLight }} strokeWidth={1.4} />
                  </div>
                  <p style={{ fontSize: 14, color: C.textMuted }}>Account settings coming soon</p>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Shared Components ──────────────────────────────────────

function DropZone({ file, isDragging, inputRef, onFile, onDrag, onClear, inCard }: {
  file: File | null; isDragging: boolean; inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File) => void; onDrag: (v: boolean) => void; onClear: () => void; inCard?: boolean;
}) {
  const fs = (b: number) => b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  return (
    <div
      onDrop={(e) => { e.preventDefault(); onDrag(false); const f = e.dataTransfer.files[0]; if (f) onFile(f); }}
      onDragOver={(e) => { e.preventDefault(); onDrag(true); }}
      onDragLeave={() => onDrag(false)}
      onClick={() => !file && inputRef.current?.click()}
      className="flex items-center justify-center transition-all duration-150"
      style={{
        minHeight: inCard ? 160 : 180,
        borderRadius: inCard ? 0 : 16,
        border: inCard ? "none" : `1px solid ${isDragging ? C.accent : C.border}`,
        backgroundColor: inCard ? (isDragging ? "#FEF7F7" : "transparent") : (isDragging ? "#FEF7F7" : C.card),
        cursor: file ? "default" : "pointer",
        boxShadow: !inCard && isDragging ? `0 0 0 3px rgba(238,87,90,0.15)` : undefined,
      }}>
      <input ref={inputRef} type="file" className="hidden" accept=".mp3,.wav,.flac,.ogg,.m4a,.aac"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />

      {file ? (
        <div className="flex flex-col items-center gap-[8px]">
          <div className="flex h-[40px] w-[40px] items-center justify-center rounded-[10px]" style={{ backgroundColor: C.hoverBg }}>
            <FileAudio className="h-[18px] w-[18px]" style={{ color: C.textMuted }} strokeWidth={1.4} />
          </div>
          <p style={{ fontSize: 14, fontWeight: 600 }}>{file.name}</p>
          <p style={{ fontSize: 12, color: C.textMuted }}>{fs(file.size)}</p>
          <button onClick={(e) => { e.stopPropagation(); onClear(); }}
            className="flex items-center gap-[4px] rounded-[6px] px-[8px] py-[3px] transition-colors hover:bg-[#EEEDEC]"
            style={{ fontSize: 12, color: C.textMuted }}>
            <X className="h-[11px] w-[11px]" /> Remove
          </button>
        </div>
      ) : (
        <p style={{ fontSize: 15, color: isDragging ? C.accent : C.textMuted }}>
          {isDragging ? "Drop your file here" : "Drop files here"}
        </p>
      )}
    </div>
  );
}

function StemsDropdown({ open, stemCount, onSelect }: { open: boolean; stemCount: StemCount; onSelect: (v: StemCount) => void }) {
  if (!open) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-[8px]">
      <div className="flex gap-[8px]">
        {STEM_OPTIONS.map(opt => (
          <button key={opt.value} onClick={() => onSelect(opt.value)}
            className="flex-1 flex items-center gap-[10px] rounded-[12px] px-[14px] py-[12px] transition-all"
            style={{
              backgroundColor: stemCount === opt.value ? C.card : "transparent",
              border: `1px solid ${stemCount === opt.value ? C.border : "transparent"}`,
            }}>
            <opt.icon className="h-[15px] w-[15px] shrink-0" style={{ color: stemCount === opt.value ? C.accent : C.textMuted }} strokeWidth={1.6} />
            <div className="text-left">
              <p style={{ fontSize: 13, fontWeight: 600, color: stemCount === opt.value ? C.text : C.textMuted }}>{opt.label}</p>
              <p style={{ fontSize: 11, color: C.textLight }}>{opt.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

function SettingsField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-[8px]">
      <label style={{ fontSize: 12, fontWeight: 600, color: C.textMuted, letterSpacing: "0.02em", textTransform: "uppercase" as const }}>{label}</label>
      {children}
    </div>
  );
}

function SettingsPill({ label, badge, onClick, hasChevron }: { label: string; badge?: string; onClick: () => void; hasChevron?: boolean }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-[5px] rounded-[8px] px-[10px] py-[6px] transition-colors hover:bg-[#EEEDEC]"
      style={{ fontSize: 13, fontWeight: 500, color: C.textSec }}>
      {badge && (
        <div className="flex h-[16px] items-center rounded-[4px] px-[4px]" style={{ backgroundColor: C.accent }}>
          <span style={{ fontSize: 8, fontWeight: 700, color: "#fff" }}>{badge}</span>
        </div>
      )}
      {label}
      {hasChevron && <ChevronDown className="h-[11px] w-[11px]" style={{ color: C.textLight }} strokeWidth={2} />}
    </button>
  );
}

function SidebarBtn({ icon: Icon, label, active, onClick }: { icon: typeof Home; label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick}
      className="flex w-full items-center gap-[10px] rounded-[10px] px-[12px] py-[9px] transition-colors"
      style={{
        backgroundColor: active ? C.card : "transparent",
        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.04)" : undefined,
      }}>
      <Icon className="h-[17px] w-[17px] shrink-0" strokeWidth={1.5} style={{ color: active ? C.text : C.textMuted }} />
      <span style={{ fontSize: 14, fontWeight: active ? 500 : 400, color: active ? C.text : C.textMuted }}>{label}</span>
    </button>
  );
}

function TopBtn({ label }: { label: string }) {
  return (
    <button className="rounded-[8px] px-[10px] py-[5px] transition-colors hover:bg-[#EEEDEC]"
      style={{ fontSize: 13, fontWeight: 500, color: C.textMuted }}>
      {label}
    </button>
  );
}

function NavLink({ label }: { label: string }) {
  return <span className="cursor-pointer transition-colors hover:text-[#1A1A1A]" style={{ fontSize: 13, fontWeight: 500, color: C.textMuted }}>{label}</span>;
}

function FloatingWidget({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[12px] overflow-hidden" style={{ backgroundColor: C.card, border: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between px-[14px] py-[10px]" style={{ borderBottom: `1px solid ${C.border}` }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{title}</span>
        <ChevronDown className="h-[10px] w-[10px]" style={{ color: C.textLight }} strokeWidth={2} />
      </div>
      <div className="px-[14px] py-[12px]">
        {children}
      </div>
    </div>
  );
}

function TabBtn({ label, active }: { label: string; active: boolean }) {
  return (
    <button className="relative py-[14px] px-[4px] transition-colors" style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? C.text : C.textLight }}>
      {label}
      {active && <div className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full" style={{ backgroundColor: C.text }} />}
    </button>
  );
}

function HistoryWaveform({ color }: { color: string }) {
  const bars = Array.from({ length: 48 }, (_, i) => {
    const h = Math.sin(i * 0.35 + 2) * 0.35 + Math.cos(i * 0.6 + 1) * 0.25 + 0.5;
    return Math.max(0.1, Math.min(1, h));
  });
  return (
    <div className="flex items-center gap-[3px] w-full h-[60px]">
      {bars.map((h, i) => (
        <div key={i} className="flex-1 rounded-full" style={{ height: `${h * 100}%`, backgroundColor: color, opacity: 0.25 + h * 0.35 }} />
      ))}
    </div>
  );
}
