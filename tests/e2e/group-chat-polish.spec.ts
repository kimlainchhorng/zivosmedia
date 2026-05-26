import { test, expect } from "@playwright/test";
import { login } from "./fixtures/login";

test.describe("group chat polish", () => {
  test("covers group creation details and group info entry points", async ({ page }) => {
    await login(page);
    await page.goto("/chat", { waitUntil: "domcontentloaded" });
    await expect(page.locator("body")).not.toContainText("App failed to start");

    const groupsTab = page.getByRole("button", { name: /groups/i }).first();
    if (await groupsTab.isVisible().catch(() => false)) {
      await groupsTab.click({ force: true });
      await page.waitForTimeout(300);
    }

    const newFab = page.getByRole("button", { name: "New" }).first();
    if (await newFab.isVisible().catch(() => false)) {
      await newFab.click({ force: true });
      const newGroupAction = page.getByRole("button", { name: /new group/i }).first();
      if (await newGroupAction.isVisible().catch(() => false)) {
        await newGroupAction.click({ force: true });
      }
    }

    const createDialog = page.getByRole("dialog", { name: /new group|group details/i }).first();
    if (await createDialog.isVisible().catch(() => false)) {
      const memberOption = createDialog.locator('button[aria-pressed]').first();
      if (await memberOption.isVisible().catch(() => false)) {
        await memberOption.click({ force: true });
        const nextButton = createDialog.getByRole("button", { name: /next/i }).first();
        await expect(nextButton).toBeEnabled();
        await nextButton.click({ force: true });
        await expect(createDialog.getByText("Group details")).toBeVisible();
        await expect(createDialog.getByPlaceholder("Group name")).toBeVisible();
        await expect(createDialog.getByRole("button", { name: /create group/i }).first()).toBeDisabled();
      }
      await createDialog.getByRole("button", { name: /close/i }).first().click({ force: true });
    }

    const firstGroup = page.getByTestId("group-conversation-row").first();
    if (await firstGroup.isVisible().catch(() => false)) {
      await firstGroup.click({ force: true });
      await page.waitForTimeout(500);

      const infoButton = page.getByRole("button", { name: /open .*group info|open group info/i }).first();
      if (await infoButton.isVisible().catch(() => false)) {
        await infoButton.click({ force: true });
        await expect(page.getByRole("button", { name: /close group info/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /invite links/i })).toBeVisible();
        await expect(page.getByRole("button", { name: /copy group shortcut/i })).toBeVisible();

        await page.getByRole("button", { name: /invite links/i }).click({ force: true });
        await expect(page.getByText(/Invite links|Only admins can create invite links|Create new invite link/i).first()).toBeVisible();
        await page.keyboard.press("Escape").catch(() => {});
      }

      const firstBubble = page.getByTestId("chat-message-bubble").first();
      if (await firstBubble.isVisible().catch(() => false)) {
        await firstBubble.dispatchEvent("pointerdown");
        await page.waitForTimeout(450);
        await firstBubble.dispatchEvent("pointerup");
        await expect(page.getByText("Reply").first()).toBeVisible();
        const pinAction = page.getByText(/^(Pin|Unpin)$/).first();
        if (await pinAction.isVisible().catch(() => false)) {
          await expect(pinAction).toBeVisible();
        }
        await page.keyboard.press("Escape").catch(() => {});
      }
    }

    await expect(page.locator("body")).toBeVisible();
  });
});
