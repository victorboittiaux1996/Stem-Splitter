"use client";

import { useMemo } from "react";
import { resamplePeaks } from "@/hooks/use-audio-peaks";

// ─── Seeded RNG ─────────────────────────────────────────────
function seededRandom(seed: number) {
  let s = Math.abs(seed) || 1;
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };
}

// ─── Shared types ───────────────────────────────────────────
interface WaveformProps {
  seed: number;
  color: string;
  playedColor?: string;
  progress: number;
  height?: number;
  onSeek?: (progress: number) => void;
  /** Real peak data (0–1 normalized). When provided, overrides seed-based generation. */
  data?: number[];
  /** Cursor color for speaker icon (e.g. "#fff" dark, "#000" light) */
  cursorColor?: string;
}

function onClick(e: React.MouseEvent<SVGSVGElement>, onSeek?: (p: number) => void) {
  if (!onSeek) return;
  const r = e.currentTarget.getBoundingClientRect();
  onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)));
}

// ─── Realistic data generation ──────────────────────────────
function generateData(seed: number, count: number): number[] {
  const rng = seededRandom(seed);
  return Array.from({ length: count }, (_, i) => {
    const t = i / count;
    const phase = (t + (seed % 100) / 200) % 1;
    // Song structure: intro → build → chorus → break → chorus → outro
    let env: number;
    if (phase < 0.06) env = phase / 0.06 * 0.1;
    else if (phase < 0.18) env = 0.1 + ((phase - 0.06) / 0.12) * 0.55;
    else if (phase < 0.4) env = 0.55 + Math.sin((phase - 0.18) / 0.22 * Math.PI) * 0.35;
    else if (phase < 0.48) env = 0.8 * (1 - (phase - 0.4) / 0.08) + 0.04;
    else if (phase < 0.55) env = 0.03 + ((phase - 0.48) / 0.07) * 0.15;
    else if (phase < 0.63) env = 0.18 + ((phase - 0.55) / 0.08) * 0.52;
    else if (phase < 0.85) env = 0.6 + Math.sin((phase - 0.63) / 0.22 * Math.PI) * 0.35;
    else env = 0.65 * (1 - (phase - 0.85) / 0.15);
    const noise = (rng() - 0.5) * 0.2;
    const micro = Math.sin(t * Math.PI * 50 + seed * 3) * 0.06;
    return Math.max(0.005, Math.min(1, env + noise + micro));
  });
}

// Use real peaks or fallback to generated data
function useData(data: number[] | undefined, seed: number, count: number): number[] {
  return useMemo(() => {
    if (data && data.length > 0) return resamplePeaks(data, count);
    return generateData(seed, count);
  }, [data, seed, count]);
}

function useSmoothData(data: number[] | undefined, seed: number, count: number, passes: number): number[] {
  return useMemo(() => {
    const raw = data && data.length > 0 ? resamplePeaks(data, count) : generateData(seed, count);
    return smoothData(raw, passes);
  }, [data, seed, count, passes]);
}

// Smooth data for area/line renders
function smoothData(data: number[], passes: number): number[] {
  let s = [...data];
  for (let p = 0; p < passes; p++) {
    const prev = [...s];
    for (let i = 1; i < prev.length - 1; i++) {
      s[i] = prev[i - 1] * 0.2 + prev[i] * 0.6 + prev[i + 1] * 0.2;
    }
  }
  return s;
}

// ─── W1: SoundCloud mirrored bars ───────────────────────────
function W1({ seed, color, playedColor, progress, height = 48, onSeek, data: rawData }: WaveformProps) {
  const count = 160;
  const data = useData(rawData, seed, count);
  const bw = 100 / count, gap = bw * 0.3, cy = height / 2;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full select-none cursor-pointer" style={{ height }} onClick={e => onClick(e, onSeek)}>
      {data.map((amp, i) => {
        const played = i / count <= progress;
        const halfH = amp * cy * 0.9;
        return <rect key={i} x={i * bw + gap / 2} y={cy - halfH} width={Math.max(0.2, bw - gap)} height={halfH * 2} rx={0.3}
          fill={played ? (playedColor || color) : color} opacity={played ? 0.9 : 0.2} />;
      })}
    </svg>
  );
}

