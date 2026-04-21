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
  perPeriodMajor: number;
  currency: string;
  notice: string;
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

type DiscountState =
  | { status: "empty" }
  | { status: "validating" }
  | { status: "valid"; discountId: string; percentOff?: number; amountOff?: number }
  | { status: "invalid"; reason: string };

export function ChangePlanModal({ open, onClose, targetPlan, targetBilling, C, onSuccess }: Props) {
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [promoOpen, setPromoOpen] = React.useState(false);
  const [promoCode, setPromoCode] = React.useState("");
  const [discount, setDiscount] = React.useState<DiscountState>({ status: "empty" });
  React.useEffect(() => {
    if (!open || !targetPlan) {
      setPreview(null);
      setPromoOpen(false);
      setPromoCode("");
      setDiscount({ status: "empty" });
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

  const validatePromo = async () => {
    const code = promoCode.trim();
    if (!code) return;
    setDiscount({ status: "validating" });
    try {
      const res = await fetch("/api/polar/validate-discount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.valid) {
        setDiscount({
          status: "valid",
          discountId: data.discountId,
          percentOff: data.percentOff,
          amountOff: data.amountOff,
        });
      } else {
        setDiscount({ status: "invalid", reason: data.reason ?? "Invalid code" });
      }
    } catch {
      setDiscount({ status: "invalid", reason: "Lookup failed" });
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setSubmitting(true);

    const discountId = discount.status === "valid" ? discount.discountId : undefined;

    // Defensive fallback: free users should not reach this modal, but if they do
    // (e.g. stale pendingPlanChange), redirect to checkout instead of calling the wrong API.
    if (preview.kind === "new") {
      try {
        const res = await fetch("/api/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: targetPlan, billing: targetBilling, ...(discountId ? { discountId } : {}) }),
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
          ...(discountId ? { discountId } : {}),
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
    billing_switch: `Switch ${targetCfg.label} to ${targetBilling === "annual" ? "annual" : "monthly"}`,
    same: "Already on this plan",
    resume: `Resume ${targetCfg.label}`,
  };

  const subtitleByKind = (p: Preview) => {
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
                {preview.kind !== "new" && preview.kind !== "same" && preview.kind !== "resume" && (
                  <div style={{ backgroundColor: C.bgSubtle, padding: 16, marginBottom: 16 }}>
                    {preview.creditMajor > 0 && (
                      <Row label={`Credit for unused ${PLANS[preview.currentPlan].label} time`} value={`−${fmt(preview.creditMajor)}`} C={C} />
                    )}
                    <Row label={`${targetCfg.label} prorated until period end`} value={fmt(preview.chargeMajor)} C={C} />
                    <div style={{ height: 1, backgroundColor: C.text, opacity: 0.08, margin: "12px 0" }} />
                    <Row label="Total today" value={fmt(preview.netMajor)} C={C} bold />
                  </div>
                )}

                <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, marginBottom: 12 }}>
                  {preview.notice}
                </p>

                {/* Promo code — collapsed by default. Not shown for resume-only (no charge). */}
                {preview.kind !== "same" && preview.kind !== "resume" && (
                  <div style={{ marginBottom: 16 }}>
                    {!promoOpen ? (
                      <button
                        onClick={() => setPromoOpen(true)}
                        style={{
                          background: "none", border: "none", padding: 0,
                          fontSize: 12, color: C.textMuted, cursor: "pointer",
                          textDecoration: "underline",
                        }}
                      >
                        I have a promo code
                      </button>
                    ) : (
                      <div>
                        <div className="flex items-center gap-[6px]">
                          <input
                            type="text"
                            value={promoCode}
                            onChange={(e) => {
                              setPromoCode(e.target.value);
                              if (discount.status !== "empty") setDiscount({ status: "empty" });
                            }}
                            placeholder="Promo code"
                            disabled={discount.status === "validating" || submitting}
                            style={{
                              flex: 1, padding: "10px 12px", fontSize: 13,
                              backgroundColor: C.bgSubtle, color: C.text,
                              border: `1px solid ${C.text}14`,
                              letterSpacing: "0.05em", textTransform: "uppercase",
                            }}
                          />
                          <button
                            onClick={() => void validatePromo()}
                            disabled={!promoCode.trim() || discount.status === "validating" || submitting}
                            style={{
                              padding: "10px 14px", fontSize: 12, fontWeight: 600,
                              backgroundColor: C.bgHover, color: C.text, border: "none",
                              cursor: (!promoCode.trim() || discount.status === "validating") ? "not-allowed" : "pointer",
                              opacity: (!promoCode.trim() || discount.status === "validating") ? 0.5 : 1,
                            }}
                          >
                            {discount.status === "validating" ? "…" : "Apply"}
                          </button>
                        </div>
                        {discount.status === "valid" && (
                          <p style={{ fontSize: 12, color: C.accent, marginTop: 6 }}>
                            Code applied
                            {typeof discount.percentOff === "number" ? ` — ${discount.percentOff}% off` : ""}
                          </p>
                        )}
                        {discount.status === "invalid" && (
                          <p style={{ fontSize: 12, color: "#d44", marginTop: 6 }}>
                            {discount.reason}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

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
