# 44Stems — Design System

Ableton geometric (flat, square, sober) + ElevenLabs layout (airy, one idea per section, generous whitespace).

References: [ableton.com](https://ableton.com), [ableton.com/en/push](https://ableton.com/en/push/), [elevenlabs.io](https://elevenlabs.io), [cursor.com](https://cursor.com)

---

## Colors

### Backgrounds
| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | `#FFFFFF` | Main page background (website) |
| `bgAlt` | `#F3F3F3` | Alternating sections, subtle contrast |
| `bgCard` | `#F5F5F5` | Cards on white background |
| `bgHover` | `#E0E0E0` | Hover states on neutral elements |

### Text
| Token | Hex | Usage |
|-------|-----|-------|
| `text` | `#000000` | Headings and body text |
| `textSecondary` | `#757575` | Section descriptions, subtitles |
| `textMuted` | `#A0A0A0` | Labels (12px uppercase), metadata, captions |

> Hierarchy comes from font-weight and these 3 tiers only. Never use `#333`, `#555`, `#888`, `#999` for text.

### Accent
| Token | Hex | Usage |
|-------|-----|-------|
| `accent` | `#1B10FD` | CTAs, Pro pricing, links |
| `accentHover` | `#0E08D8` | Hover state on accent buttons |
| `accentText` | `#FFFFFF` | Text on accent backgrounds |

### Stem Colors
| Stem | Hex |
|------|-----|
| Vocals | `#1B10FD` |
| Drums | `#FF6B00` |
| Bass | `#00CC66` |
| Guitar | `#FF3366` |
| Piano | `#00BBFF` |
| Other | `#777777` |

### Color Rules
- Color ONLY on interactive elements: feature cards on hover, pricing on hover, CTA buttons
- Stem colors fill entire blocks on hover (Ableton Push pattern)
- Never as decorative lines, rainbow bars, or separators

### Dark Theme (App UI only)
| Token | Hex |
|-------|-----|
| `bg` | `#111111` |
| `bgAlt` | `#1C1C1C` |
| `bgSubtle` | `#161616` |
| `bgHover` | `#242424` |
| `text` | `#FFFFFF` |
| `textSecondary` | `#757575` |
| `accent` | `#1B10FD` |

---

## Typography

**Futura PT only.** No Inter, no system fonts.

| Element | Size | Weight | Letter-spacing | Color |
|---------|------|--------|----------------|-------|
| Headings (h1/h2) | 48–56px | 700 | -0.02em | `#000000` |
| Section descriptions | 15px | 400 | normal | `#757575` |
| Body text | 14–16px | 400 | normal | `#000000` |
| Labels | 12px | 600 | 0.1em | `#A0A0A0` |

Labels are uppercase. No gradient text on headlines.
Font string: `'Futura PT', 'futura-pt', sans-serif`

---

## Layout

| Property | Value |
|----------|-------|
| Container max-width | `1200px` (`max-w-7xl`) |
| Container padding | `0 40px` (mobile: `px-6`) |
| Section vertical padding | `120px` |
| Heading → cards gap | `56–64px` |
| Card grid gaps | `2px` (bg color as separator) |

Grids: 3 columns for features, steps, pricing.
Hero: title left + description right (ElevenLabs 2-column).

### Responsive
| Breakpoint | Behavior |
|------------|----------|
| `≥1024px` | 3-column grids, full layout |
| `768–1023px` | 2-column grids, reduced spacing |
| `<768px` | Single column, `px-6` padding |

---

## Geometry

- **Border-radius: 0 everywhere. No exceptions.**
- Cards: square blocks, no drop shadows
- No elevation/shadow system (flat design)
- Only exception: macOS window dots (circles by nature)

---

## Animations (framer-motion only)

| Animation | Properties |
|-----------|------------|
| Scroll entrance | opacity 0→1, y 24→0, 0.6s, ease `[0.22, 1, 0.36, 1]` |
| Card hover | bg white → stem color, text inverts to white. 0.3s |
| Step numbers | Color change on hover |
| Hero stem bars | Width 0 → final on mount |

### States
| State | Behavior |
|-------|----------|
| Hover (cards) | Full bg color change to stem color |
| Hover (buttons) | `accentHover` `#0E08D8` |
| Focus | 2px solid `#1B10FD` outline, 2px offset |
| Disabled | 40% opacity, no pointer events |

---

## Theme

**100% light website.** No dark sections, no dark hero.
The only dark element is the embedded app preview (hero-demo) — it simulates the product UI.

---

## Token Source of Truth

`components/website/theme.ts` — every component imports from here. No local color objects, no hardcoded hex.

---

## App UI (Dashboard, Splitter, Results)

The app uses dark theme by default. Same design principles apply (geometric, 0 border-radius, Futura PT).

### App Tokens (dark)
| Token | Hex | Usage |
|-------|-----|-------|
| `bg` | `#111111` | App background |
| `bgAlt` | `#1C1C1C` | Cards, panels |
| `bgSubtle` | `#161616` | Subtle areas |
| `bgHover` | `#242424` | Hover states |
| `text` | `#FFFFFF` | Primary text |
| `textSecondary` | `#A0A0A0` | Descriptions, secondary info |
| `accent` | `#1B10FD` | Same brand blue everywhere |

### App Stem Colors
Same as website — use `stemColors` from theme.ts.

### App vs Website
| Concern | Website | App |
|---------|---------|-----|
| Default theme | Light | Dark |
| Background | `#FFFFFF` | `#111111` |
| Text | `#000000` | `#FFFFFF` |
| Accent | `#1B10FD` | `#1B10FD` |
| Font | Futura PT | Futura PT |
| Border-radius | 0 | 0 |

### Known App Inconsistencies (to fix separately)
- `globals.css` defines `--primary: #EE575A` (coral) — should be `#1B10FD` (brand blue)
- Some dashboard components use hardcoded Tailwind color classes instead of theme tokens
- `results-view.tsx` stem colors differ from `stemColors` in theme.ts

---

## Do Not

- Rainbow bars or colored separators between sections
- Gradient text on titles
- Dark sections on the website (app preview excepted)
- Inter font, Manrope, or any non-Futura PT font
- Rounded corners (border-radius > 0)
- Drop shadows or elevation
- `#333`, `#555`, `#888`, `#999` for any text — use the 3 tiers above
- Local T/F/C color objects in components — import theme.ts
- Placeholder UI — real screenshots or pixel-perfect mockups
