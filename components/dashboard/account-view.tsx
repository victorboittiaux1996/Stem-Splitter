"use client";

import React from "react";
import { PLANS } from "@/lib/plans";

export type SettingsSection = "profile" | "subscription" | "usage" | "defaults";

type C = {
  bg: string; bgCard: string; bgSubtle: string; bgHover: string; bgElevated: string;
  text: string; textSec: string; textMuted: string;
  accent: string; accentText: string;
  sidebarBg: string; navActive: string;
  badgeBg: string; badgeText: string; dropZoneBg: string;
};

interface AccountViewProps {
  C: C;
  section: SettingsSection;
  onSectionChange: (s: SettingsSection) => void;
  planLabel?: string;
  isPro?: boolean;
  minutesUsed?: number;
  minutesIncluded?: number;
  remainingFormatted?: string;
  usagePercent?: number;
  daysUntilReset?: number;
  onUpgrade?: (plan: "pro" | "studio") => void;
  displayName?: string;
  email?: string;
  initials?: string;
  avatarUrl?: string | null;
  createdAt?: string;
  usageHistory?: { date: string; details: string; type: string; time: string; positive: boolean }[];
}

// Mock usage history data
const USAGE_HISTORY = [
  { date: "Mar 31, 2026", details: "Daily Free Credits",          type: "Credit", time: "+5:00",  positive: true  },
  { date: "Mar 31, 2026", details: "Ibiza Afterhours Tech",       type: "6-stem", time: "−3:45",  positive: false },
  { date: "Mar 30, 2026", details: "Daily Free Credits",          type: "Credit", time: "+5:00",  positive: true  },
  { date: "Mar 30, 2026", details: "High-Fashion Diva Pop",       type: "4-stem", time: "−2:15",  positive: false },
  { date: "Mar 23, 2026", details: "Daily Free Credits",          type: "Credit", time: "+5:00",  positive: true  },
  { date: "Mar 23, 2026", details: "Aggressive Industrial Techno",type: "6-stem", time: "−4:10",  positive: false },
  { date: "Mar 23, 2026", details: "Untitled conversation",       type: "2-stem", time: "−1:20",  positive: false },
  { date: "Mar 23, 2026", details: "Minimalist Electro-clash",    type: "4-stem", time: "−3:00",  positive: false },
  { date: "Mar 23, 2026", details: "Deadpan Dance-Punk",          type: "4-stem", time: "−2:45",  positive: false },
  { date: "Mar 23, 2026", details: "Electro Vocal Punk",          type: "2-stem", time: "−1:15",  positive: false },
  { date: "Mar 22, 2026", details: "Daily Free Credits",          type: "Credit", time: "+5:00",  positive: true  },
  { date: "Mar 20, 2026", details: "Daily Free Credits",          type: "Credit", time: "+5:00",  positive: true  },
];

// Features derived from central plan config
const FREE_FEATURES = PLANS.free.features;
const PRO_FEATURES = PLANS.pro.features;
const STUDIO_FEATURES = PLANS.studio.features;

const TABS: { id: SettingsSection; label: string }[] = [
  { id: "profile",       label: "ACCOUNT SETTINGS" },
  { id: "usage",          label: "USAGE & BILLING" },
  { id: "subscription",   label: "PLANS & PRICING" },
  { id: "defaults",       label: "PREFERENCES" },
];

// ─── Reusable section heading ───
function SectionHeading({ children, C }: { children: React.ReactNode; C: C }) {
  return (
    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: C.textMuted, textTransform: "uppercase" as const, marginBottom: 12 }}>
      {children}
    </div>
  );
}

