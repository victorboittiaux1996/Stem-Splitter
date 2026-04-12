"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/website/header";
import { Pricing } from "@/components/website/pricing";
import { FAQ } from "@/components/website/faq";
import { Footer } from "@/components/website/footer";

// ─── Design tokens (light only, ElevenLabs-matched) ──────────────
const C = {
  bg: "#FFFFFF",
  bgCard: "#F5F5F5",
  bgDark: "#111111",
  text: "#000000",
  textSec: "#555555",
  textMuted: "#8C8C8C",
  border: "#E5E5E5",
  accent: "#1B10FD",
} as const;

const F = "'Futura PT', 'futura-pt', sans-serif";

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] },
};

// ─── DAW logos (text-based, monochrome) ──────────────────────────
const DAWS = [
  "Ableton Live",
  "FL Studio",
  "Logic Pro",
  "Pro Tools",
  "Cubase",
  "Studio One",
  "Reason",
  "Reaper",
  "GarageBand",
  "Bitwig",
];

// ─── Feature sub-cards (Stem Separation section) ─────────────────
const STEM_FEATURES = [
  {
    icon: "⊞",
    title: "6-Stem Separation",
    desc: "Vocals, drums, bass, guitar, piano, and other. Full isolation of every element.",
  },
  {
    icon: "◈",
    title: "WAV 24-bit Output",
    desc: "Lossless studio quality. MP3 320kbps when you need smaller files.",
  },
  {
    icon: "⊘",
    title: "Private & Secure",
    desc: "Files deleted after 24h. Your audio is never used for training.",
  },
  {
    icon: "⊟",
    title: "Batch & URL Import",
    desc: "Drop a folder or paste a YouTube / SoundCloud URL. Done.",
  },
] as const;

// ─── Feature sub-cards (Speed section) ───────────────────────────
const SPEED_FEATURES = [
  {
    icon: "△",
    title: "H100 GPU Cluster",
    desc: "Enterprise-grade GPU infrastructure built for audio processing at scale.",
  },
  {
    icon: "◎",
    title: "Under 40 Seconds",
    desc: "Most tracks processed and ready to download in under 40 seconds.",
  },
  {
    icon: "☰",
    title: "Any Format In",
    desc: "MP3, WAV, FLAC, AAC, OGG. Accepts whatever you throw at it.",
  },
  {
    icon: "↗",
    title: "Real-Time Progress",
    desc: "Live status updates from upload to separation. No guessing.",
  },
] as const;

// ─── How it works ─────────────────────────────────────────────────
const STEPS = [
  {
    n: "01",
    title: "Upload",
    desc: "Drag and drop your audio file, select a folder, or paste a YouTube / SoundCloud URL.",
  },
  {
    n: "02",
    title: "Choose",
    desc: "Select 2, 4, or 6 stems. Pick WAV lossless or MP3 as your output format.",
  },
  {
    n: "03",
    title: "Download",
    desc: "Get your separated stems individually or all at once as a ZIP. Ready for your DAW.",
  },
] as const;

