"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Simulated "stems" using different synth tones + textures
const STEMS = [
  { id: "vocals", label: "Vocals", emoji: "🎤", color: "#8B5CF6" },
  { id: "drums", label: "Drums", emoji: "🥁", color: "#F59E0B" },
  { id: "bass", label: "Bass", emoji: "🎸", color: "#10B981" },
  { id: "keys", label: "Keys", emoji: "🎹", color: "#0EA5E9" },
];

function playStemSound(ctx: AudioContext, stemId: string, duration = 2) {
  const now = ctx.currentTime;

  if (stemId === "vocals") {
    // Vocal-like: vibrato sine with formant-ish filtering
    const osc = ctx.createOscillator();
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    const mainGain = ctx.createGain();
    const filter = ctx.createBiquadFilter();

    vibrato.frequency.value = 5.5;
    vibratoGain.gain.value = 8;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);

    osc.type = "sine";
    const notes = [330, 392, 440, 392];
    const noteLen = duration / notes.length;
    notes.forEach((n, i) => {
      osc.frequency.setValueAtTime(n, now + i * noteLen);
    });

    filter.type = "bandpass";
    filter.frequency.value = 1200;
    filter.Q.value = 3;

    osc.connect(filter);
    filter.connect(mainGain);
    mainGain.connect(ctx.destination);
    mainGain.gain.setValueAtTime(0, now);
    mainGain.gain.linearRampToValueAtTime(0.3, now + 0.05);
    mainGain.gain.setValueAtTime(0.3, now + duration - 0.2);
    mainGain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now); osc.stop(now + duration);
    vibrato.start(now); vibrato.stop(now + duration);
  } else if (stemId === "drums") {
    // Drum pattern
    const pattern = [0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75];
    pattern.forEach((t, i) => {
      const isKick = i % 4 === 0;
      const isSnare = i % 4 === 2;
      const gain = ctx.createGain();
      gain.connect(ctx.destination);

      if (isKick) {
        const osc = ctx.createOscillator();
        osc.connect(gain);
        osc.frequency.setValueAtTime(150, now + t);
        osc.frequency.exponentialRampToValueAtTime(40, now + t + 0.1);
        gain.gain.setValueAtTime(0.5, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.2);
        osc.start(now + t); osc.stop(now + t + 0.2);
      } else if (isSnare) {
        const bufSize = Math.floor(ctx.sampleRate * 0.1);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let j = 0; j < bufSize; j++) data[j] = (Math.random() * 2 - 1) * 0.4;
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        noise.connect(gain);
        gain.gain.setValueAtTime(0.35, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.1);
        noise.start(now + t);
        const osc = ctx.createOscillator();
        const g2 = ctx.createGain();
        osc.connect(g2); g2.connect(ctx.destination);
        osc.frequency.value = 200;
        g2.gain.setValueAtTime(0.25, now + t);
        g2.gain.exponentialRampToValueAtTime(0.001, now + t + 0.08);
        osc.start(now + t); osc.stop(now + t + 0.08);
      } else {
        // Hihat
        const bufSize = Math.floor(ctx.sampleRate * 0.04);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let j = 0; j < bufSize; j++) data[j] = (Math.random() * 2 - 1);
        const noise = ctx.createBufferSource();
        noise.buffer = buf;
        const filter = ctx.createBiquadFilter();
        filter.type = "highpass"; filter.frequency.value = 8000;
        noise.connect(filter); filter.connect(gain);
        gain.gain.setValueAtTime(0.15, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.04);
        noise.start(now + t);
      }
    });
  } else if (stemId === "bass") {
    // Bass line — low sine with slight grit
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = "sawtooth";

    const notes = [55, 55, 73.42, 65.41, 55, 55, 82.41, 73.42];
    const noteLen = duration / notes.length;
    notes.forEach((n, i) => {
      osc.frequency.setValueAtTime(n, now + i * noteLen);
    });

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass"; filter.frequency.value = 200;
    osc.disconnect();
    osc.connect(filter); filter.connect(gain);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.02);
    gain.gain.setValueAtTime(0.4, now + duration - 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
    osc.start(now); osc.stop(now + duration);
  } else if (stemId === "keys") {
    // Keys — chord stabs
    const chords = [
      [261.63, 329.63, 392],     // C major
      [293.66, 349.23, 440],     // Dm
      [261.63, 329.63, 392],     // C major
      [246.94, 311.13, 369.99],  // Bm
    ];
    const chordLen = duration / chords.length;
    chords.forEach((chord, ci) => {
      chord.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.type = "triangle";
        osc.frequency.value = freq;
        const t = now + ci * chordLen;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.12, t + 0.02);
        gain.gain.setValueAtTime(0.12, t + chordLen - 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, t + chordLen);
        osc.start(t); osc.stop(t + chordLen);
      });
    });
  }
}

