"use client";

import { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";

const NOTES = [
  { name: "C", freq: 261.63 },
  { name: "D", freq: 293.66 },
  { name: "E", freq: 329.63 },
  { name: "F", freq: 349.23 },
  { name: "G", freq: 392.00 },
  { name: "A", freq: 440.00 },
  { name: "B", freq: 493.88 },
];

const NOTE_COLORS = ["#8B5CF6", "#6366F1", "#0EA5E9", "#10B981", "#F59E0B", "#F97316", "#F43F5E"];

function playNote(ctx: AudioContext, freq: number, duration = 0.3) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.35, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

interface MelodyMemoryProps { isDark: boolean; }

export function MelodyMemory({ isDark }: MelodyMemoryProps) {
  const [sequence, setSequence] = useState<number[]>([]);
  const [userInput, setUserInput] = useState<number[]>([]);
  const [phase, setPhase] = useState<"idle" | "playing" | "input" | "success" | "fail">("idle");
  const [activeNote, setActiveNote] = useState<number | null>(null);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const audioCtx = useRef<AudioContext | null>(null);

  const c = {
    text: isDark ? "#fff" : "#0F0F10",
    muted: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
    soft: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    bg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    accent: "rgba(27,16,253,0.7)",
  };

  const getCtx = () => {
    if (!audioCtx.current) audioCtx.current = new AudioContext();
    return audioCtx.current;
  };

  const generateSequence = useCallback((len: number) => {
    return Array.from({ length: len }, () => Math.floor(Math.random() * NOTES.length));
  }, []);

  const playSequence = useCallback(async (seq: number[]) => {
    setPhase("playing");
    const ctx = getCtx();
    for (let i = 0; i < seq.length; i++) {
      setActiveNote(seq[i]);
      playNote(ctx, NOTES[seq[i]].freq, 0.35);
      await new Promise(r => setTimeout(r, 500));
      setActiveNote(null);
      await new Promise(r => setTimeout(r, 150));
    }
    setPhase("input");
  }, []);

  const startGame = useCallback(() => {
    const seq = generateSequence(3);
    setSequence(seq);
    setUserInput([]);
    setLevel(1);
    playSequence(seq);
  }, [generateSequence, playSequence]);

  const handleNotePress = useCallback((noteIdx: number) => {
    if (phase !== "input") return;
    const ctx = getCtx();
    playNote(ctx, NOTES[noteIdx].freq, 0.25);
    setActiveNote(noteIdx);
    setTimeout(() => setActiveNote(null), 150);

    const newInput = [...userInput, noteIdx];
    setUserInput(newInput);

    // Check if wrong
    if (newInput[newInput.length - 1] !== sequence[newInput.length - 1]) {
      setPhase("fail");
      setHighScore(h => Math.max(h, level));
      // Play fail sound
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.value = 150; osc.type = "sawtooth";
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
      return;
    }

    // Check if complete
    if (newInput.length === sequence.length) {
      setPhase("success");
      setHighScore(h => Math.max(h, level + 1));
      // Play success sound
      playNote(ctx, 523.25, 0.15);
      setTimeout(() => playNote(ctx, 659.25, 0.15), 150);
      setTimeout(() => playNote(ctx, 783.99, 0.3), 300);
      // Next level
      setTimeout(() => {
        const nextSeq = [...sequence, Math.floor(Math.random() * NOTES.length)];
        setSequence(nextSeq);
        setUserInput([]);
        setLevel(l => l + 1);
        playSequence(nextSeq);
      }, 1200);
    }
  }, [phase, userInput, sequence, level, playSequence]);

  return (
    <div className="w-full max-w-[400px] mx-auto">
      <div className="rounded-[16px] p-[24px] text-center" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
        <div className="flex items-center justify-between mb-[16px]">
          <span style={{ fontSize: 12, color: c.muted }}>Level {level}</span>
          <span style={{ fontSize: 12, color: c.muted }}>Best: {highScore}</span>
        </div>

        {phase === "idle" && (
          <div>
            <p style={{ fontSize: 16, fontWeight: 600, color: c.text, marginBottom: 8 }}>Melody Memory</p>
            <p style={{ fontSize: 13, color: c.soft, marginBottom: 20 }}>Listen to the melody, then replay it</p>
            <button onClick={startGame}
              className="rounded-[10px] px-[24px] py-[10px] text-white transition-all hover:opacity-90"
              style={{ fontSize: 14, fontWeight: 600, backgroundColor: c.accent }}>
              Start
            </button>
          </div>
        )}

        {phase === "playing" && (
          <p style={{ fontSize: 14, fontWeight: 500, color: c.soft, marginBottom: 16 }}>Listen...</p>
        )}

        {phase === "input" && (
          <p style={{ fontSize: 14, fontWeight: 500, color: c.text, marginBottom: 16 }}>
            Your turn — {userInput.length} / {sequence.length}
          </p>
        )}

        {phase === "fail" && (
          <div className="mb-[16px]">
            <p style={{ fontSize: 20, fontWeight: 800, color: c.text }}>Wrong note</p>
            <p style={{ fontSize: 13, color: c.soft, marginTop: 4 }}>You reached level {level}</p>
            <button onClick={startGame}
              className="mt-[14px] rounded-[10px] px-[20px] py-[8px] transition-all"
              style={{ fontSize: 13, color: c.soft, border: `1px solid ${c.border}` }}>
              Try again
            </button>
          </div>
        )}

        {phase === "success" && (
          <p style={{ fontSize: 14, fontWeight: 600, color: c.accent, marginBottom: 16 }}>
            Nice — next level...
          </p>
        )}

        {/* Note buttons */}
        <div className="flex gap-[6px] justify-center mt-[8px]">
          {NOTES.map((note, i) => {
            const isActive = activeNote === i;
            const color = NOTE_COLORS[i];
            return (
              <motion.button
                key={note.name}
                onMouseDown={() => handleNotePress(i)}
                whileTap={{ scale: 0.9 }}
                className="rounded-[10px] flex flex-col items-center justify-center transition-all"
                style={{
                  width: 46, height: 56,
                  backgroundColor: isActive ? color : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                  border: `1px solid ${isActive ? color : c.border}`,
                  boxShadow: isActive ? `0 0 16px ${color}50` : undefined,
                }}>
                <span style={{ fontSize: 14, fontWeight: 600, color: isActive ? "#fff" : (isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)") }}>
                  {note.name}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
