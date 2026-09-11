import { expect, test } from "@playwright/test";

test("production sign-in reaches feed and authenticated REST is healthy", async ({ page }) => {
  try {
  const email = process.env.QA_TEST_EMAIL;
  const password = process.env.QA_TEST_PASSWORD;
  if (!email || !password) throw new Error("QA_TEST_EMAIL and QA_TEST_PASSWORD are required; smoke was not run.");
  const mainOrigin = "https://slirphzzwcogdbkeicff.supabase.co";
  const failedRest: number[] = [];
  let placeholderRequested = false;
  page.on("request", (request) => {
    if (new URL(request.url()).hostname.endsWith(".invalid")) placeholderRequested = true;
  });
  page.on("response", (response) => {
    const url = new URL(response.url());
    if (url.origin === mainOrigin && url.pathname.startsWith("/rest/v1/") && response.status() >= 400) failedRest.push(response.status());
  });
  await page.goto("/login?redirect=%2Ffeed&lang=en", { waitUntil: "domcontentloaded" });
  const emailEntry = page.getByRole("button", { name: "Sign in with email", exact: true });
  await expect(emailEntry.or(page.locator("#login-email")).first()).toBeVisible({ timeout: 30_000 });
  if (await emailEntry.isVisible()) await emailEntry.click();
  await expect(page.locator("#login-email")).toBeVisible({ timeout: 30_000 });
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password-full").fill(password);
  // Register before clicking so fast auth/data responses cannot escape the check.
  const authenticatedRest = page.waitForResponse((response) => {
    const url = new URL(response.url());
    const bearer = response.request().headers().authorization;
    if (url.origin !== mainOrigin || !url.pathname.startsWith("/rest/v1/") || response.status() !== 200 || !bearer) return false;
    try {
      const payload = bearer.replace(/^Bearer /i, "").split(".")[1];
      return JSON.parse(Buffer.from(payload, "base64url").toString()).role === "authenticated";
    } catch { return false; }
  }, { timeout: 45_000 });
  await Promise.all([
    authenticatedRest,
    page.getByRole("button", { name: "Log in", exact: true }).click(),
    page.waitForURL((url) => url.origin === "https://zivosmedia.com" && url.pathname === "/feed", { timeout: 45_000 }),
  ]);
  expect(placeholderRequested, "No placeholder endpoint should be requested").toBe(false);
  expect(failedRest, "REST failures during login/feed boot").toEqual([]);
  } catch {
    // Playwright action errors may include filled values; do not forward them.
    throw new Error("Production sign-in smoke failed. Verify test secrets, configuration, auth redirect and authenticated REST health. Credential diagnostics are suppressed.");
  }
});
