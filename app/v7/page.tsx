"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Logo } from "@/components/website/logo";
import { Footer } from "@/components/website/footer";
import { FAQ } from "@/components/website/faq";
import { fonts, stemColors } from "@/components/website/theme";
import { HeroDemo } from "@/components/website/hero-demo";
import {
  RiEqualizerFill,
  RiCpuFill,
  RiFlashlightFill,
  RiStackFill,
  RiLinkM,
  RiSoundModuleFill,
} from "@remixicon/react";

// ─── Design tokens ──────────────────────────────────────────
const C = {
  bg: "#FFFFFF",          // main background = white
  bgAlt: "#F3F3F3",       // neutral light gray — clean alternation
  bgCard: "#F5F5F5",      // cards on white bg
  text: "#000000",
  textLight: "#333333",   // body text — dark, not gray (charter)
  textMuted: "#666666",   // labels, metadata (charter)
  accent: "#1B10FD",      // 44Stems brand blue (original)
  accentHover: "#0E08D8",
} as const;

// ─── Shared ─────────────────────────────────────────────────
function Container({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px", ...style }}>
      {children}
    </div>
  );
}

function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
      style={style}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <span
      style={{
        fontFamily: fonts.body,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: C.textMuted,
      }}
    >
      {children}
    </span>
  );
}

// (AppPreview removed — now using HeroDemo from components/website/hero-demo.tsx)

// ─── Header ─────────────────────────────────────────────────
function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        height: 56,
        display: "flex",
        alignItems: "center",
        backgroundColor: scrolled ? "rgba(255,255,255,0.92)" : C.bg,
        backdropFilter: scrolled ? "blur(20px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid #E0E0E0" : "1px solid transparent",
        transition: "all 0.25s ease",
      }}
    >
      <Container style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 48 }}>
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center" }}>
            <Logo size="xl" color={C.text} monochrome />
          </a>
          <nav style={{ display: "flex", alignItems: "center", gap: 28 }}>
            {[
              { label: "Product", href: "#features" },
              { label: "Pricing", href: "#pricing" },
              { label: "API", href: "#" },
            ].map(({ label, href }) => (
              <NavLink key={label} label={label} href={href} />
            ))}
          </nav>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <a
            href="/signin"
            style={{
              fontFamily: fonts.body, fontSize: 14, fontWeight: 500, color: C.text,
              textDecoration: "none", padding: "0 12px", height: 36,
              display: "inline-flex", alignItems: "center",
            }}
          >
            Log in
          </a>
          <HeaderCTA />
        </div>
      </Container>
    </header>
  );
}

function NavLink({ label, href }: { label: string; href: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: fonts.body, fontSize: 14, fontWeight: 500,
        color: hovered ? C.text : C.textLight,
        textDecoration: "none", transition: "color 0.15s",
      }}
    >
      {label}
    </a>
  );
}

function HeaderCTA() {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="/app"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: fonts.body, fontSize: 14, fontWeight: 500, color: "#FFFFFF",
        backgroundColor: hovered ? C.accentHover : C.accent,
        textDecoration: "none", padding: "0 20px", height: 36,
        display: "inline-flex", alignItems: "center",
        transition: "background-color 0.15s",
      }}
    >
      Get Started
    </a>
  );
}

// ─── Hero ───────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ backgroundColor: C.bg, padding: "100px 0 0" }}>
      <Container>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "end" }}>
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: fonts.heading, fontSize: 56, fontWeight: 700,
                lineHeight: 1.08, letterSpacing: "-0.02em", color: C.text, margin: 0,
              }}
            >
              Split any track.
              <br />
              Hear every stem.
            </motion.h1>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: fonts.body, fontSize: 16, fontWeight: 400, lineHeight: 1.6,
              color: C.text, margin: 0,
            }}
          >
            Studio-grade AI separation for producers. Vocals, drums, bass, guitar,
            piano — isolated in seconds.
          </motion.p>
        </div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginTop: 40, display: "flex", gap: 12 }}
        >
          <HeroCTA label="Get Started Free" variant="primary" href="/app" />
          <HeroCTA label="See Pricing" variant="secondary" href="#pricing" />
        </motion.div>

        {/* Product preview — pixel-perfect coded UI mock */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginTop: 64 }}
        >
          <div style={{ overflow: "hidden" }}>
            <div style={{
              transform: "scale(0.85)",
              transformOrigin: "top center",
              marginBottom: -100,
            }}>
              <HeroDemo />
            </div>
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

