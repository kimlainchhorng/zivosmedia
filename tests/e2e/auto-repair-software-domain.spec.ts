import { chromium, expect, test } from "@playwright/test";

const STORE_ID = "a914b90d-c249-4794-ba5e-3fdac0deed44";
const host = "zivosoftware.com";
const expectedConsoleNoise = [
  "Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY",
  "Invalid API key",
  "Failed to load resource: the server responded with a status of 401",
  "No 'Access-Control-Allow-Origin' header is present",
  "The 'Access-Control-Allow-Origin' header has a value 'https://zivosoftware.com' that is not equal to the supplied origin",
  "Failed to load resource: net::ERR_FAILED",
  "[remoteConfig] fetch failed",
];

test("zivosoftware.com opens the business software login flow", async () => {
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
      if (message.type() !== "error") return;
      const text = message.text();
      if (expectedConsoleNoise.some((expected) => text.includes(expected))) return;
      consoleErrors.push(text);
    });

    await page.goto(`http://${host}:${port}/`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`^http://${host}:${port}/business`));
    await expect(page.getByRole("heading", { name: "ZIVO Software for local businesses" })).toBeVisible();
    await expect(page.locator("header").getByRole("link", { name: "Log in" })).toBeVisible();
    await expect(page.locator("header").getByRole("link", { name: "Sign up" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Service desk" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sales counter" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Service bay" })).toBeVisible();
    await expect(page.getByText("Home", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Reels", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Chat", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Profile", { exact: true })).toHaveCount(0);

    await page.goto(`http://${host}:${port}/chat`, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(new RegExp(`^http://${host}:${port}/business`));

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
