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
  codeBg: "#F5F5F5",
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

const h2Style = {
  fontFamily: fonts.heading,
  fontSize: 22,
  fontWeight: 700,
  color: C.text,
  margin: "0 0 16px 0",
  letterSpacing: "-0.01em",
} as const;

const sectionWrapperStyle = {
  borderTop: `1px solid ${C.border}`,
  paddingTop: 40,
} as const;

export default function DownloadBeforeUploadPage() {
  return (
    <div style={{ backgroundColor: C.bg, minHeight: "100vh" }}>
      <Header />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 64 }}>
        <Container>
          <FadeIn>
            <p style={{ fontFamily: F, fontSize: 13, color: C.textMuted, margin: "0 0 16px 0", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Guide
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
              Importing from YouTube, Spotify or Deezer
            </h1>
            <p
              style={{
                fontFamily: F,
                fontSize: 18,
                color: C.textLight,
                margin: 0,
                lineHeight: 1.65,
                maxWidth: 640,
              }}
            >
              We no longer accept streaming links directly. Download the audio locally first, then upload the file — it takes 30 seconds and it keeps everyone on the right side of the law.
            </p>
          </FadeIn>
        </Container>
      </section>

      {/* Body */}
      <section style={{ paddingBottom: 120 }}>
        <Container>
          <div style={{ fontFamily: F, fontSize: 15, color: C.textLight, lineHeight: 1.75, display: "flex", flexDirection: "column", gap: 48 }}>

            {/* Why */}
            <FadeIn delay={0.05}>
              <div style={sectionWrapperStyle}>
                <h2 style={h2Style}>Why the change?</h2>
                <p>
                  YouTube, Spotify, Deezer and Apple Music each have terms of service that prohibit extracting audio from their streams. Pulling audio from them also risks running into anti-piracy laws (DRM circumvention, DMCA &sect;1201 in the US, CPI art. L331-5 in France). Our two largest competitors (LALAL.AI and Moises.ai) don&rsquo;t accept streaming links either — for exactly the same reasons.
                </p>
                <p style={{ marginTop: 12 }}>
                  Once you have the audio as a file on your computer, you&rsquo;re in the clear to process it however you want.
                </p>
              </div>
            </FadeIn>

            {/* YouTube */}
            <FadeIn delay={0.1}>
              <div style={sectionWrapperStyle}>
                <h2 style={h2Style}>From YouTube</h2>
                <p>
                  The simplest route is a desktop downloader:
                </p>
                <ul style={{ margin: "12px 0 0 20px", padding: 0 }}>
                  <li style={{ marginBottom: 6 }}>
                    <strong>4K Video Downloader Plus</strong> (Mac / Windows / Linux) — free for short videos, paste the URL, pick audio format.
                  </li>
                  <li style={{ marginBottom: 6 }}>
                    <strong>yt-dlp</strong> (command line, free) — install via Homebrew on Mac (<code style={{ fontFamily: "monospace", fontSize: 13, background: C.codeBg, padding: "2px 6px" }}>brew install yt-dlp</code>), then run <code style={{ fontFamily: "monospace", fontSize: 13, background: C.codeBg, padding: "2px 6px" }}>yt-dlp -x --audio-format mp3 URL</code>.
                  </li>
                </ul>
                <p style={{ marginTop: 12 }}>
                  Then drag the resulting MP3 / WAV / M4A into 44Stems.
                </p>
              </div>
            </FadeIn>

            {/* Spotify / Deezer / Apple Music */}
            <FadeIn delay={0.15}>
              <div style={sectionWrapperStyle}>
                <h2 style={h2Style}>From Spotify, Deezer or Apple Music</h2>
                <p>
                  These services are DRM-protected, so you can&rsquo;t extract the audio directly even with a subscription. The practical workflow is:
                </p>
                <ol style={{ margin: "12px 0 0 20px", padding: 0 }}>
                  <li style={{ marginBottom: 6 }}>If you own the track, find it in your local library (iTunes, Apple Music downloads folder, Amazon Music purchases, Bandcamp).</li>
                  <li style={{ marginBottom: 6 }}>Otherwise, buy the track directly from Beatport, Qobuz, 7digital or Bandcamp — you&rsquo;ll get a lossless file.</li>
                  <li style={{ marginBottom: 6 }}>Record your own performance / edit / remix and upload that.</li>
                </ol>
              </div>
            </FadeIn>

            {/* What we accept */}
            <FadeIn delay={0.2}>
              <div style={sectionWrapperStyle}>
                <h2 style={h2Style}>What we do accept</h2>
                <p>
                  Drag-and-drop files (up to 2 GB on Pro / Studio) plus direct links from:
                </p>
                <ul style={{ margin: "12px 0 0 20px", padding: 0 }}>
                  <li style={{ marginBottom: 6 }}><strong>Dropbox</strong> — paste a public share link.</li>
                  <li style={{ marginBottom: 6 }}><strong>Google Drive</strong> — share with &ldquo;anyone with the link&rdquo; then paste the URL.</li>
                  <li style={{ marginBottom: 6 }}><strong>SoundCloud</strong> — tracks that the artist explicitly marked as downloadable (look for the download button under the waveform).</li>
                </ul>
              </div>
            </FadeIn>

            {/* Contact */}
            <FadeIn delay={0.25}>
              <div style={sectionWrapperStyle}>
                <h2 style={h2Style}>Need help?</h2>
                <p>
                  Email <a href="mailto:hello@44stems.com" style={{ color: C.accent, textDecoration: "none" }}>hello@44stems.com</a> — we usually answer within a few hours.
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
