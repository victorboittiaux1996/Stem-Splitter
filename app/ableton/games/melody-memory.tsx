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

// ─── Notes ───────────────────────────────────────────────────
const NOTES = [
  { name: "C", freq: 261.63 },
  { name: "D", freq: 293.66 },
  { name: "E", freq: 329.63 },
  { name: "F", freq: 349.23 },
  { name: "G", freq: 392.0 },
  { name: "A", freq: 440.0 },
  { name: "B", freq: 493.88 },
];

const NOTE_COLORS = [
  "#FF2D55", // C - red
  "#FF9500", // D - orange
  "#FFCC00", // E - yellow
  "#34C759", // F - green
  "#007AFF", // G - blue
  "#5856D6", // A - indigo
  "#AF52DE", // B - purple
];

type Phase = "idle" | "playing" | "input" | "success" | "fail";

// ─── Component ───────────────────────────────────────────────
export default function MelodyMemory({ isDark, isColorful, theme }: GameProps) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeNote, setActiveNote] = useState<number | null>(null);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(clearTimeout);
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

  // ─── Play a single note (sine oscillator with exponential decay) ───
  const playNote = useCallback((freq: number, duration = 0.3) => {
    const ctx = getAudioCtx();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(freq, ctx.currentTime);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + duration);
  }, [getAudioCtx]);

  // ─── Play success sound (ascending notes) ───
  const playSuccessSound = useCallback(() => {
    const ctx = getAudioCtx();
    const freqs = [523.25, 659.25, 783.99, 1046.5];
    freqs.forEach((freq, i) => {
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);

      gainNode.gain.setValueAtTime(0, ctx.currentTime + i * 0.1);
      gainNode.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.1 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.3);

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.start(ctx.currentTime + i * 0.1);
      oscillator.stop(ctx.currentTime + i * 0.1 + 0.3);
    });
  }, [getAudioCtx]);

  // ─── Play fail sound (sawtooth buzz) ───
  const playFailSound = useCallback(() => {
    const ctx = getAudioCtx();
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.type = "sawtooth";
    oscillator.frequency.setValueAtTime(80, ctx.currentTime);
    oscillator.frequency.linearRampToValueAtTime(40, ctx.currentTime + 0.5);

    gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.5);
  }, [getAudioCtx]);

  // ─── Generate random sequence ───
  const generateSequence = useCallback((length: number): number[] => {
    return Array.from({ length }, () => Math.floor(Math.random() * NOTES.length));
  }, []);

  // ─── Play the sequence with visual feedback ───
  const playSequence = useCallback((seq: number[]) => {
    setPhase("playing");
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];

    seq.forEach((noteIdx, i) => {
      const onTimeout = setTimeout(() => {
        setActiveNote(noteIdx);
        playNote(NOTES[noteIdx].freq);
      }, i * 650); // 500ms on + 150ms off

      const offTimeout = setTimeout(() => {
        setActiveNote(null);
      }, i * 650 + 500);

      timeoutsRef.current.push(onTimeout, offTimeout);
    });

    const doneTimeout = setTimeout(() => {
      setPhase("input");
      setUserInput([]);
    }, seq.length * 650 + 200);

    timeoutsRef.current.push(doneTimeout);
  }, [playNote]);

  // ─── Start game ───
  const startGame = useCallback(() => {
    const seq = generateSequence(3);
    setSequence(seq);
    setLevel(1);
    setUserInput([]);
    playSequence(seq);
  }, [generateSequence, playSequence]);

  // ─── Handle note press ───
  const handleNotePress = useCallback((noteIdx: number) => {
    if (phase !== "input") return;

    playNote(NOTES[noteIdx].freq);
    setActiveNote(noteIdx);
    setTimeout(() => setActiveNote(null), 200);

    const newInput = [...userInput, noteIdx];
    setUserInput(newInput);

    const currentPos = newInput.length - 1;

    // Check if wrong
    if (newInput[currentPos] !== sequence[currentPos]) {
      setPhase("fail");
      playFailSound();
      if (level > highScore) {
        setHighScore(level);
      }
      return;
    }

    // Check if completed the sequence
    if (newInput.length === sequence.length) {
      setPhase("success");
      playSuccessSound();

      const newLevel = level + 1;
      setLevel(newLevel);
      if (newLevel > highScore) {
        setHighScore(newLevel);
      }

      // Add one more note and replay
      const nextTimeout = setTimeout(() => {
        const newSeq = [...sequence, Math.floor(Math.random() * NOTES.length)];
        setSequence(newSeq);
        playSequence(newSeq);
      }, 1200);

      timeoutsRef.current.push(nextTimeout);
    }
  }, [phase, userInput, sequence, level, highScore, playNote, playFailSound, playSuccessSound, playSequence]);

  // ─── Phase text ───
  const phaseText = (() => {
    switch (phase) {
      case "idle": return "PRESS START TO BEGIN";
      case "playing": return "LISTEN CAREFULLY...";
      case "input": return "YOUR TURN — REPEAT THE SEQUENCE";
      case "success": return "CORRECT! ADDING ONE MORE...";
      case "fail": return "WRONG NOTE — GAME OVER";
      default: return "";
    }
  })();

  return (
    <div style={{ width: "100%" }}>
      {/* Header: Level + High Score */}
      <div
        className="flex items-center justify-between"
        style={{
          padding: "12px 16px",
          backgroundColor: theme.bgCard,
          marginBottom: 2,
        }}
      >
        <div className="flex items-center gap-[16px]">
          <div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: theme.textMuted,
                textTransform: "uppercase" as const,
              }}
            >
              LEVEL
            </span>
            <p style={{ fontSize: 24, fontWeight: 700, color: theme.text, lineHeight: 1 }}>
              {level}
            </p>
          </div>
          <div>
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: "0.04em",
                color: theme.textMuted,
                textTransform: "uppercase" as const,
              }}
            >
              HIGH SCORE
            </span>
            <p style={{ fontSize: 24, fontWeight: 700, color: isColorful ? "#FF9500" : theme.accent, lineHeight: 1 }}>
              {highScore}
            </p>
          </div>
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 500,
            letterSpacing: "0.04em",
            color: phase === "fail" ? "#FF2D55" : phase === "success" ? "#34C759" : theme.textSec,
          }}
        >
          {phaseText}
        </div>
      </div>

      {/* Note buttons */}
      <div
        className="flex gap-[2px]"
        style={{
          padding: "16px",
          backgroundColor: theme.bgSubtle,
        }}
      >
        {NOTES.map((note, i) => {
          const isActive = activeNote === i;
          const baseColor = NOTE_COLORS[i];
          const isDisabled = phase !== "input";

          return (
            <button
              key={note.name}
              onClick={() => handleNotePress(i)}
              disabled={isDisabled}
              style={{
                flex: 1,
                height: 80,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                backgroundColor: isActive
                  ? baseColor
                  : isColorful
                    ? `${baseColor}${isDark ? "33" : "22"}`
                    : theme.bgCard,
                color: isActive ? "#FFFFFF" : isColorful ? baseColor : theme.text,
                cursor: isDisabled ? "default" : "pointer",
                transition: "background-color 0.1s, transform 0.1s",
                opacity: isDisabled && phase !== "playing" && phase !== "idle" ? 0.5 : 1,
                transform: isActive ? "scale(0.96)" : "scale(1)",
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 700 }}>{note.name}</span>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 500,
                  letterSpacing: "0.04em",
                  color: isActive ? "rgba(255,255,255,0.7)" : theme.textMuted,
                }}
              >
                {Math.round(note.freq)} HZ
              </span>
            </button>
          );
        })}
      </div>

      {/* Sequence progress indicator */}
      {phase === "input" && (
        <div
          className="flex items-center gap-[3px]"
          style={{ padding: "12px 16px", backgroundColor: theme.bgCard }}
        >
          {sequence.map((noteIdx, i) => (
            <div
              key={i}
              style={{
                width: 8,
                height: 8,
                backgroundColor: i < userInput.length
                  ? NOTE_COLORS[noteIdx]
                  : theme.bgHover,
                transition: "background-color 0.2s",
              }}
            />
          ))}
        </div>
      )}

      {/* Start / Try Again button */}
      {(phase === "idle" || phase === "fail") && (
        <div style={{ padding: "16px", display: "flex", justifyContent: "center" }}>
          <button
            onClick={startGame}
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
            {phase === "fail" ? "TRY AGAIN" : "START"}
          </button>
        </div>
      )}
    </div>
  );
}
