"use client";

import { useState, useRef, useCallback } from "react";

const FREQ_RANGES = [
  { label: "Sub Bass", range: [20, 60], color: "#8B5CF6" },
  { label: "Bass", range: [60, 250], color: "#6366F1" },
  { label: "Low Mid", range: [250, 500], color: "#0EA5E9" },
  { label: "Mid", range: [500, 2000], color: "#10B981" },
  { label: "High Mid", range: [2000, 4000], color: "#F59E0B" },
  { label: "Presence", range: [4000, 6000], color: "#F97316" },
  { label: "Brilliance", range: [6000, 12000], color: "#F43F5E" },
];

function generateFreq(): number {
  const ranges = [
    [80, 200], [200, 500], [500, 1000], [1000, 2000],
    [2000, 4000], [4000, 8000], [8000, 12000],
  ];
  const range = ranges[Math.floor(Math.random() * ranges.length)];
  return Math.round(range[0] + Math.random() * (range[1] - range[0]));
}

function getFreqRange(freq: number): string {
  for (const r of FREQ_RANGES) {
    if (freq >= r.range[0] && freq < r.range[1]) return r.label;
  }
  return "Brilliance";
}

function formatFreq(freq: number): string {
  if (freq >= 1000) return `${(freq / 1000).toFixed(1)}kHz`;
  return `${freq}Hz`;
}

interface FrequencyQuizProps {
  isDark: boolean;
}

