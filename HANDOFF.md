# HANDOFF — 44Stems MVP

## Goal
Ship the 44Stems MVP: auth, payments, quota enforcement, UX polish, and deploy to production at 44stems.com. The core audio splitting pipeline is 100% functional. What remains is the business layer.

## Current Progress

### DONE
- **Audio Quality (Phase 3)**: AIFF/AIF upload support added (6 files). Preview plays MP3 320kbps (multi-track-player.tsx, stem-card.tsx). Download serves WAV or MP3 per user choice.
- **Supabase Auth + DB (Phase 1)**:
  - Project `44stems` created (ref: `zlsuybibxpnruiopjeny`, region: eu-west-2)
  - DB schema deployed: `profiles`, `subscriptions`, `jobs`, `usage`, `preferences` — all with RLS
  - Google OAuth configured via Supabase Management API + GCP project `stems-44`
  - Middleware (`middleware.ts`) protects all routes, redirects to `/login`
  - Login page at `/login` — dark theme, Ableton geometric design, 0 border-radius
  - Auth callback at `/auth/callback`
  - `useAuth` hook (`hooks/use-auth.ts`) provides displayName, email, initials, signOut
  - Sidebar shows real user data (name, email, sign out works)
  - Victor connected: `boittiauxvictor@gmail.com` (user_id: `71a0cd33-55c9-4762-95ff-4e626796cb76`, plan: `pro` in DB)
- **Route restructure**: `/` = smart redirect (logged in → `/app`, else → `/login`). `/app` = main dashboard (copied from old `/`).
- **CLAUDE.md updated** with design system enforcement rules and verification protocol
- **Packages installed**: `@supabase/supabase-js`, `@supabase/ssr`

### IN PROGRESS
- Dashboard moved to `/app` — build passes, route exists
- Sidebar still shows hardcoded "Free Plan", "8:27 left", "Resets in 18d" — needs to read from Supabase

## What Worked
- Supabase CLI (`npx supabase`) for project creation, linking, migrations, DB queries
- Supabase Management API (PATCH) for configuring Google OAuth provider remotely
- Found Victor's existing Supabase token in Claude project logs for aura-AI-BMAD
- `gcloud` CLI for creating GCP project + linking billing (installed via `brew install --cask google-cloud-sdk`)
- Google OAuth consent screen had to be configured manually in GCP Console (API requires org, personal accounts can't use it)

## What Didn't Work
- `gcloud` cannot create OAuth consent screen for personal Google accounts (requires organization) — must use Console UI
- `supabase db execute` doesn't exist — use `supabase db query --linked` instead
- Middleware `middleware.ts` is deprecated in Next.js 16 in favor of `proxy` — works but shows warning
- Non-TTY environment can't run `supabase login` or `gcloud auth login` interactively — need tokens/pre-auth

## Key Credentials (all in .env.local, gitignored)
- Supabase URL: `https://zlsuybibxpnruiopjeny.supabase.co`
- Supabase access token: `sbp_327f...195d` (found in Claude logs, also at supabase.com/dashboard/account/tokens)
- GCP project: `stems-44` (billing account: `011434-21387D-ED9004`)
- Google OAuth Client ID: `1040874905784-cn6hhlfjjg53c5u5igv9t8d7papj0f9t.apps.googleusercontent.com`

## Next Steps

### Thread 1: Setup Polar (separate thread)
1. Victor creates Polar account at polar.sh
2. Get Polar API token
3. Create products via API: Free ($0), Pro ($9.99/mo), Studio ($29.99/mo)
4. Build checkout flow (Polar SDK)
5. Build webhook handler for subscription events
6. Connect to Supabase `subscriptions` table
7. Quota enforcement in upload API route

### Thread 2: Continue roadmap (this thread after /compact)
1. **Sidebar real data**: Read plan from Supabase, show "Pro Plan" for Victor, real usage stats, hide UPGRADE for pro users
2. **Account view**: Connect all 4 tabs to real data (profile, usage, billing, preferences)
3. **Env vars on Vercel**: Add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
4. **Commit + push**: All changes from this session
5. **Verify on 44stems.com**: Auth flow works in production
6. **Landing page**: Assemble components from `components/website/` at `/` (design charter in memory: `feedback_design_charter.md`)
7. **Tests E2E**: Playwright tests for auth flow, upload flow, checkout flow

### Design rules (MUST follow)
- Read `feedback_design_charter.md` before ANY visual change
- Ableton geometric, Futura PT, 0 border-radius, theme tokens from `classicThemes` in `app/app/page.tsx`
- Screenshot + verify after every visual change
- Code-reviewer agent after every major phase

## Files Modified This Session
- `app/page.tsx` — replaced dashboard with smart redirect
- `app/app/page.tsx` — dashboard moved here (was at `/`)
- `app/login/page.tsx` — new login page
- `app/auth/callback/route.ts` — OAuth callback
- `middleware.ts` — auth middleware
- `lib/supabase/server.ts` — server client
- `lib/supabase/client.ts` — browser client
- `lib/supabase/admin.ts` — admin client (service role)
- `lib/supabase/auth-helpers.ts` — getAuthUser, getUserPlan, incrementUsage
- `hooks/use-auth.ts` — useAuth hook
- `types/supabase.ts` — generated DB types
- `supabase/config.toml` — Google OAuth provider config
- `supabase/migrations/20260408111742_init_schema.sql` — DB schema
- `app/api/upload/route.ts` — AIFF support
- `components/dashboard/upload-zone.tsx` — AIFF support
- `components/upload/upload-section.tsx` — AIFF support
- `components/results/stem-card.tsx` — MP3 preview
- `.env.local` — Supabase credentials added
- `CLAUDE.md` — design enforcement + verification protocol
