"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const SONGS = [
  { title: "Billie Jean", artist: "Michael Jackson", bpm: 117 },
  { title: "Stayin' Alive", artist: "Bee Gees", bpm: 104 },
  { title: "Blinding Lights", artist: "The Weeknd", bpm: 171 },
  { title: "Superstition", artist: "Stevie Wonder", bpm: 101 },
  { title: "Get Lucky", artist: "Daft Punk", bpm: 116 },
  { title: "Lose Yourself", artist: "Eminem", bpm: 171 },
  { title: "Bohemian Rhapsody", artist: "Queen", bpm: 72 },
  { title: "Seven Nation Army", artist: "The White Stripes", bpm: 124 },
  { title: "Harder Better Faster", artist: "Daft Punk", bpm: 123 },
  { title: "Sweet Dreams", artist: "Eurythmics", bpm: 126 },
  { title: "Blue Monday", artist: "New Order", bpm: 130 },
  { title: "One More Time", artist: "Daft Punk", bpm: 123 },
  { title: "Levels", artist: "Avicii", bpm: 126 },
  { title: "Smells Like Teen Spirit", artist: "Nirvana", bpm: 117 },
  { title: "Uptown Funk", artist: "Bruno Mars", bpm: 115 },
  { title: "Mr. Brightside", artist: "The Killers", bpm: 148 },
];

function playClick(ctx: AudioContext) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.value = 800;
  osc.type = "sine";
  gain.gain.setValueAtTime(0.3, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

interface BpmTapProps {
  isDark: boolean;
}

export function BpmTap({ isDark }: BpmTapProps) {
  const [songIdx, setSongIdx] = useState(() => Math.floor(Math.random() * SONGS.length));
  const [taps, setTaps] = useState<number[]>([]);
  const [userBpm, setUserBpm] = useState<number | null>(null);
  const [result, setResult] = useState<{ diff: number; msg: string } | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [round, setRound] = useState(1);
  const tapRef = useRef<number[]>([]);
  const audioCtx = useRef<AudioContext | null>(null);

  const song = SONGS[songIdx];

  const c = {
    text: isDark ? "#fff" : "#0F0F10",
    muted: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
    soft: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
    dim: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
    mid: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    bg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    tapActive: isDark ? "rgba(27,16,253,0.15)" : "rgba(27,16,253,0.08)",
    tapDefault: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
    accent: "rgba(27,16,253,0.7)",
  };

  const getCtx = () => {
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    return audioCtx.current;
  };

  const handleTap = useCallback(() => {
    playClick(getCtx());
    const now = Date.now();
    const newTaps = [...tapRef.current, now].slice(-8);
    tapRef.current = newTaps;
    setTaps(newTaps);
    if (newTaps.length >= 4) {
      const intervals = [];
      for (let i = 1; i < newTaps.length; i++) intervals.push(newTaps[i] - newTaps[i - 1]);
      const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setUserBpm(Math.round(60000 / avg));
    }
  }, []);

  const submit = useCallback(() => {
    if (userBpm === null) return;
    const diff = Math.abs(userBpm - song.bpm);
    let msg: string, pts = 0;
    if (diff <= 3) { msg = "INSANE EAR"; pts = 100; }
    else if (diff <= 8) { msg = "PRETTY GOOD"; pts = 50; }
    else if (diff <= 15) { msg = "NOT BAD"; pts = 20; }
    else if (diff <= 30) { msg = "MEH"; pts = 5; }
    else { msg = "BRO WHAT"; pts = 0; }
    setResult({ diff, msg });
    setScore(s => s + pts);
    setStreak(s => diff <= 15 ? s + 1 : 0);
  }, [userBpm, song.bpm]);

  const next = useCallback(() => {
    let n = Math.floor(Math.random() * SONGS.length);
    while (n === songIdx) n = Math.floor(Math.random() * SONGS.length);
    setSongIdx(n);
    setTaps([]); tapRef.current = []; setUserBpm(null); setResult(null);
    setRound(r => r + 1);
  }, [songIdx]);

  return (
    <div className="w-full max-w-[400px] mx-auto">
      <div className="rounded-[16px] p-[24px] text-center" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
        <div className="flex items-center justify-between mb-[20px]">
          <span style={{ fontSize: 12, color: c.muted }}>Score: {score}</span>
          {streak >= 2 && <span style={{ fontSize: 12, color: c.accent }}>streak {streak}</span>}
          <span style={{ fontSize: 12, color: c.muted }}>Round {round}</span>
        </div>

        <p style={{ fontSize: 20, fontWeight: 700, color: c.text }}>{song.title}</p>
        <p style={{ fontSize: 14, color: c.soft, marginTop: 4 }}>{song.artist}</p>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div key="tap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <button onClick={handleTap}
                className="mt-[20px] w-full rounded-[12px] py-[28px] transition-all active:scale-95"
                style={{ backgroundColor: taps.length > 0 ? c.tapActive : c.tapDefault, border: `1px solid ${c.border}` }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: c.mid }}>
                  {taps.length === 0 ? "TAP HERE" : "KEEP TAPPING"}
                </p>
                {userBpm !== null && (
                  <p style={{ fontSize: 36, fontWeight: 800, color: c.text, marginTop: 8 }} className="tabular-nums">{userBpm}</p>
                )}
                {taps.length > 0 && taps.length < 4 && (
                  <p style={{ fontSize: 12, color: c.dim, marginTop: 6 }}>{4 - taps.length} more taps</p>
                )}
              </button>
              <p style={{ fontSize: 12, color: c.dim, marginTop: 10 }}>Each tap plays a click so you can feel your rhythm</p>
              {userBpm !== null && (
                <button onClick={submit}
                  className="mt-[14px] rounded-[10px] px-[24px] py-[10px] text-white transition-all hover:opacity-90"
                  style={{ fontSize: 14, fontWeight: 600, backgroundColor: c.accent }}>
                  Lock in {userBpm} BPM
                </button>
              )}
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              <p style={{ fontSize: 28, fontWeight: 800, color: c.text, marginTop: 24 }}>{result.msg}</p>
              <p style={{ fontSize: 14, color: c.soft, marginTop: 8 }}>
                You: <span style={{ color: c.text, fontWeight: 600 }}>{userBpm}</span> — Actual: <span style={{ color: c.accent, fontWeight: 600 }}>{song.bpm}</span>
                {result.diff > 0 && <span> ({result.diff} off)</span>}
              </p>
              <button onClick={next}
                className="mt-[20px] rounded-[10px] px-[24px] py-[10px] transition-all"
                style={{ fontSize: 14, fontWeight: 500, color: c.soft, border: `1px solid ${c.border}` }}>
                Next song
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