// ─── Pill buttons ─────────────────────────────────────────────────
function PillPrimary({ label, href }: { label: string; href: string }) {
  const [h, setH] = useState(false);
  return (
    <a
      href={href}
      style={{
        fontFamily: F,
        fontSize: "14px",
        fontWeight: 500,
        color: "#FFFFFF",
        backgroundColor: h ? "#0E08D8" : "#1B10FD",
        textDecoration: "none",
        padding: "0 20px",
        height: "40px",
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 0,
        cursor: "pointer",
        transition: "background-color 0.15s ease",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
    >
      {label}
    </a>
  );
}

function PillOutline({
  label,
  href,
}: {
  label: string;
  href: string;
}) {
  const [h, setH] = useState(false);
  return (
    <a
      href={href}
      style={{
        fontFamily: F,
        fontSize: "14px",
        fontWeight: 400,
        color: "#000",
        backgroundColor: h ? "#F5F5F5" : "#FFFFFF",
        border: "1px solid #D4D4D4",
        textDecoration: "none",
        padding: "0 20px",
        height: "40px",
        display: "inline-flex",
        alignItems: "center",
        borderRadius: 0,
        cursor: "pointer",
        transition: "background-color 0.15s ease",
        whiteSpace: "nowrap",
      }}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
    >
      {label}
    </a>
  );
}

// ─── Section label ────────────────────────────────────────────────
function SectionLabel({ text }: { text: string }) {
  return (
    <p
      style={{
        fontFamily: F,
        fontSize: "13px",
        fontWeight: 500,
        color: C.textMuted,
        margin: "0 0 20px 0",
        letterSpacing: "0.01em",
      }}
    >
      {text}
    </p>
  );
}

// ─── 2-col section header (ElevenLabs pattern) ───────────────────
function SectionHeader({
  label,
  headline,
  description,
  cta,
}: {
  label: string;
  headline: React.ReactNode;
  description: string;
  cta?: { label: string; href: string };
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: "80px",
        marginBottom: "56px",
      }}
    >
      {/* Left: label + headline + CTA */}
      <div style={{ flex: "0 0 42%" }}>
        <SectionLabel text={label} />
        <h2
          style={{
            fontFamily: F,
            fontSize: "48px",
            fontWeight: 300,
            color: C.text,
            margin: "0",
            lineHeight: "52px",
            letterSpacing: "-0.01em",
          }}
        >
          {headline}
        </h2>
        {cta && (
          <div style={{ marginTop: "32px" }}>
            <PillPrimary label={cta.label} href={cta.href} />
          </div>
        )}
      </div>
      {/* Right: description */}
      <div style={{ flex: 1, paddingTop: "6px" }}>
        <p
          style={{
            fontFamily: F,
            fontSize: "16px",
            fontWeight: 300,
            color: C.textSec,
            lineHeight: 1.65,
            margin: 0,
          }}
        >
          {description}
        </p>
      </div>
    </div>
  );
}

