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

const sections = [
  { id: "what-are-cookies", title: "1. What Are Cookies" },
  { id: "cookies-we-use", title: "2. Cookies We Use" },
  { id: "third-party", title: "3. Third-Party Cookies" },
  { id: "managing", title: "4. Managing Cookies" },
  { id: "contact", title: "5. Contact" },
];

export default function CookiesPage() {
  return (
    <div style={{ backgroundColor: C.bg, minHeight: "100vh" }}>
      <Header />

      {/* Hero */}
      <section style={{ paddingTop: 120, paddingBottom: 64 }}>
        <Container>
          <FadeIn>
            <p style={{ fontFamily: F, fontSize: 13, color: C.textMuted, margin: "0 0 16px 0", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Legal
            </p>
            <h1
              style={{
                fontFamily: fonts.heading,
                fontSize: 48,
                fontWeight: 700,
                color: C.text,
                margin: "0 0 16px 0",
                lineHeight: 1.05,
                letterSpacing: "-0.02em",
              }}
            >
              Cookie Policy
            </h1>
            <p style={{ fontFamily: F, fontSize: 15, color: C.textMuted, margin: 0 }}>
              Last updated: April 2026
            </p>
          </FadeIn>
        </Container>
      </section>

      {/* Table of contents */}
      <section style={{ paddingBottom: 48 }}>
        <Container>
          <FadeIn delay={0.05}>
            <div style={{ borderTop: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`, padding: "24px 0" }}>
              <p style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 16px 0" }}>
                Contents
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 24px" }}>
                {sections.map((s) => (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    style={{ fontFamily: F, fontSize: 13, color: C.textLight, textDecoration: "none" }}
                    onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.color = C.accent)}
                    onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.color = C.textLight)}
                  >
                    {s.title}
                  </a>
                ))}
              </div>
            </div>
          </FadeIn>
        </Container>
      </section>

      {/* Body */}
      <section style={{ paddingBottom: 120 }}>
        <Container>
          <FadeIn delay={0.1}>
            <div style={{ fontFamily: F, fontSize: 15, color: C.textLight, lineHeight: 1.75 }}>

              <p style={{ marginBottom: 40, color: C.textMuted }}>
                This Cookie Policy explains how 44Stems (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) uses cookies and similar browser storage technologies on <strong>44stems.com</strong>. We aim to keep our use of cookies minimal and transparent.
              </p>

              {/* 1 */}
              <div id="what-are-cookies" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  1. What Are Cookies
                </h2>
                <p>
                  Cookies are small text files placed on your device by a website when you visit it. They allow the site to remember information about your visit — such as your login status or preferences — so you don&apos;t have to re-enter it every time.
                </p>
                <p style={{ marginTop: 12 }}>
                  Local Storage is a similar browser mechanism that stores data on your device without an expiry date. Unlike cookies, local storage data is never sent to the server automatically — it stays entirely on your device.
                </p>
              </div>

              {/* 2 */}
              <div id="cookies-we-use" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  2. Cookies We Use
                </h2>
                <p>We use a minimal set of cookies and browser storage. Here is a complete list:</p>

                {/* Table */}
                <div className="overflow-x-auto" style={{ marginTop: 16 }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 0, minWidth: 540 }}>
                  {/* Header */}
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "180px 1fr 100px 100px",
                    gap: 16,
                    padding: "10px 0",
                    borderBottom: `2px solid ${C.border}`,
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.textMuted,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                  }}>
                    <span>Name</span>
                    <span>Purpose</span>
                    <span>Duration</span>
                    <span>Type</span>
                  </div>
                  {[
                    {
                      name: "sb-*",
                      purpose: "Supabase authentication session — keeps you logged in across pages.",
                      duration: "7 days",
                      type: "Essential",
                    },
                    {
                      name: "44stems-preferences",
                      purpose: "Saves your UI preferences (theme, quality settings) in localStorage. Never sent to our servers.",
                      duration: "Persistent",
                      type: "Functional",
                    },
                  ].map((row, i) => (
                    <div
                      key={row.name}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "180px 1fr 100px 100px",
                        gap: 16,
                        padding: "14px 0",
                        borderBottom: `1px solid ${C.border}`,
                        fontSize: 14,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: C.text, fontFamily: "monospace", fontSize: 13 }}>{row.name}</span>
                      <span>{row.purpose}</span>
                      <span style={{ color: C.textMuted }}>{row.duration}</span>
                      <span style={{ color: row.type === "Essential" ? C.accent : C.textMuted }}>{row.type}</span>
                    </div>
                  ))}
                  </div>
                </div>

                <p style={{ marginTop: 16 }}>
                  <strong>Essential</strong> cookies are required for the Service to function. You cannot opt out of these without losing core functionality such as staying logged in. <strong>Functional</strong> cookies improve your experience but the Service remains usable without them.
                </p>
              </div>

              {/* 3 */}
              <div id="third-party" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  3. Third-Party Cookies
                </h2>
                <p style={{ padding: "16px 20px", backgroundColor: "#F3F3F3", borderLeft: `3px solid ${C.accent}` }}>
                  <strong>We currently use no third-party tracking or advertising cookies.</strong> No analytics services, ad networks, or social media pixels are loaded on 44stems.com.
                </p>
                <p style={{ marginTop: 12 }}>
                  If this changes, we will update this policy and, where required by law, seek your consent before deploying any non-essential third-party cookies.
                </p>
              </div>

              {/* 4 */}
              <div id="managing" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  4. Managing Cookies
                </h2>
                <p>
                  You can control and delete cookies through your browser settings. Below are links to instructions for the most common browsers:
                </p>
                <ul style={{ marginTop: 12, paddingLeft: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                  <li>
                    <strong>Chrome:</strong> Settings → Privacy and security → Cookies and other site data
                  </li>
                  <li>
                    <strong>Firefox:</strong> Settings → Privacy & Security → Cookies and Site Data
                  </li>
                  <li>
                    <strong>Safari:</strong> Preferences → Privacy → Manage Website Data
                  </li>
                  <li>
                    <strong>Edge:</strong> Settings → Cookies and site permissions → Cookies and site data
                  </li>
                </ul>
                <p style={{ marginTop: 12 }}>
                  Note that disabling the Supabase authentication cookie (<code style={{ backgroundColor: "#F3F3F3", padding: "2px 6px", fontSize: 13 }}>sb-*</code>) will log you out and prevent you from accessing your account.
                </p>
                <p style={{ marginTop: 12 }}>
                  To clear local storage data, open your browser&apos;s developer tools (F12 → Application → Local Storage) and delete the <code style={{ backgroundColor: "#F3F3F3", padding: "2px 6px", fontSize: 13 }}>44stems-preferences</code> key.
                </p>
              </div>

              {/* 5 */}
              <div id="contact" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  5. Contact
                </h2>
                <p>
                  For questions about our use of cookies, contact us at{" "}
                  <a href="mailto:hello@44stems.com" style={{ color: C.accent, textDecoration: "none" }}>
                    hello@44stems.com
                  </a>.
                </p>
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 32, color: C.textMuted, fontSize: 13 }}>
                <em>This document was last updated in April 2026. It is not legal advice.</em>
              </div>

            </div>
          </FadeIn>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
