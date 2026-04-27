"use client";

import React from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { PLANS, type PlanId, type BillingPeriod } from "@/lib/plans";
import { toast } from "sonner";
import { RiLoader4Line } from "@remixicon/react";

// Lazy Stripe.js loader — only loaded the first time an upgrade needs 3DS/SCA.
let stripePromise: Promise<Stripe | null> | null = null;
function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      console.error("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set — SCA confirmation will fail");
      return Promise.resolve(null);
    }
    stripePromise = loadStripe(key);
  }
  return stripePromise;
}

type PreviewKind = "new" | "upgrade" | "downgrade" | "billing_switch" | "same" | "resume";

interface Preview {
  kind: PreviewKind;
  currentPlan: PlanId;
  currentBilling?: BillingPeriod;
  targetPlan: PlanId;
  targetBilling: BillingPeriod;
  creditMajor: number;
  chargeMajor: number;
  netMajor: number;
  taxMajor: number;
  totalMajor: number;
  discountMajor?: number;
  discountLabel?: string;
  discountPercentOff?: number | null;
  perPeriodMajor: number;
  nextBillingDate: string | null;
  nextBillingAmountMajor: number;
  currency: string;
  notice: string;
  minutesLost?: number;
  // Unix timestamp pinned by the preview endpoint. We send it back on
  // confirm so Stripe calculates the proration at the same moment as the
  // preview — guaranteeing the modal total = the invoice charge.
  prorationDate?: number;
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

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat(undefined, { month: "long", day: "numeric", year: "numeric" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export function ChangePlanModal({ open, onClose, targetPlan, targetBilling, C, onSuccess }: Props) {
  const [preview, setPreview] = React.useState<Preview | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  // Promo code state — collapsible input, only appears when the user opens it.
  const [promoOpen, setPromoOpen] = React.useState(false);
  const [promoInput, setPromoInput] = React.useState("");
  // `appliedCode` is the code actually applied to the preview. Empty until
  // the user hits Apply and the backend validates. We re-fetch preview each
  // time it changes so the modal totals always reflect the exact invoice.
  const [appliedCode, setAppliedCode] = React.useState<string>("");
  const [validatingPromo, setValidatingPromo] = React.useState(false);

  const fetchPreview = React.useCallback((codeToApply: string) => {
    if (!targetPlan) return;
    setLoading(true);
    fetch("/api/subscription/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: targetPlan,
        billing: targetBilling,
        ...(codeToApply ? { discountCode: codeToApply } : {}),
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          // Preview-level error on the code → clear it, keep the modal open.
          if (codeToApply) {
            toast.error(data.error);
            setAppliedCode("");
            setPromoInput("");
          } else {
            toast.error(data.error);
            onClose();
          }
          return;
        }
        setPreview(data);
      })
      .catch(() => {
        toast.error("Failed to load preview");
        onClose();
      })
      .finally(() => {
        setLoading(false);
        setValidatingPromo(false);
      });
  }, [targetPlan, targetBilling, onClose]);

  React.useEffect(() => {
    if (!open || !targetPlan) {
      setPreview(null);
      setPromoOpen(false);
      setPromoInput("");
      setAppliedCode("");
      return;
    }
    fetchPreview("");
  }, [open, targetPlan, targetBilling, fetchPreview]);

  if (!targetPlan) return null;

  const handleApplyPromo = () => {
    const code = promoInput.trim();
    if (!code) return;
    setValidatingPromo(true);
    setAppliedCode(code);
    fetchPreview(code);
  };

  const handleRemovePromo = () => {
    setAppliedCode("");
    setPromoInput("");
    fetchPreview("");
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setSubmitting(true);

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
          ...(appliedCode ? { discountCode: appliedCode } : {}),
          ...(typeof preview.prorationDate === "number" ? { prorationDate: preview.prorationDate } : {}),
        }),
      });
      const data = await res.json();

      // 3DS / SCA challenge required
      if (data.action === "requires_action" && data.clientSecret) {
        const stripe = await getStripe();
        if (!stripe) {
          toast.error("Payment authentication unavailable — contact support.");
          setSubmitting(false);
          return;
        }
        const { error } = await stripe.confirmCardPayment(data.clientSecret);
        if (error) {
          toast.error(error.message ?? "Payment authentication failed");
          setSubmitting(false);
          return;
        }
        toast.success(`Upgraded to ${PLANS[targetPlan].label}`);
        window.dispatchEvent(new CustomEvent("usage-updated"));
        onSuccess?.();
        onClose();
        return;
      }

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

  const paysToday = preview && (preview.kind === "upgrade" || preview.kind === "billing_switch");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent className="sm:max-w-[480px]" style={{ backgroundColor: C.bg, color: C.text, padding: 0, border: `1px solid ${C.text}1A` }}>
        <div style={{ padding: 24 }}>
          <DialogHeader>
            <DialogTitle style={{ fontSize: 18, fontWeight: 700, color: C.text, letterSpacing: "-0.01em" }}>
              {preview ? titleByKind[preview.kind] : `Change to ${targetCfg.label}`}
            </DialogTitle>
            {/* No subtitle — the recurring price is already shown in the
                "Next billing" block below. Keeping a hidden description
                satisfies the Radix Dialog a11y requirement. */}
            <DialogDescription className="sr-only">
              {preview ? titleByKind[preview.kind] : "Loading subscription change preview"}
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
                {/* ── Today's charge breakdown — only for flows that charge today.
                    Reads top-to-bottom like a receipt:
                      1. New plan charge (positive)
                      2. Unused-time credit (negative, if any)
                      3. Promo discount (negative, if any)
                      ─── divider ───
                      4. Tax (always shown, even at 0 for transparency)
                      5. Total today (bold)
                ── */}
                {paysToday && (
                  <div style={{ backgroundColor: C.bgSubtle, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                      Today's charge
                    </div>

                    <Row
                      label={
                        preview.kind === "billing_switch"
                          ? `${targetCfg.label} ${preview.targetBilling === "annual" ? "annual — full year from today" : "monthly — full month from today"}`
                          : `${targetCfg.label} prorated until period end`
                      }
                      value={fmt(preview.chargeMajor)}
                      C={C}
                    />

                    {preview.creditMajor > 0 && (
                      <Row
                        label={`Unused ${PLANS[preview.currentPlan].label} credit`}
                        value={`−${fmt(preview.creditMajor)}`}
                        C={C}
                      />
                    )}

                    {typeof preview.discountMajor === "number" && preview.discountMajor > 0 ? (
                      <Row
                        label={`Promo${preview.discountLabel ? ` ${preview.discountLabel}` : ""}${typeof preview.discountPercentOff === "number" ? ` (${preview.discountPercentOff}% off)` : ""}`}
                        value={`−${fmt(preview.discountMajor)}`}
                        C={C}
                        accent
                      />
                    ) : null}

                    <div style={{ height: 1, backgroundColor: C.text, opacity: 0.08, margin: "12px 0" }} />

                    <Row label="Tax" value={fmt(preview.taxMajor)} C={C} />
                    <Row label="Total today" value={fmt(preview.totalMajor)} C={C} bold />
                  </div>
                )}

                {/* ── Minutes lost warning on downgrade ── */}
                {preview.kind === "downgrade" && Math.round(preview.minutesLost ?? 0) >= 1 ? (
                  <div style={{ backgroundColor: "#FF6B0015", padding: "10px 14px", marginBottom: 12, borderLeft: "3px solid #FF6B00" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#FF6B00", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
                      You will lose {Math.round(preview.minutesLost ?? 0)} rollover minute{Math.round(preview.minutesLost ?? 0) === 1 ? "" : "s"}
                    </div>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>
                      {PLANS[preview.targetPlan].label} quota is {PLANS[preview.targetPlan].minutesIncluded} min/month. Any balance above that is forfeited when you downgrade.
                    </div>
                  </div>
                ) : null}

                {/* ── Next billing — always visible (except "same") ── */}
                {preview.kind !== "same" && preview.nextBillingDate && (
                  <div style={{ backgroundColor: C.bgSubtle, padding: 14, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                      Next billing
                    </div>
                    <div style={{ fontSize: 13, color: C.text, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span>{formatDate(preview.nextBillingDate)}</span>
                      <span style={{ fontWeight: 600 }}>
                        {fmt(preview.nextBillingAmountMajor)} {preview.targetBilling === "annual" ? "/ year" : "/ month"}
                      </span>
                    </div>
                  </div>
                )}

                {/* ── Notice — kept only for kinds without a math block to imply
                    context (downgrade, resume). Upgrade/billing_switch are
                    already self-explanatory via the breakdown above. ── */}
                {(preview.kind === "downgrade" || preview.kind === "resume") && (
                  <p style={{ fontSize: 12, color: C.textMuted, lineHeight: 1.5, marginBottom: 16 }}>
                    {preview.notice}
                  </p>
                )}

                {/* ── Promo code input — collapsible, only for flows that pay today ── */}
                {paysToday && (
                  <div style={{ marginBottom: 16 }}>
                    {!promoOpen && !appliedCode && (
                      <button
                        onClick={() => setPromoOpen(true)}
                        style={{
                          background: "none", border: "none", padding: 0,
                          fontSize: 12, color: C.textMuted, cursor: "pointer",
                          textDecoration: "underline", letterSpacing: "0.02em",
                        }}
                      >
                        I have a promo code
                      </button>
                    )}
                    {appliedCode && !promoOpen && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                        <span style={{ color: C.accent, fontWeight: 600 }}>✓ {appliedCode} applied</span>
                        <button
                          onClick={handleRemovePromo}
                          style={{
                            background: "none", border: "none", padding: 0,
                            fontSize: 12, color: C.textMuted, cursor: "pointer",
                            textDecoration: "underline",
                          }}
                        >
                          remove
                        </button>
                      </div>
                    )}
                    {promoOpen && (
                      <div className="flex items-center gap-[6px]">
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value)}
                          placeholder="Promo code"
                          disabled={validatingPromo || submitting}
                          onKeyDown={(e) => { if (e.key === "Enter") handleApplyPromo(); }}
                          style={{
                            flex: 1, padding: "10px 12px", fontSize: 13,
                            backgroundColor: C.bgSubtle, color: C.text,
                            border: `1px solid ${C.text}14`,
                            letterSpacing: "0.04em", textTransform: "uppercase",
                          }}
                        />
                        <button
                          onClick={handleApplyPromo}
                          disabled={!promoInput.trim() || validatingPromo || submitting}
                          style={{
                            padding: "10px 14px", fontSize: 12, fontWeight: 600,
                            backgroundColor: C.bgHover, color: C.text, border: "none",
                            cursor: (!promoInput.trim() || validatingPromo) ? "not-allowed" : "pointer",
                            opacity: (!promoInput.trim() || validatingPromo) ? 0.5 : 1,
                          }}
                        >
                          {validatingPromo ? "…" : "Apply"}
                        </button>
                        <button
                          onClick={() => { setPromoOpen(false); if (!appliedCode) setPromoInput(""); }}
                          style={{
                            padding: "10px 12px", fontSize: 12, fontWeight: 600,
                            backgroundColor: "transparent", color: C.textMuted, border: "none",
                            cursor: "pointer",
                          }}
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* ── CTAs ── */}
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

function Row({ label, value, C, bold, accent }: { label: string; value: string; C: C; bold?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between" style={{ paddingTop: 4, paddingBottom: 4 }}>
      <span style={{ fontSize: 13, color: bold ? C.text : accent ? C.accent : C.textMuted, fontWeight: bold ? 700 : accent ? 600 : 400 }}>{label}</span>
      <span style={{ fontSize: 13, color: accent ? C.accent : C.text, fontWeight: bold ? 700 : accent ? 600 : 500 }}>{value}</span>
    </div>
  );
}
