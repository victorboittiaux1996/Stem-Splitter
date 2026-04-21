"use client";

import React from "react";
import { PLANS, type PlanId, ANNUAL_DISCOUNT_PERCENT, type BillingPeriod } from "@/lib/plans";
import { stemColors } from "@/components/website/theme";
import { RiCheckLine } from "@remixicon/react";
import { ChangePlanModal } from "./change-plan-modal";
import { toast } from "sonner";

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
  rolloverMinutes?: number;
  minutesAvailable?: number;
  remainingFormatted?: string;
  usagePercent?: number;
  daysUntilReset?: number;
  isCanceledButActive?: boolean;
  periodEnd?: string | null;
  currentBilling?: "monthly" | "annual";
  onUpgrade?: (plan: "pro" | "studio", billing?: "monthly" | "annual") => void;
  displayName?: string;
  email?: string;
  initials?: string;
  avatarUrl?: string | null;
  createdAt?: string;
  usageHistory?: { date: string; details: string; type: string; time: string; positive: boolean }[];
  onPlanChanged?: () => void;
  pendingPlanChange?: { plan: "pro" | "studio"; billing: "monthly" | "annual" } | null;
  onConsumePendingPlanChange?: () => void;
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

// ─── Billing history card — lists Polar invoices ───
interface Invoice {
  id: string;
  createdAt: string;
  totalMajor: number;
  currency: string;
  invoiceNumber: string | null;
  status: string;
  paid: boolean;
}

