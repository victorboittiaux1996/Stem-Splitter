"use client";

import { useState, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import { motion, useInView } from "framer-motion";
import { Header } from "@/components/website/header";
import { AppScreenshot } from "@/components/website/app-screenshot";
import { Pricing } from "@/components/website/pricing";
import { FAQ } from "@/components/website/faq";
import { Footer } from "@/components/website/footer";
import { themes, fonts, stemColors } from "@/components/website/theme";

// ─── 4-Bar Structural Divider ─────────────────────────────────
const stemBarColors = ["#1B10FD", "#FF6B00", "#00CC66", "#FF3366"] as const;

function StemBars() {
  return (
    <div
      style={{
        display: "flex",
        gap: 2,
        maxWidth: 1200,
        margin: "0 auto",
        padding: "0 40px",
      }}
    >
      {stemBarColors.map((c, i) => (
        <div key={i} style={{ flex: 1, height: 3, backgroundColor: c }} />
      ))}
    </div>
  );
}

// ─── Scroll-reveal wrapper ─────────────────────────────────────
function FadeIn({
  children,
  delay = 0,
}: {
  children: React.ReactNode;
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

// ─── Feature icons — filled solid shapes ──────────────────────
function IconStems({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16">
      <rect x={0} y={1} width={16} height={3} fill={color} />
      <rect x={0} y={6} width={12} height={3} fill={color} />
      <rect x={0} y={11} width={8} height={3} fill={color} />
    </svg>
  );
}

function IconCheck({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16">
      <rect x={0} y={0} width={16} height={16} fill={color} />
      <path d="M4 8 L7 11 L12 5" stroke="#fff" strokeWidth={1.8} fill="none" strokeLinecap="square" strokeLinejoin="miter" />
    </svg>
  );
}

function IconBolt({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16">
      <polygon points="9,1 3,9 8,9 7,15 13,7 8,7" fill={color} />
    </svg>
  );
}

function IconBatch({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16">
      <rect x={0} y={0} width={16} height={4} fill={color} />
      <rect x={0} y={6} width={16} height={4} fill={color} />
      <rect x={0} y={12} width={16} height={4} fill={color} />
    </svg>
  );
}

function IconLock({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16">
      <rect x={2} y={7} width={12} height={9} fill={color} />
      <path
        d="M5 7 V5 A3 3 0 0 1 11 5 V7"
        stroke={color}
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="square"
      />
    </svg>
  );
}

function IconLink({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16">
      <rect x={0} y={5} width={6} height={6} rx={0} fill={color} />
      <rect x={10} y={5} width={6} height={6} rx={0} fill={color} />
      <rect x={5} y={7} width={6} height={2} fill={color} />
    </svg>
  );
}

// ─── Feature data ──────────────────────────────────────────────
const FEATURES = [
  {
    icon: <IconStems color={stemColors.vocals} />,
    color: stemColors.vocals,
    title: "6-Stem Separation",
    description:
      "Vocals, drums, bass, guitar, piano, other — isolate every element with precision.",
  },
  {
    icon: <IconCheck color={stemColors.drums} />,
    color: stemColors.drums,
    title: "Studio Quality",
    description:
      "MelBand RoFormer + BS-RoFormer — the best separation models available as of 2026.",
  },
  {
    icon: <IconBolt color={stemColors.bass} />,
    color: stemColors.bass,
    title: "Lightning Fast",
    description:
      "H100 GPU cluster processes a 3-minute track in under 40 seconds.",
  },
  {
    icon: <IconBatch color={stemColors.guitar} />,
    color: stemColors.guitar,
    title: "Batch Processing",
    description:
      "Upload an entire project at once. Process dozens of stems in one go.",
  },
  {
    icon: <IconLock color={stemColors.piano} />,
    color: stemColors.piano,
    title: "Private by Default",
    description:
      "Files are auto-deleted after 24 hours. Your music stays yours.",
  },
  {
    icon: <IconLink color={stemColors.other} />,
    color: stemColors.other,
    title: "URL Import",
    description:
      "Paste a SoundCloud, Dropbox, or Google Drive link — no file upload required.",
  },
] as const;

// ─── How It Works steps ───────────────────────────────────────
const HOW_IT_WORKS = [
  {
    number: "01",
    title: "Upload Your Track",
    description:
      "Drop a file or paste a URL. MP3, WAV, FLAC, and more — up to 50MB.",
  },
  {
    number: "02",
    title: "AI Processes",
    description:
      "Our GPU cluster runs two best-in-class models simultaneously for maximum quality.",
  },
  {
    number: "03",
    title: "Download Stems",
    description:
      "Get clean, individual files in WAV 24-bit or MP3 320kbps — ready for your DAW.",
  },
] as const;

// ─── Page ─────────────────────────────────────────────────────
export default function WebsiteV3() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";
  const t = isDark ? themes.dark : themes.light;

  return (
    <div style={{ backgroundColor: t.bg, minHeight: "100vh" }}>
      <Header />

      {/* ── 1. Hero ─────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: t.bg,
          paddingTop: 160,
          paddingBottom: 0,
          textAlign: "center",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 40px",
          }}
        >
          {/* Label */}
          <FadeIn>
            <p
              style={{
                fontFamily: fonts.heading,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.1em",
                color: t.textMuted,
                margin: "0 0 24px 0",
              }}
            >
              AI Stem Separation
            </p>
          </FadeIn>

          {/* Headline */}
          <FadeIn delay={0.05}>
            <h1
              style={{
                fontFamily: fonts.heading,
                fontSize: 64,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                color: t.text,
                margin: "0 0 28px 0",
                whiteSpace: "pre-line" as const,
              }}
            >
              {"Split any track.\nHear every stem."}
            </h1>
          </FadeIn>

          {/* Subheadline */}
          <FadeIn delay={0.1}>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: 18,
                color: t.textSecondary,
                maxWidth: 480,
                margin: "0 auto 40px",
                lineHeight: 1.55,
              }}
            >
              Studio-grade AI separation for producers, by producers.
            </p>
          </FadeIn>

          {/* CTAs */}
          <FadeIn delay={0.15}>
            <div
              style={{
                display: "flex",
                gap: 12,
                justifyContent: "center",
                flexWrap: "wrap" as const,
              }}
            >
              <a
                href="/app"
                style={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  backgroundColor: t.accent,
                  textDecoration: "none",
                  padding: "0 28px",
                  height: 44,
                  display: "inline-flex",
                  alignItems: "center",
                  cursor: "pointer",
                  transition: "opacity 0.15s ease",
                  whiteSpace: "nowrap" as const,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.opacity = "0.85";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
                }}
              >
                Get Started Free
              </a>
              <a
                href="#how-it-works"
                style={{
                  fontFamily: fonts.body,
                  fontSize: 14,
                  fontWeight: 600,
                  color: t.textSecondary,
                  border: `1px solid ${t.textMuted}55`,
                  backgroundColor: "transparent",
                  textDecoration: "none",
                  padding: "0 28px",
                  height: 44,
                  display: "inline-flex",
                  alignItems: "center",
                  cursor: "pointer",
                  transition: "color 0.15s ease, border-color 0.15s ease",
                  whiteSpace: "nowrap" as const,
                }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.color = t.text;
                  el.style.borderColor = t.textMuted;
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.color = t.textSecondary;
                  el.style.borderColor = `${t.textMuted}55`;
                }}
              >
                See How It Works
              </a>
            </div>
          </FadeIn>

          {/* 4-bar divider below CTAs */}
          <FadeIn delay={0.2}>
            <div style={{ marginTop: 80 }}>
              <StemBars />
            </div>
          </FadeIn>

          {/* App Screenshot */}
          <FadeIn delay={0.25}>
            <div style={{ marginTop: 60 }}>
              <AppScreenshot variant="structured" />
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── 4-Bar Divider ───────────────────────────────────── */}
      <div style={{ marginTop: 80, marginBottom: 0 }}>
        <StemBars />
      </div>

      {/* ── 2. Social Proof ─────────────────────────────────── */}
      <section style={{ backgroundColor: t.bgAlt, padding: "80px 40px" }}>
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <FadeIn>
            <p
              style={{
                fontFamily: fonts.heading,
                fontSize: 11,
                fontWeight: 700,
                textTransform: "uppercase" as const,
                letterSpacing: "0.08em",
                color: t.textMuted,
                marginBottom: 20,
              }}
            >
              Trusted by producers worldwide
            </p>
          </FadeIn>
          <FadeIn delay={0.05}>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: 15,
                color: t.textSecondary,
                maxWidth: 560,
                margin: "0 auto",
                lineHeight: 1.6,
              }}
            >
              From bedroom producers to professional studios — thousands of tracks
              separated every day.
            </p>
          </FadeIn>

          {/* Stats row */}
          <FadeIn delay={0.1}>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 80,
                marginTop: 48,
                flexWrap: "wrap" as const,
              }}
            >
              {(
                [
                  { value: "250K+", label: "Tracks processed" },
                  { value: "40s", label: "Avg. processing time" },
                  { value: "6", label: "Stems per track" },
                ] as const
              ).map((stat) => (
                <div key={stat.label} style={{ textAlign: "center" }}>
                  <div
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: 36,
                      fontWeight: 700,
                      color: t.text,
                      lineHeight: 1,
                      marginBottom: 8,
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 13,
                      color: t.textMuted,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.06em",
                    }}
                  >
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── 4-Bar Divider ───────────────────────────────────── */}
      <StemBars />

      {/* ── 3. Features Grid ────────────────────────────────── */}
      <section style={{ backgroundColor: t.bg, padding: "100px 40px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Section header */}
          <FadeIn>
            <div style={{ marginBottom: 56 }}>
              <p
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  color: t.textMuted,
                  margin: "0 0 12px 0",
                }}
              >
                Features
              </p>
              <h2
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 36,
                  fontWeight: 700,
                  color: t.text,
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                Everything you need
              </h2>
            </div>
          </FadeIn>

          {/* 3×2 grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 1,
              backgroundColor: t.bg,
            }}
          >
            {FEATURES.map((feature, i) => (
              <FadeIn key={feature.title} delay={i * 0.06}>
                <div
                  style={{
                    backgroundColor: t.bgAlt,
                    padding: "36px 32px",
                  }}
                >
                  {/* Filled icon */}
                  <div style={{ marginBottom: 16 }}>{feature.icon}</div>

                  {/* Title */}
                  <h3
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: 14,
                      fontWeight: 700,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.04em",
                      color: t.text,
                      margin: "0 0 12px 0",
                    }}
                  >
                    {feature.title}
                  </h3>

                  {/* Description */}
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      color: t.textSecondary,
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {feature.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4-Bar Divider ───────────────────────────────────── */}
      <StemBars />

      {/* ── 4. How It Works ─────────────────────────────────── */}
      <section
        id="how-it-works"
        style={{ backgroundColor: t.bgAlt, padding: "100px 40px" }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          {/* Section header */}
          <FadeIn>
            <div style={{ marginBottom: 64, textAlign: "center" }}>
              <p
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  color: t.textMuted,
                  margin: "0 0 12px 0",
                }}
              >
                Process
              </p>
              <h2
                style={{
                  fontFamily: fonts.heading,
                  fontSize: 36,
                  fontWeight: 700,
                  color: t.text,
                  margin: 0,
                  lineHeight: 1.1,
                }}
              >
                Three steps, zero friction
              </h2>
            </div>
          </FadeIn>

          {/* Steps row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 1,
              backgroundColor: t.bgAlt,
            }}
          >
            {HOW_IT_WORKS.map((step, i) => (
              <FadeIn key={step.number} delay={i * 0.08}>
                <div
                  style={{
                    backgroundColor: t.bg,
                    padding: "48px 40px",
                  }}
                >
                  {/* Large step number — visual anchor */}
                  <div
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: 72,
                      fontWeight: 700,
                      color: stemBarColors[0],
                      lineHeight: 1,
                      marginBottom: 4,
                    }}
                  >
                    {step.number}
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: 16,
                      fontWeight: 700,
                      textTransform: "uppercase" as const,
                      letterSpacing: "0.04em",
                      color: t.text,
                      margin: "20px 0 12px 0",
                    }}
                  >
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      color: t.textSecondary,
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {step.description}
                  </p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4-Bar Divider ───────────────────────────────────── */}
      <StemBars />

      {/* ── 5. Pricing ──────────────────────────────────────── */}
      <Pricing variant="structured" />

      {/* ── 6. FAQ ──────────────────────────────────────────── */}
      <FAQ />

      {/* ── 4-Bar Divider ───────────────────────────────────── */}
      <StemBars />

      {/* ── 7. Final CTA ────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: t.bg,
          padding: "120px 40px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          <FadeIn>
            <h2
              style={{
                fontFamily: fonts.heading,
                fontSize: 48,
                fontWeight: 700,
                color: t.text,
                margin: "0 0 20px 0",
                lineHeight: 1.1,
              }}
            >
              Ready to split?
            </h2>
          </FadeIn>
          <FadeIn delay={0.05}>
            <p
              style={{
                fontFamily: fonts.body,
                fontSize: 16,
                color: t.textSecondary,
                maxWidth: 400,
                margin: "0 auto 40px",
                lineHeight: 1.6,
              }}
            >
              Start for free. No credit card required. First 10 tracks on us.
            </p>
          </FadeIn>
          <FadeIn delay={0.1}>
            <a
              href="/app"
              style={{
                fontFamily: fonts.body,
                fontSize: 14,
                fontWeight: 600,
                color: "#FFFFFF",
                backgroundColor: t.accent,
                textDecoration: "none",
                padding: "0 32px",
                height: 48,
                display: "inline-flex",
                alignItems: "center",
                cursor: "pointer",
                transition: "opacity 0.15s ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.opacity = "0.85";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
              }}
            >
              Get Started Free
            </a>
          </FadeIn>
        </div>
      </section>

      <Footer />
    </div>
  );
}
