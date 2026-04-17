"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  Sparkles, ChevronDown, ChevronLeft,
  Search, X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StemModal } from "@/components/stem-modal";
import { WelcomeModal } from "@/components/welcome-modal";
import Link from "next/link";
import type { Job, HistoryItem, SplitMode, QueueItem } from "@/lib/types";
import { detectPlatform, PLATFORMS } from "@/lib/platforms";
import { useQueue } from "@/contexts/queue-context";
import { RiDownloadFill, RiDeleteBinFill, RiMicFill, RiStopFill, RiFileUploadFill, RiQuestionFill, RiNotificationFill, RiContrastFill, RiSunFill, RiMoonFill } from "@remixicon/react";
import { AccountView, type SettingsSection } from "@/components/dashboard/account-view";
import { useAudioRecorder, formatSeconds } from "@/hooks/use-audio-recorder";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { PLANS } from "@/lib/plans";
import { formatImportError, isTerminalError } from "@/lib/errors";
import { toast } from "sonner";
// Icon libraries installed: @phosphor-icons/react, @tabler/icons-react, @heroicons/react, @remixicon/react

// ─── Types ───────────────────────────────────────────────────
type AppState = "idle" | "file-selected" | "processing";
type StemCount = 2 | 4 | 6;
type OutputFormat = "wav" | "mp3";
type View = "split" | "files" | "stats" | "games" | "settings";

const F = "var(--font-futura), sans-serif";

// ─── Classic theme (sober Ableton — no borders, bg contrast only) ─
const classicThemes = {
  dark: {
    bg: "#111111", bgCard: "#1C1C1C", bgSubtle: "#161616", bgHover: "#242424", bgElevated: "#202020",
    text: "#FFFFFF", textSec: "#999999", textMuted: "#9E9E9E",
    accent: "#1B10FD", accentText: "#FFFFFF",
    sidebarBg: "#161616", navActive: "#222222",
    badgeBg: "#2A2A2A", badgeText: "#999999", dropZoneBg: "#1C1C1C",
  },
  light: {
    bg: "#F3F3F3", bgCard: "#FFFFFF", bgSubtle: "#EAEAEA", bgHover: "#E0E0E0", bgElevated: "#F0F0F0",
    text: "#000000", textSec: "#555555", textMuted: "#555555",
    accent: "#1B10FD", accentText: "#FFFFFF",
    sidebarBg: "#EAEAEA", navActive: "#DCDCDC",
    badgeBg: "#E0E0E0", badgeText: "#555555", dropZoneBg: "#FFFFFF",
  },
} as const;

// ─── Stem colors ─────────────────────────────────────────────
const STEM_COLORS_CLASSIC: Record<string, string> = {
  vocals: "#1B10FD", drums: "#FF6B00", bass: "#00CC66", guitar: "#FF3366",
  piano: "#00BBFF", other: "#777777", instrumental: "#6633FF",
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

// HistoryItem imported from @/lib/types

const AUDIO_EXTENSIONS = new Set([".mp3", ".wav", ".flac", ".ogg", ".m4a", ".aac", ".aif", ".aiff"]);

// Custom line icons
const DownloadIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 2V9.5M5 8L8 11L11 8" stroke={color} strokeWidth="0.7" fill="none" strokeLinejoin="miter"/>
    <line x1="3" y1="14" x2="13" y2="14" stroke={color} strokeWidth="0.7"/>
  </svg>
);
const TrashIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <line x1="2" y1="4" x2="14" y2="4" stroke={color} strokeWidth="0.7"/>
    <line x1="6" y1="2" x2="10" y2="2" stroke={color} strokeWidth="0.7"/>
    <path d="M4 4V14H12V4" stroke={color} strokeWidth="0.7" fill="none" strokeLinejoin="miter"/>
  </svg>
);

