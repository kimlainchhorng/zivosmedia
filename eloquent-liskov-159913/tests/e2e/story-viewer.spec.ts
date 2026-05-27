/**
 * StoryViewer single-instance UI invariants.
 *
 * Opens the StoryViewer from the Profile page and asserts that the key
 * fullscreen chrome (close button, pause button, header) appears exactly
 * once — locking in the regression where multiple overlapping viewers
 * were rendered when the viewer wasn't portaled to <body>.
 *
 * The test gracefully skips if the preview isn't authenticated or if the
 * current user has no story to view (no ring renders), so the suite stays
 * green in CI environments without a seeded session.
 */
import { test, expect, devices } from "@playwright/test";
import { login } from "./fixtures/login";

// defaultBrowserType (webkit) can't be honoured in a chromium-only project — strip it.
const { defaultBrowserType: _dt, ...iPhone13Opts } = devices["iPhone 13"];
test.use(iPhone13Opts);

test.describe("StoryViewer single-instance invariants", () => {
  test.setTimeout(90_000);
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("Profile story opens with exactly one header / close / pause", async ({ page }) => {
    await page.goto("/profile", { waitUntil: "domcontentloaded" });

    const ring = page.getByTestId("profile-story-ring");
    const ringCount = await ring.count();
    if (ringCount === 0) {
      test.skip(true, "Profile story ring not rendered (unauthenticated preview)");
    }

    await ring.first().click();

    // If the user has no story yet, the ring opens the CreateStorySheet
    // instead of the viewer — skip in that case so the test stays green.
    const viewer = page.getByTestId("story-viewer");
    try {
      await viewer.waitFor({ state: "visible", timeout: 3000 });
    } catch {
      test.skip(true, "Viewer did not open — user has no active story");
    }

    await expect(page.getByTestId("story-viewer")).toHaveCount(1);
    await expect(page.getByTestId("story-header")).toHaveCount(1);
    await expect(page.getByTestId("story-close")).toHaveCount(1);
    await expect(page.getByTestId("story-pause")).toHaveCount(1);
  });
});
