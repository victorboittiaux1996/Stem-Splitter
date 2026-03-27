"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Download, Play, Pause, RotateCcw, AudioLines, Upload } from "lucide-react";
import { Waveform } from "@/components/dashboard/waveform";
import { WaveformVariant, WAVEFORM_VARIANT_NAMES } from "@/components/dashboard/waveform-variants";
import { useAudioPeaks } from "@/hooks/use-audio-peaks";

// Module-level peak cache — survives React remounts (theme switch, etc.)
const _peakCache = new Map<string, number[]>();

// Pre-fetch peaks into cache before component mounts — call as soon as URLs are available
export function prefetchStemPeaks(urls: Record<string, string>) {
  for (const url of Object.values(urls)) {
    if (!_peakCache.has(url)) {
      fetchAudioPeaks(url).then(p => _peakCache.set(url, p)).catch(() => {});
    }
  }
}

// Extract peak amplitudes from an audio URL (1000 buckets, normalized 0–1)
async function fetchAudioPeaks(url: string, peakCount = 1000): Promise<number[]> {
  const res = await fetch(url);
  const arrayBuffer = await res.arrayBuffer();
  const ctx = new AudioContext();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
  await ctx.close();

  const ch0 = audioBuffer.getChannelData(0);
  let samples: Float32Array;
  if (audioBuffer.numberOfChannels >= 2) {
    const ch1 = audioBuffer.getChannelData(1);
    samples = new Float32Array(ch0.length);
    for (let i = 0; i < ch0.length; i++) samples[i] = (ch0[i] + ch1[i]) / 2;
  } else {
    samples = ch0;
  }

  const bucketSize = Math.floor(samples.length / peakCount);
  const peaks = new Array<number>(peakCount);
  let globalMax = 0;
  for (let i = 0; i < peakCount; i++) {
    const start = i * bucketSize;
    const end = Math.min(start + bucketSize, samples.length);
    let max = 0;
    for (let j = start; j < end; j++) {
      const abs = Math.abs(samples[j]);
      if (abs > max) max = abs;
    }
    peaks[i] = max;
    if (max > globalMax) globalMax = max;
  }
  if (globalMax > 0) {
    for (let i = 0; i < peakCount; i++) peaks[i] = peaks[i] / globalMax;
  }
  return peaks;
}

// ─── Types ──────────────────────────────────────────────────
interface ThemeColors {
  bg: string; bgCard: string; bgSubtle: string; bgHover: string; bgElevated: string;
  text: string; textSec: string; textMuted: string;
  accent: string; accentText: string;
}

interface StemVariantsProps {
  stemCount: 2 | 4 | 6;
  stemMap: Record<number, string[]>;
  labels: Record<string, string>;
  stemColors: Record<string, string>;
  C: ThemeColors;
  isDark: boolean;
  fileName?: string;
  onNewSplit: () => void;
  bpm?: number | null;
  stemKey?: string | null;
  keyRaw?: string | null;
  stemUrls?: Record<string, string>;
  jobId?: string;
  realStemList?: string[];
  trackDuration?: number | null;
}

// ─── Format duration ────────────────────────────────────────
function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

