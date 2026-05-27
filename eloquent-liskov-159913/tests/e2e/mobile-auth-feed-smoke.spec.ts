import { test, expect } from "@playwright/test";
import { login } from "./fixtures/login";

const mobileViewport = { width: 430, height: 932 };

test.describe("mobile auth/feed smoke", () => {
  test.use({ viewport: mobileViewport });

  test.beforeEach(async ({ page }) => {
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
      } catch {
        // ignore storage errors in hardened contexts
      }
    });
  });

  test("login form is mobile-friendly", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#login-email")).toBeVisible();
    await expect(page.locator("#login-password, #login-password-full").first()).toBeVisible();

    const submit = page.locator('button[type="submit"]').first();
    await expect(submit).toBeVisible();

    const box = await submit.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });

  test("signup and forgot password routes render", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("#su-first")).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();

    await page.goto("/forgot-password");
    await expect(page.locator('input[type="email"], input[name="email"]').first()).toBeVisible();
    await expect(page.locator('button[type="submit"]').first()).toBeVisible();
  });

  test("verify otp route has accessible digit inputs", async ({ page }) => {
    await page.goto("/verify-otp?email=qa%40hizivo.com");
    await page.getByRole("button", { name: "I have a 6-digit code" }).click();
    const digits = page.locator('input[aria-label^="Verification code digit "]');
    await expect(digits).toHaveCount(6);
  });

  test("reset password route renders expected recovery UI", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.locator("body")).toContainText(/Set new password|Invalid or expired link/);
  });

  test("verify new device route renders 6-digit form when session keys exist", async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem("zivo_device_otp_email", "qa@hizivo.com");
      sessionStorage.setItem("zivo_device_otp_userid", "00000000-0000-0000-0000-000000000000");
    });

    await page.goto("/verify-new-device");
    const digits = page.locator('input[aria-label^="Verification code digit "]');
    await expect(digits).toHaveCount(6);
    await expect(page.getByRole("button", { name: "Verify device" })).toBeVisible();
  });

  test("activity route uses mobile-safe bottom spacing after auth", async ({ page }) => {
    await login(page);
    await page.goto("/activity", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
    await expect(page.locator("div.pb-nav.safe-area-bottom").first()).toBeVisible();
  });

  test("reels comments overlay can open on mobile", async ({ page }) => {
    await login(page);
    await page.goto("/reels", { waitUntil: "domcontentloaded" });

    const commentButton = page.getByLabel("Comment").first();
    const hasCommentButton = await commentButton.isVisible().catch(() => false);
    if (!hasCommentButton) {
      await expect(page.locator("body")).toContainText(/Reels|For You|Following/i);
      return;
    }

    await commentButton.click();
    await expect(page.getByLabel("Close comments")).toBeVisible();
  });

  test("feed route loads without startup crash", async ({ page }) => {
    await page.goto("/feed", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText("App failed to start");
    await expect(page.locator("main, [data-testid='feed-page'], [data-testid='feed-sticky-header']").first()).toBeVisible();
  });
});
