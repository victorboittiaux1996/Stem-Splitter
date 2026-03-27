"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useAudioRecorder, formatSeconds } from "@/hooks/use-audio-recorder";
import { toast } from "sonner";
import { Sidebar, type SidebarView } from "@/components/dashboard/sidebar";
import {
  SettingsPanel,
  type StemCount,
  type OutputFormat,
} from "@/components/dashboard/settings-panel";
import { UploadZone } from "@/components/dashboard/upload-zone";
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
  AudioLines,
  Square,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type AppState = "idle" | "file-selected" | "processing" | "complete";
type LayoutMode = "panel" | "inline";

const STEM_MAP: Record<StemCount, string[]> = {
  2: ["vocals", "instrumental"],
  4: ["vocals", "drums", "bass", "other"],
  6: ["vocals", "drums", "bass", "guitar", "piano", "other"],
};

const STAGES = [
  "Uploading audio...",
  "Analyzing waveform...",
  "Separating vocals with MelBand RoFormer...",
  "Separating instruments with BS-RoFormer...",
  "Finalizing stems...",
];

const MOCK_FILES = [
  { name: "summer_vibes_remix.mp3", date: "2 hours ago", stems: 4, size: "8.2 MB" },
  { name: "midnight_drive_v2.wav", date: "Yesterday", stems: 6, size: "24.1 MB" },
  { name: "acoustic_demo.flac", date: "3 days ago", stems: 2, size: "31.7 MB" },
];

const HISTORY = [
  { name: "Baime - Human Needs [BULKMIXMSTRV2]", date: "7 hours ago", stems: 4, duration: "5m 41s", format: "wav", bpm: 128, key: "Am" },
  { name: "summer_vibes_remix", date: "Yesterday", stems: 6, duration: "3m 24s", format: "mp3", bpm: 95, key: "Db" },
  { name: "midnight_drive_v2", date: "3 days ago", stems: 2, duration: "4m 12s", format: "wav", bpm: 140, key: "F#m" },
  { name: "acoustic_demo_final", date: "1 week ago", stems: 4, duration: "2m 58s", format: "flac", bpm: 72, key: "G" },
];

const STEM_OPTIONS: { value: StemCount; label: string; desc: string; icon: typeof Mic2 }[] = [
  { value: 2, label: "2 Stems", desc: "Vocals + Instrumental", icon: Mic2 },
  { value: 4, label: "4 Stems", desc: "Vocals, Drums, Bass, Other", icon: Music },
  { value: 6, label: "6 Stems", desc: "All instruments separated", icon: Waves },
];

const C = {
  border: "#E5E5E8",
  textMuted: "#939397",
  textLight: "#B5B5B8",
  textSec: "#6B6B73",
  accent: "#EE575A",
  hoverBg: "#F0EFEF",
};

