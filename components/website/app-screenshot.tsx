"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { themes, fonts, stemColors } from "./theme";

const STEMS = [
  { name: "VOCALS", color: stemColors.vocals, width: "100%" },
  { name: "DRUMS",  color: stemColors.drums,  width: "85%"  },
  { name: "BASS",   color: stemColors.bass,   width: "70%"  },
  { name: "GUITAR", color: stemColors.guitar, width: "90%"  },
  { name: "PIANO",  color: stemColors.piano,  width: "60%"  },
  { name: "OTHER",  color: stemColors.other,  width: "45%"  },
] as const;

const BAR_COUNT = 60;

export type AppScreenshotVariant = "minimal" | "pop" | "structured";

interface AppScreenshotProps {
  variant?: AppScreenshotVariant;
}

export function AppScreenshot({ variant = "minimal" }: AppScreenshotProps) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";
  const t = isDark ? themes.dark : themes.light;

  const containerBoxShadow =
    variant === "pop"
      ? `0 0 80px ${stemColors.vocals}15, 0 0 80px ${stemColors.drums}10, 0 0 80px ${stemColors.bass}10`
      : undefined;

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        backgroundColor: t.bgAlt,
        padding: "32px",
        boxShadow: containerBoxShadow,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        {/* Accent square */}
        <div
          style={{
            width: 8,
            height: 8,
            backgroundColor: t.accent,
            flexShrink: 0,
            marginRight: "10px",
          }}
        />

        {/* Filename */}
        <span
          style={{
            fontFamily: fonts.heading,
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: t.text,
            flex: 1,
          }}
        >
          Summer Breeze.wav
        </span>

        {/* Duration */}
        <span
          style={{
            fontFamily: fonts.body,
            fontSize: "12px",
            color: t.textMuted,
            fontVariantNumeric: "tabular-nums",
            fontFeatureSettings: '"tnum"',
          }}
        >
          3:42
        </span>
      </div>

      {/* Stem tracks */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {STEMS.map((stem) => (
          <StemTrack key={stem.name} stem={stem} textMuted={t.textMuted} />
        ))}
      </div>
    </div>
  );
}

function StemTrack({
  stem,
  textMuted,
}: {
  stem: (typeof STEMS)[number];
  textMuted: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
      {/* Label */}
      <span
        style={{
          fontFamily: fonts.heading,
          fontSize: "10px",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: textMuted,
          width: "60px",
          flexShrink: 0,
        }}
      >
        {stem.name}
      </span>

      {/* Waveform bar area */}
      <div
        style={{
          flex: 1,
          height: "6px",
          backgroundColor: `${textMuted}15`,
          display: "flex",
          flexDirection: "row",
          alignItems: "stretch",
          overflow: "hidden",
        }}
      >
        {/* Active portion */}
        <div
          style={{
            width: stem.width,
            height: "100%",
            display: "flex",
            flexDirection: "row",
            alignItems: "stretch",
          }}
        >
          {Array.from({ length: BAR_COUNT }).map((_, i) => {
            const seed = (stem.name.charCodeAt(0) * 31 + i * 17) % 100;
            const h = 20 + seed * 0.8;
            const op = 0.7 + (seed % 30) / 100;
            return (
              <div
                key={i}
                style={{
                  flex: 1,
                  height: `${h}%`,
                  backgroundColor: stem.color,
                  opacity: op,
                  alignSelf: "center",
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
