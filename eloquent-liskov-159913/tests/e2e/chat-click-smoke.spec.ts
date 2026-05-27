import { test, expect } from "@playwright/test";
import { login } from "./fixtures/login";

test.describe("chat click smoke", () => {
  test("open chat and click key controls", async ({ page }) => {
    await login(page);
    await page.goto("/chat", { waitUntil: "domcontentloaded" });

    // Basic page health
    await expect(page.locator("body")).not.toContainText("App failed to start");

    // Try clicking first visible message thread if list is present.
    const thread = page.locator('[data-testid*="thread"], [data-testid*="conversation"], a[href*="/chat/"]').first();
    if (await thread.isVisible().catch(() => false)) {
      await thread.click({ force: true });
      await page.waitForTimeout(600);
    }

    // Click "Call back" action if present.
    const callBackBtn = page.getByRole("button", { name: /call back/i });
    if (await callBackBtn.isVisible().catch(() => false)) {
      await callBackBtn.click({ force: true });
      await page.waitForTimeout(300);
      // Dismiss any permission/call modal quickly.
      await page.keyboard.press("Escape").catch(() => {});
    }

    // Open overflow/menu if available.
    const moreBtn = page.locator('button[aria-label*="more" i], button[aria-label*="options" i]').first();
    if (await moreBtn.isVisible().catch(() => false)) {
      await moreBtn.click({ force: true });
      await page.waitForTimeout(300);
      await page.keyboard.press("Escape").catch(() => {});
    }

    // Click first playable voice message button if available.
    const playBtn = page.locator('button[aria-label*="play" i], button:has(svg)').first();
    if (await playBtn.isVisible().catch(() => false)) {
      await playBtn.click({ force: true });
      await page.waitForTimeout(400);
    }

    // Focus message box and type text (without sending).
    const input = page.locator('textarea, input[placeholder*="Message" i]').first();
    if (await input.isVisible().catch(() => false)) {
      await input.click({ force: true });
      await input.fill("QA click smoke");
      await expect(input).toHaveValue(/QA click smoke/);
    }

    await expect(page.locator("body")).toBeVisible();
  });
});
