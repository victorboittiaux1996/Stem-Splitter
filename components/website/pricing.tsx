"use client";

import { useState } from "react";
import { stemColors } from "./theme";

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

const tiers = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    highlighted: false,
    badge: null,
    cta: "Get started",
    features: [
      "10 tracks/month",
      "MP3 output",
      "2 & 4 stems",
      "Standard queue",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$9.99",
    period: "/month",
    highlighted: true,
    badge: "Popular",
    cta: "Start free trial",
    features: [
      "Unlimited tracks",
      "WAV 24-bit + MP3 320kbps",
      "2 / 4 / 6 stems",
      "Priority queue",
      "Batch processing",
      "URL import",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    price: "$29.99",
    period: "/month",
    highlighted: false,
    badge: null,
    cta: "Contact sales",
    features: [
      "Everything in Pro",
      "API access",
      "Team seats (up to 5)",
      "Custom processing priority",
      "Dedicated support",
      "Early access to new models",
    ],
  },
] as const;

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

function PricingCard({ tier, variant, onUpgrade }: { tier: typeof tiers[number]; variant: PricingVariant; onUpgrade?: (plan: "pro" | "studio") => void }) {
  const [hovered, setHovered] = useState(false);
  const isHighlighted = tier.highlighted;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: isHighlighted ? "#EDEAFF" : T.bg,
        padding: "0 0 40px 0",
        display: "flex",
        flexDirection: "column",
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
            margin: "0 0 16px 0",
          }}
        >
          {tier.name}
        </h3>

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
            {tier.price}
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
              Simple, transparent pricing
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
              Start for free. Upgrade when you need more stems, better quality, or batch processing. No hidden fees.
            </p>
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
            <PricingCard key={tier.id} tier={tier} variant={variant} onUpgrade={onUpgrade} />
          ))}
        </div>
      </div>
    </section>
  );
}
