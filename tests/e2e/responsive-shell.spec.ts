import { test, expect } from "@playwright/test";
import { expectNoHorizontalScroll, expectTouchTargets } from "../helpers/responsive";

test.describe("Responsive Shell — /app", () => {
  test.beforeEach(async ({ page }) => {
    // Skip welcome modal on first visit so it doesn't block clicks
    await page.addInitScript(() => {
      localStorage.setItem("44stems-welcome-shown", "true");
    });
  });

  test("mobile/tablet: hamburger visible, drawer toggles via click/ESC/backdrop", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === "Desktop", "Desktop has different shell (sidebar always visible)");

    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // 1. No horizontal scroll
    await expectNoHorizontalScroll(page);

    // 2. Hamburger button visible
    const hamburger = page.locator('[data-testid="header-hamburger"]');
    await expect(hamburger).toBeVisible();

    // 3. Hamburger touch target ≥ 44×44
    await expectTouchTargets(page, ['[data-testid="header-hamburger"]']);

    // 4. Drawer initially closed (no role=dialog)
    const drawer = page.locator('[role="dialog"][aria-label="Navigation menu"]');
    await expect(drawer).toHaveCount(0);

    // 5. Click hamburger → drawer opens
    await hamburger.click();
    await expect(drawer).toBeVisible();
    await page.waitForTimeout(300); // animation settle

    // 6. Drawer nav items have touch target ≥ 44
    await expectTouchTargets(page, ['[data-testid="drawer-nav-item"]']);

    // 7. ESC closes drawer
    await page.keyboard.press("Escape");
    await expect(drawer).toHaveCount(0);
    await page.waitForTimeout(300);

    // 8. Re-open via hamburger
    await hamburger.click();
    await expect(drawer).toBeVisible();
    await page.waitForTimeout(300);

    // 9. Backdrop click closes drawer
    // Backdrop is the fixed inset-0 div with rgba(0,0,0,0.5) — click far right where drawer doesn't reach
    await page.mouse.click(testInfo.project.use.viewport!.width - 20, 200);
    await expect(drawer).toHaveCount(0);
  });

  test("desktop: hamburger hidden, drawer never visible", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "Desktop", "Desktop-only");

    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // No horizontal scroll on desktop
    await expectNoHorizontalScroll(page);

    // Hamburger hidden on desktop (lg:hidden parent div)
    const hamburger = page.locator('[data-testid="header-hamburger"]');
    await expect(hamburger).toBeHidden();

    // Drawer not in DOM
    const drawer = page.locator('[role="dialog"][aria-label="Navigation menu"]');
    await expect(drawer).toHaveCount(0);
  });
});
