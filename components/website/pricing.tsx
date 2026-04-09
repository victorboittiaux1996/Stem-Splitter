"use client";

import { useState } from "react";
import { stemColors } from "./theme";
import { PLANS } from "@/lib/plans";

const F = "'Futura PT', 'futura-pt', sans-serif";

const T = {
  bg: "#FFFFFF",
  bgCard: "#F5F5F5",
  text: "#000000",
  textSecondary: "#555555",
  textMuted: "#8C8C8C",
  border: "#E5E5E5",
  accent: "#1B10FD",
};

type PricingVariant = "minimal" | "pop" | "structured";

interface PricingProps {
  variant: PricingVariant;
  onUpgrade?: (plan: "pro" | "studio") => void;
}

// Prices from central config, marketing features kept here (different tone than technical limits)
const tiers = [
  {
    id: "free" as const,
    name: PLANS.free.label,
    tagline: PLANS.free.tagline,
    monthlyPrice: `$${PLANS.free.priceUSD}`,
    yearlyPrice: `$${PLANS.free.yearlyPriceUSD}`,
    period: "forever",
    highlighted: false,
    badge: null,
    cta: "Get started",
    features: PLANS.free.features,
  },
  {
    id: "pro" as const,
    name: PLANS.pro.label,
    tagline: PLANS.pro.tagline,
    monthlyPrice: `$${PLANS.pro.priceUSD}`,
    yearlyPrice: `$${PLANS.pro.yearlyPriceUSD}`,
    period: "/mo",
    highlighted: true,
    badge: "Popular",
    cta: "Start free trial",
    features: PLANS.pro.features,
  },
  {
    id: "studio" as const,
    name: PLANS.studio.label,
    tagline: PLANS.studio.tagline,
    monthlyPrice: `$${PLANS.studio.priceUSD}`,
    yearlyPrice: `$${PLANS.studio.yearlyPriceUSD}`,
    period: "/mo",
    highlighted: false,
    badge: null,
    cta: "Get Studio",
    features: PLANS.studio.features,
  },
];

const barColors = [
  stemColors.vocals,
  stemColors.drums,
  stemColors.bass,
  stemColors.guitar,
] as const;

