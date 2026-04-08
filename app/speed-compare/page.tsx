"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { fonts, stemColors } from "@/components/website/theme";

const C = {
  bg: "#FFFFFF",
  bgAlt: "#F3F3F3",
  bgCard: "#F5F5F5",
  text: "#000000",
  textLight: "#333333",
  textMuted: "#666666",
  accent: "#1B10FD",
} as const;

function Container({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px", ...style }}>{children}</div>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: fonts.body, fontSize: 11, fontWeight: 600,
      textTransform: "uppercase", letterSpacing: "0.1em", color: C.textMuted,
    }}>
      {children}
    </span>
  );
}

// ─── Version A: Colored stem blocks ─────────────────────────
function VersionA() {
  const stats = [
    { value: "<40s", label: "Separation time", sub: "Full track, 6 stems", color: stemColors.vocals },
    { value: "H100", label: "NVIDIA GPU", sub: "80GB VRAM dedicated", color: stemColors.drums },
    { value: "24-bit", label: "Output quality", sub: "WAV lossless or MP3 320", color: stemColors.bass },
  ];
  const specs = [
    { value: "6", label: "Max stems", color: stemColors.guitar },
    { value: "200 MB", label: "Max file size", color: stemColors.piano },
    { value: "MP3 · WAV · FLAC · AAC", label: "Input formats", color: stemColors.other },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
        {stats.map((s) => {
          const [hovered, setHovered] = useState(false);
          return (
            <motion.div
              key={s.label}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              animate={{ backgroundColor: hovered ? C.text : s.color }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ padding: "44px 36px", cursor: "default", minHeight: 220, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
            >
              <span style={{ fontFamily: fonts.heading, fontSize: 64, fontWeight: 700, lineHeight: 1, color: "#FFFFFF", marginBottom: 16 }}>{s.value}</span>
              <span style={{ fontFamily: fonts.heading, fontSize: 15, fontWeight: 700, color: "#FFFFFF", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
              <span style={{ fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.7)", marginTop: 4 }}>{s.sub}</span>
            </motion.div>
          );
        })}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
        {specs.map((s) => {
          const [hovered, setHovered] = useState(false);
          return (
            <motion.div
              key={s.label}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              animate={{ backgroundColor: hovered ? s.color : "#FFFFFF" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ padding: "32px 36px", cursor: "default" }}
            >
              <motion.span animate={{ color: hovered ? "#FFFFFF" : s.color }} transition={{ duration: 0.3 }} style={{ fontFamily: fonts.heading, fontSize: 28, fontWeight: 700, lineHeight: 1, display: "block", marginBottom: 8 }}>{s.value}</motion.span>
              <motion.span animate={{ color: hovered ? "rgba(255,255,255,0.8)" : C.textMuted }} transition={{ duration: 0.3 }} style={{ fontFamily: fonts.body, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>{s.label}</motion.span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Version B: Comparison bars + spec strip ────────────────
function VersionB() {
  const competitors = [
    { name: "Competitor A", time: 75, color: "#D0D0D0" },
    { name: "Competitor B", time: 58, color: "#D0D0D0" },
    { name: "44Stems", time: 38, color: stemColors.vocals, highlight: true },
  ];
  const specs = [
    { label: "GPU", value: "H100 80GB" },
    { label: "Stems", value: "Up to 6" },
    { label: "Formats", value: "MP3 · WAV · FLAC" },
    { label: "Quality", value: "24-bit / 320kbps" },
    { label: "Max size", value: "200 MB" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ backgroundColor: C.bgAlt, padding: "48px 40px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {competitors.map((c, i) => (
            <div key={c.name}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <span style={{ fontFamily: fonts.heading, fontSize: c.highlight ? 18 : 15, fontWeight: c.highlight ? 700 : 400, color: C.text }}>{c.name}</span>
                <span style={{ fontFamily: fonts.heading, fontSize: c.highlight ? 32 : 20, fontWeight: 700, color: c.highlight ? c.color : C.textMuted }}>{c.time}s</span>
              </div>
              <div style={{ height: c.highlight ? 10 : 6, backgroundColor: "#E8E8E8", overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(c.time / 80) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, delay: 0.2 + i * 0.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ height: "100%", backgroundColor: c.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2 }}>
        {specs.map((s) => (
          <div key={s.label} style={{ backgroundColor: C.bgAlt, padding: "24px 20px" }}>
            <div style={{ fontFamily: fonts.body, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: fonts.heading, fontSize: 15, fontWeight: 700, color: C.text }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Version C: Dark premium block ──────────────────────────
function VersionC() {
  const specs = [
    { label: "GPU", value: "H100 80GB", color: stemColors.vocals },
    { label: "Stems", value: "Up to 6", color: stemColors.drums },
    { label: "Input", value: "MP3 · WAV · FLAC · AAC", color: stemColors.bass },
    { label: "Output", value: "WAV 24-bit / MP3 320", color: stemColors.guitar },
    { label: "Max size", value: "200 MB", color: stemColors.piano },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ backgroundColor: "#1A1A1A", padding: "72px 40px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          style={{ fontFamily: fonts.heading, fontSize: 96, fontWeight: 700, color: "#FFFFFF", lineHeight: 1 }}
        >
          &lt;40s
        </motion.span>
        <span style={{ fontFamily: fonts.body, fontSize: 14, color: "rgba(255,255,255,0.5)", marginTop: 16, textTransform: "uppercase", letterSpacing: "0.1em" }}>
          Average separation time · H100 GPU
        </span>
        <div style={{ display: "flex", gap: 32, marginTop: 24 }}>
          <span style={{ fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Competitor A ~58s</span>
          <span style={{ fontFamily: fonts.body, fontSize: 13, color: "rgba(255,255,255,0.35)" }}>Competitor B ~75s</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2 }}>
        {specs.map((s) => {
          const [hovered, setHovered] = useState(false);
          return (
            <motion.div
              key={s.label}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              animate={{ backgroundColor: hovered ? s.color : "#FFFFFF" }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ padding: "28px 20px", cursor: "default" }}
            >
              <motion.span animate={{ color: hovered ? "rgba(255,255,255,0.7)" : C.textMuted }} transition={{ duration: 0.3 }} style={{ fontFamily: fonts.body, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>{s.label}</motion.span>
              <motion.span animate={{ color: hovered ? "#FFFFFF" : C.text }} transition={{ duration: 0.3 }} style={{ fontFamily: fonts.heading, fontSize: 15, fontWeight: 700 }}>{s.value}</motion.span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Version D: V1-style dark progress bars + infrastructure specs ──
function VersionD() {
  return (
    <div style={{ display: "flex", gap: 2 }}>
      <div style={{ flex: "0 0 58%", backgroundColor: "#0A0A0A", padding: 32, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 280, gap: 20 }}>
        {[
          { label: "Upload", pct: 100, color: "#555" },
          { label: "Processing", pct: 68, color: "#1B10FD" },
          { label: "Download ready", pct: 0, color: "#00CC66" },
        ].map((step) => (
          <div key={step.label} style={{ width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 400, color: "#888" }}>{step.label}</span>
              {step.pct > 0 && <span style={{ fontFamily: fonts.body, fontSize: 12, fontWeight: 500, color: step.color }}>{step.pct}%</span>}
            </div>
            <div style={{ height: 4, backgroundColor: "#222", overflow: "hidden" }}>
              <motion.div
                initial={{ width: 0 }}
                whileInView={{ width: `${step.pct}%` }}
                viewport={{ once: true }}
                transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: "100%", backgroundColor: step.color }}
              />
            </div>
          </div>
        ))}
      </div>
      <div style={{ flex: 1, backgroundColor: "#ECECEC", padding: 32, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <p style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 600, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>Infrastructure</p>
        {[
          { label: "GPU model", value: "H100 80GB" },
          { label: "Avg. separation time", value: "< 40s" },
          { label: "Formats accepted", value: "MP3, WAV, FLAC, AAC" },
          { label: "Max file size", value: "200 MB" },
        ].map((row) => (
          <div key={row.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #D8D8D8" }}>
            <span style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 300, color: C.textMuted }}>{row.label}</span>
            <span style={{ fontFamily: fonts.body, fontSize: 13, fontWeight: 500, color: C.text }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Version E: Current (comparison bars + colored spec hover) ──
function VersionE() {
  const competitors = [
    { name: "Competitor A", time: 75, color: "#D0D0D0" },
    { name: "Competitor B", time: 58, color: "#D0D0D0" },
    { name: "44Stems", time: 38, color: stemColors.vocals, highlight: true },
  ];
  const specs = [
    { label: "GPU", value: "H100 80GB", color: stemColors.vocals },
    { label: "Stems", value: "Up to 6", color: stemColors.drums },
    { label: "Input", value: "MP3 · WAV · FLAC · AAC", color: stemColors.bass },
    { label: "Output", value: "WAV 24-bit / MP3 320", color: stemColors.guitar },
    { label: "Max size", value: "200 MB", color: stemColors.piano },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ backgroundColor: C.bgAlt, padding: "48px 40px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          {competitors.map((c, i) => (
            <div key={c.name}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                <span style={{ fontFamily: fonts.heading, fontSize: c.highlight ? 18 : 15, fontWeight: c.highlight ? 700 : 400, color: C.text }}>{c.name}</span>
                <span style={{ fontFamily: fonts.heading, fontSize: c.highlight ? 32 : 20, fontWeight: 700, color: c.highlight ? c.color : C.textMuted }}>{c.time}s</span>
              </div>
              <div style={{ height: c.highlight ? 10 : 6, backgroundColor: "#E8E8E8", overflow: "hidden" }}>
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${(c.time / 80) * 100}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 1.2, delay: 0.2 + i * 0.2, ease: [0.22, 1, 0.36, 1] }}
                  style={{ height: "100%", backgroundColor: c.color }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2 }}>
        {specs.map((s) => {
          const [hovered, setHovered] = useState(false);
          return (
            <motion.div
              key={s.label}
              onMouseEnter={() => setHovered(true)}
              onMouseLeave={() => setHovered(false)}
              animate={{ backgroundColor: hovered ? s.color : C.bgAlt }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              style={{ padding: "28px 20px", cursor: "default" }}
            >
              <motion.span animate={{ color: hovered ? "rgba(255,255,255,0.7)" : C.textMuted }} transition={{ duration: 0.3 }} style={{ fontFamily: fonts.body, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>{s.label}</motion.span>
              <motion.span animate={{ color: hovered ? "#FFFFFF" : C.text }} transition={{ duration: 0.3 }} style={{ fontFamily: fonts.heading, fontSize: 15, fontWeight: 700 }}>{s.value}</motion.span>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── F1: 2-col compact (pipeline left, big number right) ────
function VersionF() {
  const steps = [
    { label: "Upload", status: "Complete", pct: 100, color: stemColors.vocals },
    { label: "Processing", status: "68%", pct: 68, color: C.accent },
    { label: "Download", status: "Waiting", pct: 0, color: stemColors.bass },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
      <div style={{ backgroundColor: C.bgAlt, padding: "32px 32px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 20 }}>
        {steps.map((step, i) => (
          <div key={step.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <span style={{ fontFamily: fonts.heading, fontSize: 13, fontWeight: 600, color: C.text }}>{step.label}</span>
              <span style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 500, color: step.pct === 100 ? stemColors.bass : step.pct > 0 ? C.accent : C.textMuted }}>{step.status}</span>
            </div>
            <div style={{ height: 4, backgroundColor: "#E4E4E4", overflow: "hidden" }}>
              <motion.div initial={{ width: 0 }} whileInView={{ width: `${step.pct}%` }} viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.2 + i * 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: "100%", backgroundColor: step.color }} />
            </div>
          </div>
        ))}
      </div>
      <div style={{ backgroundColor: C.bgAlt, padding: "32px 32px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center" }}>
        <span style={{ fontFamily: fonts.heading, fontSize: 64, fontWeight: 700, lineHeight: 1, color: C.text }}>&lt;40s</span>
        <span style={{ fontFamily: fonts.body, fontSize: 11, color: C.textMuted, marginTop: 8, textTransform: "uppercase", letterSpacing: "0.08em" }}>Average · full track</span>
      </div>
    </div>
  );
}

// ─── F2: Compact pipeline — full-width, tight rows ──────────
function VersionF2() {
  const steps = [
    { label: "Upload", time: "2s", pct: 100, color: stemColors.vocals },
    { label: "Separation", time: "~35s", pct: 68, color: C.accent },
    { label: "Export", time: "3s", pct: 0, color: stemColors.bass },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      <div style={{ backgroundColor: C.bgAlt, padding: "32px 32px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {steps.map((step, i) => (
            <div key={step.label}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span style={{ fontFamily: fonts.heading, fontSize: 13, fontWeight: 600, color: C.text }}>{step.label}</span>
                <span style={{ fontFamily: fonts.heading, fontSize: 13, fontWeight: 700, color: step.pct > 0 ? step.color : C.textMuted }}>{step.time}</span>
              </div>
              <div style={{ height: 4, backgroundColor: "#E4E4E4", overflow: "hidden" }}>
                <motion.div initial={{ width: 0 }} whileInView={{ width: `${step.pct}%` }} viewport={{ once: true }}
                  transition={{ duration: 1, delay: 0.2 + i * 0.25, ease: [0.22, 1, 0.36, 1] }}
                  style={{ height: "100%", backgroundColor: step.color }} />
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 20, paddingTop: 16, borderTop: "1px solid #E0E0E0" }}>
          <span style={{ fontFamily: fonts.body, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.08em" }}>Upload to download</span>
          <span style={{ fontFamily: fonts.heading, fontSize: 20, fontWeight: 700, color: C.text }}>&lt;40s</span>
        </div>
      </div>
      {/* Inline specs row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 2 }}>
        {[
          { label: "GPU", value: "H100 80GB" }, { label: "Stems", value: "Up to 6" },
          { label: "Input", value: "MP3 · WAV · FLAC" }, { label: "Output", value: "24-bit / 320k" }, { label: "Max", value: "200 MB" },
        ].map((s) => (
          <div key={s.label} style={{ backgroundColor: C.bgAlt, padding: "16px 16px" }}>
            <div style={{ fontFamily: fonts.body, fontSize: 10, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: fonts.heading, fontSize: 13, fontWeight: 700, color: C.text }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── F3: 3 compact cards (same density as Features grid) ────
function VersionF3() {
  const steps = [
    { label: "Upload", desc: "Drag & drop, folder, or URL. MP3, WAV, FLAC — up to 200 MB.", time: "2s", color: stemColors.vocals, pct: 100 },
    { label: "Separate", desc: "H100 GPU runs two SOTA models in one pass. Up to 6 stems.", time: "~35s", color: C.accent, pct: 68 },
    { label: "Download", desc: "WAV 24-bit lossless or MP3 320kbps. Individual or ZIP.", time: "3s", color: stemColors.bass, pct: 0 },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
      {steps.map((s, i) => {
        const [hovered, setHovered] = useState(false);
        return (
          <motion.div key={s.label} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}
            animate={{ backgroundColor: hovered ? s.color : C.bgCard }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            style={{ padding: "40px 32px", cursor: "default", minHeight: 220, display: "flex", flexDirection: "column" }}
          >
            <motion.span animate={{ color: hovered ? "rgba(255,255,255,0.5)" : s.color }} transition={{ duration: 0.3 }}
              style={{ fontFamily: fonts.heading, fontSize: 28, fontWeight: 700, lineHeight: 1, marginBottom: 4 }}>{s.time}</motion.span>
            <motion.h3 animate={{ color: hovered ? "#FFFFFF" : C.text }} transition={{ duration: 0.3 }}
              style={{ fontFamily: fonts.heading, fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", margin: "16px 0 12px" }}>{s.label}</motion.h3>
            <motion.p animate={{ color: hovered ? "#FFFFFF" : C.textLight }} transition={{ duration: 0.3 }}
              style={{ fontFamily: fonts.body, fontSize: 14, fontWeight: 400, lineHeight: 1.6, margin: "0 0 auto" }}>{s.desc}</motion.p>
            <div style={{ height: 3, backgroundColor: hovered ? "rgba(255,255,255,0.2)" : "#E4E4E4", overflow: "hidden", marginTop: 24 }}>
              <motion.div initial={{ width: 0 }} whileInView={{ width: `${s.pct}%` }} viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.2 + i * 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: "100%", backgroundColor: hovered ? "#FFFFFF" : s.color }} />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── F4: 2-col compact (pipeline left, stats right) ─────────
function VersionF4() {
  const steps = [
    { label: "Upload", pct: 100, color: stemColors.vocals },
    { label: "Processing", pct: 68, color: C.accent },
    { label: "Ready", pct: 0, color: stemColors.bass },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
      {/* Left: pipeline */}
      <div style={{ backgroundColor: C.bgAlt, padding: "32px 32px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 18 }}>
        {steps.map((s, i) => (
          <div key={s.label}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
              <span style={{ fontFamily: fonts.body, fontSize: 11, color: C.textMuted, textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</span>
              {s.pct > 0 && <span style={{ fontFamily: fonts.body, fontSize: 11, fontWeight: 600, color: s.color }}>{s.pct}%</span>}
            </div>
            <div style={{ height: 4, backgroundColor: "#E4E4E4", overflow: "hidden" }}>
              <motion.div initial={{ width: 0 }} whileInView={{ width: `${s.pct}%` }} viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.2 + i * 0.25, ease: [0.22, 1, 0.36, 1] }}
                style={{ height: "100%", backgroundColor: s.color }} />
            </div>
          </div>
        ))}
      </div>
      {/* Right: key specs */}
      <div style={{ backgroundColor: C.bgAlt, padding: "32px 32px", display: "flex", flexDirection: "column", justifyContent: "center" }}>
        {[
          { label: "Avg. time", value: "< 40 seconds" },
          { label: "GPU", value: "NVIDIA H100 80GB" },
          { label: "Output", value: "WAV 24-bit / MP3 320" },
          { label: "Max stems", value: "6" },
        ].map((row, i) => (
          <div key={row.label} style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "10px 0", borderBottom: i < 3 ? "1px solid #E4E4E4" : "none",
          }}>
            <span style={{ fontFamily: fonts.body, fontSize: 12, color: C.textMuted }}>{row.label}</span>
            <span style={{ fontFamily: fonts.heading, fontSize: 13, fontWeight: 600, color: C.text }}>{row.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Compare page ───────────────────────────────────────────
const VERSIONS = [
  { id: "F1", label: "F1 — Pipeline + Big Number (2 colonnes)", component: VersionF },
  { id: "F2", label: "F2 — Pipeline full-width, minimal, total en bas", component: VersionF2 },
  { id: "F3", label: "F3 — 3 step cards avec barres + hover", component: VersionF3 },
  { id: "F4", label: "F4 — Timeline horizontale + stat blocks", component: VersionF4 },
];

export default function SpeedComparePage() {
  return (
    <div style={{ backgroundColor: C.bg, minHeight: "100vh", paddingTop: 40, paddingBottom: 120 }}>
      <Container>
        <h1 style={{ fontFamily: fonts.heading, fontSize: 32, fontWeight: 700, color: C.text, marginBottom: 8 }}>
          Speed Section — Compare Versions
        </h1>
        <p style={{ fontFamily: fonts.body, fontSize: 14, color: C.textMuted, marginBottom: 64 }}>
          Scroll through all 5 versions. Pick the one you like.
        </p>

        {VERSIONS.map(({ id, label, component: Comp }) => (
          <div key={id} style={{ marginBottom: 80 }}>
            <div style={{
              fontFamily: fonts.heading, fontSize: 18, fontWeight: 700, color: C.text,
              marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.04em",
            }}>
              Version {id}
            </div>
            <div style={{ fontFamily: fonts.body, fontSize: 13, color: C.textMuted, marginBottom: 24 }}>
              {label}
            </div>
            {/* Section header (same for all) */}
            <div style={{ marginBottom: 32 }}>
              <SectionLabel>Speed</SectionLabel>
              <h2 style={{
                fontFamily: fonts.heading, fontSize: 48, fontWeight: 700,
                lineHeight: 1.08, letterSpacing: "-0.02em", color: C.text,
                margin: "16px 0 0",
              }}>
                Fast enough to not think about it.
              </h2>
            </div>
            <Comp />
            <div style={{ height: 1, backgroundColor: "#E0E0E0", marginTop: 80 }} />
          </div>
        ))}
      </Container>
    </div>
  );
}
