"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Scissors, FolderOpen, Settings2, Sparkles,
  Download, Trash2, Upload, Mic, ChevronDown, ChevronRight, ChevronLeft,
  Play, Pause, Sun, Moon, Bell, Palette, Layers, ChevronsUpDown,
  HelpCircle, Search, ArrowUpDown, X, Square, SquareCheckBig,
  AudioLines, BarChart3, Gamepad2, SkipBack, RotateCcw, Link2, Check,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Waveform } from "@/components/dashboard/waveform";
import { StemVariants } from "@/components/stem-variants";
import Link from "next/link";
import type { Job, StemDownload } from "@/lib/types";
// Icon libraries installed: @phosphor-icons/react, @tabler/icons-react, @heroicons/react
// Final choice: Custom SVGs for Ableton geometric style

// ─── Types ───────────────────────────────────────────────────
type AppState = "idle" | "file-selected" | "processing" | "complete";
type StemCount = 2 | 4 | 6;
type OutputFormat = "wav" | "mp3";
type View = "split" | "results" | "files" | "stats" | "games" | "settings";
type Style = "classic" | "colorful";

const F = "'Futura PT', 'futura-pt', sans-serif";

// Force-load the font on mount
if (typeof window !== "undefined") {
  const font = new FontFace("Futura PT", "url(/fonts/futura-pt-medium.ttf)");
  font.load().then(f => document.fonts.add(f)).catch(() => {});
}

// ─── Classic theme (sober Ableton — no borders, bg contrast only) ─
const classicThemes = {
  dark: {
    bg: "#111111", bgCard: "#1C1C1C", bgSubtle: "#161616", bgHover: "#242424", bgElevated: "#202020",
    text: "#FFFFFF", textSec: "#999999", textMuted: "#666666",
    accent: "#1B10FD", accentText: "#FFFFFF",
    sidebarBg: "#161616", navActive: "#222222",
    badgeBg: "#2A2A2A", badgeText: "#999999", dropZoneBg: "#1C1C1C",
  },
  light: {
    bg: "#F3F3F3", bgCard: "#FFFFFF", bgSubtle: "#EAEAEA", bgHover: "#E0E0E0", bgElevated: "#F0F0F0",
    text: "#000000", textSec: "#555555", textMuted: "#888888",
    accent: "#1B10FD", accentText: "#FFFFFF",
    sidebarBg: "#EAEAEA", navActive: "#DCDCDC",
    badgeBg: "#E0E0E0", badgeText: "#555555", dropZoneBg: "#FFFFFF",
  },
} as const;

// ─── Colorful theme (Apple rainbow pop — no borders) ─────────
const colorfulThemes = {
  dark: {
    bg: "#0E0E0E", bgCard: "#1C1C1C", bgSubtle: "#141414", bgHover: "#242424", bgElevated: "#1E1E1E",
    text: "#FFFFFF", textSec: "#AAAAAA", textMuted: "#666666",
    accent: "#007AFF", accentText: "#FFFFFF",
    sidebarBg: "#141414", navActive: "#1E1E1E",
    badgeBg: "#2A2A2A", badgeText: "#AAAAAA", dropZoneBg: "#1C1C1C",
  },
  light: {
    bg: "#F5F5F7", bgCard: "#FFFFFF", bgSubtle: "#ECECEE", bgHover: "#E4E4E6", bgElevated: "#F0F0F2",
    text: "#1D1D1F", textSec: "#6E6E73", textMuted: "#98989D",
    accent: "#007AFF", accentText: "#FFFFFF",
    sidebarBg: "#ECECEE", navActive: "#E0E0E2",
    badgeBg: "#E4E4E8", badgeText: "#6E6E73", dropZoneBg: "#FFFFFF",
  },
} as const;

// ─── Stem colors per style ───────────────────────────────────
const STEM_COLORS_CLASSIC: Record<string, string> = {
  vocals: "#1B10FD", drums: "#FF6B00", bass: "#00CC66", guitar: "#FF3366",
  piano: "#00BBFF", other: "#777777", instrumental: "#6633FF",
};
const STEM_COLORS_POP: Record<string, string> = {
  vocals: "#FF2D55", drums: "#FF9500", bass: "#34C759", guitar: "#AF52DE",
  piano: "#007AFF", other: "#FFCC00", instrumental: "#5856D6",
};

// ─── Nav colors for colorful mode ────────────────────────────
const NAV_COLORS: Record<string, string> = {
  split: "#FF2D55", results: "#FF9500", files: "#FFCC00", stats: "#34C759", games: "#AF52DE", settings: "#007AFF",
};

const STEM_OPTIONS: { value: StemCount; label: string; desc: string }[] = [
  { value: 2, label: "2 Stems", desc: "Vocals + Instrumental" },
  { value: 4, label: "4 Stems", desc: "Vocals, Drums, Bass, Other" },
  { value: 6, label: "6 Stems", desc: "All instruments separated" },
];

const STEM_MAP: Record<StemCount, string[]> = {
  2: ["vocals", "instrumental"],
  4: ["vocals", "drums", "bass", "other"],
  6: ["vocals", "drums", "bass", "guitar", "piano", "other"],
};

// HistoryItem shape — matches /api/history response
interface HistoryItem {
  id: string;
  name: string;
  date: string;
  stems: number;
  stemList: string[];
  format: string;
  bpm: number | null;
  key: string | null;
  key_raw: string | null;
  mode: string;
  model: string;
  createdAt: number;
  completedAt: number;
  // kept for sort compatibility
  duration?: string;
  quality?: number;
  stability?: number;
}