function CTAButton({
  label,
  highlighted,
  onClick,
}: {
  label: string;
  highlighted: boolean;
  variant: PricingVariant;
  onClick?: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  const base: React.CSSProperties = {
    width: "100%",
    padding: "12px 24px",
    fontFamily: F,
    fontSize: "14px",
    fontWeight: 500,
    borderRadius: 0,
    cursor: "pointer",
    transition: "background-color 0.15s ease",
    border: "none",
    display: "block",
    textAlign: "center",
  };

  if (highlighted) {
    return (
      <button
        onClick={onClick}
        style={{
          ...base,
          backgroundColor: hovered ? "#0E08D8" : "#1B10FD",
          color: "#FFFFFF",
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      style={{
        ...base,
        backgroundColor: "transparent",
        color: T.text,
        border: `1px solid ${T.border}`,
        background: hovered ? T.bgCard : "transparent",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {label}
    </button>
  );
}

function PricingCard({ tier, variant, onUpgrade, annual }: { tier: typeof tiers[number]; variant: PricingVariant; onUpgrade?: (plan: "pro" | "studio") => void; annual: boolean }) {
  const [hovered, setHovered] = useState(false);
  const isHighlighted = tier.highlighted;
  const displayPrice = annual ? tier.yearlyPrice : tier.monthlyPrice;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: isHighlighted ? "#EDEAFF" : T.bg,
        padding: "0 0 40px 0",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderRadius: 0,
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
        boxShadow: "none",
        border: isHighlighted ? "none" : `1px solid ${hovered ? "#D0D0D0" : T.border}`,
      }}
    >
      {/* 4-bar stem color motif — always on highlighted, on hover for others */}
      <div
        style={{
          display: "flex",
          height: "3px",
          marginBottom: "0",
          opacity: isHighlighted || hovered ? 1 : 0,
          transition: "opacity 0.2s ease",
        }}
      >
        {barColors.map((color) => (
          <div key={color} style={{ flex: 1, backgroundColor: color }} />
        ))}
      </div>

      <div style={{ padding: "36px 32px 0" }}>
        {/* Badge */}
        {tier.badge && (
          <div style={{ marginBottom: "12px" }}>
            <span
              style={{
                fontFamily: F,
                fontSize: "11px",
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: isHighlighted ? "#1B10FD99" : T.textMuted,
                backgroundColor: isHighlighted ? "#1B10FD15" : "#EFEFEF",
                padding: "3px 10px",
                borderRadius: 0,
              }}
            >
              {tier.badge}
            </span>
          </div>
        )}

        {/* Tier name */}
        <h3
          style={{
            fontFamily: F,
            fontSize: "13px",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            color: isHighlighted ? "#1B10FD" : T.textMuted,
            margin: "0 0 4px 0",
          }}
        >
          {tier.name}
        </h3>
        <p
          style={{
            fontFamily: F,
            fontSize: "12px",
            fontWeight: 300,
            color: isHighlighted ? "#1B10FD88" : T.textMuted,
            margin: "0 0 16px 0",
          }}
        >
          {tier.tagline}
        </p>

        {/* Price */}
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: "4px",
            marginBottom: "32px",
          }}
        >
          <span
            style={{
              fontFamily: F,
              fontSize: "40px",
              fontWeight: 300,
              color: isHighlighted ? "#1B10FD" : T.text,
              lineHeight: 1,
            }}
          >
            {displayPrice}
          </span>
          <span
            style={{
              fontFamily: F,
              fontSize: "14px",
              fontWeight: 300,
              color: isHighlighted ? "#1B10FD88" : T.textMuted,
            }}
          >
            {tier.period}
          </span>
        </div>

        {/* Features */}
        <ul
          style={{
            listStyle: "none",
            margin: "0 0 32px 0",
            padding: 0,
            flex: 1,
          }}
        >
          {tier.features.map((feature) => (
            <li
              key={feature}
              style={{
                fontFamily: F,
                fontSize: "14px",
                fontWeight: 300,
                color: isHighlighted ? "#111111" : T.textSecondary,
                marginBottom: "10px",
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
              }}
            >
              <span
                style={{
                  color: isHighlighted ? "#1B10FD44" : T.textMuted,
                  flexShrink: 0,
                  lineHeight: "1.5",
                  fontSize: "12px",
                }}
              >
                —
              </span>
              {feature}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <CTAButton label={tier.cta} highlighted={isHighlighted} variant={variant} onClick={tier.id !== "free" ? () => onUpgrade?.(tier.id as "pro" | "studio") : undefined} />
      </div>
    </div>
  );
}

export function Pricing({ variant, onUpgrade }: PricingProps) {
  const [annual, setAnnual] = useState(false);

  return (
    <section
      style={{
        backgroundColor: T.bgCard,
        padding: "100px 40px",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          marginLeft: "auto",
          marginRight: "auto",
        }}
      >
        {/* Section header — 2-col ElevenLabs pattern */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "80px",
            marginBottom: "56px",
          }}
        >
          <div style={{ flex: "0 0 42%" }}>
            <p
              style={{
                fontFamily: F,
                fontSize: "13px",
                fontWeight: 500,
                color: T.textMuted,
                margin: "0 0 20px 0",
                letterSpacing: "0.01em",
              }}
            >
              Pricing
            </p>
            <h2
              style={{
                fontFamily: F,
                fontSize: "48px",
                fontWeight: 300,
                color: T.text,
                margin: 0,
                lineHeight: "52px",
                letterSpacing: "-0.01em",
              }}
            >
              Simple, transparent pricing.
            </h2>
          </div>
          <div style={{ flex: 1, paddingTop: "6px" }}>
            <p
              style={{
                fontFamily: F,
                fontSize: "16px",
                fontWeight: 300,
                color: T.textSecondary,
                lineHeight: 1.65,
                margin: 0,
              }}
            >
              Pay for what you use. No subscriptions you forget about, no credits that expire.
            </p>
            {/* Billing toggle */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 24 }}>
              <span style={{ fontFamily: F, fontSize: 14, fontWeight: annual ? 300 : 500, color: annual ? T.textMuted : T.text }}>Monthly</span>
              <button
                onClick={() => setAnnual(!annual)}
                style={{
                  position: "relative", width: 44, height: 24,
                  backgroundColor: annual ? T.accent : "#D4D4D4",
                  border: "none", cursor: "pointer", padding: 0, borderRadius: 0,
                  transition: "background-color 0.2s",
                }}
              >
                <div
                  style={{
                    position: "absolute", top: 2,
                    left: annual ? 22 : 2,
                    width: 20, height: 20, backgroundColor: "#FFFFFF",
                    transition: "left 0.2s ease",
                  }}
                />
              </button>
              <span style={{ fontFamily: F, fontSize: 14, fontWeight: annual ? 500 : 300, color: annual ? T.text : T.textMuted }}>Annual</span>
              {annual && (
                <span style={{ fontFamily: F, fontSize: 11, fontWeight: 600, color: T.accent, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Save 30%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Cards grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "12px",
          }}
        >
          {tiers.map((tier) => (
            <PricingCard key={tier.id} tier={tier} variant={variant} onUpgrade={onUpgrade} annual={annual} />
          ))}
        </div>
      </div>
    </section>
  );
}
