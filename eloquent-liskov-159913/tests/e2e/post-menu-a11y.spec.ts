/**
 * Keyboard accessibility for the post viewer menu and grab handle.
 * Uses the seeded fixture so this never soft-skips in CI.
 */
import { test, expect, devices } from "@playwright/test";
import { seedProfilePosts } from "./fixtures/seedProfilePosts";
import { login } from "./fixtures/login";

async function dismissBlockingOverlays(page: import("@playwright/test").Page) {
  // Best-effort dismissal for onboarding/modals that can intercept clicks.
  await page.keyboard.press("Escape").catch(() => {});
  const closeButtons = page.locator('button[aria-label="Close"], button[aria-label="Dismiss"], button:has-text("Not now"), button:has-text("Close")');
  const count = await closeButtons.count().catch(() => 0);
  for (let i = 0; i < Math.min(count, 3); i += 1) {
    await closeButtons.nth(i).click({ force: true }).catch(() => {});
  }
  await page.evaluate(() => {
    const blockers = document.querySelectorAll('div[class*="fixed"][class*="inset-0"][class*="z-[200]"]');
    blockers.forEach((el) => el.remove());
  }).catch(() => {});
}

test.use({ ...devices["Desktop Chrome"] });

test.describe("post-menu accessibility", () => {
  test.setTimeout(90_000);
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Escape on the grab handle closes the post viewer", async ({ page }) => {
    await seedProfilePosts(page);
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await dismissBlockingOverlays(page);
    const photoTab = page.getByTestId("profile-tab-photo");
    await photoTab.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    if (await photoTab.isVisible().catch(() => false)) {
      await photoTab.evaluate((el) => (el as HTMLElement).click());
    }
    const trigger = page.locator('[data-testid^="profile-post-thumb"]').first();
    await expect(trigger).toBeVisible({ timeout: 8000 });
    await trigger.evaluate((el) => (el as HTMLElement).click());

    const handle = page.getByTestId("profile-post-grab-handle");
    await handle.waitFor({ state: "visible" });
    await handle.focus();
    await expect(handle).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(handle).toBeHidden({ timeout: 3000 });
  });

  test("menu sheet has menu role and arrow keys move focus between menuitems", async ({
    page,
  }) => {
    await seedProfilePosts(page); // login already ran in beforeEach
    await page.goto("/profile", { waitUntil: "domcontentloaded" });
    await dismissBlockingOverlays(page);
    const photoTab2 = page.getByTestId("profile-tab-photo");
    await photoTab2.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
    if (await photoTab2.isVisible().catch(() => false)) {
      await photoTab2.evaluate((el) => (el as HTMLElement).click());
    }
    const trigger = page.locator('[data-testid^="profile-post-thumb"]').first();
    await expect(trigger).toBeVisible({ timeout: 8000 });
    await trigger.evaluate((el) => (el as HTMLElement).click());

    const moreBtn = page
      .locator('[aria-label="Post options"], [aria-label="More options"]')
      .first();
    await moreBtn.click();
    const sheet = page.getByTestId("profile-post-menu-sheet");
    await expect(sheet).toBeVisible();
    await expect(sheet).toHaveAttribute("role", "menu");

    // First enabled menuitem should auto-focus.
    const firstItem = sheet.locator('[role="menuitem"]:not([aria-disabled="true"])').first();
    await expect(firstItem).toBeFocused();

    // ArrowDown should move focus to the next menuitem.
    await page.keyboard.press("ArrowDown");
    const secondItem = sheet.locator('[role="menuitem"]:not([aria-disabled="true"])').nth(1);
    await expect(secondItem).toBeFocused();

    // Escape closes the sheet.
    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden({ timeout: 3000 });
  });
});
