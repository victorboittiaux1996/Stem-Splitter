// Source of truth: classicThemes in app/page.tsx lines 36-51
// DO NOT use globals.css variables — those are legacy shadcn (Inter, #EE575A)

export const themes = {
  dark: {
    bg: "#111111",       // classicThemes.dark.bg
    bgAlt: "#1C1C1C",   // classicThemes.dark.bgCard
    bgSubtle: "#161616", // classicThemes.dark.bgSubtle
    bgHover: "#242424",  // classicThemes.dark.bgHover
    bgElevated: "#202020", // classicThemes.dark.bgElevated
    text: "#FFFFFF",
    textSecondary: "#999999",  // classicThemes.dark.textSec
    textMuted: "#666666",
    accent: "#1B10FD",
    accentText: "#FFFFFF",
  },
  light: {
    bg: "#F3F3F3",       // classicThemes.light.bg
    bgAlt: "#FFFFFF",    // classicThemes.light.bgCard
    bgSubtle: "#EAEAEA", // classicThemes.light.bgSubtle
    bgHover: "#E0E0E0",  // classicThemes.light.bgHover
    bgElevated: "#F0F0F0", // classicThemes.light.bgElevated
    text: "#000000",
    textSecondary: "#555555",  // classicThemes.light.textSec
    textMuted: "#888888",
    accent: "#1B10FD",
    accentText: "#FFFFFF",
  },
} as const;

export const stemColors = {
  vocals: "#1B10FD",
  drums: "#FF6B00",
  bass: "#00CC66",
  guitar: "#FF3366",
  piano: "#00BBFF",
  other: "#777777",
} as const;

export const fonts = {
  heading: "'Futura PT', 'futura-pt', sans-serif",
  body: "'Aeonik', sans-serif",
  mono: "'Fira Code', monospace",
} as const;

export type ThemeMode = "dark" | "light";
