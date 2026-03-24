"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload,
  FileAudio,
  X,
  Play,
  Pause,
  Download,
  SkipBack,
  RotateCcw,
  Loader2,
  Scissors,
  FolderOpen,
  Settings2,
  Zap,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";
import { Waveform } from "@/components/dashboard/waveform";

type AppState = "idle" | "file-selected" | "processing" | "complete";
type StemCount = 2 | 4 | 6;
type SidebarView = "split" | "files" | "settings";

const STEM_MAP: Record<StemCount, string[]> = {
  2: ["vocals", "instrumental"],
  4: ["vocals", "drums", "bass", "other"],
  6: ["vocals", "drums", "bass", "guitar", "piano", "other"],
};

const STEM_COLORS: Record<string, { label: string; color: string; played: string; bg: string }> = {
  vocals: { label: "Vocals", color: "#A78BFA", played: "#8B5CF6", bg: "rgba(167,139,250,0.08)" },
  drums: { label: "Drums", color: "#FBBF24", played: "#F59E0B", bg: "rgba(251,191,36,0.08)" },
  bass: { label: "Bass", color: "#34D399", played: "#10B981", bg: "rgba(52,211,153,0.08)" },
  guitar: { label: "Guitar", color: "#FB923C", played: "#F97316", bg: "rgba(251,146,60,0.08)" },
  piano: { label: "Piano", color: "#38BDF8", played: "#0EA5E9", bg: "rgba(56,189,248,0.08)" },
  other: { label: "Other", color: "#FB7185", played: "#F43F5E", bg: "rgba(251,113,133,0.08)" },
  instrumental: { label: "Instrumental", color: "#818CF8", played: "#6366F1", bg: "rgba(129,140,248,0.08)" },
};

const STAGES = [
  "Uploading audio...",
  "Analyzing waveform...",
  "Separating vocals with MelBand RoFormer...",
  "Separating instruments with BS-RoFormer...",
  "Finalizing stems...",
];

const ACCEPTED = /\.(mp3|wav|flac|ogg|m4a|aac)$/i;
const MAX_SIZE = 50 * 1024 * 1024;

const NAV_ITEMS: { id: SidebarView; icon: typeof Scissors; label: string }[] = [
  { id: "split", icon: Scissors, label: "Split Audio" },
  { id: "files", icon: FolderOpen, label: "My Files" },
  { id: "settings", icon: Settings2, label: "Settings" },
];