// ─── Main Exported Component ────────────────────────────────
export function StemVariants(props: StemVariantsProps) {
  const { stemCount, stemMap, labels, stemColors, C, fileName, onNewSplit,
    bpm, stemKey, keyRaw, stemUrls, jobId, realStemList, trackDuration } = props;
  const [playingStem, setPlayingStem] = useState<string | null>(null);
  const [wfVariant, setWfVariant] = useState(1);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stemAudioRef = useRef<Record<string, HTMLAudioElement>>({});
  const rafRef = useRef<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { peaks, loading: peaksLoading, error: peaksError, duration } = useAudioPeaks(audioFile);
  const stems = realStemList || stemMap[stemCount] || stemMap[6];
  const fn = audioFile?.name || fileName || "demo_track.wav";
  const isRealMode = !!stemUrls && Object.keys(stemUrls).length > 0;

  // Per-stem real peaks — init from cache immediately so first render is instant
  const [stemPeaks, setStemPeaks] = useState<Record<string, number[]>>(() => {
    if (!stemUrls) return {};
    const initial: Record<string, number[]> = {};
    for (const [name, url] of Object.entries(stemUrls)) {
      const hit = _peakCache.get(url);
      if (hit) initial[name] = hit;
    }
    return initial;
  });
  useEffect(() => {
    if (!isRealMode || !stemUrls) return;
    let cancelled = false;
    // Apply already-cached peaks immediately (no flash)
    const cached: Record<string, number[]> = {};
    for (const [name, url] of Object.entries(stemUrls)) {
      const hit = _peakCache.get(url);
      if (hit) cached[name] = hit;
    }
    if (Object.keys(cached).length > 0) setStemPeaks(cached);
    // Fetch all uncached peaks in parallel
    const uncached = Object.entries(stemUrls).filter(([, url]) => !_peakCache.has(url));
    if (uncached.length > 0) {
      Promise.allSettled(
        uncached.map(async ([name, url]) => {
          const p = await fetchAudioPeaks(url);
          if (cancelled) return;
          _peakCache.set(url, p);
          setStemPeaks(prev => ({ ...prev, [name]: p }));
        })
      );
    }
    return () => { cancelled = true; };
  }, [isRealMode, stemUrls]);

  // Cleanup stem audio elements on unmount
  useEffect(() => {
    return () => {
      Object.values(stemAudioRef.current).forEach(a => { a.pause(); a.src = ""; });
      stemAudioRef.current = {};
    };
  }, []);

  // Create object URL when file changes
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setAudioUrl(null);
  }, [audioFile]);

  // Create/update audio element when URL changes
  useEffect(() => {
    if (!audioUrl) {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
      return;
    }
    const audio = new Audio(audioUrl);
    audio.preload = "auto";
    audioRef.current = audio;
    audio.addEventListener("ended", () => { setPlayingStem(null); setProgress(0); });
    return () => { audio.pause(); audio.src = ""; };
  }, [audioUrl]);

  // Animate progress with rAF
  useEffect(() => {
    if (!playingStem) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      const a = isRealMode ? stemAudioRef.current[playingStem] : audioRef.current;
      if (a && a.duration) setProgress(a.currentTime / a.duration);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playingStem]);

  // Play/pause handler
  const togglePlay = useCallback((name: string) => {
    // Real mode: play from stem download URL
    if (isRealMode && stemUrls[name]) {
      if (playingStem === name) {
        stemAudioRef.current[name]?.pause();
        setPlayingStem(null);
        return;
      }
      // Pause any currently playing stem
      if (playingStem && stemAudioRef.current[playingStem]) {
        stemAudioRef.current[playingStem].pause();
      }
      // Create audio element if needed
      if (!stemAudioRef.current[name]) {
        const a = new Audio(stemUrls[name]);
        a.preload = "auto";
        a.addEventListener("ended", () => { setPlayingStem(null); setProgress(0); });
        stemAudioRef.current[name] = a;
      }
      stemAudioRef.current[name].play();
      setPlayingStem(name);
      return;
    }
    // Demo mode: use single audio element from local file
    const audio = audioRef.current;
    if (!audio || !audioUrl) {
      setPlayingStem(prev => prev === name ? null : name);
      return;
    }
    if (playingStem === name) {
      audio.pause();
      setPlayingStem(null);
    } else {
      audio.play();
      setPlayingStem(name);
    }
  }, [audioUrl, playingStem, isRealMode, stemUrls]);

  // Seek handler
  const handleSeek = useCallback((p: number) => {
    const audio = isRealMode && playingStem ? stemAudioRef.current[playingStem] : audioRef.current;
    if (audio && audio.duration) {
      audio.currentTime = p * audio.duration;
      setProgress(p);
    }
  }, [isRealMode, playingStem]);

  return (
    <div>
      {/* Waveform variant switcher */}
      <div className="flex items-center gap-[4px] mb-[12px] flex-wrap">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(id => (
          <button key={id}
            onClick={() => setWfVariant(id)}
            className="px-[8px] py-[4px] text-[10px] font-bold tracking-wider transition-all"
            style={{
              backgroundColor: id === wfVariant ? C.text : C.bgHover,
              color: id === wfVariant ? C.bg : C.textMuted,
            }}>
            W{id}
          </button>
        ))}
        <span style={{ fontSize: 11, color: C.textMuted, marginLeft: 6 }}>{WAVEFORM_VARIANT_NAMES[wfVariant]}</span>
        <div className="ml-auto flex items-center gap-[6px]">
          {peaksLoading && <span style={{ fontSize: 11, color: C.textMuted }}>Decoding...</span>}
          {peaksError && <span style={{ fontSize: 11, color: "#FF3366" }}>Error: {peaksError}</span>}
          {peaks && <span style={{ fontSize: 11, color: "#00CC66" }}>Real audio</span>}
          <input ref={fileInputRef} type="file" accept="audio/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) setAudioFile(f); }} />
          <button onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-[4px] px-[8px] py-[4px] text-[10px] font-bold tracking-wider transition-all"
            style={{ backgroundColor: peaks ? "#00CC66" : C.bgHover, color: peaks ? "#fff" : C.textMuted }}>
            <Upload className="h-[10px] w-[10px]" strokeWidth={2} />
            {peaks ? "LOADED" : "TEST AUDIO"}
          </button>
        </div>
      </div>

    <div style={{ backgroundColor: C.bgCard }}>
      {/* Header */}
      <div className="flex items-center px-[24px] py-[18px]" style={{ borderBottom: `1px solid ${C.bgHover}` }}>
        <div className="flex h-[36px] w-[36px] items-center justify-center shrink-0" style={{ backgroundColor: C.bgSubtle }}>
          <AudioLines className="h-[15px] w-[15px]" style={{ color: C.textMuted }} strokeWidth={1.4} />
        </div>
        <div className="ml-[14px] min-w-0 flex-1">
          <p style={{ fontSize: 16, fontWeight: 600, color: C.text, lineHeight: 1.2 }} className="truncate">{fn}</p>
          <div className="flex items-center gap-[6px] mt-[5px]">
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textSec, backgroundColor: C.bgHover, padding: "2px 7px", letterSpacing: "0.03em" }}>{bpm != null ? `${Math.round(bpm)} BPM` : "— BPM"}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textSec, backgroundColor: C.bgHover, padding: "2px 7px" }} title={keyRaw || undefined}>{stemKey || "—"}</span>
            <span style={{ fontSize: 11, fontWeight: 600, color: C.textSec, backgroundColor: C.bgHover, padding: "2px 7px" }}>WAV</span>
          </div>
        </div>
        <button onClick={onNewSplit} className="flex items-center gap-[5px] transition-colors shrink-0 ml-[12px]"
          style={{ fontSize: 13, color: C.textMuted, letterSpacing: "0.03em" }}>
          <RotateCcw className="h-[12px] w-[12px]" strokeWidth={1.8} />
          REGENERATE
        </button>
      </div>

      {/* Stems */}
      {stems.map((name, i) => {
        const color = stemColors[name] || "#999";
        const isPlayingThis = playingStem === name;
        return (
          <div key={name}
            className="flex items-center gap-[10px] px-[14px] py-[10px] transition-colors"
            style={{
              backgroundColor: isPlayingThis ? C.bgHover : undefined,
              borderBottom: i < stems.length - 1 ? `1px solid ${C.bgHover}` : undefined,
            }}>
            <button onClick={() => togglePlay(name)}
              className="flex h-[28px] w-[28px] items-center justify-center shrink-0 transition-transform active:scale-95"
              style={{ backgroundColor: color }}>
              {isPlayingThis
                ? <Pause className="h-[10px] w-[10px]" style={{ color: "#fff" }} />
                : <Play className="h-[10px] w-[10px]" style={{ color: "#fff", marginLeft: 1 }} />}
            </button>
            <span className="w-[90px] shrink-0" style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.04em", color: C.text }}>{labels[name] || name.toUpperCase()}</span>
            <div className="flex-1 min-w-0">
              <WaveformVariant variant={wfVariant} seed={(i + 1) * 7919 + 42} color={color} playedColor={color}
                progress={isPlayingThis ? progress : 0} height={36}
                onSeek={handleSeek} data={isRealMode ? (stemPeaks[name] || undefined) : (peaks || undefined)} />
            </div>
            <span style={{ fontSize: 14, color: C.textMuted }}>WAV</span>
            {isRealMode && stemUrls[name] ? (
              <a href={stemUrls[name]} download={`${name}.wav`} className="shrink-0 p-[4px]" style={{ color: C.textMuted }}>
                <Download className="h-[13px] w-[13px]" strokeWidth={1.5} />
              </a>
            ) : (
              <button className="shrink-0 p-[4px]" style={{ color: C.textMuted }}>
                <Download className="h-[13px] w-[13px]" strokeWidth={1.5} />
              </button>
            )}
          </div>
        );
      })}

      {/* Footer */}
      <div className="flex items-center justify-between px-[24px] py-[12px]" style={{ backgroundColor: C.bgSubtle }}>
        <div className="flex items-center gap-[8px]">
          <span style={{ fontSize: 13, color: C.textMuted }}>{stems.length} stems</span>
          <span style={{ fontSize: 13, color: C.textMuted }}>·</span>
          <span style={{ fontSize: 13, color: C.textMuted }}>{(trackDuration ?? duration) ? fmtDuration((trackDuration ?? duration)!) : "—"}</span>
        </div>
        {isRealMode && jobId ? (
          <button onClick={async () => {
            const JSZip = (await import("jszip")).default;
            const zip = new JSZip();
            await Promise.all(stems.map(async (name) => {
              if (stemUrls[name]) {
                const res = await fetch(stemUrls[name]);
                const blob = await res.blob();
                zip.file(`${name}.wav`, blob);
              }
            }));
            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const a = document.createElement("a");
            a.href = url;
            a.download = `stems-${jobId}.zip`;
            a.click();
            URL.revokeObjectURL(url);
          }} className="flex items-center gap-[6px] px-[16px] py-[7px] transition-colors"
            style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.04em", color: C.accentText, backgroundColor: C.accent }}>
            <Download className="h-[12px] w-[12px]" strokeWidth={1.8} />
            DOWNLOAD .ZIP
          </button>
        ) : (
          <button className="flex items-center gap-[6px] px-[16px] py-[7px] transition-colors"
            style={{ fontSize: 15, fontWeight: 600, letterSpacing: "0.04em", color: C.accentText, backgroundColor: C.accent }}>
            <Download className="h-[12px] w-[12px]" strokeWidth={1.8} />
            DOWNLOAD .ZIP
          </button>
        )}
      </div>
    </div>
    </div>
  );
}
