import { test, expect } from "@playwright/test";

const PUBLIC_PAGES = [
  { path: "/", name: "home" },
  { path: "/pricing", name: "pricing" },
  { path: "/about", name: "about" },
  { path: "/contact", name: "contact" },
  { path: "/terms", name: "terms" },
  { path: "/privacy", name: "privacy" },
  { path: "/cookies", name: "cookies" },
  { path: "/login", name: "login" },
  { path: "/docs/download-before-upload", name: "docs-download-before-upload" },
] as const;

const APP_PAGES = [
  { path: "/app", name: "app" },
] as const;

test.describe("Baseline Desktop Screenshots", () => {
  test.beforeEach(({}, testInfo) => {
    if (testInfo.project.name !== "Desktop") {
      testInfo.skip(true, "Desktop-only baseline (run with --project=Desktop)");
    }
  });

  // Hide Next dev devtools overlay (badge in bottom-right that can flip
  // between "N" and "1 Issue" based on runtime warnings — pollutes screenshots).
  const hideDevTools = async (pwPage: import("@playwright/test").Page) => {
    await pwPage.addStyleTag({
      content: `
        nextjs-portal, [data-nextjs-toast], [data-nextjs-dev-tools-button],
        nextjs-toast, nextjs-build-watcher,
        body > div[id^="__next"] ~ *[style*="position: fixed"][style*="bottom"] {
          display: none !important;
        }
      `,
    });
  };

  for (const page of PUBLIC_PAGES) {
    test(`baseline desktop — ${page.name}`, async ({ page: pwPage }) => {
      await pwPage.goto(page.path, { waitUntil: "networkidle" });
      await hideDevTools(pwPage);
      await pwPage.waitForTimeout(500);
      await expect(pwPage).toHaveScreenshot(`${page.name}.png`, { fullPage: true });
    });
  }

  for (const page of APP_PAGES) {
    test(`baseline desktop (dev bypass) — ${page.name}`, async ({ page: pwPage }) => {
      await pwPage.goto(page.path, { waitUntil: "networkidle" });
      await hideDevTools(pwPage);
      await pwPage.waitForTimeout(800);
      await expect(pwPage).toHaveScreenshot(`${page.name}.png`, { fullPage: true });
    });
  }
});