// ─── Reusable row ───
function InfoRow({ label, value, C, last }: { label: string; value: React.ReactNode; C: C; last?: boolean }) {
  return (
    <div className="flex items-center" style={{ paddingTop: 12, paddingBottom: 12, borderBottom: last ? "none" : `1px solid ${C.text}0A` }}>
      <span style={{ width: 200, fontSize: 13, color: C.textMuted, flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{value}</span>
    </div>
  );
}

// ─── Toggle switch ───
function Toggle({ on, C }: { on: boolean; C: C }) {
  return (
    <div style={{
      width: 36, height: 20, backgroundColor: on ? C.accent : C.bgHover,
      position: "relative", cursor: "pointer", transition: "background-color 150ms",
    }}>
      <div style={{
        width: 16, height: 16, backgroundColor: "#fff",
        position: "absolute", top: 2, left: on ? 18 : 2,
        transition: "left 150ms",
      }} />
    </div>
  );
}

export function AccountView({ C, section, onSectionChange, planLabel = "Free Plan", isPro = false, minutesUsed = 0, minutesIncluded = 10, remainingFormatted = "10:00", usagePercent = 0, daysUntilReset = 30, onUpgrade, displayName = "User", email = "", initials = "U", avatarUrl, createdAt, usageHistory }: AccountViewProps) {
  const memberSince = createdAt
    ? new Date(createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";
  const [showAll, setShowAll] = React.useState(false);
  const historyData = usageHistory ?? USAGE_HISTORY;
  const visibleRows = showAll ? historyData : historyData.slice(0, 10);

  // Preferences persisted in localStorage
  const [notifSplitComplete, setNotifSplitComplete] = React.useState(true);
  const [notifProductUpdates, setNotifProductUpdates] = React.useState(true);
  const [notifMarketing, setNotifMarketing] = React.useState(false);
  const [defaultStems, setDefaultStems] = React.useState<2 | 4 | 6>(4);
  const [defaultFormat, setDefaultFormat] = React.useState<"wav" | "mp3">("wav");
  const [defaultQuality, setDefaultQuality] = React.useState<"fast" | "balanced" | "high">("fast");

  // Load preferences from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("44stems-preferences");
      if (saved) {
        const p = JSON.parse(saved);
        if (p.stems) setDefaultStems(p.stems);
        if (p.format) setDefaultFormat(p.format);
        if (p.quality) setDefaultQuality(p.quality);
        if (typeof p.notifSplit === "boolean") setNotifSplitComplete(p.notifSplit);
        if (typeof p.notifUpdates === "boolean") setNotifProductUpdates(p.notifUpdates);
        if (typeof p.notifMarketing === "boolean") setNotifMarketing(p.notifMarketing);
      }
    } catch {}
  }, []);

  // Save preferences to localStorage on change
  React.useEffect(() => {
    try {
      localStorage.setItem("44stems-preferences", JSON.stringify({
        stems: defaultStems, format: defaultFormat, quality: defaultQuality,
        notifSplit: notifSplitComplete, notifUpdates: notifProductUpdates, notifMarketing,
      }));
    } catch {}
  }, [defaultStems, defaultFormat, defaultQuality, notifSplitComplete, notifProductUpdates, notifMarketing]);

  return (
    <div className="px-[24px] pt-[24px] pb-[40px]">
      <div style={{ maxWidth: 900, margin: "0 auto" }}>

        {/* Spacer to align tabs with UPLOAD | LINK in Split Audio */}
        <div style={{ height: 58 }} />
        <div className="flex items-center gap-[20px] mb-[24px]">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => onSectionChange(tab.id)}
              className="pb-[6px] text-[14px] font-semibold transition-colors"
              style={{
                color: section === tab.id ? C.text : C.textMuted,
                borderBottom: section === tab.id ? `2px solid ${C.accent}` : "2px solid transparent",
                letterSpacing: "0.04em",
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════
            ACCOUNT SETTINGS
           ══════════════════════════════════════════════════════ */}
        {section === "profile" && (
          <div>
            {/* Profile card */}
            <div style={{ backgroundColor: C.bgCard, padding: 24, marginBottom: 24 }}>
              <div className="flex items-center gap-[16px]" style={{ marginBottom: 20 }}>
                <div className="shrink-0 flex items-center justify-center"
                  style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #1B10FD 0%, #7C3AED 100%)" }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: "#fff" }}>{initials}</span>
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{displayName}</div>
                  <div style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{email}</div>
                </div>
              </div>

              <div style={{ height: 1, backgroundColor: C.text, opacity: 0.08, marginBottom: 16 }} />

              <SectionHeading C={C}>Personal Information</SectionHeading>
              <InfoRow label="Full name" value={displayName} C={C} />
              <InfoRow label="Email address" value={email} C={C} />
              <InfoRow label="Member since" value={memberSince} C={C} last />
            </div>

            {/* Connected accounts card */}
            <div style={{ backgroundColor: C.bgCard, padding: 24, marginBottom: 24 }}>
              <SectionHeading C={C}>Connected Accounts</SectionHeading>
              <div className="flex items-center justify-between" style={{ paddingTop: 8, paddingBottom: 8 }}>
                <div className="flex items-center gap-[12px]">
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62Z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z" fill="#34A853"/>
                    <path d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33Z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.42 0 9 0A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z" fill="#EA4335"/>
                  </svg>
                  <div>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>Google</div>
                    <div style={{ fontSize: 12, color: C.textMuted }}>{email}</div>
                  </div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", color: C.textMuted }}>CONNECTED</span>
              </div>
            </div>

            {/* Notifications card */}
            <div style={{ backgroundColor: C.bgCard, padding: 24, marginBottom: 24 }}>
              <SectionHeading C={C}>Notifications</SectionHeading>
              {[
                { label: "Split complete", desc: "Email when your stem separation is finished", on: notifSplitComplete, toggle: () => setNotifSplitComplete(!notifSplitComplete) },
                { label: "Product updates", desc: "New features and improvements", on: notifProductUpdates, toggle: () => setNotifProductUpdates(!notifProductUpdates) },
                { label: "Marketing", desc: "Promotions, offers, and tips", on: notifMarketing, toggle: () => setNotifMarketing(!notifMarketing) },
              ].map(({ label, desc, on, toggle }, i, arr) => (
                <div key={label} className="flex items-center justify-between"
                  style={{ paddingTop: 12, paddingBottom: 12, borderBottom: i < arr.length - 1 ? `1px solid ${C.text}0A` : "none" }}>
                  <div>
                    <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{label}</div>
                    <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>{desc}</div>
                  </div>
                  <button onClick={toggle}><Toggle on={on} C={C} /></button>
                </div>
              ))}
            </div>

            {/* Current Plan card */}
            <div style={{ backgroundColor: C.bgCard, padding: 24, marginBottom: 24 }}>
              <SectionHeading C={C}>Current Plan</SectionHeading>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-[10px]">
                  <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{isPro ? (planLabel?.replace(" Plan", "") ?? "Pro") : "Free"}</span>
                  <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.badgeText, backgroundColor: C.badgeBg, padding: "2px 7px" }}>
                    {planLabel?.toUpperCase() ?? "FREE PLAN"}
                  </span>
                </div>
                <button
                  onClick={() => onSectionChange("subscription")}
                  style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: C.accent, cursor: "pointer" }}
                >
                  VIEW PLANS →
                </button>
              </div>
            </div>

            {/* Account actions card */}
            <div style={{ backgroundColor: C.bgCard, padding: 24 }}>
              <SectionHeading C={C}>Account</SectionHeading>
              <div className="flex items-center gap-[24px]">
                <button style={{ fontSize: 13, fontWeight: 500, color: C.textSec, cursor: "pointer" }}>
                  Sign out
                </button>
                <button style={{ fontSize: 13, fontWeight: 500, color: "#FF3B30", cursor: "pointer" }}>
                  Delete account
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            USAGE & BILLING
           ══════════════════════════════════════════════════════ */}
        {section === "usage" && (
          <div>
            {/* Quota summary card */}
            <div style={{ backgroundColor: C.bgCard, padding: 24, marginBottom: 24 }}>
              <div className="flex items-start justify-between" style={{ marginBottom: 16 }}>
                <div>
                  <SectionHeading C={C}>Remaining this month</SectionHeading>
                  <div className="flex items-baseline gap-[6px]">
                    <span style={{ fontSize: 36, fontWeight: 700, letterSpacing: "-0.02em", color: C.text }}>{remainingFormatted}</span>
                    <span style={{ fontSize: 14, color: C.textMuted }}>{"min left"}</span>
                  </div>
                </div>
                {usagePercent > 80 && (
                  <div style={{ backgroundColor: "#FF6B0015", padding: "4px 10px" }}>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: "#FF6B00" }}>LOW BALANCE</span>
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 10 }}>
                <div style={{ height: 4, backgroundColor: C.bgHover }}>
                  <div style={{ height: "100%", width: `${isPro ? 100 : usagePercent}%`, backgroundColor: C.accent }} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span style={{ fontSize: 12, color: C.textMuted }}>{`${minutesUsed.toFixed(1)} of ${minutesIncluded} min used`}</span>
                <span style={{ fontSize: 12, color: C.textMuted }}>Resets in {daysUntilReset} days</span>
              </div>

              <div style={{ height: 1, backgroundColor: C.text, opacity: 0.08, margin: "16px 0" }} />

              {!isPro && (
                <button
                  onClick={() => onUpgrade?.("pro")}
                  style={{ width: "100%", padding: "10px 0", backgroundColor: C.accent, color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer" }}
                >
                  UPGRADE FOR MORE MINUTES
                </button>
              )}
            </div>

            {/* Payment method card */}
            <div style={{ backgroundColor: C.bgCard, padding: 24, marginBottom: 24 }}>
              <SectionHeading C={C}>Payment Method</SectionHeading>
              <div className="flex items-center justify-between" style={{ paddingTop: 8 }}>
                <div style={{ fontSize: 13, color: C.textMuted }}>No payment method on file</div>
                <button style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: C.accent, cursor: "pointer" }}>
                  ADD PAYMENT METHOD
                </button>
              </div>
            </div>

            {/* Invoice history card */}
            <div style={{ backgroundColor: C.bgCard, padding: 24, marginBottom: 24 }}>
              <SectionHeading C={C}>Invoices</SectionHeading>
              <div style={{ fontSize: 13, color: C.textMuted, paddingTop: 8 }}>No invoices yet</div>
            </div>

            {/* Usage history table */}
            <div style={{ marginBottom: 0 }}>
              <SectionHeading C={C}>Usage History</SectionHeading>

              <div className="grid" style={{ gridTemplateColumns: "140px 1fr 80px 80px", gap: 0 }}>
                {["DATE", "DETAILS", "TYPE", "TIME"].map((col, i) => (
                  <div key={col} style={{ padding: "8px 0", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.textMuted, textAlign: i >= 2 ? "right" as const : "left" as const, borderBottom: `1px solid ${C.text}14` }}>
                    {col}
                  </div>
                ))}
              </div>

              {visibleRows.map((row, i) => (
                <div
                  key={i}
                  className="grid"
                  style={{
                    gridTemplateColumns: "140px 1fr 80px 80px",
                    gap: 0,
                    backgroundColor: i % 2 === 1 ? `${C.text}03` : "transparent",
                  }}
                >
                  <div style={{ padding: "11px 0", fontSize: 12, color: C.textMuted }}>{row.date}</div>
                  <div style={{ padding: "11px 0", fontSize: 13, color: C.text, overflow: "hidden", whiteSpace: "nowrap" as const, textOverflow: "ellipsis", paddingRight: 16 }}>{row.details}</div>
                  <div style={{ padding: "11px 0", fontSize: 12, color: C.textMuted, textAlign: "right" as const }}>{row.type}</div>
                  <div style={{ padding: "11px 0", fontSize: 13, fontWeight: 600, color: row.positive ? C.accent : C.text, textAlign: "right" as const }}>{row.time}</div>
                </div>
              ))}

              {!showAll && USAGE_HISTORY.length > 10 && (
                <div className="text-center" style={{ paddingTop: 16 }}>
                  <button
                    onClick={() => setShowAll(true)}
                    style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", color: C.textMuted, cursor: "pointer" }}
                  >
                    SHOW MORE ({USAGE_HISTORY.length - 10} HIDDEN)
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PLANS & PRICING
           ══════════════════════════════════════════════════════ */}
        {section === "subscription" && (
          <div>
            {/* Current plan card */}
            <div style={{ backgroundColor: C.bgCard, padding: 24, marginBottom: 24 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
                <div>
                  <SectionHeading C={C}>Current Plan</SectionHeading>
                  <div className="flex items-center gap-[10px]" style={{ marginTop: 4 }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: C.text }}>{isPro ? (planLabel?.replace(" Plan", "") ?? "Pro") : "Free"}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.badgeText, backgroundColor: C.badgeBg, padding: "3px 8px" }}>
                      {planLabel?.toUpperCase() ?? "FREE PLAN"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{minutesIncluded} min / month · Resets monthly</div>
                </div>
              </div>
              {!isPro && (
                <button
                  onClick={() => onUpgrade?.("pro")}
                  style={{ width: "100%", padding: "10px 0", backgroundColor: C.accent, color: "#fff", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer" }}
                >
                  UPGRADE TO PRO
                </button>
              )}
            </div>

            {/* Plan comparison — 3 columns */}
            <SectionHeading C={C}>Compare Plans</SectionHeading>
            <div className="grid grid-cols-3 gap-[12px]" style={{ marginBottom: 32, marginTop: 8 }}>
              {/* Free */}
              <div style={{ backgroundColor: C.bgCard, padding: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: C.textMuted, marginBottom: 4 }}>FREE</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 16 }}>$0</div>
                {FREE_FEATURES.map((f, i) => (
                  <div key={i} className="flex items-start gap-[8px]" style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: C.textMuted, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13, color: C.textSec }}>{f}</span>
                  </div>
                ))}
              </div>
              {/* Pro */}
              <div style={{ backgroundColor: C.bgCard, padding: 20, borderLeft: `2px solid ${C.accent}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: C.accent, marginBottom: 4 }}>PRO</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 16 }}>${PLANS.pro.priceUSD}<span style={{ fontSize: 12, fontWeight: 400, color: C.textMuted }}>/mo</span></div>
                {PRO_FEATURES.map((f, i) => (
                  <div key={i} className="flex items-start gap-[8px]" style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: C.accent, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13, color: C.text }}>{f}</span>
                  </div>
                ))}
                {!isPro && (
                  <button onClick={() => onUpgrade?.("pro")} style={{ width: "100%", padding: "8px 0", marginTop: 12, backgroundColor: C.accent, color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer" }}>
                    UPGRADE TO PRO
                  </button>
                )}
              </div>
              {/* Studio */}
              <div style={{ backgroundColor: C.bgCard, padding: 20, borderLeft: `2px solid ${C.accent}` }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: C.accent, marginBottom: 4 }}>STUDIO</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text, marginBottom: 16 }}>${PLANS.studio.priceUSD}<span style={{ fontSize: 12, fontWeight: 400, color: C.textMuted }}>/mo</span></div>
                {STUDIO_FEATURES.map((f, i) => (
                  <div key={i} className="flex items-start gap-[8px]" style={{ marginBottom: 10 }}>
                    <span style={{ fontSize: 12, color: C.accent, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 13, color: C.text }}>{f}</span>
                  </div>
                ))}
                {planLabel !== "Studio Plan" && (
                  <button onClick={() => onUpgrade?.("studio")} style={{ width: "100%", padding: "8px 0", marginTop: 12, backgroundColor: C.accent, color: "#fff", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer" }}>
                    UPGRADE TO STUDIO
                  </button>
                )}
              </div>
            </div>

            <div style={{ height: 1, backgroundColor: C.text, opacity: 0.08, marginBottom: 24 }} />

            <div className="flex items-center justify-between">
              <span style={{ fontSize: 13, color: C.textMuted }}>Need to check your usage?</span>
              <button
                onClick={() => onSectionChange("usage")}
                style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: C.accent, cursor: "pointer" }}
              >
                VIEW USAGE →
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            PREFERENCES (Processing Defaults)
           ══════════════════════════════════════════════════════ */}
        {section === "defaults" && (
          <div>
            {/* Default stems card */}
            <div style={{ backgroundColor: C.bgCard, padding: 24, marginBottom: 24 }}>
              <SectionHeading C={C}>Default Stem Count</SectionHeading>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
                Applied automatically when you upload a new file
              </div>
              <div className="flex items-center gap-[8px]">
                {([2, 4, 6] as const).map(n => (
                  <button
                    key={n}
                    onClick={() => setDefaultStems(n)}
                    style={{
                      padding: "8px 20px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: defaultStems === n ? "#fff" : C.textSec,
                      backgroundColor: defaultStems === n ? C.accent : C.bgHover,
                      cursor: "pointer",
                      transition: "background-color 100ms",
                    }}
                  >
                    {n} STEMS
                  </button>
                ))}
              </div>
            </div>

            {/* Default output format card */}
            <div style={{ backgroundColor: C.bgCard, padding: 24, marginBottom: 24 }}>
              <SectionHeading C={C}>Default Output Format</SectionHeading>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
                Format used for all exported stems
              </div>
              <div className="flex items-center gap-[8px]">
                {([
                  { id: "wav" as const, label: "WAV", desc: "Lossless" },
                  { id: "mp3" as const, label: "MP3", desc: "Compressed" },
                ]).map(fmt => (
                  <button
                    key={fmt.id}
                    onClick={() => setDefaultFormat(fmt.id)}
                    style={{
                      padding: "8px 20px",
                      fontSize: 13,
                      fontWeight: 600,
                      color: defaultFormat === fmt.id ? "#fff" : C.textSec,
                      backgroundColor: defaultFormat === fmt.id ? C.accent : C.bgHover,
                      cursor: "pointer",
                      transition: "background-color 100ms",
                    }}
                  >
                    {fmt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Default quality card */}
            <div style={{ backgroundColor: C.bgCard, padding: 24, marginBottom: 24 }}>
              <SectionHeading C={C}>Default Processing Quality</SectionHeading>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 16 }}>
                Higher quality uses more processing time per file
              </div>
              <div className="flex items-center gap-[8px]">
                {([
                  { id: "fast" as const,     label: "FAST",     desc: "Fastest, good quality" },
                  { id: "balanced" as const,  label: "BALANCED", desc: "Recommended" },
                  { id: "high" as const,      label: "HIGH",     desc: "Best quality, slower" },
                ]).map(q => (
                  <button
                    key={q.id}
                    onClick={() => setDefaultQuality(q.id)}
                    className="flex flex-col items-center"
                    style={{
                      padding: "12px 20px",
                      fontSize: 12,
                      fontWeight: 600,
                      color: defaultQuality === q.id ? "#fff" : C.textSec,
                      backgroundColor: defaultQuality === q.id ? C.accent : C.bgHover,
                      cursor: "pointer",
                      transition: "background-color 100ms",
                      flex: 1,
                    }}
                  >
                    <span style={{ letterSpacing: "0.06em" }}>{q.label}</span>
                    <span style={{ fontSize: 11, fontWeight: 400, marginTop: 4, opacity: 0.7 }}>{q.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Privacy & Data card */}
            <div style={{ backgroundColor: C.bgCard, padding: 24 }}>
              <SectionHeading C={C}>Privacy & Data</SectionHeading>
              <InfoRow label="File retention" value="Files are automatically deleted after 24 hours" C={C} />
              <InfoRow label="Processing data" value="Audio is never used for training" C={C} last />
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
