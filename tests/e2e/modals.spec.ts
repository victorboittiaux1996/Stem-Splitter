import { test, expect } from "@playwright/test";
import { expectNoHorizontalScroll, expectTouchTargets } from "../helpers/responsive";

test.describe("Modals — sizing + touch targets", () => {
  test.beforeEach(async ({ page }) => {
    // Skip welcome modal flag for /app tests (when not testing welcome itself)
    await page.addInitScript(() => {
      localStorage.setItem("44stems-welcome-shown", "true");
    });
  });

  test("auth-modal on /login fits viewport with proper close target", async ({ page }, testInfo) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // No horizontal scroll
    await expectNoHorizontalScroll(page);

    // Modal width ≤ viewport - some breathing room
    const viewportWidth = testInfo.project.use.viewport!.width;
    const modal = page.locator('[data-testid="auth-modal-card"]').or(
      page.locator('div').filter({ hasText: /Welcome to 44Stems/ }).first()
    ).first();
    const modalBox = await modal.boundingBox();
    if (modalBox) {
      expect(modalBox.width, `Modal overflows viewport (${modalBox.width} > ${viewportWidth})`)
        .toBeLessThanOrEqual(viewportWidth);
    }

    // Close button: standalone /login mode hides close — skip if missing
    const closeBtns = page.locator('[data-testid="modal-close"]');
    const closeCount = await closeBtns.count();
    // Touch target ≥44 only below the modal pivot (md: = 768px)
    if (closeCount > 0 && viewportWidth < 768) {
      await expectTouchTargets(page, ['[data-testid="modal-close"]']);
    }
  });

  test("welcome-modal on /app first visit fits viewport with proper close target", async ({ page, browser }, testInfo) => {
    // Use a fresh context (no localStorage flag) so welcome modal appears
    const ctx = await browser.newContext();
    const fresh = await ctx.newPage();
    await fresh.goto("/app");
    await fresh.waitForLoadState("networkidle");
    await fresh.waitForTimeout(1500);

    await expectNoHorizontalScroll(fresh);

    // Welcome modal close target ≥ 44 only below md: (768px) — modal pivot
    const viewportWidth = testInfo.project.use.viewport!.width;
    if (viewportWidth < 768) {
      const close = fresh.locator('[data-testid="modal-close"]').first();
      await expect(close).toBeVisible();
      const box = await close.boundingBox();
      expect(box?.width ?? 0, "Welcome modal close width").toBeGreaterThanOrEqual(43.5);
      expect(box?.height ?? 0, "Welcome modal close height").toBeGreaterThanOrEqual(43.5);
    }

    await ctx.close();
  });
});
