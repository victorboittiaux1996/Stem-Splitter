"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { Header } from "@/components/website/header";
import { AppScreenshot } from "@/components/website/app-screenshot";
import { Pricing } from "@/components/website/pricing";
import { FAQ } from "@/components/website/faq";
import { Footer } from "@/components/website/footer";
import { themes, fonts } from "@/components/website/theme";

// ─── Framer Motion preset ─────────────────────────────────────
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-50px" },
  transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
};

// ─── Feature icons (simple geometric SVGs, stroke 0.7, 14×14) ─
function IconStems({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <line x1="1" y1="3" x2="13" y2="3" stroke={color} strokeWidth="0.7" />
      <line x1="1" y1="7" x2="13" y2="7" stroke={color} strokeWidth="0.7" />
      <line x1="1" y1="11" x2="13" y2="11" stroke={color} strokeWidth="0.7" />
    </svg>
  );
}

function IconCheck({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="12" stroke={color} strokeWidth="0.7" />
      <polyline points="3.5,7 6,9.5 10.5,4.5" stroke={color} strokeWidth="0.7" />
    </svg>
  );
}

function IconBolt({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <polyline points="8,1 4,7.5 7,7.5 6,13 10,6.5 7,6.5" stroke={color} strokeWidth="0.7" />
    </svg>
  );
}

function IconBatch({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <rect x="1" y="1" width="12" height="3.5" stroke={color} strokeWidth="0.7" />
      <rect x="1" y="5.25" width="12" height="3.5" stroke={color} strokeWidth="0.7" />
      <rect x="1" y="9.5" width="12" height="3.5" stroke={color} strokeWidth="0.7" />
    </svg>
  );
}

function IconLock({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <rect x="2" y="6.5" width="10" height="7" stroke={color} strokeWidth="0.7" />
      <path d="M4 6.5V4.5a3 3 0 0 1 6 0v2" stroke={color} strokeWidth="0.7" fill="none" />
    </svg>
  );
}

function IconLink({ color }: { color: string }) {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none">
      <path d="M5.5 8.5a3.5 3.5 0 0 0 3 1.5 3.5 3.5 0 1 0 0-7H7" stroke={color} strokeWidth="0.7" fill="none" />
      <path d="M8.5 5.5a3.5 3.5 0 0 0-3-1.5 3.5 3.5 0 1 0 0 7H7" stroke={color} strokeWidth="0.7" fill="none" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: IconStems,
    title: "6-Stem Separation",
    description:
      "Isolate vocals, drums, bass, guitar, piano, and other. Full control over every element of the mix.",
  },
  {
    icon: IconCheck,
    title: "Studio Quality",
    description:
      "WAV 24-bit lossless output. MP3 320kbps when you need smaller files. No compromise.",
  },
  {
    icon: IconBolt,
    title: "Lightning Fast",
    description:
      "H100 GPU cluster processes most tracks in under 40 seconds. Real-time progress tracking.",
  },
  {
    icon: IconBatch,
    title: "Batch Processing",
    description:
      "Drop an entire folder. Every track is queued and processed automatically.",
  },
  {
    icon: IconLock,
    title: "Privacy First",
    description:
      "Your files are deleted after 24 hours. We never use your audio for training.",
  },
  {
    icon: IconLink,
    title: "URL Import",
    description:
      "Paste a YouTube or SoundCloud URL. We handle the download and separation.",
  },
] as const;

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Upload",
    description:
      "Drag and drop your audio file, select a folder, or paste a YouTube/SoundCloud URL.",
  },
  {
    step: "02",
    title: "Choose",
    description: "Select 2, 4, or 6 stems. Pick WAV or MP3 output format.",
  },
  {
    step: "03",
    title: "Download",
    description:
      "Get your separated stems individually or all at once. Ready for your DAW.",
  },
] as const;

