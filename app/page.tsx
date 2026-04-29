"use client";

import { useState, useEffect, useRef } from "react";
import { useLocalPrices as useLocalPricesHome, formatCurrency as formatCurrencyHome } from "@/hooks/use-local-prices";
import { motion, useInView } from "framer-motion";
import { Header } from "@/components/website/header";
import { Footer } from "@/components/website/footer";
import { FAQ } from "@/components/website/faq";
import { fonts, stemColors } from "@/components/website/theme";
import { useAuthModal } from "@/contexts/auth-modal-context";
import { PLANS, ANNUAL_DISCOUNT_PERCENT, type PlanId } from "@/lib/plans";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { HeroDemo } from "@/components/website/hero-demo";
import { HeroDemoMobile } from "@/components/website/hero-demo-mobile";
import {
  RiEqualizerFill,
  RiCpuFill,
  RiFlashlightFill,
  RiStackFill,
  RiLinkM,
  RiSoundModuleFill,
  RiCheckLine,
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
    <div className="site-container" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px", ...style }}>
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

// Header + nav helpers are imported from components/website/header (shared, mobile-responsive)

// ─── Hero ───────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ backgroundColor: C.bg, padding: "100px 0 0" }}>
      <Container>
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: fonts.heading, fontSize: 56, fontWeight: 500,
            lineHeight: 1.08, letterSpacing: "-0.025em", color: C.text, margin: 0,
            maxWidth: 900,
          }}
        >
          Studio-grade stem separation, in your browser.
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          style={{
            fontFamily: fonts.body, fontSize: 18, fontWeight: 400, lineHeight: 1.5,
            color: "#666666", margin: "20px 0 0", maxWidth: 560,
          }}
        >
          Drop any track and get clean vocals, drums, bass, and instruments back in seconds. Ready for your next session.
        </motion.p>

        {/* CTAs row + right badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 md:gap-0"
          style={{ marginTop: 40 }}
        >
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <HeroTryFree />
            <HeroCTA label="See pricing" variant="secondary" href="/pricing" />
          </div>
          <span
            className="text-center md:text-left"
            style={{
              fontFamily: fonts.body, fontSize: 14, fontWeight: 500,
            }}
          >
            <span style={{ color: C.textMuted }}>Built by producers, </span><span style={{ color: C.text }}>for producers.</span>
          </span>
        </motion.div>

        {/* Product preview — interactive HeroDemo on desktop, static PNG on mobile
            (HeroDemo's interior layout is fixed at 880px and doesn't scale to <md). */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{ marginTop: 64 }}
        >
          <div className="hidden md:block">
            <HeroDemo />
          </div>
          <div className="md:hidden">
            <HeroDemoMobile />
          </div>
        </motion.div>
      </Container>
    </section>
  );
}

function HeroCTA({ label, variant, href, onClick, className }: { label: string; variant: "primary" | "secondary"; href?: string; onClick?: () => void; className?: string }) {
  const [hovered, setHovered] = useState(false);
  const isPrimary = variant === "primary";
  const Tag = onClick ? "button" : "a";
  return (
    <Tag
      {...(onClick ? { onClick } : { href })}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`w-full md:w-auto inline-flex items-center justify-center md:justify-start ${className ?? ""}`}
      style={{
        fontFamily: fonts.body, fontSize: 15, fontWeight: 500,
        color: isPrimary ? "#FFFFFF" : C.text,
        backgroundColor: isPrimary ? (hovered ? C.accentHover : C.accent) : (hovered ? "#E8E8E8" : "#F0F0F0"),
        textDecoration: "none", padding: "0 28px", height: 48,
        transition: "background-color 0.15s",
        border: "none", cursor: "pointer",
      }}
    >
      {label}
    </Tag>
  );
}

function HeroTryFree() {
  const { openAuthModal } = useAuthModal();
  return <HeroCTA label="Try it free" variant="primary" onClick={() => openAuthModal("/app")} />;
}

