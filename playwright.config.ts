import { defineConfig, devices } from "@playwright/test";

const host = process.env.PLAYWRIGHT_HOST || "127.0.0.1";
const port = process.env.PLAYWRIGHT_PORT || "8080";
const baseURL = process.env.PLAYWRIGHT_BASE_URL || `http://${host}:${port}`;

export default defineConfig({
  // Default test root remains the e2e suite; the visual suite is registered
  // explicitly as a project so it can opt into Playwright's snapshot system
  // without colliding with the existing e2e specs.
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- --host ${host} --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      testDir: "./tests/e2e",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "visual",
      testDir: "./tests/visual",
      // Snapshot baselines live next to the spec for easy review/commit.
      snapshotPathTemplate: "{testDir}/__screenshots__/{testFilePath}/{arg}{ext}",
      use: {
        // Per-test viewport / userAgent are applied via test.use(...) inside the spec.
        ...devices["Desktop Chrome"],
      },
    },
  ],
});
