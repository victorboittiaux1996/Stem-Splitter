import { expect, type Page } from "@playwright/test";

export async function expectNoHorizontalScroll(page: Page) {
  const result = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    result.scrollWidth,
    `Horizontal scroll detected: scrollWidth=${result.scrollWidth} > innerWidth=${result.innerWidth}`,
  ).toBeLessThanOrEqual(result.innerWidth + 1);
}

export async function expectNoOverflowingElements(page: Page) {
  const overflowing = await page.evaluate(() => {
    const innerWidth = window.innerWidth;
    const offenders: Array<{ tag: string; cls: string; right: number; width: number }> = [];
    const all = document.querySelectorAll("body *");
    all.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      if (rect.right > innerWidth + 1 || rect.width > innerWidth + 1) {
        offenders.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || "").toString().slice(0, 80),
          right: Math.round(rect.right),
          width: Math.round(rect.width),
        });
      }
    });
    return offenders.slice(0, 10);
  });
  expect(overflowing, `Elements overflow viewport (showing first 10):\n${JSON.stringify(overflowing, null, 2)}`).toEqual([]);
}

export async function expectTouchTargets(page: Page, selectors: string[], min = 44) {
  for (const selector of selectors) {
    const elements = page.locator(selector);
    const count = await elements.count();
    if (count === 0) continue;
    for (let i = 0; i < count; i++) {
      const el = elements.nth(i);
      if (!(await el.isVisible())) continue;
      const box = await el.boundingBox();
      if (!box) continue;
      expect(
        box.width,
        `Touch target ${selector}[${i}] width=${box.width} < ${min}px`,
      ).toBeGreaterThanOrEqual(min - 0.5);
      expect(
        box.height,
        `Touch target ${selector}[${i}] height=${box.height} < ${min}px`,
      ).toBeGreaterThanOrEqual(min - 0.5);
    }
  }
}

export function isMobileProject(projectName: string) {
  return projectName !== "Desktop" && projectName !== "iPad Mini";
}
