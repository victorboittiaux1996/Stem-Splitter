"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion } from "framer-motion";

const PADS = [
  { key: "1", label: "Kick", freq: 60, type: "kick" },
  { key: "2", label: "Snare", freq: 200, type: "snare" },
  { key: "3", label: "HiHat", freq: 6000, type: "hihat" },
  { key: "4", label: "Clap", freq: 1200, type: "clap" },
  { key: "Q", label: "Tom Lo", freq: 80, type: "tom" },
  { key: "W", label: "Tom Hi", freq: 160, type: "tom" },
  { key: "E", label: "Rim", freq: 800, type: "rim" },
  { key: "R", label: "Cowbell", freq: 540, type: "bell" },
  { key: "A", label: "Perc 1", freq: 320, type: "perc" },
  { key: "S", label: "Perc 2", freq: 440, type: "perc" },
  { key: "D", label: "Shaker", freq: 8000, type: "hihat" },
  { key: "F", label: "Crash", freq: 4000, type: "crash" },
  { key: "Z", label: "Sub", freq: 40, type: "kick" },
  { key: "X", label: "Click", freq: 2500, type: "rim" },
  { key: "C", label: "Prout 💨", freq: 80, type: "fart" },
  { key: "V", label: "Rot 🤢", freq: 120, type: "burp" },
];

const PAD_COLORS = [
  "#8B5CF6", "#F59E0B", "#10B981", "#F43F5E",
  "#6366F1", "#0EA5E9", "#F97316", "#EC4899",
  "#8B5CF6", "#F59E0B", "#10B981", "#F43F5E",
  "#6366F1", "#0EA5E9", "#F97316", "#EC4899",
];

function synthDrum(ctx: AudioContext, type: string, freq: number) {
  const now = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);

  if (type === "kick") {
    const osc = ctx.createOscillator();
    osc.connect(gain);
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(freq, now + 0.08);
    gain.gain.setValueAtTime(0.8, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.start(now); osc.stop(now + 0.3);
  } else if (type === "snare" || type === "clap") {
    const osc = ctx.createOscillator();
    osc.connect(gain);
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now); osc.stop(now + 0.15);
    // noise layer
    const bufSize = ctx.sampleRate * 0.1;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const ng = ctx.createGain();
    noise.connect(ng); ng.connect(ctx.destination);
    ng.gain.setValueAtTime(0.4, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    noise.start(now); noise.stop(now + 0.12);
  } else if (type === "hihat" || type === "crash") {
    const bufSize = ctx.sampleRate * (type === "crash" ? 0.3 : 0.08);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = freq;
    noise.connect(filter); filter.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (type === "crash" ? 0.3 : 0.08));
    noise.start(now);
  } else if (type === "noise") {
    const bufSize = ctx.sampleRate * 0.15;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = (Math.random() * 2 - 1);
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    noise.connect(gain); gain.connect(ctx.destination);
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    noise.start(now);
  } else if (type === "fart") {
    // Prout — low rumbling oscillator with noise modulation
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.connect(gain);
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
    osc.frequency.setValueAtTime(90, now + 0.15);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.4);
    gain.gain.setValueAtTime(0.5, now);
    gain.gain.linearRampToValueAtTime(0.6, now + 0.05);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.15);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc.start(now); osc.stop(now + 0.45);
    // Fluttering noise layer
    const bufSize = Math.floor(ctx.sampleRate * 0.4);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const t = i / ctx.sampleRate;
      const flutter = Math.sin(t * 60 * Math.PI * 2) * 0.5 + 0.5;
      data[i] = (Math.random() * 2 - 1) * flutter * 0.3;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = "lowpass";
    nFilter.frequency.value = 300;
    const ng = ctx.createGain();
    noise.connect(nFilter); nFilter.connect(ng); ng.connect(ctx.destination);
    ng.gain.setValueAtTime(0.4, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    noise.start(now); noise.stop(now + 0.4);
  } else if (type === "burp") {
    // Rot — rising-then-falling gurgle
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.connect(gain);
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.linearRampToValueAtTime(200, now + 0.08);
    osc.frequency.linearRampToValueAtTime(80, now + 0.25);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.5);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.5, now + 0.06);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.15);
    gain.gain.linearRampToValueAtTime(0.45, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.start(now); osc.stop(now + 0.55);
    // Second harmonic for thickness
    const osc2 = ctx.createOscillator();
    osc2.type = "square";
    const g2 = ctx.createGain();
    osc2.connect(g2); g2.connect(ctx.destination);
    osc2.frequency.setValueAtTime(freq * 1.5, now);
    osc2.frequency.linearRampToValueAtTime(300, now + 0.08);
    osc2.frequency.exponentialRampToValueAtTime(50, now + 0.5);
    g2.gain.setValueAtTime(0.1, now);
    g2.gain.linearRampToValueAtTime(0.2, now + 0.06);
    g2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc2.start(now); osc2.stop(now + 0.45);
    // Bubbly noise
    const bufSize = Math.floor(ctx.sampleRate * 0.35);
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const t = i / ctx.sampleRate;
      const bubble = Math.sin(t * 25 * Math.PI * 2) * 0.3 + 0.7;
      data[i] = (Math.random() * 2 - 1) * bubble * 0.15;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = "bandpass";
    nFilter.frequency.value = 250;
    nFilter.Q.value = 2;
    const ng = ctx.createGain();
    noise.connect(nFilter); nFilter.connect(ng); ng.connect(ctx.destination);
    ng.gain.setValueAtTime(0.3, now);
    ng.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    noise.start(now); noise.stop(now + 0.35);
  } else {
    const osc = ctx.createOscillator();
    osc.connect(gain);
    osc.frequency.value = freq;
    osc.type = type === "bell" ? "triangle" : "sine";
    gain.gain.setValueAtTime(0.4, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.start(now); osc.stop(now + 0.15);
  }
}

