"use client";

import { useState, useCallback, useRef, useEffect } from "react";

// ─── Types ───────────────────────────────────────────────────
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

// ─── Frequency Ranges ────────────────────────────────────────
const FREQ_RANGES = [
  { name: "Sub Bass", min: 20, max: 60, color: "#FF2D55" },
  { name: "Bass", min: 60, max: 250, color: "#FF9500" },
  { name: "Low Mid", min: 250, max: 500, color: "#FFCC00" },
  { name: "Mid", min: 500, max: 2000, color: "#34C759" },
  { name: "Upper Mid", min: 2000, max: 4000, color: "#007AFF" },
  { name: "Presence", min: 4000, max: 8000, color: "#5856D6" },
  { name: "Brilliance", min: 8000, max: 16000, color: "#AF52DE" },
];

// ─── Helpers ─────────────────────────────────────────────────
function generateFreq(): number {
  const range = FREQ_RANGES[Math.floor(Math.random() * FREQ_RANGES.length)];
  return Math.round(range.min + Math.random() * (range.max - range.min));
}

function getFreqRange(freq: number): (typeof FREQ_RANGES)[0] | null {
  for (const range of FREQ_RANGES) {
    if (freq >= range.min && freq <= range.max) return range;
  }
  return null;
}

function formatFreq(freq: number): string {
  if (freq >= 1000) {
    const khz = freq / 1000;
    return khz % 1 === 0 ? `${khz} kHz` : `${khz.toFixed(1)} kHz`;
  }
  return `${freq} Hz`;
}

// Logarithmic slider helpers (20Hz to 16kHz)
const LOG_MIN = Math.log(20);
const LOG_MAX = Math.log(16000);

function freqToSlider(freq: number): number {
  return (Math.log(freq) - LOG_MIN) / (LOG_MAX - LOG_MIN);
}

function sliderToFreq(val: number): number {
  return Math.round(Math.exp(LOG_MIN + val * (LOG_MAX - LOG_MIN)));
}

// ─── Result messages ─────────────────────────────────────────
function getResult(guessFreq: number, actualFreq: number) {
  const logDiff = Math.abs(Math.log2(guessFreq / actualFreq));

  if (logDiff < 0.05) return { message: "PERFECT EAR", points: 100, color: "#34C759" };
  if (logDiff < 0.15) return { message: "REALLY CLOSE", points: 75, color: "#007AFF" };
  if (logDiff < 0.35) return { message: "NOT BAD", points: 50, color: "#FFCC00" };
  if (logDiff < 0.7) return { message: "KINDA OFF", points: 25, color: "#FF9500" };
  return { message: "WAY OFF", points: 0, color: "#FF2D55" };
}

