import { test } from "@playwright/test";

test.describe("public pages — visual screenshots", () => {
  for (const path of ["/", "/pricing", "/about", "/contact", "/terms", "/privacy", "/cookies", "/docs/download-before-upload"]) {
    const name = path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "-");
    test(`${name}`, async ({ page }, testInfo) => {
      await page.goto(path);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);

      // Trigger all FadeIn animations by scrolling the entire page first.
      // useInView only fires when sections cross the viewport, so a static
      // capture without scroll leaves opacity-0 sections invisible.
      const totalHeight = await page.evaluate(() => document.body.scrollHeight);
      const viewportHeight = await page.evaluate(() => window.innerHeight);
      const steps = Math.ceil(totalHeight / viewportHeight);
      for (let i = 1; i <= steps; i++) {
        await page.evaluate((y) => window.scrollTo({ top: y, behavior: "instant" }), i * viewportHeight);
        await page.waitForTimeout(150);
      }
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
      await page.waitForTimeout(300);

      await page.screenshot({
        path: `tests/.results/screenshots/${name}-${testInfo.project.name}.png`,
        fullPage: true,
      });
    });
  }
});
