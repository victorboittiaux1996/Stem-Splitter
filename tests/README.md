# 44Stems E2E Tests

Playwright tests for mobile responsive overhaul + regression coverage.

## Setup (one-time)

```bash
npm install
npx playwright install chromium
```

## Capturing the desktop baseline

Run **before** any responsive refactor work — these are the reference screenshots that future runs are diffed against to detect desktop regressions:

```bash
npm run test:e2e:baseline -- --update-snapshots
```

The snapshots are committed to `tests/e2e/baseline-desktop.spec.ts-snapshots/` (see `.gitignore` exception).

## Running tests

```bash
# All projects, all specs
npm run test:e2e

# Single mobile viewport (fastest signal during dev)
npm run test:e2e:mobile

# Desktop only (regression check)
npm run test:e2e:desktop

# Interactive UI mode (debugging)
npm run test:e2e:ui

# Update snapshots after intentional visual changes
npm run test:e2e:update
```

## Authenticated /app tests

The `/app` routes are gated by Supabase + middleware. On `localhost`, middleware.ts has a dev bypass (`isDev` check), so unauth requests render the layout but client-side hooks (`useUser()`) return null. For full /app flows with real session data, run setup once:

```bash
npm run test:e2e:setup-auth
```

This opens a Chromium window. Sign in via Google or magic link → wait for redirect to `/app` → script saves session state to `tests/fixtures/auth.json` (gitignored). All subsequent runs of authenticated specs reuse this session.

**Refresh cadence**: Supabase refresh tokens last ~60 days. If authenticated specs fail with 401/redirect-to-login, re-run `setup-auth`.

## Project matrix

| Project | Viewport | Use |
|---|---|---|
| iPhone SE | 375×667 | Smallest modern phone — primary mobile gate |
| iPhone 14 | 390×844 | Mainstream iOS |
| iPhone 14 Pro | 393×852 | Proxy for iPhone 15 Pro (Playwright doesn't ship 15 Pro yet) |
| Pixel 5 | 393×851 | Android coverage |
| iPad Mini | 768×1024 | Tablet pivot — at this width, dashboard runs `lg:` desktop layout (because iPad Mini portrait = the boundary) |
| Desktop | 1440×900 | Desktop regression baseline |

Note: in the dashboard (`/app`, `/share`, `/processing`), the responsive pivot is **`lg:` (1024px)**, so iPad Mini portrait (768px) renders the **mobile** layout. In marketing pages (landing, pricing, etc.), the pivot is `md:` (768px), so iPad Mini gets the desktop layout.

## Adding a new test

```ts
import { test, expect } from "@playwright/test";
import { expectNoHorizontalScroll, expectTouchTargets } from "../helpers/responsive";

test("my page is mobile-friendly", async ({ page }) => {
  await page.goto("/my-page");
  await expectNoHorizontalScroll(page);
  await expectTouchTargets(page, ['[data-testid="primary-action"]']);
  await expect(page).toHaveScreenshot("my-page.png", { fullPage: true });
});
```
