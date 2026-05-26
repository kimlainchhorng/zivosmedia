import type { Page } from "@playwright/test";

const EMAIL = "kimlain@hizivo.com";
const PASSWORD = "Chhorng@1903";

export async function login(page: Page) {
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

  await page.locator("#login-email").fill(EMAIL);
  await page.locator("#login-password-full, #login-password").first().fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 25_000 });
}