function InvoicesCard({ C }: { C: AccountViewProps["C"] }) {
  const [invoices, setInvoices] = React.useState<Invoice[] | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/subscription/invoices")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setErr(d.error);
        else setInvoices(d.invoices ?? []);
      })
      .catch(() => setErr("Failed to load invoices"));
  }, []);

  const fmt = (amount: number, currency: string) => {
    try { return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount); }
    catch { return `${amount.toFixed(2)} ${currency}`; }
  };

  return (
    <div style={{ backgroundColor: C.bgCard, padding: 24, marginBottom: 24 }}>
      <SectionHeading C={C}>Billing History</SectionHeading>
      {invoices === null && !err && (
        <div style={{ fontSize: 13, color: C.textMuted, padding: "8px 0" }}>Loading…</div>
      )}
      {err && (
        <div style={{ fontSize: 13, color: C.textMuted, padding: "8px 0" }}>{err}</div>
      )}
      {invoices && invoices.length === 0 && (
        <div style={{ fontSize: 13, color: C.textMuted, padding: "8px 0" }}>No invoices yet.</div>
      )}
      {invoices && invoices.length > 0 && (
        <div>
          <div className="grid" style={{ gridTemplateColumns: "140px 1fr 120px 90px 80px", gap: 0 }}>
            {["DATE", "INVOICE", "AMOUNT", "STATUS", ""].map((col, i) => (
              <div key={col + i} style={{ padding: "8px 0", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.textMuted, textAlign: i >= 2 ? "right" as const : "left" as const, borderBottom: `1px solid ${C.text}14`, textTransform: "uppercase" as const }}>
                {col}
              </div>
            ))}
          </div>
          {invoices.map((inv, i) => (
            <div
              key={inv.id}
              className="grid"
              style={{
                gridTemplateColumns: "140px 1fr 120px 90px 80px",
                gap: 0,
                backgroundColor: i % 2 === 1 ? `${C.text}03` : "transparent",
              }}
            >
              <div style={{ padding: "11px 0", fontSize: 12, color: C.textMuted }}>
                {new Date(inv.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
              </div>
              <div style={{ padding: "11px 0", fontSize: 12, color: C.text }}>
                {inv.invoiceNumber ?? inv.id.slice(0, 12)}
              </div>
              <div style={{ padding: "11px 0", fontSize: 12, color: C.text, fontWeight: 600, textAlign: "right" }}>
                {fmt(inv.totalMajor, inv.currency)}
              </div>
              <div style={{ padding: "11px 0", fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: inv.paid ? C.text : C.textMuted, textAlign: "right", textTransform: "uppercase" as const }}>
                {inv.paid ? "Paid" : inv.status}
              </div>
              <div style={{ padding: "11px 0", textAlign: "right" }}>
                {inv.paid && (
                  <a
                    href={`/api/subscription/invoices?download=${inv.id}`}
                    style={{ color: C.accent, textDecoration: "none", fontWeight: 700, letterSpacing: "0.08em", fontSize: 10, textTransform: "uppercase" as const }}
                  >
                    PDF →
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Plan accents matching the website /pricing page ───
const planAccents: Record<PlanId, { label: string; color: string }> = {
  free: { label: "Free", color: "#3A3A3A" },
  pro: { label: "Pro", color: stemColors.vocals },
  studio: { label: "Studio", color: stemColors.drums },
};

const PLAN_ORDER: PlanId[] = ["free", "pro", "studio"];

function PlansAndPricing({ C, planLabel, minutesIncluded, onSectionChange, onPlanChanged, pendingPlanChange, onConsumePendingPlanChange }: {
  C: AccountViewProps["C"];
  planLabel?: string;
  isPro?: boolean;
  minutesIncluded?: number;
  onUpgrade?: (plan: "pro" | "studio", billing?: "monthly" | "annual") => void;
  onSectionChange: (s: SettingsSection) => void;
  onPlanChanged?: () => void;
  pendingPlanChange?: { plan: "pro" | "studio"; billing: "monthly" | "annual" } | null;
  onConsumePendingPlanChange?: () => void;
}) {
  const [annual, setAnnual] = React.useState(false);
  const [modalTarget, setModalTarget] = React.useState<{ plan: PlanId; billing: BillingPeriod } | null>(null);
  const [cancelLoading, setCancelLoading] = React.useState(false);
  const [redirectingPlan, setRedirectingPlan] = React.useState<PlanId | null>(null);

  // Reset the "Redirecting…" state when the page is restored from the browser
  // bfcache (user clicked back from Polar checkout). Without this, the button
  // stays stuck in loading after coming back.
  React.useEffect(() => {
    const reset = () => setRedirectingPlan(null);
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  // Derive current plan from planLabel
  const currentPlan: PlanId =
    planLabel === "Studio" ? "studio" :
    planLabel === "Pro" ? "pro" : "free";

  const planTier = PLAN_ORDER.indexOf(currentPlan);

  const redirectToCheckout = React.useCallback(async (plan: PlanId, billing: BillingPeriod, onSuccess?: () => void) => {
    setRedirectingPlan(plan);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, billing }),
      });
      const data = await res.json();
      if (data.url) {
        onSuccess?.();
        window.location.href = data.url;
        return; // stays in loading state — page is navigating away
      }
      toast.error(data.error || "Failed to start checkout");
    } catch {
      toast.error("Something went wrong");
    }
    setRedirectingPlan(null); // only reached on error
  }, []);

  // Auto-redirect (free) or open modal (paid) when pricing CTA arrives with ?upgrade=...
  React.useEffect(() => {
    if (pendingPlanChange) {
      const billing = pendingPlanChange.billing;
      setAnnual(billing === "annual");
      if (currentPlan === "free") {
        // Consume only after successful redirect to avoid losing the pending change on fetch failure.
        void redirectToCheckout(pendingPlanChange.plan, billing, onConsumePendingPlanChange);
      } else {
        setModalTarget({ plan: pendingPlanChange.plan, billing });
        onConsumePendingPlanChange?.();
      }
    }
  }, [pendingPlanChange, currentPlan, redirectToCheckout, onConsumePendingPlanChange]);

  const openChange = (plan: PlanId) => {
    if (plan === "free") return;
    const billing: BillingPeriod = annual ? "annual" : "monthly";
    if (currentPlan === "free") {
      void redirectToCheckout(plan, billing);
      return;
    }
    setModalTarget({ plan, billing });
  };

  const handleCancel = async () => {
    if (!confirm("Cancel your subscription? You'll keep access until the end of your current billing period.")) return;
    setCancelLoading(true);
    try {
      const res = await fetch("/api/subscription/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success("Subscription canceled. Access continues until period end.");
        window.dispatchEvent(new CustomEvent("usage-updated"));
        onPlanChanged?.();
      } else {
        toast.error(data.error || "Failed to cancel");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setCancelLoading(false);
    }
  };

  return (
    <div>
      {/* Current plan card */}
      <div style={{ backgroundColor: C.bgCard, padding: 20, marginBottom: 20 }}>
        <div className="flex items-center justify-between">
          <div>
            <SectionHeading C={C}>Current Plan</SectionHeading>
            <div className="flex items-center gap-[10px]" style={{ marginTop: 4 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: C.text }}>{planLabel ?? "Free"}</span>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.08em", color: C.badgeText, backgroundColor: C.badgeBg, padding: "2px 7px" }}>
                {planLabel?.toUpperCase() ?? "FREE"}
              </span>
            </div>
            <div style={{ fontSize: 12, color: C.textMuted, marginTop: 4 }}>{minutesIncluded} min / month</div>
          </div>
        </div>
      </div>

      {/* Billing toggle */}
      <div className="flex items-center gap-[12px]" style={{ marginBottom: 16 }}>
        <button
          onClick={() => setAnnual(!annual)}
          style={{
            position: "relative", width: 40, height: 22,
            backgroundColor: annual ? C.accent : C.bgHover,
            border: "none", cursor: "pointer", padding: 0,
            transition: "background-color 0.2s",
          }}
        >
          <div style={{
            position: "absolute", top: 2,
            left: annual ? 20 : 2,
            width: 18, height: 18, backgroundColor: "#FFFFFF",
            transition: "left 0.2s ease",
          }} />
        </button>
        <span style={{ fontSize: 13, fontWeight: 500, color: C.text }}>
          Pay annually,{" "}
          <span style={{ color: C.accent }}>save {ANNUAL_DISCOUNT_PERCENT}%</span>
        </span>
      </div>

      {/* Plan cards grid — matching website /pricing style */}
      <div className="grid grid-cols-3 gap-[2px]" style={{ marginBottom: 20 }}>
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const accent = planAccents[id];
          const tier = PLAN_ORDER.indexOf(id);
          const isCurrent = id === currentPlan;
          const canUpgrade = tier > planTier;
          const price = annual ? `$${plan.yearlyPriceUSD}` : `$${plan.priceUSD}`;
          const period = id === "free" ? "forever" : "/mo";

          // CTA logic — adaptive based on user's current plan
          let ctaLabel: string | null = null;
          let ctaAction: "upgrade" | "downgrade" | "current" | "cancel" | "get" | null = null;
          if (id === "free") {
            if (currentPlan !== "free") {
              ctaLabel = "Cancel subscription";
              ctaAction = "cancel";
            } else {
              ctaLabel = "Current plan";
              ctaAction = "current";
            }
          } else if (isCurrent) {
            // id is "pro" | "studio" here — allow billing period switch
            ctaLabel = annual ? "Switch to annual" : "Switch to monthly";
            ctaAction = "upgrade";
          } else if (canUpgrade) {
            ctaLabel = currentPlan === "free" ? `Get ${accent.label}` : `Upgrade to ${accent.label}`;
            ctaAction = currentPlan === "free" ? "get" : "upgrade";
          } else {
            ctaLabel = `Downgrade to ${accent.label}`;
            ctaAction = "downgrade";
          }
          const isClickable = ctaAction === "upgrade" || ctaAction === "downgrade" || ctaAction === "get" || ctaAction === "cancel";

          return (
            <div
              key={id}
              style={{
                backgroundColor: C.bgCard,
                padding: "24px 20px 28px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Plan name */}
              <div style={{ fontSize: 18, fontWeight: 600, letterSpacing: "-0.01em", color: C.text, marginBottom: 2 }}>
                {accent.label}
              </div>

              {/* Tagline */}
              <div style={{ fontSize: 12, fontWeight: 400, color: C.textMuted, marginBottom: 14 }}>
                {plan.tagline}
              </div>

              {/* Price */}
              <div className="flex items-baseline gap-[3px]" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 36, fontWeight: 700, lineHeight: 1, color: C.text }}>{price}</span>
                <span style={{ fontSize: 13, fontWeight: 400, color: C.textMuted }}>{period}</span>
              </div>

              {/* Annual savings */}
              <div style={{ minHeight: annual && id !== "free" ? 20 : 0, marginBottom: 14 }}>
                {annual && id !== "free" && (
                  <div className="flex items-center gap-[6px]">
                    <span style={{ fontSize: 12, textDecoration: "line-through", color: C.textMuted }}>${plan.priceUSD}/mo</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: C.accent }}>${(plan.yearlyPriceUSD * 12).toFixed(0)}/yr</span>
                  </div>
                )}
              </div>

              {/* CTA Button */}
              {ctaLabel && (
                <button
                  onClick={
                    !isClickable
                      ? undefined
                      : ctaAction === "cancel"
                      ? () => { void handleCancel(); }
                      : () => openChange(id)
                  }
                  disabled={!isClickable || (ctaAction === "cancel" && cancelLoading) || redirectingPlan !== null}
                  style={{
                    width: "100%",
                    padding: "10px 0",
                    marginBottom: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                    cursor: isClickable ? "pointer" : "default",
                    border: "none",
                    backgroundColor:
                      ctaAction === "upgrade" || ctaAction === "get" ? accent.color :
                      ctaAction === "downgrade" || ctaAction === "cancel" ? C.bgHover :
                      C.bgHover,
                    color:
                      ctaAction === "upgrade" || ctaAction === "get" ? "#FFFFFF" :
                      ctaAction === "downgrade" || ctaAction === "cancel" ? C.text :
                      C.textMuted,
                    opacity: ctaAction === "cancel" && cancelLoading ? 0.5 : 1,
                    transition: "opacity 0.15s",
                  }}
                >
                  {ctaAction === "cancel" && cancelLoading
                    ? "Canceling…"
                    : redirectingPlan === id && (ctaAction === "get" || ctaAction === "upgrade")
                    ? "Redirecting…"
                    : ctaLabel}
                </button>
              )}

              {/* Features */}
              <div style={{ flex: 1 }}>
                {plan.features.map((f) => (
                  <div key={f} className="flex items-center gap-[8px]" style={{ marginBottom: 8 }}>
                    <RiCheckLine size={14} style={{ flexShrink: 0, color: isCurrent ? C.accent : accent.color }} />
                    <span style={{ fontSize: 13, fontWeight: 400, color: C.text }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ height: 1, backgroundColor: C.text, opacity: 0.08, marginBottom: 20 }} />

      <div className="flex items-center justify-between">
        <a
          href="/pricing"
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 13, color: C.textMuted, textDecoration: "none" }}
        >
          See full pricing details and comparison →
        </a>
        <button
          onClick={() => onSectionChange("usage")}
          style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: C.accent, cursor: "pointer" }}
        >
          VIEW USAGE →
        </button>
      </div>

      <ChangePlanModal
        open={modalTarget !== null}
        onClose={() => setModalTarget(null)}
        targetPlan={modalTarget?.plan ?? null}
        targetBilling={modalTarget?.billing ?? "monthly"}
        C={C}
        onSuccess={() => onPlanChanged?.()}
      />
    </div>
  );
}

export function AccountView({ C, section, onSectionChange, planLabel = "Free Plan", isPro = false, minutesUsed = 0, minutesIncluded = 10, rolloverMinutes = 0, minutesAvailable, remainingFormatted = "10:00", usagePercent = 0, daysUntilReset = 30, onUpgrade, displayName = "User", email = "", initials = "U", avatarUrl, createdAt, usageHistory, onPlanChanged, pendingPlanChange, onConsumePendingPlanChange }: AccountViewProps) {
  const effectiveMinutes = minutesAvailable ?? minutesIncluded;
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
  const [autoDownloadZip, setAutoDownloadZip] = React.useState(true);

  // Load preferences from localStorage on mount
  React.useEffect(() => {
    try {
      const saved = localStorage.getItem("44stems-preferences");
      if (saved) {
        const p = JSON.parse(saved);
        if (p.stems) setDefaultStems(p.stems);
        if (p.format) setDefaultFormat(p.format);
        if (typeof p.autoDownloadZip === "boolean") setAutoDownloadZip(p.autoDownloadZip);
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
        stems: defaultStems, format: defaultFormat, autoDownloadZip,
        notifSplit: notifSplitComplete, notifUpdates: notifProductUpdates, notifMarketing,
      }));
    } catch {}
  }, [defaultStems, defaultFormat, autoDownloadZip, notifSplitComplete, notifProductUpdates, notifMarketing]);

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
                <span style={{ fontSize: 12, color: C.textMuted }}>
                  {`${minutesUsed.toFixed(1)} of ${effectiveMinutes} min used`}
                  {rolloverMinutes > 0 && (
                    <span style={{ marginLeft: 6, color: C.accent }}>
                      {`(${minutesIncluded} + ${rolloverMinutes.toFixed(1)} rollover)`}
                    </span>
                  )}
                </span>
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

            {/* Subscription management card — only for paying users */}
            {isPro && (
              <div style={{ backgroundColor: C.bgCard, padding: 24, marginBottom: 24 }}>
                <SectionHeading C={C}>Subscription</SectionHeading>
                <div className="flex items-center justify-between" style={{ paddingTop: 8 }}>
                  <div style={{ fontSize: 13, color: C.textMuted }}>Update payment method</div>
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch("/api/portal", { method: "POST" });
                        const data = await res.json();
                        if (data.url) window.open(data.url, "_blank");
                      } catch {}
                    }}
                    style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.04em", color: C.accent, cursor: "pointer" }}
                  >
                    MANAGE PAYMENT →
                  </button>
                </div>
              </div>
            )}

            {/* Billing history — invoices from Polar */}
            {isPro && <InvoicesCard C={C} />}

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
          <PlansAndPricing C={C} planLabel={planLabel} isPro={isPro} minutesIncluded={minutesIncluded} onUpgrade={onUpgrade} onSectionChange={onSectionChange} onPlanChanged={onPlanChanged} pendingPlanChange={pendingPlanChange} onConsumePendingPlanChange={onConsumePendingPlanChange} />
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

            {/* Downloads card */}
            <div style={{ backgroundColor: C.bgCard, padding: 24, marginBottom: 24 }}>
              <SectionHeading C={C}>Downloads</SectionHeading>
              <div className="flex items-center justify-between" style={{ paddingTop: 12, paddingBottom: 12 }}>
                <div>
                  <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>Auto-download ZIP</div>
                  <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>Automatically download the stems ZIP when a split completes</div>
                </div>
                <button onClick={() => setAutoDownloadZip(!autoDownloadZip)}><Toggle on={autoDownloadZip} C={C} /></button>
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
