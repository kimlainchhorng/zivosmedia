/**
 * Playwright auth setup — produces tests/visual/.auth/state.json which
 * the safe-area visual suite consumes via `storageState`.
 *
 * Run once locally (or in CI) before the visual suite:
 *   QA_TEST_EMAIL=… QA_TEST_PASSWORD=… npx playwright test tests/visual/auth.setup.ts
 *
 * If credentials are missing, the file is NOT written and authenticated
 * routes in safe-area.spec.ts are skipped automatically.
 */
import { test as setup, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// __dirname isn't defined in ESM scope; reconstruct from import.meta.url
// (same fix as safe-area.spec.ts).
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const STATE_DIR = path.join(__dirname, ".auth");
const STATE_PATH = path.join(STATE_DIR, "state.json");

setup("authenticate", async ({ page }) => {
  const email = process.env.QA_TEST_EMAIL;
  const password = process.env.QA_TEST_PASSWORD;

  if (!email || !password) {
    setup.skip(true, "QA_TEST_EMAIL / QA_TEST_PASSWORD not set — auth skipped");
    return;
  }

  fs.mkdirSync(STATE_DIR, { recursive: true });

  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();

  // Wait for post-login navigation to settle.
  await expect(page).not.toHaveURL(/\/login/, { timeout: 15_000 });
  await page.waitForLoadState("networkidle");

  await page.context().storageState({ path: STATE_PATH });
});