function HeroCTA({ label, variant, href }: { label: string; variant: "primary" | "secondary"; href: string }) {
  const [hovered, setHovered] = useState(false);
  const isPrimary = variant === "primary";
  return (
    <a
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: fonts.body, fontSize: 15, fontWeight: 500,
        color: isPrimary ? "#FFFFFF" : C.text,
        backgroundColor: isPrimary ? (hovered ? C.accentHover : C.accent) : (hovered ? "#E8E8E8" : "#F0F0F0"),
        textDecoration: "none", padding: "0 28px", height: 48,
        display: "inline-flex", alignItems: "center",
        transition: "background-color 0.15s",
      }}
    >
      {label}
    </a>
  );
}

// ─── Trust Bar ──────────────────────────────────────────────
const DAWS = [
  { name: "Ableton", src: "/logos/ableton.svg", h: 18 },
  { name: "FL Studio", src: "/logos/flstudio.webp", h: 80 },
  { name: "Logic Pro X", src: "/logos/logicpro.jpg", h: 22 },
  { name: "Pro Tools", src: "/logos/protools.svg", h: 24 },
  { name: "Cubase", src: "/logos/cubase.svg", h: 22 },
  { name: "Studio One", src: "/logos/studioone.jpeg", h: 26 },
  { name: "Reaper", src: "/logos/reaper.svg", h: 18 },
  { name: "Bitwig", src: "/logos/bitwig.png", h: 40 },
];

function TrustBar() {
  return (
    <section style={{ backgroundColor: C.bg, padding: "56px 0" }}>
      <Container>
        <FadeIn>
          <p style={{
            fontFamily: fonts.body, fontSize: 14, fontWeight: 400, color: C.textMuted,
            textAlign: "center", margin: "0 0 24px",
          }}>
            Built for producers using
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 2 }}>
            {DAWS.map((d) => (
              <div
                key={d.name}
                style={{
                  backgroundColor: C.bgAlt,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  padding: "20px 16px", minHeight: 100,
                }}
              >
                <img
                  src={d.src}
                  alt={d.name}
                  style={{ height: d.h, maxWidth: "100%", objectFit: "contain", opacity: 0.6, filter: "grayscale(1)", mixBlendMode: "multiply" as const }}
                />
              </div>
            ))}
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}

// ─── Features ───────────────────────────────────────────────
const FEATURES = [
  { color: stemColors.vocals, title: "6-Stem Separation", desc: "Vocals, drums, bass, guitar, piano, and other. Every element fully isolated at studio quality.", icon: RiEqualizerFill },
  { color: stemColors.drums, title: "SOTA AI Models", desc: "MelBand RoFormer + BS-RoFormer. The highest-rated open-source separation models, running on our cloud.", icon: RiCpuFill },
  { color: stemColors.bass, title: "H100 GPU Speed", desc: "Full track processed in under 40 seconds. LALAL.AI takes 58s. Moises takes 75s. We're faster.", icon: RiFlashlightFill },
  { color: stemColors.guitar, title: "Batch Processing", desc: "Upload an entire album. Process multiple tracks simultaneously in the background while you work.", icon: RiStackFill },
  { color: stemColors.piano, title: "URL Import", desc: "Paste a YouTube, SoundCloud, or Spotify URL. No file download needed. We handle the rest.", icon: RiLinkM },
  { color: stemColors.other, title: "WAV 24-Bit Output", desc: "Lossless studio quality output. Every stem at full resolution, ready for mixing in your DAW.", icon: RiSoundModuleFill },
];

