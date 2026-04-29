// NOTE: This content is based on GDPR best practices and competitor privacy policies.
// It is NOT legal advice. Have a lawyer review before relying on it in production.

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
  { id: "controller", title: "1. Data Controller" },
  { id: "data-collected", title: "2. Data We Collect" },
  { id: "audio-files", title: "3. Audio Files" },
  { id: "legal-basis", title: "4. Legal Basis" },
  { id: "processors", title: "5. Third-Party Processors" },
  { id: "cookies", title: "6. Cookies & Local Storage" },
  { id: "retention", title: "7. Data Retention" },
  { id: "transfers", title: "8. International Transfers" },
  { id: "rights", title: "9. Your Rights (GDPR)" },
  { id: "children", title: "10. Children" },
  { id: "security", title: "11. Security" },
  { id: "changes", title: "12. Changes" },
  { id: "contact", title: "13. Contact" },
];

export default function PrivacyPage() {
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
              Privacy Policy
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
                This Privacy Policy explains how 44Stems (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) collects, uses, and protects your personal data when you use our Service at <strong>44stems.com</strong>. We are committed to protecting your privacy and complying with applicable data protection laws, including the GDPR.
              </p>

              {/* 1 */}
              <div id="controller" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  1. Data Controller
                </h2>
                <p>
                  The data controller for personal data processed through 44Stems is 44Stems, operating from France. For privacy-related inquiries, contact us at{" "}
                  <a href="mailto:hello@44stems.com" style={{ color: C.accent, textDecoration: "none" }}>
                    hello@44stems.com
                  </a>.
                </p>
              </div>

              {/* 2 */}
              <div id="data-collected" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  2. Data We Collect
                </h2>
                <p>We collect the following categories of personal data:</p>
                <ul style={{ marginTop: 12, paddingLeft: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                  <li><strong>Account data:</strong> email address, authentication provider (Google, Apple), display name.</li>
                  <li><strong>Usage data:</strong> processing history (filenames, durations, timestamps), subscription plan, credit usage.</li>
                  <li><strong>Payment data:</strong> subscription status, billing period. Payment card details are handled exclusively by Stripe and are never stored by 44Stems.</li>
                  <li><strong>Technical data:</strong> IP address, browser type, operating system, referrer URL, and basic analytics (page views, feature usage).</li>
                </ul>
              </div>

              {/* 3 */}
              <div id="audio-files" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  3. Audio Files
                </h2>
                <p>
                  Audio files you upload are processed solely to deliver the stem separation you requested. They are stored temporarily in your private workspace in Cloudflare R2 object storage.
                </p>
                <p style={{ marginTop: 12, padding: "16px 20px", backgroundColor: "#F3F3F3", borderLeft: `3px solid ${C.accent}` }}>
                  <strong>Your audio files are never used to train, fine-tune, or improve AI models</strong> — ours or any third party&apos;s. Your music stays yours.
                </p>
                <p style={{ marginTop: 12 }}>
                  You can delete your files at any time from your account. We retain audio files for up to 30 days after processing to allow you to re-download stems. After this period, or when you delete them manually, files are permanently removed.
                </p>
              </div>

              {/* 4 */}
              <div id="legal-basis" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  4. Legal Basis (GDPR)
                </h2>
                <ul style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                  <li><strong>Contract performance (Art. 6(1)(b)):</strong> Processing your audio files, managing your account, billing.</li>
                  <li><strong>Legitimate interest (Art. 6(1)(f)):</strong> Service analytics, fraud prevention, improving reliability.</li>
                  <li><strong>Consent (Art. 6(1)(a)):</strong> Non-essential cookies, if applicable.</li>
                  <li><strong>Legal obligation (Art. 6(1)(c)):</strong> Compliance with applicable laws (tax records, DMCA).</li>
                </ul>
              </div>

              {/* 5 */}
              <div id="processors" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  5. Third-Party Processors
                </h2>
                <p>We use the following sub-processors to operate the Service:</p>
                <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 0 }}>
                  {[
                    { name: "Supabase", purpose: "Authentication and database", location: "US / EU" },
                    { name: "Cloudflare R2", purpose: "Audio file storage", location: "US" },
                    { name: "Modal Labs", purpose: "GPU processing (AI inference)", location: "US" },
                    { name: "Stripe", purpose: "Payment processing and subscriptions", location: "US / EU" },
                    { name: "Google", purpose: "OAuth authentication", location: "US / EU" },
                    { name: "Vercel", purpose: "Web hosting and CDN", location: "US / EU" },
                  ].map((p, i) => (
                    <div
                      key={p.name}
                      className="grid grid-cols-1 md:grid-cols-[160px_1fr_120px] gap-1 md:gap-4"
                      style={{
                        padding: "12px 0",
                        borderTop: i === 0 ? `1px solid ${C.border}` : undefined,
                        borderBottom: `1px solid ${C.border}`,
                        fontSize: 14,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: C.text }}>{p.name}</span>
                      <span>{p.purpose}</span>
                      <span style={{ color: C.textMuted, textAlign: "right" }}>{p.location}</span>
                    </div>
                  ))}
                </div>
                <p style={{ marginTop: 16 }}>
                  Each processor is bound by data processing agreements and applicable law.
                </p>
              </div>

              {/* 6 */}
              <div id="cookies" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  6. Cookies & Local Storage
                </h2>
                <p>We use a minimal set of cookies and browser storage:</p>
                <ul style={{ marginTop: 12, paddingLeft: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                  <li><strong>Supabase auth session cookie:</strong> Required for authentication. Expires with your session or after 7 days.</li>
                  <li><strong>LocalStorage (44stems-preferences):</strong> Saves your UI preferences (theme, quality settings) locally. Never sent to our servers.</li>
                </ul>
                <p style={{ marginTop: 12 }}>
                  We do not currently use third-party tracking or advertising cookies.
                </p>
              </div>

              {/* 7 */}
              <div id="retention" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  7. Data Retention
                </h2>
                <ul style={{ paddingLeft: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                  <li><strong>Audio files:</strong> Retained for up to 30 days after processing, then permanently deleted.</li>
                  <li><strong>Account data:</strong> Retained while your account is active. Deleted within 30 days of account deletion request.</li>
                  <li><strong>Billing records:</strong> Retained for 7 years as required by French accounting law.</li>
                  <li><strong>Technical logs:</strong> Retained for up to 90 days for security and debugging purposes.</li>
                </ul>
              </div>

              {/* 8 */}
              <div id="transfers" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  8. International Transfers
                </h2>
                <p>
                  Some of our processors (Modal, Cloudflare, Supabase, Stripe, Vercel) operate in the United States. Transfers to the US are covered by Standard Contractual Clauses (SCCs) or the EU-US Data Privacy Framework where applicable.
                </p>
                <p style={{ marginTop: 12 }}>
                  Audio processing via Modal runs in US-based data centers. If regional data residency is important to your use case, contact us to discuss options.
                </p>
              </div>

              {/* 9 */}
              <div id="rights" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  9. Your Rights (GDPR)
                </h2>
                <p>If you are in the EU or UK, you have the following rights:</p>
                <ul style={{ marginTop: 12, paddingLeft: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                  <li><strong>Access:</strong> Request a copy of the personal data we hold about you.</li>
                  <li><strong>Rectification:</strong> Correct inaccurate or incomplete data.</li>
                  <li><strong>Erasure:</strong> Request deletion of your data (&ldquo;right to be forgotten&rdquo;).</li>
                  <li><strong>Portability:</strong> Receive your data in a structured, machine-readable format.</li>
                  <li><strong>Restriction:</strong> Request that we restrict processing of your data in certain circumstances.</li>
                  <li><strong>Objection:</strong> Object to processing based on legitimate interest.</li>
                  <li><strong>Withdraw consent:</strong> Where processing is based on consent, withdraw it at any time.</li>
                </ul>
                <p style={{ marginTop: 12 }}>
                  To exercise any of these rights, email us at{" "}
                  <a href="mailto:hello@44stems.com" style={{ color: C.accent, textDecoration: "none" }}>
                    hello@44stems.com
                  </a>. We will respond within 30 days. You also have the right to lodge a complaint with your local data protection authority.
                </p>
              </div>

              {/* 10 */}
              <div id="children" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  10. Children
                </h2>
                <p>
                  The Service is not directed to children under 13 (under 16 in the EU/UK). We do not knowingly collect personal data from minors. If you believe a minor has provided us with personal data, please contact us at{" "}
                  <a href="mailto:hello@44stems.com" style={{ color: C.accent, textDecoration: "none" }}>
                    hello@44stems.com
                  </a>{" "}and we will delete it promptly.
                </p>
              </div>

              {/* 11 */}
              <div id="security" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  11. Security
                </h2>
                <p>
                  We implement technical and organizational measures to protect your data, including:
                </p>
                <ul style={{ marginTop: 12, paddingLeft: 24, display: "flex", flexDirection: "column", gap: 8 }}>
                  <li>Encryption in transit (TLS/HTTPS) for all data transfers.</li>
                  <li>Encryption at rest for files stored in Cloudflare R2.</li>
                  <li>Workspace isolation — each user&apos;s files are stored in a private, scoped bucket path inaccessible to other users.</li>
                  <li>Row-level security in Supabase — database queries are scoped to authenticated user IDs.</li>
                </ul>
                <p style={{ marginTop: 12 }}>
                  No method of transmission or storage is 100% secure. If you discover a security vulnerability, please disclose it responsibly at{" "}
                  <a href="mailto:hello@44stems.com" style={{ color: C.accent, textDecoration: "none" }}>
                    hello@44stems.com
                  </a>.
                </p>
              </div>

              {/* 12 */}
              <div id="changes" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  12. Changes
                </h2>
                <p>
                  We may update this Privacy Policy from time to time. For material changes, we will notify you via email or a prominent notice on the Service at least 30 days before changes take effect. The &ldquo;last updated&rdquo; date at the top reflects the most recent revision.
                </p>
              </div>

              {/* 13 */}
              <div id="contact" style={{ marginBottom: 48 }}>
                <h2 style={{ fontFamily: fonts.heading, fontSize: 22, fontWeight: 700, color: C.text, margin: "0 0 16px 0", letterSpacing: "-0.01em" }}>
                  13. Contact
                </h2>
                <p>
                  For privacy questions, data requests, or concerns, contact us at{" "}
                  <a href="mailto:hello@44stems.com" style={{ color: C.accent, textDecoration: "none" }}>
                    hello@44stems.com
                  </a>.
                </p>
              </div>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 32, color: C.textMuted, fontSize: 13 }}>
                <em>This document was last updated in April 2026 and is based on GDPR best practices. It is not legal advice.</em>
              </div>

            </div>
          </FadeIn>
        </Container>
      </section>

      <Footer />
    </div>
  );
}
