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

export default function ContactPage() {
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
              Contact
            </h1>
            <p style={{ fontFamily: F, fontSize: 18, color: C.textLight, margin: 0, lineHeight: 1.65 }}>
              We&apos;re a small team. Every email goes to a human.
            </p>
          </FadeIn>
        </Container>
      </section>

      {/* Body */}
      <section style={{ paddingBottom: 120 }}>
        <Container>
          <div style={{ fontFamily: F, fontSize: 15, color: C.textLight, lineHeight: 1.75, display: "flex", flexDirection: "column", gap: 0 }}>

            {/* Get In Touch */}
            <FadeIn delay={0.05}>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 40, paddingBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  Get In Touch
                </h2>
                <p>
                  For any inquiry, reach us at{" "}
                  <a href="mailto:hello@44stems.com" style={{ color: C.accent, textDecoration: "none", fontWeight: 600 }}>
                    hello@44stems.com
                  </a>.
                </p>
                <div style={{ marginTop: 24, display: "flex", flexDirection: "column", gap: 0 }}>
                  {[
                    { topic: "Support", detail: "Account issues, billing questions, bug reports." },
                    { topic: "Business", detail: "Partnerships, API access, enterprise plans." },
                    { topic: "DMCA / Copyright", detail: "Takedown requests and copyright claims." },
                    { topic: "Privacy", detail: "Data requests, GDPR rights, account deletion." },
                  ].map((row, i) => (
                    <div
                      key={row.topic}
                      className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-1 md:gap-6"
                      style={{
                        padding: "14px 0",
                        borderTop: i === 0 ? `1px solid ${C.border}` : undefined,
                        borderBottom: `1px solid ${C.border}`,
                        fontSize: 14,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: C.text }}>{row.topic}</span>
                      <span>{row.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeIn>

            {/* Response Time */}
            <FadeIn delay={0.1}>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 40, paddingBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  Response Time
                </h2>
                <p>
                  We aim to respond to all inquiries within <strong>48 hours</strong> on business days. For urgent account issues affecting an active subscription, we prioritize those.
                </p>
              </div>
            </FadeIn>

            {/* Useful Links */}
            <FadeIn delay={0.15}>
              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 40, paddingBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  Useful Links
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {[
                    { label: "Terms of Service", href: "/terms" },
                    { label: "Privacy Policy", href: "/privacy" },
                    { label: "Cookie Policy", href: "/cookies" },
                  ].map((link) => (
                    <a
                      key={link.href}
                      href={link.href}
                      style={{ color: C.accent, textDecoration: "none", fontSize: 15 }}
                      onMouseEnter={(e) => ((e.target as HTMLAnchorElement).style.textDecoration = "underline")}
                      onMouseLeave={(e) => ((e.target as HTMLAnchorElement).style.textDecoration = "none")}
                    >
                      {link.label} →
                    </a>
                  ))}
                </div>
              </div>
            </FadeIn>

          </div>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
