"use client";

import { useState, useRef, useCallback } from "react";

// Simulated "stems" using different synth tones + textures
const STEMS = [
  { id: "vocals", label: "Vocals", emoji: "\u{1F3A4}", color: "#8B5CF6" },
  { id: "drums", label: "Drums", emoji: "\u{1F941}", color: "#F59E0B" },
  { id: "bass", label: "Bass", emoji: "\u{1F3B8}", color: "#10B981" },
  { id: "keys", label: "Keys", emoji: "\u{1F3B9}", color: "#0EA5E9" },
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

interface GameProps {
  isDark: boolean;
  isColorful: boolean;
  theme: {
    bg: string; bgCard: string; bgSubtle: string; bgHover: string; bgElevated: string;
    text: string; textSec: string; textMuted: string;
    accent: string; accentText: string;
    badgeBg: string; badgeText: string;
  };
}

export function GuessTheStem({ isDark, isColorful, theme }: GameProps) {
  const [currentStem, setCurrentStem] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; answer: string } | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [total, setTotal] = useState(0);
  const [streak, setStreak] = useState(0);
  const [playing, setPlaying] = useState(false);
  const audioCtx = useRef<AudioContext | null>(null);

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
    <div style={{ width: "100%", maxWidth: 440, margin: "0 auto" }}>
      <div style={{ padding: 24, textAlign: "center", backgroundColor: theme.bgCard }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: theme.textMuted }}>
            SCORE: {score}
          </span>
          {streak >= 2 && (
            <span style={{ fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: theme.accent, fontWeight: 700 }}>
              {streak} STREAK
            </span>
          )}
          <span style={{ fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" as const, color: theme.textMuted }}>
            ROUND {round || "\u2014"}
          </span>
        </div>

        {round === 0 ? (
          <div>
            <p style={{ fontSize: 20, fontWeight: 700, color: theme.text, marginBottom: 4 }}>
              GUESS THE STEM
            </p>
            <p style={{ fontSize: 13, color: theme.textSec, marginBottom: 6 }}>
              Listen and identify: vocals, drums, bass, or keys
            </p>
            <p style={{ fontSize: 11, color: theme.textMuted, marginBottom: 20, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
              TRAIN YOUR EAR TO RECOGNIZE INSTRUMENT GROUPS
            </p>
            <button
              onClick={startRound}
              style={{
                padding: "10px 24px",
                color: theme.accentText,
                backgroundColor: theme.accent,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase" as const,
                border: "none",
                cursor: "pointer",
              }}
            >
              START
            </button>
          </div>
        ) : (
          <div>
            {/* Replay button */}
            <button
              onClick={replay}
              style={{
                width: "100%",
                padding: "14px 24px",
                marginBottom: 24,
                backgroundColor: playing ? theme.bgElevated : theme.bgSubtle,
                color: playing ? theme.accent : theme.text,
                fontSize: 13,
                fontWeight: 700,
                letterSpacing: "0.04em",
                textTransform: "uppercase" as const,
                border: "none",
                cursor: "pointer",
                transition: "background-color 0.15s, color 0.15s",
              }}
            >
              {playing ? "\u{1F50A} PLAYING..." : "\u{1F50A} REPLAY"}
            </button>

            {/* Stem choices */}
            {!result ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {STEMS.map(stem => (
                  <button
                    key={stem.id}
                    onClick={() => handleGuess(stem.id)}
                    style={{
                      padding: 16,
                      backgroundColor: theme.bgSubtle,
                      border: "none",
                      cursor: "pointer",
                      transition: "background-color 0.12s, transform 0.12s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.bgHover;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = theme.bgSubtle;
                    }}
                    onMouseDown={(e) => {
                      e.currentTarget.style.transform = "scale(0.96)";
                    }}
                    onMouseUp={(e) => {
                      e.currentTarget.style.transform = "scale(1)";
                    }}
                  >
                    <span style={{ fontSize: 28, display: "block" }}>{stem.emoji}</span>
                    <p style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: theme.text,
                      marginTop: 6,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase" as const,
                    }}>
                      {stem.label}
                    </p>
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <p style={{
                  fontSize: 28,
                  fontWeight: 800,
                  color: result.correct ? "#10B981" : "#F43F5E",
                  marginBottom: 8,
                }}>
                  {result.correct ? "CORRECT" : "WRONG"}
                </p>
                <p style={{ fontSize: 14, color: theme.textSec }}>
                  It was <span style={{ fontWeight: 700, color: theme.text }}>{result.answer}</span>
                </p>
                {total > 0 && (
                  <p style={{
                    fontSize: 11,
                    color: theme.textMuted,
                    marginTop: 6,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase" as const,
                  }}>
                    {score} PTS \u2014 {Math.round((score / (total * 10)) * 100)}% ACCURACY
                  </p>
                )}
                <button
                  onClick={startRound}
                  style={{
                    marginTop: 16,
                    padding: "8px 20px",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase" as const,
                    color: theme.textSec,
                    backgroundColor: theme.bgSubtle,
                    border: "none",
                    cursor: "pointer",
                  }}
                >
                  NEXT ROUND
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
