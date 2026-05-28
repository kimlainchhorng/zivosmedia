import { test, expect } from "@playwright/test";
import { login } from "./fixtures/login";

test.describe("chat regressions", () => {
  test("chat options opens without a11y warning or channel fetch errors", async ({ page }) => {
    const consoleMessages: string[] = [];
    const failedResponses: Array<{ status: number; url: string; method: string }> = [];

    page.on("console", (msg) => {
      if (msg.type() === "warning" || msg.type() === "error") {
        consoleMessages.push(msg.text());
      }
    });

    page.on("response", (response) => {
      if (response.status() >= 400) {
        failedResponses.push({
          status: response.status(),
          url: response.url(),
          method: response.request().method(),
        });
      }
    });

    await login(page);
    await page.goto("/chat", { waitUntil: "domcontentloaded" });

    const acceptCookies = page.getByRole("button", { name: "Accept All" });
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click({ force: true });
    }

    const optionsButton = page.getByRole("button", { name: "Chat options" }).first();

    await expect(optionsButton).toBeVisible({ timeout: 15_000 });
    await optionsButton.click({ force: true });
    await page.waitForTimeout(1200);

    const dialogContentWarning = consoleMessages.filter((text) =>
      /Missing `Description` or `aria-describedby=\{undefined\}` for \{DialogContent\}/.test(text),
    );

    expect(
      dialogContentWarning,
      `Unexpected dialog accessibility warnings:\n${dialogContentWarning.join("\n")}`,
    ).toHaveLength(0);

    const blockedChannelQueries = failedResponses.filter((entry) =>
      /supabase\.co\/rest\/v1\/(channel_posts|channels)\b/i.test(entry.url),
    );

    expect(
      blockedChannelQueries,
      `Unexpected failed channel requests:\n${blockedChannelQueries
        .map((entry) => `${entry.status} ${entry.method} ${entry.url}`)
        .join("\n")}`,
    ).toEqual([]);
  });
});