interface MpcPadProps { isDark: boolean; }

export function MpcPad({ isDark }: MpcPadProps) {
  const [activePads, setActivePads] = useState<Set<number>>(new Set());
  const audioCtx = useRef<AudioContext | null>(null);

  const c = {
    text: isDark ? "#fff" : "#0F0F10",
    muted: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    bg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
  };

  const getCtx = () => {
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    return audioCtx.current;
  };

  const hitPad = useCallback((idx: number) => {
    const pad = PADS[idx];
    synthDrum(getCtx(), pad.type, pad.freq);
    setActivePads(prev => new Set([...prev, idx]));
    setTimeout(() => setActivePads(prev => { const n = new Set(prev); n.delete(idx); return n; }), 120);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      const idx = PADS.findIndex(p => p.key === key);
      if (idx >= 0) { e.preventDefault(); hitPad(idx); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hitPad]);

  return (
    <div className="w-full max-w-[420px] mx-auto">
      <div className="rounded-[16px] p-[20px]" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
        <p style={{ fontSize: 12, color: c.muted, marginBottom: 16, textAlign: "center" }}>Use keyboard (1-4, Q-R, A-F, Z-V) or click</p>
        <div className="grid grid-cols-4 gap-[8px]">
          {PADS.map((pad, i) => {
            const isActive = activePads.has(i);
            const color = PAD_COLORS[i];
            return (
              <motion.button
                key={pad.key}
                onMouseDown={() => hitPad(i)}
                whileTap={{ scale: 0.92 }}
                className="rounded-[10px] aspect-square flex flex-col items-center justify-center gap-[4px] transition-all"
                style={{
                  backgroundColor: isActive ? color : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  border: `1px solid ${isActive ? color : c.border}`,
                  boxShadow: isActive ? `0 0 20px ${color}40` : undefined,
                }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: isActive ? "#fff" : c.muted }}>{pad.key}</span>
                <span style={{ fontSize: 11, fontWeight: 500, color: isActive ? "#fff" : (isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)") }}>{pad.label}</span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
