import assert from "node:assert/strict";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const artifacts = process.argv[2] ? resolve(process.argv[2]) : await mkdtemp(resolve(tmpdir(), "zivo-media-menus-ui-"));
await mkdir(artifacts, { recursive: true });
const endpoint = "https://catalog.example.test/restaurants";
const server = await createServer({
  root,
  configFile: false,
  cacheDir: resolve(artifacts, "vite-cache"),
  optimizeDeps: { entries: [resolve(root, "scripts/fixtures/zivo-business-restaurant-catalog.html")] },
  plugins: [react()],
  resolve: { alias: { "@": resolve(root, "src") } },
  define: { "import.meta.env.VITE_ZIVO_BUSINESS_CATALOG_URL": JSON.stringify(endpoint) },
  server: { host: "127.0.0.1", port: 0, open: false },
});
let browser;
try {
  await server.listen();
  const address = server.httpServer.address();
  const base = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  let state = "ready";
  let catalogRequests = 0;
  const body = {
    merchants: [
      { id: "menu-only", kind: "restaurant", name_en: "Phkachan · long restaurant name", name_km: "ផ្កាចន្ទន៍ ភោជនីយដ្ឋានម្ហូបខ្មែរ", address: "Phnom Penh", address_km: "រាជធានីភ្នំពេញ", is_open: false, prep_minutes: 20, order_url: null, menu_url: "https://zivobusiness.com/order/restaurant/phkachan?view=menu" },
      { id: "ordering", kind: "restaurant", name_en: "Example restaurant", name_km: "ហាងម្ហូបគំរូ", is_open: true, prep_minutes: 18, order_url: "https://zivobusiness.com/order/restaurant/example", menu_url: "https://zivobusiness.com/order/restaurant/example?view=menu" },
    ],
    products: [{ id: "example-dish", merchant_id: "ordering", category: "restaurant" }],
  };
  await page.route(endpoint, (route) => {
    catalogRequests += 1;
    return route.fulfill(state === "failed" ? { status: 503, body: "Unavailable" }
      : state === "unconfigured" ? { status: 404, body: "Unavailable" }
        : state === "invalid" ? { status: 200, contentType: "application/json", body: "invalid" }
          : { status: 200, contentType: "application/json", body: JSON.stringify(state === "empty" ? { merchants: [], products: [] } : body) });
  });
  for (const { width, lang, theme } of [
    { width: 320, lang: "en", theme: "light" },
    { width: 390, lang: "km", theme: "light" },
    { width: 1024, lang: "km", theme: "dark" },
  ]) {
    await page.setViewportSize({ width, height: 860 });
    await page.goto(`${base}/scripts/fixtures/zivo-business-restaurant-catalog.html?lang=${lang}&theme=${theme}`);
    const menu = page.getByRole("link", { name: new RegExp(lang === "km" ? "មើលម៉ឺនុយ" : "View menu") });
    await menu.waitFor();
    assert.equal(await menu.count(), 1);
    const href = new URL(await menu.getAttribute("href"));
    assert.equal(href.searchParams.get("view"), "menu");
    assert.equal(href.searchParams.get("lang"), lang);
    assert.equal(href.searchParams.get("source"), "zivos");
    assert.ok(!(await menu.textContent()).match(/preparation|រៀបចំប្រហែល/));
    await page.getByRole("link", { name: new RegExp(lang === "km" ? "បើកម៉ឺនុយ និងកុម្ម៉ង់" : "Open menu & order") }).waitFor();
    const geometry = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert.ok(geometry.document <= geometry.viewport, `horizontal overflow at ${width}px`);
    // Media intentionally ships a light-only palette; a stored dark preference
    // must not introduce an independent theme in this shared component.
    assert.equal(await menu.evaluate((element) => getComputedStyle(element.closest("article")).backgroundColor), "rgb(255, 255, 255)");
    await menu.focus();
    assert.equal(await menu.evaluate((element) => document.activeElement === element), true);
    await page.screenshot({ path: resolve(artifacts, `menus-${lang}-${width}-${theme}.png`), fullPage: true });
  }
  await page.setViewportSize({ width: 390, height: 860 });
  for (const nextState of ["unconfigured", "empty", "invalid", "failed"]) {
    state = nextState;
    const before = catalogRequests;
    await page.goto(`${base}/scripts/fixtures/zivo-business-restaurant-catalog.html?lang=en`);
    const expected = state === "unconfigured" ? "Restaurant menus are not connected here yet" : state === "empty" ? "No restaurant menus have been shared yet" : "Restaurant menus could not be loaded";
    await page.getByText(expected, { exact: true }).waitFor();
    assert.equal(catalogRequests - before, state === "failed" ? 2 : 1);
    assert.equal(await page.getByRole("button", { name: "Try again", exact: true }).count(), state === "failed" ? 1 : 0);
    if (state === "failed") {
      state = "ready";
      await page.getByRole("button", { name: "Try again", exact: true }).click();
      await page.getByRole("link", { name: /View menu/ }).waitFor();
    }
  }
  assert.deepEqual(pageErrors, []);
  console.log(`Restaurant catalog browser checks passed: EN/Km, 320/390/1024px, existing light-only palette, menu/order separation, configuration/empty/error states and retry. Artifacts: ${artifacts}`);
} finally {
  await browser?.close();
  await server.close();
}
