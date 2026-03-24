"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// ── Types ──
interface Projectile { id: number; x: number; y: number; targetX: number; targetY: number; progress: number; startX: number; startY: number; type: string; active: boolean; }
interface Splat { id: number; x: number; y: number; size: number; opacity: number; color: string; }
interface ScorePopup { id: number; x: number; y: number; text: string; opacity: number; }
interface TomatoTossProps { isDark: boolean; }

type Venue = "clean" | "neon" | "festival" | "basement";

const PROJECTILES = [
  { id: "tomato", emoji: "🍅", label: "Tomato", splatColor: "rgba(229,62,62,0.5)" },
  { id: "egg", emoji: "🥚", label: "Egg", splatColor: "rgba(250,230,100,0.5)" },
  { id: "shoe", emoji: "👟", label: "Shoe", splatColor: "rgba(139,92,246,0.4)" },
  { id: "pie", emoji: "🥧", label: "Pie", splatColor: "rgba(245,158,11,0.5)" },
  { id: "poop", emoji: "💩", label: "Poop", splatColor: "rgba(120,80,40,0.5)" },
];

const VENUES: { id: Venue; label: string; emoji: string }[] = [
  { id: "clean", label: "Clean", emoji: "🎵" },
  { id: "neon", label: "Neon", emoji: "💜" },
  { id: "festival", label: "Festival", emoji: "🎪" },
  { id: "basement", label: "Cave", emoji: "🕯️" },
];

const DJ_W = 80; const DJ_H = 100; const STAGE_H = 370;
const HIT_R = 65; const PROJ_SPEED = 0.05;

// ── Audio helpers ──
function playThrow(ctx: AudioContext) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.frequency.setValueAtTime(400, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.08);
  g.gain.setValueAtTime(0.12, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
  o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.08);
}

function playSplat(ctx: AudioContext) {
  const bs = Math.floor(ctx.sampleRate * 0.12);
  const b = ctx.createBuffer(1, bs, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < bs; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / bs);
  const n = ctx.createBufferSource(); n.buffer = b;
  const g = ctx.createGain(); const f = ctx.createBiquadFilter();
  f.type = "lowpass"; f.frequency.value = 600;
  n.connect(f); f.connect(g); g.connect(ctx.destination);
  g.gain.setValueAtTime(0.35, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
  n.start(ctx.currentTime);
}

function playMiss(ctx: AudioContext) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.connect(g); g.connect(ctx.destination);
  o.frequency.setValueAtTime(200, ctx.currentTime);
  o.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.2);
  o.type = "triangle";
  g.gain.setValueAtTime(0.05, ctx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
  o.start(ctx.currentTime); o.stop(ctx.currentTime + 0.2);
}

function startCrappyMusic(ctx: AudioContext): () => void {
  const bpm = 130; const beatLen = 60 / bpm; const barLen = beatLen * 4;
  let stopped = false;
  const mg = ctx.createGain(); mg.gain.value = 0.12; mg.connect(ctx.destination);

  function bar(t: number) {
    if (stopped) return;
    for (let i = 0; i < 4; i++) { // kicks
      const s = t + i * beatLen;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.connect(g); g.connect(mg);
      o.frequency.setValueAtTime(150, s); o.frequency.exponentialRampToValueAtTime(40, s + 0.1);
      g.gain.setValueAtTime(0.8, s); g.gain.exponentialRampToValueAtTime(0.001, s + 0.25);
      o.start(s); o.stop(s + 0.25);
    }
    for (let i = 0; i < 4; i++) { // hihats
      const s = t + i * beatLen + beatLen / 2;
      const bs2 = Math.floor(ctx.sampleRate * 0.04);
      const bf = ctx.createBuffer(1, bs2, ctx.sampleRate); const dd = bf.getChannelData(0);
      for (let j = 0; j < bs2; j++) dd[j] = (Math.random() * 2 - 1);
      const n = ctx.createBufferSource(); n.buffer = bf;
      const fl = ctx.createBiquadFilter(); fl.type = "highpass"; fl.frequency.value = 9000;
      const g = ctx.createGain();
      n.connect(fl); fl.connect(g); g.connect(mg);
      g.gain.setValueAtTime(0.25, s); g.gain.exponentialRampToValueAtTime(0.001, s + 0.04);
      n.start(s);
    }
    [55, 55, 73.42, 65.41].forEach((fr, i) => { // bass
      const s = t + i * beatLen;
      const o = ctx.createOscillator(); const g = ctx.createGain();
      const fl = ctx.createBiquadFilter();
      o.type = "sawtooth"; o.frequency.value = fr;
      fl.type = "lowpass"; fl.frequency.value = 300;
      o.connect(fl); fl.connect(g); g.connect(mg);
      g.gain.setValueAtTime(0.35, s); g.gain.setValueAtTime(0.35, s + beatLen * 0.7);
      g.gain.exponentialRampToValueAtTime(0.001, s + beatLen * 0.9);
      o.start(s); o.stop(s + beatLen);
    });
    [440, 0, 523, 440, 392, 0, 440, 523].forEach((fr, i) => { // annoying lead
      if (!fr) return;
      const s = t + i * (beatLen / 2);
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = "square"; o.frequency.value = fr;
      o.connect(g); g.connect(mg);
      g.gain.setValueAtTime(0.06, s); g.gain.exponentialRampToValueAtTime(0.001, s + beatLen / 2 * 0.8);
      o.start(s); o.stop(s + beatLen / 2);
    });
    setTimeout(() => bar(t + barLen), (barLen - 0.1) * 1000);
  }
  bar(ctx.currentTime + 0.1);
  return () => { stopped = true; mg.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3); };
}