// ─── Trust Bar ──────────────────────────────────────────────
const DAWS = [
  { name: "Ableton", src: "/logos/ableton.svg", h: 18 },
  { name: "FL Studio", src: "/logos/flstudio.webp", h: 56 },
  { name: "Logic Pro X", src: "/logos/logicpro.jpg", h: 22 },
  { name: "Pro Tools", src: "/logos/protools.svg", h: 22 },
  { name: "Cubase", src: "/logos/cubase.svg", h: 20 },
  { name: "Studio One", src: "/logos/studioone.jpeg", h: 20 },
  { name: "Reaper", src: "/logos/reaper.svg", h: 18 },
  { name: "Bitwig", src: "/logos/bitwig.png", h: 34 },
];

function TrustBar() {
  return (
    <section style={{ backgroundColor: C.bg, padding: "48px 0" }}>
      <Container>
        <FadeIn>
          <div style={{ display: "flex", alignItems: "center", gap: 40 }}>
            {/* Fixed label on the left */}
            <p style={{
              fontFamily: fonts.body, fontSize: 13, fontWeight: 400, color: "#BBBBBB",
              margin: 0, whiteSpace: "nowrap", flexShrink: 0,
            }}>
              Built for producers using
            </p>
            {/* Marquee container */}
            <div style={{ overflow: "hidden", flex: 1, minWidth: 0, maskImage: "linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)", WebkitMaskImage: "linear-gradient(to right, transparent, black 40px, black calc(100% - 40px), transparent)" }}>
              <motion.div
                animate={{ x: ["0%", "-50%"] }}
                transition={{ duration: 25, ease: "linear", repeat: Infinity }}
                style={{ display: "flex", alignItems: "center", gap: 56, width: "max-content" }}
              >
                {[...DAWS, ...DAWS].map((d, i) => (
                  <img
                    key={`${d.name}-${i}`}
                    src={d.src}
                    alt={d.name}
                    style={{ height: d.h, width: "auto", objectFit: "contain", opacity: 0.4, filter: "grayscale(1)", mixBlendMode: "multiply" as const, flexShrink: 0 }}
                  />
                ))}
              </motion.div>
            </div>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}

// ─── Features ───────────────────────────────────────────────
const FEATURES = [
  { color: stemColors.vocals, title: "6-Stem Separation", desc: "Vocals, drums, bass, guitar, piano, and other. Every element fully isolated at studio quality.", icon: RiEqualizerFill },
  { color: stemColors.drums, title: "Studio-Grade AI", desc: "The highest-rated separation models available, running on dedicated infrastructure. Clean stems, no artifacts.", icon: RiCpuFill },
  { color: stemColors.bass, title: "GPU-Powered Speed", desc: "Full track processed in under 40 seconds. Your session doesn't wait.", icon: RiFlashlightFill },
  { color: stemColors.guitar, title: "Batch Processing", desc: "Upload an entire album. Process multiple tracks simultaneously in the background while you work.", icon: RiStackFill },
  { color: stemColors.piano, title: "Link Import", desc: "Paste a Dropbox, Google Drive, or SoundCloud link. No file upload needed. We handle the rest.", icon: RiLinkM },
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
            <h2 style={{
              fontFamily: fonts.heading, fontSize: 36, fontWeight: 500,
              lineHeight: 1.17, letterSpacing: "-0.02em", color: C.text,
              margin: 0,
            }}>
              Everything a producer actually needs.
            </h2>
            <p style={{ fontFamily: fonts.body, fontSize: 18, fontWeight: 400, lineHeight: 1.5, color: "#666666", margin: "16px 0 0", maxWidth: 560 }}>
              Lossless output, GPU-powered separation, and nothing to install.
              Just the stems, done right.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px]" style={{ backgroundColor: C.bg }}>
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
  { num: "02", title: "Process", desc: "GPU-powered separation delivers clean stems in under 40 seconds. Sit back or keep working.", color: stemColors.drums },
  { num: "03", title: "Download", desc: "Clean isolated stems in WAV 24-bit or MP3 320kbps. Download individually or as ZIP.", color: stemColors.bass },
];