// ─── W2: Continuous filled area (audio editor) ──────────────
function W2({ seed, color, playedColor, progress, height = 48, onSeek, data: rawData }: WaveformProps) {
  const count = 200;
  const raw = useSmoothData(rawData, seed, count, 2);
  const points = raw.map((v, i) => `${(i / count) * 100},${height - v * height * 0.9}`).join(" ");
  const pathD = `M0,${height} L${points} L100,${height} Z`;
  const clipX = progress * 100;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full select-none cursor-pointer" style={{ height }} onClick={e => onClick(e, onSeek)}>
      <defs>
        <clipPath id={`played-${seed}`}><rect x="0" y="0" width={clipX} height={height} /></clipPath>
        <clipPath id={`unplayed-${seed}`}><rect x={clipX} y="0" width={100 - clipX} height={height} /></clipPath>
      </defs>
      <path d={pathD} fill={color} opacity={0.2} clipPath={`url(#unplayed-${seed})`} />
      <path d={pathD} fill={playedColor || color} opacity={0.85} clipPath={`url(#played-${seed})`} />
    </svg>
  );
}

// ─── W3: Thin vertical lines, very dense (Spotify) ─────────
function W3({ seed, color, playedColor, progress, height = 48, onSeek, data: rawData }: WaveformProps) {
  const count = 300;
  const data = useData(rawData, seed, count);
  const cy = height / 2;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full select-none cursor-pointer" style={{ height }} onClick={e => onClick(e, onSeek)}>
      {data.map((amp, i) => {
        const played = i / count <= progress;
        const halfH = amp * cy * 0.9;
        const x = (i / count) * 100;
        return <line key={i} x1={x} y1={cy - halfH} x2={x} y2={cy + halfH}
          stroke={played ? (playedColor || color) : color} strokeWidth={0.2} opacity={played ? 0.9 : 0.2} />;
      })}
    </svg>
  );
}

// ─── W4: Rounded bars with gradient top ─────────────────────
function W4({ seed, color, playedColor, progress, height = 48, onSeek, data: rawData }: WaveformProps) {
  const count = 100;
  const data = useData(rawData, seed, count);
  const bw = 100 / count, gap = bw * 0.4;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full select-none cursor-pointer" style={{ height }} onClick={e => onClick(e, onSeek)}>
      <defs>
        <linearGradient id={`grad-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0.3" />
        </linearGradient>
        <linearGradient id={`gradp-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={playedColor || color} stopOpacity="1" />
          <stop offset="100%" stopColor={playedColor || color} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      {data.map((amp, i) => {
        const played = i / count <= progress;
        const barH = amp * height * 0.9;
        return <rect key={i} x={i * bw + gap / 2} y={height - barH} width={Math.max(0.3, bw - gap)} height={barH}
          rx={0.8} fill={played ? `url(#gradp-${seed})` : `url(#grad-${seed})`} opacity={played ? 1 : 0.25} />;
      })}
    </svg>
  );
}

// ─── W5: Outline path only (oscilloscope) ───────────────────
function W5({ seed, color, playedColor, progress, height = 48, onSeek, data: rawData }: WaveformProps) {
  const count = 200;
  const raw = useSmoothData(rawData, seed, count, 3);
  const cy = height / 2;
  // Top line
  const topPoints = raw.map((v, i) => `${(i / count) * 100},${cy - v * cy * 0.9}`).join(" ");
  // Bottom line (mirror)
  const botPoints = raw.map((v, i) => `${(i / count) * 100},${cy + v * cy * 0.9}`).join(" ");
  const clipX = progress * 100;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full select-none cursor-pointer" style={{ height }} onClick={e => onClick(e, onSeek)}>
      <defs>
        <clipPath id={`p5-${seed}`}><rect x="0" y="0" width={clipX} height={height} /></clipPath>
        <clipPath id={`u5-${seed}`}><rect x={clipX} y="0" width={100 - clipX} height={height} /></clipPath>
      </defs>
      {/* Center line */}
      <line x1="0" y1={cy} x2="100" y2={cy} stroke={color} strokeWidth={0.15} opacity={0.1} />
      {/* Unplayed */}
      <polyline points={topPoints} fill="none" stroke={color} strokeWidth={0.3} opacity={0.2} clipPath={`url(#u5-${seed})`} />
      <polyline points={botPoints} fill="none" stroke={color} strokeWidth={0.3} opacity={0.2} clipPath={`url(#u5-${seed})`} />
      {/* Played */}
      <polyline points={topPoints} fill="none" stroke={playedColor || color} strokeWidth={0.4} opacity={0.9} clipPath={`url(#p5-${seed})`} />
      <polyline points={botPoints} fill="none" stroke={playedColor || color} strokeWidth={0.4} opacity={0.9} clipPath={`url(#p5-${seed})`} />
    </svg>
  );
}