// ─── Sub-feature card ─────────────────────────────────────────────
function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: string;
  title: string;
  desc: string;
}) {
  return (
    <div
      style={{
        backgroundColor: C.bgCard,
        borderRadius: 0,
        padding: "28px 24px",
      }}
    >
      <span
        style={{
          fontSize: "18px",
          display: "block",
          marginBottom: "16px",
          color: C.textMuted,
        }}
      >
        {icon}
      </span>
      <h4
        style={{
          fontFamily: F,
          fontSize: "13px",
          fontWeight: 600,
          color: C.text,
          margin: "0 0 8px 0",
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        {title}
      </h4>
      <p
        style={{
          fontFamily: F,
          fontSize: "13px",
          fontWeight: 300,
          color: C.textSec,
          lineHeight: 1.55,
          margin: 0,
        }}
      >
        {desc}
      </p>
    </div>
  );
}

// ─── Waveform placeholder visual ─────────────────────────────────
function WaveformPlaceholder({ dark = false }: { dark?: boolean }) {
  const bg = dark ? "#0A0A0A" : C.bgCard;
  const barColors = ["#1B10FD", "#FF6B00", "#00CC66", "#FF3366", "#00BBFF", "#777777"];
  return (
    <div
      style={{
        backgroundColor: bg,
        borderRadius: 0,
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        minHeight: "280px",
        justifyContent: "flex-end",
      }}
    >
      {barColors.map((color, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: i < barColors.length - 1 ? "10px" : "0",
          }}
        >
          <span
            style={{
              fontFamily: F,
              fontSize: "10px",
              fontWeight: 500,
              color: dark ? "#555" : "#999",
              width: "52px",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              flexShrink: 0,
            }}
          >
            {["Vocals", "Drums", "Bass", "Guitar", "Piano", "Other"][i]}
          </span>
          <div
            style={{
              flex: 1,
              height: "20px",
              backgroundColor: `${color}20`,
              borderRadius: 0,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                height: "100%",
                width: `${[72, 88, 60, 45, 38, 55][i]}%`,
                backgroundColor: `${color}60`,
                borderRadius: 0,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Speed visual placeholder ─────────────────────────────────────
function SpeedPlaceholder({ dark = false }: { dark?: boolean }) {
  const bg = dark ? "#0A0A0A" : C.bgCard;
  return (
    <div
      style={{
        backgroundColor: bg,
        borderRadius: 0,
        padding: "32px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "flex-start",
        height: "100%",
        minHeight: "280px",
        gap: "20px",
      }}
    >
      {[
        { label: "Upload", pct: 100, color: "#555" },
        { label: "Processing", pct: 68, color: "#1B10FD" },
        { label: "Download ready", pct: 0, color: "#00CC66" },
      ].map((step, i) => (
        <div key={i} style={{ width: "100%" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "6px",
            }}
          >
            <span
              style={{
                fontFamily: F,
                fontSize: "12px",
                fontWeight: 400,
                color: dark ? "#888" : "#555",
              }}
            >
              {step.label}
            </span>
            {step.pct > 0 && (
              <span
                style={{
                  fontFamily: F,
                  fontSize: "12px",
                  fontWeight: 500,
                  color: step.color,
                }}
              >
                {step.pct}%
              </span>
            )}
          </div>
          <div
            style={{
              height: "3px",
              backgroundColor: dark ? "#222" : "#E5E5E5",
              borderRadius: 0,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${step.pct}%`,
                backgroundColor: step.color,
                borderRadius: 0,
              }}
            />
          </div>
        </div>
      ))}
      <div
        style={{
          marginTop: "8px",
          padding: "12px 16px",
          backgroundColor: dark ? "#1a1a1a" : "#FFFFFF",
          borderRadius: 0,
          border: `1px solid ${dark ? "#2a2a2a" : "#E5E5E5"}`,
          width: "100%",
        }}
      >
        <span
          style={{
            fontFamily: F,
            fontSize: "12px",
            fontWeight: 500,
            color: dark ? "#888" : "#555",
          }}
        >
          ⏱ Average processing time:{" "}
          <span style={{ color: dark ? "#FFF" : "#000", fontWeight: 600 }}>
            38 seconds
          </span>
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function WebsiteV1() {
  return (
    <div style={{ backgroundColor: C.bg, minHeight: "100vh" }}>
      {/* ── 1. NAV ── */}
      <Header />

      {/* ── 2. HERO ── */}
      <section style={{ backgroundColor: C.bg }}>
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            padding: "120px 40px 0",
          }}
        >
          {/* 2-col: headline+CTAs left / description right */}
          <motion.div
            {...fadeUp}
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "80px",
            }}
          >
            {/* Left */}
            <div style={{ flex: "0 0 42%" }}>
              <h1
                style={{
                  fontFamily: F,
                  fontSize: "48px",
                  fontWeight: 300,
                  color: C.text,
                  lineHeight: "52px",
                  letterSpacing: "-0.01em",
                  margin: 0,
                }}
              >
                Split any track. Hear every stem.
              </h1>
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  marginTop: "32px",
                }}
              >
                <PillPrimary label="Get Started Free" href="/app" />
                <PillOutline label="Contact sales" href="#" />
              </div>
            </div>

            {/* Right */}
            <div style={{ flex: 1, paddingTop: "6px" }}>
              <p
                style={{
                  fontFamily: F,
                  fontSize: "16px",
                  fontWeight: 300,
                  color: C.textSec,
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                Powering producers, beatmakers, and engineers worldwide. From vocal extraction to full 6-stem separation — studio-grade results in seconds.
              </p>
            </div>
          </motion.div>

          {/* Demo card */}
          <motion.div
            {...fadeUp}
            style={{ marginTop: "48px", paddingBottom: "80px" }}
          >
            <div
              style={{
                backgroundColor: C.bgCard,
                borderRadius: 0,
                overflow: "hidden",
                height: "420px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Card header bar */}
              <div
                style={{
                  padding: "16px 24px",
                  borderBottom: `1px solid ${C.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: C.accent,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: F,
                      fontSize: "13px",
                      fontWeight: 500,
                      color: C.text,
                    }}
                  >
                    44Stems — Stem Separator
                  </span>
                </div>
                <span
                  style={{
                    fontFamily: F,
                    fontSize: "12px",
                    color: C.textMuted,
                  }}
                >
                  Séparation de stems
                </span>
              </div>

              {/* Card body: waveform left + stem labels right */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  gap: "0",
                  overflow: "hidden",
                }}
              >
                {/* Left: dark waveform area */}
                <div
                  style={{
                    flex: "0 0 58%",
                    backgroundColor: "#0D0D0D",
                    padding: "32px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "flex-end",
                    gap: "12px",
                  }}
                >
                  {["#1B10FD", "#FF6B00", "#00CC66", "#FF3366", "#00BBFF", "#777777"].map(
                    (color, i) => (
                      <div
                        key={i}
                        style={{ display: "flex", alignItems: "center", gap: "10px" }}
                      >
                        <span
                          style={{
                            fontFamily: F,
                            fontSize: "9px",
                            fontWeight: 600,
                            color: "#444",
                            width: "44px",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                            flexShrink: 0,
                          }}
                        >
                          {["Vocals", "Drums", "Bass", "Guitar", "Piano", "Other"][i]}
                        </span>
                        <div
                          style={{
                            flex: 1,
                            height: "24px",
                            backgroundColor: `${color}18`,
                            borderRadius: 0,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${[75, 90, 62, 48, 40, 55][i]}%`,
                              background: `linear-gradient(90deg, ${color}80, ${color}30)`,
                              borderRadius: 0,
                            }}
                          />
                        </div>
                      </div>
                    )
                  )}
                </div>

                {/* Right: stem download list */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: "#F8F8F8",
                    padding: "24px",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    gap: "0",
                  }}
                >
                  <p
                    style={{
                      fontFamily: F,
                      fontSize: "11px",
                      fontWeight: 600,
                      color: C.textMuted,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: "16px",
                    }}
                  >
                    Ready to download
                  </p>
                  {[
                    { name: "Vocals", color: "#1B10FD", size: "12.4 MB" },
                    { name: "Drums", color: "#FF6B00", size: "18.7 MB" },
                    { name: "Bass", color: "#00CC66", size: "9.2 MB" },
                    { name: "Guitar", color: "#FF3366", size: "14.1 MB" },
                    { name: "Piano", color: "#00BBFF", size: "7.8 MB" },
                    { name: "Other", color: "#777777", size: "5.3 MB" },
                  ].map((stem) => (
                    <div
                      key={stem.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "9px 0",
                        borderBottom: `1px solid ${C.border}`,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            backgroundColor: stem.color,
                            flexShrink: 0,
                          }}
                        />
                        <span
                          style={{
                            fontFamily: F,
                            fontSize: "13px",
                            fontWeight: 400,
                            color: C.text,
                          }}
                        >
                          {stem.name}
                        </span>
                      </div>
                      <span
                        style={{
                          fontFamily: F,
                          fontSize: "11px",
                          color: C.textMuted,
                        }}
                      >
                        {stem.size}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── 3. TRUSTED BY ── */}
      <section style={{ backgroundColor: C.bg, padding: "0 40px 80px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <div
            style={{
              borderTop: `1px solid ${C.border}`,
              paddingTop: "48px",
            }}
          >
            {/* Row: text left + link right */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "32px",
              }}
            >
              <p
                style={{
                  fontFamily: F,
                  fontSize: "14px",
                  fontWeight: 300,
                  color: C.textMuted,
                  margin: 0,
                }}
              >
                Trusted by producers using the world's leading DAWs
              </p>
              <a
                href="#"
                style={{
                  fontFamily: F,
                  fontSize: "13px",
                  fontWeight: 400,
                  color: C.textMuted,
                  textDecoration: "none",
                  padding: "6px 14px",
                  border: `1px solid ${C.border}`,
                  borderRadius: 0,
                  transition: "color 0.15s ease",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = C.text;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = C.textMuted;
                }}
              >
                See all integrations
              </a>
            </div>

            {/* Logo grid: 5 per row × 2 rows */}
            <div
              style={{
                border: `1px solid ${C.border}`,
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
              }}
            >
              {DAWS.map((daw, i) => (
                <div
                  key={daw}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "28px 16px",
                    borderRight:
                      (i + 1) % 5 !== 0 ? `1px solid ${C.border}` : "none",
                    borderBottom: i < 5 ? `1px solid ${C.border}` : "none",
                  }}
                >
                  <span
                    style={{
                      fontFamily: F,
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "#C0C0C0",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      textAlign: "center",
                    }}
                  >
                    {daw}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. STEM SEPARATION DEEP-DIVE ── */}
      <section style={{ backgroundColor: C.bg, padding: "100px 40px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <SectionHeader
            label="Stem Separation"
            headline={
              <>
                Every element.
                <br />
                Separated perfectly.
              </>
            }
            description="From vocal isolation to full 6-stem breakdown. 44Stems isolates vocals, drums, bass, guitar, piano, and other with studio-grade precision — the same quality professionals use in post-production."
            cta={{ label: "Try it free", href: "/app" }}
          />

          {/* Visual: 2-col cards */}
          <motion.div
            {...fadeUp}
            style={{ display: "flex", gap: "12px", marginBottom: "12px" }}
          >
            {/* Left: large dark card with waveform */}
            <div style={{ flex: "0 0 58%" }}>
              <WaveformPlaceholder dark />
            </div>
            {/* Right: light card with stem specs */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  backgroundColor: C.bgCard,
                  borderRadius: 0,
                  padding: "32px",
                  height: "100%",
                  minHeight: "280px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "0",
                }}
              >
                <p
                  style={{
                    fontFamily: F,
                    fontSize: "11px",
                    fontWeight: 600,
                    color: C.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "20px",
                  }}
                >
                  Output quality
                </p>
                {[
                  { label: "WAV 24-bit lossless", badge: "Studio" },
                  { label: "MP3 320kbps", badge: "Compact" },
                  { label: "6-stem breakdown", badge: "Full" },
                  { label: "2 & 4 stem modes", badge: "Quick" },
                ].map((item) => (
                  <div
                    key={item.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: `1px solid ${C.border}`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: F,
                        fontSize: "14px",
                        fontWeight: 300,
                        color: C.text,
                      }}
                    >
                      {item.label}
                    </span>
                    <span
                      style={{
                        fontFamily: F,
                        fontSize: "11px",
                        fontWeight: 500,
                        color: C.textMuted,
                        backgroundColor: "#EFEFEF",
                        padding: "3px 10px",
                        borderRadius: 0,
                      }}
                    >
                      {item.badge}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Sub-feature cards: 4-col */}
          <motion.div
            {...fadeUp}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "12px",
            }}
          >
            {STEM_FEATURES.map((f) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 5. SPEED & QUALITY DEEP-DIVE ── */}
      <section style={{ backgroundColor: C.bgCard, padding: "100px 40px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <SectionHeader
            label="Processing"
            headline={
              <>
                From upload to download.
                <br />
                In seconds.
              </>
            }
            description="H100 GPU cluster processes most tracks in under 40 seconds. WAV 24-bit lossless or MP3 320kbps output. Real-time progress tracking from queue to completion."
            cta={{ label: "Upload a track", href: "/app" }}
          />

          {/* Visual: 2-col cards */}
          <motion.div
            {...fadeUp}
            style={{ display: "flex", gap: "12px", marginBottom: "12px" }}
          >
            {/* Left: dark speed visual */}
            <div style={{ flex: "0 0 58%" }}>
              <SpeedPlaceholder dark />
            </div>
            {/* Right: GPU / format specs */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  backgroundColor: "#ECECEC",
                  borderRadius: 0,
                  padding: "32px",
                  height: "100%",
                  minHeight: "280px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "0",
                }}
              >
                <p
                  style={{
                    fontFamily: F,
                    fontSize: "11px",
                    fontWeight: 600,
                    color: C.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    marginBottom: "20px",
                  }}
                >
                  Infrastructure
                </p>
                {[
                  { label: "GPU model", value: "H100 80GB" },
                  { label: "Avg. separation time", value: "< 40s" },
                  { label: "Formats accepted", value: "MP3, WAV, FLAC, AAC" },
                  { label: "Max file size", value: "200 MB" },
                ].map((row) => (
                  <div
                    key={row.label}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px 0",
                      borderBottom: `1px solid #D8D8D8`,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: F,
                        fontSize: "14px",
                        fontWeight: 300,
                        color: C.textSec,
                      }}
                    >
                      {row.label}
                    </span>
                    <span
                      style={{
                        fontFamily: F,
                        fontSize: "13px",
                        fontWeight: 500,
                        color: C.text,
                      }}
                    >
                      {row.value}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Sub-feature cards: 4-col */}
          <motion.div
            {...fadeUp}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: "12px",
            }}
          >
            {SPEED_FEATURES.map((f) => (
              <FeatureCard key={f.title} icon={f.icon} title={f.title} desc={f.desc} />
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 6. HOW IT WORKS ── */}
      <section style={{ backgroundColor: C.bg, padding: "100px 40px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <SectionHeader
            label="Process"
            headline={
              <>
                Three steps.
                <br />
                Zero friction.
              </>
            }
            description="Upload, choose your stem count, download. That's it. No account required to try — start separating in seconds."
          />

          <motion.div
            {...fadeUp}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "48px",
              borderTop: `1px solid ${C.border}`,
              paddingTop: "48px",
            }}
          >
            {STEPS.map((step) => (
              <div key={step.n}>
                <span
                  style={{
                    fontFamily: F,
                    fontSize: "48px",
                    fontWeight: 300,
                    color: "#D8D8D8",
                    display: "block",
                    lineHeight: 1,
                    marginBottom: "24px",
                  }}
                >
                  {step.n}
                </span>
                <h3
                  style={{
                    fontFamily: F,
                    fontSize: "16px",
                    fontWeight: 600,
                    color: C.text,
                    margin: "0 0 12px 0",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  {step.title}
                </h3>
                <p
                  style={{
                    fontFamily: F,
                    fontSize: "14px",
                    fontWeight: 300,
                    color: C.textSec,
                    lineHeight: 1.6,
                    margin: 0,
                  }}
                >
                  {step.desc}
                </p>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── 7. PRICING ── */}
      <Pricing variant="minimal" />

      {/* ── 8. FAQ ── */}
      <FAQ />

      {/* ── 9. FINAL CTA ── */}
      <section style={{ backgroundColor: C.bgCard, padding: "100px 40px" }}>
        <motion.div
          {...fadeUp}
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            textAlign: "center",
          }}
        >
          <h2
            style={{
              fontFamily: F,
              fontSize: "56px",
              fontWeight: 300,
              color: C.text,
              lineHeight: "60px",
              letterSpacing: "-0.01em",
              margin: "0 auto 16px",
              maxWidth: "720px",
            }}
          >
            The studio-grade stem separator.
          </h2>
          <p
            style={{
              fontFamily: F,
              fontSize: "16px",
              fontWeight: 300,
              color: C.textSec,
              margin: "0 auto 40px",
              maxWidth: "480px",
              lineHeight: 1.6,
            }}
          >
            Built by producers, for producers. Start for free — no credit card required.
          </p>
          <div
            style={{
              display: "flex",
              gap: "10px",
              justifyContent: "center",
            }}
          >
            <PillPrimary label="Get Started Free" href="/app" />
            <PillOutline label="Contact sales" href="#" />
          </div>
        </motion.div>
      </section>

      {/* ── 10. FOOTER ── */}
      <Footer />
    </div>
  );
}