function HowItWorks() {
  return (
    <section style={{ backgroundColor: C.bgAlt, padding: "120px 0" }}>
      <Container>
        <FadeIn>
          <div style={{ marginBottom: 64 }}>
            <h2 style={{
              fontFamily: fonts.heading, fontSize: 36, fontWeight: 500,
              lineHeight: 1.17, letterSpacing: "-0.02em", color: C.text,
              margin: 0,
            }}>
              From full track to stems in three steps.
            </h2>
            <p style={{ fontFamily: fonts.body, fontSize: 18, fontWeight: 400, lineHeight: 1.5, color: "#666666", margin: "16px 0 0", maxWidth: 560 }}>
              Upload, process, download. No accounts to configure, no software to learn.
            </p>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px]">
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
  const steps = [
    { label: "Upload", pct: 100, color: stemColors.vocals },
    { label: "Processing", pct: 68, color: C.accent },
    { label: "Ready", pct: 0, color: stemColors.bass },
  ];
  return (
    <section style={{ backgroundColor: C.bg, padding: "120px 0" }}>
      <Container>
        <FadeIn>
          <div style={{ marginBottom: 64 }}>
            <h2 style={{
              fontFamily: fonts.heading, fontSize: 36, fontWeight: 500,
              lineHeight: 1.17, letterSpacing: "-0.02em", color: C.text,
              margin: 0,
            }}>
              The fastest stem separation on the market.
            </h2>
            <p style={{ fontFamily: fonts.body, fontSize: 18, fontWeight: 400, lineHeight: 1.5, color: "#666666", margin: "16px 0 0", maxWidth: 560 }}>
              Full songs processed in seconds on dedicated GPU infrastructure. Your session doesn't wait.
            </p>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[2px]">
            {/* Left: pipeline */}
            <div style={{ backgroundColor: C.bgAlt, padding: "32px 32px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
              {steps.map((s, i) => (
                <div key={s.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                    <span style={{ fontFamily: fonts.body, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
                    {s.pct > 0 && <span style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 600, color: s.color }}>{s.pct}%</span>}
                  </div>
                  <div style={{ height: 4, backgroundColor: "#E4E4E4", overflow: "hidden" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${s.pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1, delay: 0.2 + i * 0.25, ease: [0.22, 1, 0.36, 1] }}
                      style={{ height: "100%", backgroundColor: s.color }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {/* Right: key specs */}
            <div style={{ backgroundColor: C.bgAlt, padding: "32px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              {[
                { label: "Avg. time", value: "< 40 seconds" },
                { label: "GPU", value: "Dedicated GPU" },
                { label: "Output", value: "WAV 24-bit / MP3 320" },
                { label: "Max stems", value: "6" },
              ].map((row, i) => (
                <div key={row.label} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "10px 0", borderBottom: i < 3 ? "1px solid #E4E4E4" : "none",
                }}>
                  <span style={{ fontFamily: fonts.body, fontSize: 12, color: C.textMuted }}>{row.label}</span>
                  <span style={{ fontFamily: fonts.heading, fontSize: 13, fontWeight: 600, color: C.text }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>
        </FadeIn>
      </Container>
    </section>
  );
}

// ── Speed A (unused)
function _SpeedA() {
  const stats = [
    { value: "<40s", label: "Separation time", sub: "Full track, 6 stems", color: stemColors.vocals },
    { value: "GPU", label: "Dedicated GPU", sub: "Cloud infrastructure", color: stemColors.drums },
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px]">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px]">
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
    { name: "Competitor A", time: 75, color: "#D0D0D0" },
    { name: "Competitor B", time: 58, color: "#D0D0D0" },
    { name: "44Stems", time: 38, color: stemColors.vocals, highlight: true },
  ];
  const specs = [
    { label: "GPU", value: "Dedicated GPU" },
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-[2px]">
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
    { label: "GPU", value: "Dedicated GPU", color: stemColors.vocals },
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
            Average separation time · Dedicated GPU
          </span>
          {/* Competitor comparison line */}
          <div style={{ display: "flex", gap: 32, marginTop: 24 }}>
            <span style={{ fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>
              Fastest in class
            </span>
          </div>
        </div>
      </FadeIn>

      {/* Spec grid below */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-[2px]">
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
const homePlanAccents: Record<string, string> = {
  free: "#3A3A3A",
  pro: stemColors.vocals,
  studio: stemColors.drums,
};

type HomePlanId = "free" | "pro" | "studio";

const HOME_PLAN_ORDER: HomePlanId[] = ["free", "pro", "studio"];

function useHomePlanCTA(planId: HomePlanId, annual: boolean) {
  const { user, loading: authLoading } = useAuth();
  const { plan: userPlan, loading: subLoading } = useSubscription(user?.id);

  const checkoutUrl = planId === "free"
    ? "/app"
    : `/app?upgrade=${planId}&billing=${annual ? "annual" : "monthly"}`;

  const ready = !!user && !authLoading && !subLoading;
  const tier = HOME_PLAN_ORDER.indexOf(planId);
  const currentTier = ready ? HOME_PLAN_ORDER.indexOf(userPlan as HomePlanId) : -1;

  if (!ready) return { label: "Get started", href: checkoutUrl, isCurrent: false };
  if (currentTier === tier) return { label: "Current plan", href: "/app", isCurrent: true };
  if (currentTier > tier) return { label: "Manage plan", href: "/app", isCurrent: false };
  return { label: `Upgrade to ${PLANS[planId].label}`, href: checkoutUrl, isCurrent: false };
}

function HomePlanCard({ planId, annual, localPrices }: { planId: HomePlanId; annual: boolean; localPrices: ReturnType<typeof useLocalPricesHome> }) {
  const [hovered, setHovered] = useState(false);
  const plan = PLANS[planId];
  const accent = homePlanAccents[planId];

  // Local currency pricing from Stripe's currency_options — falls back to
  // the USD sticker in lib/plans.ts if the API is slow/down.
  const localKey = planId === "pro"
    ? (annual ? "pro_annual" : "pro_monthly")
    : planId === "studio"
    ? (annual ? "studio_annual" : "studio_monthly")
    : null;
  const local = localKey && localPrices ? localPrices.prices[localKey] : null;
  let price: string;
  if (planId === "free") {
    price = "$0";
  } else if (local) {
    if (annual) {
      // Annual total divided by 12 → shown as effective /mo.
      const monthlyEffective = Math.round(local.amount / 12);
      price = formatCurrencyHome(monthlyEffective, localPrices!.currency, { maxFractionDigits: 2 });
    } else {
      price = local.display;
    }
  } else {
    price = annual ? `$${plan.yearlyPriceUSD}` : `$${plan.priceUSD}`;
  }
  const period = planId === "free" ? "forever" : "/mo";

  const cta = useHomePlanCTA(planId, annual);

  const hText = "#FFFFFF";
  const hTextSec = "rgba(255,255,255,0.95)";
  const hTextMuted = "rgba(255,255,255,0.75)";

  const dText = C.text;
  const dTextSec = "#111111";
  const dTextMuted = "#333333";

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{ backgroundColor: hovered ? accent : "#FFFFFF" }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        padding: 0, display: "flex", flexDirection: "column", overflow: "hidden",
        cursor: "pointer", height: "100%", color: "inherit",
      }}
    >
      <div style={{ padding: "36px 32px 40px", display: "flex", flexDirection: "column", flex: 1 }}>
        <motion.h3
          animate={{ color: hovered ? hText : dText }}
          transition={{ duration: 0.3 }}
          style={{
            fontFamily: fonts.body, fontSize: 24, fontWeight: 600,
            letterSpacing: "-0.01em", margin: "0 0 4px",
          }}
        >
          {plan.label}
        </motion.h3>

        <motion.p
          animate={{ color: hovered ? hTextMuted : dTextMuted }}
          transition={{ duration: 0.3 }}
          style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 400, margin: "0 0 20px" }}
        >
          {plan.tagline}
        </motion.p>

        <div style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <motion.span
              animate={{ color: hovered ? hText : dText }}
              transition={{ duration: 0.3 }}
              style={{ fontFamily: fonts.body, fontSize: 48, fontWeight: 700, lineHeight: 1 }}
            >
              {price}
            </motion.span>
            <motion.span
              animate={{ color: hovered ? hTextMuted : dTextMuted }}
              transition={{ duration: 0.3 }}
              style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 400 }}
            >
              {period}
            </motion.span>
          </div>
          <div style={{ minHeight: annual ? 25 : 0, marginTop: annual ? 6 : 0, display: "flex", alignItems: "center", gap: 8 }}>
            {annual && planId !== "free" && (() => {
              const monthlyKey = planId === "pro" ? "pro_monthly" : "studio_monthly";
              const annualKey = planId === "pro" ? "pro_annual" : "studio_annual";
              const monthlyLocal = localPrices?.prices[monthlyKey];
              const annualLocal = localPrices?.prices[annualKey];
              const strikeLabel = monthlyLocal?.display ?? `$${plan.priceUSD}`;
              const yearlyTotal = annualLocal
                ? formatCurrencyHome(annualLocal.amount, localPrices!.currency, { maxFractionDigits: 0 })
                : `$${(plan.yearlyPriceUSD * 12).toFixed(0)}`;
              return (
                <>
                  <motion.span
                    animate={{ color: hovered ? "#FFFFFF" : "#999999" }}
                    transition={{ duration: 0.3 }}
                    style={{ fontFamily: fonts.body, fontSize: 13, textDecoration: "line-through" }}
                  >
                    {strikeLabel}/mo
                  </motion.span>
                  <motion.span
                    animate={{ color: hovered ? "#FFFFFF" : C.accent }}
                    transition={{ duration: 0.3 }}
                    style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600 }}
                  >
                    {yearlyTotal}/yr
                  </motion.span>
                </>
              );
            })()}
          </div>
        </div>

        <div style={{ marginTop: 16, marginBottom: 28 }}>
          <HomePlanCTA cardHovered={hovered} accent={accent} href={cta.href} label={cta.label} isCurrent={cta.isCurrent} />
        </div>

        <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1 }}>
          {plan.features.map((f) => (
            <motion.li
              key={f}
              animate={{ color: hovered ? hTextSec : dTextSec }}
              transition={{ duration: 0.3 }}
              style={{
                fontFamily: fonts.body, fontSize: 14, fontWeight: 400,
                marginBottom: 10, display: "flex", gap: 10, alignItems: "center",
              }}
            >
              <motion.span
                animate={{ color: hovered ? "rgba(255,255,255,0.85)" : C.accent }}
                transition={{ duration: 0.3 }}
                style={{ flexShrink: 0, display: "flex", alignItems: "center" }}
              >
                <RiCheckLine size={16} />
              </motion.span>
              {f}
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function HomePlanCTA({ cardHovered, accent, href, label, isCurrent }: { cardHovered: boolean; accent: string; href: string; label: string; isCurrent: boolean }) {
  const [btnHovered, setBtnHovered] = useState(false);

  if (isCurrent) {
    return (
      <motion.a
        href={href}
        animate={{ color: cardHovered ? "#FFFFFF" : "#666666" }}
        transition={{ duration: 0.2 }}
        style={{
          width: "100%", padding: "12px 24px",
          fontFamily: fonts.body, fontSize: 14, fontWeight: 500,
          border: `1px solid ${cardHovered ? "rgba(255,255,255,0.4)" : "#D4D4D4"}`,
          textDecoration: "none",
          textAlign: "center", display: "block",
          backgroundColor: "transparent",
          cursor: "default",
        }}
      >
        {label}
      </motion.a>
    );
  }

  const bg = cardHovered
    ? (btnHovered ? "#FFFFFF" : "#FFFFFF")
    : (btnHovered ? accent : accent);
  const fg = cardHovered ? accent : "#FFFFFF";

  return (
    <motion.a
      href={href}
      onMouseEnter={() => setBtnHovered(true)}
      onMouseLeave={() => setBtnHovered(false)}
      animate={{ backgroundColor: bg, color: fg }}
      transition={{ duration: 0.2 }}
      style={{
        width: "100%", padding: "12px 24px",
        fontFamily: fonts.body, fontSize: 14, fontWeight: 500,
        cursor: "pointer", border: "none",
        textDecoration: "none",
        textAlign: "center", display: "block",
        backgroundColor: bg, color: fg,
      }}
    >
      {label}
    </motion.a>
  );
}

function HomeBillingToggle({ annual, onToggle }: { annual: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        onClick={onToggle}
        style={{
          position: "relative", width: 44, height: 24,
          backgroundColor: annual ? C.accent : "#D4D4D4",
          border: "none", cursor: "pointer", padding: 0,
          transition: "background-color 0.2s",
        }}
      >
        <motion.div
          animate={{ x: annual ? 22 : 2 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "absolute", top: 2, width: 20, height: 20, backgroundColor: "#FFFFFF" }}
        />
      </button>
      <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 500, color: C.text }}>
        Pay annually,{" "}
        <span style={{ color: C.accent }}>save {ANNUAL_DISCOUNT_PERCENT}%</span>
      </span>
    </div>
  );
}

function PricingSection() {
  const [annual, setAnnual] = useState(false);
  const localPrices = useLocalPricesHome();

  return (
    <section id="pricing" style={{ backgroundColor: C.bgAlt, padding: "120px 0" }}>
      <Container>
        <FadeIn>
          <div style={{ marginBottom: 40 }}>
            <h2 style={{
              fontFamily: fonts.heading, fontSize: 36, fontWeight: 500,
              lineHeight: 1.17, letterSpacing: "-0.02em", color: C.text,
              margin: 0,
            }}>
              Simple, transparent pricing.
            </h2>
            <p style={{ fontFamily: fonts.body, fontSize: 18, fontWeight: 400, lineHeight: 1.5, color: "#666666", margin: "16px 0 0 0", maxWidth: 560 }}>
              Pay for what you use. No subscriptions you forget about, no credits that expire.
            </p>
            <div style={{ marginTop: 24 }}>
              <HomeBillingToggle annual={annual} onToggle={() => setAnnual(!annual)} />
            </div>
          </div>
        </FadeIn>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-[2px]">
          {(["free", "pro", "studio"] as HomePlanId[]).map((id, i) => (
            <FadeIn key={id} delay={i * 0.08}>
              <HomePlanCard planId={id} annual={annual} localPrices={localPrices} />
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
            fontFamily: fonts.heading, fontSize: 36, fontWeight: 500,
            lineHeight: 1.15, letterSpacing: "-0.02em", color: "#FFFFFF",
            margin: "0 0 32px",
          }}>
            Your next song starts here.
          </h2>
          <CTABannerButton />
        </FadeIn>
      </Container>
    </section>
  );
}

function CTABannerButton() {
  const [hovered, setHovered] = useState(false);
  const { openAuthModal } = useAuthModal();
  return (
    <button
      onClick={() => openAuthModal("/app")}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        fontFamily: fonts.body, fontSize: 15, fontWeight: 600,
        color: C.text, backgroundColor: hovered ? "#E8E8E8" : "#FFFFFF",
        border: "none", cursor: "pointer",
        padding: "0 36px", height: 52,
        display: "inline-flex", alignItems: "center",
        transition: "background-color 0.15s",
      }}
    >
      Start for free
    </button>
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
