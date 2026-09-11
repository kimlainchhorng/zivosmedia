import { defineConfig, devices } from "@playwright/test";
import { config as loadDotenv } from "dotenv";
import { fileURLToPath } from "node:url";

// CI secrets win; local credentials stay in ignored files and out of reports.
for (const file of [".env.local", ".env.deploy"]) {
  loadDotenv({ path: fileURLToPath(new URL(file, import.meta.url)), override: false, quiet: true });
}

// Production credentials must never enter traces, screenshots or HTML reports.
export default defineConfig({
  testDir: "./tests/deploy",
  timeout: 90_000,
  workers: 1,
  retries: 0,
  reporter: "line",
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "https://zivosmedia.com",
    trace: "off",
    screenshot: "off",
    video: "off",
    serviceWorkers: "block",
  },
});
