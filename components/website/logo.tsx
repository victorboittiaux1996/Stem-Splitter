"use client";

import { stemColors, fonts } from "./theme";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  color?: string;
}

const scales = { sm: 0.5, md: 0.75, lg: 1 };

const barColors = [
  stemColors.vocals,  // #1B10FD
  stemColors.drums,   // #FF6B00
  stemColors.bass,    // #00CC66
  stemColors.guitar,  // #FF3366
];

export function Logo({ size = "md", color }: LogoProps) {
  const s = scales[size];
  return (
    <svg
      width={200 * s}
      height={24 * s}
      viewBox="0 0 200 24"
      overflow="visible"
      fill="none"
    >
      {barColors.map((c, i) => (
        <rect key={i} x={0} y={i * 6} width={24} height={3} fill={c} />
      ))}
      <text
        x={32}
        y={21}
        fontFamily={fonts.heading}
        fontWeight={700}
        fontSize={29}
        letterSpacing={-0.5}
        fill={color || "currentColor"}
      >
        44Stems
      </text>
    </svg>
  );
}
