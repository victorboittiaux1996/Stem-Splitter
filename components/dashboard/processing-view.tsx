"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ProcessingViewProps {
  progress: number;
  stage: string;
  isDark?: boolean;
}

const SONGS = [
  { title: "Billie Jean", artist: "Michael Jackson", bpm: 117 },
  { title: "Stayin' Alive", artist: "Bee Gees", bpm: 104 },
  { title: "Blinding Lights", artist: "The Weeknd", bpm: 171 },
  { title: "Superstition", artist: "Stevie Wonder", bpm: 101 },
  { title: "Get Lucky", artist: "Daft Punk", bpm: 116 },
  { title: "Lose Yourself", artist: "Eminem", bpm: 171 },
  { title: "Take On Me", artist: "a-ha", bpm: 169 },
  { title: "Bohemian Rhapsody", artist: "Queen", bpm: 72 },
  { title: "Seven Nation Army", artist: "The White Stripes", bpm: 124 },
  { title: "Harder Better Faster", artist: "Daft Punk", bpm: 123 },
  { title: "Around The World", artist: "Daft Punk", bpm: 121 },
  { title: "Sweet Dreams", artist: "Eurythmics", bpm: 126 },
  { title: "Blue Monday", artist: "New Order", bpm: 130 },
  { title: "Da Funk", artist: "Daft Punk", bpm: 110 },
  { title: "One More Time", artist: "Daft Punk", bpm: 123 },
  { title: "Levels", artist: "Avicii", bpm: 126 },
  { title: "Smells Like Teen Spirit", artist: "Nirvana", bpm: 117 },
  { title: "Happy", artist: "Pharrell Williams", bpm: 160 },
  { title: "Uptown Funk", artist: "Bruno Mars", bpm: 115 },
  { title: "Mr. Brightside", artist: "The Killers", bpm: 148 },
];

const AGENTS = [
  { name: "Uploading to GPU cluster", threshold: 0 },
  { name: "Analyzing spectral data", threshold: 10 },
  { name: "Isolating vocals", threshold: 25 },
  { name: "Isolating drums", threshold: 38 },
  { name: "Isolating bass", threshold: 50 },
  { name: "Isolating harmonics", threshold: 62 },
  { name: "Cross-validating models", threshold: 74 },
  { name: "Removing artifacts", threshold: 84 },
  { name: "Rendering stems", threshold: 93 },
];

