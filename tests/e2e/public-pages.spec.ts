import { test, expect } from "@playwright/test";
import { expectNoHorizontalScroll, expectTouchTargets } from "../helpers/responsive";

const PUBLIC_PAGES = [
  "/",
  "/pricing",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/cookies",
  "/login",
  "/docs/download-before-upload",
];

test.describe("Public pages — responsive correctness", () => {
  for (const path of PUBLIC_PAGES) {
    test(`${path} renders without horizontal scroll`, async ({ page }) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
      await expectNoHorizontalScroll(page);
    });
  }

  test("/ landing has hamburger on mobile, drawer toggles", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "Desktop" || testInfo.project.name === "iPad Mini", "Mobile-only");

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const hamburger = page.locator('[data-testid="header-hamburger"]');
    await expect(hamburger).toBeVisible();
    await expectTouchTargets(page, ['[data-testid="header-hamburger"]']);

    // Drawer not initially shown
    const drawer = page.locator('[role="dialog"][aria-label="Navigation menu"]');
    await expect(drawer).toHaveCount(0);

    // Click → drawer opens
    await hamburger.click();
    await expect(drawer).toBeVisible();
    await page.waitForTimeout(300);

    // Drawer nav items ≥44 touch
    await expectTouchTargets(page, ['[data-testid="drawer-nav-item"]']);

    // ESC closes
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
  });

  test("/pricing landing has hamburger + drawer", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "Desktop" || testInfo.project.name === "iPad Mini", "Mobile-only");

    await page.goto("/pricing");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    const hamburger = page.locator('[data-testid="header-hamburger"]');
    await expect(hamburger).toBeVisible();
    await hamburger.click();
    const drawer = page.locator('[role="dialog"][aria-label="Navigation menu"]');
    await expect(drawer).toBeVisible();
  });
});
