"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { RiPlayFill, RiStopFill, RiDownloadFill } from "@remixicon/react";
import { motion } from "framer-motion";
import { WaveformVariant } from "@/components/dashboard/waveform-variants";
import { prefetchStemPeaks, _peakCache } from "@/components/stem-variants";
import type { HistoryItem } from "@/lib/types";

interface ThemeColors {
  bg: string;
  bgCard: string;
  bgSubtle: string;
  bgHover: string;
  bgElevated: string;
  text: string;
  textSec: string;
  textMuted: string;
  accent: string;
  accentText: string;
}

interface StemModalProps {
  expandedFile: string;
  items: HistoryItem[];
  onClose: () => void;
  onNavigate: (id: string) => void;
  C: ThemeColors;
  stemColors: Record<string, string>;
  isDark: boolean;
  labels: Record<string, string>;
  /** Pre-fetched stem URLs from parent cache — avoids refetch delay */
  cachedStemUrls?: Record<string, string>;
  /** Pre-computed peaks from server — avoids audio decode delay */
  cachedPeaks?: Record<string, number[]>;
  outputFormat?: "wav" | "mp3";
  /** Workspace ID for scoped API calls */
  workspaceId?: string;
}

export function StemModal({ expandedFile, items, onClose, onNavigate, C, stemColors, isDark, labels, cachedStemUrls, cachedPeaks, outputFormat = "wav", workspaceId }: StemModalProps) {
  const fmt = outputFormat;
  const fmtExt = fmt === "mp3" ? ".mp3" : ".wav";
  const currentItem = items.find(h => h.id === expandedFile);
  if (!currentItem) return null;
  const currentIdx = items.findIndex(h => h.id === expandedFile);
  const prevItem = currentIdx > 0 ? items[currentIdx - 1] : null;
  const nextItem = currentIdx < items.length - 1 ? items[currentIdx + 1] : null;

  const [stemUrls, setStemUrls] = useState<Record<string, string>>({});
  const [playingStem, setPlayingStem] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<Record<string, HTMLAudioElement>>({});
  const rafRef = useRef<number>(0);

  // Load stem URLs when item changes — use cache if available
  useEffect(() => {
    setPlayingStem(null);
    setProgress(0);
    Object.values(audioRef.current).forEach(a => { a.pause(); a.src = ""; });
    audioRef.current = {};

    if (cachedStemUrls && Object.keys(cachedStemUrls).length > 0) {
      setStemUrls(cachedStemUrls);
      return;
    }

    setStemUrls({});
    fetch(`/api/download/${expandedFile}`, {
      headers: workspaceId ? { "x-workspace-id": workspaceId } : {},
    })
      .then(r => r.json())
      .then(d => {
        if (d.stems) {
          const urls = Object.fromEntries((d.stems as { name: string; url: string }[]).map(s => [s.name, s.url]));
          setStemUrls(urls);
          prefetchStemPeaks(urls);
        }
      })
      .catch(() => {});
  }, [expandedFile, cachedStemUrls]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(audioRef.current).forEach(a => { a.pause(); a.src = ""; });
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // Animate progress
  useEffect(() => {
    if (!playingStem) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      const a = audioRef.current[playingStem];
      if (a && a.duration) setProgress(a.currentTime / a.duration);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playingStem]);

  const togglePlay = useCallback((stem: string) => {
    if (playingStem === stem) {
      audioRef.current[stem]?.pause();
      setPlayingStem(null);
      return;
    }
    if (playingStem && audioRef.current[playingStem]) {
      audioRef.current[playingStem].pause();
    }
    if (!audioRef.current[stem] && stemUrls[stem]) {
      const a = new Audio(stemUrls[stem]);
      a.preload = "auto";
      a.addEventListener("ended", () => { setPlayingStem(null); setProgress(0); });
      audioRef.current[stem] = a;
    }
    audioRef.current[stem]?.play();
    setPlayingStem(stem);
  }, [playingStem, stemUrls]);

  const seekStem = useCallback((stem: string, p: number) => {
    if (playingStem !== stem) {
      // Switch to this stem and seek
      if (playingStem && audioRef.current[playingStem]) {
        audioRef.current[playingStem].pause();
      }
      if (!audioRef.current[stem] && stemUrls[stem]) {
        const a = new Audio(stemUrls[stem]);
        a.preload = "auto";
        a.addEventListener("ended", () => { setPlayingStem(null); setProgress(0); });
        audioRef.current[stem] = a;
      }
      const a = audioRef.current[stem];
      if (a) {
        if (a.duration) { a.currentTime = p * a.duration; }
        else { a.addEventListener("loadedmetadata", () => { a.currentTime = p * a.duration; }, { once: true }); }
        a.play();
      }
      setPlayingStem(stem);
      setProgress(p);
    } else {
      const a = audioRef.current[stem];
      if (a && a.duration) { a.currentTime = p * a.duration; setProgress(p); }
    }
  }, [playingStem, stemUrls]);

  const handleNavigate = (id: string) => {
    // Stop playback before navigating
    if (playingStem && audioRef.current[playingStem]) {
      audioRef.current[playingStem].pause();
    }
    setPlayingStem(null);
    setProgress(0);
    onNavigate(id);
  };

  return (
    <motion.div key="stem-modal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0" style={{ backgroundColor: "rgba(0,0,0,0.6)" }} />
      {prevItem && (
        <button onClick={(e) => { e.stopPropagation(); handleNavigate(prevItem.id); }}
          className="absolute left-[24px] z-10 flex h-[40px] w-[40px] items-center justify-center transition-colors"
          style={{ backgroundColor: "rgba(255,255,255,0.08)" }}>
          <ChevronLeft className="h-[18px] w-[18px] text-white" strokeWidth={1.8} />
        </button>
      )}
      {nextItem && (
        <button onClick={(e) => { e.stopPropagation(); handleNavigate(nextItem.id); }}
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
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="5" width="1.8" height="6" fill={C.textMuted} opacity="0.5"/><rect x="4.8" y="3" width="1.8" height="10" fill={C.textMuted} opacity="0.7"/><rect x="7.6" y="1" width="1.8" height="14" fill={C.textMuted}/><rect x="10.4" y="4" width="1.8" height="8" fill={C.textMuted} opacity="0.7"/><rect x="13.2" y="6" width="1.8" height="4" fill={C.textMuted} opacity="0.5"/></svg>
            </div>
            <div className="min-w-0">
              <p style={{ fontSize: 16, fontWeight: 600, color: C.text }} className="truncate">{currentItem.name}</p>
              <p style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>
                {currentItem.date} · {currentItem.duration ?? "---"} · {currentItem.bpm != null ? Math.round(currentItem.bpm) : "---"} BPM · {currentItem.key} · {currentItem.format.toUpperCase()}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-[6px] transition-colors shrink-0 ml-[12px]" style={{ color: C.textMuted }}>
            <X className="h-[16px] w-[16px]" strokeWidth={1.6} />
          </button>
        </div>
        {/* Stems */}
        <div className="py-[4px]">
          {currentItem.stemList.map((stem, si) => {
            const isPlayingThis = playingStem === stem;
            const color = stemColors[stem] || "#999";
            return (
              <div key={stem}
                className="flex items-center gap-[10px] px-[14px] py-[10px] transition-colors"
                style={{
                  backgroundColor: isPlayingThis ? C.bgHover : undefined,
                  borderBottom: si < currentItem.stemList.length - 1 ? `1px solid ${C.bgHover}` : undefined,
                }}>
                <button onClick={() => togglePlay(stem)}
                  className="flex h-[28px] w-[28px] items-center justify-center shrink-0 transition-transform active:scale-95"
                  style={{ backgroundColor: color }}>
                  {isPlayingThis
                    ? <RiStopFill size={14} style={{ color: "#fff" }} />
                    : <RiPlayFill size={14} style={{ color: "#fff" }} />}
                </button>
                <span className="w-[90px] shrink-0" style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.04em", color: C.text }}>{labels[stem] || stem.toUpperCase()}</span>
                <div className="flex-1 min-w-0">
                  <WaveformVariant variant={11} seed={(si + 1) * 3571 + 42} color={color} playedColor={color}
                    progress={isPlayingThis ? progress : 0} height={36}
                    onSeek={(p) => seekStem(stem, p)}
                    data={cachedPeaks?.[stem] || _peakCache.get(stemUrls[stem]) || undefined}
                    cursorColor={isDark ? "#fff" : "#000"} />
                </div>
                <span style={{ fontSize: 14, color: C.textMuted }}>{fmt.toUpperCase()}</span>
                {stemUrls[stem] ? (
                  <a href={`${stemUrls[stem]}${stemUrls[stem].includes("?") ? "&" : "?"}format=${fmt}`} download={`${stem}${fmtExt}`} className="p-[4px]" style={{ color: C.textMuted }}>
                    <RiDownloadFill size={14}/>
                  </a>
                ) : (
                  <button className="p-[4px]" style={{ color: C.textMuted, opacity: 0.3 }}>
                    <RiDownloadFill size={14}/>
                  </button>
                )}
              </div>
            );
          })}
        </div>
        {/* Footer */}
        <div className="flex items-center justify-between px-[24px] py-[12px]" style={{ backgroundColor: C.bgSubtle }}>
          <span style={{ fontSize: 14, color: C.textMuted }}>{currentIdx + 1} / {items.length}</span>
          <button onClick={async () => {
            if (Object.keys(stemUrls).length === 0) return;
            const JSZip = (await import("jszip")).default;
            const zip = new JSZip();
            await Promise.all(Object.entries(stemUrls).map(async ([name, url]) => {
              const dlUrl = `${url}${url.includes("?") ? "&" : "?"}format=${fmt}`;
              const res = await fetch(dlUrl);
              const blob = await res.blob();
              zip.file(`${name}${fmtExt}`, blob);
            }));
            const content = await zip.generateAsync({ type: "blob" });
            const a = document.createElement("a"); a.href = URL.createObjectURL(content);
            a.download = `stems-${currentItem.id}.zip`; a.click();
          }} className="flex items-center gap-[6px] px-[16px] py-[7px] transition-colors"
            style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.04em", color: C.accentText, backgroundColor: C.accent, opacity: Object.keys(stemUrls).length > 0 ? 1 : 0.4 }}>
            <RiDownloadFill size={12}/>
            DOWNLOAD .ZIP
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