// ─── Component ───────────────────────────────────────────────
export default function FrequencyQuiz({ isDark, isColorful, theme }: GameProps) {
  const [currentFreq, setCurrentFreq] = useState<number | null>(null);
  const [userGuess, setUserGuess] = useState(1000);
  const [result, setResult] = useState<{ message: string; points: number; color: string } | null>(null);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [streak, setStreak] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    return () => {
      if (oscRef.current) {
        try { oscRef.current.stop(); } catch {}
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
    };
  }, []);

  const getAudioCtx = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  // ─── Play frequency (sine oscillator, 2s duration, fade in/out) ───
  const playFreq = useCallback((freq: number) => {
    const ctx = getAudioCtx();

    // Stop previous if still playing
    if (oscRef.current) {
      try { oscRef.current.stop(); } catch {}
    }

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

    // Fade in
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.05);
    // Sustain then fade out
    gainNode.gain.setValueAtTime(0.3, ctx.currentTime + 1.8);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2.0);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 2.0);

    oscRef.current = oscillator;
    gainRef.current = gainNode;

    setPlaying(true);
    oscillator.onended = () => setPlaying(false);
  }, [getAudioCtx]);

  // ─── Start a new round ───
  const startRound = useCallback(() => {
    const freq = generateFreq();
    setCurrentFreq(freq);
    setUserGuess(1000);
    setResult(null);
    setSubmitted(false);
    setRound((r) => r + 1);
    playFreq(freq);
  }, [playFreq]);

  // ─── Handle submit ───
  const handleSubmit = useCallback(() => {
    if (!currentFreq || submitted) return;

    const res = getResult(userGuess, currentFreq);
    setResult(res);
    setSubmitted(true);
    setScore((s) => s + res.points);

    if (res.points >= 50) {
      setStreak((s) => s + 1);
    } else {
      setStreak(0);
    }
  }, [currentFreq, userGuess, submitted]);

  // ─── Replay ───
  const handleReplay = useCallback(() => {
    if (currentFreq) playFreq(currentFreq);
  }, [currentFreq, playFreq]);

  const sliderVal = freqToSlider(userGuess);
  const guessRange = getFreqRange(userGuess);
  const actualRange = currentFreq ? getFreqRange(currentFreq) : null;

  return (
    <div style={{ width: "100%" }}>
      {/* Header: Score / Streak / Round */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "12px 16px",
          backgroundColor: theme.bgCard,
          marginBottom: 2,
        }}
      >
        <div className="flex items-center gap-[20px]">
          <div>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", color: theme.textMuted }}>
              SCORE
            </span>
            <p style={{ fontSize: 24, fontWeight: 700, color: theme.text, lineHeight: 1 }}>
              {score}
            </p>
          </div>
          <div>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", color: theme.textMuted }}>
              STREAK
            </span>
            <p style={{ fontSize: 24, fontWeight: 700, color: isColorful ? "#FF9500" : theme.accent, lineHeight: 1 }}>
              {streak}
            </p>
          </div>
          <div>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", color: theme.textMuted }}>
              ROUND
            </span>
            <p style={{ fontSize: 24, fontWeight: 700, color: theme.textSec, lineHeight: 1 }}>
              {round}
            </p>
          </div>
        </div>
        {currentFreq && (
          <button
            onClick={handleReplay}
            disabled={playing}
            style={{
              padding: "6px 14px",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: playing ? theme.textMuted : theme.accentText,
              backgroundColor: playing ? theme.bgHover : theme.accent,
              cursor: playing ? "default" : "pointer",
            }}
          >
            {playing ? "PLAYING..." : "REPLAY"}
          </button>
        )}
      </div>

      {/* Frequency range pills */}
      <div
        className="flex flex-wrap gap-[2px]"
        style={{ padding: "12px 16px", backgroundColor: theme.bgSubtle }}
      >
        {FREQ_RANGES.map((range) => {
          const isGuessRange = guessRange?.name === range.name && !submitted;
          const isActualRange = submitted && actualRange?.name === range.name;

          return (
            <div
              key={range.name}
              style={{
                padding: "6px 10px",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: isActualRange
                  ? "#FFFFFF"
                  : isGuessRange
                    ? (isColorful ? range.color : theme.text)
                    : theme.textMuted,
                backgroundColor: isActualRange
                  ? range.color
                  : isGuessRange
                    ? (isColorful ? `${range.color}${isDark ? "33" : "22"}` : theme.bgCard)
                    : theme.bgCard,
              }}
            >
              {range.name.toUpperCase()}
              <span style={{ marginLeft: 4, opacity: 0.6, fontWeight: 400 }}>
                {range.min >= 1000 ? `${range.min / 1000}k` : range.min}-{range.max >= 1000 ? `${range.max / 1000}k` : range.max}
              </span>
            </div>
          );
        })}
      </div>

      {/* Main area: Slider + Big number */}
      {currentFreq && !submitted ? (
        <div style={{ padding: "24px 16px", backgroundColor: theme.bgCard, marginTop: 2 }}>
          {/* Big frequency display */}
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <span style={{ fontSize: 48, fontWeight: 700, color: isColorful && guessRange ? guessRange.color : theme.text }}>
              {formatFreq(userGuess)}
            </span>
          </div>

          {/* Logarithmic slider */}
          <div style={{ padding: "0 8px" }}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.001}
              value={sliderVal}
              onChange={(e) => setUserGuess(sliderToFreq(parseFloat(e.target.value)))}
              style={{
                width: "100%",
                height: 4,
                appearance: "none",
                WebkitAppearance: "none",
                background: `linear-gradient(90deg, ${FREQ_RANGES.map((r) => r.color).join(", ")})`,
                outline: "none",
                cursor: "pointer",
              }}
            />
            <div className="flex justify-between" style={{ marginTop: 6 }}>
              <span style={{ fontSize: 10, color: theme.textMuted, letterSpacing: "0.04em" }}>20 HZ</span>
              <span style={{ fontSize: 10, color: theme.textMuted, letterSpacing: "0.04em" }}>16 KHZ</span>
            </div>
          </div>

          {/* Lock in button */}
          <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
            <button
              onClick={handleSubmit}
              style={{
                padding: "10px 32px",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: theme.accentText,
                backgroundColor: theme.accent,
                cursor: "pointer",
              }}
            >
              LOCK IN
            </button>
          </div>
        </div>
      ) : submitted && currentFreq ? (
        /* Result display */
        <div style={{ padding: "24px 16px", backgroundColor: theme.bgCard, marginTop: 2 }}>
          {/* Result message */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <p style={{ fontSize: 28, fontWeight: 700, color: result?.color || theme.text }}>
              {result?.message}
            </p>
            <p style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>
              +{result?.points} POINTS
            </p>
          </div>

          {/* Comparison: Your guess vs Actual */}
          <div
            className="flex gap-[2px]"
            style={{ marginBottom: 20 }}
          >
            <div
              style={{
                flex: 1,
                padding: "14px 16px",
                backgroundColor: theme.bgSubtle,
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", color: theme.textMuted }}>
                YOUR GUESS
              </span>
              <p style={{ fontSize: 22, fontWeight: 700, color: theme.text, marginTop: 4 }}>
                {formatFreq(userGuess)}
              </p>
              {guessRange && (
                <p style={{ fontSize: 11, color: isColorful ? guessRange.color : theme.textSec, marginTop: 2 }}>
                  {guessRange.name.toUpperCase()}
                </p>
              )}
            </div>
            <div
              style={{
                flex: 1,
                padding: "14px 16px",
                backgroundColor: theme.bgSubtle,
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", color: theme.textMuted }}>
                ACTUAL
              </span>
              <p style={{ fontSize: 22, fontWeight: 700, color: isColorful && actualRange ? actualRange.color : theme.accent, marginTop: 4 }}>
                {formatFreq(currentFreq)}
              </p>
              {actualRange && (
                <p style={{ fontSize: 11, color: isColorful ? actualRange.color : theme.textSec, marginTop: 2 }}>
                  {actualRange.name.toUpperCase()}
                </p>
              )}
            </div>
          </div>

          {/* Next round button */}
          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              onClick={startRound}
              style={{
                padding: "10px 24px",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: theme.accentText,
                backgroundColor: theme.accent,
                cursor: "pointer",
              }}
            >
              NEXT ROUND
            </button>
          </div>
        </div>
      ) : (
        /* Idle state: Start button */
        <div
          style={{
            padding: "48px 16px",
            backgroundColor: theme.bgCard,
            marginTop: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <p style={{ fontSize: 13, color: theme.textMuted, letterSpacing: "0.04em" }}>
            IDENTIFY THE FREQUENCY YOU HEAR
          </p>
          <button
            onClick={startRound}
            style={{
              padding: "10px 24px",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.04em",
              color: theme.accentText,
              backgroundColor: theme.accent,
              cursor: "pointer",
            }}
          >
            START
          </button>
        </div>
      )}
    </div>
  );
}
