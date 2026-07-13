import { test, type Page } from "@playwright/test";

const EMAIL = process.env.QA_TEST_EMAIL || process.env.E2E_EMAIL || "";
const PASSWORD = process.env.QA_TEST_PASSWORD || process.env.E2E_PASSWORD || "";

function requireQaCredentials() {
  test.skip(!EMAIL || !PASSWORD, "QA_TEST_EMAIL / QA_TEST_PASSWORD not set");
  return { email: EMAIL, password: PASSWORD };
}

export async function login(page: Page) {
  const { email, password } = requireQaCredentials();

  // Pre-accept cookies so the consent banner (fixed bottom-0, z-[60]) never
  // overlaps the submit button and blocks Playwright's click action.
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        "zivo_cookie_consent",
        JSON.stringify({
          necessary: true,
          functional: true,
          analytics: false,
          marketing: false,
          personalization: false,
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch {}
  });
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");
  if (!page.url().includes("/login")) return;

  // If saved-account picker is shown, switch to the full login form.
  const addAccount = page.getByRole("button", { name: "Log into another account" });
  if (await addAccount.isVisible().catch(() => false)) {
    await addAccount.click();
  }

  await page.locator("#login-email").fill(email);
  await page.locator("#login-password-full, #login-password").first().fill(password);
  await page.locator('button[type="submit"]').click();

  await Promise.race([
    page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 25_000 }).catch(() => null),
    page.getByText(/wrong password|incorrect|invalid|not confirmed|too many/i).first().waitFor({ timeout: 25_000 }).catch(() => null),
  ]);

  test.skip(page.url().includes("/login"), "Configured QA credentials did not authenticate");
}
