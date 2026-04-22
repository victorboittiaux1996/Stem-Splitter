"use client";

import { useState, useRef, useEffect } from "react";
import { motion, useInView } from "framer-motion";
import { Header } from "@/components/website/header";
import { Footer } from "@/components/website/footer";
import { PricingComparisonTable } from "@/components/website/pricing-comparison-table";
import { PricingFAQ } from "@/components/website/pricing-faq";
import { PLANS, type PlanId, ANNUAL_DISCOUNT_PERCENT } from "@/lib/plans";
import { fonts, stemColors } from "@/components/website/theme";
import { useAuth } from "@/hooks/use-auth";
import { useSubscription } from "@/hooks/use-subscription";
import { RiCheckLine } from "@remixicon/react";

const PLAN_ORDER: PlanId[] = ["free", "pro", "studio"];

type LocalPrices = {
  currency: string;
  prices: {
    pro_monthly: { amount: number; display: string };
    pro_annual: { amount: number; display: string };
    studio_monthly: { amount: number; display: string };
    studio_annual: { amount: number; display: string };
  };
};

// Pricing data is fetched from /api/pricing/prices on mount. The API reads
// CF-IPCountry, looks up currency_options on each Stripe Price, and returns
// the amount + formatted display string in the visitor's local currency
// (EUR for EU, GBP for UK, USD elsewhere in V1). The server is the source of
// truth — Stripe Price currency_options drive both display and checkout, so
// they can never drift.
function useLocalPrices(): LocalPrices | null {
  const [data, setData] = useState<LocalPrices | null>(null);
  useEffect(() => {
    let canceled = false;
    fetch("/api/pricing/prices")
      .then((r) => r.json())
      .then((json: LocalPrices) => {
        if (!canceled && json.prices) setData(json);
      })
      .catch(() => {
        // Fallback: use hardcoded USD prices from lib/plans.ts — handled
        // downstream via the `prices` prop being null.
      });
    return () => { canceled = true; };
  }, []);
  return data;
}

function usePlanCTA(planId: PlanId, annual: boolean) {
  const { user, loading: authLoading } = useAuth();
  const { plan: userPlan, loading: subLoading } = useSubscription(user?.id);

  const checkoutUrl = planId === "free"
    ? "/app"
    : `/app?upgrade=${planId}&billing=${annual ? "annual" : "monthly"}`;

  const ready = !!user && !authLoading && !subLoading;
  const tier = PLAN_ORDER.indexOf(planId);
  const currentTier = ready ? PLAN_ORDER.indexOf(userPlan) : -1;

  if (!ready) return { label: "Get started", href: checkoutUrl, isCurrent: false };
  if (currentTier === tier) return { label: "Current plan", href: "/app", isCurrent: true };
  if (currentTier > tier) return { label: "Manage plan", href: "/app", isCurrent: false };
  return { label: `Upgrade to ${PLANS[planId].label}`, href: checkoutUrl, isCurrent: false };
}

const F = fonts.body;

const C = {
  bg: "#FFFFFF",
  bgAlt: "#F3F3F3",
  text: "#000000",
  textLight: "#333333",
  textMuted: "#666666",
  accent: "#1B10FD",
  accentHover: "#0E08D8",
} as const;