const LABELS: Record<string, string> = {
  vocals: "VOCALS", drums: "DRUMS", bass: "BASS", guitar: "GUITAR",
  piano: "PIANO", other: "OTHER", instrumental: "INSTRUMENTAL",
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

const PROCESSING_AGENTS = [
  { name: "Uploading to GPU cluster", threshold: 0 },
  { name: "Analyzing spectral data", threshold: 10 },
  { name: "Isolating vocals", threshold: 25 },
  { name: "Isolating drums", threshold: 38 },
  { name: "Isolating bass", threshold: 50 },
  { name: "Isolating harmonics", threshold: 62 },
  { name: "Cross-validating models", threshold: 74 },
  { name: "Removing artifacts", threshold: 84 },
  { name: "Rendering stems", threshold: 93 },
];

const STEM_CONFIGS: Record<string, { label: string; color: string; playedColor: string }> = {
  vocals: { label: "Vocals", color: "#8B5CF6", playedColor: "#7C3AED" },
  drums: { label: "Drums", color: "#F59E0B", playedColor: "#D97706" },
  bass: { label: "Bass", color: "#10B981", playedColor: "#059669" },
  guitar: { label: "Guitar", color: "#F97316", playedColor: "#EA580C" },
  piano: { label: "Piano", color: "#0EA5E9", playedColor: "#0284C7" },
  other: { label: "Other", color: "#F43F5E", playedColor: "#E11D48" },
  instrumental: { label: "Instrumental", color: "#6366F1", playedColor: "#4F46E5" },
};

// ─── Lazy-load games ──────────────────────────────────────────
import dynamic from "next/dynamic";
const BpmTap = dynamic(() => import("@/components/games/bpm-tap").then(m => ({ default: m.BpmTap })), { ssr: false });
const MpcPad = dynamic(() => import("@/components/games/mpc-pad").then(m => ({ default: m.MpcPad })), { ssr: false });
const MelodyMemory = dynamic(() => import("@/components/games/melody-memory"), { ssr: false });
const FrequencyQuiz = dynamic(() => import("@/components/games/frequency-quiz"), { ssr: false });
const GuessTheStem = dynamic(() => import("@/components/games/guess-the-stem").then(m => ({ default: m.GuessTheStem })), { ssr: false });
const TomatoToss = dynamic(() => import("@/components/games/tomato-toss").then(m => ({ default: m.TomatoToss })), { ssr: false });

// ─── Component ──────────────────────────────────────────────
export default function AbletonDashboard() {
  const [isDark, setIsDark] = useState(true);
  const [style, setStyle] = useState<Style>("classic");
  const isColorful = style === "colorful";
  const C = isColorful
    ? (isDark ? colorfulThemes.dark : colorfulThemes.light)
    : (isDark ? classicThemes.dark : classicThemes.light);
  const stemColors = isColorful ? STEM_COLORS_POP : STEM_COLORS_CLASSIC;

  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load history from API on mount
  useEffect(() => {
    fetch("/api/history")
      .then(r => r.json())
      .then(d => { if (d.jobs) setHistory(d.jobs); })
      .catch(() => {});
  }, []);

  const refreshHistory = useCallback(() => {
    fetch("/api/history")
      .then(r => r.json())
      .then(d => { if (d.jobs) setHistory(d.jobs); })
      .catch(() => {});
  }, []);

  const [view, setView] = useState<View>("split");
  const [appState, setAppState] = useState<AppState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [stemCount, setStemCount] = useState<StemCount>(4);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("wav");
  const [stemsOpen, setStemsOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [extraOpen, setExtraOpen] = useState(false);
  const [versionOpen, setVersionOpen] = useState(false);
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [playingStem, setPlayingStem] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  // rAF smooth progress — target receives real values, display advances at 1%/s max
  const progressTargetRef = useRef(0);
  const progressDisplayRef = useRef(0);
  const progressRafRef = useRef<number>(0);
  const progressLastTickRef = useRef<number>(0);
  const [activeGame, setActiveGame] = useState("");
  // URL input variations
  const [urlInput, setUrlInput] = useState("");
  const [inputMode, setInputMode] = useState<"file" | "url">("file");
  // Platform detection
  const PLATFORMS = [
    { name: "YOUTUBE", pattern: /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|music\.youtube\.com\/watch\?v=)/ },
    { name: "SPOTIFY", pattern: /^(https?:\/\/)?(www\.)?open\.spotify\.com\/(intl-[a-z]{2}\/)?(track|album)\// },
    { name: "DEEZER", pattern: /^(https?:\/\/)?(www\.)?deezer\.com\/(track|album)\// },
    { name: "SOUNDCLOUD", pattern: /^(https?:\/\/)?(www\.)?soundcloud\.com\// },
    { name: "APPLE MUSIC", pattern: /^(https?:\/\/)?(www\.)?music\.apple\.com\// },
  ] as const;
  const detectedPlatform = PLATFORMS.find(p => p.pattern.test(urlInput.trim()))?.name || null;
  const isValidUrl = detectedPlatform !== null;
  const canSplit = file !== null || isValidUrl;
  const [validStyle, setValidStyle] = useState<1 | 2 | 3 | 4>(1);
  // Files view state
  const [sortBy, setSortBy] = useState<"name" | "date" | "duration" | "format" | "bpm" | "key">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [fileSearch, setFileSearch] = useState("");
  const [selectedTracks, setSelectedTracks] = useState<Set<string>>(new Set());
  const [selectedStems, setSelectedStems] = useState<Set<string>>(new Set());
  const [exportMode, setExportMode] = useState(false);
  const [exportStemPicker, setExportStemPicker] = useState(false);
  // Results view state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [soloTrack, setSoloTrack] = useState<string | null>(null);
  const [mutedTracks, setMutedTracks] = useState<Set<string>>(new Set());
  // Real API states
  const [jobId, setJobId] = useState<string | null>(null);
  const [currentJob, setCurrentJob] = useState<Job | null>(null);
  const [stemDownloads, setStemDownloads] = useState<StemDownload[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const switchTheme = useCallback((fn: () => void) => {
    const el = rootRef.current;
    if (el) el.classList.add("theme-switching");
    fn();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { if (el) el.classList.remove("theme-switching"); });
    });
  }, []);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const stemsRef = useRef<HTMLDivElement>(null);
  const formatRef = useRef<HTMLDivElement>(null);
  const extraRef = useRef<HTMLDivElement>(null);

  const duration = 214; // mock duration

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!stemsOpen && !formatOpen && !extraOpen) return;
    const handler = (e: MouseEvent) => {
      if (stemsOpen && stemsRef.current && !stemsRef.current.contains(e.target as Node)) setStemsOpen(false);
      if (formatOpen && formatRef.current && !formatRef.current.contains(e.target as Node)) setFormatOpen(false);
      if (extraOpen && extraRef.current && !extraRef.current.contains(e.target as Node)) setExtraOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [stemsOpen, formatOpen, extraOpen]);

  // Results playback simulation
  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= duration) { setIsPlaying(false); return 0; }
          return prev + 0.05;
        });
      }, 50);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
    return () => { if (playIntervalRef.current) clearInterval(playIntervalRef.current); };
  }, [isPlaying]);

  const handleFile = useCallback((f: File) => { setFile(f); setAppState("file-selected"); }, []);
  const handleSplit = useCallback(async () => {
    if (!file && !isValidUrl) return;
    setAppState("processing");
    setProgress(0);
    progressTargetRef.current = 0; progressDisplayRef.current = 0;
    setStage(isValidUrl ? "Downloading audio..." : STAGES[0]);
    setUploadError(null);
    setCurrentJob(null);
    setStemDownloads([]);

    try {
      let res: Response;
      const mode = stemCount === 2 ? "2stem" : stemCount === 6 ? "6stem" : "4stem";

      if (isValidUrl && inputMode === "url") {
        // URL mode: send JSON — tiny payload, no file through Vercel
        res = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: urlInput, mode }),
        });
        if (!res.ok) {
          let msg = "Upload failed";
          try { const d = await res.json(); msg = d.error || msg; } catch { /* non-JSON */ }
          throw new Error(msg);
        }
        const { jobId: id } = await res.json();
        setJobId(id);
      } else if (file) {
        // File mode: presigned upload — browser PUT directly to R2, bypasses Vercel
        // Step 1: get presigned URL
        const initRes = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, size: file.size, contentType: file.type || "audio/mpeg", mode }),
        });
        if (!initRes.ok) {
          let msg = "Upload failed";
          try { const d = await initRes.json(); msg = d.error || msg; } catch { /* non-JSON */ }
          throw new Error(msg);
        }
        const { jobId: id, uploadUrl } = await initRes.json();

        // Step 2: upload directly to R2 with real progress
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.upload.addEventListener("progress", (e) => {
            if (e.lengthComputable) {
              const p = Math.round((e.loaded / e.total) * 20);
              progressTargetRef.current = p;
            }
          });
          xhr.addEventListener("load", () => { xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload error (${xhr.status})`)); });
          xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
          xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));
          xhr.open("PUT", uploadUrl);
          xhr.setRequestHeader("Content-Type", file.type || "audio/mpeg");
          xhr.send(file);
        });

        // Step 3: confirm and trigger Modal
        const confirmRes = await fetch("/api/upload", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId: id }),
        });
        if (!confirmRes.ok) {
          let msg = "Failed to start processing";
          try { const d = await confirmRes.json(); msg = d.error || msg; } catch { /* non-JSON */ }
          throw new Error(msg);
        }
        progressTargetRef.current = 22;
        setJobId(id);
      } else {
        return;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(msg);
      setAppState("idle");
    }
  }, [file, stemCount, isValidUrl, inputMode, urlInput]);
  const handleNewSplit = useCallback(() => {
    setFile(null); setAppState("idle"); setProgress(0); setStage("");
    setIsPlaying(false); setCurrentTime(0); setSoloTrack(null); setMutedTracks(new Set());
    setJobId(null); setCurrentJob(null); setStemDownloads([]); setUploadError(null);
    progressTargetRef.current = 0; progressDisplayRef.current = 0;
  }, []);

  // rAF loop — advances progress at 1%/s max, 10%/s on completion
  useEffect(() => {
    const tick = (now: number) => {
      const elapsed = progressLastTickRef.current ? now - progressLastTickRef.current : 16;
      progressLastTickRef.current = now;
      const target = progressTargetRef.current;
      const current = progressDisplayRef.current;
      if (current < target) {
        const speed = target >= 100 ? 10 : 1; // %/s
        const step = Math.min((elapsed / 1000) * speed, target - current);
        progressDisplayRef.current = current + step;
        setProgress(Math.floor(progressDisplayRef.current));
      }
      progressRafRef.current = requestAnimationFrame(tick);
    };
    progressRafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(progressRafRef.current);
  }, []);

  // Poll job status when jobId is set
  const jobDoneRef = useRef(false);
  useEffect(() => {
    if (!jobId) return;
    jobDoneRef.current = false;
    let cancelled = false;

    const poll = async () => {
      if (jobDoneRef.current || cancelled) return;
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok || cancelled) return;
        const job: Job = await res.json();
        if (cancelled) return;
        setCurrentJob(job);
        // Remap worker progress (0→100) onto display range (22→100)
        const mapped = job.status === "completed" ? 100 : Math.round(22 + (job.progress / 100) * 78);
        if (mapped > progressTargetRef.current) progressTargetRef.current = mapped;
        if (job.stage) setStage(job.stage);

        if (job.status === "completed") {
          jobDoneRef.current = true;
          // Fetch stem download URLs
          const dlRes = await fetch(`/api/download/${jobId}`);
          if (dlRes.ok && !cancelled) {
            const dlData = await dlRes.json();
            if (dlData.stems) setStemDownloads(dlData.stems);
          }
          // Refresh history so new job appears immediately
          refreshHistory();
          setTimeout(() => { if (!cancelled) setAppState("complete"); }, 400);
        } else if (job.status === "failed") {
          jobDoneRef.current = true;
          setUploadError(job.error || "Processing failed");
          setAppState("idle");
        }
      } catch { /* polling error — will retry */ }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [jobId]);

  const stemLabel = stemCount === 2 ? "2 STEMS" : stemCount === 4 ? "4 STEMS" : "6 STEMS";
  const logoColor = isColorful ? "#FF2D55" : C.accent;
  const activeAgentIdx = PROCESSING_AGENTS.reduce((acc, agent, i) => progress >= agent.threshold ? i : acc, 0);
  const playProgress = duration > 0 ? currentTime / duration : 0;
  const formatTime = (s: number) => { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, "0")}`; };

  // Sort helpers for Files view
  const durToSec = (d?: string) => { if (!d) return 0; const m = d.match(/(\d+)m\s*(\d+)s/); return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0; };
  const toggleSort = (col: typeof sortBy) => { if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortBy(col); setSortDir("asc"); } };

  const searched = history.filter(item => !fileSearch || item.name.toLowerCase().includes(fileSearch.toLowerCase()));
  const sorted = [...searched].sort((a, b) => {
    let cmp = 0;
    switch (sortBy) {
      case "name": cmp = a.name.localeCompare(b.name); break;
      case "duration": cmp = durToSec(a.duration) - durToSec(b.duration); break;
      case "format": cmp = a.format.localeCompare(b.format); break;
      case "bpm": cmp = (a.bpm ?? 0) - (b.bpm ?? 0); break;
      case "key": cmp = (a.key ?? "").localeCompare(b.key ?? ""); break;
      default: cmp = 0;
    }
    return sortDir === "asc" ? cmp : -cmp;
  });

  const allTrackIds = sorted.map(h => h.id);
  const allTracksSelected = allTrackIds.length > 0 && allTrackIds.every(id => selectedTracks.has(id));
  const toggleTrack = (id: string) => setSelectedTracks(prev => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });
  const toggleAllTracks = () => { if (allTracksSelected) setSelectedTracks(new Set()); else setSelectedTracks(new Set(allTrackIds)); };
  const allStemTypes = Array.from(new Set(sorted.filter(h => selectedTracks.has(h.id)).flatMap(h => h.stemList)));
  const toggleExportStem = (stem: string) => setSelectedStems(prev => { const next = new Set(prev); next.has(stem) ? next.delete(stem) : next.add(stem); return next; });
  const allStemsSelected = allStemTypes.length > 0 && allStemTypes.every(s => selectedStems.has(s));
  const toggleAllStems = () => { if (allStemsSelected) setSelectedStems(new Set()); else setSelectedStems(new Set(allStemTypes)); };
  const exitExport = () => { setExportMode(false); setSelectedTracks(new Set()); setSelectedStems(new Set()); setExportStemPicker(false); };

  // Game theme object to pass to game components
  const gameTheme = { bg: C.bg, bgCard: C.bgCard, bgSubtle: C.bgSubtle, bgHover: C.bgHover, bgElevated: C.bgElevated, text: C.text, textSec: C.textSec, textMuted: C.textMuted, accent: C.accent, accentText: C.accentText, badgeBg: C.badgeBg, badgeText: C.badgeText };

  // ─── Stem detail modal ──────────────────────────────────────
  function StemModal({ items, onClose }: { items: HistoryItem[]; onClose: () => void }) {
    const currentItem = items.find(h => h.id === expandedFile);
    if (!currentItem) return null;
    const currentIdx = items.findIndex(h => h.id === expandedFile);
    const prevItem = currentIdx > 0 ? items[currentIdx - 1] : null;
    const nextItem = currentIdx < items.length - 1 ? items[currentIdx + 1] : null;

    return (
      <motion.div key="stem-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} />
        {prevItem && (
          <button onClick={(e) => { e.stopPropagation(); setExpandedFile(prevItem.id); setPlayingStem(null); }}
            className="absolute left-[24px] z-10 flex h-[40px] w-[40px] items-center justify-center transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
            <ChevronLeft className="h-[18px] w-[18px] text-white" strokeWidth={1.8} />
          </button>
        )}
        {nextItem && (
          <button onClick={(e) => { e.stopPropagation(); setExpandedFile(nextItem.id); setPlayingStem(null); }}
            className="absolute right-[24px] z-10 flex h-[40px] w-[40px] items-center justify-center transition-colors"
            style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
            <ChevronRight className="h-[18px] w-[18px] text-white" strokeWidth={1.8} />
          </button>
        )}
        <motion.div initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.15 }} className="relative w-[720px] max-h-[85vh] overflow-y-auto"
          style={{ backgroundColor: C.bgCard }} onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-[24px] py-[18px]" style={{ backgroundColor: C.bgHover }}>
            <div className="flex items-center gap-[14px] min-w-0">
              <div className="flex h-[40px] w-[40px] items-center justify-center shrink-0" style={{ backgroundColor: C.bgSubtle }}>
                <AudioLines className="h-[16px] w-[16px]" style={{ color: C.textMuted }} strokeWidth={1.4} />
              </div>
              <div className="min-w-0">
                <p style={{ fontSize: 16, fontWeight: 600, color: C.text }} className="truncate">{currentItem.name}</p>
                <p style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
                  {currentItem.date} · {currentItem.duration} · {currentItem.bpm} BPM · {currentItem.key} · {currentItem.format.toUpperCase()}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-[6px] transition-colors shrink-0 ml-[12px]" style={{ color: C.textMuted }}>
              <X className="h-[16px] w-[16px]" strokeWidth={1.6} />
            </button>
          </div>
          {/* Settings row */}
          <div className="flex items-center gap-[10px] px-[24px] py-[8px]" style={{ backgroundColor: C.bgSubtle }}>
            <span style={{ fontSize: 12, color: C.textMuted, letterSpacing: "0.05em" }}>SETTINGS:</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: C.accent }}>AI</span>
            <span style={{ fontSize: 13, color: C.textSec }}>{currentItem.model}</span>
            <span style={{ fontSize: 13, color: C.textMuted }}>·</span>
            <span style={{ fontSize: 13, color: C.textSec }}>Quality {currentItem.quality}%</span>
            <span style={{ fontSize: 13, color: C.textMuted }}>·</span>
            <span style={{ fontSize: 13, color: C.textSec }}>Stability {currentItem.stability}%</span>
            <div className="flex-1" />
            <button style={{ fontSize: 13, color: C.textMuted, textDecoration: "underline", letterSpacing: "0.03em" }}>USE AS DEFAULT</button>
          </div>
          {/* Stems */}
          <div className="px-[16px] py-[12px] space-y-[2px]">
            {currentItem.stemList.map((stem, si) => {
              const stemKey = `${currentItem.id}:${stem}`;
              const isPlayingThis = playingStem === stemKey;
              const color = stemColors[stem] || "#999";
              return (
                <div key={stem}
                  className="flex items-center gap-[10px] px-[14px] py-[10px] transition-colors"
                  style={{ backgroundColor: isPlayingThis ? C.bgHover : undefined }}>
                  <button onClick={() => setPlayingStem(isPlayingThis ? null : stemKey)}
                    className="flex h-[28px] w-[28px] items-center justify-center shrink-0 transition-transform active:scale-95"
                    style={{ backgroundColor: color }}>
                    {isPlayingThis
                      ? <Pause className="h-[10px] w-[10px]" style={{ color: "#fff" }} />
                      : <Play className="h-[10px] w-[10px]" style={{ color: "#fff", marginLeft: 1 }} />}
                  </button>
                  <span className="w-[90px] shrink-0" style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.04em", color: C.text }}>{LABELS[stem]}</span>
                  <div className="flex-1 min-w-0">
                    <Waveform seed={(si + 1) * 3571 + parseInt(currentItem.id) * 7919} color={color} playedColor={color} progress={isPlayingThis ? 0.35 : 0} height={28} onSeek={() => {}} barCount={120} />
                  </div>
                  <span style={{ fontSize: 14, color: C.textMuted }}>{currentItem.format.toUpperCase()}</span>
                  <button className="p-[4px]" style={{ color: C.textMuted }}>
                    <Download className="h-[13px] w-[13px]" strokeWidth={1.5} />
                  </button>
                </div>
              );
            })}
          </div>
          {/* Footer */}
          <div className="flex items-center justify-between px-[24px] py-[12px]" style={{ backgroundColor: C.bgSubtle }}>
            <span style={{ fontSize: 14, color: C.textMuted }}>{currentIdx + 1} / {items.length}</span>
            <button className="flex items-center gap-[6px] px-[16px] py-[7px] transition-colors"
              style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.04em", color: C.accentText, backgroundColor: C.accent }}>
              <Download className="h-[12px] w-[12px]" strokeWidth={1.8} />
              DOWNLOAD .ZIP
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // ─── SortIcon helper ──────────────────────────────────────
  const SortIcon = ({ col }: { col: typeof sortBy }) => (
    <ChevronDown className="inline h-[10px] w-[10px] ml-[3px]" strokeWidth={2}
      style={{ opacity: sortBy === col ? 1 : 0.4, transform: sortBy === col && sortDir === "asc" ? "scaleY(-1)" : undefined }} />
  );

  return (
    <div ref={rootRef} className="ableton-root flex h-screen overflow-hidden" style={{ backgroundColor: C.bg, color: C.text, fontFamily: F }}>
      <style>{`
        input::placeholder { color: ${C.textMuted} !important; opacity: 1 !important; }
        button:focus { outline: none !important; }
        .ableton-root, .ableton-root * { border-color: transparent; }
        .ableton-root.theme-switching, .ableton-root.theme-switching * { transition: none !important; animation-duration: 0s !important; }
      `}</style>

      {/* ─── Sidebar ─── */}
      <aside className="flex h-full w-[220px] shrink-0 flex-col" style={{ backgroundColor: C.sidebarBg }}>
        {/* Logo + Version switcher */}
        <div className="relative">
          <button onClick={() => setVersionOpen(!versionOpen)} className="flex w-full items-center justify-between px-[16px]" style={{ height: 52 }}>
            <div className="flex items-center gap-[8px]">
              <div className="flex h-[24px] w-[24px] items-center justify-center" style={{ backgroundColor: logoColor }}>
                <svg className="h-[12px] w-[12px]" style={{ color: "#fff" }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="square">
                  <path d="M2 12v3"/><path d="M6 7v10"/><path d="M10 3v18"/><path d="M14 6v12"/><path d="M18 4v16"/><path d="M22 9v6"/>
                </svg>
              </div>
              <div className="flex flex-col">
                <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.05em", color: C.text }}>44STEMS</span>
                <span style={{ fontSize: 10, color: C.textMuted, letterSpacing: "0.03em" }}>ABLETON</span>
              </div>
            </div>
            <ChevronsUpDown className="h-[12px] w-[12px]" style={{ color: C.textMuted }} strokeWidth={2} />
          </button>
          {versionOpen && (
            <div className="absolute left-[8px] right-[8px] top-[52px] z-50 py-[4px]" style={{ backgroundColor: C.bgCard }}>
              <div className="px-[12px] py-[6px]">
                <span style={{ fontSize: 10, color: C.textMuted, letterSpacing: "0.05em" }}>VERSIONS</span>
              </div>
              <div className="flex items-center gap-[8px] px-[12px] py-[8px]"
                style={{ color: C.text, fontSize: 14, fontWeight: 500, backgroundColor: C.navActive }}>
                <Layers className="h-[14px] w-[14px]" strokeWidth={1.6} />
                ABLETON
              </div>
              <Link href="/elevenlabs" onClick={() => setVersionOpen(false)}
                className="flex items-center gap-[8px] px-[12px] py-[8px] transition-colors"
                style={{ color: C.textSec, fontSize: 14, fontWeight: 500 }}>
                <Layers className="h-[14px] w-[14px]" strokeWidth={1.6} />
                ELEVENLABS
              </Link>
            </div>
          )}
        </div>

        {/* Nav — 5 views (custom geometric icons) */}
        <nav className="flex-1 px-[8px] pt-[12px] space-y-[2px]">
          {([
            { id: "split" as View, label: "SPLIT AUDIO", svg: (c: string) => (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="5" width="1.8" height="6" fill={c} opacity="0.5"/>
                <rect x="4.8" y="3" width="1.8" height="10" fill={c} opacity="0.7"/>
                <rect x="7.6" y="1" width="1.8" height="14" fill={c}/>
                <rect x="10.4" y="4" width="1.8" height="8" fill={c} opacity="0.7"/>
                <rect x="13.2" y="6" width="1.8" height="4" fill={c} opacity="0.5"/>
              </svg>
            )},
            { id: "results" as View, label: "RESULTS", svg: (c: string) => (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="3" width="12" height="2" fill={c} opacity="0.9"/>
                <rect x="2" y="7" width="9" height="2" fill={c} opacity="0.6"/>
                <rect x="2" y="11" width="11" height="2" fill={c} opacity="0.3"/>
              </svg>
            )},
            { id: "files" as View, label: "MY FILES", svg: (c: string) => (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="4" y="2" width="8" height="2" fill={c} opacity="0.3"/>
                <rect x="3" y="5" width="10" height="2" fill={c} opacity="0.55"/>
                <rect x="2" y="8" width="12" height="6" fill={c} opacity="0.9"/>
              </svg>
            )},
            { id: "stats" as View, label: "STATISTICS", svg: (c: string) => (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="10" width="2.5" height="4" fill={c} opacity="0.45"/>
                <rect x="5.5" y="6" width="2.5" height="8" fill={c} opacity="0.65"/>
                <rect x="9" y="3" width="2.5" height="11" fill={c}/>
                <rect x="12.5" y="7" width="2.5" height="7" fill={c} opacity="0.55"/>
              </svg>
            )},
            { id: "games" as View, label: "GAMES", svg: (c: string) => (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5.5" height="5.5" fill={c} opacity="0.9"/>
                <rect x="8.5" y="2" width="5.5" height="5.5" fill={c} opacity="0.5"/>
                <rect x="2" y="8.5" width="5.5" height="5.5" fill={c} opacity="0.5"/>
                <rect x="8.5" y="8.5" width="5.5" height="5.5" fill={c} opacity="0.3"/>
              </svg>
            )},
            { id: "settings" as View, label: "SETTINGS", svg: (c: string) => (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="3" width="12" height="1.5" fill={c} opacity="0.25"/>
                <rect x="2" y="7.25" width="12" height="1.5" fill={c} opacity="0.25"/>
                <rect x="2" y="11.5" width="12" height="1.5" fill={c} opacity="0.25"/>
                <rect x="3.5" y="1.75" width="3" height="3" fill={c}/>
                <rect x="9" y="6" width="3" height="3" fill={c} opacity="0.7"/>
                <rect x="5.5" y="10.25" width="3" height="3" fill={c} opacity="0.45"/>
              </svg>
            )},
          ]).map(item => {
            const isActive = view === item.id;
            const iconColor = isColorful && isActive ? NAV_COLORS[item.id] : (isActive ? C.text : C.textSec);
            return (
              <button key={item.id} onClick={() => { setView(item.id); setActiveGame(""); }}
                className="flex w-full items-center gap-[10px] px-[10px] py-[9px] transition-colors"
                style={{
                  backgroundColor: isActive ? C.navActive : "transparent",
                  fontSize: 14, fontWeight: 500, letterSpacing: "0.04em",
                  color: isActive ? C.text : C.textSec,
                }}>
                <div className="w-[16px] h-[16px] shrink-0">{item.svg(iconColor)}</div>
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Bottom: style toggle + upgrade */}
        <div style={{ backgroundColor: C.bgSubtle }} className="px-[8px] py-[6px] space-y-[1px]">
          <button onClick={() => switchTheme(() => setStyle(style === "classic" ? "colorful" : "classic"))}
            className="flex w-full items-center gap-[10px] px-[10px] py-[9px] transition-colors"
            style={{ fontSize: 14, fontWeight: 500, letterSpacing: "0.04em", color: isColorful ? "#FF9500" : C.textSec }}>
            <Palette className="h-[16px] w-[16px]" strokeWidth={1.6} style={{ color: isColorful ? "#FF9500" : C.textSec }} />
            {isColorful ? "COLORFUL" : "CLASSIC"}
          </button>
          <button className="flex w-full items-center gap-[10px] px-[10px] py-[9px] transition-colors"
            style={{ fontSize: 14, fontWeight: 500, letterSpacing: "0.04em", color: C.textSec }}>
            <Sparkles className="h-[16px] w-[16px]" strokeWidth={1.6} />
            UPGRADE
          </button>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div className="flex flex-1 flex-col overflow-hidden">

        {/* Top bar */}
        <div className="flex h-[52px] shrink-0 items-center justify-between px-[24px]" style={{ backgroundColor: C.bgSubtle }}>
          <div />
          <div className="flex items-center gap-[4px]">
            {/* Pills */}
            <button className="px-[12px] py-[6px] transition-colors" style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.04em", color: C.textSec, backgroundColor: C.bgHover }}>FEEDBACK</button>
            <button className="px-[12px] py-[6px] transition-colors" style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.04em", color: C.textSec, backgroundColor: C.bgHover }}>DOCS</button>
            <button className="flex items-center gap-[4px] px-[12px] py-[6px] transition-colors" style={{ fontSize: 13, fontWeight: 500, letterSpacing: "0.04em", color: C.textSec, backgroundColor: C.bgHover }}>
              <HelpCircle className="h-[13px] w-[13px]" strokeWidth={1.8} />
              ASK
            </button>
            <div className="w-[1px] h-[16px] mx-[6px]" style={{ backgroundColor: C.textMuted, opacity: 0.3 }} />
            <button onClick={() => switchTheme(() => setIsDark(!isDark))}
              className="p-[8px]" style={{ color: C.textSec }}>
              {isDark ? <Sun className="h-[16px] w-[16px]" strokeWidth={1.6} /> : <Moon className="h-[16px] w-[16px]" strokeWidth={1.6} />}
            </button>
            <button className="p-[8px]" style={{ color: C.textSec }}>
              <Bell className="h-[16px] w-[16px]" strokeWidth={1.6} />
            </button>
            <div className="flex h-[26px] w-[26px] items-center justify-center" style={{ backgroundColor: isColorful ? "#FF2D55" : C.accent }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>V</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto" style={{ scrollbarGutter: "stable" }}>

          {/* ═══ SPLIT AUDIO ═══ */}
          {view === "split" && (
            <div className="px-[24px] pt-[24px] pb-[40px]">
              <div style={{ maxWidth: 900, margin: "0 auto" }}>

                {(appState === "idle" || appState === "file-selected") && (
                  <>
                    <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: C.text, marginBottom: 24 }}>
                      Split Audio
                    </h2>

                    <input ref={inputRef} type="file" className="hidden" accept=".mp3,.wav,.flac,.ogg,.m4a,.aac"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

                    {/* Tabs: UPLOAD | LINK */}
                    <div className="flex items-center gap-[20px] mb-[8px]">
                      {([["file", "UPLOAD"], ["url", "LINK"]] as const).map(([mode, label]) => (
                        <button key={mode} onClick={() => { setInputMode(mode); if (mode === "file") setUrlInput(""); if (mode === "url") { setFile(null); setAppState("idle"); } }}
                          className="pb-[6px] text-[14px] font-semibold transition-colors"
                          style={{
                            color: inputMode === mode ? C.text : C.textMuted,
                            borderBottom: inputMode === mode ? `2px solid ${C.text}` : "2px solid transparent",
                            letterSpacing: "0.04em",
                          }}>
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Drop zone / URL input */}
                    {inputMode === "url" ? (
                      <div className="flex items-center justify-center transition-all"
                        style={{ minHeight: 160, backgroundColor: C.dropZoneBg, position: "relative" }}>
                        {isValidUrl ? (
                          <div className="flex flex-col items-center justify-center w-full" style={{ position: "relative" }}>
                            <div className="flex items-center gap-[10px]">
                              <span style={{ fontSize: 11, fontWeight: 700, color: C.textSec, letterSpacing: "0.06em", padding: "4px 10px", backgroundColor: C.bgHover }}>{detectedPlatform}</span>
                              <span style={{ fontSize: 14, color: C.textSec }}>{urlInput}</span>
                            </div>
                            <button onClick={() => setUrlInput("")}
                              style={{ fontSize: 14, color: C.textMuted, textDecoration: "underline", letterSpacing: "0.03em", position: "absolute", bottom: -30 }}>REMOVE</button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center w-full" style={{ position: "relative" }}>
                            <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} autoFocus
                              placeholder="PASTE LINK HERE"
                              className="w-full bg-transparent outline-none"
                              style={{ fontSize: 15, color: urlInput ? C.text : C.textMuted, letterSpacing: "0.02em", caretColor: C.textMuted, textAlign: "center" }} />
                            <div className="flex items-center gap-[8px]" style={{ position: "absolute", bottom: -30 }}>
                              {PLATFORMS.map(p => (
                                <span key={p.name} style={{ fontSize: 10, fontWeight: 600, color: C.textMuted, letterSpacing: "0.05em", opacity: 0.5 }}>{p.name}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div
                        onClick={() => !file && inputRef.current?.click()}
                        onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
                        onDragOver={(e) => e.preventDefault()}
                        className="flex items-center justify-center transition-all"
                        style={{ minHeight: 160, backgroundColor: C.dropZoneBg, cursor: file ? "default" : "pointer", position: "relative" }}>
                        {file ? (
                          <div className="flex flex-col items-center justify-center w-full" style={{ position: "relative" }}>
                            <div className="flex items-center gap-[10px]">
                              <span style={{ fontSize: 11, fontWeight: 700, color: C.textSec, letterSpacing: "0.06em", padding: "4px 10px", backgroundColor: C.bgHover }}>{file.name.split(".").pop()?.toUpperCase()}</span>
                              <span style={{ fontSize: 14, color: C.textSec }}>{file.name}</span>
                              <span style={{ fontSize: 13, color: C.textMuted }}>{(file.size / 1048576).toFixed(1)} MB</span>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); setFile(null); setAppState("idle"); }}
                              style={{ fontSize: 14, color: C.textMuted, textDecoration: "underline", letterSpacing: "0.03em", position: "absolute", bottom: -30 }}>REMOVE</button>
                          </div>
                        ) : (
                          <span style={{ fontSize: 15, color: C.textMuted, letterSpacing: "0.02em" }}>DROP FILES HERE</span>
                        )}
                      </div>
                    )}

                    {/* Action bar */}
                    <div className="flex items-center justify-between" style={{ marginTop: 12 }}>
                      <div className="flex items-center gap-[4px]">
                        <button onClick={() => { setInputMode("file"); inputRef.current?.click(); }} className="p-[8px] transition-colors" style={{ color: C.textSec }}>
                          <Upload className="h-[16px] w-[16px]" strokeWidth={1.6} />
                        </button>
                        <button className="p-[8px]" style={{ color: C.textSec }}>
                          <Mic className="h-[16px] w-[16px]" strokeWidth={1.6} />
                        </button>
                        <div className="w-[1px] h-[14px] mx-[6px]" style={{ backgroundColor: C.textMuted, opacity: 0.3 }} />
                        {/* Stems selector */}
                        <div className="relative" ref={stemsRef}>
                          <button onClick={() => { setStemsOpen(!stemsOpen); setFormatOpen(false); setExtraOpen(false); }}
                            className="flex items-center gap-[4px] px-[8px] py-[6px] transition-colors"
                            style={{ fontSize: 15, fontWeight: 500, color: C.textSec, letterSpacing: "0.03em", backgroundColor: stemsOpen ? C.bgHover : undefined }}>
                            {stemLabel}
                            <ChevronDown className="h-[11px] w-[11px]" style={{ color: C.textMuted }} strokeWidth={2} />
                          </button>
                          <AnimatePresence>
                            {stemsOpen && (
                              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                transition={{ duration: 0.1 }} className="absolute left-0 top-full mt-[2px] z-30 w-[220px]"
                                style={{ backgroundColor: C.bgCard }}>
                                {STEM_OPTIONS.map(opt => (
                                  <button key={opt.value} onClick={() => { setStemCount(opt.value); setStemsOpen(false); }}
                                    className="flex w-full items-center gap-[8px] px-[12px] py-[10px] text-left transition-colors"
                                    style={{ backgroundColor: stemCount === opt.value ? C.bgHover : undefined }}>
                                    <div>
                                      <p style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.02em", color: C.text }}>{opt.label.toUpperCase()}</p>
                                      <p style={{ fontSize: 13, color: C.textMuted }}>{opt.desc}</p>
                                    </div>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        {/* Format selector */}
                        <div className="relative" ref={formatRef}>
                          <button onClick={() => { setFormatOpen(!formatOpen); setStemsOpen(false); setExtraOpen(false); }}
                            className="flex items-center gap-[4px] px-[8px] py-[6px] transition-colors"
                            style={{ fontSize: 15, fontWeight: 500, color: C.textSec, letterSpacing: "0.03em", backgroundColor: formatOpen ? C.bgHover : undefined }}>
                            {outputFormat.toUpperCase()}
                            <ChevronDown className="h-[11px] w-[11px]" style={{ color: C.textMuted }} strokeWidth={2} />
                          </button>
                          <AnimatePresence>
                            {formatOpen && (
                              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                transition={{ duration: 0.1 }} className="absolute left-0 top-full mt-[2px] z-30 w-[180px]"
                                style={{ backgroundColor: C.bgCard }}>
                                {([["wav", "WAV (LOSSLESS)"], ["mp3", "MP3 (128KBPS)"]] as const).map(([val, label]) => (
                                  <button key={val} onClick={() => { setOutputFormat(val as OutputFormat); setFormatOpen(false); }}
                                    className="flex w-full px-[12px] py-[10px] text-left transition-colors"
                                    style={{ fontSize: 15, fontWeight: outputFormat === val ? 600 : 400, backgroundColor: outputFormat === val ? C.bgHover : undefined, color: C.text, letterSpacing: "0.02em" }}>
                                    {label}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        {/* Gear popover */}
                        <div className="relative" ref={extraRef}>
                          <button onClick={() => { setExtraOpen(!extraOpen); setStemsOpen(false); setFormatOpen(false); }}
                            className="p-[8px] transition-colors" style={{ color: extraOpen ? C.text : C.textSec, backgroundColor: extraOpen ? C.bgHover : undefined }}>
                            <Settings2 className="h-[15px] w-[15px]" strokeWidth={1.6} />
                          </button>
                          <AnimatePresence>
                            {extraOpen && (
                              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                transition={{ duration: 0.1 }} className="absolute left-0 top-full mt-[4px] z-30 w-[280px]"
                                style={{ backgroundColor: C.bgCard }}>
                                <div className="px-[16px] py-[12px]" style={{ backgroundColor: C.bgHover }}>
                                  <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.04em" }}>ADVANCED SETTINGS</span>
                                </div>
                                <div className="px-[16px] py-[14px] space-y-[16px]">
                                  <div className="space-y-[6px]">
                                    <label style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, letterSpacing: "0.04em" }}>MODEL</label>
                                    <button className="flex w-full items-center gap-[8px] px-[10px] py-[7px] transition-colors"
                                      style={{ backgroundColor: C.bgHover }}>
                                      <div className="flex h-[16px] items-center px-[4px]" style={{ backgroundColor: C.accent }}>
                                        <span style={{ fontSize: 8, fontWeight: 700, color: "#fff" }}>AI</span>
                                      </div>
                                      <span style={{ fontSize: 15, fontWeight: 500 }} className="flex-1 text-left">MelBand RoFormer</span>
                                      <ChevronDown className="h-[11px] w-[11px]" style={{ color: C.textMuted }} strokeWidth={2} />
                                    </button>
                                  </div>
                                  <div className="space-y-[6px]">
                                    <label style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, letterSpacing: "0.04em" }}>STABILITY</label>
                                    <input type="range" min={0} max={1} step={0.01} defaultValue={0.75} className="w-full h-[3px] cursor-pointer" style={{ accentColor: C.accent }} />
                                  </div>
                                  <div className="space-y-[6px]">
                                    <label style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, letterSpacing: "0.04em" }}>QUALITY</label>
                                    <input type="range" min={0} max={1} step={0.01} defaultValue={0.7} className="w-full h-[3px] cursor-pointer" style={{ accentColor: C.accent }} />
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span style={{ fontSize: 14, letterSpacing: "0.03em" }}>CLEAN VOCALS</span>
                                    <button className="relative h-[20px] w-[38px]" style={{ backgroundColor: C.bgHover }} aria-label="Toggle">
                                      <div className="absolute left-[2px] top-[2px] h-[16px] w-[16px]" style={{ backgroundColor: C.bgCard }} />
                                    </button>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className="flex items-center gap-[10px]">
                        <span style={{ fontSize: 15, color: C.textMuted }}>0 / 10,000 credits</span>
                        <button onClick={handleSplit} disabled={!canSplit}
                          className="flex items-center gap-[6px] px-[16px] py-[8px] transition-all disabled:opacity-25 disabled:cursor-not-allowed"
                          style={{ backgroundColor: canSplit ? C.accent : C.textMuted, color: C.accentText, fontSize: 15, fontWeight: 600, letterSpacing: "0.03em" }}>
                          SPLIT
                        </button>
                      </div>
                    </div>

                    {/* Upload error */}
                    {uploadError && (
                      <div className="flex items-center gap-[10px] px-[14px] py-[10px] mt-[8px]" style={{ backgroundColor: "rgba(255,59,48,0.1)" }}>
                        <span style={{ fontSize: 14, color: "#FF3B30", fontWeight: 500 }}>{uploadError}</span>
                        <button onClick={() => setUploadError(null)} style={{ fontSize: 13, color: "#FF3B30", textDecoration: "underline" }}>DISMISS</button>
                      </div>
                    )}

                    {/* Recent splits — 4 style variants */}
                    <div style={{ marginTop: 40 }}>
                      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 20, color: C.text }}>Recent splits</h2>

                      <div style={{ backgroundColor: C.bgCard }}>
                        <div className="flex items-center gap-[10px] px-[16px] py-[12px]" style={{ borderBottom: `1px solid ${C.bgHover}` }}>
                          <Search className="h-[15px] w-[15px] shrink-0" style={{ color: C.textMuted }} strokeWidth={1.6} />
                          <input type="text" placeholder="SEARCH HISTORY" className="flex-1 bg-transparent text-[14px] outline-none placeholder:text-[14px]" style={{ color: C.text, letterSpacing: "0.03em" }} />
                        </div>
                        <div className="flex items-center px-[16px] py-[10px]" style={{ color: C.textMuted, fontSize: 13, fontWeight: 500, letterSpacing: "0.04em", borderBottom: `1px solid ${C.bgHover}` }}>
                          <span className="flex-1">NAME</span>
                          <span className="w-[80px] text-right">DURATION</span>
                          <span className="w-[80px] text-right">FORMAT</span>
                          <span className="w-[72px]" />
                        </div>
                        {history.map((item, i) => (
                          <div key={item.id}
                            className="flex items-center px-[16px] py-[14px] cursor-pointer transition-colors"
                            style={i < history.length - 1 ? { borderBottom: `1px solid ${C.bgHover}` } : undefined}
                            onClick={() => setExpandedFile(item.id)}>
                            <div className="flex items-center gap-[12px] flex-1 min-w-0">
                              <div className="flex h-[36px] w-[36px] items-center justify-center shrink-0" style={{ backgroundColor: C.bgHover }}>
                                <AudioLines className="h-[15px] w-[15px]" style={{ color: C.textMuted }} strokeWidth={1.4} />
                              </div>
                              <div className="min-w-0">
                                <p style={{ fontSize: 15, fontWeight: 500, color: C.text }} className="truncate">{item.name}</p>
                                <p style={{ fontSize: 14, color: C.textMuted, marginTop: 1 }}>{item.date} · {item.stems} stems</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-[6px] shrink-0 mr-[8px]">
                              <span style={{ fontSize: 11, fontWeight: 600, color: C.badgeText, backgroundColor: C.badgeBg, padding: "2px 6px", letterSpacing: "0.03em" }}>{item.bpm} BPM</span>
                              <span style={{ fontSize: 11, fontWeight: 600, color: C.badgeText, backgroundColor: C.badgeBg, padding: "2px 6px" }}>{item.key}</span>
                            </div>
                            <span className="w-[80px] text-right" style={{ fontSize: 15, color: C.textMuted }}>{item.duration}</span>
                            <span className="w-[80px] text-right" style={{ fontSize: 15, color: C.textMuted }}>{item.format.toUpperCase()}</span>
                            <div className="flex items-center justify-end gap-[2px] w-[72px]">
                              <button onClick={(e) => e.stopPropagation()} className="p-[5px]" style={{ color: C.textMuted }}><Download className="h-[14px] w-[14px]" strokeWidth={1.5} /></button>
                              <button onClick={(e) => e.stopPropagation()} className="p-[5px]" style={{ color: C.textMuted }}><Trash2 className="h-[14px] w-[14px]" strokeWidth={1.5} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stem detail modal — Recent splits */}
                    <AnimatePresence>
                      {expandedFile && <StemModal items={history} onClose={() => setExpandedFile(null)} />}
                    </AnimatePresence>
                  </>
                )}

                {/* Processing */}
                {appState === "processing" && <ProcessingSection progress={progress} activeAgentIdx={activeAgentIdx} C={C} isColorful={isColorful} />}

                {/* Complete — Results view */}
                {appState === "complete" && (
                  <StemVariants
                    stemCount={stemCount}
                    stemMap={STEM_MAP}
                    labels={LABELS}
                    stemColors={stemColors}
                    C={C}
                    isDark={isDark}
                    fileName={file?.name}
                    onNewSplit={handleNewSplit}
                    bpm={currentJob?.bpm}
                    stemKey={currentJob?.key}
                    keyRaw={currentJob?.key_raw}
                    realStemList={currentJob?.stems}
                    jobId={jobId || undefined}
                    stemUrls={stemDownloads.length > 0 ? Object.fromEntries(stemDownloads.map(s => [s.name, s.url])) : undefined}
                  />
                )}
              </div>
            </div>
          )}

          {/* ═══ RESULTS ═══ */}
          {view === "results" && (
            <div className="px-[24px] pt-[24px] pb-[40px] overflow-y-auto flex-1">
              <div style={{ maxWidth: 900, margin: "0 auto" }}>
                {currentJob?.status === "completed" ? (
                  <StemVariants
                    stemCount={stemCount}
                    stemMap={STEM_MAP}
                    labels={LABELS}
                    stemColors={stemColors}
                    C={C}
                    isDark={isDark}
                    fileName={file?.name}
                    onNewSplit={() => { handleNewSplit(); setView("split"); }}
                    bpm={currentJob?.bpm}
                    stemKey={currentJob?.key}
                    keyRaw={currentJob?.key_raw}
                    realStemList={currentJob?.stems}
                    jobId={jobId || undefined}
                    stemUrls={stemDownloads.length > 0 ? Object.fromEntries(stemDownloads.map(s => [s.name, s.url])) : undefined}
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-[80px]">
                    <div className="flex h-[48px] w-[48px] items-center justify-center" style={{ backgroundColor: C.bgHover }}>
                      <AudioLines className="h-[22px] w-[22px]" style={{ color: C.textMuted }} strokeWidth={1.5} />
                    </div>
                    <p style={{ fontSize: 15, color: C.textMuted, marginTop: 12, letterSpacing: "0.03em" }}>NO RESULTS YET — SPLIT A TRACK FIRST</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ MY FILES ═══ */}
          {view === "files" && (
            <>
              <div className="px-[24px] pt-[24px] pb-[40px]">
                <div style={{ maxWidth: 900, margin: "0 auto" }}>
                  {/* Header */}
                  <div className="flex items-center justify-between mb-[24px]">
                    <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: C.text }}>My Files</h2>
                    <div className="flex items-center gap-[8px]">
                      {exportMode && (
                        <button onClick={exitExport} className="px-[14px] py-[8px] transition-colors"
                          style={{ fontSize: 15, fontWeight: 500, color: C.textMuted, letterSpacing: "0.03em" }}>CANCEL</button>
                      )}
                      <button onClick={() => { if (exportMode) { if (selectedTracks.size > 0) setExportStemPicker(true); } else setExportMode(true); }}
                        className="flex items-center gap-[6px] px-[14px] py-[8px] transition-colors"
                        style={{
                          fontSize: 15, fontWeight: 500, letterSpacing: "0.03em",
                          color: exportMode && selectedTracks.size > 0 ? C.accentText : C.textSec,
                          backgroundColor: exportMode && selectedTracks.size > 0 ? C.text : C.bgHover,
                          cursor: exportMode && selectedTracks.size === 0 ? "not-allowed" : "pointer",
                        }}>
                        <Download className="h-[13px] w-[13px]" strokeWidth={1.6} />
                        {exportMode ? `EXPORT${selectedTracks.size > 0 ? ` (${selectedTracks.size})` : ""}` : "EXPORT"}
                      </button>
                    </div>
                  </div>

                  {/* Contained card — same style as Recent splits V2 */}
                  <div style={{ backgroundColor: C.bgCard, overflow: "hidden" }}>
                    {/* Search */}
                    <div className="flex items-center gap-[10px] px-[16px] py-[12px]" style={{ borderBottom: `1px solid ${C.bgHover}` }}>
                      <Search className="h-[15px] w-[15px] shrink-0" style={{ color: C.textMuted }} strokeWidth={1.6} />
                      <input type="text" value={fileSearch} onChange={e => setFileSearch(e.target.value)}
                        placeholder="SEARCH FILES" className="flex-1 bg-transparent text-[14px] outline-none"
                        style={{ color: C.text, letterSpacing: "0.03em" }} />
                    </div>
                    {/* Column headers */}
                    <div className="flex items-center px-[16px] py-[10px] select-none" style={{ color: C.textMuted, fontSize: 13, fontWeight: 500, letterSpacing: "0.04em", borderBottom: `1px solid ${C.bgHover}` }}>
                      {exportMode && (
                        <button onClick={toggleAllTracks} className="w-[28px] shrink-0 flex items-center">
                          {allTracksSelected
                            ? <SquareCheckBig className="h-[13px] w-[13px]" style={{ color: C.text }} strokeWidth={1.8} />
                            : <Square className="h-[13px] w-[13px]" strokeWidth={1.6} />}
                        </button>
                      )}
                      <button onClick={() => toggleSort("name")} className="flex-1 text-left flex items-center cursor-pointer outline-none focus:outline-none">NAME <SortIcon col="name" /></button>
                      <button onClick={() => toggleSort("bpm")} className="w-[60px] text-right flex items-center justify-end cursor-pointer outline-none focus:outline-none">BPM <SortIcon col="bpm" /></button>
                      <button onClick={() => toggleSort("key")} className="w-[50px] text-right flex items-center justify-end cursor-pointer outline-none focus:outline-none">KEY <SortIcon col="key" /></button>
                      <button onClick={() => toggleSort("duration")} className="w-[80px] text-right flex items-center justify-end cursor-pointer outline-none focus:outline-none">DURATION <SortIcon col="duration" /></button>
                      <button onClick={() => toggleSort("format")} className="w-[80px] text-right flex items-center justify-end cursor-pointer outline-none focus:outline-none">FORMAT <SortIcon col="format" /></button>
                      <span className="w-[72px]" />
                    </div>
                    {/* Rows */}
                    {sorted.map((item, i) => {
                      const isTrackSelected = selectedTracks.has(item.id);
                      return (
                        <div key={item.id}
                          className="flex items-center px-[16px] py-[14px] cursor-pointer transition-colors"
                          style={i < sorted.length - 1 ? { borderBottom: `1px solid ${C.bgHover}` } : undefined}
                          onClick={() => exportMode ? toggleTrack(item.id) : setExpandedFile(item.id)}>
                          {exportMode && (
                            <button onClick={(e) => { e.stopPropagation(); toggleTrack(item.id); }} className="w-[28px] shrink-0 flex items-center">
                              {isTrackSelected
                                ? <SquareCheckBig className="h-[14px] w-[14px]" style={{ color: C.text }} strokeWidth={1.8} />
                                : <Square className="h-[14px] w-[14px]" style={{ color: C.textMuted }} strokeWidth={1.6} />}
                            </button>
                          )}
                          <div className="flex items-center gap-[12px] flex-1 min-w-0">
                            <div className="flex h-[36px] w-[36px] items-center justify-center shrink-0" style={{ backgroundColor: C.bgHover }}>
                              <AudioLines className="h-[15px] w-[15px]" style={{ color: C.textMuted }} strokeWidth={1.4} />
                            </div>
                            <div className="min-w-0">
                              <p style={{ fontSize: 15, fontWeight: 500, color: C.text }} className="truncate">{item.name}</p>
                              <p style={{ fontSize: 14, color: C.textMuted, marginTop: 1 }}>{item.date} · {item.stems} stems</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-[6px] shrink-0 mr-[8px]">
                            <span style={{ fontSize: 11, fontWeight: 600, color: C.badgeText, backgroundColor: C.badgeBg, padding: "2px 6px", letterSpacing: "0.03em" }}>{item.bpm} BPM</span>
                            <span style={{ fontSize: 11, fontWeight: 600, color: C.badgeText, backgroundColor: C.badgeBg, padding: "2px 6px" }}>{item.key}</span>
                          </div>
                          <span className="w-[80px] text-right" style={{ fontSize: 15, color: C.textMuted }}>{item.duration}</span>
                          <span className="w-[80px] text-right" style={{ fontSize: 15, color: C.textMuted }}>{item.format.toUpperCase()}</span>
                          <div className="flex items-center justify-end gap-[2px] w-[72px]">
                            <button onClick={(e) => e.stopPropagation()} className="p-[5px]" style={{ color: C.textMuted }}>
                              <Download className="h-[14px] w-[14px]" strokeWidth={1.5} />
                            </button>
                            <button onClick={(e) => e.stopPropagation()} className="p-[5px]" style={{ color: C.textMuted }}>
                              <Trash2 className="h-[14px] w-[14px]" strokeWidth={1.5} />
                            </button>
                          </div>
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
                    className="fixed inset-0 z-50 flex items-center justify-center" onClick={() => setExportStemPicker(false)}>
                    <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.5)" }} />
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.15 }} className="relative w-[400px] overflow-hidden"
                      style={{ backgroundColor: C.bgCard }} onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-between px-[20px] py-[16px]" style={{ backgroundColor: C.bgHover }}>
                        <div>
                          <p style={{ fontSize: 16, fontWeight: 600, color: C.text, letterSpacing: "0.03em" }}>EXPORT STEMS</p>
                          <p style={{ fontSize: 14, color: C.textMuted, marginTop: 2 }}>{selectedTracks.size} track{selectedTracks.size > 1 ? "s" : ""} selected</p>
                        </div>
                        <button onClick={() => setExportStemPicker(false)} className="p-[6px]" style={{ color: C.textMuted }}>
                          <X className="h-[16px] w-[16px]" strokeWidth={1.6} />
                        </button>
                      </div>
                      <div className="px-[20px] py-[16px] space-y-[2px]">
                        <button onClick={toggleAllStems}
                          className="flex w-full items-center gap-[10px] px-[12px] py-[10px] transition-colors" style={{ marginBottom: 4 }}>
                          {allStemsSelected
                            ? <SquareCheckBig className="h-[15px] w-[15px]" style={{ color: C.text }} strokeWidth={1.8} />
                            : <Square className="h-[15px] w-[15px]" style={{ color: C.textMuted }} strokeWidth={1.6} />}
                          <span style={{ fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: "0.03em" }}>ALL STEMS</span>
                        </button>
                        {allStemTypes.map(stem => {
                          const color = stemColors[stem] || "#999";
                          const isChecked = selectedStems.has(stem);
                          return (
                            <button key={stem} onClick={() => toggleExportStem(stem)}
                              className="flex w-full items-center gap-[10px] px-[12px] py-[10px] transition-colors">
                              {isChecked
                                ? <SquareCheckBig className="h-[15px] w-[15px]" style={{ color: C.text }} strokeWidth={1.8} />
                                : <Square className="h-[15px] w-[15px]" style={{ color: C.textMuted }} strokeWidth={1.6} />}
                              <div className="h-[8px] w-[8px] shrink-0" style={{ backgroundColor: color }} />
                              <span style={{ fontSize: 15, fontWeight: 500, color: C.text, letterSpacing: "0.03em" }}>{LABELS[stem]}</span>
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex items-center justify-end gap-[8px] px-[20px] py-[14px]" style={{ backgroundColor: C.bgSubtle }}>
                        <button onClick={() => setExportStemPicker(false)}
                          className="px-[16px] py-[8px] transition-colors"
                          style={{ fontSize: 15, fontWeight: 500, color: C.textSec, letterSpacing: "0.03em" }}>CANCEL</button>
                        <button onClick={() => { setExportStemPicker(false); exitExport(); }}
                          disabled={selectedStems.size === 0}
                          className="px-[16px] py-[8px] transition-all disabled:opacity-30"
                          style={{ fontSize: 15, fontWeight: 600, color: C.accentText, backgroundColor: C.text, letterSpacing: "0.03em" }}>
                          DOWNLOAD {selectedStems.size > 0 ? `${selectedTracks.size * selectedStems.size} FILES` : ""}
                        </button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Stem detail modal — Files */}
              <AnimatePresence>
                {expandedFile && !exportMode && <StemModal items={sorted} onClose={() => setExpandedFile(null)} />}
              </AnimatePresence>
            </>
          )}

          {/* ═══ STATISTICS ═══ */}
          {view === "stats" && (() => {
            const totalTracks = history.length;
            const totalStems = history.reduce((acc, h) => acc + h.stemList.length, 0);
            const totalMinutes = history.reduce((acc, h) => { const m = h.duration?.match(/(\d+)m\s*(\d+)s/); return acc + (m ? parseInt(m[1]) + parseInt(m[2]) / 60 : 0); }, 0);
            const formatCounts: Record<string, number> = {}; history.forEach(h => { formatCounts[h.format] = (formatCounts[h.format] || 0) + 1; });
            const topFormat = Object.entries(formatCounts).sort((a, b) => b[1] - a[1])[0];
            const stemCounts: Record<string, number> = {}; history.forEach(h => h.stemList.forEach(s => { stemCounts[s] = (stemCounts[s] || 0) + 1; }));
            const topStem = Object.entries(stemCounts).sort((a, b) => b[1] - a[1])[0];
            const bpmTracks = history.filter(h => h.bpm != null);
            const avgBpm = bpmTracks.length > 0 ? Math.round(bpmTracks.reduce((acc, h) => acc + h.bpm!, 0) / bpmTracks.length) : null;
            const keyCounts: Record<string, number> = {}; history.forEach(h => { if (h.key) keyCounts[h.key] = (keyCounts[h.key] || 0) + 1; });
            const topKey = Object.entries(keyCounts).sort((a, b) => b[1] - a[1])[0];
            const stemCountCounts: Record<number, number> = {}; history.forEach(h => { stemCountCounts[h.stems] = (stemCountCounts[h.stems] || 0) + 1; });
            const topStemCount = Object.entries(stemCountCounts).sort((a, b) => Number(b[1]) - Number(a[1]))[0];
            const stemDistribution = Object.entries(stemCounts).sort((a, b) => b[1] - a[1]);
            const maxStemCount = stemDistribution[0]?.[1] || 1;

            const stats = [
              { label: "TOTAL TRACKS SPLIT", value: totalTracks.toString(), sub: "all time" },
              { label: "TOTAL STEMS GENERATED", value: totalStems.toString(), sub: `across ${totalTracks} tracks` },
              { label: "MINUTES PROCESSED", value: totalMinutes.toFixed(1), sub: "of audio" },
              { label: "AVERAGE BPM", value: avgBpm != null ? avgBpm.toString() : "—", sub: "across all tracks" },
              { label: "TOP FORMAT", value: topFormat?.[0]?.toUpperCase() || "—", sub: `${topFormat?.[1] || 0} tracks` },
              { label: "TOP KEY", value: topKey?.[0] || "—", sub: `${topKey?.[1] || 0} tracks` },
              { label: "MOST EXPORTED STEM", value: LABELS[topStem?.[0]] || "—", sub: `${topStem?.[1] || 0} times` },
              { label: "PREFERRED SPLIT", value: `${topStemCount?.[0] || "—"} stems`, sub: `${topStemCount?.[1] || 0} tracks` },
            ];

            return (
              <div className="px-[24px] pt-[24px] pb-[40px]">
                <div style={{ maxWidth: 900, margin: "0 auto" }}>
                  <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: C.text, marginBottom: 24 }}>Statistics</h2>
                  {/* Stat cards grid */}
                  <div className="grid grid-cols-4 gap-[8px] mb-[24px]">
                    {stats.map((stat) => (
                      <div key={stat.label}
                        className="px-[16px] py-[14px]" style={{ backgroundColor: C.bgCard }}>
                        <p style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, letterSpacing: "0.05em" }}>{stat.label}</p>
                        <p style={{ fontSize: 28, fontWeight: 700, color: C.text, marginTop: 6, letterSpacing: "-0.02em" }}>{stat.value}</p>
                        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{stat.sub}</p>
                      </div>
                    ))}
                  </div>
                  {/* Stem distribution */}
                  <div className="mb-[16px]" style={{ backgroundColor: C.bgCard }}>
                    <div className="px-[16px] py-[12px]" style={{ backgroundColor: C.bgHover }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: "0.03em" }}>STEM DISTRIBUTION</p>
                    </div>
                    <div className="px-[16px] py-[14px] space-y-[10px]">
                      {stemDistribution.map(([stem, count]) => {
                        const color = stemColors[stem] || "#999";
                        return (
                          <div key={stem} className="flex items-center gap-[12px]">
                            <span className="w-[80px] shrink-0" style={{ fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: "0.04em" }}>{LABELS[stem]}</span>
                            <div className="flex-1 h-[6px] overflow-hidden" style={{ backgroundColor: C.bgHover }}>
                              <div className="h-full" style={{ backgroundColor: color, width: `${(count / maxStemCount) * 100}%` }} />
                            </div>
                            <span className="w-[24px] text-right" style={{ fontSize: 14, color: C.textMuted }}>{count}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  {/* Format breakdown */}
                  <div style={{ backgroundColor: C.bgCard }}>
                    <div className="px-[16px] py-[12px]" style={{ backgroundColor: C.bgHover }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: "0.03em" }}>FORMAT BREAKDOWN</p>
                    </div>
                    <div className="px-[16px] py-[14px] flex items-center gap-[24px]">
                      {Object.entries(formatCounts).sort((a, b) => b[1] - a[1]).map(([fmt, count]) => {
                        const pct = Math.round((count / totalTracks) * 100);
                        return (
                          <div key={fmt} className="flex flex-col items-center gap-[6px]">
                            <div className="relative flex items-center justify-center" style={{ width: 64, height: 64 }}>
                              <svg width="64" height="64" viewBox="0 0 64 64">
                                <circle cx="32" cy="32" r="28" fill="none" stroke={C.bgHover} strokeWidth="4" />
                                <circle cx="32" cy="32" r="28" fill="none" stroke={C.accent} strokeWidth="4"
                                  strokeDasharray={`${2 * Math.PI * 28}`}
                                  strokeDashoffset={2 * Math.PI * 28 * (1 - pct / 100)}
                                  strokeLinecap="butt" transform="rotate(-90 32 32)" />
                              </svg>
                              <span className="absolute" style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{pct}%</span>
                            </div>
                            <span style={{ fontSize: 14, fontWeight: 600, color: C.textSec, letterSpacing: "0.04em" }}>{fmt.toUpperCase()}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ═══ GAMES ═══ */}
          {view === "games" && (
            <div className="flex flex-1 flex-col overflow-y-auto px-[24px] pt-[24px] pb-[40px]">
              <div style={{ maxWidth: 900, margin: "0 auto", width: "100%" }}>
                {activeGame === "" ? (
                  <>
                    <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", color: C.text, marginBottom: 6 }}>Games</h2>
                    <p style={{ fontSize: 15, color: C.textMuted, marginBottom: 24, letterSpacing: "0.02em" }}>TAKE A BREAK BETWEEN SPLITS</p>
                    <div className="grid grid-cols-3 gap-[8px]">
                      {[
                        { id: "bpm", name: "BPM TAP", desc: "Tap the tempo of famous tracks", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M9 2v14M5 6v6M13 4v10M1 8v2M17 8v2" stroke={C.accent} strokeWidth="1.5" strokeLinecap="square"/></svg> },
                        { id: "tomato", name: "TOMATO TOSS", desc: "Throw tomatoes at a bad DJ", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="10" r="6" stroke={C.accent} strokeWidth="1.5"/><path d="M7 4c1-2 3-2 4 0" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round"/></svg> },
                        { id: "mpc", name: "MPC PAD", desc: "Play beats on a drum machine", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="5.5" height="5.5" stroke={C.accent} strokeWidth="1.5"/><rect x="10.5" y="2" width="5.5" height="5.5" stroke={C.accent} strokeWidth="1.5"/><rect x="2" y="10.5" width="5.5" height="5.5" stroke={C.accent} strokeWidth="1.5"/><rect x="10.5" y="10.5" width="5.5" height="5.5" stroke={C.accent} strokeWidth="1.5"/></svg> },
                        { id: "melody", name: "MELODY MEMORY", desc: "Replay melodies from memory", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 14V7l4-3v10M11 14V5l4-3v12" stroke={C.accent} strokeWidth="1.5" strokeLinecap="square"/></svg> },
                        { id: "freq", name: "FREQUENCY QUIZ", desc: "Guess the frequency of a tone", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M1 9h3l2-5 2 10 2-10 2 5h3" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg> },
                        { id: "stem", name: "GUESS THE STEM", desc: "Which stem is playing?", icon: <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="7" stroke={C.accent} strokeWidth="1.5"/><path d="M9 5v4l3 2" stroke={C.accent} strokeWidth="1.5" strokeLinecap="round"/></svg> },
                      ].map(g => (
                        <button key={g.id} onClick={() => setActiveGame(g.id)}
                          className="relative p-[20px] text-left transition-all"
                          style={{ backgroundColor: C.bgCard }}>
                          <div style={{ width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: C.bgElevated }}>{g.icon}</div>
                          <p style={{ fontSize: 16, fontWeight: 600, color: C.text, marginTop: 10, letterSpacing: "0.03em" }}>{g.name}</p>
                          <p style={{ fontSize: 13, color: C.textMuted, marginTop: 4, lineHeight: 1.4 }}>{g.desc}</p>
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <div>
                    <button onClick={() => setActiveGame("")}
                      className="flex items-center gap-[6px] mb-[20px] px-[12px] py-[6px] transition-colors"
                      style={{ fontSize: 14, fontWeight: 500, color: C.textMuted, backgroundColor: C.bgHover, letterSpacing: "0.04em" }}>
                      <ChevronLeft className="h-[14px] w-[14px]" strokeWidth={1.8} />
                      ALL GAMES
                    </button>
                    {activeGame === "bpm" && <BpmTap isDark={isDark} isColorful={isColorful} theme={gameTheme} />}
                    {activeGame === "tomato" && <TomatoToss isDark={isDark} isColorful={isColorful} theme={gameTheme} />}
                    {activeGame === "mpc" && <MpcPad isDark={isDark} isColorful={isColorful} theme={gameTheme} />}
                    {activeGame === "melody" && <MelodyMemory isDark={isDark} isColorful={isColorful} theme={gameTheme} />}
                    {activeGame === "freq" && <FrequencyQuiz isDark={isDark} isColorful={isColorful} theme={gameTheme} />}
                    {activeGame === "stem" && <GuessTheStem isDark={isDark} isColorful={isColorful} theme={gameTheme} />}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {view === "settings" && (
            <div className="px-[24px] pt-[24px] pb-[40px]">
              <div style={{ maxWidth: 900, margin: "0 auto" }}>
                <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 24, color: C.text }}>Settings</h2>
                <div className="flex flex-col items-center justify-center py-[80px]">
                  <div className="flex h-[48px] w-[48px] items-center justify-center" style={{ backgroundColor: C.bgHover }}>
                    <Settings2 className="h-[22px] w-[22px]" style={{ color: C.textMuted }} strokeWidth={1.5} />
                  </div>
                  <p style={{ fontSize: 15, color: C.textMuted, marginTop: 12, letterSpacing: "0.03em" }}>ACCOUNT SETTINGS COMING SOON</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Processing Section with Shimmer + BPM Mini-game ──────────
const BPM_SONGS = [
  { title: "Billie Jean", artist: "Michael Jackson", bpm: 117 },
  { title: "Stayin' Alive", artist: "Bee Gees", bpm: 104 },
  { title: "Blinding Lights", artist: "The Weeknd", bpm: 171 },
  { title: "Get Lucky", artist: "Daft Punk", bpm: 116 },
  { title: "Bohemian Rhapsody", artist: "Queen", bpm: 72 },
  { title: "Seven Nation Army", artist: "The White Stripes", bpm: 124 },
  { title: "Sweet Dreams", artist: "Eurythmics", bpm: 126 },
  { title: "Blue Monday", artist: "New Order", bpm: 130 },
  { title: "One More Time", artist: "Daft Punk", bpm: 123 },
  { title: "Levels", artist: "Avicii", bpm: 126 },
  { title: "Uptown Funk", artist: "Bruno Mars", bpm: 115 },
  { title: "Mr. Brightside", artist: "The Killers", bpm: 148 },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ProcessingSection({ progress, activeAgentIdx, C, isColorful }: {
  progress: number; activeAgentIdx: number;
  C: any; isColorful: boolean;
}) {
  const [gameActive, setGameActive] = useState(false);
  const [songIdx, setSongIdx] = useState(() => Math.floor(Math.random() * BPM_SONGS.length));
  const [taps, setTaps] = useState<number[]>([]);
  const [userBpm, setUserBpm] = useState<number | null>(null);
  const [result, setResult] = useState<{ diff: number; msg: string } | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const tapRef = useRef<number[]>([]);

  const song = BPM_SONGS[songIdx];
  const shimmerMsg = activeAgentIdx <= 1 ? "PREPARING AUDIO" : activeAgentIdx <= 5 ? "ISOLATING STEMS" : "FINALIZING";

  const shimmerStyle = useMemo(() => ({
    background: `linear-gradient(90deg, ${C.textMuted} 0%, ${C.text} 40%, ${C.text} 60%, ${C.textMuted} 100%)`,
    backgroundSize: "200% 100%",
    WebkitBackgroundClip: "text" as const,
    backgroundClip: "text" as const,
    WebkitTextFillColor: "transparent",
    animation: "shimmer 4s ease-in-out infinite",
  }), [C.textMuted, C.text]);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const newTaps = [...tapRef.current, now].slice(-8);
    tapRef.current = newTaps;
    setTaps(newTaps);
    if (newTaps.length >= 4) {
      const intervals = [];
      for (let i = 1; i < newTaps.length; i++) intervals.push(newTaps[i] - newTaps[i - 1]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setUserBpm(Math.round(60000 / avg));
    }
  }, []);

  const submitGuess = useCallback(() => {
    if (userBpm === null) return;
    const diff = Math.abs(userBpm - song.bpm);
    let msg: string, pts = 0;
    if (diff <= 3) { msg = "INSANE EAR"; pts = 100; }
    else if (diff <= 8) { msg = "PRETTY GOOD"; pts = 50; }
    else if (diff <= 15) { msg = "NOT BAD"; pts = 20; }
    else if (diff <= 30) { msg = "MEH"; pts = 5; }
    else { msg = "BRO WHAT"; pts = 0; }
    setResult({ diff, msg });
    setScore(s => s + pts);
    setStreak(s => diff <= 15 ? s + 1 : 0);
    setTotalRounds(r => r + 1);
  }, [userBpm, song.bpm]);

  const nextSong = useCallback(() => {
    let next = Math.floor(Math.random() * BPM_SONGS.length);
    while (next === songIdx) next = Math.floor(Math.random() * BPM_SONGS.length);
    setSongIdx(next);
    setTaps([]); tapRef.current = []; setUserBpm(null); setResult(null);
  }, [songIdx]);

  useEffect(() => {
    if (!gameActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && !result) { e.preventDefault(); handleTap(); }
      if (e.code === "Enter" && userBpm && !result) { e.preventDefault(); submitGuess(); }
      if (e.code === "Enter" && result) { e.preventDefault(); nextSong(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameActive, handleTap, submitGuess, nextSong, userBpm, result]);

  return (
    <div className="flex flex-col items-center justify-center px-8 py-[60px]">
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

      <div className="w-full max-w-md space-y-8">
        {/* Big % + shimmer */}
        <div className="text-center space-y-[8px]">
          <div>
            <span style={{ fontSize: 64, fontWeight: 700, letterSpacing: 0, fontKerning: "none", color: C.text }}>{Math.floor(progress)}</span>
            <span style={{ fontSize: 28, fontWeight: 700, color: C.textMuted }}>%</span>
          </div>
          <p key={`shimmer-${C.text}`} style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.12em", ...shimmerStyle }}>
            {shimmerMsg}
          </p>
        </div>

        {/* Progress bar */}
        <div className="h-[4px] w-full overflow-hidden" style={{ backgroundColor: C.bgHover }}>
          <motion.div className="h-full" style={{
            background: isColorful
              ? "linear-gradient(90deg, #FF2D55, #FF9500, #FFCC00, #34C759, #007AFF, #5856D6)"
              : C.accent,
          }} animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
        </div>

        {/* Agent steps — current + previous */}
        <div style={{ height: 64 }} className="relative overflow-hidden">
          <AnimatePresence mode="popLayout">
            {PROCESSING_AGENTS.map((agent, i) => {
              const isPrev = i === activeAgentIdx - 1;
              const isActive = i === activeAgentIdx;
              if (!isPrev && !isActive) return null;
              return (
                <motion.div key={agent.name} layout
                  initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                  className="flex items-center gap-[10px]" style={{ height: 32 }}>
                  <div className="w-[16px] flex items-center justify-center shrink-0">
                    {isPrev ? (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6L5 9L10 3" stroke={C.textMuted} strokeWidth="1.5" /></svg>
                    ) : (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                        <svg width="12" height="12" viewBox="0 0 12 12">
                          <circle cx="6" cy="6" r="4.5" fill="none" stroke={C.bgHover} strokeWidth="1.5" />
                          <circle cx="6" cy="6" r="4.5" fill="none" stroke={C.textSec} strokeWidth="1.5"
                            strokeDasharray={`${2 * Math.PI * 4.5}`} strokeDashoffset={`${2 * Math.PI * 4.5 * 0.75}`}
                            strokeLinecap="square" />
                        </svg>
                      </motion.div>
                    )}
                  </div>
                  <span style={{ fontSize: 15, fontWeight: isActive ? 500 : 400, color: isPrev ? C.textMuted : C.textSec, letterSpacing: "0.03em" }}>
                    {agent.name.toUpperCase()}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Mini BPM game */}
        <div className="pt-[8px] flex justify-center">
          {!gameActive ? (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}
              onClick={() => setGameActive(true)}
              className="px-[16px] py-[8px] transition-colors"
              style={{ fontSize: 14, color: C.textMuted, backgroundColor: C.bgHover, letterSpacing: "0.04em" }}>
              BORED? TAP THE BPM
            </motion.button>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="w-full p-[24px] text-center" style={{ backgroundColor: C.bgCard }}>
              <div className="flex items-center justify-between mb-[24px]">
                <span style={{ fontSize: 13, color: C.textMuted, letterSpacing: "0.04em" }}>SCORE: {score}</span>
                {streak >= 2 && <span style={{ fontSize: 13, color: C.accent, letterSpacing: "0.04em" }}>STREAK {streak}</span>}
                <span style={{ fontSize: 13, color: C.textMuted, letterSpacing: "0.04em" }}>ROUND {totalRounds + 1}</span>
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{song.title}</p>
              <p style={{ fontSize: 14, color: C.textMuted, marginTop: 4 }}>{song.artist}</p>
              <AnimatePresence mode="wait">
                {!result ? (
                  <motion.div key="tap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <button onClick={handleTap}
                      className="mt-[20px] w-full py-[24px] transition-all active:scale-95"
                      style={{ backgroundColor: taps.length > 0 ? (C.accent + "25") : C.bgHover }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: C.textSec, letterSpacing: "0.04em" }}>
                        {taps.length === 0 ? "TAP HERE" : "KEEP TAPPING"}
                      </p>
                      {userBpm !== null && (
                        <p style={{ fontSize: 32, fontWeight: 800, color: C.text, marginTop: 8 }} className="tabular-nums">{userBpm}</p>
                      )}
                      {taps.length > 0 && taps.length < 4 && (
                        <p style={{ fontSize: 13, color: C.textMuted, marginTop: 6 }}>{4 - taps.length} MORE TAPS NEEDED</p>
                      )}
                    </button>
                    <p style={{ fontSize: 13, color: C.textMuted, marginTop: 8, letterSpacing: "0.03em" }}>SPACE TO TAP · ENTER TO SUBMIT</p>
                    {userBpm !== null && (
                      <button onClick={submitGuess}
                        className="mt-[12px] px-[20px] py-[8px] transition-all"
                        style={{ fontSize: 15, fontWeight: 600, color: C.accentText, backgroundColor: C.accent, letterSpacing: "0.03em" }}>
                        LOCK IN {userBpm} BPM
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <p style={{ fontSize: 24, fontWeight: 800, color: C.text, marginTop: 20, letterSpacing: "0.02em" }}>{result.msg}</p>
                    <p style={{ fontSize: 15, color: C.textMuted, marginTop: 6 }}>
                      You: <span style={{ color: C.text, fontWeight: 600 }}>{userBpm}</span> — Actual: <span style={{ color: C.accent, fontWeight: 600 }}>{song.bpm}</span>
                      {result.diff > 0 && <span> ({result.diff} off)</span>}
                    </p>
                    <button onClick={nextSong}
                      className="mt-[16px] px-[20px] py-[8px] transition-all"
                      style={{ fontSize: 15, fontWeight: 500, color: C.textMuted, backgroundColor: C.bgHover, letterSpacing: "0.03em" }}>
                      NEXT SONG
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// Icons: Custom SVGs (Ableton geometric style)
// Libraries tested: Lucide, Phosphor, Tabler, Heroicons — Custom chosen for all