async function extractAudioFiles(dataTransfer: DataTransfer): Promise<File[]> {
  const items = Array.from(dataTransfer.items);
  const entries = items.map(i => i.webkitGetAsEntry?.()).filter(Boolean) as FileSystemEntry[];
  if (entries.length === 0) {
    return Array.from(dataTransfer.files).filter(f => AUDIO_EXTENSIONS.has("." + f.name.split(".").pop()?.toLowerCase()));
  }
  const files: File[] = [];
  const readEntry = (entry: FileSystemEntry): Promise<void> => new Promise(resolve => {
    if (entry.isFile) {
      (entry as FileSystemFileEntry).file(f => { if (AUDIO_EXTENSIONS.has("." + f.name.split(".").pop()?.toLowerCase())) files.push(f); resolve(); }, () => resolve());
    } else if (entry.isDirectory) {
      (entry as FileSystemDirectoryEntry).createReader().readEntries(async entries => { await Promise.all(entries.map(readEntry)); resolve(); }, () => resolve());
    } else { resolve(); }
  });
  await Promise.all(entries.map(readEntry));
  return files;
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
  const { user, displayName, initials, email, signOut, avatarUrl, createdAt } = useAuth();
  const { plan: userPlan, planLabel, isPro, usagePercent, remainingFormatted, minutesUsed, minutesIncluded, rolloverMinutes, minutesAvailable, daysUntilReset, loading: subLoading, batchLimit, urlImport, stems, wavAllowed, minutesNeverReset, refetch: refetchSubscription } = useSubscription(user?.id);

  // Handle checkout success redirect from Polar
  // Also handle ?upgrade=pro&billing=annual from /pricing page
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("checkout") === "success") {
      const checkoutId = params.get("checkoutId");
      window.history.replaceState({}, "", "/app");
      toast.success("Payment successful! Activating your plan…");

      // Poll Polar checkout status until succeeded, then refresh subscription
      if (checkoutId) {
        let attempts = 0;
        const maxAttempts = 10;
        let active = true;
        const interval = setInterval(async () => {
          if (!active) return;
          attempts++;
          try {
            const res = await fetch(`/api/checkout/status?checkoutId=${checkoutId}`);
            const data = await res.json();
            if (data.status === "succeeded") {
              clearInterval(interval);
              active = false;
              // Small delay to let webhook arrive before refetch
              setTimeout(() => { if (active !== false) return; refetchSubscription(); }, 1500);
              refetchSubscription();
              toast.success("Your plan is now active!");
            }
          } catch {}
          if (attempts >= maxAttempts) {
            clearInterval(interval);
            active = false;
            refetchSubscription();
          }
        }, 2000);
        // Cleanup if component unmounts before polling completes
        return () => { active = false; clearInterval(interval); };
      } else {
        // No checkoutId — just refetch after a short delay
        const t = setTimeout(() => refetchSubscription(), 3000);
        return () => clearTimeout(t);
      }
    }
    const upgradePlan = params.get("upgrade");
    const billingRaw = params.get("billing");
    const billing = billingRaw === "annual" ? "annual" : "monthly";
    if (upgradePlan === "pro" || upgradePlan === "studio") {
      window.history.replaceState({}, "", "/app");
      setView("settings");
      setSettingsSection("subscription");
      setPendingPlanChange({ plan: upgradePlan, billing });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [themeMode, setThemeMode] = useState<"dark" | "light" | "system">(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem("44stems-theme");
    return saved === "dark" || saved === "light" || saved === "system" ? saved : "dark";
  });
  const [systemDark, setSystemDark] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  useEffect(() => { localStorage.setItem("44stems-theme", themeMode); }, [themeMode]);
  const isDark = themeMode === "system" ? systemDark : themeMode === "dark";
  const C = isDark ? classicThemes.dark : classicThemes.light;
  const stemColors = STEM_COLORS_CLASSIC;

  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Cache of stem URLs + precomputed peaks per job ID
  const stemUrlCacheRef = useRef<Record<string, Record<string, string>>>({});
  const stemPeaksCacheRef = useRef<Record<string, Record<string, number[]>>>({});

  // Prefetch stem URLs + server-side peaks for a job (fire-and-forget)
  const prefetchJobStems = useCallback((jobId: string) => {
    if (stemUrlCacheRef.current[jobId]) return; // already cached
    const wsId = WORKSPACE_ID;
    // Fetch stem URLs
    fetch(`/api/download/${jobId}`, { headers: { "x-workspace-id": wsId } })
      .then(r => r.json())
      .then(d => {
        if (d.stems) {
          const urls = Object.fromEntries((d.stems as { name: string; url: string }[]).map(s => [s.name, s.url]));
          stemUrlCacheRef.current[jobId] = urls;
        }
      })
      .catch(() => {});
    // Fetch job data for precomputed peaks
    fetch(`/api/jobs/${jobId}`, { headers: { "x-workspace-id": wsId } })
      .then(r => r.json())
      .then(job => {
        if (job.peaks) {
          stemPeaksCacheRef.current[jobId] = job.peaks;
        }
      })
      .catch(() => {});
  }, []);

  // Load history from API on mount
  useEffect(() => {
    const wsId = WORKSPACE_ID;
    fetch("/api/history", { headers: { "x-workspace-id": wsId } })
      .then(r => r.json())
      .then(d => {
        if (d.jobs) {
          setHistory(d.jobs);
          // Prefetch stems for all jobs in background
          (d.jobs as HistoryItem[]).forEach(j => prefetchJobStems(j.id));
        }
      })
      .catch(() => {});
  }, [prefetchJobStems]);

  const refreshHistory = useCallback(() => {
    const wsId = WORKSPACE_ID;
    fetch("/api/history", { headers: { "x-workspace-id": wsId } })
      .then(r => r.json())
      .then(d => {
        if (d.jobs) {
          setHistory(d.jobs);
          (d.jobs as HistoryItem[]).forEach(j => prefetchJobStems(j.id));
        }
      })
      .catch(() => {});
  }, [prefetchJobStems]);

  // Re-fetch My Files when any job completes (fired from queue-context)
  useEffect(() => {
    const handler = () => refreshHistory();
    window.addEventListener("history-updated", handler);
    return () => window.removeEventListener("history-updated", handler);
  }, [refreshHistory]);

  const [view, setView] = useState<View>("split");
  const [appState, setAppState] = useState<AppState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [totalDurationSec, setTotalDurationSec] = useState<number | null>(null);
  const [stemCount, setStemCount] = useState<StemCount>(4);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>("wav");
  const [stemsOpen, setStemsOpen] = useState(false);
  const [formatOpen, setFormatOpen] = useState(false);
  const [activityOpen, setActivityOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsSection, setSettingsSection] = useState<SettingsSection>("profile");
  const [pendingPlanChange, setPendingPlanChange] = useState<{ plan: "pro" | "studio"; billing: "monthly" | "annual" } | null>(null);

  // Auto-correct stemCount if plan doesn't allow current selection
  useEffect(() => {
    if (!subLoading && !stems.includes(stemCount)) {
      setStemCount(stems[stems.length - 1] as StemCount);
    }
  }, [stems, subLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-correct outputFormat if plan doesn't allow WAV
  useEffect(() => {
    if (!subLoading && !wavAllowed && outputFormat === "wav") {
      setOutputFormat("mp3");
    }
  }, [wavAllowed, subLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  // Polar checkout — redirect to payment page
  const handleUpgrade = async (plan: "pro" | "studio" = "pro", billing: "monthly" | "annual" = "monthly") => {
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast.error(data.error || "Failed to create checkout session");
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const profileRef = useRef<HTMLDivElement>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    if (mq.matches) setSidebarCollapsed(true);
    const handler = (e: MediaQueryListEvent) => setSidebarCollapsed(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  const WORKSPACE_ID = user ? `ws-${user.id}` : "";
  const [expandedFile, setExpandedFile] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState("");
  // rAF smooth progress — target receives real values, display advances at 1%/s max
  const progressTargetRef = useRef(0);
  const progressDisplayRef = useRef(0);
  const [activeGame, setActiveGame] = useState("");
  // URL input variations
  const [urlInput, setUrlInput] = useState("");
  const [inputMode, setInputMode] = useState<"file" | "url">("file");
  // Platform detection (shared with /api/url-info)
  const detectedPlatform = detectPlatform(urlInput);
  const isValidUrl = detectedPlatform !== null;
  const [urlDurationLoading, setUrlDurationLoading] = useState(false);
  const [urlTitle, setUrlTitle] = useState<string | null>(null);
  const [playlistTracks, setPlaylistTracks] = useState<{ url: string; title: string; duration: number }[]>([]);

  // Fetch duration (single track) or track list (playlist) when a valid URL is entered
  useEffect(() => {
    if (!isValidUrl || inputMode !== "url") { setTotalDurationSec(null); setPlaylistTracks([]); setUrlTitle(null); return; }
    const trimmed = urlInput.trim();
    let cancelled = false;
    setUrlDurationLoading(true);
    setTotalDurationSec(null);
    setPlaylistTracks([]);
    setUrlTitle(null);

    const timeout = setTimeout(() => {
      fetch(`/api/url-info?url=${encodeURIComponent(trimmed)}`)
        .then(r => r.json())
        .then(data => {
          if (cancelled) return;
          if (data.isPlaylist && data.tracks?.length) {
            setPlaylistTracks(data.tracks);
            const totalSec = data.tracks.reduce((sum: number, t: { duration: number }) => sum + (t.duration || 0), 0);
            if (totalSec > 0) setTotalDurationSec(totalSec);
          } else {
            if (data.duration > 0) setTotalDurationSec(data.duration);
            if (data.title) setUrlTitle(data.title);
          }
        })
        .catch(() => {})
        .finally(() => { if (!cancelled) setUrlDurationLoading(false); });
    }, 500);

    return () => { cancelled = true; clearTimeout(timeout); };
  }, [urlInput, isValidUrl, inputMode]);
  const [validStyle, setValidStyle] = useState<1 | 2 | 3 | 4>(1);
  // Files view state
  const [sortBy, setSortBy] = useState<"name" | "date" | "duration" | "format" | "bpm" | "key">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [fileSearch, setFileSearch] = useState("");
  const [filterBpm, setFilterBpm] = useState<string | null>(null);
  const [filterKeys, setFilterKeys] = useState<Set<string>>(new Set());
  const [filterStems, setFilterStems] = useState<Set<number>>(new Set());
  const [filterDuration, setFilterDuration] = useState<string | null>(null);
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadErrorFromUrl, setUploadErrorFromUrl] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  // ─── MOCK: load real job from R2 for Results page dev ───
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mockId = new URLSearchParams(window.location.search).get("mock");
    if (!mockId) return;

    // mockId can be "1" (latest job) or a real job ID
    const loadJob = async () => {
      try {
        let id = mockId;
        // If "1", fetch the latest completed job from history
        if (id === "1") {
          const wsId = WORKSPACE_ID;
          const histRes = await fetch("/api/history", { headers: { "x-workspace-id": wsId } });
          if (!histRes.ok) return;
          const { jobs } = await histRes.json();
          if (!jobs?.length) return;
          id = jobs[0].id;
        }

        // Load job data
        const wsId2 = WORKSPACE_ID;
        const jobRes = await fetch(`/api/jobs/${id}`, { headers: { "x-workspace-id": wsId2 } });
        if (!jobRes.ok) return;
        const job: Job = await jobRes.json();
        if (job.status !== "completed") return;

        setCurrentJob(job);
        setJobId(id);
        setStemCount((job.stems?.length === 2 ? 2 : job.stems?.length === 6 ? 6 : 4) as StemCount);
        setAppState("idle");
        setView("split");

        // Cache server-computed peaks
        if (job.peaks && Object.keys(job.peaks).length > 0) {
          stemPeaksCacheRef.current[id] = job.peaks;
        }
      } catch (err) {
        console.error("Mock load failed:", err);
      }
    };
    loadJob();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // ─── END MOCK ───

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
  const activityRef = useRef<HTMLDivElement>(null);

  const duration = 214; // mock duration

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current); }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!stemsOpen && !formatOpen && !activityOpen) return;
    const handler = (e: MouseEvent) => {
      if (stemsOpen && stemsRef.current && !stemsRef.current.contains(e.target as Node)) setStemsOpen(false);
      if (formatOpen && formatRef.current && !formatRef.current.contains(e.target as Node)) setFormatOpen(false);
      if (activityOpen && activityRef.current && !activityRef.current.contains(e.target as Node)) setActivityOpen(false);
      if (profileOpen && profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [stemsOpen, formatOpen, activityOpen, profileOpen]);

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

  const { enqueue, enqueueUrl, items: queueItems, activeItemId, displayProgress: queueDisplayProgress, notifications, unreadCount, markAllRead, clearCompleted, removeFromQueue, retry: retryItem, setCurrentWorkspace } = useQueue();
  useEffect(() => {
    if (WORKSPACE_ID) setCurrentWorkspace(WORKSPACE_ID);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [WORKSPACE_ID]);
  const handleFiles = useCallback((files: File[]) => {
    const maxBytes = PLANS[userPlan].maxFileSizeMB * 1024 * 1024;
    const oversized = files.filter(f => f.size > maxBytes);
    const valid = files.filter(f => f.size <= maxBytes);
    if (oversized.length > 0) {
      const limitLabel = PLANS[userPlan].maxFileSizeMB >= 1024
        ? `${PLANS[userPlan].maxFileSizeMB / 1024} GB`
        : `${PLANS[userPlan].maxFileSizeMB} MB`;
      const upgradeHint = userPlan === "free" ? " — upgrade to Pro for 2 GB uploads." : ".";
      setUploadError(`${oversized.map(f => f.name).join(", ")} exceeds the ${limitLabel} limit${upgradeHint}`);
    }
    if (valid.length === 0) return;
    if (valid.length === 1) {
      setFile(valid[0]); setPendingFiles([]); setAppState("file-selected");
    } else {
      setFile(null); setPendingFiles(valid); setAppState("file-selected");
    }
  }, [userPlan]); // eslint-disable-line react-hooks/exhaustive-deps

  // Compute total audio duration when files change
  useEffect(() => {
    const allFiles = file ? [file] : pendingFiles;
    if (allFiles.length === 0) { setTotalDurationSec(null); return; }

    let cancelled = false;

    async function getDuration(f: File): Promise<number> {
      // Try HTML Audio first (works for mp3, wav, ogg, m4a)
      const url = URL.createObjectURL(f);
      try {
        const dur = await new Promise<number>((resolve, reject) => {
          const audio = new Audio();
          audio.preload = "metadata";
          audio.onloadedmetadata = () => resolve(audio.duration);
          audio.onerror = () => reject();
          audio.src = url;
        });
        if (dur && isFinite(dur)) return dur;
      } catch { /* fallback below */ } finally { URL.revokeObjectURL(url); }

      // Fallback: parse AIFF/WAV headers for duration (no full decode needed)
      try {
        const header = await f.slice(0, 64).arrayBuffer();
        const view = new DataView(header);
        const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));

        if (magic === "FORM") {
          // AIFF: parse COMM chunk for numFrames + sampleRate
          const chunk = await f.slice(0, 512).arrayBuffer();
          const cv = new DataView(chunk);
          for (let i = 12; i < cv.byteLength - 26; i++) {
            const id = String.fromCharCode(cv.getUint8(i), cv.getUint8(i + 1), cv.getUint8(i + 2), cv.getUint8(i + 3));
            if (id === "COMM") {
              // COMM data: +8 numChannels(2), +10 numFrames(4), +14 sampleSize(2), +16 sampleRate(10 = 80-bit float)
              const numFrames = cv.getUint32(i + 10);
              const exp = cv.getUint16(i + 16) & 0x7FFF;
              const mantissa = cv.getUint32(i + 18);
              const sampleRate = mantissa * Math.pow(2, exp - 16383 - 31);
              if (sampleRate > 0) return numFrames / sampleRate;
              break;
            }
          }
        } else if (magic === "RIFF") {
          // WAV: fileSize / (sampleRate * channels * bitsPerSample/8)
          const sampleRate = view.getUint32(24, true);
          const byteRate = view.getUint32(28, true);
          if (byteRate > 0) return (f.size - 44) / byteRate;
        }
      } catch { /* ignore */ }

      // Last resort: full decode via AudioContext
      try {
        const buf = await f.arrayBuffer();
        const ctx = new AudioContext();
        const decoded = await ctx.decodeAudioData(buf);
        const dur = decoded.duration;
        await ctx.close();
        return dur;
      } catch { return 0; }
    }

    Promise.all(allFiles.map(getDuration)).then((durs) => {
      if (cancelled) return;
      const total = durs.reduce((a, b) => a + b, 0);
      setTotalDurationSec(total > 0 ? total : null);
    });

    return () => { cancelled = true; };
  }, [file, pendingFiles]);

  const { isRecording, elapsedSeconds, start: startRecording, stop: stopRecording } = useAudioRecorder();

  const handleStartRecording = useCallback(async () => {
    if (file) { setFile(null); setAppState("idle"); }
    try {
      await startRecording();
    } catch {
      toast.error("Microphone access denied", { description: "Allow microphone access in your browser settings." });
    }
  }, [startRecording, file]);

  const handleStopRecording = useCallback(async () => {
    const recorded = await stopRecording();
    handleFiles([recorded]);
  }, [stopRecording, handleFiles]);

  const canSplit = file !== null || pendingFiles.length > 0 || isValidUrl;

  const remainingSeconds = (minutesAvailable - minutesUsed) * 60;

  const handleSplit = useCallback(() => {
    if (!file && pendingFiles.length === 0 && !isValidUrl) return;

    // Check if user has enough credits
    if (totalDurationSec != null && totalDurationSec > remainingSeconds) {
      setUploadError(`Not enough minutes — this requires ${Math.ceil(totalDurationSec / 60)} min but you have ${remainingFormatted} left. Upgrade your plan for more.`);
      return;
    }

    // Check batch limit for file uploads (batchLimit=0 means Free — credits are the only gate)
    if (batchLimit > 0 && pendingFiles.length > batchLimit) {
      setUploadError(`Your ${planLabel} plan allows ${batchLimit} tracks per batch. Upgrade for more.`);
      return;
    }

    const mode: SplitMode = stemCount === 2 ? "2stem" : stemCount === 6 ? "6stem" : "4stem";
    const overlap = 8;

    if (isValidUrl && inputMode === "url") {
      if (playlistTracks.length > 0) {
        // Playlist: cap to plan's batchLimit
        const limit = batchLimit || 1;
        if (playlistTracks.length > limit) {
          setUploadError(`Your ${planLabel} plan allows ${limit} tracks per batch. Upgrade for more.`);
          return;
        }
        for (const track of playlistTracks) {
          if (track.url) enqueueUrl(track.url, { mode, outputFormat, overlap, title: track.title });
        }
      } else {
        // Single track
        enqueueUrl(urlInput, { mode, outputFormat, overlap, title: urlTitle || undefined });
      }
      setUrlInput("");
      setPlaylistTracks([]);
    } else if (pendingFiles.length > 0) {
      enqueue(pendingFiles, { mode, outputFormat, overlap });
      setPendingFiles([]);
    } else if (file) {
      enqueue([file], { mode, outputFormat, overlap });
    }

    setFile(null);
    setPendingFiles([]);
    setAppState("processing");
    setUploadError(null);
  }, [file, pendingFiles, stemCount, isValidUrl, inputMode, urlInput, outputFormat, enqueue, enqueueUrl, totalDurationSec, remainingSeconds, playlistTracks, batchLimit, planLabel]);

  const handleNewSplit = useCallback(() => {
    setFile(null); setPendingFiles([]); setAppState("idle"); setProgress(0); setStage("");
    setIsPlaying(false); setCurrentTime(0); setSoloTrack(null); setMutedTracks(new Set());
    setJobId(null); setCurrentJob(null); setUploadError(null); setUploadErrorFromUrl(false);
    progressTargetRef.current = 0; progressDisplayRef.current = 0;
  }, []);

  const handleShare = useCallback(async (jId: string) => {
    try {
      const res = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId: jId, workspaceId: WORKSPACE_ID }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to create share link");
        return;
      }
      await navigator.clipboard.writeText(data.url);
      toast.success("Share link copied to clipboard!");
    } catch {
      toast.error("Failed to create share link");
    }
  }, []);

  // Sync progress from queue context
  useEffect(() => { setProgress(queueDisplayProgress); }, [queueDisplayProgress]);

  // Bridge: queue context → page state
  const prevQueueLenRef = useRef(0);
  useEffect(() => {
    const active = queueItems.find(i => i.id === activeItemId);
    const incomplete = queueItems.filter(i => i.status !== "completed" && i.status !== "failed");
    const allDone = queueItems.length > 0 && incomplete.length === 0;

    // Sync stage/job for ProcessingSection display
    if (active) {
      setStage(active.stage);
      setCurrentJob(active.job);
      if (active.jobId) setJobId(active.jobId);
    }

    // Queue fully completed
    if (allDone && prevQueueLenRef.current > 0) {
      // Cache server-computed peaks for all completed items (avoids full audio download later)
      for (const qi of queueItems) {
        if (qi.status === "completed" && qi.jobId && qi.job?.peaks && Object.keys(qi.job.peaks).length > 0) {
          stemPeaksCacheRef.current[qi.jobId] = qi.job.peaks;
        }
      }

      setAppState("idle");
      // refreshHistory() handled by "history-updated" event listener
    }

    // Single failed item with no others pending
    if (queueItems.length === 1 && queueItems[0].status === "failed" && incomplete.length === 0) {
      const failedItem = queueItems[0];
      setUploadError(formatImportError(failedItem.errorCode));
      setUploadErrorFromUrl(!!failedItem.url);
      setAppState("idle");
    }

    prevQueueLenRef.current = queueItems.length;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queueItems, activeItemId]);

  const stemLabel = stemCount === 2 ? "2 STEMS" : stemCount === 4 ? "4 STEMS" : "6 STEMS";
  const logoColor = C.accent;
  const activeAgentIdx = PROCESSING_AGENTS.reduce((acc, agent, i) => progress >= agent.threshold ? i : acc, 0);
  const playProgress = duration > 0 ? currentTime / duration : 0;
  const formatTime = (s: number) => { const m = Math.floor(s / 60); const sec = Math.floor(s % 60); return `${m}:${sec.toString().padStart(2, "0")}`; };

  // Sort helpers for Files view
  const durToSec = (d?: string) => { if (!d) return 0; const m = d.match(/(\d+)m\s*(\d+)s/); return m ? parseInt(m[1]) * 60 + parseInt(m[2]) : 0; };
  const toggleSort = (col: typeof sortBy) => { if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSortBy(col); setSortDir("asc"); } };

  const availableKeys = Array.from(new Set(history.map(h => h.key).filter(Boolean) as string[])).sort((a, b) => {
    const parse = (k: string) => { const m = k.match(/(\d+)([AB])/); return m ? parseInt(m[1]) * 2 + (m[2] === "B" ? 1 : 0) : 999; };
    return parse(a) - parse(b);
  });
  const hasActiveFilters = filterBpm !== null || filterKeys.size > 0 || filterStems.size > 0 || filterDuration !== null;
  const clearFilters = () => { setFilterBpm(null); setFilterKeys(new Set()); setFilterStems(new Set()); setFilterDuration(null); };

  const searched = history.filter(item => {
    if (fileSearch && !item.name.toLowerCase().includes(fileSearch.toLowerCase())) return false;
    if (filterBpm) {
      if (item.bpm === null) return false;
      if (filterBpm === "< 90" && item.bpm >= 90) return false;
      if (filterBpm === "90–120" && (item.bpm < 90 || item.bpm > 120)) return false;
      if (filterBpm === "120–140" && (item.bpm < 120 || item.bpm > 140)) return false;
      if (filterBpm === "> 140" && item.bpm <= 140) return false;
    }
    if (filterKeys.size > 0 && (item.key === null || !filterKeys.has(item.key))) return false;
    if (filterStems.size > 0 && !filterStems.has(item.stems)) return false;
    if (filterDuration) {
      const sec = durToSec(item.duration);
      if (filterDuration === "< 2min" && sec >= 120) return false;
      if (filterDuration === "2–5min" && (sec < 120 || sec > 300)) return false;
      if (filterDuration === "> 5min" && sec <= 300) return false;
    }
    return true;
  });
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
        .sidebar-btn:hover { background-color: ${C.bgHover} !important; }
      `}</style>

      {/* ─── Sidebar ─── */}
      <aside className="flex h-full shrink-0 flex-col"
        style={{ width: sidebarCollapsed ? 52 : 220, transition: "width 220ms cubic-bezier(0.4,0,0.2,1)", backgroundColor: C.sidebarBg, overflow: "visible", position: "relative", zIndex: 20 }}>

        {/* Logo + toggle */}
        <div className="flex items-center justify-between shrink-0" onClick={() => sidebarCollapsed && setSidebarCollapsed(false)}
          style={{ height: 52, padding: sidebarCollapsed ? "0 14px" : "0 14px 0 16px", cursor: sidebarCollapsed ? "pointer" : "default" }}>
          <svg height="14" viewBox="0 0 24 21" fill="none" overflow="visible" className="shrink-0">
            <rect x="0" y="0"  width="24" height="3" fill={C.text}/>
            <rect x="0" y="6"  width="24" height="3" fill={C.text}/>
            <rect x="0" y="12" width="24" height="3" fill={C.text}/>
            <rect x="0" y="18" width="24" height="3" fill={C.text}/>
          </svg>
          <span style={{ overflow: "hidden", whiteSpace: "nowrap", fontFamily: F, fontWeight: 700, fontSize: 18, letterSpacing: "-0.02em", color: C.text, opacity: sidebarCollapsed ? 0 : 1, maxWidth: sidebarCollapsed ? 0 : 110, transition: "opacity 150ms, max-width 150ms", display: "block", marginLeft: 8 }}>44Stems</span>
          <div style={{ flex: 1 }} />
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-[6px]" style={{ color: C.textMuted, opacity: sidebarCollapsed ? 0 : 1, transition: "opacity 150ms", pointerEvents: sidebarCollapsed ? "none" : "auto" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <rect x="1" y="1" width="12" height="12" stroke="currentColor" strokeWidth="0.8"/>
              <line x1="5" y1="1" x2="5" y2="13" stroke="currentColor" strokeWidth="0.8"/>
            </svg>
          </button>
        </div>

        {/* Profile — V1 Kits style */}
        <div ref={profileRef} className="relative shrink-0" style={{ padding: sidebarCollapsed ? "6px 0" : "8px 10px" }}>
          <button onClick={() => setProfileOpen(!profileOpen)} className="flex w-full items-center gap-[8px]"
            style={{ justifyContent: sidebarCollapsed ? "center" : "flex-start" }}>
            <div className="shrink-0 flex items-center justify-center" style={{ width: 30, height: 30, borderRadius: "50%", background: "linear-gradient(135deg, #1B10FD 0%, #7C3AED 100%)" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#fff" }}>{initials}</span>
            </div>
            <div style={{ overflow: "hidden", opacity: sidebarCollapsed ? 0 : 1, maxWidth: sidebarCollapsed ? 0 : 160, transition: "opacity 150ms, max-width 150ms", textAlign: "left", flex: 1 }}>
              <div className="flex items-center gap-[4px]">
                <span style={{ fontSize: 13, fontWeight: 600, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{displayName}</span>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, transform: profileOpen ? "scaleY(-1)" : undefined, transition: "transform 150ms" }}>
                  <path d="M2 3.5L5 6.5L8 3.5" stroke={C.textMuted} strokeWidth="0.8" strokeLinejoin="miter"/>
                </svg>
              </div>
              <div style={{ fontSize: 11, color: C.textMuted, whiteSpace: "nowrap" }}>{planLabel} · <span style={{ color: C.accent }}>Upgrade</span></div>
            </div>
          </button>
          {!sidebarCollapsed && (
            <div style={{ marginTop: 8 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: C.textSec }}>{remainingFormatted} left</span>
                <span style={{ fontSize: 11, color: C.textMuted }}>{minutesNeverReset ? "Never resets" : `Resets in ${daysUntilReset}d`}</span>
              </div>
              <div style={{ height: 2, backgroundColor: C.bgHover }}>
                <div style={{ height: "100%", width: `${usagePercent}%`, backgroundColor: C.accent }} />
              </div>
            </div>
          )}
          {!sidebarCollapsed && (
            <button className="w-full mt-[8px] py-[7px]"
              onClick={() => { setView("settings"); setSettingsSection("subscription"); }}
              style={{ backgroundColor: C.accent, color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", cursor: "pointer" }}>
              UPGRADE
            </button>
          )}
          <AnimatePresence>
            {profileOpen && !sidebarCollapsed && (
              <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.1 }} className="absolute top-full z-50"
                style={{ width: 260, left: 10, backgroundColor: C.bgCard, boxShadow: "0 8px 32px rgba(0,0,0,0.24)" }}>
                <div className="px-[14px] py-[12px]" style={{ borderBottom: `1px solid ${C.text}10` }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{displayName}</div>
                  <div style={{ fontSize: 12, color: C.textMuted }}>{email}</div>
                </div>
                {([
                  { label: "Account Settings", action: () => { setView("settings"); setSettingsSection("profile"); setProfileOpen(false); } },
                  { label: "Usage & Billing",   action: () => { setView("settings"); setSettingsSection("usage");        setProfileOpen(false); } },
                  { label: "Plans & Pricing",   action: () => { setView("settings"); setSettingsSection("subscription"); setProfileOpen(false); } },
                  { label: "What's New",        action: () => { setProfileOpen(false); } },
                ] as { label: string; action: () => void }[]).map(item => (
                  <button key={item.label} onClick={item.action} className="flex w-full items-center px-[14px] py-[9px] sidebar-btn"
                    style={{ fontSize: 13, color: C.textSec, fontWeight: 500, cursor: "pointer" }}>
                    {item.label}
                  </button>
                ))}
                <div style={{ height: 1, backgroundColor: C.text, opacity: 0.08, margin: "2px 0" }} />
                <button onClick={signOut} className="flex w-full items-center px-[14px] py-[9px] sidebar-btn"
                  style={{ fontSize: 13, color: "#FF3B30", fontWeight: 500, cursor: "pointer" }}>
                  Sign out
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Nav — 5 views (custom geometric icons) */}
        <nav className="flex-1 pt-[8px] space-y-[2px]" style={{ padding: sidebarCollapsed ? "8px 0 0" : "8px 10px 0" }}>
          {([
            { id: "split" as View, label: "Split Audio", svg: (c: string) => (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="2" width="6" height="12" stroke={c} strokeWidth="0.7"/>
                <line x1="7" y1="4" x2="7" y2="12" stroke={c} strokeWidth="0.7"/>
                <line x1="9" y1="3.5" x2="14" y2="3.5" stroke={c} strokeWidth="0.7"/>
                <line x1="9" y1="6.5" x2="14" y2="6.5" stroke={c} strokeWidth="0.7"/>
                <line x1="9" y1="9.5" x2="14" y2="9.5" stroke={c} strokeWidth="0.7"/>
                <line x1="9" y1="12.5" x2="14" y2="12.5" stroke={c} strokeWidth="0.7"/>
              </svg>
            )},
            { id: "files" as View, label: "My Files", svg: (c: string) => (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M2 4V13H14V6H8L6 4H2Z" stroke={c} strokeWidth="0.7" strokeLinejoin="miter" fill="none"/>
              </svg>
            )},
            { id: "stats" as View, label: "Statistics", svg: (c: string) => (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <line x1="3.5" y1="7" x2="3.5" y2="13" stroke={c} strokeWidth="0.7"/>
                <line x1="6.5" y1="4" x2="6.5" y2="13" stroke={c} strokeWidth="0.7"/>
                <line x1="9.5" y1="9" x2="9.5" y2="13" stroke={c} strokeWidth="0.7"/>
                <line x1="12.5" y1="2" x2="12.5" y2="13" stroke={c} strokeWidth="0.7"/>
                <line x1="2" y1="13" x2="14" y2="13" stroke={c} strokeWidth="0.7"/>
              </svg>
            )},
            { id: "games" as View, label: "Games", svg: (c: string) => (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="2" width="5" height="5" stroke={c} strokeWidth="0.7"/>
                <rect x="9" y="2" width="5" height="5" stroke={c} strokeWidth="0.7"/>
                <rect x="2" y="9" width="5" height="5" stroke={c} strokeWidth="0.7"/>
                <rect x="9" y="9" width="5" height="5" stroke={c} strokeWidth="0.7"/>
              </svg>
            )},
          ]).map(item => {
            const isActive = view === item.id;
            const iconColor = isActive ? C.text : C.textSec;
            return (
              <button key={item.id} onClick={() => { setView(item.id); setActiveGame(""); }}
                className={`flex w-full items-center gap-[10px] py-[9px]${isActive ? "" : " sidebar-btn"}`}
                style={{
                  backgroundColor: isActive ? C.navActive : "transparent",
                  fontSize: 14, fontWeight: 500, letterSpacing: "0.01em",
                  color: isActive ? C.text : C.textSec,
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  paddingLeft: sidebarCollapsed ? 0 : 10,
                  paddingRight: sidebarCollapsed ? 0 : 10,
                  transition: "background-color 150ms, padding 220ms",
                  cursor: "pointer",
                }}>
                <div className="w-[16px] h-[16px] shrink-0">{item.svg(iconColor)}</div>
                <span style={{ overflow: "hidden", whiteSpace: "nowrap", opacity: sidebarCollapsed ? 0 : 1, maxWidth: sidebarCollapsed ? 0 : 160, transition: "opacity 150ms, max-width 150ms" }}>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom: utility + upgrade */}
        <div className="space-y-[1px]"
          style={{ backgroundColor: C.bgSubtle, padding: sidebarCollapsed ? "6px 0" : "6px 10px", transition: "padding 220ms cubic-bezier(0.4,0,0.2,1)" }}>
          {[
            { icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 2H14V11H9L5 14V11H2V2Z" stroke="currentColor" strokeWidth="0.7" fill="none" strokeLinejoin="miter"/></svg>, label: "Feedback" },
            { icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" stroke="currentColor" strokeWidth="0.7" fill="none"/><line x1="5" y1="5.5" x2="11" y2="5.5" stroke="currentColor" strokeWidth="0.7"/><line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="0.7"/><line x1="5" y1="10.5" x2="9" y2="10.5" stroke="currentColor" strokeWidth="0.7"/></svg>, label: "Docs" },
            { icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="0.7"/><path d="M6 6.5C6 5.4 6.9 4.5 8 4.5C9.1 4.5 10 5.4 10 6.5C10 7.6 9 8 8 8.5V9.5" stroke="currentColor" strokeWidth="0.7" fill="none" strokeLinecap="square"/><line x1="8" y1="11" x2="8" y2="11.5" stroke="currentColor" strokeWidth="0.7"/></svg>, label: "Ask" },
          ].map(({ icon, label }) => (
            <button key={label} className="flex w-full items-center gap-[10px] py-[9px] sidebar-btn"
              style={{ fontSize: 14, fontWeight: 500, letterSpacing: "0.01em", color: C.textSec, justifyContent: sidebarCollapsed ? "center" : "flex-start", paddingLeft: sidebarCollapsed ? 0 : 10, paddingRight: sidebarCollapsed ? 0 : 10, transition: "background-color 100ms, padding 220ms", cursor: "pointer" }}>
              <div className="w-[16px] h-[16px] shrink-0 flex items-center justify-center">{icon}</div>
              <span style={{ overflow: "hidden", whiteSpace: "nowrap", opacity: sidebarCollapsed ? 0 : 1, maxWidth: sidebarCollapsed ? 0 : 130, transition: "opacity 150ms, max-width 150ms" }}>{label}</span>
            </button>
          ))}
          {/* Divider */}
          <div style={{ height: 1, backgroundColor: C.textMuted, opacity: 0.15, margin: sidebarCollapsed ? "4px 12px" : "4px 10px" }} />
          {/* Theme toggle */}
          <button onClick={() => switchTheme(() => setThemeMode(themeMode === "dark" ? "light" : themeMode === "light" ? "system" : "dark"))}
            className="flex w-full items-center gap-[10px] py-[9px] sidebar-btn"
            style={{ fontSize: 14, fontWeight: 500, letterSpacing: "0.01em", color: C.textSec, justifyContent: sidebarCollapsed ? "center" : "flex-start", paddingLeft: sidebarCollapsed ? 0 : 10, paddingRight: sidebarCollapsed ? 0 : 10, transition: "background-color 100ms, padding 220ms", cursor: "pointer" }}
            title={themeMode === "system" ? "System" : isDark ? "Dark" : "Light"}>
            <div className="w-[16px] h-[16px] shrink-0 flex items-center justify-center">
              {themeMode === "system"
                ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 10V4H13V10" stroke="currentColor" strokeWidth="0.7" fill="none" strokeLinejoin="miter"/><line x1="1" y1="10" x2="15" y2="10" stroke="currentColor" strokeWidth="0.7"/><line x1="1" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="0.7"/><line x1="1" y1="10" x2="1" y2="12" stroke="currentColor" strokeWidth="0.7"/><line x1="15" y1="10" x2="15" y2="12" stroke="currentColor" strokeWidth="0.7"/></svg>
                : isDark
                  ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="0.7"/><line x1="8" y1="1.5" x2="8" y2="3" stroke="currentColor" strokeWidth="0.7"/><line x1="8" y1="13" x2="8" y2="14.5" stroke="currentColor" strokeWidth="0.7"/><line x1="1.5" y1="8" x2="3" y2="8" stroke="currentColor" strokeWidth="0.7"/><line x1="13" y1="8" x2="14.5" y2="8" stroke="currentColor" strokeWidth="0.7"/><line x1="3.4" y1="3.4" x2="4.5" y2="4.5" stroke="currentColor" strokeWidth="0.7"/><line x1="11.5" y1="11.5" x2="12.6" y2="12.6" stroke="currentColor" strokeWidth="0.7"/><line x1="12.6" y1="3.4" x2="11.5" y2="4.5" stroke="currentColor" strokeWidth="0.7"/><line x1="4.5" y1="11.5" x2="3.4" y2="12.6" stroke="currentColor" strokeWidth="0.7"/></svg>
                  : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M9 3C6.2 3 4 5.2 4 8C4 10.8 6.2 13 9 13C11 13 12.7 11.9 13.5 10.3C12.8 10.6 12 10.8 11.2 10.8C8.7 10.8 6.7 8.8 6.7 6.3C6.7 5.1 7.2 4.1 8 3.3C8.3 3.1 8.6 3 9 3Z" stroke="currentColor" strokeWidth="0.7" fill="none"/></svg>
              }
            </div>
            <span style={{ overflow: "hidden", whiteSpace: "nowrap", opacity: sidebarCollapsed ? 0 : 1, maxWidth: sidebarCollapsed ? 0 : 130, transition: "opacity 150ms, max-width 150ms" }}>{themeMode === "system" ? "System" : isDark ? "Dark" : "Light"}</span>
          </button>
          {/* Activity */}
          <div className="relative" ref={activityRef}>
            <button onClick={() => { setActivityOpen(!activityOpen); if (!activityOpen) markAllRead(); }}
              className="flex w-full items-center gap-[10px] py-[9px] relative"
              style={{ fontSize: 14, fontWeight: 500, letterSpacing: "0.01em", color: activityOpen ? C.text : C.textSec, justifyContent: sidebarCollapsed ? "center" : "flex-start", paddingLeft: sidebarCollapsed ? 0 : 10, paddingRight: sidebarCollapsed ? 0 : 10, transition: "background-color 100ms, padding 220ms", cursor: "pointer", backgroundColor: activityOpen ? C.navActive : "transparent" }}>
              <div className="w-[16px] h-[16px] shrink-0 flex items-center justify-center"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M4 10V7C4 4.8 5.8 3 8 3C10.2 3 12 4.8 12 7V10L13 12H3L4 10Z" stroke="currentColor" strokeWidth="0.7" fill="none" strokeLinejoin="miter"/><path d="M6.5 12C6.5 13.4 7.2 14 8 14C8.8 14 9.5 13.4 9.5 12" stroke="currentColor" strokeWidth="0.7" fill="none"/></svg></div>
              <span style={{ overflow: "hidden", whiteSpace: "nowrap", opacity: sidebarCollapsed ? 0 : 1, maxWidth: sidebarCollapsed ? 0 : 100, transition: "opacity 150ms, max-width 150ms" }}>Activity</span>
              {queueItems.filter(i => i.status === "pending" || i.status === "uploading" || i.status === "processing").length > 0 && (
                <div className="flex items-center justify-center" style={{ minWidth: 14, height: 14, backgroundColor: C.accent, padding: "0 3px", marginLeft: sidebarCollapsed ? undefined : "auto", position: sidebarCollapsed ? "absolute" : undefined, top: sidebarCollapsed ? 6 : undefined, right: sidebarCollapsed ? 6 : undefined }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#fff" }}>{queueItems.filter(i => i.status === "pending" || i.status === "uploading" || i.status === "processing").length}</span>
                </div>
              )}
            </button>
            <AnimatePresence>
              {activityOpen && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.1 }} className="absolute left-0 bottom-full mb-[4px] z-30 w-[320px] overflow-hidden"
                  style={{ backgroundColor: C.bgCard, boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
                  <div className="flex items-center justify-between px-[14px] py-[10px]" style={{ borderBottom: `1px solid ${C.text}08` }}>
                    <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: "0.04em", color: C.text }}>ACTIVITY</span>
                    {queueItems.length > 0 && <span style={{ fontSize: 12, color: C.textMuted }}>{queueItems.filter(i => i.status === "completed").length} / {queueItems.length}</span>}
                  </div>
                  <div className="max-h-[340px] overflow-y-auto">
                    {queueItems.length === 0 ? (
                      <div className="px-[14px] py-[24px] text-center"><span style={{ fontSize: 14, color: C.textMuted }}>NO ACTIVITY YET</span></div>
                    ) : [...queueItems].reverse().map(qi => (
                      <div key={qi.id} className="px-[14px] py-[10px]" style={{ borderBottom: `1px solid ${C.text}08`, cursor: (qi.status === "uploading" || qi.status === "processing") ? "pointer" : undefined }}
                        onClick={() => { if (qi.status === "uploading" || qi.status === "processing") { setAppState("processing"); setView("split"); setActivityOpen(false); } }}>
                        {(qi.status === "uploading" || qi.status === "processing") && (<>
                          <div className="flex items-center justify-between">
                            <p className="truncate" style={{ fontSize: 14, fontWeight: 500, color: C.text, maxWidth: 200 }}>{qi.fileName}</p>
                            <span style={{ fontSize: 12, fontWeight: 600, color: C.textMuted }}>{Math.floor(qi.id === activeItemId ? progress : qi.progress)}%</span>
                          </div>
                          <div className="w-full mt-[6px] mb-[4px]" style={{ height: 3, backgroundColor: C.bgHover }}>
                            <div style={{ height: "100%", width: `${qi.id === activeItemId ? progress : qi.progress}%`, backgroundColor: C.accent, transition: "width 0.3s" }} />
                          </div>
                          <span style={{ fontSize: 12, color: C.textMuted, letterSpacing: "0.03em" }}>{(qi.stage || "PREPARING").toUpperCase()}</span>
                        </>)}
                        {qi.status === "pending" && (
                          <div className="flex items-center justify-between">
                            <p className="truncate" style={{ fontSize: 14, color: C.textMuted, maxWidth: 200 }}>{qi.fileName}</p>
                            <span style={{ fontSize: 12, color: C.textMuted, letterSpacing: "0.03em" }}>PENDING</span>
                          </div>
                        )}
                        {qi.status === "completed" && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-[6px]">
                              <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke={C.accent} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                              <p className="truncate" style={{ fontSize: 14, fontWeight: 500, color: C.text, maxWidth: 180 }}>{qi.fileName}</p>
                            </div>
                            <span style={{ fontSize: 12, color: C.textMuted }}>{qi.job?.stems?.length || 0} stems</span>
                          </div>
                        )}
                        {qi.status === "failed" && (<>
                          <div className="flex items-center justify-between">
                            <p className="truncate" style={{ fontSize: 14, color: "#FF3B30", maxWidth: 200 }}>{qi.fileName}</p>
                            <span style={{ fontSize: 12, color: "#FF3B30", letterSpacing: "0.03em" }}>ERROR</span>
                          </div>
                          <p className="mt-[2px]" style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.4 }}>{formatImportError(qi.errorCode)}</p>
                          <div className="flex items-center gap-[10px] mt-[4px]">
                            {!isTerminalError(qi.errorCode) && (
                              <button onClick={() => retryItem(qi.id)} style={{ fontSize: 12, color: C.accent, letterSpacing: "0.03em" }}>RETRY</button>
                            )}
                            {qi.url && (
                              <button onClick={() => { setInputMode("file"); setView("split"); }} style={{ fontSize: 12, color: C.textMuted, letterSpacing: "0.03em" }}>UPLOAD INSTEAD</button>
                            )}
                          </div>
                        </>)}
                      </div>
                    ))}
                  </div>
                  {queueItems.some(i => i.status === "completed") && (
                    <div className="px-[14px] py-[8px]" style={{ borderTop: `1px solid ${C.text}08` }}>
                      <button onClick={clearCompleted} style={{ fontSize: 12, color: C.textMuted, letterSpacing: "0.03em" }}>CLEAR COMPLETED</button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* ─── Main ─── */}
      <div className="flex flex-1 flex-col overflow-hidden">

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

                    <input ref={inputRef} type="file" className="hidden" accept=".mp3,.wav,.flac,.ogg,.m4a,.aac,.aif,.aiff" multiple
                      onChange={(e) => { const files = Array.from(e.target.files || []); if (files.length) handleFiles(files); e.target.value = ""; }} />
                    {/* @ts-expect-error webkitdirectory is non-standard but widely supported */}
                    <input ref={folderInputRef} type="file" className="hidden" webkitdirectory=""
                      onChange={(e) => { const files = Array.from(e.target.files || []).filter(f => AUDIO_EXTENSIONS.has("." + f.name.split(".").pop()?.toLowerCase())); if (files.length) handleFiles(files); e.target.value = ""; }} />

                    {/* Tabs: UPLOAD | LINK */}
                    <div className="flex items-center gap-[20px] mb-[8px]">
                      {([["file", "UPLOAD"], ["url", "LINK"]] as const).map(([mode, label]) => (
                        <button key={mode} onClick={() => {
                          if (mode === "url" && !urlImport) {
                            setUploadError("Split stems directly from YouTube, Spotify & Dropbox links — available on Pro.");
                            return;
                          }
                          setInputMode(mode); if (mode === "file") setUrlInput(""); if (mode === "url") { setFile(null); setAppState("idle"); }
                        }}
                          className="pb-[6px] text-[14px] font-semibold transition-colors"
                          style={{
                            color: inputMode === mode ? C.text : (!urlImport && mode === "url" ? C.textMuted : C.textMuted),
                            borderBottom: inputMode === mode ? `2px solid ${C.accent}` : "2px solid transparent",
                            letterSpacing: "0.04em",
                            opacity: !urlImport && mode === "url" ? 0.5 : 1,
                          }}>
                          {label}
                          {!urlImport && mode === "url" && (
                            <span style={{ fontSize: 9, fontWeight: 700, color: C.accent, letterSpacing: "0.06em", marginLeft: 6, verticalAlign: "super" }}>PRO</span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Drop zone / URL input */}
                    {inputMode === "url" ? (
                      <div className="flex items-center justify-center transition-all"
                        style={{ minHeight: 160, backgroundColor: C.dropZoneBg, position: "relative" }}>
                        {isValidUrl && urlDurationLoading ? (
                          /* Loading state while fetching metadata */
                          <div className="flex flex-col items-center justify-center w-full" style={{ position: "relative" }}>
                            <div className="flex items-center gap-[10px]">
                              <span style={{ fontSize: 11, fontWeight: 700, color: C.textSec, letterSpacing: "0.06em", padding: "4px 10px", backgroundColor: C.bgHover }}>{detectedPlatform}</span>
                              <span style={{ fontSize: 14, color: C.textMuted, letterSpacing: "0.02em" }}>Analyzing
                                {[0, 1, 2].map(i => (
                                  <motion.span key={i} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.3 }}>.</motion.span>
                                ))}
                              </span>
                            </div>
                            <button onClick={() => { setUrlInput(""); setUrlTitle(null); setPlaylistTracks([]); }}
                              style={{ fontSize: 14, color: C.textMuted, textDecoration: "underline", letterSpacing: "0.03em", position: "absolute", bottom: -30 }}>REMOVE</button>
                          </div>
                        ) : isValidUrl && playlistTracks.length > 0 ? (
                          /* Playlist: same layout as multiple files */
                          <div className="flex flex-col items-center justify-center w-full gap-[4px]" style={{ position: "relative" }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: "0.03em" }}>{playlistTracks.length} TRACKS FROM {detectedPlatform}</span>
                            {playlistTracks.slice(0, 3).map((t, i) => (
                              <span key={i} className="truncate" style={{ fontSize: 13, color: C.textMuted, maxWidth: 400 }}>{t.title || `Track ${i + 1}`}</span>
                            ))}
                            {playlistTracks.length > 3 && (
                              <span style={{ fontSize: 13, color: C.textMuted }}>+{playlistTracks.length - 3} more</span>
                            )}
                            {batchLimit > 0 && playlistTracks.length > batchLimit && (
                              <span style={{ fontSize: 12, color: "#FF3B30", fontWeight: 500, marginTop: 4 }}>
                                {planLabel} plan: {batchLimit} tracks max per batch — upgrade for more
                              </span>
                            )}
                            <button onClick={() => { setUrlInput(""); setUrlTitle(null); setPlaylistTracks([]); }}
                              style={{ fontSize: 13, color: C.textMuted, textDecoration: "underline", letterSpacing: "0.03em", marginTop: 4 }}>REMOVE</button>
                          </div>
                        ) : isValidUrl ? (
                          /* Single track: badge + title */
                          <div className="flex flex-col items-center justify-center w-full" style={{ position: "relative" }}>
                            <div className="flex items-center gap-[10px]">
                              <span style={{ fontSize: 11, fontWeight: 700, color: C.textSec, letterSpacing: "0.06em", padding: "4px 10px", backgroundColor: C.bgHover }}>{detectedPlatform}</span>
                              <span className="truncate" style={{ fontSize: 14, color: C.textSec, maxWidth: 400 }}>{urlTitle || urlInput}</span>
                            </div>
                            <button onClick={() => { setUrlInput(""); setUrlTitle(null); }}
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
                        onClick={() => !file && !pendingFiles.length && !isRecording && inputRef.current?.click()}
                        onDrop={async (e) => { e.preventDefault(); const files = await extractAudioFiles(e.dataTransfer); if (files.length) handleFiles(files); }}
                        onDragOver={(e) => e.preventDefault()}
                        className="flex items-center justify-center transition-all"
                        style={{ minHeight: 160, backgroundColor: C.dropZoneBg, cursor: file || pendingFiles.length || isRecording ? "default" : "pointer", position: "relative" }}>
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
                        ) : pendingFiles.length > 0 ? (
                          <div className="flex flex-col items-center justify-center w-full gap-[4px]" style={{ position: "relative" }}>
                            <span style={{ fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: "0.03em" }}>{pendingFiles.length} FILES SELECTED</span>
                            {pendingFiles.slice(0, 3).map((f, i) => (
                              <span key={i} className="truncate" style={{ fontSize: 13, color: C.textMuted, maxWidth: 400 }}>{f.name}</span>
                            ))}
                            {pendingFiles.length > 3 && (
                              <span style={{ fontSize: 13, color: C.textMuted }}>+{pendingFiles.length - 3} more</span>
                            )}
                            {batchLimit > 0 && (
                              <span style={{ fontSize: 12, color: pendingFiles.length > batchLimit ? "#FF3B30" : C.textMuted, fontWeight: 500, marginTop: 2 }}>
                                {pendingFiles.length}/{batchLimit} tracks
                              </span>
                            )}
                            <button onClick={(e) => { e.stopPropagation(); setPendingFiles([]); setAppState("idle"); }}
                              style={{ fontSize: 13, color: C.textMuted, textDecoration: "underline", letterSpacing: "0.03em", marginTop: 4 }}>REMOVE</button>
                          </div>
                        ) : isRecording ? (
                          <div className="flex items-center gap-[10px]">
                            <span className="relative flex h-[10px] w-[10px]">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex h-[10px] w-[10px] rounded-full bg-red-500" />
                            </span>
                            <span style={{ fontSize: 15, fontWeight: 500, color: C.text, letterSpacing: "0.02em" }}>RECORDING</span>
                            <span className="tabular-nums" style={{ fontSize: 14, color: C.textMuted, letterSpacing: "0.02em" }}>{formatSeconds(elapsedSeconds)}</span>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center gap-[12px]">
                            <span style={{ fontSize: 15, color: C.textMuted, letterSpacing: "0.02em" }}>DROP FILES HERE OR</span>
                            <div className="flex items-center gap-[8px]">
                              <button onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                                style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, letterSpacing: "0.03em", padding: "6px 0", backgroundColor: isDark ? "#242424" : "#E0E0E0", width: 120, textAlign: "center", cursor: "pointer" }}>SELECT FILES</button>
                              <button onClick={(e) => { e.stopPropagation(); folderInputRef.current?.click(); }}
                                style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, letterSpacing: "0.03em", padding: "6px 0", backgroundColor: isDark ? "#242424" : "#E0E0E0", width: 120, textAlign: "center", cursor: "pointer" }}>SELECT FOLDER</button>
                            </div>
                            <span style={{ fontSize: 11, color: C.textMuted, opacity: 0.6, letterSpacing: "0.04em" }}>
                              {PLANS[userPlan].maxFileSizeMB >= 1024 ? `${PLANS[userPlan].maxFileSizeMB / 1024} GB` : `${PLANS[userPlan].maxFileSizeMB} MB`} max
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action bar */}
                    <div className="flex items-center justify-between" style={{ marginTop: 12 }}>
                      <div className="flex items-center gap-[4px]">
                        <button onClick={() => { setInputMode("file"); inputRef.current?.click(); }} className="p-[8px] transition-colors" style={{ color: C.textMuted }}>
                          <RiFileUploadFill size={16}/>
                        </button>
                        <button onClick={isRecording ? handleStopRecording : handleStartRecording}
                          className="p-[8px] transition-colors"
                          style={{ color: isRecording ? "#EF4444" : C.textMuted }}>
                          {isRecording ? <RiStopFill size={16}/> : <RiMicFill size={16}/>}
                        </button>
                        <div className="w-[1px] h-[14px] mx-[6px]" style={{ backgroundColor: C.textMuted, opacity: 0.3 }} />
                        {/* Stems selector */}
                        <div className="relative" ref={stemsRef}>
                          <button onClick={() => { setStemsOpen(!stemsOpen); setFormatOpen(false); }}
                            className="flex items-center gap-[4px] px-[8px] py-[6px] transition-colors"
                            style={{ fontSize: 15, fontWeight: 500, color: C.textMuted, letterSpacing: "0.03em", backgroundColor: stemsOpen ? C.bgHover : undefined }}>
                            {stemLabel}
                            <ChevronDown className="h-[11px] w-[11px]" style={{ color: C.textMuted }} strokeWidth={2} />
                          </button>
                          <AnimatePresence>
                            {stemsOpen && (
                              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                transition={{ duration: 0.1 }} className="absolute left-0 top-full mt-[2px] z-30 w-[220px]"
                                style={{ backgroundColor: C.bgCard }}>
                                {STEM_OPTIONS.map(opt => {
                                  const stemAllowed = stems.includes(opt.value);
                                  return (
                                    <button key={opt.value}
                                      onClick={() => {
                                        if (!stemAllowed) { setUploadError("6 stems requires a Pro plan."); setStemsOpen(false); return; }
                                        setStemCount(opt.value); setStemsOpen(false);
                                      }}
                                      className="flex w-full items-center gap-[8px] px-[12px] py-[10px] text-left transition-colors"
                                      style={{ backgroundColor: stemCount === opt.value ? C.bgHover : undefined, opacity: stemAllowed ? 1 : 0.5 }}>
                                      <div>
                                        <p style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.02em", color: C.text }}>
                                          {opt.label.toUpperCase()}
                                          {!stemAllowed && <span style={{ fontSize: 9, fontWeight: 700, color: C.accent, letterSpacing: "0.06em", marginLeft: 6, verticalAlign: "super" }}>PRO</span>}
                                        </p>
                                        <p style={{ fontSize: 13, color: C.textMuted }}>{opt.desc}</p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                        {/* Format selector */}
                        <div className="relative" ref={formatRef}>
                          <button onClick={() => { setFormatOpen(!formatOpen); setStemsOpen(false); }}
                            className="flex items-center gap-[4px] px-[8px] py-[6px] transition-colors"
                            style={{ fontSize: 15, fontWeight: 500, color: C.textMuted, letterSpacing: "0.03em", backgroundColor: formatOpen ? C.bgHover : undefined }}>
                            {outputFormat.toUpperCase()}
                            <ChevronDown className="h-[11px] w-[11px]" style={{ color: C.textMuted }} strokeWidth={2} />
                          </button>
                          <AnimatePresence>
                            {formatOpen && (
                              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                transition={{ duration: 0.1 }} className="absolute left-0 top-full mt-[2px] z-30 w-[160px]"
                                style={{ backgroundColor: C.bgCard }}>
                                {([["wav", "WAV", "24-bit lossless"], ["mp3", "MP3", "320kbps"]] as const).map(([val, label, desc]) => {
                                  const fmtAllowed = val === "mp3" || wavAllowed;
                                  return (
                                    <button key={val}
                                      onClick={() => {
                                        if (!fmtAllowed) { setUploadError("WAV export requires a Pro plan."); setFormatOpen(false); return; }
                                        setOutputFormat(val); setFormatOpen(false);
                                      }}
                                      className="flex w-full items-center gap-[8px] px-[12px] py-[10px] text-left transition-colors"
                                      style={{ backgroundColor: outputFormat === val ? C.bgHover : undefined, opacity: fmtAllowed ? 1 : 0.5 }}>
                                      <div>
                                        <p style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.02em", color: C.text }}>
                                          {label}
                                          {!fmtAllowed && <span style={{ fontSize: 9, fontWeight: 700, color: C.accent, letterSpacing: "0.06em", marginLeft: 6, verticalAlign: "super" }}>PRO</span>}
                                        </p>
                                        <p style={{ fontSize: 13, color: C.textMuted }}>{desc}</p>
                                      </div>
                                    </button>
                                  );
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                      <div className="flex items-center gap-[10px]">
                        <span style={{ fontSize: 13, color: C.textMuted }}>
                          {urlDurationLoading
                            ? "..."
                            : playlistTracks.length > 0
                              ? `${playlistTracks.length} tracks${totalDurationSec != null ? ` · ${Math.floor(totalDurationSec / 60)}:${String(Math.floor(totalDurationSec % 60)).padStart(2, "0")} total` : ""}`
                              : totalDurationSec != null
                                ? `${Math.floor(totalDurationSec / 60)}:${String(Math.floor(totalDurationSec % 60)).padStart(2, "0")} of credits will be used`
                                : isValidUrl ? "Credits deducted after processing" : ""}
                        </span>
                        <button onClick={handleSplit} disabled={!canSplit}
                          className="flex items-center gap-[6px] px-[16px] py-[8px] transition-all disabled:cursor-not-allowed"
                          style={{ backgroundColor: canSplit ? C.accent : (isDark ? "#242424" : "#E0E0E0"), color: canSplit ? C.accentText : C.textMuted, fontSize: 15, fontWeight: 600, letterSpacing: "0.03em" }}>
                          SPLIT
                        </button>
                      </div>
                    </div>

                    {/* Upload error */}
                    {uploadError && (
                      <div className="px-[14px] py-[10px] mt-[8px]" style={{ backgroundColor: "rgba(255,59,48,0.1)" }}>
                        <span style={{ fontSize: 14, color: "#FF3B30", fontWeight: 500 }}>{uploadError}</span>
                        <div className="flex items-center gap-[12px] mt-[6px]">
                          {uploadErrorFromUrl && (
                            <button onClick={() => { setUploadErrorFromUrl(false); setUploadError(null); setInputMode("file"); }} style={{ fontSize: 13, color: C.accent, fontWeight: 600, letterSpacing: "0.03em" }}>UPLOAD FILE INSTEAD</button>
                          )}
                          <button onClick={() => { setUploadError(null); setUploadErrorFromUrl(false); }} style={{ fontSize: 13, color: "#FF3B30", textDecoration: "underline" }}>DISMISS</button>
                        </div>
                      </div>
                    )}

                    {/* Recent splits */}
                    <div style={{ marginTop: 40 }}>
                      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 20, color: C.text }}>Recent splits</h2>

                      <div style={{ backgroundColor: C.bgCard }}>
                        <div className="flex items-center gap-[10px] px-[16px] py-[10px]" style={{ borderBottom: `1px solid ${C.text}08` }}>
                          <Search className="h-[14px] w-[14px] shrink-0" style={{ color: C.textMuted }} strokeWidth={1.6} />
                          <input type="text" placeholder="SEARCH HISTORY" className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[13px]" style={{ color: C.text, letterSpacing: "0.03em" }} />
                        </div>
                        <div className="flex items-center px-[16px] py-[8px]" style={{ color: C.textMuted, fontSize: 12, fontWeight: 500, letterSpacing: "0.05em", borderBottom: `1px solid ${C.text}08` }}>
                          <span className="flex-1">NAME</span>
                          <span className="w-[60px] text-right">BPM</span>
                          <span className="w-[50px] text-right">KEY</span>
                          <span className="w-[80px] text-right">DURATION</span>
                          <span className="w-[80px] text-right">FORMAT</span>
                          <span className="w-[72px]" />
                        </div>
                        {history.map((item, i) => (
                          <div key={item.id}
                            className="flex items-center px-[16px] py-[14px] cursor-pointer transition-colors"
                            style={{
                              borderBottom: i < history.length - 1 ? `1px solid ${C.text}08` : undefined,
                            }}
                            onClick={() => setExpandedFile(item.id)}>
                            <div className="flex items-center gap-[12px] flex-1 min-w-0">
                              <div className="flex h-[36px] w-[36px] items-center justify-center shrink-0" style={{ backgroundColor: C.bgHover }}>
                                <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="5" width="1.8" height="6" fill={C.textMuted} opacity="0.5"/><rect x="4.8" y="3" width="1.8" height="10" fill={C.textMuted} opacity="0.7"/><rect x="7.6" y="1" width="1.8" height="14" fill={C.textMuted}/><rect x="10.4" y="4" width="1.8" height="8" fill={C.textMuted} opacity="0.7"/><rect x="13.2" y="6" width="1.8" height="4" fill={C.textMuted} opacity="0.5"/></svg>
                              </div>
                              <div className="min-w-0">
                                <p style={{ fontSize: 15, fontWeight: 500, color: C.text }} className="truncate">{item.name}</p>
                                <p style={{ fontSize: 13, color: C.textMuted, marginTop: 1 }}>{item.date} · {item.stems} stems</p>
                              </div>
                            </div>
                            <span className="w-[60px] text-right shrink-0" style={{ fontSize: 13, color: C.textMuted }}>{item.bpm != null ? Math.round(item.bpm) : "—"}</span>
                            <span className="w-[50px] text-right shrink-0" style={{ fontSize: 13, color: C.textMuted }}>{item.key}</span>
                            <span className="w-[80px] text-right shrink-0" style={{ fontSize: 13, color: C.textMuted }}>{item.duration ?? "—"}</span>
                            <span className="w-[80px] text-right shrink-0" style={{ fontSize: 13, color: C.textMuted }}>{item.format.toUpperCase()}</span>
                            <div className="flex items-center justify-end gap-[2px] w-[72px]">
                              <button onClick={(e) => e.stopPropagation()} className="p-[5px]" style={{ color: C.textMuted }}><DownloadIcon size={14} color={C.textMuted}/></button>
                              <button onClick={(e) => e.stopPropagation()} className="p-[5px]" style={{ color: C.textMuted }}><TrashIcon size={14} color={C.textMuted}/></button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Stem detail modal — Recent splits */}
                    <AnimatePresence>
                      {expandedFile && <StemModal expandedFile={expandedFile} items={history} onClose={() => setExpandedFile(null)} onNavigate={setExpandedFile} C={C} stemColors={stemColors} isDark={isDark} labels={LABELS} cachedStemUrls={stemUrlCacheRef.current[expandedFile]} cachedPeaks={stemPeaksCacheRef.current[expandedFile]} outputFormat={outputFormat} workspaceId={WORKSPACE_ID} onShare={isPro && expandedFile ? () => handleShare(expandedFile) : null} />}
                    </AnimatePresence>
                  </>
                )}

                {/* Processing */}
                {appState === "processing" && <ProcessingSection progress={progress} activeAgentIdx={activeAgentIdx} C={C} queueItems={queueItems} activeItemId={activeItemId} onMinimize={() => setAppState("idle")} />}

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
                          color: exportMode && selectedTracks.size > 0 ? C.bg : C.textSec,
                          backgroundColor: exportMode && selectedTracks.size > 0 ? C.text : C.bgHover,
                          cursor: exportMode && selectedTracks.size === 0 ? "not-allowed" : "pointer",
                        }}>
                        <DownloadIcon size={13} color={C.textMuted}/>
                        {exportMode ? `EXPORT${selectedTracks.size > 0 ? ` (${selectedTracks.size})` : ""}` : "EXPORT"}
                      </button>
                    </div>
                  </div>

                  {/* Contained card — same style as Recent splits V2 */}
                  <div style={{ backgroundColor: C.bgCard, overflow: "hidden" }}>
                    {/* Search */}
                    <div className="flex items-center gap-[10px] px-[16px] py-[10px]" style={{ borderBottom: `1px solid ${C.text}08` }}>
                      <Search className="h-[14px] w-[14px] shrink-0" style={{ color: C.textMuted }} strokeWidth={1.6} />
                      <input type="text" value={fileSearch} onChange={e => setFileSearch(e.target.value)}
                        placeholder="SEARCH FILES" className="flex-1 bg-transparent text-[13px] outline-none"
                        style={{ color: C.text, letterSpacing: "0.03em" }} />
                    </div>
                    {/* Filters */}
                    {history.length > 0 && (
                      <div className="flex items-center gap-[20px] px-[16px] py-[9px] flex-wrap" style={{ borderBottom: `1px solid ${C.text}08` }}>
                        {/* BPM */}
                        <div className="flex items-center gap-[5px]">
                          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", color: C.textMuted, marginRight: 3 }}>BPM</span>
                          {(["< 90", "90–120", "120–140", "> 140"] as const).map(label => (
                            <button key={label} onClick={() => setFilterBpm(filterBpm === label ? null : label)}
                              style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.02em", padding: "2px 7px",
                                color: filterBpm === label ? C.bg : C.textSec,
                                backgroundColor: filterBpm === label ? C.text : `${C.text}10` }}>
                              {label}
                            </button>
                          ))}
                        </div>
                        {/* KEY */}
                        {availableKeys.length > 0 && (
                          <div className="flex items-center gap-[5px] flex-wrap">
                            <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", color: C.textMuted, marginRight: 3 }}>KEY</span>
                            {availableKeys.map(k => {
                              const active = filterKeys.has(k);
                              return (
                                <button key={k} onClick={() => setFilterKeys(prev => { const next = new Set(prev); active ? next.delete(k) : next.add(k); return next; })}
                                  style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.02em", padding: "2px 7px",
                                    color: active ? C.bg : C.textSec,
                                    backgroundColor: active ? C.text : `${C.text}10` }}>
                                  {k}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        {/* STEMS */}
                        <div className="flex items-center gap-[5px]">
                          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", color: C.textMuted, marginRight: 3 }}>STEMS</span>
                          {([2, 4, 6] as const).map(n => {
                            const active = filterStems.has(n);
                            return (
                              <button key={n} onClick={() => setFilterStems(prev => { const next = new Set(prev); active ? next.delete(n) : next.add(n); return next; })}
                                style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.02em", padding: "2px 7px",
                                  color: active ? C.bg : C.textSec,
                                  backgroundColor: active ? C.text : `${C.text}10` }}>
                                {n}
                              </button>
                            );
                          })}
                        </div>
                        {/* DURATION */}
                        <div className="flex items-center gap-[5px]">
                          <span style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", color: C.textMuted, marginRight: 3 }}>DURATION</span>
                          {(["< 2min", "2–5min", "> 5min"] as const).map(label => (
                            <button key={label} onClick={() => setFilterDuration(filterDuration === label ? null : label)}
                              style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.02em", padding: "2px 7px",
                                color: filterDuration === label ? C.bg : C.textSec,
                                backgroundColor: filterDuration === label ? C.text : `${C.text}10` }}>
                              {label}
                            </button>
                          ))}
                        </div>
                        {/* Clear */}
                        {hasActiveFilters && (
                          <button onClick={clearFilters}
                            style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.05em", color: C.textMuted, marginLeft: "auto" }}>
                            CLEAR
                          </button>
                        )}
                      </div>
                    )}
                    {/* Column headers */}
                    <div className="flex items-center px-[16px] py-[8px] select-none" style={{ color: C.textMuted, fontSize: 12, fontWeight: 500, letterSpacing: "0.05em", borderBottom: `1px solid ${C.text}08` }}>
                      {exportMode && (
                        <button onClick={toggleAllTracks} className="w-[28px] shrink-0 flex items-center">
                          {allTracksSelected
                            ? <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="0" y="0" width="13" height="13" fill={C.text} opacity="0.9"/></svg>
                            : <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><rect x="0" y="0" width="13" height="13" fill={C.text} opacity="0.08"/></svg>}
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
                          style={{
                            ...(i < sorted.length - 1 ? { borderBottom: `1px solid ${`${C.text}08`}` } : {}),
                            backgroundColor: exportMode ? (isTrackSelected ? (isDark ? C.bgHover : C.bgCard) : (isDark ? "transparent" : C.bgSubtle)) : undefined,
                          }}
                          
                          
                          onClick={() => exportMode ? toggleTrack(item.id) : setExpandedFile(item.id)}>
                          {exportMode && (
                            <button onClick={(e) => { e.stopPropagation(); toggleTrack(item.id); }} className="w-[28px] shrink-0 flex items-center">
                              {isTrackSelected
                                ? <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="0" width="14" height="14" fill={C.text} opacity="0.9"/></svg>
                                : <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="0" y="0" width="14" height="14" fill={C.text} opacity="0.08"/></svg>}
                            </button>
                          )}
                          <div className="flex items-center flex-1 min-w-0" style={{ gap: 12 }}>
                            <div className="flex items-center justify-center shrink-0"
                              style={{
                                height: 36,
                                width: 36,
                                backgroundColor: C.bgHover,
                                borderRadius: 0,
                              }}>
                              <svg width="15" height="15" viewBox="0 0 16 16" fill="none"><rect x="2" y="5" width="1.8" height="6" fill={C.textMuted} opacity="0.5"/><rect x="4.8" y="3" width="1.8" height="10" fill={C.textMuted} opacity="0.7"/><rect x="7.6" y="1" width="1.8" height="14" fill={C.textMuted}/><rect x="10.4" y="4" width="1.8" height="8" fill={C.textMuted} opacity="0.7"/><rect x="13.2" y="6" width="1.8" height="4" fill={C.textMuted} opacity="0.5"/></svg>
                            </div>
                            <div className="min-w-0">
                              <p style={{ fontSize: 15, fontWeight: 500, color: C.text }} className="truncate">{item.name}</p>
                              <p style={{ fontSize: 13, color: C.textMuted, marginTop: 1 }}>{item.date} · {item.stems} stems</p>
                            </div>
                          </div>
                          <span className="w-[60px] text-right shrink-0" style={{ fontSize: 13, color: C.textMuted }}>{item.bpm != null ? Math.round(item.bpm) : "—"}</span>
                          <span className="w-[50px] text-right shrink-0" style={{ fontSize: 13, color: C.textMuted }}>{item.key}</span>
                          <span className="w-[80px] text-right shrink-0" style={{ fontSize: 13, color: C.textMuted }}>{item.duration ?? "—"}</span>
                          <span className="w-[80px] text-right shrink-0" style={{ fontSize: 13, color: C.textMuted }}>{item.format.toUpperCase()}</span>
                          <div className="flex items-center justify-end gap-[2px] w-[72px]">
                            <button onClick={(e) => e.stopPropagation()} className="p-[5px]" style={{ color: C.textMuted }}>
                              <DownloadIcon size={14} color={C.textMuted}/>
                            </button>
                            <button onClick={(e) => e.stopPropagation()} className="p-[5px]" style={{ color: C.textMuted }}>
                              <TrashIcon size={14} color={C.textMuted}/>
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
                            ? <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="0" y="0" width="15" height="15" fill={C.text} opacity="0.9"/></svg>
                            : <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="0" y="0" width="15" height="15" fill={C.text} opacity="0.08"/></svg>}
                          <span style={{ fontSize: 15, fontWeight: 600, color: C.text, letterSpacing: "0.03em" }}>ALL STEMS</span>
                        </button>
                        {allStemTypes.map(stem => {
                          const color = stemColors[stem] || "#999";
                          const isChecked = selectedStems.has(stem);
                          return (
                            <button key={stem} onClick={() => toggleExportStem(stem)}
                              className="flex w-full items-center gap-[10px] px-[12px] py-[10px] transition-colors">
                              {isChecked
                                ? <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="0" y="0" width="15" height="15" fill={C.text} opacity="0.9"/></svg>
                                : <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><rect x="0" y="0" width="15" height="15" fill={C.text} opacity="0.08"/></svg>}
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
                {expandedFile && !exportMode && <StemModal expandedFile={expandedFile} items={sorted} onClose={() => setExpandedFile(null)} onNavigate={setExpandedFile} C={C} stemColors={stemColors} isDark={isDark} labels={LABELS} cachedStemUrls={stemUrlCacheRef.current[expandedFile]} cachedPeaks={stemPeaksCacheRef.current[expandedFile]} outputFormat={outputFormat} workspaceId={WORKSPACE_ID} onShare={isPro && expandedFile ? () => handleShare(expandedFile) : null} />}
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
                    {activeGame === "bpm" && <BpmTap isDark={isDark} isColorful={false} theme={gameTheme} />}
                    {activeGame === "tomato" && <TomatoToss isDark={isDark} isColorful={false} theme={gameTheme} />}
                    {activeGame === "mpc" && <MpcPad isDark={isDark} isColorful={false} theme={gameTheme} />}
                    {activeGame === "melody" && <MelodyMemory isDark={isDark} isColorful={false} theme={gameTheme} />}
                    {activeGame === "freq" && <FrequencyQuiz isDark={isDark} isColorful={false} theme={gameTheme} />}
                    {activeGame === "stem" && <GuessTheStem isDark={isDark} isColorful={false} theme={gameTheme} />}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ SETTINGS ═══ */}
          {view === "settings" && (
            <AccountView C={C} section={settingsSection} onSectionChange={setSettingsSection} planLabel={planLabel} isPro={isPro} minutesUsed={minutesUsed} minutesIncluded={minutesIncluded} rolloverMinutes={rolloverMinutes} minutesAvailable={minutesAvailable} remainingFormatted={remainingFormatted} usagePercent={usagePercent} daysUntilReset={daysUntilReset} onUpgrade={handleUpgrade} onPlanChanged={() => { refetchSubscription(); setTimeout(() => refetchSubscription(), 1500); }} pendingPlanChange={pendingPlanChange} onConsumePendingPlanChange={() => setPendingPlanChange(null)} displayName={displayName} email={email} initials={initials} avatarUrl={avatarUrl} createdAt={createdAt} usageHistory={history.map(h => ({
              date: new Date(h.completedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
              details: h.name,
              type: `${h.stems}-stem`,
              time: `−${h.duration ?? "0:00"}`,
              positive: false,
            }))} />
          )}
        </div>
      </div>

      <WelcomeModal />
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
function ProcessingSection({ progress, activeAgentIdx, C, queueItems, activeItemId, onMinimize }: {
  progress: number; activeAgentIdx: number;
  C: any;
  queueItems?: QueueItem[]; activeItemId?: string | null; onMinimize?: () => void;
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
          <div className="h-full" style={{ backgroundColor: C.accent, width: `${progress}%` }} />
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

        {/* Batch track list */}
        {queueItems && queueItems.length > 1 && (
          <div style={{ marginTop: 4 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: C.textMuted, letterSpacing: "0.04em" }}>
                {queueItems.filter(i => i.status === "completed").length} / {queueItems.length} TRACKS
              </span>
            </div>
            <div className="space-y-[6px]">
              {queueItems.map(qi => (
                <div key={qi.id} className="flex items-center gap-[8px]" style={{ minHeight: 28 }}>
                  <div className="w-[14px] flex items-center justify-center shrink-0">
                    {(qi.status === "uploading" || qi.status === "processing") && (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                        <svg width="10" height="10" viewBox="0 0 12 12">
                          <circle cx="6" cy="6" r="4.5" fill="none" stroke={C.bgHover} strokeWidth="1.5" />
                          <circle cx="6" cy="6" r="4.5" fill="none" stroke={C.accent} strokeWidth="1.5"
                            strokeDasharray={`${2 * Math.PI * 4.5}`} strokeDashoffset={`${2 * Math.PI * 4.5 * 0.75}`} strokeLinecap="square" />
                        </svg>
                      </motion.div>
                    )}
                    {qi.status === "completed" && (
                      <svg width="10" height="10" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke={C.accent} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    )}
                    {qi.status === "pending" && (
                      <div style={{ width: 6, height: 6, backgroundColor: C.textMuted, opacity: 0.3 }} />
                    )}
                    {qi.status === "failed" && (
                      <svg width="10" height="10" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="#FF3B30" strokeWidth="1.5" strokeLinecap="round"/></svg>
                    )}
                  </div>
                  <span className="truncate flex-1" style={{
                    fontSize: 13,
                    color: qi.id === activeItemId ? C.text : qi.status === "completed" ? C.textMuted : qi.status === "failed" ? "#FF3B30" : C.textMuted,
                    fontWeight: qi.id === activeItemId ? 500 : 400,
                  }}>{qi.fileName}</span>
                  {(qi.status === "uploading" || qi.status === "processing") && (
                    <span style={{ fontSize: 12, color: C.textMuted, fontWeight: 600 }}>{Math.floor(qi.id === activeItemId ? progress : qi.progress)}%</span>
                  )}
                  {qi.status === "completed" && (
                    <span style={{ fontSize: 12, color: C.textMuted }}>{qi.job?.stems?.length || 0} stems</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Minimize button */}
        {onMinimize && (
          <div className="flex justify-center" style={{ marginTop: 16 }}>
            <button onClick={onMinimize}
              style={{ fontSize: 13, color: C.textMuted, letterSpacing: "0.04em", padding: "6px 16px", backgroundColor: C.bgHover }}>
              MINIMIZE
            </button>
          </div>
        )}

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
