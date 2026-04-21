"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PLANS, type PlanId, type BillingPeriod } from "@/lib/plans";
import { toast } from "sonner";
import { RiLoader4Line } from "@remixicon/react";

type PreviewKind = "new" | "upgrade" | "downgrade" | "billing_switch" | "same" | "resume";

interface Preview {
  kind: PreviewKind;
  currentPlan: PlanId;
  currentBilling?: BillingPeriod;
  targetPlan: PlanId;
  targetBilling: BillingPeriod;
  daysRemaining?: number;
  daysInPeriod?: number;
  creditMajor: number;
  chargeMajor: number;
  netMajor: number;
  taxMajor?: number;
  totalMajor?: number;
  vatRate?: number;
  vatKnown?: boolean;
  perPeriodMajor: number;
  currency: string;
  subtitle?: string;
  notice: string;
  creditIsEstimate?: boolean;
  minutesLost?: number;
}

type C = {
  bg: string; bgCard: string; bgSubtle: string; bgHover: string;
  text: string; textMuted: string; accent: string;
};

interface Props {
  open: boolean;
  onClose: () => void;
  targetPlan: PlanId | null;
  targetBilling: BillingPeriod;
  C: C;
  onSuccess?: () => void;
}

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

export function ChangePlanModal({ open, onClose, targetPlan, targetBilling, C, onSuccess }: Props) {
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  React.useEffect(() => {
    if (!open || !targetPlan) {
      setPreview(null);
      return;
    }
    setLoading(true);
    fetch("/api/subscription/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: targetPlan, billing: targetBilling }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          toast.error(data.error);
          onClose();
          return;
        }
        setPreview(data);
      })
      .catch(() => {
        toast.error("Failed to load preview");
        onClose();
      })
      .finally(() => setLoading(false));
  }, [open, targetPlan, targetBilling, onClose]);

  if (!targetPlan) return null;

  const handleConfirm = async () => {
    if (!preview) return;
    setSubmitting(true);

    // Defensive fallback: free users should not reach this modal, but if they do
    // (e.g. stale pendingPlanChange), redirect to checkout instead of calling the wrong API.
    if (preview.kind === "new") {
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: targetPlan, billing: targetBilling }),
        });
        const data = await res.json();
        if (data.url) { window.location.href = data.url; return; }
        toast.error(data.error || "Failed to start checkout");
      } catch {
        toast.error("Something went wrong");
      }
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/subscription/change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan: targetPlan,
          billing: targetBilling,
          action: "change",
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast.success(
          preview.kind === "resume"
            ? `Subscription resumed`
            : preview.kind === "billing_switch"
            ? "Billing period updated"
            : preview.kind === "downgrade"
            ? `Downgraded to ${PLANS[targetPlan].label}`
            : `Upgraded to ${PLANS[targetPlan].label}`,
        );
        window.dispatchEvent(new CustomEvent("usage-updated"));
        onSuccess?.();
        onClose();
      } else {
        toast.error(data.error || "Failed to change plan");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const targetCfg = PLANS[targetPlan];
  const fmt = (v: number) => preview ? formatMoney(v, preview.currency) : "—";

  const titleByKind: Record<PreviewKind, string> = {
    new: `Start ${targetCfg.label}`,
    upgrade: `Upgrade to ${targetCfg.label}`,
    downgrade: `Downgrade to ${targetCfg.label}`,
    billing_switch: `Switch to ${targetCfg.label} ${targetBilling === "annual" ? "annual" : "monthly"}`,
    same: "Already on this plan",
    resume: `Resume ${targetCfg.label}`,
  };

  const subtitleByKind = (p: Preview) => {
    // Preview API now returns a context-specific subtitle (e.g. "Effective immediately.
    // Net prorated charge today."). Fall back to price + period if absent.
    if (p.subtitle) return p.subtitle;
    const perPeriod = targetBilling === "annual" ? "per year" : "per month";
    return `${fmt(p.perPeriodMajor)} ${perPeriod}`;
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent className="sm:max-w-[460px]" style={{ backgroundColor: C.bg, color: C.text, padding: 0, border: `1px solid ${C.text}1A` }}>
        <div style={{ padding: 24 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>
              {preview ? titleByKind[preview.kind] : `Change to ${targetCfg.label}`}
            </DialogTitle>
            <DialogDescription style={{ fontSize: 13, color: C.textMuted, marginTop: 4 }}>
              {preview ? subtitleByKind(preview) : "Loading…"}
            </DialogDescription>
          </DialogHeader>

          <div style={{ marginTop: 20 }}>
            {loading && (
              <div className="flex items-center justify-center" style={{ padding: "24px 0", color: C.textMuted }}>
                <RiLoader4Line size={20} className="animate-spin" />
              </div>
            )}

            {preview && !loading && (
              <>
                {/* Proration box: only for upgrades and billing switches that pay today.
                    Downgrades use prorationBehavior:"next_period" (no charge now → box hidden).
                    Numbers come from the server, which ports Polar's exact proration
                    formula (server/polar/subscription/update.py) — credit and charge
                    are post-discount, seconds-level precision, tax derived from the
                    user's last order. Expected accuracy vs real invoice: ±$0.01. */}
                {(preview.kind === "upgrade" || preview.kind === "billing_switch") && (
                  <div style={{ backgroundColor: C.bgSubtle, padding: 16, marginBottom: 16 }}>
                    <Row
                      label={`Credit for unused ${PLANS[preview.currentPlan].label} time${preview.creditIsEstimate ? " (estimate)" : ""}`}
                      value={preview.creditMajor > 0 ? `−${fmt(preview.creditMajor)}` : fmt(0)}
                      C={C}
                    />
                    <Row
                      label={
                        preview.kind === "billing_switch"
                          ? `${targetCfg.label} ${preview.targetBilling === "annual" ? "annual — full year from today" : "monthly — full month from today"}`
                          : `${targetCfg.label} prorated until period end`
                      }
                      value={fmt(preview.chargeMajor)}
                      C={C}
                    />
                    {preview.vatKnown && typeof preview.taxMajor === "number" && preview.taxMajor > 0 && (
                      <Row
                        label={`Tax${typeof preview.vatRate === "number" ? ` (${Math.round(preview.vatRate * 100)}%)` : ""}`}
                        value={fmt(preview.taxMajor)}
                        C={C}
                      />
                    )}
                    <div style={{ height: 1, backgroundColor: C.text, opacity: 0.08, margin: "12px 0" }} />
                    <Row
                      label="Total today"
                      value={fmt(typeof preview.totalMajor === "number" ? preview.totalMajor : preview.netMajor)}
                      C={C}
                      bold
                    />
                    {!preview.vatKnown && (
                      <p style={{ fontSize: 11, color: C.textMuted, marginTop: 6, lineHeight: 1.4 }}>
                        + tax calculated by Polar at checkout based on your billing address.
                      </p>
                    )}
                  </div>
                )}

                {/* Minutes-lost warning for downgrades (Splice-style). Show only if the
                    rounded loss is at least 1 minute — fractional amounts are noise. */}
                {preview.kind === "downgrade" && Math.round(preview.minutesLost ?? 0) >= 1 && (
                  <div style={{ backgroundColor: "#FF6B0015", padding: "10px 14px", marginBottom: 12, borderLeft: "3px solid #FF6B00" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#FF6B00", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
                      You will lose {Math.round(preview.minutesLost ?? 0)} rollover minute{Math.round(preview.minutesLost ?? 0) === 1 ? "" : "s"}
                    </div>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>
                      {PLANS[preview.targetPlan].label} quota is {PLANS[preview.targetPlan].minutesIncluded} min/month. Any balance above that is forfeited when you downgrade.
                    </div>
                  </div>
                )}

                <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, marginBottom: 16 }}>
                  {preview.notice}
                </p>

                {/* Promo code input intentionally removed from this modal. Per Polar docs
                    (api-reference/subscriptions/update): "Update the subscription to apply
                    a new discount... The change will be applied on the next billing cycle."
                    So a code entered here would NOT reduce today's proration charge —
                    showing the input was deceptive. Users with an active sub already get
                    their existing discount applied server-side (reflected in chargeMajor).
                    New codes can still be applied through the /api/polar/validate-discount
                    route on initial checkout or a future "apply to next renewal" flow. */}

                <div className="flex items-center gap-[8px]">
                  <button
                    onClick={onClose}
                    disabled={submitting}
                    style={{
                      flex: 1, padding: "12px 0", fontSize: 13, fontWeight: 600,
                      backgroundColor: C.bgHover, color: C.text, border: "none",
                      cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.5 : 1,
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirm}
                    disabled={submitting || preview.kind === "same"}
                    style={{
                      flex: 1, padding: "12px 0", fontSize: 13, fontWeight: 600,
                      backgroundColor: preview.kind === "same" ? C.bgHover : C.accent,
                      color: preview.kind === "same" ? C.textMuted : "#fff",
                      border: "none",
                      cursor: submitting || preview.kind === "same" ? "not-allowed" : "pointer",
                      opacity: submitting ? 0.7 : 1,
                    }}
                  >
                    {submitting
                      ? "Processing…"
                      : preview.kind === "new"
                      ? "Continue to checkout"
                      : preview.kind === "resume"
                      ? "Resume subscription"
                      : "Confirm"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, value, C, bold }: { label: string; value: string; C: C; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between" style={{ paddingTop: 4, paddingBottom: 4 }}>
      <span style={{ fontSize: 13, color: bold ? C.text : C.textMuted, fontWeight: bold ? 700 : 400 }}>{label}</span>
      <span style={{ fontSize: 13, color: C.text, fontWeight: bold ? 700 : 500 }}>{value}</span>
    </div>
  );
}
