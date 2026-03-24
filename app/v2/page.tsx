"use client";

import { useState, useCallback, useRef } from "react";
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
  Zap,
  Scissors,
} from "lucide-react";
import { toast } from "sonner";
import { Waveform } from "@/components/dashboard/waveform";

// ─── Types ───────────────────────────────────────────────────────
type AppState = "idle" | "file-selected" | "processing" | "complete";
type StemCount = 2 | 4 | 6;

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
  other: { label: "Other", color: "#F43F5E", played: "#E11D48" },
  instrumental: { label: "Instrumental", color: "#6366F1", played: "#4F46E5" },
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

// ─── V2: Centered single-page layout (no sidebar) ───────────────
export default function DashboardV2() {
  const [appState, setAppState] = useState<AppState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [stemCount, setStemCount] = useState<StemCount>(4);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [soloTrack, setSoloTrack] = useState<string | null>(null);
  const [mutedTracks, setMutedTracks] = useState<Set<string>>(new Set());
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const duration = 214;

  const credits = 10000;
  const playProgress = duration > 0 ? currentTime / duration : 0;

  const handleFile = useCallback((f: File) => {
    if (!ACCEPTED.test(f.name)) {
      toast.error("Unsupported format");
      return;
    }
    if (f.size > MAX_SIZE) {
      toast.error("File too large (max 50MB)");
      return;
    }
    setFile(f);
    setAppState("file-selected");
  }, []);

  const handleSplit = useCallback(() => {
    if (!file) return;
    setAppState("processing");
    setProgress(0);
    setStage(STAGES[0]);
    let p = 0;
    let si = 0;
    intervalRef.current = setInterval(() => {
      p += Math.random() * 3 + 1.5;
      if (p >= 100) {
        setProgress(100);
        setStage("Complete!");
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
    setFile(null);
    setAppState("idle");
    setProgress(0);
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  const togglePlay = () => {
    if (!isPlaying) {
      playRef.current = setInterval(() => {
        setCurrentTime((t) => {
          if (t >= duration) { setIsPlaying(false); return 0; }
          return t + 0.05;
        });
      }, 50);
    } else if (playRef.current) {
      clearInterval(playRef.current);
    }
    setIsPlaying(!isPlaying);
  };

  const seek = (p: number) => setCurrentTime(p * duration);
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;
  const formatSize = (b: number) => b < 1024 * 1024 ? `${(b / 1024).toFixed(0)} KB` : `${(b / (1024 * 1024)).toFixed(1)} MB`;

  return (
    <div className="flex h-screen flex-col bg-white">
      {/* ─── Top nav ─── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-neutral-200/80 px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neutral-900">
            <svg className="h-3.5 w-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M2 12v2" /><path d="M6 8v8" /><path d="M10 4v16" /><path d="M14 7v10" /><path d="M18 5v14" /><path d="M22 10v4" />
            </svg>
          </div>
          <span className="font-heading text-base font-bold tracking-tight">44Stems</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Zap className="h-3 w-3" />
            <span>{new Intl.NumberFormat("en-US").format(credits)} credits</span>
          </div>
        </div>
      </header>

      {/* ─── Content ─── */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-6 py-12">
          <AnimatePresence mode="wait">
            {/* ── Upload / File selected ── */}
            {(appState === "idle" || appState === "file-selected") && (
              <motion.div
                key="upload"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="space-y-8"
              >
                {/* Hero */}
                <div className="text-center space-y-2">
                  <h1 className="font-heading text-3xl font-bold tracking-tight">
                    Split any song into stems
                  </h1>
                  <p className="text-neutral-500 text-[15px]">
                    Studio-grade AI separation. Vocals, drums, bass & instruments in seconds.
                  </p>
                </div>

                {/* Upload zone */}
                <div
                  onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onClick={() => !file && inputRef.current?.click()}
                  className={`rounded-2xl border-2 border-dashed transition-all duration-200 ${
                    isDragging ? "border-neutral-400 bg-neutral-50" :
                    file ? "border-neutral-200" :
                    "border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50/50 cursor-pointer"
                  }`}
                >
                  <input ref={inputRef} type="file" className="hidden" accept=".mp3,.wav,.flac,.ogg,.m4a,.aac"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

                  <div className="flex flex-col items-center justify-center gap-3 py-16 px-8">
                    {file ? (
                      <>
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100">
                          <FileAudio className="h-5 w-5 text-neutral-500" strokeWidth={1.5} />
                        </div>
                        <p className="font-heading text-sm font-semibold">{file.name}</p>
                        <p className="text-xs text-neutral-400">{formatSize(file.size)}</p>
                        <button onClick={(e) => { e.stopPropagation(); setFile(null); setAppState("idle"); }}
                          className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 transition-colors">
                          <X className="h-3 w-3" /> Remove
                        </button>
                      </>
                    ) : (
                      <>
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-neutral-100">
                          <Upload className="h-5 w-5 text-neutral-400" strokeWidth={1.5} />
                        </div>
                        <div className="text-center">
                          <p className="text-sm font-medium">{isDragging ? "Drop it here" : "Click to upload, or drag and drop"}</p>
                          <p className="text-xs text-neutral-400 mt-0.5">Audio files up to 50MB</p>
                        </div>
                        <div className="flex gap-1 pt-1">
                          {["MP3", "WAV", "FLAC", "OGG"].map((f) => (
                            <span key={f} className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400">{f}</span>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Stem selector — inline pills */}
                <div className="space-y-3">
                  <p className="text-xs font-medium text-neutral-500 uppercase tracking-wider text-center">Stems</p>
                  <div className="flex justify-center gap-2">
                    {([2, 4, 6] as StemCount[]).map((n) => (
                      <button
                        key={n}
                        onClick={() => setStemCount(n)}
                        className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${
                          stemCount === n
                            ? "bg-neutral-900 text-white shadow-sm"
                            : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                        }`}
                      >
                        {n} Stems
                      </button>
                    ))}
                  </div>
                  <p className="text-center text-[11px] text-neutral-400">
                    {stemCount === 2 && "Vocals + Instrumental"}
                    {stemCount === 4 && "Vocals, Drums, Bass, Other"}
                    {stemCount === 6 && "Vocals, Drums, Bass, Guitar, Piano, Other"}
                  </p>
                </div>

                {/* Split button */}
                <button
                  onClick={handleSplit}
                  disabled={!file}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-neutral-900 text-sm font-semibold text-white transition-all hover:bg-neutral-800 disabled:opacity-25 disabled:cursor-not-allowed"
                >
                  <Scissors className="h-4 w-4" />
                  Split into {stemCount} stems
                </button>
              </motion.div>
            )}

            {/* ── Processing ── */}
            {appState === "processing" && (
              <motion.div
                key="processing"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="flex flex-col items-center gap-8 py-20"
              >
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}>
                  <Loader2 className="h-8 w-8 text-neutral-300" strokeWidth={1.5} />
                </motion.div>
                <div className="text-center">
                  <span className="font-heading text-5xl font-bold tabular-nums">{Math.floor(progress)}</span>
                  <span className="font-heading text-2xl font-bold text-neutral-300">%</span>
                </div>
                <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-neutral-100">
                  <motion.div className="h-full rounded-full bg-neutral-900" animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
                </div>
                <p className="text-sm text-neutral-400">{stage}</p>
              </motion.div>
            )}

            {/* ── Results ── */}
            {appState === "complete" && (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -16 }}
                className="space-y-5"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-heading text-xl font-bold">Separation Complete</h2>
                    <p className="text-sm text-neutral-400 mt-0.5">{file?.name} &mdash; {STEM_MAP[stemCount].length} stems</p>
                  </div>
                  <button onClick={handleNewSplit}
                    className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 hover:border-neutral-300 transition-colors">
                    <RotateCcw className="h-3 w-3" /> New split
                  </button>
                </div>

                {/* Transport */}
                <div className="flex items-center gap-3 rounded-xl bg-neutral-50 px-4 py-3">
                  <button onClick={() => { setCurrentTime(0); setIsPlaying(false); }}
                    className="text-neutral-400 hover:text-neutral-900 transition-colors">
                    <SkipBack className="h-4 w-4" />
                  </button>
                  <button onClick={togglePlay}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white hover:scale-105 active:scale-95 transition-transform">
                    {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
                  </button>
                  <span className="w-24 text-center text-xs tabular-nums text-neutral-400">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                  <div className="relative flex-1 h-1.5 rounded-full bg-neutral-200 cursor-pointer group"
                    onClick={(e) => { const r = e.currentTarget.getBoundingClientRect(); seek((e.clientX - r.left) / r.width); }}>
                    <div className="absolute inset-y-0 left-0 rounded-full bg-neutral-900" style={{ width: `${playProgress * 100}%` }} />
                  </div>
                  <button className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800 transition-colors">
                    <Download className="h-3 w-3" /> Download All
                  </button>
                </div>

                {/* Tracks */}
                <div className="space-y-1.5">
                  {STEM_MAP[stemCount].map((name, i) => {
                    const c = STEM_COLORS[name] || { label: name, color: "#6B7280", played: "#4B5563" };
                    const isMuted = mutedTracks.has(name);
                    const isSolo = soloTrack === name;
                    const isActive = soloTrack ? isSolo : !isMuted;
                    return (
                      <motion.div key={name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.04 }}
                        className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-all ${
                          isActive ? "border-neutral-200 bg-white" : "border-neutral-100 opacity-40"
                        }`}>
                        <div className="flex w-20 shrink-0 items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                          <span className="text-xs font-medium">{c.label}</span>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => setSoloTrack(soloTrack === name ? null : name)}
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${isSolo ? "bg-amber-400 text-amber-950" : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"}`}>S</button>
                          <button onClick={() => { if (soloTrack === name) { setSoloTrack(null); return; } setMutedTracks(p => { const n = new Set(p); n.has(name) ? n.delete(name) : n.add(name); return n; }); }}
                            className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${isMuted ? "bg-red-400 text-white" : "bg-neutral-100 text-neutral-400 hover:bg-neutral-200"}`}>M</button>
                        </div>
                        <div className="flex-1 min-w-0">
                          <Waveform seed={(i + 1) * 7919 + 42} color={c.color} playedColor={c.played} progress={playProgress} height={44} onSeek={seek} barCount={140} />
                        </div>
                        <button className="shrink-0 p-1.5 text-neutral-300 hover:text-neutral-600 transition-colors">
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
