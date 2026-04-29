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

// One row in the "Today's charge" breakdown — built server-side from
// stripe.invoices.createPreview output. The modal renders this verbatim:
// no derivation, no aggregation, no special-casing.
interface PreviewLine {
  label: string;            // e.g. "Pro Annual" or "Unused Pro Monthly credit"
  amountMinor: number;      // signed minor units (negative = credit, already discount-applied)
  periodStart: number | null; // Unix seconds
  periodEnd: number | null;
  isCredit: boolean;
  // Sticker (full-period) price for the plan referenced by this line, in
  // minor units of the sub's currency. Pulled from Stripe Price.unit_amount
  // (or currency_options[currency].unit_amount). Displayed as "(€14,99/mo)"
  // next to the label so the user sees the gross. NOT used in any math —
  // pure display.
  fullPriceMinor?: number;
  billingInterval?: BillingPeriod;
}

// Active discount on the customer's subscription, surfaced as a per-line
// suffix and a small caption under Total (per Stripe Portal/Linear convention).
interface AppliedDiscount {
  label: string;            // coupon name, e.g. "Victor Dev 75 off"
  percentOff: number | null;       // 0–100
  amountOffMinor: number | null;   // for fixed-amount coupons
  amountOffCurrency: string | null;
}

interface Preview {
  kind: PreviewKind;
  currentPlan: PlanId;
  currentBilling?: BillingPeriod;
  targetPlan: PlanId;
  targetBilling: BillingPeriod;

  // New shape (upgrade/billing_switch only — empty/null for other kinds).
  lines?: PreviewLine[];
  taxMinor?: number;
  totalMinor?: number;
  appliedDiscount?: AppliedDiscount | null;
  perPeriodMinor?: number;
  nextBillingAmountMinor?: number;
  // Subtotal of the next regular invoice (sticker price), and total (what
  // the customer will actually be charged with their active discount applied).
  // Both come from a 2nd stripe.invoices.createPreview call with
  // proration_behavior=none — Stripe is the source of truth.
  nextBillingStickerMinor?: number;
  nextBillingChargeMinor?: number | null;

  // Legacy shape — still used for `same`, `resume`, `downgrade`, `new` flows
  // that don't render the line breakdown. Will be removed when those branches
  // adopt the new shape.
  creditMajor?: number;
  chargeMajor?: number;
  netMajor?: number;
  taxMajor?: number;
  totalMajor?: number;
  discountMajor?: number;
  discountLabel?: string;
  discountPercentOff?: number | null;
  perPeriodMajor?: number;
  nextBillingAmountMajor?: number;

  nextBillingDate: string | null;
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

