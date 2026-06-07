import { test, expect } from "@playwright/test";

const EMAIL = process.env.QA_TEST_EMAIL || process.env.E2E_EMAIL || "";
const PASSWORD = process.env.QA_TEST_PASSWORD || process.env.E2E_PASSWORD || "";

test("reels page loads after login and we can capture state", async ({ page }) => {
  test.skip(!EMAIL || !PASSWORD, "QA_TEST_EMAIL / QA_TEST_PASSWORD not set");

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(err.message));

  await page.goto("/login");
  await page.fill("#login-email", EMAIL);
  await page.locator("#login-password-full, #login-password").first().fill(PASSWORD);
  await page.click('button[type="submit"]');

  // Wait for nav away from /login (success) or for an error toast.
  await Promise.race([
    page.waitForURL((url) => !url.pathname.startsWith("/login"), { timeout: 15_000 }).catch(() => null),
    page.getByText(/wrong password|incorrect|invalid|not confirmed|too many/i).first().waitFor({ timeout: 15_000 }).catch(() => null),
  ]);
  test.skip(page.url().includes("/login"), "Configured QA credentials did not authenticate");

  await page.screenshot({ path: "tmp/reels-after-login.png", fullPage: false });

  await page.goto("/reels", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(4_000);
  await page.screenshot({ path: "tmp/reels-page.png", fullPage: false });

  const url = page.url();
  const title = await page.title();
  const bodyText = (await page.locator("body").innerText()).slice(0, 800);

  console.log("FINAL_URL:", url);
  console.log("TITLE:", title);
  console.log("BODY_PREVIEW:", bodyText.replace(/\s+/g, " "));
  console.log("CONSOLE_ERRORS:", JSON.stringify(consoleErrors.slice(0, 20), null, 2));
  console.log("PAGE_ERRORS:", JSON.stringify(pageErrors.slice(0, 20), null, 2));

  expect(url).toContain("/reels");
});