// ─── W6: Solid block fill (Ableton arrangement) ────────────
function W6({ seed, color, playedColor, progress, height = 48, onSeek, data: rawData }: WaveformProps) {
  const count = 250;
  const raw = useSmoothData(rawData, seed, count, 1);
  const cy = height / 2;
  // Build a filled path from top contour to bottom contour
  const top = raw.map((v, i) => `${(i / count) * 100},${cy - v * cy * 0.9}`);
  const bot = [...raw].reverse().map((v, i) => `${((count - 1 - i) / count) * 100},${cy + v * cy * 0.9}`);
  const pathD = `M${top.join(" L")} L${bot.join(" L")} Z`;
  const clipX = progress * 100;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full select-none cursor-pointer" style={{ height }} onClick={e => onClick(e, onSeek)}>
      <defs>
        <clipPath id={`p6-${seed}`}><rect x="0" y="0" width={clipX} height={height} /></clipPath>
        <clipPath id={`u6-${seed}`}><rect x={clipX} y="0" width={100 - clipX} height={height} /></clipPath>
      </defs>
      <path d={pathD} fill={color} opacity={0.18} clipPath={`url(#u6-${seed})`} />
      <path d={pathD} fill={playedColor || color} opacity={0.8} clipPath={`url(#p6-${seed})`} />
    </svg>
  );
}

// ─── W7: Mirrored thin bars + peak hold line ────────────────
function W7({ seed, color, playedColor, progress, height = 48, onSeek, data: rawData }: WaveformProps) {
  const count = 180;
  const data = useData(rawData, seed, count);
  const cy = height / 2;
  // Peak line from smoothed data
  const smooth = smoothData(data, 4);
  const peakTop = smooth.map((v, i) => `${(i / count) * 100},${cy - v * cy * 0.92}`).join(" ");
  const peakBot = smooth.map((v, i) => `${(i / count) * 100},${cy + v * cy * 0.92}`).join(" ");
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full select-none cursor-pointer" style={{ height }} onClick={e => onClick(e, onSeek)}>
      {/* Bars */}
      {data.map((amp, i) => {
        const played = i / count <= progress;
        const halfH = amp * cy * 0.85;
        const x = (i / count) * 100;
        return <line key={i} x1={x} y1={cy - halfH} x2={x} y2={cy + halfH}
          stroke={played ? (playedColor || color) : color} strokeWidth={0.25} opacity={played ? 0.8 : 0.15} />;
      })}
      {/* Peak envelope lines */}
      <polyline points={peakTop} fill="none" stroke={color} strokeWidth={0.2} opacity={0.4} />
      <polyline points={peakBot} fill="none" stroke={color} strokeWidth={0.2} opacity={0.4} />
    </svg>
  );
}

