"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

interface ProgressDisplayProps {
  progress: number;
  stage: string;
}

export function ProgressDisplay({ progress, stage }: ProgressDisplayProps) {
  // History of { pct, ts } to compute real-time speed for ETA
  const history = useRef<{ pct: number; ts: number }[]>([]);

  useEffect(() => {
    const now = Date.now();
    const last = history.current.at(-1);
    // Only record when progress actually moves
    if (!last || last.pct !== progress) {
      history.current.push({ pct: progress, ts: now });
      // Keep only the last 10 data points (≤10s of history)
      if (history.current.length > 10) history.current.shift();
    }
  }, [progress]);

  const formatEta = (): string | null => {
    if (progress >= 100 || history.current.length < 2) return null;

    const now = Date.now();
    // Find a reference point ~5s ago (or oldest available)
    const ref =
      history.current.find((p) => now - p.ts >= 5000) ?? history.current[0];
    const latest = history.current.at(-1)!;

    const deltaPct = latest.pct - ref.pct;
    const deltaMs = latest.ts - ref.ts;

    if (deltaPct <= 0 || deltaMs <= 0) return null;

    const pctPerMs = deltaPct / deltaMs;
    const remainingMs = (100 - progress) / pctPerMs;
    const s = Math.round(remainingMs / 1000);

    if (s <= 0) return null;
    if (s > 60) {
      const min = Math.floor(s / 60);
      const sec = s % 60;
      return `~${min}m ${sec}s remaining`;
    }
    return `~${s}s remaining`;
  };

  const eta = formatEta();

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      {/* Percentage */}
      <div className="font-heading text-6xl font-bold tabular-nums">
        {Math.floor(progress)}
        <span className="text-3xl text-muted-foreground">%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Stage + ETA */}
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm text-muted-foreground">{stage}</p>
        {eta && (
          <p className="text-xs text-muted-foreground/60 tabular-nums">{eta}</p>
        )}
      </div>
    </div>
  );
}
