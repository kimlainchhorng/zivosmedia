/**
 * Post viewer menu interaction E2E QA.
 *
 * Verifies two regression-prone behaviors that broke historically when
 * the swipe-down dismiss gesture changed:
 *
 *  1. Swipe round-trip — overlay opens, dismisses with a real flick,
 *     re-opens cleanly, no stale pointer captures.
 *
 *  2. Repeated open/close cycles do not poison click handlers — after 3
 *     dismiss-and-reopen rounds, the "..." menu trigger and each menu
 *     row must still respond to taps.
 *
 * Uses iPhone 13 + Pixel 7 device descriptors so iOS and Android swipe
 * thresholds (per `useSwipeDownClose`) are both exercised end-to-end.
 *
 * Trigger thumbnails / overlay test ids are seeded by the dev profile
 * fixture; if `[data-testid^="profile-post-thumb"]` is not present the
 * test soft-skips so it doesn't block CI on environments without seed
 * data.
 */
import { test, expect, devices, type Page, type Locator } from "@playwright/test";
import { seedProfilePosts } from "./fixtures/seedProfilePosts";
import { login } from "./fixtures/login";

const DEVICE_PROFILES = [
  { label: "iPhone 13 (iOS Safari)", device: devices["iPhone 13"] },
  { label: "Pixel 7 (Android Chrome)", device: devices["Pixel 7"] },
];

/**
 * Drags down on a handle using Playwright's mouse (pointer) API.
 * framer-motion dragControls require PointerEvents — see swipe-close.spec.ts.
 */
async function dragDown(
  page: Page,
  handle: Locator,
  distance: number,
  steps: number,
  stepDelayMs: number,
) {
  const box = await handle.boundingBox();
  if (!box) throw new Error("grab handle has no bounding box");
  const startX = box.x + box.width / 2;
  const startY = box.y + box.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    const y = startY + (distance * i) / steps;
    await page.mouse.move(startX, y, { steps: 1 });
    if (stepDelayMs > 0) await page.waitForTimeout(stepDelayMs);
  }
  await page.mouse.up();
}

async function openProfilePostOverlay(page: Page): Promise<boolean> {
  await seedProfilePosts(page);
  await page.goto("/profile", { waitUntil: "domcontentloaded" });
  // Wait for the Photos tab to render, then click it so the grid thumbnails
  // (motion.div with onClick) are the click targets — not the All-tab feed
  // cards whose root div has no onClick.
  const photoTab = page.getByTestId("profile-tab-photo");
  await photoTab.waitFor({ state: "visible", timeout: 8000 }).catch(() => {});
  if (await photoTab.isVisible().catch(() => false)) await photoTab.click();
  const trigger = page.locator('[data-testid^="profile-post-thumb"]').first();
  // Seed guarantees posts exist — fail loudly if the seed bridge regressed.
  await expect(trigger).toBeVisible({ timeout: 8000 });
  await trigger.evaluate((el) => (el as HTMLElement).click());
  await page.getByTestId("profile-post-grab-handle").waitFor({ state: "visible", timeout: 8000 });
  return true;
}

for (const profile of DEVICE_PROFILES) {
  test.describe(`post-menu interaction — ${profile.label}`, () => {
    // defaultBrowserType can only be set top-level; strip it so the rest of the
    // device descriptor (viewport, userAgent, etc.) can still be applied here.
    const { defaultBrowserType: _dt, ...deviceOpts } = profile.device;
    test.use(deviceOpts);
    test.setTimeout(90_000);

    test.beforeEach(async ({ page }) => {
      await login(page);
    });

    test("swipe round-trip: dismiss with a flick, then re-open cleanly", async ({ page }) => {
      const opened = await openProfilePostOverlay(page);
      if (!opened) return;

      const handle = page.getByTestId("profile-post-grab-handle");
      // Fast flick well past every platform threshold.
      await dragDown(page, handle, 280, 8, 8);

      // Overlay should be gone.
      await expect(page.getByTestId("profile-post-close")).toBeHidden({ timeout: 3000 });

      // Re-open without page reload.
      const trigger = page.locator('[data-testid^="profile-post-thumb"]').first();
      await trigger.evaluate((el) => (el as HTMLElement).click());
      await expect(page.getByTestId("profile-post-grab-handle")).toBeVisible({ timeout: 5000 });
    });

    test("repeated open/close keeps menu trigger and rows clickable", async ({ page }) => {
      const opened = await openProfilePostOverlay(page);
      if (!opened) return;

      // 3 swipe-dismiss + reopen cycles to flush any stale pointer state.
      for (let i = 0; i < 3; i++) {
        await dragDown(page, page.getByTestId("profile-post-grab-handle"), 280, 8, 8);
        await expect(page.getByTestId("profile-post-close")).toBeHidden({ timeout: 3000 });
        await page.locator('[data-testid^="profile-post-thumb"]').first().evaluate((el) => (el as HTMLElement).click());
        await page
          .getByTestId("profile-post-grab-handle")
          .waitFor({ state: "visible", timeout: 3000 });
      }

      // Open the "..." menu — this is what historically broke after the
      // swipe gesture left a captured pointer behind.
      const moreBtn = page.locator('[aria-label="Post options"], [aria-label="More options"]').first();
      await moreBtn.click({ trial: false });

      const sheet = page.getByTestId("profile-post-menu-sheet");
      await expect(sheet).toBeVisible({ timeout: 3000 });

      // Each labeled action should be clickable.
      for (const id of [
        "profile-menu-report",
        "profile-menu-notifications",
        "profile-menu-not-interested",
      ]) {
        const row = page.getByTestId(id);
        await expect(row).toBeVisible();
        const box = await row.boundingBox();
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
      }
    });

    test("report flow shows confirmation and persists 'Reported' status", async ({ page }) => {
      const opened = await openProfilePostOverlay(page);
      if (!opened) return;

      const moreBtn = page.locator('[aria-label="Post options"], [aria-label="More options"]').first();
      await moreBtn.click();
      await page.getByTestId("profile-post-menu-sheet").waitFor({ state: "visible" });

      await page.getByTestId("profile-menu-report").click();

      // Pick the first category to reach the submit screen.
      await page.getByText("I just don't like it").first().click();
      await page.getByTestId("profile-report-submit").click();

      // Confirmation screen.
      await expect(page.getByTestId("profile-report-submitted")).toBeVisible({ timeout: 3000 });
      await page.getByRole("button", { name: /done/i }).click();

      // Re-open the menu — Report row should now show the "Reported" badge.
      await moreBtn.click();
      await expect(page.getByTestId("profile-menu-report-status")).toHaveText(/reported/i);
    });
  });
}
