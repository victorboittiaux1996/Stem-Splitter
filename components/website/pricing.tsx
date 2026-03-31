"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { themes, fonts, stemColors } from "./theme";

type PricingVariant = "minimal" | "pop" | "structured";

interface PricingProps {
  variant: PricingVariant;
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

export function Pricing({ variant }: PricingProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  const isDark = resolvedTheme === "dark";
  const theme = isDark ? themes.dark : themes.light;

  function getProCardTopAccent(): React.ReactNode {
    if (variant === "minimal") {
      return null; // handled via borderTop on card
    }
    if (variant === "pop") {
      return null; // handled via borderTop + boxShadow on card
    }
    if (variant === "structured") {
      return (
        <div
          style={{
            display: "flex",
            gap: "3px",
            marginBottom: "24px",
          }}
        >
          {barColors.map((color) => (
            <div
              key={color}
              style={{
                flex: 1,
                height: "3px",
                backgroundColor: color,
              }}
            />
          ))}
        </div>
      );
    }
    return null;
  }

  function getProCardStyle(): React.CSSProperties {
    const base: React.CSSProperties = {
      backgroundColor: theme.bgAlt,
      padding: "40px 32px",
      display: "flex",
      flexDirection: "column",
      position: "relative",
    };

    if (variant === "minimal") {
      return { ...base, borderTop: `3px solid ${theme.accent}` };
    }
    if (variant === "pop") {
      return {
        ...base,
        borderTop: `3px solid ${theme.accent}`,
        boxShadow: `0 -1px 20px ${theme.accent}15`,
      };
    }
    // structured — no extra border, the bar motif handles the top
    return base;
  }

  return (
    <section
      style={{
        backgroundColor: theme.bg,
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
        {/* Section header */}
        <div style={{ marginBottom: "56px" }}>
          <p
            style={{
              fontFamily: fonts.heading,
              fontSize: "11px",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: theme.textMuted,
              margin: "0 0 12px 0",
            }}
          >
            Pricing
          </p>
          <h2
            style={{
              fontFamily: fonts.heading,
              fontSize: "36px",
              fontWeight: 700,
              color: theme.text,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Simple, transparent pricing
          </h2>
        </div>

        {/* Cards grid — 1px gap creates thin separator from bg bleeding through */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "1px",
            backgroundColor: theme.bg,
          }}
        >
          {tiers.map((tier) => {
            const isHighlighted = tier.highlighted;

            const cardStyle: React.CSSProperties = isHighlighted
              ? getProCardStyle()
              : {
                  backgroundColor: theme.bgAlt,
                  padding: "40px 32px",
                  display: "flex",
                  flexDirection: "column",
                };

            return (
              <div key={tier.id} style={cardStyle}>
                {/* Structured variant 4-bar motif for Pro */}
                {isHighlighted && getProCardTopAccent()}

                {/* Badge */}
                {tier.badge && (
                  <div style={{ marginBottom: "12px" }}>
                    <span
                      style={{
                        fontFamily: fonts.heading,
                        fontSize: "11px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        color: theme.accent,
                        backgroundColor: `${theme.accent}18`,
                        padding: "3px 8px",
                      }}
                    >
                      {tier.badge}
                    </span>
                  </div>
                )}

                {/* Tier name */}
                <h3
                  style={{
                    fontFamily: fonts.heading,
                    fontSize: "14px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    color: theme.text,
                    margin: "0 0 20px 0",
                    letterSpacing: "0.04em",
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
                      fontFamily: fonts.heading,
                      fontSize: "40px",
                      fontWeight: 700,
                      color: theme.text,
                      lineHeight: 1,
                    }}
                  >
                    {tier.price}
                  </span>
                  <span
                    style={{
                      fontFamily: fonts.body,
                      fontSize: "14px",
                      color: theme.textMuted,
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
                        fontFamily: fonts.body,
                        fontSize: "14px",
                        color: theme.textSecondary,
                        marginBottom: "10px",
                        display: "flex",
                        gap: "8px",
                        alignItems: "flex-start",
                      }}
                    >
                      <span
                        style={{
                          color: theme.accent,
                          fontWeight: 600,
                          flexShrink: 0,
                          lineHeight: "1.4",
                        }}
                      >
                        +
                      </span>
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  style={{
                    width: "100%",
                    padding: "14px 24px",
                    fontFamily: fonts.body,
                    fontSize: "14px",
                    fontWeight: 600,
                    borderRadius: 0,
                    border: isHighlighted
                      ? "none"
                      : `1px solid ${theme.textMuted}44`,
                    backgroundColor: isHighlighted
                      ? theme.accent
                      : "transparent",
                    color: isHighlighted ? "#FFFFFF" : theme.textSecondary,
                    cursor: "pointer",
                    transition: "opacity 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity =
                      "0.85";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.opacity = "1";
                  }}
                >
                  {tier.cta}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
