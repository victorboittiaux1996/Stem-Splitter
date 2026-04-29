/* eslint-disable react-hooks/rules-of-hooks -- `use` is a Playwright fixture callback, not a React hook */
import { test as base } from "@playwright/test";
import { existsSync } from "node:fs";

const STORAGE_PATH = "tests/fixtures/auth.json";

export const test = base.extend({
  storageState: async ({}, use) => {
    if (!existsSync(STORAGE_PATH)) {
      throw new Error(
        `Auth fixture missing at ${STORAGE_PATH}. Run \`npm run test:e2e:setup-auth\` first.`,
      );
    }
    await use(STORAGE_PATH);
  },
});

export { expect } from "@playwright/test";
