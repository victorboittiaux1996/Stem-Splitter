"use client";

import { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Play,
  Pause,
  Download,
  SkipBack,
  RotateCcw,
} from "lucide-react";
import { Waveform } from "./waveform";

const STEM_CONFIGS: Record<
  string,
  { label: string; color: string; playedColor: string }
> = {
  vocals: { label: "Vocals", color: "#8B5CF6", playedColor: "#7C3AED" },
  drums: { label: "Drums", color: "#F59E0B", playedColor: "#D97706" },
  bass: { label: "Bass", color: "#10B981", playedColor: "#059669" },
  guitar: { label: "Guitar", color: "#F97316", playedColor: "#EA580C" },
  piano: { label: "Piano", color: "#0EA5E9", playedColor: "#0284C7" },
  other: { label: "Other", color: "#F43F5E", playedColor: "#E11D48" },
  instrumental: {
    label: "Instrumental",
    color: "#6366F1",
    playedColor: "#4F46E5",
  },
};

interface ResultsViewProps {
  stemNames: string[];
  duration: number;
  fileName: string;
  onNewSplit: () => void;
  isDark?: boolean;
}

export function ResultsView({
  stemNames,
  duration,
  fileName,
  onNewSplit,
  isDark = true,
}: ResultsViewProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [soloTrack, setSoloTrack] = useState<string | null>(null);
  const [mutedTracks, setMutedTracks] = useState<Set<string>>(new Set());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const progress = duration > 0 ? currentTime / duration : 0;

  const c = {
    text: isDark ? "#E8E8E8" : "#0F0F10",
    textMuted: isDark ? "#9E9E9E" : "#555555",
    textSec: isDark ? "#A6A6AF" : "#6B6B73",
    border: isDark ? "rgba(255,255,255,0.12)" : "#E5E5E8",
    borderSoft: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    bg: isDark ? "#1A1A1B" : "#FFFFFF",
    bgHover: isDark ? "#252527" : "#F4F4F5",
    btnBg: isDark ? "#E8E8E8" : "#0F0F10",
    btnText: isDark ? "#0F0F0F" : "#FFFFFF",
    fgAlpha5: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)",
    fgAlpha8: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    fgAlpha4: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
    seekBg: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    seekFill: isDark ? "#E8E8E8" : "#0F0F10",
  };

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.05;
        });
      }, 50);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, duration]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  const restart = () => {
    setCurrentTime(0);
    if (!isPlaying) setIsPlaying(false);
  };

  const seek = (p: number) => {
    setCurrentTime(p * duration);
  };

  const toggleSolo = (name: string) => {
    setSoloTrack((prev) => (prev === name ? null : name));
  };

  const toggleMute = (name: string) => {
    if (soloTrack === name) {
      setSoloTrack(null);
      return;
    }
    setMutedTracks((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-1 flex-col p-6 gap-4">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="font-heading text-lg font-bold tracking-[-0.01em]" style={{ color: c.text }}>Separation Complete</h2>
          <p style={{ fontSize: 14, color: c.textMuted, marginTop: 2 }}>
            {fileName} &mdash; {stemNames.length} stems
          </p>
        </div>
        <button
          onClick={onNewSplit}
          className="flex items-center gap-2 rounded-[12px] px-3 py-2 font-heading text-[14px] font-semibold tracking-[-0.005em] transition-colors"
          style={{ border: `1px solid ${c.border}`, color: c.textMuted }}
        >
          <RotateCcw className="h-3.5 w-3.5" />
          New split
        </button>
      </motion.div>

      {/* Transport bar */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex items-center gap-3 rounded-[12px] px-4 py-3"
        style={{ border: `1px solid ${c.border}` }}
      >
        <button
          onClick={restart}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors"
          style={{ color: c.textMuted }}
        >
          <SkipBack className="h-4 w-4" />
        </button>

        <button
          onClick={togglePlay}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-transform hover:scale-105 active:scale-95"
          style={{ backgroundColor: c.seekFill, color: c.btnText }}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4 ml-0.5" />
          )}
        </button>

        <span className="w-28 text-center text-sm tabular-nums" style={{ color: c.textMuted }}>
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>

        {/* Global seek bar */}
        <div className="relative flex-1 h-2 rounded-full cursor-pointer group"
          style={{ backgroundColor: c.seekBg }}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const p = (e.clientX - rect.left) / rect.width;
            seek(Math.max(0, Math.min(1, p)));
          }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all"
            style={{ width: `${progress * 100}%`, backgroundColor: c.seekFill }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 h-3.5 w-3.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress * 100}% - 7px)`, backgroundColor: c.seekFill }}
          />
        </div>

        <button className="flex items-center gap-2 rounded-[12px] px-4 py-2 font-heading text-[14px] font-bold tracking-[0.02em] transition-opacity hover:opacity-90"
          style={{ backgroundColor: c.btnBg, color: c.btnText }}>
          <Download className="h-3.5 w-3.5" />
          Download All
        </button>
      </motion.div>

      {/* Track strips */}
      <div className="flex-1 space-y-1.5 overflow-y-auto">
        {stemNames.map((name, i) => {
          const config = STEM_CONFIGS[name] || {
            label: name,
            color: "#6B7280",
            playedColor: "#4B5563",
          };
          const isMuted = mutedTracks.has(name);
          const isSolo = soloTrack === name;
          const isActive = soloTrack ? isSolo : !isMuted;

          return (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="flex items-center gap-3 rounded-[12px] px-4 py-3 transition-all"
              style={{
                border: `1px solid ${isActive ? c.border : c.borderSoft}`,
                backgroundColor: isActive ? c.bg : undefined,
                opacity: isActive ? 1 : 0.4,
              }}
            >
              {/* Color dot + label */}
              <div className="flex w-24 shrink-0 items-center gap-2.5">
                <div
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: config.color }}
                />
                <span className="font-heading text-[14px] font-semibold tracking-[-0.005em] truncate" style={{ color: c.text }}>
                  {config.label}
                </span>
              </div>

              {/* Solo / Mute */}
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => toggleSolo(name)}
                  className="rounded px-2 py-0.5 text-[10px] font-bold tracking-wide transition-colors"
                  style={{
                    backgroundColor: isSolo ? "#F59E0B" : c.fgAlpha5,
                    color: isSolo ? "#451A03" : c.textMuted,
                  }}
                >
                  S
                </button>
                <button
                  onClick={() => toggleMute(name)}
                  className="rounded px-2 py-0.5 text-[10px] font-bold tracking-wide transition-colors"
                  style={{
                    backgroundColor: isMuted ? "#F43F5E" : c.fgAlpha5,
                    color: isMuted ? "#fff" : c.textMuted,
                  }}
                >
                  M
                </button>
              </div>

              {/* Waveform */}
              <div className="flex-1 min-w-0">
                <Waveform
                  seed={(i + 1) * 7919 + 42}
                  color={config.color}
                  playedColor={config.playedColor}
                  progress={progress}
                  height={48}
                  onSeek={seek}
                  barCount={160}
                />
              </div>

              {/* Per-stem download */}
              <button className="shrink-0 rounded-lg p-2 transition-colors" style={{ color: c.textMuted }}>
                <Download className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