// ── Component ──
export function TomatoToss({ isDark }: TomatoTossProps) {
  const [score, setScore] = useState(0);
  const [hits, setHits] = useState(0);
  const [throws, setThrows] = useState(0);
  const [djX, setDjX] = useState(200);
  const [djY, setDjY] = useState(100);
  const [djHit, setDjHit] = useState(false);
  const [projs, setProjs] = useState<Projectile[]>([]);
  const [splats, setSplats] = useState<Splat[]>([]);
  const [popups, setPopups] = useState<ScorePopup[]>([]);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);
  const [combo, setCombo] = useState(0);
  const [bestCombo, setBestCombo] = useState(0);
  const [bob, setBob] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [ammo, setAmmo] = useState("tomato");
  const [venue, setVenue] = useState<Venue>("clean");
  const [neonPh, setNeonPh] = useState(0);

  const stageRef = useRef<HTMLDivElement>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const animRef = useRef(0);
  const pId = useRef(0); const sId = useRef(0); const ppId = useRef(0);
  const djXR = useRef(200); const djYR = useRef(100);
  const djDxR = useRef(1); const djDyR = useRef(1);
  const djSpR = useRef(1.2); const bobR = useRef(0); const neonR = useRef(0);
  const projR = useRef<Projectile[]>([]); const splatR = useRef<Splat[]>([]); const popR = useRef<ScorePopup[]>([]);
  const scoreR = useRef(0); const hitsR = useRef(0); const throwsR = useRef(0);
  const comboR = useRef(0); const overR = useRef(false);
  const timerR = useRef<ReturnType<typeof setInterval> | null>(null);
  const startR = useRef(false); const ammoR = useRef("tomato");
  const stopMusic = useRef<(() => void) | null>(null);

  useEffect(() => { ammoR.current = ammo; }, [ammo]);

  const c = {
    text: isDark ? "#fff" : "#0F0F10",
    muted: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
    soft: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
    border: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    bg: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
    accent: "rgba(27,16,253,0.7)",
  };

  const getCtx = () => { if (!audioCtx.current) audioCtx.current = new AudioContext(); return audioCtx.current; };

  // ── Game loop ──
  const loop = useCallback(() => {
    if (overR.current) return;
    bobR.current += 0.12; neonR.current += 0.03;
    // Simple linear movement — gentle pace
    djXR.current += djDxR.current * djSpR.current;
    if (djXR.current > 350) djDxR.current = -1;
    if (djXR.current < 20) djDxR.current = 1;
    djYR.current += djDyR.current * djSpR.current * 0.3;
    if (djYR.current > 180) djDyR.current = -1;
    if (djYR.current < 60) djDyR.current = 1;
    // Occasional gentle direction change
    if (Math.random() < 0.015) djDxR.current *= -1;
    if (Math.random() < 0.01) djDyR.current *= -1;

    const np: Projectile[] = [];
    for (const t of projR.current) {
      if (!t.active) continue;
      const prog = t.progress + PROJ_SPEED;
      if (prog >= 1) {
        const cx = djXR.current + DJ_W / 2; const cy = djYR.current + DJ_H / 2;
        const dist = Math.sqrt((t.targetX - cx) ** 2 + (t.targetY - cy) ** 2);
        const ad = PROJECTILES.find(p => p.id === t.type) || PROJECTILES[0];
        if (dist < HIT_R) {
          const pts = 10 + comboR.current * 5;
          scoreR.current += pts; comboR.current++; hitsR.current++;
          setScore(scoreR.current); setCombo(comboR.current); setHits(hitsR.current);
          setBestCombo(b => Math.max(b, comboR.current));
          setDjHit(true); setTimeout(() => setDjHit(false), 250);
          djSpR.current = Math.min(5, djSpR.current + 0.15);
          splatR.current = [...splatR.current, { id: sId.current++, x: cx + (Math.random() - 0.5) * 30, y: cy + (Math.random() - 0.5) * 20, size: 22 + Math.random() * 18, opacity: 1, color: ad.splatColor }];
          popR.current = [...popR.current, { id: ppId.current++, x: t.targetX, y: t.targetY - 20, text: comboR.current > 1 ? `+${pts} x${comboR.current}` : `+${pts}`, opacity: 1 }];
          try { playSplat(getCtx()); } catch {}
        } else {
          comboR.current = 0; setCombo(0);
          splatR.current = [...splatR.current, { id: sId.current++, x: t.targetX, y: t.targetY, size: 14 + Math.random() * 8, opacity: 0.5, color: ad.splatColor }];
          try { playMiss(getCtx()); } catch {}
        }
        continue;
      }
      const px = t.startX + (t.targetX - t.startX) * prog;
      const py = t.startY + (t.targetY - t.startY) * prog + (-120 * Math.sin(prog * Math.PI));
      np.push({ ...t, x: px, y: py, progress: prog });
    }
    projR.current = np;
    splatR.current = splatR.current.map(s => ({ ...s, opacity: s.opacity - 0.006 })).filter(s => s.opacity > 0);
    popR.current = popR.current.map(p => ({ ...p, y: p.y - 0.8, opacity: p.opacity - 0.02 })).filter(p => p.opacity > 0);

    setProjs([...projR.current]); setSplats([...splatR.current]); setPopups([...popR.current]);
    setDjX(djXR.current); setDjY(djYR.current); setBob(bobR.current); setNeonPh(neonR.current);
    animRef.current = requestAnimationFrame(loop);
  }, []);

  const startGame = useCallback(() => {
    scoreR.current = 0; hitsR.current = 0; throwsR.current = 0;
    comboR.current = 0; overR.current = false; djSpR.current = 1.0;
    djXR.current = 200; djDxR.current = 1; djDyR.current = 1;
    startR.current = true; projR.current = []; splatR.current = []; popR.current = [];
    setScore(0); setHits(0); setThrows(0); setCombo(0);
    setGameOver(false); setStarted(true); setProjs([]); setSplats([]); setPopups([]);
    setTimeLeft(30);
    if (stopMusic.current) stopMusic.current();
    stopMusic.current = startCrappyMusic(getCtx());
    animRef.current = requestAnimationFrame(loop);
    if (timerR.current) clearInterval(timerR.current);
    let t = 30;
    timerR.current = setInterval(() => {
      t--; setTimeLeft(t);
      if (t <= 0) {
        overR.current = true; setGameOver(true);
        if (timerR.current) clearInterval(timerR.current);
        if (stopMusic.current) { stopMusic.current(); stopMusic.current = null; }
      }
    }, 1000);
  }, [loop]);

  useEffect(() => () => {
    cancelAnimationFrame(animRef.current);
    if (timerR.current) clearInterval(timerR.current);
    if (stopMusic.current) { stopMusic.current(); stopMusic.current = null; }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (overR.current || !startR.current) return;
    const r = stageRef.current?.getBoundingClientRect(); if (!r) return;
    const cx = e.clientX - r.left; const cy = e.clientY - r.top;
    const sx = r.width / 2 + (Math.random() - 0.5) * 40;
    throwsR.current++; setThrows(throwsR.current);
    projR.current = [...projR.current, { id: pId.current++, x: sx, y: STAGE_H + 10, targetX: cx, targetY: cy, startX: sx, startY: STAGE_H + 10, progress: 0, active: true, type: ammoR.current }];
    setProjs([...projR.current]);
    try { playThrow(getCtx()); } catch {}
  }, []);

  const acc = throws > 0 ? Math.round((hits / throws) * 100) : 0;
  const isNeon = venue === "neon";
  const n1 = `hsl(${(neonPh * 60) % 360}, 100%, 60%)`;
  const n2 = `hsl(${(neonPh * 60 + 120) % 360}, 100%, 60%)`;
  const n3 = `hsl(${(neonPh * 60 + 240) % 360}, 100%, 60%)`;

  // ── Venue backgrounds ──
  const venueBg: Record<Venue, string> = {
    clean: isDark ? "rgba(15,15,20,0.9)" : "rgba(245,243,248,0.9)",
    neon: "rgba(10,5,25,0.95)",
    festival: isDark ? "rgba(20,15,10,0.9)" : "rgba(250,245,235,0.9)",
    basement: isDark ? "rgba(8,6,4,0.95)" : "rgba(235,228,218,0.9)",
  };

  // Hand angle based on bob phase — DJ scratching
  const leftHandAngle = Math.sin(bob * 3) * 30;
  const rightHandAngle = Math.sin(bob * 3 + 1.5) * 25;

  return (
    <div className="w-full max-w-[500px] mx-auto">
      <div className="rounded-[16px] p-[24px]" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-[8px]">
          <div className="flex items-center gap-[12px]">
            <span style={{ fontSize: 14, fontWeight: 700, color: c.text }}>{score}</span>
            {combo >= 2 && <span style={{ fontSize: 12, color: "#F59E0B", fontWeight: 600 }}>x{combo} 🔥</span>}
          </div>
          <div className="flex items-center gap-[12px]">
            {started && !gameOver && <span style={{ fontSize: 14, fontWeight: 700, color: timeLeft <= 5 ? "#F43F5E" : c.text }}>{timeLeft}s</span>}
            <span style={{ fontSize: 12, color: c.muted }}>{hits}/{throws}</span>
          </div>
        </div>

        {/* Controls row: ammo + venue */}
        <div className="flex items-center justify-between mb-[8px]">
          <div className="flex items-center gap-[3px]">
            {PROJECTILES.map(p => (
              <button key={p.id} onClick={() => setAmmo(p.id)}
                className="rounded-[6px] px-[6px] py-[3px] transition-all"
                style={{
                  fontSize: 16,
                  backgroundColor: ammo === p.id ? (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)") : "transparent",
                  border: `1px solid ${ammo === p.id ? c.border : "transparent"}`,
                  transform: ammo === p.id ? "scale(1.15)" : "scale(1)",
                }}>
                {p.emoji}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-[3px]">
            {VENUES.map(v => (
              <button key={v.id} onClick={() => setVenue(v.id)}
                className="rounded-[6px] px-[6px] py-[3px] transition-all"
                style={{
                  fontSize: 12,
                  color: venue === v.id ? c.text : c.muted,
                  backgroundColor: venue === v.id ? (isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)") : "transparent",
                  border: `1px solid ${venue === v.id ? c.border : "transparent"}`,
                }}>
                {v.emoji}
              </button>
            ))}
          </div>
        </div>

        {/* Stage */}
        <div ref={stageRef} onClick={handleClick}
          className="relative overflow-hidden rounded-[12px] select-none"
          style={{ height: STAGE_H, backgroundColor: venueBg[venue], border: `1px solid ${c.border}`, cursor: started && !gameOver ? "crosshair" : "default" }}>

          {/* ── Venue decorations ── */}
          {isNeon && <>
            {/* Neon ceiling strips */}
            {[10, 30, 50, 70, 90].map((pct, i) => (
              <div key={i} style={{
                position: "absolute", top: 0, left: `${pct}%`, width: 36, height: 3, borderRadius: 2, transform: "translateX(-50%)",
                backgroundColor: [n1, n2, n3, n1, n2][i],
                boxShadow: `0 0 12px ${[n1, n2, n3, n1, n2][i]}, 0 0 25px ${[n1, n2, n3, n1, n2][i]}50`,
                opacity: 0.5 + Math.sin(neonPh * 3 + i) * 0.4,
              }} />
            ))}
            {/* Neon floor */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 2, background: `linear-gradient(to right, ${n1}, ${n2}, ${n3})`, opacity: 0.4 }} />
            {/* Neon glow */}
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: `inset 0 0 40px ${n1}12, inset 0 0 80px ${n2}08`, borderRadius: 12 }} />
          </>}

          {venue === "festival" && <>
            {/* Bunting / flags */}
            {[15, 30, 45, 60, 75, 85].map((pct, i) => (
              <div key={i} style={{
                position: "absolute", top: 8 + (i % 2) * 4, left: `${pct}%`,
                width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
                borderTop: `10px solid ${["#F43F5E", "#F59E0B", "#10B981", "#0EA5E9", "#8B5CF6", "#F97316"][i]}`,
                opacity: 0.5,
              }} />
            ))}
            {/* String */}
            <div style={{ position: "absolute", top: 8, left: "10%", right: "10%", height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)" }} />
          </>}

          {venue === "basement" && <>
            {/* Dim light from above */}
            <div style={{ position: "absolute", top: 0, left: "50%", width: 80, height: 150, transform: "translateX(-50%)",
              background: `radial-gradient(ellipse at top, ${isDark ? "rgba(255,200,100,0.08)" : "rgba(200,150,50,0.06)"}, transparent)` }} />
            {/* Pipes on ceiling */}
            <div style={{ position: "absolute", top: 6, left: "20%", right: "30%", height: 3, borderRadius: 2, backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)" }} />
            <div style={{ position: "absolute", top: 14, left: "40%", right: "15%", height: 2, borderRadius: 1, backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)" }} />
          </>}

          {/* ── Club elements (all venues) ── */}

          {/* Speakers — left & right stacks */}
          {[true, false].map((isLeft, i) => (
            <div key={i} style={{
              position: "absolute", bottom: 45,
              ...(isLeft ? { left: 8 } : { right: 8 }),
            }}>
              {/* Big speaker */}
              <div style={{
                width: 36, height: 52, borderRadius: 6,
                backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                border: `1px solid ${c.border}`,
                position: "relative",
              }}>
                {/* Woofer */}
                <div style={{
                  position: "absolute", top: 6, left: 5, width: 26, height: 26, borderRadius: "50%",
                  border: `2px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.06)"}`,
                  backgroundColor: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.01)",
                }}>
                  <div style={{ position: "absolute", top: "50%", left: "50%", width: 10, height: 10, borderRadius: "50%", transform: "translate(-50%, -50%)",
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)" }} />
                </div>
                {/* Tweeter */}
                <div style={{
                  position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)",
                  width: 12, height: 12, borderRadius: "50%",
                  border: `1.5px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.05)"}`,
                }} />
              </div>
              {/* Small monitor on top */}
              <div style={{
                width: 28, height: 22, borderRadius: 4, marginTop: 3, marginLeft: 4,
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                border: `1px solid ${c.border}`,
              }}>
                <div style={{ position: "absolute", top: 4, left: 5, width: 18, height: 14, borderRadius: "50%",
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"}` }} />
              </div>
            </div>
          ))}

          {/* Disco ball */}
          <div style={{
            position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)",
          }}>
            {/* String */}
            <div style={{ width: 1, height: 10, backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.08)", margin: "0 auto" }} />
            {/* Ball */}
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: isDark
                ? "radial-gradient(circle at 35% 35%, rgba(255,255,255,0.25), rgba(255,255,255,0.08))"
                : "radial-gradient(circle at 35% 35%, rgba(200,200,200,0.5), rgba(150,150,150,0.2))",
              boxShadow: isNeon ? `0 0 15px ${n2}40, 0 0 30px ${n1}20` : `0 0 8px ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)"}`,
              position: "relative",
            }}>
              {/* Mirror facets */}
              {[0, 45, 90, 135, 180, 225, 270, 315].map(a => (
                <div key={a} style={{
                  position: "absolute", top: "50%", left: "50%", width: 3, height: 3,
                  backgroundColor: isDark ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.7)",
                  transform: `translate(-50%, -50%) translate(${Math.cos((a + bob * 30) * Math.PI / 180) * 7}px, ${Math.sin((a + bob * 30) * Math.PI / 180) * 7}px)`,
                  borderRadius: 1,
                }} />
              ))}
            </div>
            {/* Light reflections from disco ball */}
            {(venue === "neon" || venue === "clean") && [0, 1, 2, 3].map(i => {
              const angle = (bob * 40 + i * 90) * Math.PI / 180;
              const dist = 60 + i * 20;
              return (
                <div key={i} style={{
                  position: "absolute", top: 22, left: 11,
                  width: 4, height: 4, borderRadius: "50%",
                  backgroundColor: isNeon ? n1 : isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
                  transform: `translate(${Math.cos(angle) * dist}px, ${Math.sin(angle) * dist * 0.5 + 30}px)`,
                  opacity: 0.4,
                }} />
              );
            })}
          </div>

          {/* Floor */}
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 45,
            background: isDark ? "linear-gradient(to top, rgba(255,255,255,0.03), transparent)" : "linear-gradient(to top, rgba(0,0,0,0.02), transparent)" }} />

          {/* ── DJ CHARACTER — abstract style ── */}
          <div style={{
            position: "absolute", left: djX, top: djY, width: DJ_W, height: DJ_H,
            transform: djHit ? "scale(0.85) rotate(-8deg)" : undefined,
            transition: djHit ? "transform 0.1s" : "transform 0.15s",
          }}>
            {/* Body — rounded rectangle, black */}
            <div style={{
              position: "absolute", bottom: 8, left: 16, right: 16,
              height: 46, borderRadius: 12,
              backgroundColor: djHit ? "#F43F5E" : isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)",
              transition: "background-color 0.15s",
            }} />

            {/* Head — circle */}
            <div style={{
              position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
              width: 34, height: 34, borderRadius: "50%",
              backgroundColor: djHit ? "#F43F5E" : isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
              transition: "background-color 0.15s",
            }}>
              {/* Headphones arc */}
              <div style={{
                position: "absolute", top: 6, left: -4, width: 42, height: 16,
                borderRadius: 12,
                border: `2.5px solid ${isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)"}`,
                borderBottom: "none",
              }} />
              {/* Headphone pads */}
              <div style={{ position: "absolute", top: 12, left: -6, width: 7, height: 10, borderRadius: 3, backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }} />
              <div style={{ position: "absolute", top: 12, right: -6, width: 7, height: 10, borderRadius: 3, backgroundColor: isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)" }} />

              {/* Eyes — dots, or X when hit */}
              {djHit ? (
                <>
                  <div style={{ position: "absolute", top: 14, left: 8, fontSize: 7, color: "#fff", lineHeight: 1 }}>✕</div>
                  <div style={{ position: "absolute", top: 14, right: 8, fontSize: 7, color: "#fff", lineHeight: 1 }}>✕</div>
                </>
              ) : (
                <>
                  <div style={{ position: "absolute", top: 16, left: 10, width: 4, height: 4, borderRadius: "50%", backgroundColor: c.text }} />
                  <div style={{ position: "absolute", top: 16, right: 10, width: 4, height: 4, borderRadius: "50%", backgroundColor: c.text }} />
                </>
              )}

              {/* Mouth — line or open when hit */}
              {djHit ? (
                <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", width: 10, height: 6, borderRadius: "0 0 5px 5px", backgroundColor: "#fff" }} />
              ) : (
                <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", width: 8, height: 2, borderRadius: 1, backgroundColor: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)" }} />
              )}
            </div>

            {/* Left arm — simple rounded bar, scratching */}
            <div style={{
              position: "absolute", top: 36, left: 4, width: 10, height: 28,
              borderRadius: 5,
              backgroundColor: djHit ? "#F43F5E" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
              transform: `rotate(${leftHandAngle}deg)`,
              transformOrigin: "top center",
            }} />

            {/* Right arm */}
            <div style={{
              position: "absolute", top: 36, right: 4, width: 10, height: 28,
              borderRadius: 5,
              backgroundColor: djHit ? "#F43F5E" : isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)",
              transform: `rotate(${rightHandAngle}deg)`,
              transformOrigin: "top center",
            }} />

            {/* DJ Table — simple rectangle with circles */}
            <div style={{
              position: "absolute", bottom: -14, left: -16, right: -16, height: 20,
              borderRadius: 5,
              backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
              border: `1px solid ${c.border}`,
            }}>
              {/* Turntables — simple circles */}
              <div style={{
                position: "absolute", top: 3, left: 10, width: 14, height: 14, borderRadius: "50%",
                border: `1.5px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
              }}>
                <div style={{ position: "absolute", top: "50%", left: "50%", width: 3, height: 3, borderRadius: "50%", transform: `translate(-50%, -50%) rotate(${bob * 50}deg)`,
                  backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)" }} />
              </div>
              <div style={{
                position: "absolute", top: 3, right: 10, width: 14, height: 14, borderRadius: "50%",
                border: `1.5px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)"}`,
              }}>
                <div style={{ position: "absolute", top: "50%", left: "50%", width: 3, height: 3, borderRadius: "50%", transform: `translate(-50%, -50%) rotate(${bob * 50 + 90}deg)`,
                  backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.12)" }} />
              </div>
              {/* Mixer dots */}
              <div style={{ position: "absolute", top: 7, left: "50%", transform: "translateX(-50%)", display: "flex", gap: 3 }}>
                {[0, 1, 2].map(k => <div key={k} style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.08)" }} />)}
              </div>
            </div>
          </div>

          {/* Splats */}
          {splats.map(s => (
            <div key={s.id} style={{ position: "absolute", left: s.x - s.size / 2, top: s.y - s.size / 2, width: s.size, height: s.size, opacity: s.opacity, pointerEvents: "none" }}>
              <div style={{ width: "100%", height: "100%", borderRadius: "45% 55% 50% 50%", backgroundColor: s.color }} />
              {[30, 110, 190, 280].map(a => (
                <div key={a} style={{ position: "absolute", top: "50%", left: "50%", width: 4, height: 4, borderRadius: "50%", backgroundColor: s.color,
                  transform: `translate(-50%, -50%) translate(${Math.cos(a * Math.PI / 180) * s.size * 0.7}px, ${Math.sin(a * Math.PI / 180) * s.size * 0.6}px)` }} />
              ))}
            </div>
          ))}

          {/* Projectiles in flight */}
          {projs.map(t => (
            <div key={t.id} style={{ position: "absolute", left: t.x - 14, top: t.y - 14, width: 28, height: 28,
              transform: `rotate(${t.progress * 720}deg)`, pointerEvents: "none", fontSize: 22, lineHeight: 1, textAlign: "center" }}>
              {(PROJECTILES.find(p => p.id === t.type) || PROJECTILES[0]).emoji}
            </div>
          ))}

          {/* Score popups */}
          {popups.map(p => (
            <div key={p.id} style={{ position: "absolute", left: p.x, top: p.y, transform: "translateX(-50%)",
              fontSize: 15, fontWeight: 800, color: "#F59E0B", opacity: p.opacity, pointerEvents: "none",
              textShadow: "0 1px 6px rgba(0,0,0,0.5)" }}>{p.text}</div>
          ))}

          {/* Start overlay */}
          {!started && (
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.6)" }}>
              <p style={{ fontSize: 32, fontWeight: 800, color: c.text, marginBottom: 4 }}>🍅 Tomato Toss</p>
              <p style={{ fontSize: 13, color: c.soft, marginBottom: 20 }}>Throw stuff at the crappy DJ!</p>
              <button onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="rounded-[10px] px-[24px] py-[10px] text-white transition-all hover:opacity-90"
                style={{ fontSize: 14, fontWeight: 600, backgroundColor: c.accent }}>
                Start (30s)
              </button>
            </div>
          )}

          {/* Game over */}
          {gameOver && (
            <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ backgroundColor: isDark ? "rgba(0,0,0,0.6)" : "rgba(255,255,255,0.7)" }}>
              <p style={{ fontSize: 32, fontWeight: 800, color: c.text }}>
                {score >= 300 ? "🎯 SNIPER!" : score >= 150 ? "👏 Pas mal!" : score >= 70 ? "🤷 Mouais" : "😂 Il danse mieux que toi"}
              </p>
              <p style={{ fontSize: 20, fontWeight: 700, color: c.text, marginTop: 8 }}>{score} pts</p>
              <div className="flex items-center gap-[16px] mt-[8px]">
                <span style={{ fontSize: 13, color: c.soft }}>{hits}/{throws}</span>
                <span style={{ fontSize: 13, color: c.soft }}>{acc}%</span>
                {bestCombo >= 2 && <span style={{ fontSize: 13, color: "#F59E0B" }}>Best: x{bestCombo}</span>}
              </div>
              <button onClick={(e) => { e.stopPropagation(); startGame(); }}
                className="mt-[16px] rounded-[10px] px-[20px] py-[8px] text-white transition-all hover:opacity-90"
                style={{ fontSize: 13, fontWeight: 600, backgroundColor: c.accent }}>
                Rejouer
              </button>
            </div>
          )}
        </div>

        <p style={{ fontSize: 11, color: c.muted, marginTop: 10, textAlign: "center" }}>
          {started && !gameOver ? "More hits = faster DJ — chain combos!" : "30s, max score. Pick ammo & venue above."}
        </p>
      </div>
    </div>
  );
}
