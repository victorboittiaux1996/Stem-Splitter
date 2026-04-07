"use client";

import { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Logo } from "@/components/website/logo";
import { Footer } from "@/components/website/footer";
import { FAQ } from "@/components/website/faq";
import { fonts, stemColors } from "@/components/website/theme";
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
  textMuted: "#555555",   // only for truly de-emphasized metadata
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
              fontFamily: fonts.body, fontSize: 14, fontWeight: 500, color: C.textLight,
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
        {/* Top row: headline left, description right — ElevenLabs pattern */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "end" }}>
          <div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              style={{
                fontFamily: fonts.heading, fontSize: 64, fontWeight: 700,
                lineHeight: 1.04, letterSpacing: "-0.03em", color: C.text, margin: 0,
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
              fontFamily: fonts.body, fontSize: 18, fontWeight: 400, lineHeight: 1.6,
              color: C.textLight, margin: 0,
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

        {/* Product preview block — big gray square like ElevenLabs */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: 64,
            backgroundColor: C.bgAlt,
            padding: "48px 56px",
            minHeight: 420,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {/* Stem visualization inside the product block */}
          <div style={{ maxWidth: 640 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <span style={{ fontFamily: fonts.body, fontSize: 12, color: C.textMuted, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                track_master.wav
              </span>
              <span style={{ fontFamily: fonts.body, fontSize: 11, color: C.textMuted, letterSpacing: "0.02em" }}>
                6 stems · WAV 24-bit
              </span>
            </div>

            {[
              { label: "Vocals", color: stemColors.vocals, w: 78 },
              { label: "Drums", color: stemColors.drums, w: 92 },
              { label: "Bass", color: stemColors.bass, w: 60 },
              { label: "Guitar", color: stemColors.guitar, w: 52 },
              { label: "Piano", color: stemColors.piano, w: 45 },
              { label: "Other", color: stemColors.other, w: 88 },
            ].map((s, i) => (
              <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 10 }}>
                <span style={{
                  fontFamily: fonts.body, fontSize: 12, fontWeight: 500, color: C.textMuted,
                  width: 56, textAlign: "right", flexShrink: 0, textTransform: "uppercase",
                }}>
                  {s.label}
                </span>
                <div style={{ flex: 1, height: 24, backgroundColor: C.bg, overflow: "hidden" }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${s.w}%` }}
                    transition={{ duration: 0.8, delay: 0.5 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    style={{ height: "100%", backgroundColor: s.color, opacity: 0.85 }}
                  />
                </div>
              </div>
            ))}

            {/* Stats row */}
            <div style={{ display: "flex", marginTop: 24, paddingTop: 20, borderTop: `1px solid #E0E0E0` }}>
              {[
                { val: "6", lbl: "Stems", color: stemColors.vocals },
                { val: "<40s", lbl: "Processing", color: stemColors.drums },
                { val: "24-bit", lbl: "WAV output", color: stemColors.bass },
              ].map((s) => (
                <div key={s.lbl} style={{ flex: 1, paddingLeft: 16, borderLeft: `2px solid ${s.color}` }}>
                  <div style={{ fontFamily: fonts.heading, fontSize: 24, fontWeight: 700, color: C.text }}>{s.val}</div>
                  <div style={{ fontFamily: fonts.body, fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.04em", marginTop: 2 }}>{s.lbl}</div>
                </div>
              ))}
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
  { name: "ableton", style: { fontWeight: 700, fontSize: 15, letterSpacing: -0.3, textTransform: "lowercase" as const } },
  { name: "FL Studio", style: { fontWeight: 800, fontSize: 14, letterSpacing: 0.5 } },
  { name: "Logic Pro", style: { fontWeight: 400, fontSize: 15, letterSpacing: 0.5 } },
  { name: "PRO TOOLS", style: { fontWeight: 900, fontSize: 12, letterSpacing: 2, textTransform: "uppercase" as const } },
  { name: "Cubase", style: { fontWeight: 700, fontSize: 15, letterSpacing: 0.2 } },
  { name: "Studio One", style: { fontWeight: 400, fontSize: 14, letterSpacing: 0.8 } },
  { name: "REAPER", style: { fontWeight: 900, fontSize: 13, letterSpacing: 1.5, textTransform: "uppercase" as const } },
  { name: "Bitwig", style: { fontWeight: 700, fontSize: 15, letterSpacing: -0.2 } },
];

function TrustBar() {
  return (
    <section style={{ backgroundColor: C.bg, padding: "48px 0" }}>
      <Container>
        <FadeIn>
          <div style={{ marginBottom: 20 }}>
            <SectionLabel>Built for producers using</SectionLabel>
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {DAWS.map((d) => (
              <span key={d.name} style={{ fontFamily: fonts.body, color: C.text, opacity: 0.35, whiteSpace: "nowrap", ...d.style }}>
                {d.name}
              </span>
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
          animate={{ color: hovered ? "rgba(255,255,255,0.85)" : C.textLight }}
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "end", marginBottom: 64 }}>
            <div>
              <SectionLabel>Features</SectionLabel>
              <h2 style={{
                fontFamily: fonts.heading, fontSize: 48, fontWeight: 700,
                lineHeight: 1.08, letterSpacing: "-0.02em", color: C.text,
                margin: "16px 0 0",
              }}>
                Built for producers.
                <br />
                Not for everyone.
              </h2>
            </div>
            <p style={{ fontFamily: fonts.body, fontSize: 16, fontWeight: 400, lineHeight: 1.65, color: C.textLight, margin: 0 }}>
              State-of-the-art AI models running on H100 GPUs. Six isolated stems,
              studio-quality output, and the fastest processing in the industry.
            </p>
          </div>
        </FadeIn>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1, backgroundColor: C.bg }}>
          {FEATURES.map((f, i) => (
            <FeatureCard key={f.title} feature={f} index={i} />
          ))}
        </div>
      </Container>
    </section>
  );
}

// ─── How It Works ───────────────────────────────────────────
// Exact Ableton palette colors — extracted from ableton.com/fr/live/
const STEP_COLORS = {
  upload: "#333333",    // medium charcoal — softer than black, contrasts against #F3F3F3
  process: "#333333",
  download: "#333333",
} as const;

const STEPS = [
  { num: "01", color: STEP_COLORS.upload, title: "Upload", desc: "Drag and drop a file, select a folder, or paste a URL. MP3, WAV, FLAC — up to 200 MB." },
  { num: "02", color: STEP_COLORS.process, title: "Process", desc: "H100 GPU runs MelBand RoFormer and BS-RoFormer simultaneously. Two best models. One pass." },
  { num: "03", color: STEP_COLORS.download, title: "Download", desc: "Clean isolated stems in WAV 24-bit or MP3 320kbps. Download individually or as ZIP." },
];

function HowItWorks() {
  return (
    <section style={{ backgroundColor: C.bgAlt, padding: "120px 0" }}>
      <Container>
        <FadeIn>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "end", marginBottom: 64 }}>
            <div>
              <SectionLabel>Process</SectionLabel>
              <h2 style={{
                fontFamily: fonts.heading, fontSize: 48, fontWeight: 700,
                lineHeight: 1.08, letterSpacing: "-0.02em", color: C.text,
                margin: "16px 0 0",
              }}>
                Three steps.
                <br />
                Zero friction.
              </h2>
            </div>
            <p style={{ fontFamily: fonts.body, fontSize: 16, fontWeight: 400, lineHeight: 1.65, color: C.textLight, margin: 0 }}>
              Upload, pick your stem count, download. No account required to try.
              Start separating in under a minute.
            </p>
          </div>
        </FadeIn>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
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
        animate={{
          backgroundColor: step.color,
        }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{
          padding: "40px 36px",
          cursor: "default",
          minHeight: 280,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <span
          style={{
            fontFamily: fonts.heading, fontSize: 80, fontWeight: 700,
            lineHeight: 1, display: "block", color: "rgba(255,255,255,0.7)",
            marginBottom: 32,
          }}
        >
          {step.num}
        </span>

        <h3
          style={{
            fontFamily: fonts.heading, fontSize: 16, fontWeight: 700,
            textTransform: "uppercase", letterSpacing: "0.06em",
            margin: "0 0 12px", color: "#FFFFFF",
          }}
        >
          {step.title}
        </h3>

        <p style={{
          fontFamily: fonts.body, fontSize: 14, fontWeight: 400, margin: 0,
          lineHeight: 1.6, color: "#FFFFFF",
        }}>
          {step.desc}
        </p>
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "end", marginBottom: 64 }}>
            <div>
              <SectionLabel>Speed</SectionLabel>
              <h2 style={{
                fontFamily: fonts.heading, fontSize: 48, fontWeight: 700,
                lineHeight: 1.08, letterSpacing: "-0.02em", color: C.text,
                margin: "16px 0 0",
              }}>
                Fast enough to
                <br />
                not think about it.
              </h2>
            </div>
            <p style={{ fontFamily: fonts.body, fontSize: 16, fontWeight: 400, lineHeight: 1.65, color: C.textLight, margin: 0 }}>
              LALAL.AI takes ~58s. Moises takes ~75s. We run on H100 GPUs and finish
              in under 40 seconds. The benchmark is real.
            </p>
          </div>
        </FadeIn>

        <div style={{ display: "grid", gridTemplateColumns: "58fr 42fr", gap: 1 }}>
          <FadeIn delay={0.1}>
            <div style={{ backgroundColor: C.bgCard, padding: "36px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
              {[
                { label: "Upload", pct: 100, color: stemColors.bass },
                { label: "Processing", pct: 72, color: C.accent },
                { label: "Download ready", pct: 0, color: C.textMuted },
              ].map((step) => (
                <div key={step.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontFamily: fonts.body, fontSize: 14, color: C.textLight }}>{step.label}</span>
                    {step.pct > 0 && (
                      <span style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: step.color }}>{step.pct}%</span>
                    )}
                  </div>
                  <div style={{ height: 3, backgroundColor: C.bgAlt }}>
                    {step.pct > 0 && <div style={{ height: 3, width: `${step.pct}%`, backgroundColor: step.color }} />}
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 4, backgroundColor: C.bg, padding: "12px 16px" }}>
                <span style={{ fontFamily: fonts.body, fontSize: 14, color: C.textLight }}>
                  Average time: <strong style={{ color: C.text, fontWeight: 600 }}>38 seconds</strong>
                </span>
              </div>
            </div>
          </FadeIn>

          <FadeIn delay={0.2}>
            <div style={{ backgroundColor: C.bgCard, padding: "36px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <SectionLabel>Infrastructure</SectionLabel>
              <div style={{ marginTop: 20 }}>
                {[
                  { label: "GPU model", value: "H100 80GB" },
                  { label: "Avg. separation", value: "< 40s" },
                  { label: "Input formats", value: "MP3, WAV, FLAC, AAC" },
                  { label: "Max file size", value: "200 MB" },
                  { label: "Output quality", value: "WAV 24-bit / MP3 320" },
                ].map((row) => (
                  <div key={row.label} style={{
                    display: "flex", justifyContent: "space-between", padding: "13px 0",
                    borderBottom: "1px solid #F0F0F0",
                  }}>
                    <span style={{ fontFamily: fonts.body, fontSize: 13, color: C.textLight }}>{row.label}</span>
                    <span style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 600, color: C.text }}>{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </Container>
    </section>
  );
}

// ─── Pricing ────────────────────────────────────────────────
const TIERS = [
  {
    name: "Free", price: "$0", period: "forever", accent: "#1A1A1A",
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
                color: hovered ? "rgba(255,255,255,0.8)" : tier.accent,
                backgroundColor: hovered ? "rgba(255,255,255,0.15)" : tier.accent + "15",
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
          animate={{ color: hovered ? "rgba(255,255,255,0.7)" : C.textMuted }}
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
            animate={{ color: hovered ? "#FFFFFF" : C.text }}
            transition={{ duration: 0.3 }}
            style={{ fontFamily: fonts.heading, fontSize: 44, fontWeight: 400, lineHeight: 1 }}
          >
            {tier.price}
          </motion.span>
          <motion.span
            animate={{ color: hovered ? "rgba(255,255,255,0.6)" : C.textMuted }}
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
              animate={{ color: hovered ? "rgba(255,255,255,0.85)" : C.textLight }}
              transition={{ duration: 0.3 }}
              style={{
                fontFamily: fonts.body, fontSize: 14, fontWeight: 400,
                marginBottom: 10, display: "flex", gap: 10, alignItems: "flex-start",
              }}
            >
              <motion.span
                animate={{ color: hovered ? "rgba(255,255,255,0.4)" : C.textMuted }}
                transition={{ duration: 0.3 }}
                style={{ flexShrink: 0, lineHeight: "1.5", fontSize: 12 }}
              >—</motion.span>
              {f}
            </motion.li>
          ))}
        </ul>

        <PricingCTA label={tier.cta} accent={tier.accent} hovered={hovered} />
      </div>
    </motion.div>
  );
}

function PricingCTA({ label, accent, hovered: cardHovered }: { label: string; accent: string; hovered: boolean }) {
  const [btnHovered, setBtnHovered] = useState(false);

  return (
    <motion.button
      onMouseEnter={() => setBtnHovered(true)}
      onMouseLeave={() => setBtnHovered(false)}
      animate={{
        backgroundColor: cardHovered ? (btnHovered ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.85)") : (btnHovered ? "#F0F0F0" : "transparent"),
        color: cardHovered ? accent : C.text,
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
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "end", marginBottom: 64 }}>
            <div>
              <SectionLabel>Pricing</SectionLabel>
              <h2 style={{
                fontFamily: fonts.heading, fontSize: 48, fontWeight: 700,
                lineHeight: 1.08, letterSpacing: "-0.02em", color: C.text,
                margin: "16px 0 0",
              }}>
                Simple, transparent
                <br />
                pricing.
              </h2>
            </div>
            <p style={{ fontFamily: fonts.body, fontSize: 16, fontWeight: 400, lineHeight: 1.65, color: C.textLight, margin: 0 }}>
              Start for free. Upgrade when you need more stems, better quality,
              or batch processing. No hidden fees.
            </p>
          </div>
        </FadeIn>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
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
    <section style={{ backgroundColor: C.bg, padding: "120px 0", textAlign: "center" }}>
      <Container>
        <FadeIn>
          <h2 style={{
            fontFamily: fonts.heading, fontSize: 48, fontWeight: 700,
            lineHeight: 1.1, letterSpacing: "-0.02em", color: C.text,
            margin: "0 0 16px",
          }}>
            Ready to split your first track?
          </h2>
          <p style={{
            fontFamily: fonts.body, fontSize: 17, fontWeight: 400,
            color: C.textLight, maxWidth: 400, margin: "0 auto 40px", lineHeight: 1.6,
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
        color: "#FFFFFF", backgroundColor: hovered ? C.accentHover : C.accent,
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