// ─── Shared layout ──────────────────────────────────────────
function Container({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px", ...style }}>
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

// ─── Billing toggle (Ahrefs style) ──────────────────────────
function BillingToggle({ annual, onToggle }: { annual: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      <button
        onClick={onToggle}
        style={{
          position: "relative", width: 44, height: 24,
          backgroundColor: annual ? C.accent : "#D4D4D4",
          border: "none", cursor: "pointer", padding: 0,
          transition: "background-color 0.2s",
        }}
      >
        <motion.div
          animate={{ x: annual ? 22 : 2 }}
          transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          style={{ position: "absolute", top: 2, width: 20, height: 20, backgroundColor: "#FFFFFF" }}
        />
      </button>
      <span style={{ fontFamily: F, fontSize: 14, fontWeight: 500, color: C.text }}>
        Pay annually,{" "}
        <span style={{ color: C.accent }}>save {ANNUAL_DISCOUNT_PERCENT}%</span>
      </span>
    </div>
  );
}

// ─── Plan card ──────────────────────────────────────────────
const planAccents: Record<PlanId, string> = {
  free: "#3A3A3A",
  pro: stemColors.vocals,
  studio: stemColors.drums,
};

function PlanCard({ planId, annual, localPrices }: { planId: PlanId; annual: boolean; localPrices: LocalPrices | null }) {
  const [hovered, setHovered] = useState(false);
  const plan = PLANS[planId];
  const accent = planAccents[planId];

  // Localized price: EUR/GBP/USD from Stripe currency_options. Falls back to
  // the USD sticker from lib/plans.ts if the API is slow/unavailable.
  const localKey = planId === "pro"
    ? (annual ? "pro_annual" : "pro_monthly")
    : planId === "studio"
    ? (annual ? "studio_annual" : "studio_monthly")
    : null;
  const local = localKey && localPrices ? localPrices.prices[localKey] : null;

  let price: string;
  if (planId === "free") {
    price = "$0";
  } else if (local) {
    price = local.display;
  } else {
    price = annual ? `$${plan.yearlyPriceUSD}` : `$${plan.priceUSD}`;
  }
  const period = planId === "free" ? "forever" : "/mo";

  // Hover state: full white text for max contrast on colored bg
  const hText = "#FFFFFF";
  const hTextSec = "rgba(255,255,255,0.95)";
  const hTextMuted = "rgba(255,255,255,0.75)";

  // Default state: darker text for better readability
  const dText = C.text;
  const dTextSec = "#111111";
  const dTextMuted = "#333333";

  const cardBorder = "none";

  const cta = usePlanCTA(planId, annual);

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{ backgroundColor: hovered ? accent : C.bgAlt }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      style={{
        padding: 0, display: "flex", flexDirection: "column", overflow: "hidden",
        cursor: "pointer", height: "100%", border: cardBorder,
      }}
    >
      <div style={{ padding: "36px 32px 40px", display: "flex", flexDirection: "column", flex: 1 }}>
        {/* Name — large, bold, like Linear */}
        <motion.h3
          animate={{ color: hovered ? hText : dText }}
          transition={{ duration: 0.3 }}
          style={{
            fontFamily: F, fontSize: 24, fontWeight: 600,
            letterSpacing: "-0.01em",
            margin: "0 0 4px",
          }}
        >
          {plan.label}
        </motion.h3>

        {/* Tagline */}
        <motion.p
          animate={{ color: hovered ? hTextMuted : dTextMuted }}
          transition={{ duration: 0.3 }}
          style={{ fontFamily: F, fontSize: 13, fontWeight: 400, margin: "0 0 20px" }}
        >
          {plan.tagline}
        </motion.p>

        {/* Price */}
        <div style={{ marginBottom: 4 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
            <motion.span
              animate={{ color: hovered ? hText : dText }}
              transition={{ duration: 0.3 }}
              style={{ fontFamily: F, fontSize: 48, fontWeight: 700, lineHeight: 1 }}
            >
              {price}
            </motion.span>
            <motion.span
              animate={{ color: hovered ? hTextMuted : dTextMuted }}
              transition={{ duration: 0.3 }}
              style={{ fontFamily: F, fontSize: 14, fontWeight: 400 }}
            >
              {period}
            </motion.span>
          </div>
          {/* Annual savings — reserve height so buttons stay aligned */}
          <div style={{ minHeight: annual ? 25 : 0, marginTop: annual ? 6 : 0, display: "flex", alignItems: "center", gap: 8 }}>
            {annual && planId !== "free" && (() => {
              const monthlyKey = planId === "pro" ? "pro_monthly" : "studio_monthly";
              const monthlyLocal = localPrices?.prices[monthlyKey];
              const annualKey = planId === "pro" ? "pro_annual" : "studio_annual";
              const annualLocal = localPrices?.prices[annualKey];
              const strikeLabel = monthlyLocal?.display ?? `$${plan.priceUSD}`;
              const yearlyTotal = annualLocal
                ? formatCurrency(annualLocal.amount, localPrices!.currency, { maxFractionDigits: 0 })
                : `$${(plan.yearlyPriceUSD * 12).toFixed(0)}`;
              return (
                <>
                  <motion.span
                    animate={{ color: hovered ? "#FFFFFF" : "#999999" }}
                    transition={{ duration: 0.3 }}
                    style={{ fontFamily: F, fontSize: 13, textDecoration: "line-through" }}
                  >
                    {strikeLabel}/mo
                  </motion.span>
                  <motion.span
                    animate={{ color: hovered ? "#FFFFFF" : C.accent }}
                    transition={{ duration: 0.3 }}
                    style={{ fontFamily: F, fontSize: 13, fontWeight: 600 }}
                  >
                    {yearlyTotal}/yr
                  </motion.span>
                </>
              );
            })()}
          </div>
        </div>

        {/* CTA — right after price, like Ahrefs */}
        <div style={{ marginTop: 16, marginBottom: 28 }}>
          <PlanCTA cardHovered={hovered} accent={accent} href={cta.href} label={cta.label} isCurrent={cta.isCurrent} />
        </div>

        {/* Features */}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1 }}>
          {plan.features.map((f) => (
            <motion.li
              key={f}
              animate={{ color: hovered ? hTextSec : dTextSec }}
              transition={{ duration: 0.3 }}
              style={{
                fontFamily: F, fontSize: 14, fontWeight: 400,
                marginBottom: 10, display: "flex", gap: 10, alignItems: "center",
              }}
            >
              <motion.span
                animate={{ color: hovered ? "rgba(255,255,255,0.85)" : C.accent }}
                transition={{ duration: 0.3 }}
                style={{ flexShrink: 0, display: "flex", alignItems: "center" }}
              >
                <RiCheckLine size={16} />
              </motion.span>
              {f}
            </motion.li>
          ))}
        </ul>
      </div>
    </motion.div>
  );
}

function PlanCTA({ cardHovered, accent, href, label, isCurrent }: { cardHovered: boolean; accent: string; href: string; label: string; isCurrent: boolean }) {
  const [btnHovered, setBtnHovered] = useState(false);

  // "Current plan" → muted, non-actionable look (still navigates to /app)
  if (isCurrent) {
    return (
      <motion.a
        href={href}
        animate={{ color: cardHovered ? "#FFFFFF" : "#666666" }}
        transition={{ duration: 0.2 }}
        style={{
          width: "100%", padding: "12px 24px",
          fontFamily: F, fontSize: 14, fontWeight: 500,
          border: `1px solid ${cardHovered ? "rgba(255,255,255,0.4)" : "#D4D4D4"}`,
          textDecoration: "none",
          textAlign: "center",
          display: "block",
          backgroundColor: "transparent",
          cursor: "default",
        }}
      >
        {label}
      </motion.a>
    );
  }

  const bg = cardHovered
    ? (btnHovered ? "#FFFFFF" : "#FFFFFF")
    : (btnHovered ? accent : accent);
  const fg = cardHovered ? accent : "#FFFFFF";

  return (
    <motion.a
      href={href}
      onMouseEnter={() => setBtnHovered(true)}
      onMouseLeave={() => setBtnHovered(false)}
      animate={{ backgroundColor: bg, color: fg }}
      transition={{ duration: 0.2 }}
      style={{
        width: "100%", padding: "12px 24px",
        fontFamily: F, fontSize: 14, fontWeight: 500,
        cursor: "pointer",
        border: "none",
        textDecoration: "none",
        textAlign: "center",
        display: "block",
        backgroundColor: bg,
        color: fg,
      }}
    >
      {label}
    </motion.a>
  );
}

// ─── Value props ────────────────────────────────────────────
const VALUE_PROPS = [
  {
    title: "One pass, all stems",
    description: "Separating 6 stem types from a track costs the same as separating 2. You pay for the audio length, not the number of outputs.",
  },
  {
    title: "Minutes never reset",
    description: "Your minutes never reset. Use 10 this month, 80 next month — your balance is always there.",
  },
  {
    title: "Same engine on every plan",
    description: "Every plan runs the same separation models. No quality tiers, no 'better results' hidden behind a higher plan.",
  },
  {
    title: "Transparent pricing",
    description: "No hidden fees. No per-stem multipliers. Know exactly what you're paying for.",
  },
];

// Reused by the annual savings row to format the yearly total display.
function formatCurrency(amountMinor: number, currency: string, opts?: { maxFractionDigits?: number }): string {
  const major = amountMinor / 100;
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
      maximumFractionDigits: opts?.maxFractionDigits ?? 2,
    }).format(major);
  } catch {
    return `${major.toFixed(2)} ${currency.toUpperCase()}`;
  }
}