  const fetchPreview = React.useCallback(() => {
    if (!targetPlan) return;
    setLoading(true);
    fetch("/api/subscription/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        plan: targetPlan,
        billing: targetBilling,
      }),
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
      .finally(() => {
        setLoading(false);
      });
  }, [targetPlan, targetBilling, onClose]);

  React.useEffect(() => {
    if (!open || !targetPlan) {
      setPreview(null);
      return;
    }
    fetchPreview();
  }, [open, targetPlan, targetBilling, fetchPreview]);

  if (!targetPlan) return null;

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
      <DialogContent className="w-[calc(100vw-24px)] max-w-[calc(100vw-24px)] md:max-w-[480px]" style={{ backgroundColor: C.bg, color: C.text, padding: 0, border: `1px solid ${C.text}1A` }}>
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
                {/* ── Today's charge breakdown — DUMB RENDERER of preview.lines.
                    The vertical sum of displayed line amounts plus tax MUST
                    equal preview.totalMinor (= what Stripe will charge to the
                    cent). NO client-side math, NO heuristics, NO special-casing
                    of billing_switch vs upgrade. Each line is rendered with the
                    label built server-side (locale-independent: derived from
                    line sign + plan info, not from regex on Stripe's localized
                    description). The active discount (if any) is shown as a
                    suffix per line "(X% off)" and as a small caption under
                    Total — matches Stripe Portal / Linear UX convention. ── */}
                {paysToday && preview.lines && (
                  <div style={{ backgroundColor: C.bgSubtle, padding: 16, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 10, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                      Today's charge
                    </div>

                    {preview.lines.map((line, i) => (
                      <LineRow
                        key={i}
                        line={line}
                        discount={preview.appliedDiscount ?? null}
                        currency={preview.currency}
                        C={C}
                      />
                    ))}

                    <div style={{ height: 1, backgroundColor: C.text, opacity: 0.08, margin: "12px 0" }} />

                    <Row label="Tax" value={fmt((preview.taxMinor ?? 0) / 100)} C={C} />
                    <Row label="Total today" value={fmt((preview.totalMinor ?? 0) / 100)} C={C} bold />
                  </div>
                )}

                {/* ── Minutes lost warning on downgrade ── */}
                {preview.kind === "downgrade" && Math.round(preview.minutesLost ?? 0) >= 1 ? (
                  <div style={{ backgroundColor: "#FF6B0015", padding: "10px 14px", marginBottom: 12, borderLeft: "3px solid #FF6B00" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "#FF6B00", marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" as const }}>
                      All {Math.round(preview.minutesLost ?? 0)} unused minute{Math.round(preview.minutesLost ?? 0) === 1 ? "" : "s"} will be lost
                    </div>
                    <div style={{ fontSize: 12, color: C.text, lineHeight: 1.5 }}>
                      Your remaining balance is forfeited at the end of the period. {PLANS[preview.targetPlan].label} starts fresh at {PLANS[preview.targetPlan].minutesIncluded} min/month.
                    </div>
                  </div>
                ) : null}

                {/* ── Next billing — always visible (except "same"). The amount
                    is the actual charge Stripe will apply at renewal (total
                    from a 2nd createPreview call with proration_behavior=none).
                    If a discount is active, an inline "X% OFF" badge appears
                    next to the amount, sourced from Stripe sub.discounts. ── */}
                {preview.kind !== "same" && preview.nextBillingDate && (
                  <div style={{ backgroundColor: C.bgSubtle, padding: 14, marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.textMuted, marginBottom: 6, letterSpacing: "0.06em", textTransform: "uppercase" as const }}>
                      Next billing
                    </div>
                    <div style={{ fontSize: 13, color: C.text, display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                      <span>{formatDate(preview.nextBillingDate)}</span>
                      <span style={{ fontWeight: 600, whiteSpace: "nowrap" }}>
                        {fmt(
                          typeof preview.nextBillingChargeMinor === "number"
                            ? preview.nextBillingChargeMinor / 100
                            : typeof preview.nextBillingAmountMinor === "number"
                            ? preview.nextBillingAmountMinor / 100
                            : (preview.nextBillingAmountMajor ?? 0)
                        )} {preview.targetBilling === "annual" ? "/ year" : "/ month"}
                        {preview.appliedDiscount && typeof preview.appliedDiscount.percentOff === "number" && (
                          <PromoBadge percentOff={preview.appliedDiscount.percentOff} C={C} />
                        )}
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
      <span style={{ fontSize: 13, color: bold ? C.text : accent ? C.accent : C.textMuted, fontWeight: bold ? 700 : accent ? 600 : 500 }}>{label}</span>
      <span style={{ fontSize: 13, color: accent ? C.accent : C.text, fontWeight: bold ? 700 : accent ? 600 : 500 }}>{value}</span>
    </div>
  );
}

// One row in the breakdown — plan/credit label + period + optional inline
// "X% OFF" badge (when sub has a percent_off discount). The badge text and %
// come directly from preview.appliedDiscount.percentOff (= Stripe coupon
// percent_off). The amount on the right is preview.lines[i].amount divided
// by 100 for display. ZERO client-side math.
function LineRow({
  line,
  discount,
  currency,
  C,
}: {
  line: PreviewLine;
  discount: AppliedDiscount | null;
  currency: string;
  C: C;
}) {
  const fmt = (v: number) => formatMoney(v, currency);
  const amountLabel = `${line.isCredit ? "−" : ""}${fmt(Math.abs(line.amountMinor) / 100)}`;
  const periodLabel = formatLinePeriod(line);
  const showBadge = discount && typeof discount.percentOff === "number";

  return (
    <div className="flex items-center justify-between" style={{ paddingTop: 6, paddingBottom: 6 }}>
      <span style={{ fontSize: 13, color: C.textMuted, fontWeight: 500, paddingRight: 12 }}>
        {line.label}
        {periodLabel && (
          <span style={{ color: C.textMuted, opacity: 0.7, fontWeight: 400 }}>{` ${periodLabel}`}</span>
        )}
        {showBadge && discount && (
          <PromoBadge percentOff={discount.percentOff!} C={C} />
        )}
      </span>
      <span style={{ fontSize: 13, color: C.text, fontWeight: 600, whiteSpace: "nowrap" }}>{amountLabel}</span>
    </div>
  );
}

// Small accent-colored "X% OFF" pill, inline next to the line label.
// percentOff comes straight from Stripe sub.discounts[0].coupon.percent_off
// (surfaced via preview.appliedDiscount). No coupon name shown.
function PromoBadge({ percentOff, C }: { percentOff: number; C: C }) {
  return (
    <span style={{
      display: "inline-block",
      fontSize: 10,
      fontWeight: 700,
      color: C.accent,
      backgroundColor: `${C.accent}25`,
      padding: "2px 7px",
      marginLeft: 8,
      letterSpacing: "0.04em",
      textTransform: "uppercase" as const,
      verticalAlign: 2,
      whiteSpace: "nowrap",
    }}>
      {percentOff}% OFF
    </span>
  );
}

// Period label "(Apr 28 — May 27)" — year added when periods cross calendar
// years (e.g. annual switch). Pure formatting from line.periodStart/End.
function formatLinePeriod(line: PreviewLine): string {
  if (!line.periodStart || !line.periodEnd) return "";
  const start = new Date(line.periodStart * 1000);
  const end = new Date(line.periodEnd * 1000);
  const sameYear = start.getFullYear() === end.getFullYear();
  const opts: Intl.DateTimeFormatOptions = sameYear
    ? { month: "short", day: "numeric" }
    : { month: "short", day: "numeric", year: "numeric" };
  const fmt = (d: Date) => new Intl.DateTimeFormat(undefined, opts).format(d);
  return `(${fmt(start)} — ${fmt(end)})`;
}