export function ProcessingView({ progress, stage, isDark = true }: ProcessingViewProps) {
  const [gameActive, setGameActive] = useState(false);
  const [songIdx, setSongIdx] = useState(() => Math.floor(Math.random() * SONGS.length));
  const [taps, setTaps] = useState<number[]>([]);
  const [userBpm, setUserBpm] = useState<number | null>(null);
  const [result, setResult] = useState<{ diff: number; msg: string; emoji: string } | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const tapRef = useRef<number[]>([]);

  const song = SONGS[songIdx];

  const colors = {
    text: isDark ? "#FFFFFF" : "#0F0F10",
    textDim: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)",
    textMuted: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.35)",
    textSoft: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
    textSubtle: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)",
    textMid: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
    textHalf: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    bgSubtle: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    barBg: isDark ? "rgba(27,16,253,0.15)" : "rgba(27,16,253,0.12)",
    barFill: isDark ? "rgba(27,16,253,0.7)" : "rgba(27,16,253,0.6)",
    accent: "rgba(27,16,253,0.9)",
    stepWaiting: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
    stepActive: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
    stepDone: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.2)",
    checkColor: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)",
    ringWaiting: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    tapBg: isDark ? "rgba(27,16,253,0.15)" : "rgba(27,16,253,0.08)",
    tapDefault: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.03)",
    btnBg: isDark ? "rgba(27,16,253,0.7)" : "rgba(27,16,253,0.6)",
    shimmerBase: isDark ? "rgba(255,255,255,0.25)" : "rgba(0,0,0,0.25)",
    shimmerHighlight: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.75)",
  };

  const shimmerStyle = useMemo(() => ({
    background: `linear-gradient(90deg, ${colors.shimmerBase} 0%, ${colors.shimmerHighlight} 40%, ${colors.shimmerHighlight} 60%, ${colors.shimmerBase} 100%)`,
    backgroundSize: "200% 100%",
    WebkitBackgroundClip: "text" as const,
    backgroundClip: "text" as const,
    WebkitTextFillColor: "transparent",
    animation: "shimmer 4s ease-in-out infinite",
  }), [colors.shimmerBase, colors.shimmerHighlight]);

  const activeIdx = AGENTS.reduce((acc, agent, i) => progress >= agent.threshold ? i : acc, 0);

  const handleTap = useCallback(() => {
    const now = Date.now();
    const newTaps = [...tapRef.current, now].slice(-8);
    tapRef.current = newTaps;
    setTaps(newTaps);
    if (newTaps.length >= 4) {
      const intervals = [];
      for (let i = 1; i < newTaps.length; i++) intervals.push(newTaps[i] - newTaps[i - 1]);
      const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      setUserBpm(Math.round(60000 / avgInterval));
    }
  }, []);

  const submitGuess = useCallback(() => {
    if (userBpm === null) return;
    const diff = Math.abs(userBpm - song.bpm);
    let msg: string, points = 0;
    if (diff <= 3) { msg = "INSANE EAR"; points = 100; }
    else if (diff <= 8) { msg = "PRETTY GOOD"; points = 50; }
    else if (diff <= 15) { msg = "NOT BAD"; points = 20; }
    else if (diff <= 30) { msg = "MEH"; points = 5; }
    else { msg = "BRO WHAT"; points = 0; }
    setResult({ diff, msg, emoji: "" });
    setScore(s => s + points);
    setStreak(s => diff <= 15 ? s + 1 : 0);
    setTotalRounds(r => r + 1);
  }, [userBpm, song.bpm]);

  const nextSong = useCallback(() => {
    let next = Math.floor(Math.random() * SONGS.length);
    while (next === songIdx) next = Math.floor(Math.random() * SONGS.length);
    setSongIdx(next);
    setTaps([]); tapRef.current = []; setUserBpm(null); setResult(null);
  }, [songIdx]);

  useEffect(() => {
    if (!gameActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === "Space" && !result) { e.preventDefault(); handleTap(); }
      if (e.code === "Enter" && userBpm && !result) { e.preventDefault(); submitGuess(); }
      if (e.code === "Enter" && result) { e.preventDefault(); nextSong(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameActive, handleTap, submitGuess, nextSong, userBpm, result]);

  // Shimmer follows the steps — groups them into phases
  const shimmerMsg = activeIdx <= 1 ? "Preparing audio" : activeIdx <= 5 ? "Isolating stems" : "Finalizing";

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-8">
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

      <div className="w-full max-w-md space-y-8">
        {/* Big % + shimmer stage */}
        <div className="text-center space-y-[8px]">
          <div>
            <span className="font-heading text-6xl font-bold tabular-nums" style={{ color: colors.text }}>{Math.floor(progress)}</span>
            <span className="font-heading text-3xl font-bold" style={{ color: colors.textDim }}>%</span>
          </div>
          <p className="font-medium" style={{ fontSize: 14, letterSpacing: "0.12em", textTransform: "uppercase", ...shimmerStyle }}>
            {shimmerMsg}
          </p>
        </div>

        {/* Progress bar — 6px thick */}
        <div className="h-[6px] w-full overflow-hidden rounded-full" style={{ backgroundColor: colors.barBg }}>
          <motion.div className="h-full rounded-full" style={{ backgroundColor: colors.barFill }}
            animate={{ width: `${progress}%` }} transition={{ duration: 0.4, ease: "easeOut" }} />
        </div>

        {/* Agent steps — only 2 lines: current + next */}
        <div style={{ height: 64 }} className="relative overflow-hidden">
          <AnimatePresence mode="popLayout">
            {AGENTS.map((agent, i) => {
              const isPrev = i === activeIdx - 1;
              const isActive = i === activeIdx;
              if (!isPrev && !isActive) return null;
              return (
                <motion.div
                  key={agent.name}
                  layout
                  initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                  className="flex items-center gap-[10px]"
                  style={{ height: 32 }}>
                  <div className="w-[16px] flex items-center justify-center shrink-0">
                    {isPrev ? (
                      <span style={{ fontSize: 12, color: colors.checkColor }}>✓</span>
                    ) : (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}>
                        <svg width="12" height="12" viewBox="0 0 12 12">
                          <circle cx="6" cy="6" r="4.5" fill="none" stroke={colors.ringWaiting} strokeWidth="1.5" />
                          <circle cx="6" cy="6" r="4.5" fill="none" stroke={colors.stepActive} strokeWidth="1.5"
                            strokeDasharray={`${2 * Math.PI * 4.5}`} strokeDashoffset={`${2 * Math.PI * 4.5 * 0.75}`}
                            strokeLinecap="round" />
                        </svg>
                      </motion.div>
                    )}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: isActive ? 500 : 400, color: isPrev ? colors.stepDone : colors.stepActive }}>
                    {agent.name}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Mini game */}
        <div className="pt-[8px] flex justify-center">
          {!gameActive ? (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 2 }}
              onClick={() => setGameActive(true)}
              className="rounded-[10px] px-[16px] py-[8px] transition-colors"
              style={{ fontSize: 13, color: colors.textDim, border: `1px solid ${colors.border}` }}>
              Bored? Tap the BPM
            </motion.button>
          ) : (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-[16px] p-[24px] text-center"
              style={{ backgroundColor: colors.bgSubtle, border: `1px solid ${colors.border}` }}>
              <div className="flex items-center justify-between mb-[16px]">
                <span style={{ fontSize: 12, color: colors.textMuted }}>Score: {score}</span>
                {streak >= 2 && <span style={{ fontSize: 12, color: colors.accent }}>streak {streak}</span>}
                <span style={{ fontSize: 12, color: colors.textMuted }}>Round {totalRounds + 1}</span>
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>{song.title}</p>
              <p style={{ fontSize: 14, color: colors.textSoft, marginTop: 4 }}>{song.artist}</p>
              <AnimatePresence mode="wait">
                {!result ? (
                  <motion.div key="tap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <button onClick={handleTap}
                      className="mt-[20px] w-full rounded-[12px] py-[24px] transition-all active:scale-95"
                      style={{ backgroundColor: taps.length > 0 ? colors.tapBg : colors.tapDefault, border: `1px solid ${colors.border}` }}>
                      <p style={{ fontSize: 14, fontWeight: 600, color: colors.textMid }}>
                        {taps.length === 0 ? "TAP HERE" : "KEEP TAPPING"}
                      </p>
                      {userBpm !== null && (
                        <p style={{ fontSize: 32, fontWeight: 800, color: colors.text, marginTop: 8 }} className="tabular-nums">{userBpm}</p>
                      )}
                      {taps.length > 0 && taps.length < 4 && (
                        <p style={{ fontSize: 12, color: colors.textDim, marginTop: 6 }}>{4 - taps.length} more taps needed</p>
                      )}
                    </button>
                    <p style={{ fontSize: 12, color: colors.textSubtle, marginTop: 8 }}>Space to tap · Enter to submit</p>
                    {userBpm !== null && (
                      <button onClick={submitGuess}
                        className="mt-[12px] rounded-[10px] px-[20px] py-[8px] text-white transition-all hover:opacity-90"
                        style={{ fontSize: 14, fontWeight: 600, backgroundColor: colors.btnBg }}>
                        Lock in {userBpm} BPM
                      </button>
                    )}
                  </motion.div>
                ) : (
                  <motion.div key="result" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <p style={{ fontSize: 24, fontWeight: 800, color: colors.text, marginTop: 20 }}>{result.msg}</p>
                    <p style={{ fontSize: 14, color: colors.textSoft, marginTop: 6 }}>
                      You tapped <span style={{ color: colors.text, fontWeight: 600 }}>{userBpm}</span> — actual is <span style={{ color: colors.accent, fontWeight: 600 }}>{song.bpm}</span>
                      {result.diff > 0 && <span> ({result.diff} off)</span>}
                    </p>
                    <button onClick={nextSong}
                      className="mt-[16px] rounded-[10px] px-[20px] py-[8px] transition-all"
                      style={{ fontSize: 14, fontWeight: 500, color: colors.textHalf, border: `1px solid ${colors.border}` }}>
                      Next song
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