export default function WebsiteV1() {
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
      {/* 1. Header */}
      <Header />

      {/* 2 + 3. Hero + App Screenshot */}
      <section style={{ backgroundColor: t.bg }}>
        <motion.div
          {...fadeUp}
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "160px 40px 80px",
          }}
        >
          {/* Label */}
          <p
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
          </p>

          {/* 2-col split: headline+CTAs left, description right — ElevenLabs layout */}
          <div style={{ display: "flex", alignItems: "flex-end", gap: "80px" }}>
            {/* Left col: headline + CTAs */}
            <div style={{ flex: "0 0 auto", maxWidth: "600px" }}>
              <h1
                style={{
                  fontFamily: fonts.heading,
                  fontSize: "64px",
                  fontWeight: 700,
                  letterSpacing: "-0.03em",
                  color: t.text,
                  lineHeight: 1.05,
                  margin: "0",
                  whiteSpace: "pre-line",
                }}
              >
                {"Split any track.\nHear every stem."}
              </h1>

              {/* CTAs */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap: "12px",
                  marginTop: "40px",
                }}
              >
                <PrimaryButton label="Get Started Free" href="/app" />
                <SecondaryButton
                  label="See How It Works"
                  href="#how-it-works"
                  borderColor={`${t.textMuted}33`}
                  textColor={t.text}
                />
              </div>
            </div>

            {/* Right col: description — aligns to bottom of headline block */}
            <div style={{ flex: 1, paddingBottom: "4px" }}>
              <p
                style={{
                  fontFamily: fonts.body,
                  fontSize: "18px",
                  color: t.textSecondary,
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                Powering producers, beatmakers, and engineers worldwide. From vocal extraction to full 6-stem separation — studio-grade results in seconds.
              </p>
            </div>
          </div>
        </motion.div>

        {/* App Screenshot */}
        <motion.div
          {...fadeUp}
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "0 40px 100px",
          }}
        >
          <AppScreenshot variant="minimal" />
        </motion.div>
      </section>

      {/* 4. Social Proof Bar */}
      <section style={{ backgroundColor: t.bgAlt, padding: "40px" }}>
        <motion.div {...fadeUp} style={{ textAlign: "center" }}>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "14px",
              color: t.textMuted,
              margin: "0 0 8px 0",
            }}
          >
            Trusted by 2,000+ producers worldwide
          </p>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "13px",
              color: t.textMuted,
              margin: 0,
            }}
          >
            <span
              style={{
                marginRight: "8px",
                letterSpacing: "0.04em",
              }}
            >
              Works with
            </span>
            Ableton · FL Studio · Logic Pro · Pro Tools
          </p>
        </motion.div>
      </section>

      {/* 5. Features Grid */}
      <section style={{ backgroundColor: t.bg, padding: "100px 40px" }}>
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
          }}
        >
          <motion.div {...fadeUp} style={{ marginBottom: "60px", textAlign: "center" }}>
            <p
              style={{
                fontFamily: fonts.heading,
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: t.textMuted,
                margin: "0 0 16px 0",
              }}
            >
              Features
            </p>
            <h2
              style={{
                fontFamily: fonts.heading,
                fontSize: "36px",
                fontWeight: 700,
                color: t.text,
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              Everything you need
            </h2>
          </motion.div>

          {/* 3×2 grid with 1px gap (bg bleeds through as separator) */}
          <motion.div
            {...fadeUp}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "1px",
              backgroundColor: t.bg,
            }}
          >
            {FEATURES.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  style={{
                    backgroundColor: t.bgAlt,
                    padding: "40px",
                  }}
                >
                  <Icon color={t.textMuted} />
                  <h3
                    style={{
                      fontFamily: fonts.heading,
                      fontSize: "14px",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      color: t.text,
                      margin: "16px 0 0 0",
                    }}
                  >
                    {feature.title}
                  </h3>
                  <p
                    style={{
                      fontFamily: fonts.body,
                      fontSize: "14px",
                      color: t.textSecondary,
                      lineHeight: 1.5,
                      margin: "8px 0 0 0",
                    }}
                  >
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </motion.div>
        </div>
      </section>

      {/* 6. How It Works */}
      <section
        id="how-it-works"
        style={{ backgroundColor: t.bgAlt, padding: "100px 40px" }}
      >
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <motion.div {...fadeUp} style={{ marginBottom: "60px", textAlign: "center" }}>
            <p
              style={{
                fontFamily: fonts.heading,
                fontSize: "11px",
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: t.textMuted,
                margin: "0 0 16px 0",
              }}
            >
              How It Works
            </p>
            <h2
              style={{
                fontFamily: fonts.heading,
                fontSize: "36px",
                fontWeight: 700,
                color: t.text,
                margin: 0,
                lineHeight: 1.1,
              }}
            >
              Three steps. Zero friction.
            </h2>
          </motion.div>

          <motion.div
            {...fadeUp}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "40px",
            }}
          >
            {HOW_IT_WORKS.map((step) => (
              <div key={step.step}>
                <span
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: "48px",
                    fontWeight: 700,
                    color: t.textMuted,
                    display: "block",
                    lineHeight: 1,
                  }}
                >
                  {step.step}
                </span>
                <h3
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: "16px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.04em",
                    color: t.text,
                    margin: "20px 0 0 0",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontFamily: fonts.body,
                    fontSize: "14px",
                    color: t.textSecondary,
                    lineHeight: 1.5,
                    margin: "8px 0 0 0",
                  }}
                >
                  {step.description}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* 7. Pricing */}
      <Pricing variant="minimal" />

      {/* 8. FAQ */}
      <FAQ />

      {/* 9. Final CTA */}
      <section style={{ backgroundColor: t.bg, padding: "120px 40px" }}>
        <motion.div {...fadeUp} style={{ textAlign: "center" }}>
          <h2
            style={{
              fontFamily: fonts.heading,
              fontSize: "48px",
              fontWeight: 700,
              color: t.text,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Ready to split?
          </h2>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: "16px",
              color: t.textSecondary,
              margin: "16px 0 0 0",
            }}
          >
            Start separating stems in seconds. No credit card required.
          </p>
          <div style={{ marginTop: "32px" }}>
            <PrimaryButton label="Get Started Free" href="/app" />
          </div>
        </motion.div>
      </section>

      {/* 10. Footer */}
      <Footer />
    </div>
  );
}

// ─── Button components ────────────────────────────────────────

function PrimaryButton({ label, href }: { label: string; href: string }) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      style={{
        fontFamily: fonts.body,
        fontSize: "14px",
        fontWeight: 600,
        color: "#FFFFFF",
        backgroundColor: "#1B10FD",
        textDecoration: "none",
        padding: "14px 28px",
        borderRadius: 0,
        display: "inline-flex",
        alignItems: "center",
        cursor: "pointer",
        opacity: hovered ? 0.85 : 1,
        transition: "opacity 0.15s ease",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </a>
  );
}

function SecondaryButton({
  label,
  href,
  borderColor,
  textColor,
}: {
  label: string;
  href: string;
  borderColor: string;
  textColor: string;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <a
      href={href}
      style={{
        fontFamily: fonts.body,
        fontSize: "14px",
        fontWeight: 500,
        color: textColor,
        backgroundColor: "transparent",
        border: `1px solid ${borderColor}`,
        textDecoration: "none",
        padding: "14px 28px",
        borderRadius: 0,
        display: "inline-flex",
        alignItems: "center",
        cursor: "pointer",
        opacity: hovered ? 0.7 : 1,
        transition: "opacity 0.15s ease",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </a>
  );
}
