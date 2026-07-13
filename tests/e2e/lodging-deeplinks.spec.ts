import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";

const tabs = ["lodge-overview", "lodge-rate-plans", "lodge-addons", "lodge-guest-requests"];
const adminStoreSource = readFileSync("src/pages/admin/AdminStoreEditPage.tsx", "utf8");
const qaSource = readFileSync("src/lib/lodging/lodgingQa.ts", "utf8");

test.describe("lodging admin deep-link logic", () => {
  for (const tab of tabs) {
    test(`refresh target ${tab} has deterministic QA coverage`, async () => {
      expect(adminStoreSource).toContain(`data-testid="lodging-tab-${tab}"`);
      expect(qaSource).toContain(`"${tab}"`);
      expect(qaSource).toContain("Refresh deep link:");
      expect(qaSource).toContain("?tab=${tab}");
    });
  }

  test("authenticated preview renders critical deep links when E2E_STORE_ID is provided", async ({ page }) => {
    const storeId = process.env.E2E_LODGING_STORE_ID;
    test.skip(!storeId, "Set E2E_LODGING_STORE_ID with an authenticated storage state to run live route-render checks.");
    for (const tab of tabs) {
      await page.goto(`/admin/stores/${storeId}?tab=${tab}`);
      await page.reload({ waitUntil: "networkidle" });
      await expect(page.getByTestId(`lodging-tab-${tab}`)).toBeVisible();
      await expect(page.getByTestId(`lodging-tab-${tab}`)).not.toBeEmpty();
      await expect(page).toHaveURL(new RegExp(`tab=${tab}`));
    }
  });
});