interface GuessTheStemProps {
  isDark: boolean;
}

export function GuessTheStem({ isDark }: GuessTheStemProps) {
  const [currentStem, setCurrentStem] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; answer: string } | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioCtx = useRef<AudioContext | null>(null);

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

  const startRound = useCallback(() => {
    const stem = STEMS[Math.floor(Math.random() * STEMS.length)];
    setCurrentStem(stem.id);
    setResult(null);
    setRound(r => r + 1);
    setPlaying(true);
    playStemSound(getCtx(), stem.id);
    setTimeout(() => setPlaying(false), 2000);
  }, []);

  const replay = useCallback(() => {
    if (currentStem) {
      setPlaying(true);
      playStemSound(getCtx(), currentStem);
      setTimeout(() => setPlaying(false), 2000);
    }
  }, [currentStem]);

  const handleGuess = useCallback((stemId: string) => {
    if (!currentStem || result) return;
    const correct = stemId === currentStem;
    const stemLabel = STEMS.find(s => s.id === currentStem)!.label;
    setResult({ correct, answer: stemLabel });
    setTotal(t => t + 1);
    if (correct) {
      setScore(s => s + (10 + streak * 5));
      setStreak(s => s + 1);
    } else {
      setStreak(0);
    }
  }, [currentStem, result, streak]);

  return (
    <div className="w-full max-w-[440px] mx-auto">
      <div className="rounded-[16px] p-[24px] text-center" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-[16px]">
          <span style={{ fontSize: 12, color: c.muted }}>Score: {score}</span>
          {streak >= 2 && <span style={{ fontSize: 12, color: "#F59E0B" }}>🔥 {streak} streak</span>}
          <span style={{ fontSize: 12, color: c.muted }}>Round {round || "—"}</span>
        </div>

        {round === 0 ? (
          <div>
            <p style={{ fontSize: 20, fontWeight: 700, color: c.text, marginBottom: 4 }}>Guess The Stem</p>
            <p style={{ fontSize: 13, color: c.soft, marginBottom: 6 }}>Listen and identify: vocals, drums, bass, or keys</p>
            <p style={{ fontSize: 11, color: c.muted, marginBottom: 20 }}>Train your ear to recognize instrument groups</p>
            <button onClick={startRound}
              className="rounded-[10px] px-[24px] py-[10px] text-white transition-all hover:opacity-90"
              style={{ fontSize: 14, fontWeight: 600, backgroundColor: c.accent }}>
              Start
            </button>
          </div>
        ) : (
          <div>
            {/* Play button */}
            <button onClick={replay}
              className="mb-[24px] rounded-[12px] px-[24px] py-[14px] transition-all w-full"
              style={{
                backgroundColor: playing ? (isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)") : c.bgHover,
                border: `1px solid ${playing ? "rgba(99,102,241,0.3)" : c.border}`,
                color: playing ? "#6366F1" : c.text,
                fontSize: 14, fontWeight: 600,
              }}>
              {playing ? "🔊 Playing..." : "🔊 Replay"}
            </button>

            {/* Stem choices */}
            {!result ? (
              <div className="grid grid-cols-2 gap-[10px]">
                {STEMS.map(stem => (
                  <button key={stem.id} onClick={() => handleGuess(stem.id)}
                    className="rounded-[12px] p-[16px] transition-all hover:scale-[0.98] active:scale-[0.95]"
                    style={{
                      backgroundColor: c.bgHover,
                      border: `1px solid ${c.border}`,
                    }}>
                    <span style={{ fontSize: 28 }}>{stem.emoji}</span>
                    <p style={{ fontSize: 14, fontWeight: 600, color: c.text, marginTop: 6 }}>{stem.label}</p>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <p style={{
                  fontSize: 28, fontWeight: 800,
                  color: result.correct ? "#10B981" : "#F43F5E",
                  marginBottom: 8,
                }}>
                  {result.correct ? "✅ Correct!" : "❌ Wrong!"}
                </p>
                <p style={{ fontSize: 14, color: c.soft }}>
                  It was <span style={{ fontWeight: 700, color: c.text }}>{result.answer}</span>
                </p>
                {total > 0 && (
                  <p style={{ fontSize: 12, color: c.muted, marginTop: 6 }}>
                    {score} pts — {Math.round((score / (total * 10)) * 100)}% accuracy
                  </p>
                )}
                <button onClick={startRound}
                  className="mt-[16px] rounded-[10px] px-[20px] py-[8px] transition-all"
                  style={{ fontSize: 13, fontWeight: 500, color: c.soft, border: `1px solid ${c.border}` }}>
                  Next round
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
