# 44Stems

## What This Is
AI stem separation SaaS — by producers, for producers.
Web app deployed at 44stems.com. Landing page not yet built.

## Stack
Next.js 16, React 19, Tailwind 4, shadcn (base-nova), framer-motion 12

## Design References
- Ableton Live — geometric, sober, no rounded corners
- ElevenLabs — hero layout, typography, spacing
- LALAL.AI — competitor, pricing reference

## Design System
Source of truth: components/website/theme.ts
Never hardcode colors — always reference theme tokens.
Border-radius: 0 everywhere. No rounded corners.

## Tech Rules
- Use shadcn components. Never build custom UI from scratch.
- Use framer-motion for animations. Never raw CSS or IntersectionObserver.
- Use Tailwind spacing scale. Never arbitrary values like py-[73px].
- Max-w-7xl mx-auto px-6 for section widths.
- Each section = its own component in components/website/. Max 500 lines/file.

## Commands
npm run dev       # localhost:3000
npm run build     # Production build

## Verification (mandatory after every visual change)
npx playwright screenshot --full-page http://localhost:3000 /tmp/review.png
Then READ the screenshot and compare against reference images.

## Common Mistakes (from v1-v6 failures)
- Don't claim "it's done" without taking and reading a screenshot first
- Don't use Inter or globals.css theme — use theme.ts Classic theme only
- Don't build 1000+ line page files — split into components
- Don't hardcode colors — use the C/themes object

## Skill routing

When the user's request matches an available skill, ALWAYS invoke it using the Skill
tool as your FIRST action. Do NOT answer directly, do NOT use other tools first.
The skill has specialized workflows that produce better results than ad-hoc answers.

Key routing rules:
- Product ideas, "is this worth building", brainstorming → invoke office-hours
- Bugs, errors, "why is this broken", 500 errors → invoke investigate
- Ship, deploy, push, create PR → invoke ship
- QA, test the site, find bugs → invoke qa
- Code review, check my diff → invoke review
- Update docs after shipping → invoke document-release
- Weekly retro → invoke retro
- Design system, brand → invoke design-consultation
- Visual audit, design polish → invoke design-review
- Architecture review → invoke plan-eng-review
- Save progress, checkpoint, resume → invoke checkpoint
- Code quality, health check → invoke health