function FeatureCard({ feature, index }: { feature: typeof FEATURES[number]; index: number }) {
  const [hovered, setHovered] = useState(false);
  const Icon = feature.icon;

  return (
    <FadeIn delay={index * 0.06}>
      <motion.div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        animate={{
          backgroundColor: hovered ? feature.color : C.bgCard,
        }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{
          padding: "40px 32px",
          cursor: "default",
          minHeight: 220,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <motion.div
          animate={{ color: hovered ? "#FFFFFF" : feature.color }}
          transition={{ duration: 0.3 }}
          style={{ marginBottom: 24 }}
        >
          <Icon size={28} />
        </motion.div>

        <motion.h3
          animate={{ color: hovered ? "#FFFFFF" : C.text }}
          transition={{ duration: 0.3 }}
          style={{
            fontFamily: fonts.heading, fontSize: 16, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.04em",
            margin: "0 0 12px",
          }}
        >
          {feature.title}
        </motion.h3>

        <motion.p
          animate={{ color: hovered ? "#FFFFFF" : C.textLight }}
          transition={{ duration: 0.3 }}
          style={{
            fontFamily: fonts.body, fontSize: 14, fontWeight: 400, lineHeight: 1.6, margin: 0,
          }}
        >
          {feature.desc}
        </motion.p>
      </motion.div>
    </FadeIn>
  );
}

function Features() {
  return (
    <section id="features" style={{ backgroundColor: C.bg, padding: "120px 0" }}>
      <Container>
        <FadeIn>
          <div style={{ marginBottom: 64 }}>
            <SectionLabel>Features</SectionLabel>
            <h2 style={{
              fontFamily: fonts.heading, fontSize: 48, fontWeight: 700,
              lineHeight: 1.08, letterSpacing: "-0.02em", color: C.text,
              margin: "16px 0 0",
            }}>
              Built for producers. Not for everyone.
            </h2>
            <p style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 400, lineHeight: 1.6, color: "#777777", margin: "12px 0 0", maxWidth: 520 }}>
              State-of-the-art AI models running on H100 GPUs. Six isolated stems,
              studio-quality output, and the fastest processing in the industry.
            </p>
          </div>
        </FadeIn>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, backgroundColor: C.bg }}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </Container>
    </section>
  );
}

// ─── How It Works ───────────────────────────────────────────
const STEPS = [
  { num: "01", title: "Upload", desc: "Drag and drop a file, select a folder, or paste a URL. MP3, WAV, FLAC — up to 200 MB.", color: stemColors.vocals },
  { num: "02", title: "Process", desc: "H100 GPU runs MelBand RoFormer and BS-RoFormer simultaneously. Two best models. One pass.", color: stemColors.drums },
  { num: "03", title: "Download", desc: "Clean isolated stems in WAV 24-bit or MP3 320kbps. Download individually or as ZIP.", color: stemColors.bass },
];

function HowItWorks() {
  return (
    <section style={{ backgroundColor: C.bgAlt, padding: "120px 0" }}>
      <Container>
        <FadeIn>
          <div style={{ marginBottom: 64 }}>
            <SectionLabel>Process</SectionLabel>
            <h2 style={{
              fontFamily: fonts.heading, fontSize: 48, fontWeight: 700,
              lineHeight: 1.08, letterSpacing: "-0.02em", color: C.text,
              margin: "16px 0 0",
            }}>
              Three steps. Zero friction.
            </h2>
            <p style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 400, lineHeight: 1.6, color: "#777777", margin: "12px 0 0", maxWidth: 520 }}>
              Upload, pick your stem count, download. No account required to try.
              Start separating in under a minute.
            </p>
          </div>
        </FadeIn>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
          {STEPS.map((step, i) => (
            <StepCard key={step.num} step={step} index={i} />
          ))}
        </div>
      </Container>
    </section>
  );
}

function StepCard({ step, index }: { step: typeof STEPS[number]; index: number }) {
  const [hovered, setHovered] = useState(false);

  return (
    <FadeIn delay={index * 0.1}>
      <motion.div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        animate={{ backgroundColor: hovered ? step.color : "#FFFFFF" }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ padding: "40px 36px", cursor: "default", minHeight: 280, display: "flex", flexDirection: "column" }}
      >
        <motion.span
          animate={{ color: hovered ? "#FFFFFF" : step.color }}
          transition={{ duration: 0.3 }}
          style={{
            fontFamily: fonts.heading, fontSize: 80, fontWeight: 700,
            lineHeight: 1, display: "block", marginBottom: 32,
          }}
        >
          {step.num}
        </motion.span>
        <motion.h3
          animate={{ color: hovered ? "#FFFFFF" : C.text }}
          transition={{ duration: 0.3 }}
          style={{
            fontFamily: fonts.heading, fontSize: 16, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 12px",
          }}
        >
          {step.title}
        </motion.h3>
        <motion.p
          animate={{ color: hovered ? "#FFFFFF" : C.textLight }}
          transition={{ duration: 0.3 }}
          style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 400, margin: 0, lineHeight: 1.6 }}
        >
          {step.desc}
        </motion.p>
      </motion.div>
    </FadeIn>
  );
}

