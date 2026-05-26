import { chromium } from "playwright";
import { writeFileSync, readFileSync } from "node:fs";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  locale: "en-US",
  viewport: { width: 1440, height: 2400 },
});
const page = await ctx.newPage();

const URL = "https://www.booking.com/hotel/kh/mangrove-bungalow.en-us.html?checkin=2026-06-13&checkout=2026-06-15&no_rooms=1&group_adults=2&selected_currency=USD";
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
try { await page.click('button[aria-label*="Dismiss" i]', { timeout: 2000 }); } catch {}

// Click the cover photo to open the gallery
const triggers = [
  '[data-testid="property-gallery"] img',
  'a.bh-photo-grid-item',
  '#photo_wrapper',
  '.bh-photo-grid-photos',
  '[data-component-name="hotel/main-photo"]',
];
for (const sel of triggers) {
  try {
    await page.click(sel, { timeout: 1500 });
    console.log("clicked", sel);
    break;
  } catch {}
}
await page.waitForTimeout(2500);

// Page down many times to load lazy gallery thumbnails
for (let i = 0; i < 30; i++) {
  await page.keyboard.press("PageDown");
  await page.waitForTimeout(200);
}

// Collect all room/photo data
const data = await page.evaluate(() => {
  const out = new Set();
  for (const i of document.querySelectorAll("img")) {
    const s = i.src || i.getAttribute("data-src") || "";
    if (/bstatic\.com\/xdata\/images\/hotel/.test(s)) out.add(s);
  }
  // Per-thumbnail caption pairs: aria-label or alt
  const labelled = [];
  for (const i of document.querySelectorAll("img")) {
    const s = i.src || i.getAttribute("data-src") || "";
    if (!/bstatic\.com\/xdata\/images\/hotel/.test(s)) continue;
    labelled.push({ src: s, alt: i.alt || "", title: i.title || "", aria: i.getAttribute("aria-label") || "" });
  }
  return { imgs: [...out], labelled };
});

console.log("Imgs found in gallery:", data.imgs.length);
writeFileSync("/tmp/mangrove/gallery.json", JSON.stringify(data, null, 2));

await browser.close();
