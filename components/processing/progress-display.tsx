"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface ProgressDisplayProps {
  progress: number;
  stage: string;
}

const ESTIMATED_TOTAL_SECONDS = 90; // ~90s on A100

export function ProgressDisplay({ progress, stage }: ProgressDisplayProps) {
  const [displayProgress, setDisplayProgress] = useState(progress);
  const [startTime] = useState(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Smooth progress interpolation when stuck at a value
  useEffect(() => {
    if (progress >= 100) {
      setDisplayProgress(100);
      return;
    }

    // If real progress updates, use it
    if (progress > displayProgress) {
      setDisplayProgress(progress);
      return;
    }

    // Otherwise, simulate progress based on elapsed time
    const interval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setElapsedSeconds(elapsed);

      // Simulate progress: starts fast, slows down approaching 90%
      const simulated = Math.min(90, 15 + (75 * elapsed) / ESTIMATED_TOTAL_SECONDS);
      setDisplayProgress(Math.max(progress, simulated));
    }, 500);

    return () => clearInterval(interval);
  }, [progress, startTime, displayProgress]);

  const remainingSeconds = Math.max(
    0,
    Math.round(ESTIMATED_TOTAL_SECONDS - elapsedSeconds)
  );

  const formatRemaining = (s: number) => {
    if (s > 60) {
      const min = Math.floor(s / 60);
      const sec = s % 60;
      return `~${min}m ${sec}s remaining`;
    }
    return `~${s}s remaining`;
  };

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-6">
      {/* Percentage */}
      <div className="font-heading text-6xl font-bold tabular-nums">
        {Math.floor(displayProgress)}
        <span className="text-3xl text-muted-foreground">%</span>
      </div>

      {/* Progress bar */}
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted/30">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-violet-400"
          animate={{ width: `${displayProgress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>

      {/* Stage + time remaining */}
      <div className="flex flex-col items-center gap-1">
        <p className="text-sm text-muted-foreground">{stage}</p>
        {displayProgress < 100 && (
          <p className="text-xs text-muted-foreground/60 tabular-nums">
            {formatRemaining(remainingSeconds)}
          </p>
        )}
      </div>
    </div>
  );
}
