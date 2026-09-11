import { expect, test, type Page } from "@playwright/test";

/**
 * "Search Flights" is deliberately never disabled, so submitting an empty form
 * has to answer honestly: stay on the page, mark the invalid fields, name what
 * is missing, and put the caret on the first thing to fix. The focus step
 * regressed silently once already — `data-flight-field` marks the field
 * *wrapper*, and `.focus()` on a bare `div` leaves the caret on `<body>`.
 */

const searchButton = (page: Page) =>
  page.getByRole("button", { name: /search flights|ស្វែងរកជើងហោះហើរ/i }).first();

async function openFlights(page: Page, language: "en" | "km") {
  await page.addInitScript((code) => {
    try { window.localStorage.setItem("zivo_lang", code as string); } catch { /* language still defaults */ }
  }, language);
  await page.goto("/flights");
  await page.waitForLoadState("domcontentloaded");
  await expect(searchButton(page)).toBeVisible({ timeout: 30_000 });
}

test.describe("flights search submit feedback", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("keeps the empty form on the page and marks the invalid fields", async ({ page }) => {
    await openFlights(page, "en");
    await searchButton(page).click();
    await expect(page).toHaveURL(/\/flights\/?$/);
    await expect(page.locator('[aria-invalid="true"]')).toHaveCount(2);
  });

  test("moves focus to the first invalid field", async ({ page }) => {
    await openFlights(page, "en");
    await searchButton(page).click();
    // Not <body>: an unfocusable wrapper strands keyboard users at the top of
    // the form with an error they were never sent to.
    const focused = await page.evaluate(() => ({
      tag: document.activeElement?.tagName ?? null,
      invalid: document.activeElement?.getAttribute("aria-invalid"),
    }));
    expect(focused.tag).toBe("INPUT");
    expect(focused.invalid).toBe("true");
  });

  test("names what is missing, in the reader's language", async ({ page }) => {
    await openFlights(page, "en");
    await searchButton(page).click();
    await expect(page.getByText(/choose a departure city/i).first()).toBeVisible();

    await openFlights(page, "km");
    await searchButton(page).click();
    await expect(page.getByText("ជ្រើសរើសទីក្រុងចេញដំណើរ").first()).toBeVisible();
  });
});
