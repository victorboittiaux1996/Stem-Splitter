import { test, expect } from "@playwright/test";

/**
 * Visual verification screenshots for /app shell across viewports.
 * These are NOT regression baselines — just on-demand snapshots for manual review.
 * Run with: npx playwright test app-shell-screenshots
 */

test.describe("/app shell — visual screenshots", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem("44stems-welcome-shown", "true");
    });
  });

  test("app — closed state", async ({ page }, testInfo) => {
    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await page.screenshot({
      path: `tests/.results/screenshots/app-closed-${testInfo.project.name}.png`,
      fullPage: false,
    });
  });

  test("app — drawer open (mobile only)", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "Desktop", "Drawer is mobile-only");
    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    const hamburger = page.locator('[data-testid="header-hamburger"]');
    await expect(hamburger).toBeVisible();
    await hamburger.click();
    await page.waitForTimeout(400);
    await page.screenshot({
      path: `tests/.results/screenshots/app-drawer-open-${testInfo.project.name}.png`,
      fullPage: false,
    });
  });
});
