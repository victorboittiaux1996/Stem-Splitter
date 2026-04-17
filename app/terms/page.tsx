// NOTE: This content is based on competitor best practices (Moises, LALAL.AI, iZotope)
// and is NOT legal advice. Have a lawyer review before relying on it in production.

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
  { id: "service", title: "1. Service Description" },
  { id: "eligibility", title: "2. Eligibility" },
  { id: "account", title: "3. Account" },
  { id: "billing", title: "4. Plans & Billing" },
  { id: "content", title: "5. User Content & Ownership" },
  { id: "acceptable-use", title: "6. Acceptable Use" },
  { id: "ip", title: "7. Intellectual Property" },
  { id: "disclaimer", title: "8. Disclaimer of Warranties" },
  { id: "liability", title: "9. Limitation of Liability" },
  { id: "indemnification", title: "10. Indemnification" },
  { id: "termination", title: "11. Termination" },
  { id: "dmca", title: "12. DMCA" },
  { id: "modifications", title: "13. Modifications" },
  { id: "governing-law", title: "14. Governing Law" },
  { id: "contact", title: "15. Contact" },
];

export default function TermsPage() {
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
              Terms & Conditions
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
                These Terms & Conditions (&ldquo;Terms&rdquo;) govern your use of 44Stems (the &ldquo;Service&rdquo;), operated by 44Stems (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). By accessing or using the Service you agree to be bound by these Terms.
              </p>

              {/* 1 */}
              <div id="service" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  1. Service Description
                </h2>
                <p>
                  44Stems is an AI-powered audio stem separation service. It allows music producers and audio professionals to upload audio files and receive separated stems (vocals, drums, bass, instruments, etc.) using machine learning models running on cloud infrastructure.
                </p>
                <p style={{ marginTop: 12 }}>
                  The Service is provided via a web application at <strong>44stems.com</strong> with subscription-based access tiers.
                </p>
              </div>

              {/* 2 */}
              <div id="eligibility" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  2. Eligibility
                </h2>
                <p>
                  You must be at least 13 years old to use the Service (16 years old if you are located in the European Union or the United Kingdom). By using the Service, you represent and warrant that you meet this age requirement and have the legal capacity to enter into these Terms.
                </p>
              </div>

              {/* 3 */}
              <div id="account" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  3. Account
                </h2>
                <p>
                  Authentication is handled via Supabase (Google OAuth, Apple Sign-In, or email magic link). You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account.
                </p>
                <p style={{ marginTop: 12 }}>
                  You agree to notify us immediately at <strong>hello@44stems.com</strong> if you suspect unauthorized access to your account. We are not liable for any loss resulting from unauthorized use of your account where you have failed to notify us promptly.
                </p>
              </div>

              {/* 4 */}
              <div id="billing" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  4. Plans & Billing
                </h2>
                <p>
                  The Service offers three tiers: <strong>Free</strong>, <strong>Pro</strong>, and <strong>Studio</strong>. Paid plans are processed through Polar and are subject to auto-renewal unless cancelled before the renewal date.
                </p>
                <p style={{ marginTop: 12 }}>
                  Credits (minutes of audio) are allocated per billing period. Unused credits may roll over subject to your plan limits. Credits have no monetary value and cannot be refunded or exchanged for cash.
                </p>
                <p style={{ marginTop: 12 }}>
                  Annual plans are billed upfront for the full year. You may request a refund within 14 days of initial purchase if you have not used more than 10% of the credits included in your plan. After 14 days or after substantial usage, no refund is issued.
                </p>
                <p style={{ marginTop: 12 }}>
                  We reserve the right to change pricing with at least 30 days&apos; notice before your next billing cycle.
                </p>
              </div>

              {/* 5 */}
              <div id="content" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  5. User Content & Ownership
                </h2>
                <p>
                  <strong>You retain full ownership</strong> of all audio files you upload (&ldquo;Input Content&rdquo;) and all separated stems produced by the Service (&ldquo;Output Content&rdquo;).
                </p>
                <p style={{ marginTop: 12 }}>
                  By uploading Input Content, you grant 44Stems a limited, temporary, non-exclusive license solely to process your files for the purpose of delivering the Service to you. This license expires when your files are deleted from our systems.
                </p>
                <p style={{ marginTop: 12, padding: "16px 20px", backgroundColor: "#F3F3F3", borderLeft: `3px solid ${C.accent}` }}>
                  <strong>We will never use your audio content to train, fine-tune, or improve AI models</strong>, our own or any third party&apos;s. Your music stays yours.
                </p>
              </div>

              {/* 6 */}
              <div id="acceptable-use" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  6. Acceptable Use
                </h2>
                <p>You agree not to:</p>
                <ul style={{ marginTop: 12, paddingLeft: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                  <li>Upload content you do not own or have rights to process.</li>
                  <li>Use the Service to infringe any third party&apos;s intellectual property rights.</li>
                  <li>Attempt to circumvent plan limits, abuse shared infrastructure, or reverse-engineer the AI models.</li>
                  <li>Use automated tools to bulk-process files beyond your plan quota.</li>
                  <li>Upload illegal content or content that violates any applicable law.</li>
                </ul>
                <p style={{ marginTop: 12 }}>
                  We reserve the right to suspend or terminate accounts that violate this section without prior notice.
                </p>
              </div>

              {/* 7 */}
              <div id="ip" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  7. Intellectual Property
                </h2>
                <p>
                  44Stems and its licensors retain all rights, title, and interest in the Service, including its web application, user interface, branding, and underlying AI models. Nothing in these Terms transfers any ownership of 44Stems intellectual property to you.
                </p>
              </div>

              {/* 8 */}
              <div id="disclaimer" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  8. Disclaimer of Warranties
                </h2>
                <p>
                  THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT AI SEPARATION RESULTS WILL MEET YOUR SPECIFIC REQUIREMENTS OR EXPECTATIONS.
                </p>
                <p style={{ marginTop: 12 }}>
                  AI-based stem separation is a best-effort process. Output quality depends on the characteristics of the input audio. We make no guarantee about the quality, accuracy, or completeness of separated stems.
                </p>
              </div>

              {/* 9 */}
              <div id="liability" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  9. Limitation of Liability
                </h2>
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY LAW, 44STEMS&apos; AGGREGATE LIABILITY FOR ANY CLAIMS ARISING OUT OF OR RELATED TO THE SERVICE SHALL NOT EXCEED THE TOTAL AMOUNT YOU PAID TO 44STEMS IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM.
                </p>
                <p style={{ marginTop: 12 }}>
                  IN NO EVENT SHALL 44STEMS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING LOSS OF PROFITS, DATA, OR GOODWILL.
                </p>
              </div>

              {/* 10 */}
              <div id="indemnification" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  10. Indemnification
                </h2>
                <p>
                  You agree to indemnify, defend, and hold harmless 44Stems and its affiliates from any claims, damages, costs, and expenses (including reasonable legal fees) arising out of: (a) your use of the Service; (b) your violation of these Terms; or (c) your infringement of any third party&apos;s intellectual property or other rights.
                </p>
              </div>

              {/* 11 */}
              <div id="termination" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  11. Termination
                </h2>
                <p>
                  Either party may terminate the relationship at any time. You may delete your account via account settings. We may suspend or terminate your access for violations of these Terms, non-payment, or at our discretion with reasonable notice.
                </p>
                <p style={{ marginTop: 12 }}>
                  Upon termination, your files will be deleted from our systems within 30 days. Provisions that by their nature should survive termination (ownership, indemnification, limitation of liability) will remain in effect.
                </p>
              </div>

              {/* 12 */}
              <div id="dmca" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  12. DMCA
                </h2>
                <p>
                  If you believe content processed through 44Stems infringes your copyright, please send a DMCA takedown notice to <strong>hello@44stems.com</strong> with: (1) identification of the copyrighted work; (2) identification of the allegedly infringing material; (3) your contact information; (4) a good faith statement; and (5) a declaration of accuracy under penalty of perjury.
                </p>
              </div>

              {/* 13 */}
              <div id="modifications" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  13. Modifications
                </h2>
                <p>
                  We may update these Terms from time to time. For material changes, we will provide at least 30 days&apos; notice via email or a prominent notice on the Service before the changes take effect. Continued use after the effective date constitutes acceptance of the updated Terms.
                </p>
              </div>

              {/* 14 */}
              <div id="governing-law" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  14. Governing Law
                </h2>
                <p>
                  These Terms are governed by French law. Any disputes shall be subject to the exclusive jurisdiction of the courts of France.
                </p>
              </div>

              {/* 15 */}
              <div id="contact" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  15. Contact
                </h2>
                <p>
                  Questions about these Terms? Contact us at{" "}
                  <a href="mailto:hello@44stems.com" style={{ color: C.accent, textDecoration: "none" }}>
                    hello@44stems.com
                  </a>
                </p>
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 32, color: C.textMuted, fontSize: 13 }}>
                <em>This document was last updated in April 2026 and is based on commonly accepted SaaS terms of service. It is not legal advice.</em>
              </div>

            </div>
          </FadeIn>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
