import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const URL = "https://www.booking.com/hotel/kh/mangrove-bungalow.en-us.html?checkin=2026-06-13&checkout=2026-06-15&no_rooms=1&group_adults=2&selected_currency=USD";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  locale: "en-US",
  viewport: { width: 1440, height: 900 },
});
const page = await ctx.newPage();

console.log("Loading", URL);
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
try { await page.click('button[aria-label*="Dismiss" i]', { timeout: 2000 }); } catch {}
try { await page.click('#onetrust-accept-btn-handler', { timeout: 2000 }); } catch {}
await page.waitForTimeout(2000);

// Scroll to room table region
for (let i = 0; i < 10; i++) {
  await page.evaluate(() => window.scrollBy(0, 1200));
  await page.waitForTimeout(500);
}

// Try opening the "View all photos" gallery: click element with class="bh-photo-grid-thumb-cta" or "hide-name" or "bh-photo-grid"
const photoButton = await page.$('a[data-component="hotel/photo-grid"]') ||
                    await page.$('button:has-text("photos")') ||
                    await page.$('a:has-text("photos")');
console.log("Photo button found:", !!photoButton);

// Extract per-room photos: each room thumbnail row uses .hprt-roomtype-image
const roomThumbs = await page.evaluate(() => {
  // For each row .js-rt-block-row, find data-room-id and the data-thumb-image-id / img
  const rows = Array.from(document.querySelectorAll(".hprt-table-room-row, [class*='hprt']"));
  const out = [];
  for (const r of rows) {
    const rid = r.getAttribute("data-room-id");
    const name = r.querySelector(".hprt-roomtype-link, .hprt-roomtype-icon-link, [data-testid='room-name']")?.textContent?.trim();
    const imgs = Array.from(r.querySelectorAll("img")).map((i) => i.src || i.getAttribute("data-src"));
    if (rid || name) out.push({ rid, name, imgs });
  }
  return out;
});
console.log("Room rows in DOM:", roomThumbs.length);
writeFileSync("/tmp/mangrove/room_thumbs.json", JSON.stringify(roomThumbs, null, 2));

// Now click each photo thumbnail in main photo grid to load the full gallery
// Booking shows a thumbnail grid near top. We'll try the show-all-photos button.
try {
  const btn = await page.$('button[data-testid="property-most-popular-facilities-wrapper"]');
  console.log("popular:", !!btn);
} catch {}

// Look for "View all" link
const viewAll = await page.evaluate(() => {
  const btns = Array.from(document.querySelectorAll("a, button"));
  return btns.filter(b => /all.*photo|view.*photo|\d+.*photo|see.*photo/i.test(b.textContent || "")).map(b => b.textContent?.trim()).slice(0, 5);
});
console.log("View-all candidates:", viewAll);

try {
  await page.click('a[data-testid="property-gallery-thumbnail"]', { timeout: 3000 });
  await page.waitForTimeout(3000);
  console.log("Opened gallery via thumbnail");
} catch (e) {
  console.log("No gallery thumbnail link:", e.message);
}

// Try generic gallery selectors
try {
  await page.click('a[class*="gallery"]:visible', { timeout: 2000 });
} catch {}

await page.waitForTimeout(2000);

// Force-scroll the gallery if it opened
for (let i = 0; i < 12; i++) {
  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(400);
}

// Capture all bstatic image URLs at this point
const allImgs = await page.evaluate(() => {
  const out = new Set();
  for (const i of document.querySelectorAll("img")) {
    const s = i.src || i.getAttribute("data-src") || "";
    if (/bstatic\.com\/xdata\/images\/hotel/.test(s)) out.add(s);
  }
  return [...out];
});
console.log("Hotel images on page:", allImgs.length);
writeFileSync("/tmp/mangrove/all_imgs.json", JSON.stringify(allImgs, null, 2));

// Capture <script> JSON blobs containing room photos
const scripts = await page.evaluate(() => Array.from(document.scripts).map(s => s.textContent || ""));
let foundBlobs = 0;
const blobs = [];
for (const s of scripts) {
  if (s.includes("photos") && s.includes("b_roomtype") && s.length < 1_500_000) {
    blobs.push(s);
    foundBlobs++;
  }
}
console.log("Photo script blobs:", foundBlobs);
if (blobs.length) writeFileSync("/tmp/mangrove/photo_blobs.txt", blobs.join("\n\n===NEXT===\n\n"));

await browser.close();
