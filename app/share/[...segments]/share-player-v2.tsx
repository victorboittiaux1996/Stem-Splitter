"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { RiPlayFill, RiStopFill, RiVolumeUpFill, RiVolumeMuteFill } from "@remixicon/react";
import { WaveformVariant } from "@/components/dashboard/waveform-variants";
import { downloadBlob } from "@/lib/download";
import { stemColors } from "@/components/website/theme";

const DownloadIcon = ({ size = 14, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none">
    <path d="M8 2V9.5M5 8L8 11L11 8" stroke={color} strokeWidth="0.7" fill="none" strokeLinejoin="miter"/>
    <line x1="3" y1="14" x2="13" y2="14" stroke={color} strokeWidth="0.7"/>
  </svg>
);

// ─── Audio peak extraction ─────────────────────────────────
const PEAK_CACHE = new Map<string, number[]>();

async function fetchAudioPeaks(url: string, peakCount = 1000): Promise<number[]> {
  if (PEAK_CACHE.has(url)) return PEAK_CACHE.get(url)!;
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
  PEAK_CACHE.set(url, peaks);
  return peaks;
}

// ─── Colors ─────────────────────────────────────────────────
const C = {
  bg: "#F3F3F3",
  bgCard: "#FFFFFF",
  text: "#000000",
  textMuted: "#999999",
  accent: "#1B10FD",
} as const;

// ─── Types ──────────────────────────────────────────────────
interface StemData {
  name: string;
  mp3Url: string | null;
  wavUrl: string;
}

interface SharePlayerProps {
  stems: StemData[];
  trackName: string;
  peaks?: Record<string, number[]>;
}

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function SharePlayerV2({ stems, trackName, peaks: serverPeaks }: SharePlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [peaks, setPeaks] = useState<Record<string, number[]>>(serverPeaks ?? {});
  const [muted, setMuted] = useState<Set<string>>(new Set());
  const [soloed, setSoloed] = useState<Set<string>>(new Set());
  const [zipping, setZipping] = useState(false);
  const [downloadingStem, setDownloadingStem] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const audioRef = useRef<Record<string, HTMLAudioElement>>({});
  const rafRef = useRef<number>(0);
  const masterRef = useRef<string>(stems[0]?.name ?? "");

  // Initialize all audio elements
  useEffect(() => {
    let loadedCount = 0;
    const total = stems.length;

    stems.forEach((stem) => {
      const url = stem.mp3Url || stem.wavUrl;
      const a = new Audio(url);
      a.preload = "auto";
      a.addEventListener("loadedmetadata", () => {
        loadedCount++;
        if (stem.name === masterRef.current && a.duration) {
          setDuration(a.duration);
        }
        if (loadedCount >= total) setReady(true);
      }, { once: true });
      a.addEventListener("ended", () => {
        setPlaying(false);
        setProgress(0);
      });
      audioRef.current[stem.name] = a;
    });

    return () => {
      Object.values(audioRef.current).forEach((a) => { a.pause(); a.src = ""; });
      cancelAnimationFrame(rafRef.current);
    };
  }, [stems]);

  // Fetch peaks only if not provided by server
  useEffect(() => {
    if (serverPeaks && Object.keys(serverPeaks).length > 0) return;
    stems.forEach((stem) => {
      const url = stem.mp3Url || stem.wavUrl;
      fetchAudioPeaks(url).then((p) => {
        setPeaks((prev) => ({ ...prev, [stem.name]: p }));
      }).catch(() => {});
    });
  }, [stems, serverPeaks]);

  // Animate progress
  useEffect(() => {
    if (!playing) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const tick = () => {
      const master = audioRef.current[masterRef.current];
      if (master && master.duration) {
        setProgress(master.currentTime / master.duration);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing]);

  // Update mute states when solo/mute change
  useEffect(() => {
    const hasSolo = soloed.size > 0;
    stems.forEach((stem) => {
      const a = audioRef.current[stem.name];
      if (!a) return;
      if (hasSolo) {
        a.muted = !soloed.has(stem.name) || muted.has(stem.name);
      } else {
        a.muted = muted.has(stem.name);
      }
    });
  }, [soloed, muted, stems]);

  const togglePlay = useCallback(() => {
    if (playing) {
      Object.values(audioRef.current).forEach((a) => a.pause());
      setPlaying(false);
    } else {
      // Sync all to master position
      const master = audioRef.current[masterRef.current];
      const currentTime = master?.currentTime ?? 0;
      Object.values(audioRef.current).forEach((a) => {
        a.currentTime = currentTime;
        a.play().catch(() => {});
      });
      setPlaying(true);
    }
  }, [playing]);

  const seek = useCallback((p: number) => {
    const time = p * duration;
    Object.values(audioRef.current).forEach((a) => {
      a.currentTime = time;
    });
    setProgress(p);
    if (!playing) {
      Object.values(audioRef.current).forEach((a) => a.play().catch(() => {}));
      setPlaying(true);
    }
  }, [duration, playing]);

  const toggleMute = useCallback((name: string) => {
    setMuted((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  const toggleSolo = useCallback((name: string) => {
    setSoloed((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }, []);

  const handleDownloadZip = async () => {
    setZipping(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      await Promise.all(
        stems.map(async (s) => {
          const res = await fetch(s.wavUrl);
          if (!res.ok) throw new Error(`Failed to fetch ${s.name}: ${res.status}`);
          const blob = await res.blob();
          const label = s.name.charAt(0).toUpperCase() + s.name.slice(1);
          // STORE: audio is already compressed / incompressible — skip DEFLATE
          // so finalize is ~5-10× faster on bulk exports.
          zip.file(`${trackName} - ${label}.wav`, blob, { compression: "STORE" });
        })
      );
      const content = await zip.generateAsync({
        type: "blob",
        compression: "STORE",
        streamFiles: true,
      });
      const objUrl = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = objUrl;
      a.download = `${trackName} - Stems.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(objUrl), 10_000);
    } finally {
      setZipping(false);
    }
  };

  const hasSolo = soloed.size > 0;
  const currentTime = progress * duration;

  return (
    <div>
      {/* Transport bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 20px", backgroundColor: C.bgCard, borderBottom: "1px solid #EBEBEB" }}>
        <button
          onClick={togglePlay}
          disabled={!ready}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 36, height: 36, flexShrink: 0,
            backgroundColor: C.accent, border: "none", cursor: ready ? "pointer" : "default",
            opacity: ready ? 1 : 0.4, transition: "opacity 0.15s",
          }}
        >
          {playing
            ? <RiStopFill size={16} style={{ color: "#fff" }} />
            : <RiPlayFill size={16} style={{ color: "#fff" }} />}
        </button>
        <span style={{ fontSize: 13, fontWeight: 600, color: C.textMuted, fontVariantNumeric: "tabular-nums", flexShrink: 0 }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <div style={{ flex: 1 }} />
        <button
          onClick={handleDownloadZip}
          disabled={zipping}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
            padding: "5px 12px", fontSize: 12, fontWeight: 600, letterSpacing: "0.04em",
            color: "#FFFFFF", backgroundColor: C.accent, border: "none",
            cursor: zipping ? "default" : "pointer", opacity: zipping ? 0.6 : 1,
            // Locked width so the label swap (DOWNLOAD .ZIP ↔ BUILDING ZIP…)
            // never resizes the button.
            minWidth: 150,
          }}
        >
          {zipping && (
            <span
              className="animate-spin inline-block"
              style={{ width: 11, height: 11, border: "1.5px solid #FFFFFF", borderTopColor: "transparent", borderRadius: "50%" }}
            />
          )}
          {zipping ? "BUILDING ZIP…" : "DOWNLOAD .ZIP"}
        </button>
      </div>

      {/* Stems */}
      <div style={{ backgroundColor: C.bgCard }}>
        {stems.map((stem, si) => {
          const color = stemColors[stem.name as keyof typeof stemColors] || "#777";
          const isMuted = muted.has(stem.name);
          const isSoloed = soloed.has(stem.name);
          const isAudible = hasSolo ? (isSoloed && !isMuted) : !isMuted;
          return (
            <div
              key={stem.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "14px 20px",
                borderBottom: si < stems.length - 1 ? "1px solid #EBEBEB" : undefined,
                opacity: isAudible ? 1 : 0.4,
                transition: "opacity 0.15s",
              }}
            >
              {/* Solo button */}
              <button
                onClick={() => toggleSolo(stem.name)}
                style={{
                  width: 28, height: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 700, letterSpacing: "0.02em",
                  backgroundColor: isSoloed ? color : "#F3F3F3",
                  color: isSoloed ? "#fff" : color,
                  border: "none",
                  cursor: "pointer", transition: "all 0.15s",
                }}
              >
                S
              </button>

              {/* Mute button */}
              <button
                onClick={() => toggleMute(stem.name)}
                style={{
                  width: 28, height: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  backgroundColor: isMuted ? "#FF3B30" : "#F3F3F3",
                  color: isMuted ? "#fff" : "#AAAAAA",
                  border: "none",
                  cursor: "pointer", transition: "all 0.15s", padding: 0,
                }}
              >
                {isMuted
                  ? <RiVolumeMuteFill size={14} />
                  : <RiVolumeUpFill size={14} />}
              </button>

              {/* Stem label */}
              <span
                style={{
                  width: 80,
                  flexShrink: 0,
                  fontSize: 13,
                  fontWeight: 600,
                  letterSpacing: "0.04em",
                  color: C.text,
                  textTransform: "uppercase",
                }}
              >
                {stem.name}
              </span>

              {/* Waveform */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <WaveformVariant
                  variant={11}
                  seed={(si + 1) * 3571 + 42}
                  color={color}
                  playedColor={color}
                  progress={progress}
                  height={44}
                  onSeek={seek}
                  data={peaks[stem.name]}
                  cursorColor="#000"
                />
              </div>

              {/* Download WAV */}
              <button
                disabled={downloadingStem === stem.name}
                onClick={async () => {
                  if (downloadingStem === stem.name) return;
                  setDownloadingStem(stem.name);
                  try {
                    const label = stem.name.charAt(0).toUpperCase() + stem.name.slice(1);
                    await downloadBlob(stem.wavUrl, `${trackName} - ${label}.wav`);
                  } finally {
                    setDownloadingStem(null);
                  }
                }}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: 32, height: 32, flexShrink: 0,
                  backgroundColor: "transparent", border: "none",
                  cursor: downloadingStem === stem.name ? "default" : "pointer",
                  color: C.textMuted,
                  opacity: downloadingStem === stem.name ? 0.6 : 1,
                }}
              >
                {/* Fixed 16×16 slot prevents any shift between the icon and the spinner. */}
                <span style={{ width: 16, height: 16, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  {downloadingStem === stem.name ? (
                    <span
                      className="animate-spin inline-block"
                      style={{ width: 14, height: 14, border: `1.5px solid ${C.textMuted}`, borderTopColor: "transparent", borderRadius: "50%" }}
                    />
                  ) : (
                    <DownloadIcon size={14} color={C.textMuted} />
                  )}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