// ─── W8: Mirrored area fill with opacity gradient ───────────
function W8({ seed, color, playedColor, progress, height = 48, onSeek, data: rawData }: WaveformProps) {
  const count = 200;
  const raw = useSmoothData(rawData, seed, count, 2);
  const cy = height / 2;
  const topPath = raw.map((v, i) => `${(i / count) * 100},${cy - v * cy * 0.9}`).join(" ");
  const centerLine = `${100},${cy} 0,${cy}`;
  const botPath = [...raw].reverse().map((v, i) => `${((count - 1 - i) / count) * 100},${cy + v * cy * 0.9}`).join(" ");
  const clipX = progress * 100;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full select-none cursor-pointer" style={{ height }} onClick={e => onClick(e, onSeek)}>
      <defs>
        <linearGradient id={`g8t-${seed}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.9" />
          <stop offset="50%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0.9" />
        </linearGradient>
        <clipPath id={`p8-${seed}`}><rect x="0" y="0" width={clipX} height={height} /></clipPath>
        <clipPath id={`u8-${seed}`}><rect x={clipX} y="0" width={100 - clipX} height={height} /></clipPath>
      </defs>
      {/* Top half */}
      <polygon points={`0,${cy} ${topPath} ${100},${cy}`} fill={color} opacity={0.12} clipPath={`url(#u8-${seed})`} />
      <polygon points={`0,${cy} ${topPath} ${100},${cy}`} fill={playedColor || color} opacity={0.7} clipPath={`url(#p8-${seed})`} />
      {/* Bottom half */}
      <polygon points={`0,${cy} ${botPath} ${100},${cy}`} fill={color} opacity={0.12} clipPath={`url(#u8-${seed})`} />
      <polygon points={`0,${cy} ${botPath} ${100},${cy}`} fill={playedColor || color} opacity={0.7} clipPath={`url(#p8-${seed})`} />
      {/* Center line */}
      <line x1="0" y1={cy} x2="100" y2={cy} stroke={color} strokeWidth={0.15} opacity={0.3} />
    </svg>
  );
}

// ─── W9: Dot matrix (minimalist) ────────────────────────────
function W9({ seed, color, playedColor, progress, height = 48, onSeek, data: rawData }: WaveformProps) {
  const count = 120;
  const data = useData(rawData, seed, count);
  const cy = height / 2;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full select-none cursor-pointer" style={{ height }} onClick={e => onClick(e, onSeek)}>
      {data.map((amp, i) => {
        const played = i / count <= progress;
        const x = (i / count) * 100;
        const dotsUp = Math.max(1, Math.round(amp * 5));
        const spacing = (cy * 0.9) / 5;
        return Array.from({ length: dotsUp }, (_, d) => (
          <g key={`${i}-${d}`}>
            <circle cx={x} cy={cy - (d + 0.5) * spacing} r={0.25}
              fill={played ? (playedColor || color) : color} opacity={played ? 0.9 : 0.2} />
            <circle cx={x} cy={cy + (d + 0.5) * spacing} r={0.25}
              fill={played ? (playedColor || color) : color} opacity={played ? 0.9 : 0.2} />
          </g>
        ));
      })}
    </svg>
  );
}

// ─── W10: Wide bars, minimal gap, bottom-anchored ───────────
function W10({ seed, color, playedColor, progress, height = 48, onSeek, data: rawData }: WaveformProps) {
  const count = 80;
  const data = useData(rawData, seed, count);
  const bw = 100 / count, gap = bw * 0.1;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full select-none cursor-pointer" style={{ height }} onClick={e => onClick(e, onSeek)}>
      {data.map((amp, i) => {
        const played = i / count <= progress;
        const barH = amp * height * 0.92;
        return <rect key={i} x={i * bw + gap / 2} y={height - barH} width={Math.max(0.3, bw - gap)} height={barH}
          fill={played ? (playedColor || color) : color} opacity={played ? 0.9 : 0.2} />;
      })}
    </svg>
  );
}

// Speaker cursor (volume icon as custom CSS cursor)
function speakerCursor(hex: string) {
  const encoded = hex.replace("#", "%23");
  return `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='${encoded}'%3E%3Cpath d='M11 5L6 9H2v6h4l5 4V5zm2.59 3.41a4.98 4.98 0 010 7.18l1.41 1.41a7 7 0 000-10l-1.41 1.41zm2.83-2.83a9 9 0 010 12.83l1.41 1.42a11 11 0 000-15.66l-1.41 1.41z'/%3E%3C/svg%3E") 10 10, pointer`;
}

// ─── W11: DAW waveform — sharp filled mirror (Logic/FL Studio) ─
function W11({ seed, color, playedColor, progress, height = 48, onSeek, data: rawData, cursorColor }: WaveformProps) {
  const count = 400;
  const raw = useSmoothData(rawData, seed, count, 1); // minimal smoothing for realism
  const cy = height / 2;
  // Build mirrored filled shape: top contour → right → bottom contour → left
  const top = raw.map((v, i) => `${(i / count) * 100},${cy - v * cy * 0.92}`).join(" ");
  const bot = [...raw].reverse().map((v, i) => `${((count - 1 - i) / count) * 100},${cy + v * cy * 0.92}`).join(" ");
  const pathD = `M0,${cy} L${top} L100,${cy} L${bot} Z`;
  const clipX = progress * 100;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full select-none" style={{ height, cursor: speakerCursor(cursorColor || "#fff") }} onClick={e => onClick(e, onSeek)}>
      <defs>
        <clipPath id={`p11-${seed}`}><rect x="0" y="0" width={clipX} height={height} /></clipPath>
        <clipPath id={`u11-${seed}`}><rect x={clipX} y="0" width={100 - clipX} height={height} /></clipPath>
      </defs>
      <path d={pathD} fill={color} opacity={0.2} clipPath={`url(#u11-${seed})`} />
      <path d={pathD} fill={playedColor || color} opacity={0.85} clipPath={`url(#p11-${seed})`} />
      <line x1="0" y1={cy} x2="100" y2={cy} stroke={color} strokeWidth={0.1} opacity={0.15} />
    </svg>
  );
}

