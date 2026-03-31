"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { themes, fonts, stemColors } from "@/components/website/theme";
import { Header } from "@/components/website/header";
import { Footer } from "@/components/website/footer";
import { FAQ } from "@/components/website/faq";
import { Pricing } from "@/components/website/pricing";
import { AppScreenshot } from "@/components/website/app-screenshot";

// ─── Gradient divider ─────────────────────────────────────────
function GradientDivider() {
  return (
    <div
      style={{
        height: 1,
        background:
          "linear-gradient(90deg, transparent, #1B10FD, #FF6B00, #00CC66, #FF3366, transparent)",
        maxWidth: 1200,
        margin: "0 auto",
      }}
    />
  );
}

// ─── Feature icons (line SVGs, colored per stem) ──────────────
function IconSixStem({ color }: { color: string }) {
  return (
    <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <line x1="4" y1="8" x2="24" y2="8" stroke={color} strokeWidth="1.5" />
      <line x1="4" y1="12" x2="20" y2="12" stroke={color} strokeWidth="1.5" />
      <line x1="4" y1="16" x2="22" y2="16" stroke={color} strokeWidth="1.5" />
      <line x1="4" y1="20" x2="16" y2="20" stroke={color} strokeWidth="1.5" />
      <line x1="4" y1="24" x2="12" y2="24" stroke={color} strokeWidth="1.5" />
      <circle cx="22" cy="6" r="3" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function IconQuality({ color }: { color: string }) {
  return (
    <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <path
        d="M14 4L16.5 10H23L17.75 13.5L20 20L14 16L8 20L10.25 13.5L5 10H11.5L14 4Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function IconLightning({ color }: { color: string }) {
  return (
    <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <path
        d="M16 3L8 16H14L12 25L20 12H14L16 3Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function IconBatch({ color }: { color: string }) {
  return (
    <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <rect x="4" y="6" width="14" height="10" stroke={color} strokeWidth="1.5" />
      <rect x="8" y="10" width="14" height="10" stroke={color} strokeWidth="1.5" />
      <rect x="12" y="14" width="14" height="10" stroke={color} strokeWidth="1.5" />
    </svg>
  );
}

function IconPrivacy({ color }: { color: string }) {
  return (
    <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <path
        d="M14 3L5 7V14C5 19 9 23.5 14 25C19 23.5 23 19 23 14V7L14 3Z"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function IconURL({ color }: { color: string }) {
  return (
    <svg width={28} height={28} viewBox="0 0 28 28" fill="none">
      <path
        d="M11 17L17 11M10 13H7C5.35 13 4 11.65 4 10C4 8.35 5.35 7 7 7H11"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="square"
      />
      <path
        d="M17 15H21C22.65 15 24 16.35 24 18C24 19.65 22.65 21 21 21H17"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="square"
      />
    </svg>
  );
}

const FEATURES = [
  {
    icon: IconSixStem,
    color: stemColors.vocals,
    title: "6-Stem Separation",
    desc: "Vocals, drums, bass, guitar, piano, and other — fully isolated at studio quality.",
  },
  {
    icon: IconQuality,
    color: stemColors.drums,
    title: "Studio Quality",
    desc: "MelBand RoFormer + BS-RoFormer — the highest-rated open-source separation models.",
  },
  {
    icon: IconLightning,
    color: stemColors.bass,
    title: "Lightning Fast",
    desc: "H100 GPU cluster processes a 4-minute track in under 40 seconds.",
  },
  {
    icon: IconBatch,
    color: stemColors.guitar,
    title: "Batch Processing",
    desc: "Upload an entire album at once. Process multiple tracks simultaneously.",
  },
  {
    icon: IconPrivacy,
    color: stemColors.piano,
    title: "Privacy First",
    desc: "All files auto-deleted after 24 hours. No training on your audio. Ever.",
  },
  {
    icon: IconURL,
    color: stemColors.other,
    title: "URL Import",
    desc: "Paste a YouTube or SoundCloud URL. No download required.",
  },
] as const;

const HOW_IT_WORKS = [
  {
    number: "01",
    color: stemColors.vocals,
    title: "Upload your track",
    desc: "Drop a file or paste a URL. MP3, WAV, FLAC, and more — up to 50MB.",
  },
  {
    number: "02",
    color: stemColors.drums,
    title: "Choose stem count",
    desc: "Pick 2, 4, or 6 stems. Our AI selects the best model for each configuration.",
  },
  {
    number: "03",
    color: stemColors.bass,
    title: "Download instantly",
    desc: "Your stems are ready in seconds. WAV 24-bit or MP3 320kbps.",
  },
] as const;

// ─── Main page ────────────────────────────────────────────────
export default function WebsiteV2() {
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
      {/* ── Header ───────────────────────────────────────── */}
      <Header />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: t.bg,
          paddingTop: "160px",
          paddingLeft: "40px",
          paddingRight: "40px",
          paddingBottom: "0",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Label */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              fontFamily: fonts.heading,
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: t.textMuted,
              margin: "0 0 24px 0",
            }}
          >
            AI Stem Separation
          </motion.p>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              fontFamily: fonts.heading,
              fontSize: "56px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: t.text,
              margin: "0 0 0 0",
            }}
          >
            Split any track. Hear every{" "}
            <span
              style={{
                background:
                  "linear-gradient(90deg, #1B10FD, #FF6B00, #00CC66, #FF3366)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                WebkitTextFillColor: "transparent",
                color: "transparent",
              }}
            >
              stem
            </span>
            .
          </motion.h1>

          {/* Subheadline */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              fontFamily: fonts.body,
              fontSize: "18px",
              color: t.textSecondary,
              maxWidth: "480px",
              margin: "24px auto 0",
              lineHeight: 1.5,
            }}
          >
            Studio-grade AI separation for producers, by producers.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              gap: "12px",
              marginTop: "40px",
            }}
          >
            <a
              href="/app"
              style={{
                fontFamily: fonts.body,
                fontSize: "15px",
                fontWeight: 600,
                color: "#FFFFFF",
                backgroundColor: t.accent,
                textDecoration: "none",
                padding: "0 28px",
                height: "48px",
                display: "inline-flex",
                alignItems: "center",
                cursor: "pointer",
                transition: "opacity 0.15s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.opacity = "0.85";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
              }}
            >
              Start Splitting — Free
            </a>
            <a
              href="#features"
              style={{
                fontFamily: fonts.body,
                fontSize: "15px",
                fontWeight: 500,
                color: t.textSecondary,
                textDecoration: "none",
                padding: "0 28px",
                height: "48px",
                display: "inline-flex",
                alignItems: "center",
                border: `1px solid ${t.textMuted}44`,
                cursor: "pointer",
                transition: "color 0.15s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = t.text;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = t.textSecondary;
              }}
            >
              See How It Works
            </a>
          </motion.div>

          {/* Thin gradient line divider under hero CTAs */}
          <div style={{ marginTop: "80px" }}>
            <GradientDivider />
          </div>
        </div>

        {/* App screenshot */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.32, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ marginTop: "60px", marginBottom: 0 }}
        >
          <AppScreenshot variant="pop" />
        </motion.div>
      </section>

      {/* ── Social proof bar ─────────────────────────────── */}
      <section
        style={{
          backgroundColor: t.bgAlt,
          padding: "32px 40px",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: "14px",
            color: t.textSecondary,
            margin: 0,
          }}
        >
          Trusted by{" "}
          <span style={{ color: t.text, fontWeight: 600 }}>
            2,000+ producers
          </span>{" "}
          worldwide
        </p>
      </section>

      {/* ── Gradient divider ─────────────────────────────── */}
      <GradientDivider />

      {/* ── Features ─────────────────────────────────────── */}
      <section
        id="features"
        style={{
          backgroundColor: t.bg,
          padding: "100px 40px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Section label */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              fontFamily: fonts.heading,
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: t.textMuted,
              margin: "0 0 12px 0",
            }}
          >
            Features
          </motion.p>

          {/* Section title */}
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              fontFamily: fonts.heading,
              fontSize: "36px",
              fontWeight: 700,
              color: t.text,
              margin: "0 0 56px 0",
              lineHeight: 1.1,
            }}
          >
            Everything you need
          </motion.h2>

          {/* Features grid — 3x2 */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1px",
              backgroundColor: t.bgAlt,
            }}
          >
            {FEATURES.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.6,
                    delay: index * 0.08,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  style={{
                    backgroundColor: t.bg,
                    padding: "40px 32px",
                  }}
                >
                  {/* Colored icon */}
                  <div style={{ marginBottom: "20px" }}>
                    <Icon color={feature.color} />
                  </div>

                  {/* Title */}
                  <h3
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: "14px",
                      fontWeight: 700,
                      textTransform: "uppercase",
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
                      fontSize: "14px",
                      color: t.textSecondary,
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {feature.desc}
                  </p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Gradient divider ─────────────────────────────── */}
      <GradientDivider />

      {/* ── How It Works ─────────────────────────────────── */}
      <section
        style={{
          backgroundColor: t.bgAlt,
          padding: "100px 40px",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          {/* Section label */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              fontFamily: fonts.heading,
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: t.textMuted,
              margin: "0 0 12px 0",
            }}
          >
            How It Works
          </motion.p>

          {/* Section title */}
          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              fontFamily: fonts.heading,
              fontSize: "36px",
              fontWeight: 700,
              color: t.text,
              margin: "0 0 64px 0",
              lineHeight: 1.1,
            }}
          >
            Three steps to perfect stems
          </motion.h2>

          {/* Steps container — relative so we can position the connector line */}
          <div style={{ position: "relative" }}>
            {/* Horizontal gradient connector line between steps */}
            <div
              style={{
                position: "absolute",
                top: "30px",
                left: "calc(16.66% + 16px)",
                right: "calc(16.66% + 16px)",
                height: "1px",
                background:
                  "linear-gradient(90deg, #1B10FD, #FF6B00, #00CC66)",
                pointerEvents: "none",
              }}
            />

            {/* Steps grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "40px",
              }}
            >
              {HOW_IT_WORKS.map((step, index) => (
                <motion.div
                  key={step.number}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{
                    duration: 0.6,
                    delay: index * 0.08,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                >
                  {/* Colored step number */}
                  <div
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: "32px",
                      fontWeight: 700,
                      color: step.color,
                      marginBottom: "20px",
                      lineHeight: 1,
                    }}
                  >
                    {step.number}
                  </div>

                  {/* Step title */}
                  <h3
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: "16px",
                      fontWeight: 700,
                      color: t.text,
                      margin: "0 0 12px 0",
                    }}
                  >
                    {step.title}
                  </h3>

                  {/* Step description */}
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontSize: "14px",
                      color: t.textSecondary,
                      margin: 0,
                      lineHeight: 1.6,
                    }}
                  >
                    {step.desc}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Gradient divider ─────────────────────────────── */}
      <GradientDivider />

      {/* ── Pricing ──────────────────────────────────────── */}
      <Pricing variant="pop" />

      {/* ── FAQ ──────────────────────────────────────────── */}
      <FAQ />

      {/* ── Gradient divider ─────────────────────────────── */}
      <GradientDivider />

      {/* ── Final CTA ────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: t.bg,
          padding: "120px 40px",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              fontFamily: fonts.heading,
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.1em",
              color: t.textMuted,
              margin: "0 0 20px 0",
            }}
          >
            Get Started
          </motion.p>

          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              fontFamily: fonts.heading,
              fontSize: "48px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
              color: t.text,
              margin: "0 0 16px 0",
            }}
          >
            Start splitting today.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.16, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              fontFamily: fonts.body,
              fontSize: "16px",
              color: t.textSecondary,
              margin: "0 0 40px 0",
              maxWidth: "400px",
              marginLeft: "auto",
              marginRight: "auto",
            }}
          >
            10 free tracks per month. No credit card required.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.24, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "center",
              gap: "12px",
            }}
          >
            <a
              href="/app"
              style={{
                fontFamily: fonts.body,
                fontSize: "15px",
                fontWeight: 600,
                color: "#FFFFFF",
                backgroundColor: t.accent,
                textDecoration: "none",
                padding: "0 32px",
                height: "52px",
                display: "inline-flex",
                alignItems: "center",
                cursor: "pointer",
                transition: "opacity 0.15s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.opacity = "0.85";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
              }}
            >
              Start Splitting — Free
            </a>
            <a
              href="/pricing"
              style={{
                fontFamily: fonts.body,
                fontSize: "15px",
                fontWeight: 500,
                color: t.textSecondary,
                textDecoration: "none",
                padding: "0 32px",
                height: "52px",
                display: "inline-flex",
                alignItems: "center",
                border: `1px solid ${t.textMuted}44`,
                cursor: "pointer",
                transition: "color 0.15s ease",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = t.text;
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.color = t.textSecondary;
              }}
            >
              View Pricing
            </a>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <Footer />
    </div>
  );
}