// ─── Page ───────────────────────────────────────────────────
export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const localPrices = useLocalPrices();

  return (
    <div style={{ backgroundColor: C.bg, minHeight: "100vh" }}>
      <Header />

      {/* Single white background for entire page */}
      <div style={{ backgroundColor: C.bg }}>
        {/* Hero */}
        <section style={{ padding: "80px 0 32px" }}>
          <Container>
            <FadeIn>
              <h1 style={{
                fontFamily: F, fontSize: 48, fontWeight: 500,
                lineHeight: 1.1, letterSpacing: "-0.02em", color: C.text,
                margin: "0 0 16px",
              }}>
                Simple, transparent pricing.
              </h1>
              <p style={{
                fontFamily: F, fontSize: 18, fontWeight: 400,
                lineHeight: 1.5, color: C.textMuted, margin: "0 0 32px", maxWidth: 560,
              }}>
                Pay for what you use. No subscriptions you forget about, no credits that expire.
              </p>
              {/* Toggle — top left, like Ahrefs */}
              <BillingToggle annual={annual} onToggle={() => setAnnual(!annual)} />
            </FadeIn>
          </Container>
        </section>

        {/* Plan cards */}
        <section style={{ padding: "0 0 80px" }}>
          <Container>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
              {(["free", "pro", "studio"] as PlanId[]).map((id, i) => (
                <FadeIn key={id} delay={i * 0.08}>
                  <PlanCard planId={id} annual={annual} localPrices={localPrices} />
                </FadeIn>
              ))}
            </div>
          </Container>
        </section>

        {/* Divider */}
        <Container>
          <div style={{ height: 1, backgroundColor: "#E5E5E5" }} />
        </Container>

        {/* Comparison table */}
        <section style={{ padding: "80px 0" }}>
          <Container>
            <FadeIn>
              <h2 style={{
                fontFamily: F, fontSize: 28, fontWeight: 500,
                letterSpacing: "-0.01em", color: C.text,
                margin: "0 0 48px",
              }}>
                Compare plans
              </h2>
              <PricingComparisonTable />
            </FadeIn>
          </Container>
        </section>

        {/* Divider */}
        <Container>
          <div style={{ height: 1, backgroundColor: "#E5E5E5" }} />
        </Container>

        {/* Value props */}
        <section style={{ padding: "80px 0" }}>
          <Container>
            <FadeIn>
              <h2 style={{
                fontFamily: F, fontSize: 28, fontWeight: 500,
                letterSpacing: "-0.01em", color: C.text,
                margin: "0 0 48px",
              }}>
                Why 44Stems
              </h2>
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 48,
              }}>
                {VALUE_PROPS.map((prop, i) => (
                  <FadeIn key={prop.title} delay={i * 0.06}>
                    <div>
                      <h3 style={{
                        fontFamily: F, fontSize: 18, fontWeight: 600,
                        color: C.text, margin: "0 0 8px",
                      }}>
                        {prop.title}
                      </h3>
                      <p style={{
                        fontFamily: F, fontSize: 15, fontWeight: 400,
                        lineHeight: 1.6, color: C.textMuted, margin: 0,
                      }}>
                        {prop.description}
                      </p>
                    </div>
                  </FadeIn>
                ))}
              </div>
            </FadeIn>
          </Container>
        </section>

        {/* Divider */}
        <Container>
          <div style={{ height: 1, backgroundColor: "#E5E5E5" }} />
        </Container>

        {/* FAQ */}
        <section style={{ padding: "80px 0" }}>
          <Container>
            <FadeIn>
              <div style={{ maxWidth: 720, margin: "0 auto" }}>
                <PricingFAQ />
              </div>
            </FadeIn>
          </Container>
        </section>
      </div>

      <Footer />
    </div>
  );
}
