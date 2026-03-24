"use client";

import { useMemo } from "react";

interface WaveformProps {
  seed: number;
  barCount?: number;
  color: string;
  playedColor?: string;
  progress: number; // 0-1
  height?: number;
  onSeek?: (progress: number) => void;
}

function seededRandom(seed: number) {
  let s = Math.abs(seed) || 1;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function Waveform({
  seed,
  barCount = 120,
  color,
  playedColor,
  progress,
  height = 48,
  onSeek,
}: WaveformProps) {
  const bars = useMemo(() => {
    const rng = seededRandom(seed);
    return Array.from({ length: barCount }, (_, i) => {
      const t = i / barCount;
      // Create realistic-looking waveform with envelope + noise
      const envelope = Math.sin(t * Math.PI) * 0.5 + 0.3;
      const variation =
        Math.sin(t * Math.PI * 6 + seed) * 0.15 +
        Math.sin(t * Math.PI * 14 + seed * 3) * 0.1;
      const noise = rng() * 0.4;
      return Math.max(0.06, Math.min(1, envelope + variation + noise * 0.5));
    });
  }, [seed, barCount]);

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!onSeek) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    onSeek(Math.max(0, Math.min(1, x)));
  };

  const barWidth = 100 / barCount;
  const gap = barWidth * 0.25;

  return (
    <svg
      viewBox={`0 0 100 ${height}`}
      preserveAspectRatio="none"
      className="w-full select-none"
      style={{ height }}
      onClick={handleClick}
      role="slider"
      aria-valuenow={Math.round(progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      {bars.map((amp, i) => {
        const isPlayed = i / barCount <= progress;
        const barH = amp * height * 0.85;
        const y = (height - barH) / 2;
        return (
          <rect
            key={i}
            x={i * barWidth + gap / 2}
            y={y}
            width={Math.max(0.3, barWidth - gap)}
            height={barH}
            rx={0.4}
            fill={isPlayed ? (playedColor || color) : color}
            opacity={isPlayed ? 0.9 : 0.2}
          />
        );
      })}
    </svg>
  );
}
