// Source of truth for website design tokens — see DESIGN.md
// All website components MUST import from here. No local color objects.

export const themes = {
  dark: {
    bg: "#111111",
    bgAlt: "#1C1C1C",
    bgCard: "#1C1C1C",
    bgSubtle: "#161616",
    bgHover: "#242424",
    bgElevated: "#202020",
    text: "#FFFFFF",
    textSecondary: "#A0A0A0",
    textMuted: "#757575",
    accent: "#1B10FD",
    accentHover: "#0E08D8",
    accentText: "#FFFFFF",
    border: "rgba(255,255,255,0.12)",
  },
  light: {
    bg: "#FFFFFF",
    bgAlt: "#F3F3F3",
    bgCard: "#F5F5F5",
    bgSubtle: "#EAEAEA",
    bgHover: "#E0E0E0",
    bgElevated: "#F0F0F0",
    text: "#000000",
    textSecondary: "#757575",
    textMuted: "#A0A0A0",
    accent: "#1B10FD",
    accentHover: "#0E08D8",
    accentText: "#FFFFFF",
    border: "#E5E5E5",
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
  body: "'Futura PT', 'futura-pt', sans-serif",
  mono: "'Fira Code', monospace",
} as const;

export type ThemeMode = "dark" | "light";
