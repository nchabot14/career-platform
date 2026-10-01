import { defineConfig } from "@playwright/test";

const port = 3100;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `node tests/e2e/prepare-database.mjs && pnpm exec next build && pnpm exec next start -H 127.0.0.1 -p ${port}`,
    url: baseURL,
    timeout: 300_000,
    reuseExistingServer: false,
    env: {
      DATABASE_URL: "file:./data/career_platform.e2e.db",
      FILE_STORAGE_DIR: "data/e2e-files",
      NEXT_PUBLIC_SITE_URL: baseURL,
    },
  },
});