// ─── Speed / Processing ─────────────────────────────────────
function Processing() {
  return (
    <section style={{ backgroundColor: C.bg, padding: "120px 0" }}>
      <Container>
        <FadeIn>
          <div style={{ marginBottom: 64 }}>
            <SectionLabel>Speed</SectionLabel>
            <h2 style={{
              fontFamily: fonts.heading, fontSize: 48, fontWeight: 700,
              lineHeight: 1.08, letterSpacing: "-0.02em", color: C.text,
              margin: "16px 0 0",
            }}>
              Fast enough to not think about it.
            </h2>
            <p style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 400, lineHeight: 1.6, color: "#777777", margin: "12px 0 0", maxWidth: 520 }}>
              LALAL.AI takes ~58s. Moises takes ~75s. We run on H100 GPUs and finish
              in under 40 seconds. The benchmark is real.
            </p>
          </div>
        </FadeIn>

        {/* Big number + specs row — Cursor-style clean */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          {/* Left: big hero stat */}
          <FadeIn delay={0.1}>
            <div style={{ backgroundColor: "#FFFFFF", padding: "56px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <motion.span
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                style={{ fontFamily: fonts.heading, fontSize: 96, fontWeight: 700, lineHeight: 1, color: C.text }}
              >
                &lt;40s
              </motion.span>
              <span style={{ fontFamily: fonts.body, fontSize: 14, color: "#999999", marginTop: 12 }}>
                Average separation time for a full track
              </span>
            </div>
          </FadeIn>

          {/* Right: clean spec list */}
          <FadeIn delay={0.2}>
            <div style={{ backgroundColor: "#FFFFFF", padding: "40px 40px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              {[
                { label: "GPU", value: "NVIDIA H100 80GB" },
                { label: "Stems", value: "Up to 6" },
                { label: "Input", value: "MP3, WAV, FLAC, AAC" },
                { label: "Output", value: "WAV 24-bit / MP3 320" },
                { label: "Max size", value: "200 MB" },
              ].map((row, i) => (
                <div key={row.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "14px 0",
                  borderBottom: i < 4 ? "1px solid #F0F0F0" : "none",
                }}>
                  <span style={{ fontFamily: fonts.body, fontSize: 14, color: "#999999" }}>{row.label}</span>
                  <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 500, color: C.text }}>{row.value}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}

// ── Speed A (unused)
function _SpeedA() {
  const stats = [
    { value: "<40s", label: "Separation time", sub: "Full track, 6 stems", color: stemColors.vocals },
    { value: "H100", label: "NVIDIA GPU", sub: "80GB VRAM dedicated", color: stemColors.drums },
    { value: "24-bit", label: "Output quality", sub: "WAV lossless or MP3 320", color: stemColors.bass },
  ];
  const specs = [
    { value: "6", label: "Max stems", color: stemColors.guitar },
    { value: "200 MB", label: "Max file size", color: stemColors.piano },
    { value: "MP3 · WAV · FLAC · AAC", label: "Input formats", color: stemColors.other },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Top row: 3 big colored blocks */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
        {stats.map((s, i) => {
          const [hovered, setHovered] = useState(false);
          return (
            <FadeIn key={s.label} delay={i * 0.08}>
              <motion.div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                animate={{ backgroundColor: hovered ? C.text : s.color }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ padding: "44px 36px", cursor: "default", minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
              >
                <span style={{ fontFamily: fonts.heading, fontSize: 64, fontWeight: 700, lineHeight: 1, color: "#FFFFFF", marginBottom: 16 }}>
                  {s.value}
                </span>
                <span style={{ fontFamily: fonts.heading, fontSize: 15, fontWeight: 700, color: "#FFFFFF", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {s.label}
                </span>
                <span style={{ fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>
                  {s.sub}
                </span>
              </motion.div>
            </FadeIn>
          );
        })}
      </div>
      {/* Bottom row: 3 white spec blocks */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
        {specs.map((s, i) => {
          const [hovered, setHovered] = useState(false);
          return (
            <FadeIn key={s.label} delay={0.3 + i * 0.06}>
              <motion.div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                animate={{ backgroundColor: hovered ? s.color : "#FFFFFF" }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ padding: "32px 36px", cursor: "default" }}
              >
                <motion.span
                  animate={{ color: hovered ? "#FFFFFF" : s.color }}
                  transition={{ duration: 0.3 }}
                  style={{ fontFamily: fonts.heading, fontSize: 28, fontWeight: 700, lineHeight: 1, display: "block", marginBottom: 8 }}
                >
                  {s.value}
                </motion.span>
                <motion.span
                  animate={{ color: hovered ? "rgba(255,255,255,0.8)" : C.textMuted }}
                  transition={{ duration: 0.3 }}
                  style={{ fontFamily: fonts.body, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}
                >
                  {s.label}
                </motion.span>
              </motion.div>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}

// ── Speed B: Animated comparison bars + horizontal spec row
function SpeedB() {
  const competitors = [
    { name: "Moises", time: 75, color: "#D0D0D0" },
    { name: "LALAL.AI", time: 58, color: "#D0D0D0" },
    { name: "44Stems", time: 38, color: stemColors.vocals, highlight: true },
  ];
  const specs = [
    { label: "GPU", value: "H100 80GB" },
    { label: "Stems", value: "Up to 6" },
    { label: "Formats", value: "MP3 · WAV · FLAC" },
    { label: "Quality", value: "24-bit / 320kbps" },
    { label: "Max size", value: "200 MB" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Comparison bars */}
      <FadeIn>
        <div style={{ backgroundColor: "#FFFFFF", padding: "48px 40px" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {competitors.map((c, i) => (
              <div key={c.name}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                  <span style={{
                    fontFamily: fonts.heading, fontSize: c.highlight ? 18 : 15,
                    fontWeight: c.highlight ? 700 : 400, color: C.text,
                  }}>
                    {c.name}
                  </span>
                  <span style={{
                    fontFamily: fonts.heading, fontSize: c.highlight ? 32 : 20,
                    fontWeight: 700, color: c.highlight ? c.color : C.textMuted,
                  }}>
                    {c.time}s
                  </span>
                </div>
                <div style={{ height: c.highlight ? 10 : 6, backgroundColor: C.bgAlt, overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${(c.time / 80) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1.2, delay: 0.2 + i * 0.2, ease: [0.22, 1, 0.36, 1] }}
                    style={{ height: "100%", backgroundColor: c.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </FadeIn>

      {/* Horizontal spec strip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2 }}>
        {specs.map((s, i) => (
          <FadeIn key={s.label} delay={0.4 + i * 0.05}>
            <div style={{ backgroundColor: "#FFFFFF", padding: "24px 20px" }}>
              <div style={{ fontFamily: fonts.body, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>
                {s.label}
              </div>
              <div style={{ fontFamily: fonts.heading, fontSize: 15, fontWeight: 700, color: C.text }}>
                {s.value}
              </div>
            </div>
          </FadeIn>
        ))}
      </div>
    </div>
  );
}

// ── Speed C: Dark premium block with big centered number + white spec grid
function SpeedC() {
  const specs = [
    { label: "GPU", value: "H100 80GB", color: stemColors.vocals },
    { label: "Stems", value: "Up to 6", color: stemColors.drums },
    { label: "Input", value: "MP3 · WAV · FLAC · AAC", color: stemColors.bass },
    { label: "Output", value: "WAV 24-bit / MP3 320", color: stemColors.guitar },
    { label: "Max size", value: "200 MB", color: stemColors.piano },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* Big dark hero block */}
      <FadeIn>
        <div style={{
          backgroundColor: "#1A1A1A", padding: "72px 40px", textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            style={{ fontFamily: fonts.heading, fontSize: 96, fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}
          >
            &lt;40s
          </motion.span>
          <span style={{ fontFamily: fonts.body, fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 16, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Average separation time · H100 GPU
          </span>
          {/* Competitor comparison line */}
          <div style={{ display: "flex", gap: 32, marginTop: 24 }}>
            <span style={{ fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
              LALAL.AI ~58s
            </span>
            <span style={{ fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
              Moises ~75s
            </span>
          </div>
        </div>
      </FadeIn>

      {/* Spec grid below */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2 }}>
        {specs.map((s, i) => {
          const [hovered, setHovered] = useState(false);
          return (
            <FadeIn key={s.label} delay={0.3 + i * 0.06}>
              <motion.div
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                animate={{ backgroundColor: hovered ? s.color : "#FFFFFF" }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ padding: "28px 20px", cursor: "default" }}
              >
                <motion.span
                  animate={{ color: hovered ? "rgba(255,255,255,0.7)" : C.textMuted }}
                  transition={{ duration: 0.3 }}
                  style={{ fontFamily: fonts.body, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}
                >
                  {s.label}
                </motion.span>
                <motion.span
                  animate={{ color: hovered ? "#FFFFFF" : C.text }}
                  transition={{ duration: 0.3 }}
                  style={{ fontFamily: fonts.heading, fontSize: 15, fontWeight: 700 }}
                >
                  {s.value}
                </motion.span>
              </motion.div>
            </FadeIn>
          );
        })}
      </div>
    </div>
  );
}

// ─── Pricing ────────────────────────────────────────────────
const TIERS = [
  {
    name: "Free", price: "$0", period: "forever", accent: "#E8E8E8",
    cta: "Get started", ctaStyle: "outline" as const,
    features: ["10 tracks/month", "MP3 output", "2 & 4 stems", "Standard queue"],
  },
  {
    name: "Pro", price: "$9.99", period: "/month", accent: stemColors.vocals,
    badge: "Popular", cta: "Start free trial", ctaStyle: "filled" as const,
    features: ["Unlimited tracks", "WAV 24-bit + MP3 320kbps", "2 / 4 / 6 stems", "Priority queue", "Batch processing", "URL import"],
  },
  {
    name: "Studio", price: "$29.99", period: "/month", accent: stemColors.drums,
    cta: "Contact sales", ctaStyle: "outline" as const,
    features: ["Everything in Pro", "API access", "Team seats (up to 5)", "Custom processing priority", "Dedicated support", "Early access to new models"],
  },
];

function PricingCard({ tier }: { tier: typeof TIERS[number] }) {
  const [hovered, setHovered] = useState(false);
  const isDark = tier.accent !== "#E8E8E8"; // Free tier is light accent

  const hText = isDark ? "#FFFFFF" : C.text;
  const hTextMuted = isDark ? "rgba(255,255,255,0.7)" : C.textMuted;
  const hTextSec = isDark ? "rgba(255,255,255,0.85)" : C.textLight;
  const hTextFaint = isDark ? "rgba(255,255,255,0.4)" : C.textMuted;

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{
        backgroundColor: hovered ? tier.accent : "#FFFFFF",
      }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        padding: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        cursor: "default",
      }}
    >
      <div style={{ padding: "36px 32px 40px", display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Badge */}
        {"badge" in tier && tier.badge && (
          <div style={{ marginBottom: 12 }}>
            <motion.span
              animate={{
                color: hovered ? hTextMuted : tier.accent,
                backgroundColor: hovered ? (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.06)") : tier.accent + "15",
              }}
              transition={{ duration: 0.3 }}
              style={{
                fontFamily: fonts.body, fontSize: 11, fontWeight: 600,
                textTransform: "uppercase", letterSpacing: "0.08em",
                padding: "3px 10px", display: "inline-block",
              }}
            >
              {tier.badge}
            </motion.span>
          </div>
        )}

        <motion.h3
          animate={{ color: hovered ? hTextMuted : C.textMuted }}
          transition={{ duration: 0.3 }}
          style={{
            fontFamily: fonts.heading, fontSize: 13, fontWeight: 600,
            textTransform: "uppercase", letterSpacing: "0.06em",
            margin: "0 0 16px",
          }}
        >
          {tier.name}
        </motion.h3>

        <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 32 }}>
          <motion.span
            animate={{ color: hovered ? hText : C.text }}
            transition={{ duration: 0.3 }}
            style={{ fontFamily: fonts.heading, fontSize: 44, fontWeight: 700, lineHeight: 1 }}
          >
            {tier.price}
          </motion.span>
          <motion.span
            animate={{ color: hovered ? hTextMuted : C.textMuted }}
            transition={{ duration: 0.3 }}
            style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 400 }}
          >
            {tier.period}
          </motion.span>
        </div>

        <ul style={{ listStyle: "none", margin: "0 0 32px", padding: 0, flex: 1 }}>
          {tier.features.map((f) => (
            <motion.li
              key={f}
              animate={{ color: hovered ? hTextSec : C.textLight }}
              transition={{ duration: 0.3 }}
              style={{
                fontFamily: fonts.body, fontSize: 14, fontWeight: 400,
                marginBottom: 10, display: "flex", gap: 10, alignItems: "flex-start",
              }}
            >
              <motion.span
                animate={{ color: hovered ? hTextFaint : C.textMuted }}
                transition={{ duration: 0.3 }}
                style={{ flexShrink: 0, lineHeight: "1.5", fontSize: 12 }}
              >—</motion.span>
              {f}
            </motion.li>
          ))}
        </ul>

        <PricingCTA label={tier.cta} accent={tier.accent} hovered={hovered} isDark={isDark} />
      </div>
    </motion.div>
  );
}

function PricingCTA({ label, accent, hovered: cardHovered, isDark }: { label: string; accent: string; hovered: boolean; isDark: boolean }) {
  const [btnHovered, setBtnHovered] = useState(false);

  return (
    <motion.button
      onMouseEnter={() => setBtnHovered(true)}
      onMouseLeave={() => setBtnHovered(false)}
      animate={{
        backgroundColor: cardHovered
          ? (isDark
            ? (btnHovered ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.85)")
            : (btnHovered ? C.accent : C.accent))
          : (btnHovered ? "#F0F0F0" : "rgba(0,0,0,0)"),
        color: cardHovered ? (isDark ? accent : "#FFFFFF") : C.text,
        borderColor: cardHovered ? "transparent" : "#E0E0E0",
      }}
      transition={{ duration: 0.2 }}
      style={{
        width: "100%", padding: "12px 24px",
        fontFamily: fonts.body, fontSize: 14, fontWeight: 500,
        cursor: "pointer",
        border: "1px solid #E0E0E0",
      }}
    >
      {label}
    </motion.button>
  );
}

function PricingSection() {
  return (
    <section id="pricing" style={{ backgroundColor: C.bgAlt, padding: "120px 0" }}>
      <Container>
        <FadeIn>
          <div style={{ marginBottom: 64 }}>
            <SectionLabel>Pricing</SectionLabel>
            <h2 style={{
              fontFamily: fonts.heading, fontSize: 48, fontWeight: 700,
              lineHeight: 1.08, letterSpacing: "-0.02em", color: C.text,
              margin: "16px 0 0",
            }}>
              Simple, transparent pricing.
            </h2>
            <p style={{ fontFamily: fonts.body, fontSize: 15, fontWeight: 400, lineHeight: 1.6, color: "#777777", margin: "12px 0 0", maxWidth: 520 }}>
              Start for free. Upgrade when you need more stems, better quality,
              or batch processing. No hidden fees.
            </p>
          </div>
        </FadeIn>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
          {TIERS.map((t, i) => (
            <FadeIn key={t.name} delay={i * 0.08}>
              <PricingCard tier={t} />
            </FadeIn>
          ))}
        </div>
      </Container>
    </section>
  );
}

// ─── CTA Banner (light theme) ───────────────────────────────
function CTABanner() {
  return (
    <section style={{
      background: `linear-gradient(135deg, ${C.accent} 0%, #3D2DFF 100%)`,
      padding: "64px 0",
      textAlign: "center",
    }}>
      <Container>
        <FadeIn>
          <h2 style={{
            fontFamily: fonts.heading, fontSize: 40, fontWeight: 700,
            lineHeight: 1.15, letterSpacing: "-0.02em", color: "#FFFFFF",
            margin: "0 0 12px",
          }}>
            Ready to split your first track?
          </h2>
          <p style={{
            fontFamily: fonts.body, fontSize: 15, fontWeight: 400,
            color: "rgba(255,255,255,0.9)", margin: "0 0 32px", lineHeight: 1.5,
          }}>
            Start for free. No credit card required.
          </p>
          <CTABannerButton />
        </FadeIn>
      </Container>
    </section>
  );
}

function CTABannerButton() {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href="/app"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: fonts.body, fontSize: 15, fontWeight: 600,
        color: C.text, backgroundColor: hovered ? "#E8E8E8" : "#FFFFFF",
        textDecoration: "none", padding: "0 36px", height: 52,
        display: "inline-flex", alignItems: "center",
        transition: "background-color 0.15s",
      }}
    >
      Get Started Free
    </a>
  );
}

// ─── Page ───────────────────────────────────────────────────
export default function V7() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  return (
    <div style={{ backgroundColor: C.bg, minHeight: "100vh" }}>
      <Header />
      <Hero />
      <TrustBar />
      <Features />
      <HowItWorks />
      <Processing />
      <PricingSection />
      <CTABanner />
      <FAQ />
      <Footer />
    </div>
  );
}