// ─── V3: Dark sidebar, accent colors, studio feel ───────────────
export default function DashboardV3() {
  const [sidebarView, setSidebarView] = useState<SidebarView>("split");
  const [appState, setAppState] = useState<AppState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [stemCount, setStemCount] = useState<StemCount>(4);
  const [outputFormat, setOutputFormat] = useState<"wav" | "mp3">("wav");
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Playback
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [soloTrack, setSoloTrack] = useState<string | null>(null);
  const [mutedTracks, setMutedTracks] = useState<Set<string>>(new Set());
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const duration = 214;
  const playProgress = duration > 0 ? currentTime / duration : 0;

  const credits = 10000;

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (playRef.current) clearInterval(playRef.current);
    };
  }, []);

  const handleFile = useCallback((f: File) => {
    if (!ACCEPTED.test(f.name)) { toast.error("Unsupported format"); return; }
    if (f.size > MAX_SIZE) { toast.error("File too large"); return; }
    setFile(f);
    setAppState("file-selected");
  }, []);

  const handleSplit = useCallback(() => {
    if (!file) return;
    setAppState("processing");
    setProgress(0);
    setStage(STAGES[0]);
    let p = 0, si = 0;
    intervalRef.current = setInterval(() => {
      p += Math.random() * 3 + 1.5;
      if (p >= 100) {
        setProgress(100); setStage("Complete!");
        if (intervalRef.current) clearInterval(intervalRef.current);
        setTimeout(() => setAppState("complete"), 500);
        return;
      }
      setProgress(p);
      const ns = Math.min(STAGES.length - 1, Math.floor(p / (100 / STAGES.length)));
      if (ns !== si) { si = ns; setStage(STAGES[si]); }
    }, 180);
  }, [file]);

  const handleNewSplit = useCallback(() => {
    setFile(null); setAppState("idle"); setProgress(0); setCurrentTime(0); setIsPlaying(false);
  }, []);

  const togglePlay = () => {
    if (!isPlaying) {
      playRef.current = setInterval(() => {
        setCurrentTime((t) => { if (t >= duration) { setIsPlaying(false); return 0; } return t + 0.05; });
      }, 50);
    } else if (playRef.current) clearInterval(playRef.current);
    setIsPlaying(!isPlaying);
  };

  const seek = (p: number) => setCurrentTime(p * duration);
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  const formatSize = (b: number) => b < 1048576 ? `${(b / 1024).toFixed(0)} KB` : `${(b / 1048576).toFixed(1)} MB`;

  const showSettings = sidebarView === "split" && (appState === "idle" || appState === "file-selected");

  return (
    <div className="flex h-screen overflow-hidden bg-[#F5F5F7]">
      {/* ─── Dark sidebar ─── */}
      <aside className="flex h-full w-[220px] shrink-0 flex-col bg-[#1A1A1E]">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
            <svg className="h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 12v2" /><path d="M6 8v8" /><path d="M10 4v16" /><path d="M14 7v10" /><path d="M18 5v14" /><path d="M22 10v4" />
            </svg>
          </div>
          <span className="text-[16px] font-bold tracking-tight text-white" style={{ fontFamily: "Satoshi, sans-serif" }}>44Stems</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 px-3 pt-1">
          {NAV_ITEMS.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => setSidebarView(id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-colors ${
                sidebarView === id
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/80"
              }`}>
              <Icon className="h-[16px] w-[16px]" strokeWidth={1.8} />
              {label}
            </button>
          ))}
        </nav>

        {/* Credits */}
        <div className="border-t border-white/10 px-5 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-3.5 w-3.5 text-amber-400" strokeWidth={2} />
            <span className="text-[12px] text-white/50">
              {new Intl.NumberFormat("en-US").format(credits)} credits
            </span>
          </div>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <div className="flex h-[52px] shrink-0 items-center justify-between bg-white border-b border-neutral-200/60 px-6">
            <h1 className="text-[13px] font-semibold" style={{ fontFamily: "Satoshi, sans-serif" }}>
              {sidebarView === "split" ? "Split Audio" : sidebarView === "files" ? "My Files" : "Settings"}
            </h1>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-emerald-700">{new Intl.NumberFormat("en-US").format(credits)} credits</span>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {sidebarView === "split" && (
              <>
                {(appState === "idle" || appState === "file-selected") && (
                  <div className="flex items-center justify-center p-8 py-20">
                    <div className="w-full max-w-lg">
                      <div
                        onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onClick={() => !file && inputRef.current?.click()}
                        className={`rounded-2xl border-2 border-dashed bg-white transition-all duration-200 ${
                          isDragging ? "border-violet-400 bg-violet-50/30" :
                          file ? "border-neutral-200" :
                          "border-neutral-200/80 hover:border-violet-300 hover:bg-violet-50/20 cursor-pointer"
                        }`}
                      >
                        <input ref={inputRef} type="file" className="hidden" accept=".mp3,.wav,.flac,.ogg,.m4a,.aac"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
                        <div className="flex flex-col items-center justify-center gap-3 py-20 px-8">
                          {file ? (
                            <>
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50">
                                <FileAudio className="h-6 w-6 text-violet-500" strokeWidth={1.5} />
                              </div>
                              <p className="text-[15px] font-semibold" style={{ fontFamily: "Satoshi, sans-serif" }}>{file.name}</p>
                              <p className="text-xs text-neutral-400">{formatSize(file.size)}</p>
                              <button onClick={(e) => { e.stopPropagation(); setFile(null); setAppState("idle"); }}
                                className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600"><X className="h-3 w-3" /> Remove</button>
                            </>
                          ) : (
                            <>
                              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-50">
                                <Upload className="h-5 w-5 text-violet-400" strokeWidth={1.5} />
                              </div>
                              <p className="text-[15px] font-medium">{isDragging ? "Drop it here" : "Click to upload, or drag and drop"}</p>
                              <p className="text-xs text-neutral-400">Audio files up to 50MB each</p>
                              <div className="flex gap-1 pt-1">
                                {["MP3", "WAV", "FLAC", "OGG", "M4A"].map((f) => (
                                  <span key={f} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">{f}</span>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {appState === "processing" && (
                  <div className="flex flex-col items-center justify-center gap-8 px-8 py-20">
                    <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                      <Loader2 className="h-8 w-8 text-violet-300" strokeWidth={1.5} />
                    </motion.div>
                    <div className="text-center">
                      <span className="font-heading text-6xl font-bold tabular-nums">{Math.floor(progress)}</span>
                      <span className="font-heading text-3xl font-bold text-neutral-300">%</span>
                    </div>
                    <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-neutral-200">
                      <motion.div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
                    </div>
                    <p className="text-sm text-neutral-400">{stage}</p>
                  </div>
                )}

                {appState === "complete" && (
                  <div className="flex flex-col p-6 gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-lg font-bold" style={{ fontFamily: "Satoshi, sans-serif" }}>Separation Complete</h2>
                        <p className="text-sm text-neutral-400 mt-0.5">{file?.name} &mdash; {STEM_MAP[stemCount].length} stems</p>
                      </div>
                      <button onClick={handleNewSplit}
                        className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 transition-colors">
                        <RotateCcw className="h-3 w-3" /> New split
                      </button>
                    </div>

                    {/* Transport */}
                    <div className="flex items-center gap-3 rounded-xl bg-white border border-neutral-200/60 px-4 py-3 shadow-sm">
                      <button onClick={() => { setCurrentTime(0); setIsPlaying(false); }} className="text-neutral-400 hover:text-neutral-900">
                        <SkipBack className="h-4 w-4" />
                      </button>
                      <button onClick={togglePlay}
                        className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white hover:scale-105 active:scale-95 transition-transform shadow-md shadow-violet-200">
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                      </button>
                      <span className="w-24 text-center text-xs tabular-nums text-neutral-400">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                      <div className="relative flex-1 h-2 rounded-full bg-neutral-200 cursor-pointer group"
                        onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek((e.clientX - r.left) / r.width); }}>
                        <div className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 to-indigo-500" style={{ width: `${playProgress * 100}%` }} />
                        <div className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full bg-white border-2 border-violet-500 shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                          style={{ left: `calc(${playProgress * 100}% - 7px)` }} />
                      </div>
                      <button className="flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-2 text-xs font-medium text-white shadow-sm shadow-violet-200 hover:opacity-90 transition-opacity">
                        <Download className="h-3 w-3" /> Download All
                      </button>
                    </div>

                    {/* Tracks */}
                    <div className="flex-1 space-y-1.5 overflow-y-auto">
                      {STEM_MAP[stemCount].map((name, i) => {
                        const c = STEM_COLORS[name] || { label: name, color: "#6B7280", played: "#4B5563", bg: "rgba(107,114,128,0.08)" };
                        const isMuted = mutedTracks.has(name);
                        const isSolo = soloTrack === name;
                        const isActive = soloTrack ? isSolo : !isMuted;
                        return (
                          <motion.div key={name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }}
                            className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                              isActive ? "border-neutral-200/60 bg-white shadow-sm" : "border-neutral-100 bg-white/50 opacity-40"
                            }`}>
                            <div className="flex w-20 shrink-0 items-center gap-2">
                              <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                              <span className="text-xs font-semibold">{c.label}</span>
                            </div>
                            <div className="flex gap-1 shrink-0">
                              <button onClick={() => setSoloTrack(soloTrack === name ? null : name)}
                                className={`rounded px-2 py-0.5 text-[10px] font-bold transition-colors ${isSolo ? "bg-amber-400 text-amber-950" : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"}`}>S</button>
                              <button onClick={() => { if (soloTrack === name) { setSoloTrack(null); return; } setMutedTracks(p => { const n = new Set(p); n.has(name) ? n.delete(name) : n.add(name); return n; }); }}
                                className={`rounded px-2 py-0.5 text-[10px] font-bold transition-colors ${isMuted ? "bg-red-400 text-white" : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"}`}>M</button>
                            </div>
                            <div className="flex-1 min-w-0">
                              <Waveform seed={(i + 1) * 7919 + 42} color={c.color} playedColor={c.played} progress={playProgress} height={48} onSeek={seek} barCount={160} />
                            </div>
                            <button className="shrink-0 p-1.5 text-neutral-300 hover:text-neutral-600 transition-colors">
                              <Download className="h-3.5 w-3.5" />
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}

            {sidebarView === "files" && (
              <div className="p-6">
                <div className="mx-auto max-w-2xl space-y-3">
                  {[
                    { name: "summer_vibes_remix.mp3", date: "2 hours ago", stems: 4, size: "8.2 MB" },
                    { name: "midnight_drive_v2.wav", date: "Yesterday", stems: 6, size: "24.1 MB" },
                    { name: "acoustic_demo.flac", date: "3 days ago", stems: 2, size: "31.7 MB" },
                  ].map((f, i) => (
                    <motion.div key={f.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className="flex items-center gap-4 rounded-xl bg-white border border-neutral-200/60 px-5 py-4 shadow-sm hover:border-neutral-300 transition-colors">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-50">
                        <FileAudio className="h-5 w-5 text-violet-400" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate">{f.name}</p>
                        <p className="text-[11px] text-neutral-400 mt-0.5">{f.date} &middot; {f.stems} stems &middot; {f.size}</p>
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5">
                        <div className="h-1 w-1 rounded-full bg-emerald-500" />
                        <span className="text-[10px] font-medium text-emerald-600">Complete</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {sidebarView === "settings" && (
              <div className="flex flex-1 items-center justify-center min-h-full">
                <div className="text-center space-y-2">
                  <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-xl bg-neutral-100">
                    <Settings2 className="h-6 w-6 text-neutral-300" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm text-neutral-400">Account settings coming soon</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Settings panel */}
        {showSettings && (
          <aside className="flex h-full w-[300px] shrink-0 flex-col bg-white border-l border-neutral-200/60">
            <div className="border-b border-neutral-200/60 px-5 py-4">
              <h2 className="text-[13px] font-semibold" style={{ fontFamily: "Satoshi, sans-serif" }}>Settings</h2>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
              <div className="space-y-3">
                <label className="text-[12px] font-medium text-neutral-500 uppercase tracking-wider">Stems</label>
                <div className="space-y-2">
                  {([2, 4, 6] as StemCount[]).map((n) => {
                    const desc = n === 2 ? "Vocals + Instrumental" : n === 4 ? "Vocals, Drums, Bass, Other" : "Vocals, Drums, Bass, Guitar, Piano, Other";
                    return (
                      <button key={n} onClick={() => setStemCount(n)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                          stemCount === n ? "border-violet-300 bg-violet-50/50" : "border-neutral-200/60 hover:border-violet-200"
                        }`}>
                        <div className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                          stemCount === n ? "border-violet-500" : "border-neutral-300"
                        }`}>
                          {stemCount === n && <div className="h-2 w-2 rounded-full bg-violet-500" />}
                        </div>
                        <div>
                          <p className="text-[13px] font-medium">{n} Stems</p>
                          <p className="text-[11px] text-neutral-400">{desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-3">
                <label htmlFor="v3-format" className="text-[12px] font-medium text-neutral-500 uppercase tracking-wider">Output Format</label>
                <div className="relative">
                  <select id="v3-format" name="v3-format" value={outputFormat} onChange={(e) => setOutputFormat(e.target.value as "wav" | "mp3")}
                    className="w-full appearance-none rounded-xl border border-neutral-200/60 bg-transparent px-4 py-3 pr-10 text-[13px] font-medium focus:border-violet-300 focus:outline-none">
                    <option value="wav">WAV (Lossless)</option>
                    <option value="mp3">MP3 (128kbps)</option>
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
                </div>
              </div>
            </div>
            <div className="border-t border-neutral-200/60 px-5 py-4">
              <button onClick={handleSplit} disabled={!file}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 text-sm font-semibold text-white shadow-sm shadow-violet-200 transition-all hover:opacity-90 disabled:opacity-25 disabled:cursor-not-allowed">
                <Scissors className="h-4 w-4" />
                Split audio
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