// ─── W12: Dense vertical lines — Audacity/Pro Tools style ────
function W12({ seed, color, playedColor, progress, height = 48, onSeek, data: rawData }: WaveformProps) {
  const count = 500;
  const data = useData(rawData, seed, count);
  const cy = height / 2;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full select-none cursor-pointer" style={{ height }} onClick={e => onClick(e, onSeek)}>
      {data.map((amp, i) => {
        const played = i / count <= progress;
        const halfH = amp * cy * 0.92;
        const x = (i / count) * 100;
        return <line key={i} x1={x} y1={cy - halfH} x2={x} y2={cy + halfH}
          stroke={played ? (playedColor || color) : color} strokeWidth={0.15} opacity={played ? 0.85 : 0.18} />;
      })}
      <line x1="0" y1={cy} x2="100" y2={cy} stroke={color} strokeWidth={0.08} opacity={0.12} />
    </svg>
  );
}

// ─── W13: Hi-res DAW waveform — raw detail, no smoothing ────
function W13({ seed, color, playedColor, progress, height = 48, onSeek, data: rawData }: WaveformProps) {
  const count = 600;
  const data = useData(rawData, seed, count);
  const cy = height / 2;
  // Raw filled mirror path — no smoothing for maximum detail
  const top = data.map((v, i) => `${(i / count) * 100},${cy - v * cy * 0.93}`).join(" ");
  const bot = [...data].reverse().map((v, i) => `${((count - 1 - i) / count) * 100},${cy + v * cy * 0.93}`).join(" ");
  const pathD = `M0,${cy} L${top} L100,${cy} L${bot} Z`;
  const clipX = progress * 100;
  return (
    <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" className="w-full select-none cursor-pointer" style={{ height }} onClick={e => onClick(e, onSeek)}>
      <defs>
        <clipPath id={`p13-${seed}`}><rect x="0" y="0" width={clipX} height={height} /></clipPath>
        <clipPath id={`u13-${seed}`}><rect x={clipX} y="0" width={100 - clipX} height={height} /></clipPath>
      </defs>
      <path d={pathD} fill={color} opacity={0.18} clipPath={`url(#u13-${seed})`} />
      <path d={pathD} fill={playedColor || color} opacity={0.85} clipPath={`url(#p13-${seed})`} />
      <line x1="0" y1={cy} x2="100" y2={cy} stroke={color} strokeWidth={0.08} opacity={0.1} />
    </svg>
  );
}

// ─── Variant names ──────────────────────────────────────────
export const WAVEFORM_VARIANT_NAMES: Record<number, string> = {
  1:  "SoundCloud — barres centrées",
  2:  "Area fill — éditeur audio",
  3:  "Lignes fines — Spotify",
  4:  "Barres arrondies — gradient",
  5:  "Oscilloscope — outline",
  6:  "Solid block — Ableton",
  7:  "Barres fines + peak line",
  8:  "Area mirrored — opacité",
  9:  "Dot matrix — minimaliste",
  10: "Barres larges — compact",
  11: "DAW waveform — Logic/FL",
  12: "Dense lines — Audacity/PT",
  13: "Hi-res DAW — raw detail",
};

// ─── Main component ─────────────────────────────────────────
const COMPONENTS: Record<number, React.FC<WaveformProps>> = {
  1: W1, 2: W2, 3: W3, 4: W4, 5: W5, 6: W6, 7: W7, 8: W8, 9: W9, 10: W10, 11: W11, 12: W12, 13: W13,
};

export function WaveformVariant({ variant, ...props }: WaveformProps & { variant: number }) {
  const Component = COMPONENTS[variant] || W1;
  return <Component {...props} />;
}
