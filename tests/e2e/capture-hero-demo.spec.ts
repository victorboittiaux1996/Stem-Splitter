import { test } from "@playwright/test";

/**
 * Capture the HeroDemo's 3 views (split / results / files) at desktop viewport
 * and save as static PNGs for the mobile cycling preview.
 *
 * The HeroDemo auto-cycles every 5 seconds: split → results → files → split.
 * We wait between captures to land on each view.
 *
 * Run when HeroDemo UI changes:
 *   npx playwright test tests/e2e/capture-hero-demo.spec.ts --project=Desktop
 */
test("capture hero demo cycling views for mobile fallback", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "Desktop", "Desktop-only capture");
  test.setTimeout(60_000);

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(1500); // settle FadeIn

  const demo = page.locator('[class*="hidden md:block"]').first().locator('div[style*="aspect-ratio"]').first();
  await demo.waitFor({ state: "visible", timeout: 5000 });

  // View 1: split (initial state, just settle)
  await page.waitForTimeout(500);
  await demo.screenshot({ path: "public/hero-demo-split.png" });

  // View 2: results (cycle 1, ~5s after split)
  await page.waitForTimeout(5200);
  await demo.screenshot({ path: "public/hero-demo-results.png" });

  // View 3: files (cycle 2, ~5s after results)
  await page.waitForTimeout(5200);
  await demo.screenshot({ path: "public/hero-demo-files.png" });
});