export function FrequencyQuiz({ isDark }: FrequencyQuizProps) {
  const [currentFreq, setCurrentFreq] = useState<number | null>(null);
  const [userGuess, setUserGuess] = useState(1000);
  const [result, setResult] = useState<{ diff: number; pct: number; msg: string } | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [streak, setStreak] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const audioCtx = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  const c = {
    text: isDark ? "#fff" : "#0F0F10",
    muted: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
    soft: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    bg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    bgHover: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
    accent: "rgba(27,16,253,0.7)",
  };

  const getCtx = () => {
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    return audioCtx.current;
  };

  const playFreq = useCallback((freq: number) => {
    const ctx = getCtx();
    // Stop previous
    try { oscRef.current?.stop(); } catch {}

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.25, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.25, ctx.currentTime + 1.5);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 2);
    oscRef.current = osc;
    gainRef.current = gain;

    setPlaying(true);
    setTimeout(() => setPlaying(false), 2000);
  }, []);

  const startRound = useCallback(() => {
    const freq = generateFreq();
    setCurrentFreq(freq);
    setUserGuess(1000);
    setResult(null);
    setSubmitted(false);
    setRound(r => r + 1);
    playFreq(freq);
  }, [playFreq]);

  const handleSubmit = useCallback(() => {
    if (!currentFreq || submitted) return;
    setSubmitted(true);

    const logDiff = Math.abs(Math.log2(userGuess / currentFreq));
    const pct = Math.round(logDiff * 100);
    let msg: string, pts = 0;

    if (pct <= 5) { msg = "PERFECT EAR 🎯"; pts = 100; }
    else if (pct <= 15) { msg = "REALLY CLOSE 👏"; pts = 60; }
    else if (pct <= 30) { msg = "NOT BAD 👌"; pts = 30; }
    else if (pct <= 50) { msg = "KINDA OFF 🤷"; pts = 10; }
    else { msg = "WAY OFF 💀"; pts = 0; }

    setResult({ diff: Math.abs(userGuess - currentFreq), pct, msg });
    setScore(s => s + pts);
    setStreak(s => pct <= 30 ? s + 1 : 0);
  }, [currentFreq, userGuess, submitted]);

  const replay = useCallback(() => {
    if (currentFreq) playFreq(currentFreq);
  }, [currentFreq, playFreq]);

  // Slider position — logarithmic scale 20Hz to 16kHz
  const sliderToFreq = (val: number) => Math.round(20 * Math.pow(800, val / 100));
  const freqToSlider = (freq: number) => Math.round(100 * Math.log(freq / 20) / Math.log(800));

  const currentRange = currentFreq ? getFreqRange(currentFreq) : null;
  const guessRange = getFreqRange(userGuess);

  return (
    <div className="w-full max-w-[440px] mx-auto">
      <div className="rounded-[16px] p-[24px] text-center" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-[16px]">
          <span style={{ fontSize: 12, color: c.muted }}>Score: {score}</span>
          {streak >= 2 && <span style={{ fontSize: 12, color: c.accent }}>🔥 {streak} streak</span>}
          <span style={{ fontSize: 12, color: c.muted }}>Round {round || "—"}</span>
        </div>

        {round === 0 ? (
          /* Start screen */
          <div>
            <p style={{ fontSize: 20, fontWeight: 700, color: c.text, marginBottom: 4 }}>Frequency Quiz</p>
            <p style={{ fontSize: 13, color: c.soft, marginBottom: 20 }}>A tone plays — guess the frequency!</p>
            <button onClick={startRound}
              className="rounded-[10px] px-[24px] py-[10px] text-white transition-all hover:opacity-90"
              style={{ fontSize: 14, fontWeight: 600, backgroundColor: c.accent }}>
              Start
            </button>
          </div>
        ) : (
          <div>
            {/* Play / Replay button */}
            <button onClick={replay}
              className="mb-[20px] rounded-[12px] px-[24px] py-[14px] transition-all"
              style={{
                backgroundColor: playing ? (isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)") : c.bgHover,
                border: `1px solid ${playing ? "rgba(99,102,241,0.3)" : c.border}`,
                color: playing ? "#6366F1" : c.text,
                fontSize: 14, fontWeight: 600,
              }}>
              {playing ? "🔊 Playing..." : "🔊 Replay tone"}
            </button>

            {/* Frequency range hint */}
            <div className="flex justify-center gap-[4px] mb-[16px] flex-wrap">
              {FREQ_RANGES.map(r => (
                <div key={r.label} className="rounded-full px-[8px] py-[2px]"
                  style={{
                    fontSize: 10, fontWeight: 500,
                    backgroundColor: (submitted && currentRange === r.label)
                      ? r.color
                      : (!submitted && guessRange === r.label)
                        ? `${r.color}30`
                        : isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                    color: (submitted && currentRange === r.label) ? "#fff" : c.muted,
                    border: `1px solid ${(!submitted && guessRange === r.label) ? `${r.color}50` : "transparent"}`,
                  }}>
                  {r.label}
                </div>
              ))}
            </div>

            {/* Slider */}
            {!submitted && (
              <div className="mb-[20px]">
                <p style={{ fontSize: 32, fontWeight: 800, color: c.text, marginBottom: 12 }} className="tabular-nums">
                  {formatFreq(userGuess)}
                </p>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={freqToSlider(userGuess)}
                  onChange={e => setUserGuess(sliderToFreq(Number(e.target.value)))}
                  className="w-full"
                  style={{ accentColor: "#6366F1" }}
                />
                <div className="flex justify-between mt-[4px]">
                  <span style={{ fontSize: 10, color: c.muted }}>20Hz</span>
                  <span style={{ fontSize: 10, color: c.muted }}>16kHz</span>
                </div>
              </div>
            )}

            {/* Submit or Result */}
            {!submitted ? (
              <button onClick={handleSubmit}
                className="rounded-[10px] px-[24px] py-[10px] text-white transition-all hover:opacity-90"
                style={{ fontSize: 14, fontWeight: 600, backgroundColor: c.accent }}>
                Lock in {formatFreq(userGuess)}
              </button>
            ) : result && currentFreq && (
              <div>
                <p style={{ fontSize: 24, fontWeight: 800, color: c.text, marginTop: 8 }}>{result.msg}</p>
                <div className="flex items-center justify-center gap-[24px] mt-[12px]">
                  <div>
                    <p style={{ fontSize: 11, color: c.muted }}>Your guess</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: c.text }}>{formatFreq(userGuess)}</p>
                  </div>
                  <div style={{ fontSize: 16, color: c.muted }}>→</div>
                  <div>
                    <p style={{ fontSize: 11, color: c.muted }}>Actual</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: c.accent }}>{formatFreq(currentFreq)}</p>
                  </div>
                </div>
                <button onClick={startRound}
                  className="mt-[20px] rounded-[10px] px-[20px] py-[8px] transition-all"
                  style={{ fontSize: 13, fontWeight: 500, color: c.soft, border: `1px solid ${c.border}` }}>
                  Next frequency
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
