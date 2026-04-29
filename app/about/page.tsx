"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Header } from "@/components/website/header";
import { Footer } from "@/components/website/footer";
import { fonts } from "@/components/website/theme";

const C = {
  bg: "#FFFFFF",
  text: "#000000",
  textLight: "#333333",
  textMuted: "#666666",
  accent: "#1B10FD",
  border: "#E5E5E5",
} as const;

const F = fonts.body;

function Container({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 40px" }}>
      {children}
    </div>
  );
}

function FadeIn({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay }}
    >
      {children}
    </motion.div>
  );
}

export default function AboutPage() {
  return (
    <div style={{ backgroundColor: C.bg, minHeight: "100vh" }}>
      <Header />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 64 }}>
        <Container>
          <FadeIn>
            <p style={{ fontFamily: F, fontSize: 13, color: C.textMuted, margin: "0 0 16px 0", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Company
            </p>
            <h1
              style={{
                fontFamily: fonts.heading,
                fontSize: 48,
                fontWeight: 700,
                color: C.text,
                margin: "0 0 24px 0",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              About 44Stems
            </h1>
            <p
              style={{
                fontFamily: F,
                fontSize: 18,
                color: C.textLight,
                margin: 0,
                lineHeight: 1.65,
                maxWidth: 600,
              }}
            >
              AI stem separation built by producers, for producers.
            </p>
          </FadeIn>
        </Container>
      </section>

      {/* Body */}
      <section style={{ paddingBottom: 120 }}>
        <Container>
          <div style={{ fontFamily: F, fontSize: 15, color: C.textLight, lineHeight: 1.75, display: "flex", flexDirection: "column", gap: 48 }}>

            {/* Mission */}
            <FadeIn delay={0.05}>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 40 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  Mission
                </h2>
                <p>
                  We built 44Stems because we were tired of tools that sound like they were made by engineers who never produced a track. Stem separation should be fast, clean, and not require a PhD to configure. Drag in a file. Get your stems. Done.
                </p>
                <p style={{ marginTop: 12 }}>
                  Our mission is to give every producer — bedroom beatmaker to major-label engineer — access to professional-grade stem isolation without friction or compromise.
                </p>
              </div>
            </FadeIn>

            {/* What We Do */}
            <FadeIn delay={0.1}>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 40 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  What We Do
                </h2>
                <p>
                  44Stems uses state-of-the-art machine learning models to separate any audio file into clean, isolated stems: vocals, drums, bass, piano, guitar, and more. Separation runs on H100 GPUs in the cloud — the same hardware used for frontier AI research — so you get results that are accurate and fast.
                </p>
                <p style={{ marginTop: 12 }}>
                  You can upload audio files directly from your computer, import tracks from Dropbox, Google Drive, or SoundCloud, and download your stems as lossless WAV files. Everything runs in your browser. No plugins, no installs.
                </p>
              </div>
            </FadeIn>

            {/* Values */}
            <FadeIn delay={0.15}>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 40 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  Our Values
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
                  {[
                    {
                      title: "Ownership",
                      body: "Your music is yours. We never use your audio files to train or fine-tune AI models — ours or anyone else's. Files are automatically deleted after 30 days. You can delete them manually at any time.",
                    },
                    {
                      title: "Quality",
                      body: "We run the best open-source separation models on H100 GPUs. We benchmark continuously against alternatives and only ship what passes our own ears. Good enough is not enough.",
                    },
                    {
                      title: "Simplicity",
                      body: "Drag a file. Get stems. No configuration panels, no obscure presets, no unnecessary decisions. The complexity lives in the model, not in the interface.",
                    },
                  ].map((v) => (
                    <div key={v.title} className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-2 md:gap-6">
                      <span style={{ fontFamily: fonts.heading, fontWeight: 700, color: C.text, fontSize: 15 }}>{v.title}</span>
                      <p style={{ margin: 0 }}>{v.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* Contact */}
            <FadeIn delay={0.2}>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 40 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  Get In Touch
                </h2>
                <p>
                  Questions, feedback, press inquiries — reach us at{" "}
                  <a href="mailto:hello@44stems.com" style={{ color: C.accent, textDecoration: "none" }}>
                    hello@44stems.com
                  </a>. We read everything.
                </p>
              </div>
            </FadeIn>

          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
