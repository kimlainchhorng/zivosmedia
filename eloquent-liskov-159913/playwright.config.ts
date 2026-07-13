import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  // Default test root remains the e2e suite; the visual suite is registered
  // explicitly as a project so it can opt into Playwright's snapshot system
  // without colliding with the existing e2e specs.
  testDir: "./tests/e2e",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:8080",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- --host 127.0.0.1 --port 8080",
    url: "http://127.0.0.1:8080",
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
