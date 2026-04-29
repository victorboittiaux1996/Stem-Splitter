import { test } from "@playwright/test";
import path from "path";

const SCREENSHOT_DIR = path.join(process.cwd(), "tests/.results/screenshots");

test.describe("Modal visual verification", () => {
  test("auth-modal on /login", async ({ page }, testInfo) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(800);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `auth-modal-${testInfo.project.name}.png`),
      fullPage: false,
    });
  });

  test("welcome-modal on /app", async ({ page }, testInfo) => {
    await page.goto("/app");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1200);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, `welcome-modal-${testInfo.project.name}.png`),
      fullPage: false,
    });
  });
});
