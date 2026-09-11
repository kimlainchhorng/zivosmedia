import { expect, test } from "@playwright/test";

for (const language of ["en", "km"] as const) {
  test(`anonymous ${language} homepage stays within startup budgets`, async ({ page, context }, testInfo) => {
    await page.addInitScript(() => {
      const observer = new MutationObserver(() => {
        const hero = document.querySelector('img[src="/images/cambodia-home.jpg"]');
        if (hero) { (window as unknown as { initialHero: Element }).initialHero = hero; observer.disconnect(); }
      });
      observer.observe(document, { childList: true, subtree: true });
    });
    const network = await context.newCDPSession(page);
    await network.send("Network.enable");
    await network.send("Network.setCacheDisabled", { cacheDisabled: true });
    let requests = 0;
    let transferredBytes = 0;
    const prohibited: string[] = [];
    const errors: string[] = [];
    network.on("Network.requestWillBeSent", ({ request }) => {
      if (!/^https?:/.test(request.url)) return;
      requests++;
      const url = new URL(request.url);
      if (url.hostname.endsWith(".invalid") || /\/(?:App-|vendor-(?:pdf|charts)-)/.test(url.pathname)) {
        prohibited.push(url.pathname);
      }
    });
    // CDP counts actual encoded transfers, including HTML and cross-origin fonts.
    network.on("Network.loadingFinished", ({ encodedDataLength }) => { transferredBytes += encodedDataLength; });
    page.on("pageerror", error => errors.push(error.name));
    page.on("console", message => { if (/hydration|Minified React error #(?:418|423|425)/i.test(message.text())) errors.push('hydration'); });
    await page.goto(`/?lang=${language}`, { waitUntil: "networkidle" });
    await expect(page.locator("h1")).toHaveText(language === "km" ? "កម្មវិធីតែមួយសម្រាប់កម្ពុជា" : "One app for Cambodia");
    await expect(page.locator("html")).toHaveAttribute("lang", language);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", "https://zivosmedia.com/");
    // Include delayed startup requests; this budget is not an LCP benchmark.
    await page.waitForTimeout(3_000);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    if (language === "km") {
      expect(await page.evaluate(async () => {
        await document.fonts.ready;
        return [...document.fonts].some(face => face.family.replaceAll('"', '') === 'Noto Sans Khmer' && face.status === 'loaded');
      }), "Khmer webfont must load successfully").toBe(true);
    }
    expect(await page.evaluate(() => (window as unknown as { initialHero: Element }).initialHero === document.querySelector('img[src="/images/cambodia-home.jpg"]')), "Hydration must retain the server-painted hero").toBe(true);
    expect(errors).toEqual([]);
    expect(prohibited, "Full app, optional vendors and placeholder endpoints must stay off the anonymous root").toEqual([]);
    console.log(JSON.stringify({ viewport: testInfo.project.name, language, requests, transferredBytes }));
    expect(requests, "Homepage startup request budget").toBeLessThanOrEqual(45);
    expect(transferredBytes, "Homepage encoded transfer budget, including HTML").toBeLessThan(450_000);
    await network.detach();
  });
}

test("language toggle and hotel tile enter the full router", async ({ page }) => {
  await page.goto("/?lang=km");
  await page.getByRole("link", { name: "English", exact: true }).click();
  await expect(page.locator("h1")).toHaveText("One app for Cambodia");
  await page.getByRole("link", { name: "Book hotels", exact: false }).click();
  await expect(page).toHaveURL(/\/hotels\?lang=en$/);
  await expect(page.locator("h1")).toHaveText("Hotels & Resorts", { timeout: 30_000 });
});

test('loads dialog styles on interaction and saves an essential-only cookie choice', async ({ page }) => {
  await page.goto('/?lang=en', { waitUntil: 'networkidle' });
  const sheet = page.locator('link[data-zivo-deferred-style]');
  await expect(sheet).not.toHaveAttribute('href');
  expect(await page.evaluate(() => localStorage.getItem('zivo_cookie_consent'))).toBeNull();
  await page.locator('h1').click();
  await expect(page.getByRole('region', { name: 'Cookie consent', exact: true })).toBeVisible();
  await expect(sheet).toHaveAttribute('media', 'all');
  await page.getByRole('button', { name: 'Reject All', exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('zivo_cookie_consent') || '{}'))).toMatchObject({ essential: true, analytics: false, marketing: false });
});

test('installed web shells load the full app stylesheet before leaving the public entry', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'standalone', { value: true }));
  await page.goto('/?lang=en');
  const sheet = page.locator('link[data-zivo-deferred-style]');
  await expect(sheet).toHaveAttribute('href', /\/assets\/index-.*\.css$/, { timeout: 30_000 });
  await expect(sheet).toHaveAttribute('media', 'all');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--background').trim())).not.toBe('');
});
