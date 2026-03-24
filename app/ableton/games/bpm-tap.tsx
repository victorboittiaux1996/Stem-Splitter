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
  isColorful: boolean;
  theme: {
    bg: string; bgCard: string; bgSubtle: string; bgHover: string; bgElevated: string;
    text: string; textSec: string; textMuted: string;
    accent: string; accentText: string;
    badgeBg: string; badgeText: string;
  };
}

export function BpmTap({ isDark, isColorful, theme }: BpmTapProps) {
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
    <div style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}>
      <div style={{ backgroundColor: theme.bgCard, padding: 24, textAlign: "center" }}>
        {/* Header: score / streak / round */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <span style={{ fontSize: 11, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            SCORE: {score}
          </span>
          {streak >= 2 && (
            <span style={{ fontSize: 11, color: theme.accent, textTransform: "uppercase", letterSpacing: "0.04em" }}>
              STREAK {streak}
            </span>
          )}
          <span style={{ fontSize: 11, color: theme.textMuted, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            ROUND {round}
          </span>
        </div>

        {/* Song info */}
        <p style={{ fontSize: 20, fontWeight: 700, color: theme.text }}>{song.title}</p>
        <p style={{ fontSize: 14, color: theme.textSec, marginTop: 4 }}>{song.artist}</p>

        <AnimatePresence mode="wait">
          {!result ? (
            <motion.div key="tap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Tap button */}
              <motion.button
                onClick={handleTap}
                whileTap={{ scale: 0.96 }}
                style={{
                  marginTop: 20,
                  width: "100%",
                  padding: "28px 0",
                  backgroundColor: taps.length > 0 ? theme.bgElevated : theme.bgSubtle,
                  color: theme.text,
                  cursor: "pointer",
                  border: "none",
                  outline: "none",
                }}
              >
                <p style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: theme.textSec,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  margin: 0,
                }}>
                  {taps.length === 0 ? "TAP HERE" : "KEEP TAPPING"}
                </p>
                {userBpm !== null && (
                  <p style={{
                    fontSize: 36,
                    fontWeight: 800,
                    color: theme.text,
                    marginTop: 8,
                    margin: "8px 0 0",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {userBpm}
                  </p>
                )}
                {taps.length > 0 && taps.length < 4 && (
                  <p style={{
                    fontSize: 11,
                    color: theme.textMuted,
                    marginTop: 6,
                    margin: "6px 0 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                  }}>
                    {4 - taps.length} MORE TAPS
                  </p>
                )}
              </motion.button>

              <p style={{
                fontSize: 11,
                color: theme.textMuted,
                marginTop: 10,
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}>
                EACH TAP PLAYS A CLICK SO YOU CAN FEEL YOUR RHYTHM
              </p>

              {/* Lock in button */}
              {userBpm !== null && (
                <motion.button
                  onClick={submit}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileTap={{ scale: 0.96 }}
                  style={{
                    marginTop: 14,
                    padding: "10px 24px",
                    backgroundColor: theme.accent,
                    color: theme.accentText,
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    cursor: "pointer",
                    border: "none",
                    outline: "none",
                  }}
                >
                  LOCK IN {userBpm} BPM
                </motion.button>
              )}
            </motion.div>
          ) : (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}>
              {/* Result message */}
              <p style={{ fontSize: 28, fontWeight: 800, color: theme.text, marginTop: 24 }}>
                {result.msg}
              </p>
              <p style={{ fontSize: 14, color: theme.textSec, marginTop: 8 }}>
                You: <span style={{ color: theme.text, fontWeight: 600 }}>{userBpm}</span>
                {" "}&mdash;{" "}
                Actual: <span style={{ color: theme.accent, fontWeight: 600 }}>{song.bpm}</span>
                {result.diff > 0 && <span> ({result.diff} off)</span>}
              </p>

              {/* Next song button */}
              <motion.button
                onClick={next}
                whileTap={{ scale: 0.96 }}
                style={{
                  marginTop: 20,
                  padding: "10px 24px",
                  backgroundColor: theme.bgSubtle,
                  color: theme.textSec,
                  fontSize: 13,
                  fontWeight: 500,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  cursor: "pointer",
                  border: "none",
                  outline: "none",
                }}
              >
                NEXT SONG
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
