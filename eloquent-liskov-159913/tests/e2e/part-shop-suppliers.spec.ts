import { test, expect, Page } from "@playwright/test";

const EMAIL = "kimlain@hizivo.com";
const PASSWORD = "Chhorng@1903";
// "AB Complete Car Care" — the only auto-repair store
const STORE_ID = "a914b90d-c249-4794-ba5e-3fdac0deed44";

// ─── helpers ────────────────────────────────────────────────────────────────

async function login(page: Page) {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        "zivo_cookie_consent",
        JSON.stringify({ necessary: true, functional: true, analytics: false, marketing: false, personalization: false, updatedAt: new Date().toISOString() }),
      );
    } catch {}
  });
  await page.goto("/login");
  await page.waitForLoadState("domcontentloaded");
  if (!page.url().includes("/login")) return;
  await page.locator("#login-email").fill(EMAIL);
  await page.locator("#login-password").fill(PASSWORD);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(url => !url.pathname.includes("/login"), { timeout: 25_000 });
}

async function goToPartShop(page: Page) {
  await page.goto(`/admin/stores/${STORE_ID}`);
  await page.waitForLoadState("domcontentloaded");
  // Click the "Part Shop" sidebar button to activate the ar-parts tab
  const partShopBtn = page.getByRole("button", { name: "Part Shop" });
  await partShopBtn.waitFor({ timeout: 15_000 });
  await partShopBtn.click();
  // Wait for the SuppliersNetworkCard to render
  await page.getByText("Parts Suppliers").first().waitFor({ timeout: 20_000 });
}

/** The Retail Chain filter is a small chip button inside the suppliers card. */
function supplierFilterBtn(page: Page, name: string) {
  // The filter chips are h-7 buttons with text-xs inside the suppliers card
  return page
    .locator('.space-y-3 button.h-7, .space-y-3 button[class*="shrink-0"]')
    .filter({ hasText: new RegExp(`^${name}$`) })
    .first();
}

// ─── tests ──────────────────────────────────────────────────────────────────

test.describe("Parts Suppliers — AutoZonePro connect flow", () => {
  // Each test needs login + navigation — give plenty of room
  test.setTimeout(90_000);

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // ── 1. section renders ────────────────────────────────────────────────────
  test("Parts Suppliers section renders with AutoZonePro visible", async ({ page }) => {
    await goToPartShop(page);

    // Supplier count badge (PARTS_SUPPLIERS.length = 30)
    const badge = page.locator("span, div")
      .filter({ hasText: /^\d+$/ })
      .filter({ hasText: /^(28|29|30|31|32)$/ })
      .first();
    await expect(badge).toBeVisible({ timeout: 5_000 });

    await expect(page.getByText("AutoZonePro")).toBeVisible();
    await expect(page.getByText("RockAuto")).toBeVisible();
  });

  // ── 2. clicking supplier card opens the modal ─────────────────────────────
  test("AutoZonePro: clicking the card opens the SupplierBrowserModal", async ({ page }) => {
    await goToPartShop(page);

    // The supplier cards are <button> elements inside the suppliers grid
    const azBtn = page.locator("button").filter({ hasText: "AutoZonePro" }).first();
    await expect(azBtn).toBeVisible({ timeout: 8_000 });
    await azBtn.click();

    // Dialog should open — wait for the modal dialog container
    await expect(page.locator('[role="dialog"]').first()).toBeVisible({ timeout: 8_000 });
  });

  // ── 3. credential panel: save + localStorage ──────────────────────────────
  test("Saving credentials writes to localStorage key", async ({ page }) => {
    await goToPartShop(page);

    // Clear any existing credential
    await page.evaluate((sid) => {
      localStorage.removeItem(`zivo.supplierCreds.${sid}.autozone`);
    }, STORE_ID);

    // Open AutoZonePro modal
    const azBtn = page.locator("button").filter({ hasText: "AutoZonePro" }).first();
    await azBtn.click();
    const dialog = page.locator('[role="dialog"]').first();
    await dialog.waitFor({ state: "visible", timeout: 8_000 });

    // In proxy-fail mode (test env), the credentialLauncher view is always shown.
    // The credential form is immediately visible — no "Account" toggle needed.
    const emailInput = dialog.locator('input[type="email"]');
    await emailInput.waitFor({ timeout: 8_000 });
    await emailInput.fill("Kimlain");
    await dialog.locator('input[type="password"]').fill("Chhorng@1903");

    // Save
    await dialog.getByRole("button", { name: /save account/i }).click();
    await expect(page.getByText(/account saved/i)).toBeVisible({ timeout: 6_000 });

    // Verify localStorage
    const cred = await page.evaluate((sid) => {
      const raw = localStorage.getItem(`zivo.supplierCreds.${sid}.autozone`);
      return raw ? JSON.parse(raw) : null;
    }, STORE_ID);
    expect(cred).not.toBeNull();
    expect(cred.email).toBe("Kimlain");
  });

  // ── 4. "Account saved" badge appears after cred is stored ─────────────────
  test("Saved account shows 'Account saved' in supplier card", async ({ page }) => {
    await goToPartShop(page);

    // Seed credential into localStorage
    await page.evaluate((sid) => {
      localStorage.setItem(
        `zivo.supplierCreds.${sid}.autozone`,
        JSON.stringify({ email: "Kimlain", password: "Chhorng@1903", updatedAt: new Date().toISOString() })
      );
    }, STORE_ID);

    // Navigate back to Part Shop to pick up the saved state
    await goToPartShop(page);

    // The saved card should show "Account saved"
    await expect(page.getByText("Account saved").first()).toBeVisible({ timeout: 5_000 });
  });

  // ── 5. category filter ────────────────────────────────────────────────────
  test("Category filter 'Retail Chain' shows AutoZonePro, hides Toyota TIS", async ({ page }) => {
    await goToPartShop(page);

    // The filter chips are inside the suppliers card — use exact text + size hint
    const retailChainBtn = page.locator("button.h-7, button.shrink-0")
      .filter({ hasText: /^Retail Chain$/ })
      .first();
    await retailChainBtn.click();

    await expect(page.getByText("AutoZonePro")).toBeVisible();
    await expect(page.getByText("Toyota TIS")).not.toBeVisible();
  });

  // ── 6. search filter ──────────────────────────────────────────────────────
  test("Search 'autozone' shows AutoZonePro, hides RockAuto", async ({ page }) => {
    await goToPartShop(page);

    await page.getByPlaceholder(/search suppliers/i).fill("autozone");
    await expect(page.getByText("AutoZonePro")).toBeVisible();
    await expect(page.getByText("RockAuto")).not.toBeVisible();
  });
});
