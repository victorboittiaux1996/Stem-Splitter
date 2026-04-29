import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";

const STORAGE_PATH = "tests/fixtures/auth.json";
const BASE_URL = "http://localhost:3000";
const LOGIN_URL = `${BASE_URL}/login?next=/app`;

async function main() {
  await mkdir(dirname(STORAGE_PATH), { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log("\n=== 44Stems Auth Setup ===");
  console.log(`Opening ${LOGIN_URL} ...`);
  console.log("Sign in with Google or magic link in the browser window.");
  console.log("This script will save your session as soon as it detects /app.\n");

  await page.goto(LOGIN_URL);

  try {
    await page.waitForURL(/\/app(\/|$|\?)/, { timeout: 5 * 60_000 });
  } catch {
    console.error("\nTimeout (5 min) waiting for /app redirect. Aborting.");
    await browser.close();
    process.exit(1);
  }

  await context.storageState({ path: STORAGE_PATH });
  console.log(`\n✓ Session saved to ${STORAGE_PATH}`);
  console.log("Authenticated specs can now run via the `authenticated` test fixture.\n");

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