export default function Dashboard() {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("panel");
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
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isRecording, elapsedSeconds, start: startRecording, stop: stopRecording } = useAudioRecorder();
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
      p += Math.random() * 3 + 1.5;
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
    handleFileSelect(recorded);
  }, [stopRecording, handleFileSelect]);

  const showSettingsPanel =
    layoutMode === "panel" &&
    sidebarView === "split" &&
    (appState === "idle" || appState === "file-selected");

  const isUploadState = appState === "idle" || appState === "file-selected";
  const stemLabel = stemCount === 2 ? "2 Stems" : stemCount === 4 ? "4 Stems" : "6 Stems";

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* Sidebar */}
      <Sidebar activeView={sidebarView} onViewChange={setSidebarView} theme={{
        sidebarBg: "#FAFAFA",
        sidebarBorder: "#E5E5E8",
        sidebarText: "#71717A",
        sidebarTextActive: "#0F0F10",
        sidebarActiveItem: "#F4F4F5",
        sidebarHover: "#F4F4F5",
        sidebarLogoBg: "#0F0F10",
        sidebarLogoText: "#FFFFFF",
        sidebarLabel: "#A1A1AA",
      }} />

      {/* Main area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Content column */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Top bar */}
          <div className="flex h-[52px] shrink-0 items-center justify-between px-[20px]" style={{ borderBottom: "1px solid #E5E5E8" }}>
            <div className="flex items-center gap-[12px]">
              <h1 className="font-heading text-[15px] font-semibold tracking-[-0.01em] text-[#0F0F10]">
                {sidebarView === "split"
                  ? "Split Audio"
                  : sidebarView === "files"
                    ? "My Files"
                    : "Settings"}
              </h1>
              {/* Layout switcher */}
              <div className="flex items-center rounded-[8px] p-[2px]" style={{ backgroundColor: "#F4F4F5" }}>
                {(["panel", "inline"] as const).map(m => (
                  <button key={m} onClick={() => setLayoutMode(m)}
                    className="rounded-[6px] px-[8px] py-[3px] transition-all"
                    style={{
                      fontSize: 11, fontWeight: layoutMode === m ? 600 : 400,
                      color: layoutMode === m ? "#0F0F10" : "#939397",
                      backgroundColor: layoutMode === m ? "#fff" : "transparent",
                      boxShadow: layoutMode === m ? "0 1px 2px rgba(0,0,0,0.06)" : undefined,
                    }}>
                    {m === "panel" ? "Panel" : "Inline"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-[8px]">
              <TopBarPill label="Feedback" />
              <TopBarPill label="Docs" />
              <button
                style={{ border: "1px solid #E5E5E8" }}
                className="flex items-center gap-[6px] rounded-full px-[14px] py-[6px] text-[13px] font-medium text-[#3D3D42] transition-colors hover:bg-[#FAFAFA]"
              >
                <HelpCircle className="h-[14px] w-[14px] text-[#6B6B73]" strokeWidth={1.8} />
                Ask
              </button>
              <div className="mx-[4px] h-[16px] w-px" style={{ backgroundColor: "#E5E5E8" }} />
              <button className="rounded-full p-[8px] text-[#6B6B73] transition-colors hover:bg-[#F4F4F5]">
                <Bell className="h-[16px] w-[16px]" strokeWidth={1.6} />
              </button>
              <div
                className="ml-[2px] flex h-[28px] w-[28px] items-center justify-center rounded-full overflow-hidden"
                style={{ backgroundColor: "#E5E5E8" }}
              >
                <span className="text-[11px] font-semibold text-[#6B6B73]">V</span>
              </div>
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 overflow-y-auto">
            {sidebarView === "split" && (
              <>
                {/* ═══ PANEL MODE — original classic ═══ */}
                {layoutMode === "panel" && isUploadState && (
                  <div className="flex flex-1 items-center justify-center p-8 min-h-[calc(100%-60px)]">
                    <div className="w-full max-w-md">
                      <UploadZone
                        file={file}
                        onFileSelect={handleFileSelect}
                        onFileClear={handleFileClear}
                      />
                    </div>
                  </div>
                )}

                {/* ═══ INLINE MODE — 900px centered ═══ */}
                {layoutMode === "inline" && isUploadState && (
                  <div className="px-[32px] pb-[40px] pt-[24px]">
                    <div style={{ maxWidth: 900, margin: "0 auto" }}>
                      <h2 style={{ fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 24 }}>
                        Split Audio
                      </h2>

                      {/* Drop zone — wide, subtle grey bg like sidebar */}
                      <div
                        onClick={() => !file && !isRecording && document.getElementById("inline-file-input")?.click()}
                        className="flex items-center justify-center transition-all duration-150 rounded-[16px]"
                        style={{
                          minHeight: 160,
                          border: `1px solid ${C.border}`,
                          backgroundColor: "#FAFAFA",
                          cursor: file || isRecording ? "default" : "pointer",
                        }}>
                        <input id="inline-file-input" type="file" className="hidden" accept=".mp3,.wav,.flac,.ogg,.m4a,.aac,.webm"
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                        {file ? (
                          <div className="flex flex-col items-center gap-[8px]">
                            <FileAudio className="h-[20px] w-[20px]" style={{ color: C.textMuted }} strokeWidth={1.4} />
                            <p style={{ fontSize: 14, fontWeight: 600 }}>{file.name}</p>
                            <button onClick={(e) => { e.stopPropagation(); handleFileClear(); }}
                              className="flex items-center gap-[4px] rounded-[6px] px-[8px] py-[3px] transition-colors hover:bg-[#EEEDEC]"
                              style={{ fontSize: 12, color: C.textMuted }}>
                              <Trash2 className="h-[11px] w-[11px]" /> Remove
                            </button>
                          </div>
                        ) : isRecording ? (
                          <div className="flex items-center gap-[10px]">
                            <span className="relative flex h-[10px] w-[10px]">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                              <span className="relative inline-flex h-[10px] w-[10px] rounded-full bg-red-500" />
                            </span>
                            <p style={{ fontSize: 15, fontWeight: 500 }}>Recording...</p>
                            <p className="tabular-nums" style={{ fontSize: 14, color: C.textMuted }}>{formatSeconds(elapsedSeconds)}</p>
                          </div>
                        ) : (
                          <p style={{ fontSize: 15, color: C.textMuted }}>Drop files here</p>
                        )}
                      </div>

                      {/* Action bar */}
                      <div className="flex items-center justify-between mt-[12px]">
                        <div className="flex items-center gap-[4px]">
                          <button onClick={() => document.getElementById("inline-file-input")?.click()}
                            className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] transition-colors hover:bg-[#EEEDEC]">
                            <Upload className="h-[16px] w-[16px]" style={{ color: C.textMuted }} strokeWidth={1.6} />
                          </button>
                          <button onClick={isRecording ? handleStopRecording : handleStartRecording}
                            className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] transition-colors hover:bg-[#EEEDEC]"
                            style={isRecording ? { backgroundColor: "#FEE2E2" } : undefined}>
                            {isRecording
                              ? <Square className="h-[14px] w-[14px] text-red-500" strokeWidth={1.8} fill="currentColor" />
                              : <Mic className="h-[16px] w-[16px]" style={{ color: C.textMuted }} strokeWidth={1.6} />}
                          </button>
                          <div className="w-[1px] h-[16px] mx-[8px]" style={{ backgroundColor: C.border }} />
                          {/* Stems dropdown */}
                          <div className="relative" ref={stemsRef}>
                            <button onClick={() => { setStemsOpen(!stemsOpen); setFormatOpen(false); }}
                              className="flex items-center gap-[5px] rounded-[8px] px-[10px] py-[6px] transition-colors hover:bg-[#EEEDEC]"
                              style={{ fontSize: 13, fontWeight: 500, color: C.textSec, backgroundColor: stemsOpen ? C.hoverBg : undefined }}>
                              {stemLabel}
                              <ChevronDown className="h-[11px] w-[11px]" style={{ color: C.textLight, transform: stemsOpen ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} strokeWidth={2} />
                            </button>
                            <AnimatePresence>
                              {stemsOpen && (
                                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute left-0 top-full mt-[4px] z-30 w-[240px] rounded-[12px] overflow-hidden"
                                  style={{ backgroundColor: "#fff", border: `1px solid ${C.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
                                  {STEM_OPTIONS.map(opt => (
                                    <button key={opt.value} onClick={() => { setStemCount(opt.value); setStemsOpen(false); }}
                                      className="flex w-full items-center gap-[10px] px-[14px] py-[11px] text-left transition-colors hover:bg-[#FAFAFA]"
                                      style={stemCount === opt.value ? { backgroundColor: "#F4F4F5" } : undefined}>
                                      <div className="flex h-[28px] w-[28px] items-center justify-center rounded-full shrink-0" style={{ backgroundColor: "#F4F4F5" }}>
                                        <opt.icon className="h-[13px] w-[13px]" style={{ color: C.textMuted }} strokeWidth={1.6} />
                                      </div>
                                      <div>
                                        <p style={{ fontSize: 13, fontWeight: 600 }}>{opt.label}</p>
                                        <p style={{ fontSize: 11, color: C.textMuted }}>{opt.desc}</p>
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
                              className="flex items-center gap-[5px] rounded-[8px] px-[10px] py-[6px] transition-colors hover:bg-[#EEEDEC]"
                              style={{ fontSize: 13, fontWeight: 500, color: C.textSec, backgroundColor: formatOpen ? C.hoverBg : undefined }}>
                              {outputFormat.toUpperCase()}
                              <ChevronDown className="h-[11px] w-[11px]" style={{ color: C.textLight, transform: formatOpen ? "rotate(180deg)" : undefined, transition: "transform 0.15s" }} strokeWidth={2} />
                            </button>
                            <AnimatePresence>
                              {formatOpen && (
                                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute left-0 top-full mt-[4px] z-30 w-[160px] rounded-[10px] overflow-hidden"
                                  style={{ backgroundColor: "#fff", border: `1px solid ${C.border}`, boxShadow: "0 8px 24px rgba(0,0,0,0.1)" }}>
                                  {([["wav", "WAV (Lossless)"], ["mp3", "MP3 (128kbps)"]] as const).map(([val, label]) => (
                                    <button key={val} onClick={() => { setOutputFormat(val as OutputFormat); setFormatOpen(false); }}
                                      className="flex w-full px-[14px] py-[10px] text-left transition-colors hover:bg-[#FAFAFA]"
                                      style={{ fontSize: 13, fontWeight: outputFormat === val ? 600 : 400, backgroundColor: outputFormat === val ? "#F4F4F5" : undefined }}>
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
                              className="flex h-[36px] w-[36px] items-center justify-center rounded-[10px] transition-colors hover:bg-[#EEEDEC]"
                              style={{ backgroundColor: extraOpen ? C.hoverBg : undefined }}>
                              <Settings2 className="h-[15px] w-[15px]" style={{ color: extraOpen ? "#0F0F10" : C.textMuted }} strokeWidth={1.6} />
                            </button>
                            <AnimatePresence>
                              {extraOpen && (
                                <motion.div initial={{ opacity: 0, y: 4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: 0.97 }}
                                  transition={{ duration: 0.12 }}
                                  className="absolute left-0 top-full mt-[6px] z-30 w-[280px]"
                                  style={{ backgroundColor: "#fff", borderRadius: 14, border: `1px solid ${C.border}`, boxShadow: "0 8px 30px rgba(0,0,0,0.1)" }}>
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
                                    </div>
                                    <div className="space-y-[6px]">
                                      <label style={{ fontSize: 11, fontWeight: 600, color: C.textMuted, letterSpacing: "0.03em", textTransform: "uppercase" as const }}>Quality</label>
                                      <input type="range" min={0} max={1} step={0.01} defaultValue={0.7} className="w-full h-[3px] cursor-pointer" style={{ accentColor: C.accent }} />
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
                        </div>
                        <div className="flex items-center gap-[12px]">
                          <span style={{ fontSize: 13, color: C.textLight }}>0 / 10,000 credits</span>
                          <button onClick={handleSplit} disabled={!file}
                            className="flex h-[36px] w-[36px] items-center justify-center rounded-full text-white transition-all hover:opacity-90 disabled:opacity-25 disabled:cursor-not-allowed"
                            style={{ backgroundColor: file ? "#0F0F10" : "#D4D4D8" }}>
                            <Scissors className="h-[14px] w-[14px]" strokeWidth={2} />
                          </button>
                        </div>
                      </div>

                      {/* Recent splits */}
                      <div className="mt-[40px]">
                        <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 20 }}>Recent splits</h2>
                        <div className="space-y-[6px]">
                          {HISTORY.map((item, i) => (
                            <motion.div key={item.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}
                              className="flex items-center gap-[14px] rounded-[12px] px-[16px] py-[14px] transition-colors hover:bg-[#F4F4F5] cursor-pointer"
                              style={{ backgroundColor: "#FAFAFA", border: `1px solid ${C.border}` }}>
                              <div className="flex h-[38px] w-[38px] items-center justify-center rounded-[8px] shrink-0" style={{ backgroundColor: "#F4F4F5" }}>
                                <AudioLines className="h-[16px] w-[16px]" style={{ color: C.textMuted }} strokeWidth={1.4} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p style={{ fontSize: 14, fontWeight: 500 }} className="truncate">{item.name}</p>
                                <p style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}>{item.date} · {item.stems} stems · {item.duration}</p>
                              </div>
                              <div className="flex items-center gap-[6px] shrink-0">
                                <span className="rounded-[6px] px-[7px] py-[2px]" style={{ fontSize: 11, fontWeight: 600, color: C.textSec, backgroundColor: "#F4F4F5" }}>{item.bpm} BPM</span>
                                <span className="rounded-[6px] px-[7px] py-[2px]" style={{ fontSize: 11, fontWeight: 600, color: C.textSec, backgroundColor: "#F4F4F5" }}>{item.key}</span>
                              </div>
                              <span style={{ fontSize: 12, color: C.textLight, marginRight: 4 }}>{item.format.toUpperCase()}</span>
                              <div className="flex items-center gap-[2px]">
                                <button className="p-[6px] rounded-[6px] transition-colors hover:bg-[#F4F4F5]">
                                  <Download className="h-[14px] w-[14px]" style={{ color: C.textMuted }} strokeWidth={1.5} />
                                </button>
                                <button className="p-[6px] rounded-[6px] transition-colors hover:bg-[#F4F4F5]">
                                  <Trash2 className="h-[14px] w-[14px]" style={{ color: C.textMuted }} strokeWidth={1.5} />
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {appState === "processing" && (
                  <ProcessingView progress={progress} stage={stage} />
                )}

                {appState === "complete" && (
                  <ResultsView
                    stemNames={STEM_MAP[stemCount]}
                    duration={214}
                    fileName={file?.name || "Unknown"}
                    onNewSplit={handleNewSplit}
                  />
                )}
              </>
            )}

            {sidebarView === "files" && (
              <div className="p-6">
                <div className="mx-auto max-w-2xl space-y-2">
                  {MOCK_FILES.map((f, i) => (
                    <motion.div
                      key={f.name}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{ border: "1px solid #E5E5E8" }}
                      className="flex items-center gap-4 rounded-[12px] px-5 py-4 transition-colors hover:bg-[#FAFAFA]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[#F4F4F5]">
                        <FileAudio className="h-5 w-5 text-[#949494]" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[#0F0F10] truncate">{f.name}</p>
                        <div className="mt-0.5 flex items-center gap-2.5 text-[12px] text-[#949494]">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {f.date}
                          </span>
                          <span>{f.stems} stems</span>
                          <span>{f.size}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 rounded-full bg-[#ECFDF5] px-2.5 py-1">
                        <CheckCircle2 className="h-3 w-3 text-[#059669]" />
                        <span className="text-[11px] font-medium text-[#059669]">Complete</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {sidebarView === "settings" && (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 min-h-full">
                <div className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-[#F4F4F5]">
                  <Settings2 className="h-5 w-5 text-[#949494]" strokeWidth={1.5} />
                </div>
                <p className="text-[14px] text-[#949494]">Account settings coming soon</p>
              </div>
            )}
          </div>

          {/* Bottom action bar — panel mode only */}
          {layoutMode === "panel" && sidebarView === "split" && appState !== "complete" && (
            <div
              className="flex h-[60px] shrink-0 items-center justify-between px-[20px]"
              style={{ borderTop: "1px solid #E5E5E8" }}
            >
              <div className="flex items-center gap-[8px] text-[13px] text-[#949494]">
                <div className="flex h-[18px] w-[18px] items-center justify-center rounded-full" style={{ border: "1.5px solid #D4D4D8" }}>
                  <span className="text-[8px] font-bold text-[#949494]">⚡</span>
                </div>
                <span>{new Intl.NumberFormat("en-US").format(credits)} credits remaining</span>
              </div>
              <div className="flex items-center gap-[12px]">
                <span className="text-[13px] tabular-nums text-[#BBBBC4] font-medium">0:00 total duration</span>
                <div className="flex items-center gap-[4px]">
                  <button className="rounded-[8px] p-[8px] text-[#BBBBC4] transition-colors hover:bg-[#F4F4F5] hover:text-[#6B6B73]">
                    <Download className="h-[16px] w-[16px]" strokeWidth={1.8} />
                  </button>
                  <button className="rounded-[8px] p-[8px] text-[#BBBBC4] transition-colors hover:bg-[#F4F4F5] hover:text-[#6B6B73]">
                    <Trash2 className="h-[16px] w-[16px]" strokeWidth={1.8} />
                  </button>
                </div>
                <button
                  onClick={handleSplit}
                  disabled={!file || appState === "processing"}
                  style={{ backgroundColor: file && appState !== "processing" ? "#0F0F10" : "#D4D4D8" }}
                  className="flex items-center gap-[8px] rounded-[10px] px-[20px] py-[10px] text-[14px] font-semibold text-white transition-all hover:opacity-90 disabled:cursor-not-allowed"
                >
                  <Scissors className="h-[14px] w-[14px]" strokeWidth={2} />
                  Split audio
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Settings panel (right) — panel mode only */}
        {showSettingsPanel && (
          <SettingsPanel
            stemCount={stemCount}
            onStemCountChange={setStemCount}
            outputFormat={outputFormat}
            onOutputFormatChange={setOutputFormat}
          />
        )}
      </div>
    </div>
  );
}

function TopBarPill({ label }: { label: string }) {
  return (
    <button
      style={{ border: "1px solid #E5E5E8" }}
      className="rounded-full px-[14px] py-[6px] text-[13px] font-medium text-[#3D3D42] transition-colors hover:bg-[#FAFAFA]"
    >
      {label}
    </button>
  );
}
