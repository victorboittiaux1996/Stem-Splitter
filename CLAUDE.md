# 44Stems

## What This Is
AI stem separation SaaS — by producers, for producers.
Deployed at 44stems.com. Core pipeline works end-to-end.

## Stack
Next.js 16, React 19, Tailwind 4, shadcn (base-nova), framer-motion 12

## Commands
npm run dev       # localhost:3000
npm run build     # Production build — MUST pass after every change

## Design System (MUST READ before ANY visual change)
Source of truth: components/website/theme.ts + classicThemes in app/page.tsx
Ableton geometric (0 border-radius, sober) + ElevenLabs layout (airy spacing).
Never hardcode colors — always reference theme tokens.

IMPORTANT: Before creating or modifying ANY visual component, page, or UI element:
1. Read memory file feedback_design_charter.md — it has the COMPLETE visual charter
2. Read the existing app theme (classicThemes in app/page.tsx lines 37-52) to match exact colors
3. Every new page/component MUST look like it belongs in the existing app — same font, colors, spacing, geometry
4. Zero border-radius. Futura PT only. No Inter. No rounded corners. No gradients on text.

## Tech Rules
- shadcn components only. Never build custom UI from scratch.
- framer-motion for animations. Never raw CSS or IntersectionObserver.
- Tailwind spacing scale. Never arbitrary values like py-[73px].
- Max-w-7xl mx-auto px-6 for section widths.
- Each section = own component in components/website/. Max 500 lines/file.

## Things That Will Bite You
- page.tsx is 800+ lines — search carefully before modifying, don't duplicate logic
- Workspace ID must be in URL query params (&ws=), not just headers — audio tags can't send headers
- Audio preview uses &format=mp3, download uses &format=wav — don't mix them up
- R2 presigned URLs expire in 1h (downloads) / 2h (uploads) — don't cache them
- Worker overlap=8 hardcoded — don't expose to UI without Victor's approval
- Settings/Account UI is entirely mock — don't assume any data is real
- No auth, no DB, no Stripe yet — all API endpoints are public

## Verification Protocol (MANDATORY)

Based on Anthropic's own recommendation: "Give Claude a way to verify its work — highest-leverage thing you can do."

After every change:
1. `npm run build` — zero errors required
2. If visual: screenshot with Playwright → READ it and compare
3. If functional: browse/gstack to test the actual flow

Before claiming done:
4. Launch code-reviewer agent on the diff (Writer/Reviewer separation — a fresh agent reviews what you wrote)
5. Fix what the reviewer flags
6. Evidence in the conversation (screenshot, build output, or test result)

IMPORTANT: Never say "c'est fait" without proof. Victor hates false confirmations.

## Common Mistakes (from v1-v7)
- Don't use Inter or globals.css — use theme.ts Classic theme only
- Don't build 1000+ line files — split into components
- Don't hardcode colors — use the C/themes object

## Skill Routing
When the user's request matches a skill, invoke it FIRST via Skill tool:
- Bugs/errors → investigate
- Ship/deploy/PR → ship
- QA/test → qa
- Code review → review
- Design system → design-consultation
- Visual audit → design-review
- Architecture → plan-eng-review
- Brainstorming → office-hours
- Checkpoint → checkpoint
- Health check → health
