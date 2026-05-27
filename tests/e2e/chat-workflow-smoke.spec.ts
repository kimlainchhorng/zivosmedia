import { test, expect } from "@playwright/test";
import { login } from "./fixtures/login";

test.describe("chat workflow smoke", () => {
  test("open a thread and exercise chat actions", async ({ page }) => {
    await login(page);
    await page.goto("/chat", { waitUntil: "domcontentloaded" });

    await expect(page.locator("body")).not.toContainText("App failed to start");

    // Open first available conversation row if present.
    const thread = page
      .locator('[data-testid*="thread"], [data-testid*="conversation"], a[href*="/chat/"]')
      .first();
    if (await thread.isVisible().catch(() => false)) {
      await thread.click({ force: true });
      await page.waitForTimeout(500);
    }

    // Message composer should accept text.
    const composer = page
      .locator('textarea, input[placeholder*="Message" i], [contenteditable="true"]')
      .first();
    const hasComposer = await composer.isVisible().catch(() => false);
    if (hasComposer) {
      await composer.click({ force: true });
      await composer.fill("E2E workflow smoke message");

      const tag = await composer.evaluate((el) => el.tagName.toLowerCase());
      if (tag === "textarea" || tag === "input") {
        await expect(composer).toHaveValue(/E2E workflow smoke message/);
      } else {
        await expect(composer).toContainText(/E2E workflow smoke message/);
      }
    } else {
      // Some sessions open read-only/system threads with no composer.
      await expect(page.locator("body")).toContainText(/Messages|Call back|voice call|chat/i);
    }

    // Tap plus/attachment if available and dismiss any resulting sheet.
    const attach = page
      .locator('button[aria-label*="attach" i], button[aria-label*="plus" i], button:has-text("+")')
      .first();
    if (await attach.isVisible().catch(() => false)) {
      await attach.click({ force: true });
      await page.waitForTimeout(250);
      await page.keyboard.press("Escape").catch(() => {});
    }

    // Tap emoji or stickers icon when available.
    const emoji = page
      .locator('button[aria-label*="emoji" i], button[aria-label*="sticker" i], button[aria-label*="reaction" i]')
      .first();
    if (await emoji.isVisible().catch(() => false)) {
      await emoji.click({ force: true });
      await page.waitForTimeout(250);
      await page.keyboard.press("Escape").catch(() => {});
    }

    // Open overflow menu and close.
    const more = page
      .locator('button[aria-label*="more" i], button[aria-label*="options" i], button[aria-label*="menu" i]')
      .first();
    if (await more.isVisible().catch(() => false)) {
      await more.click({ force: true });
      await page.waitForTimeout(250);
      await page.keyboard.press("Escape").catch(() => {});
    }

    // Probe call buttons if visible and then escape any modal.
    const callBtn = page
      .locator('button[aria-label*="call" i], button[aria-label*="video" i], button:has-text("Call")')
      .first();
    if (await callBtn.isVisible().catch(() => false)) {
      await callBtn.click({ force: true });
      await page.waitForTimeout(300);
      await page.keyboard.press("Escape").catch(() => {});
    }

    // Non-mutating gift workflow probe: open, confirm UI appears, but do not send or checkout.
    const giftButton = page.getByRole("button", { name: /send a gift/i }).first();
    if (await giftButton.isVisible().catch(() => false)) {
      await giftButton.click({ force: true });
      const giftDialog = page.getByRole("dialog", { name: /gift premium/i });
      await expect(giftDialog).toBeVisible();

      await giftDialog.getByRole("button", { name: /with 1000 coins/i }).click({ force: true });
      await expect(giftDialog.getByText("Send Premium Gift")).toBeVisible();

      await giftDialog.getByRole("button", { name: /all gifts/i }).click({ force: true });
      await expect(giftDialog.getByRole("button", { name: /popular/i })).toBeVisible();
      await expect(giftDialog.getByText(/Lucky Cat|Cute Panda|Baby Dragon/i).first()).toBeVisible();

      await page.keyboard.press("Escape").catch(() => {});
    }

    await expect(page.locator("body")).toBeVisible();
  });
});
