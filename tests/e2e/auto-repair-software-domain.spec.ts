import { chromium, expect, test } from "@playwright/test";

const STORE_ID = "a914b90d-c249-4794-ba5e-3fdac0deed44";
const host = "zivosoftware.com";

test("zivosoftware.com opens the auto repair dashboard login flow", async () => {
  const port = process.env.PLAYWRIGHT_PORT || "8080";
  const browser = await chromium.launch({
    args: [
      `--host-resolver-rules=MAP ${host} 127.0.0.1,MAP www.${host} 127.0.0.1`,
    ],
  });

  try {
    const page = await browser.newPage();
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto(`http://${host}:${port}/`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(
      new RegExp(
        `^http://${host}:${port}/login\\?redirect=.*admin%2Fstores%2F${STORE_ID}.*tab%3Dar-dashboard.*category%3Dauto-repair`,
      ),
    );
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();

    await page.goto(`http://${host}:${port}/admin/stores/${STORE_ID}?tab=ar-dashboard`, {
      waitUntil: "domcontentloaded",
    });
    await expect(page).toHaveURL(
      new RegExp(`^http://${host}:${port}/login\\?redirect=.*admin%2Fstores%2F${STORE_ID}.*tab%3Dar-dashboard`),
    );
    await expect(page.getByRole("button", { name: "Log in" })).toBeVisible();
    expect(consoleErrors).toEqual([]);
  } finally {
    await browser.close();
  }
});
