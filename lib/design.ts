// ─── 44Stems Design System ──────────────────────────────────
// Single source of truth for all design tokens and constants.
// Import this file in every component to ensure consistency.

// ─── Colors ─────────────────────────────────────────────────
export const colors = {
  // Backgrounds
  bg: "#FFFFFF",              // Main content background
  bgSubtle: "#FAFAFA",        // Sidebar, drop zones, subtle cards
  bgHover: "#F4F4F5",         // Hover states, badges
  bgMuted: "#F0EFEF",         // Muted backgrounds, toggles

  // Borders
  border: "#E5E5E8",          // Default borders, separators
  borderSubtle: "#EEEDEC",    // Subtle separators

  // Text
  text: "#0F0F10",            // Primary text, headings
  textSecondary: "#3D3D42",   // Secondary text
  textMuted: "#6B6B73",       // Icons, secondary labels
  textLight: "#949494",       // Placeholder, metadata
  textLighter: "#BBBBC4",     // Disabled, very subtle

  // Accent
  accent: "#EE575A",          // CTA coral (used for AI badges, sliders)
  accentHover: "#E04448",     // Accent hover state

  // Semantic
  success: "#059669",         // Complete badges
  successBg: "#ECFDF5",       // Complete badge background
} as const;

// ─── Typography ─────────────────────────────────────────────
export const typography = {
  // Font families (defined in globals.css @font-face)
  fontSans: "'Aeonik', ui-sans-serif, system-ui, sans-serif",
  fontHeading: "'Aeonik', ui-sans-serif, system-ui, sans-serif",
  fontMono: "ui-monospace, 'Fira Code', monospace",

  // Sizes
  xs: 11,
  sm: 12,
  base: 13,
  md: 14,
  lg: 15,
  xl: 22,
  "2xl": 28,

  // Weights
  normal: 400,
  medium: 500,
  semibold: 600,
  bold: 700,

  // Letter spacing
  tight: "-0.02em",
  tighter: "-0.03em",
  wide: "0.02em",
  wider: "0.03em",
} as const;

// ─── Layout ─────────────────────────────────────────────────
export const layout = {
  // Sidebar
  sidebarWidth: 240,

  // Content
  contentMaxWidth: 900,           // Max-width for centered content (inline mode)
  contentPadding: 32,             // Horizontal padding for content area

  // Top bar
  topBarHeight: 52,

  // Bottom bar
  bottomBarHeight: 60,

  // Settings panel (panel mode)
  settingsPanelWidth: 350,

  // Border radius
  radiusSm: 6,
  radiusMd: 8,
  radiusLg: 10,
  radiusXl: 12,
  radius2xl: 16,
  radiusFull: 9999,
} as const;

// ─── Spacing ────────────────────────────────────────────────
export const spacing = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  "2xl": 20,
  "3xl": 24,
  "4xl": 32,
  "5xl": 40,
} as const;

// ─── Shadows ────────────────────────────────────────────────
export const shadows = {
  sm: "0 1px 2px rgba(0,0,0,0.04)",
  md: "0 4px 12px rgba(0,0,0,0.06)",
  lg: "0 8px 24px rgba(0,0,0,0.1)",
  xl: "0 8px 30px rgba(0,0,0,0.1)",
  dropdown: "0 8px 24px rgba(0,0,0,0.1)",
} as const;

// ─── Component Styles ───────────────────────────────────────
// Reusable style objects for common patterns.

export const componentStyles = {
  // Page wrapper — centers content at max-width
  pageWrapper: {
    maxWidth: layout.contentMaxWidth,
    margin: "0 auto",
  } as const,

  // Card — white card with border
  card: {
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    borderRadius: layout.radiusXl,
  } as const,

  // Subtle card — grey background card
  cardSubtle: {
    backgroundColor: colors.bgSubtle,
    border: `1px solid ${colors.border}`,
    borderRadius: layout.radiusXl,
  } as const,

  // Drop zone
  dropZone: {
    minHeight: 160,
    borderRadius: layout.radius2xl,
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.bgSubtle,
  } as const,

  // Pill button (settings bar)
  pill: {
    fontSize: typography.base,
    fontWeight: typography.medium,
    color: colors.textMuted,
    borderRadius: layout.radiusMd,
    padding: "6px 10px",
  } as const,

  // Dropdown menu
  dropdown: {
    backgroundColor: colors.bg,
    border: `1px solid ${colors.border}`,
    boxShadow: shadows.dropdown,
    borderRadius: layout.radiusXl,
  } as const,

  // Top bar pill buttons (Feedback, Docs, Ask)
  topBarPill: {
    border: `1px solid ${colors.border}`,
    borderRadius: layout.radiusFull,
    padding: "6px 14px",
    fontSize: typography.base,
    fontWeight: typography.medium,
    color: colors.textSecondary,
  } as const,

  // Sidebar nav item
  sidebarItem: {
    fontSize: typography.md,
    borderRadius: layout.radiusLg,
    padding: "9px 12px",
  } as const,

  // History row
  historyRow: {
    backgroundColor: colors.bgSubtle,
    border: `1px solid ${colors.border}`,
    borderRadius: layout.radiusXl,
    padding: "14px 16px",
  } as const,

  // Badge (BPM, key, format)
  badge: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.textMuted,
    backgroundColor: colors.bgHover,
    borderRadius: layout.radiusSm,
    padding: "2px 7px",
  } as const,

  // Section heading
  sectionHeading: {
    fontSize: typography["2xl"],
    fontWeight: typography.bold,
    letterSpacing: typography.tight,
    marginBottom: spacing["2xl"],
  } as const,

  // Sub-section heading
  subHeading: {
    fontSize: typography.xl,
    fontWeight: typography.bold,
    letterSpacing: typography.tight,
    marginBottom: spacing["2xl"],
  } as const,

  // Label (form labels, uppercase)
  label: {
    fontSize: typography.xs,
    fontWeight: typography.semibold,
    color: colors.textLight,
    letterSpacing: typography.wider,
    textTransform: "uppercase" as const,
  } as const,

  // Separator line
  separator: {
    height: 1,
    backgroundColor: colors.border,
  } as const,
} as const;

// ─── Stem Options ───────────────────────────────────────────
export const STEM_OPTIONS = [
  { value: 2 as const, label: "2 Stems", desc: "Vocals + Instrumental" },
  { value: 4 as const, label: "4 Stems", desc: "Vocals, Drums, Bass, Other" },
  { value: 6 as const, label: "6 Stems", desc: "All instruments separated" },
];

export const STEM_MAP: Record<number, string[]> = {
  2: ["vocals", "instrumental"],
  4: ["vocals", "drums", "bass", "other"],
  6: ["vocals", "drums", "bass", "guitar", "piano", "other"],
};

export const STEM_COLORS: Record<string, { label: string; color: string; played: string }> = {
  vocals: { label: "Vocals", color: "#8B5CF6", played: "#7C3AED" },
  drums: { label: "Drums", color: "#F59E0B", played: "#D97706" },
  bass: { label: "Bass", color: "#10B981", played: "#059669" },
  guitar: { label: "Guitar", color: "#F97316", played: "#EA580C" },
  piano: { label: "Piano", color: "#0EA5E9", played: "#0284C7" },
  other: { label: "Other", color: "#EE575A", played: "#DC2626" },
  instrumental: { label: "Instrumental", color: "#6366F1", played: "#4F46E5" },
};
