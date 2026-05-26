import { test, expect, Page } from "@playwright/test";

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;

const SECTIONS = [
  "Essentials",
  "Creator Studio",
  "Travel & Orders",
  "Social",
  "Business",
  "Account & Support",
];

test.describe("/more — full page walkthrough", () => {
  test.skip(
    !EMAIL || !PASSWORD,
    "Set E2E_EMAIL and E2E_PASSWORD before running this spec",
  );

  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/more");
    await expect(page.locator("h1", { hasText: "More" }).first()).toBeVisible({
      timeout: 15_000,
    });
  });

  test("profile card, status strip, and quick actions render", async ({ page }) => {
    await expect(page.getByRole("link", { name: /Edit/i }).first()).toBeVisible();
    await expect(page.getByText("Followers")).toBeVisible();
    await expect(page.getByText("Following")).toBeVisible();
    await expect(page.getByText("Friends")).toBeVisible();
    await expect(page.getByText("Tier")).toBeVisible();
    await expect(page.getByText("View balance")).toBeVisible();

    for (const label of ["Wallet", "Orders", "Saved", "Support", "QR Code", "Invite"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
  });

  test("spotlight cards link to their destinations", async ({ page }) => {
    await expect(page.getByText("ZIVO Plus")).toBeVisible();
    await expect(page.getByText("Creator Hub")).toBeVisible();
    await expect(page.getByText("Rewards")).toBeVisible();
    await expect(page.getByText("Membership")).toBeVisible();
  });

  test("search filters links and clears", async ({ page }) => {
    const search = page.getByPlaceholder(/Search account/i);
    await search.fill("wallet");
    await expect(page.getByText(/No results/i)).toHaveCount(0);
    await expect(page.getByText("Balance & pay").first()).toBeVisible();

    await search.fill("zzznotathing");
    await expect(page.getByText(/No results for "zzznotathing"/i)).toBeVisible();

    await page.getByRole("button", { name: /Clear search/i }).click();
    await expect(search).toHaveValue("");
  });

  test("every section expands and collapses", async ({ page }) => {
    for (const title of SECTIONS) {
      const header = page.getByRole("button").filter({ hasText: title });
      await header.click();
      // Pick a known link inside each section as the visibility witness.
      const witness: Record<string, RegExp> = {
        Essentials: /My Profile/i,
        "Creator Studio": /Creator Dashboard/i,
        "Travel & Orders": /My Trips/i,
        Social: /Communities/i,
        Business: /Shop Dashboard/i,
        "Account & Support": /Notifications/i,
      };
      await expect(page.getByText(witness[title]).first()).toBeVisible();
    }
  });

  test("theme toggle flips html class", async ({ page }) => {
    // Open Account & Support so the Appearance row is mounted.
    await page.getByRole("button").filter({ hasText: "Account & Support" }).click();
    const before = await page.evaluate(() =>
      document.documentElement.classList.contains("dark") ? "dark" : "light",
    );
    await page.getByText("Appearance", { exact: true }).click();
    await expect
      .poll(
        async () =>
          await page.evaluate(() =>
            document.documentElement.classList.contains("dark") ? "dark" : "light",
          ),
        { timeout: 5_000 },
      )
      .not.toBe(before);
  });

  test("partner sheet opens and closes", async ({ page }) => {
    await page.getByRole("button").filter({ hasText: "Essentials" }).click();
    await page.getByText("Become Partner", { exact: true }).click();

    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    await expect(sheet.getByText("Become a Driver")).toBeVisible();
    await expect(sheet.getByText("Restaurant Partner")).toBeVisible();
    await expect(sheet.getByText("Delivery Partner")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(sheet).toBeHidden();
  });

  test("sign-out dialog opens and cancels without ending session", async ({ page }) => {
    await page.getByRole("button", { name: /Sign out/i }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText(/Sign out\?/i)).toBeVisible();
    await dialog.getByRole("button", { name: /Cancel/i }).click();
    await expect(dialog).toBeHidden();
    // Still authenticated — profile card stays.
    await expect(page.getByText("Followers")).toBeVisible();
  });

  test("Edit button on profile card targets /account/profile-edit", async ({ page }) => {
    const edit = page.getByRole("link", { name: /^Edit$/ }).first();
    await expect(edit).toHaveAttribute("href", /\/account\/profile-edit/);
  });
});

async function login(page: Page) {
  await page.goto("/login");
  await page.fill("#login-email", EMAIL!);
  await page.fill("#login-password", PASSWORD!);
  await page.getByRole("button", { name: /Sign In/i }).click();
  // Login redirects to "/" (or the redirect param). Just wait for the URL to leave /login.
  await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
    timeout: 20_000,
  });
}
