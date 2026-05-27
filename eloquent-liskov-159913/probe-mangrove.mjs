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
// Dismiss any sign-in / cookie popups
try { await page.click('button[aria-label*="Dismiss" i]', { timeout: 2000 }); } catch {}
try { await page.click('#onetrust-accept-btn-handler', { timeout: 2000 }); } catch {}
try { await page.click('button:has-text("Accept")', { timeout: 2000 }); } catch {}

await page.waitForTimeout(3000);

// Auto-scroll to load lazy content
for (let i = 0; i < 8; i++) {
  await page.evaluate(() => window.scrollBy(0, 1500));
  await page.waitForTimeout(700);
}
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(1500);

const html = await page.content();
writeFileSync("/tmp/mangrove/full.html", html);
console.log("HTML size:", html.length);

// Extract structured data via DOM eval
const data = await page.evaluate(() => {
  const text = (sel) => document.querySelector(sel)?.textContent?.trim() ?? null;

  // All image URLs found on page
  const imgs = Array.from(document.querySelectorAll("img"))
    .map((i) => i.getAttribute("src") || i.getAttribute("data-src") || "")
    .filter(Boolean);
  const bgImgs = Array.from(document.querySelectorAll("[style*='background']"))
    .map((el) => {
      const m = el.getAttribute("style")?.match(/url\(([^)]+)\)/);
      return m ? m[1].replace(/['"]/g, "") : "";
    })
    .filter(Boolean);

  // JSON-LD blocks
  const jsonld = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    .map((s) => s.textContent || "");

  // Property name & description
  const name = text("h2.pp-header__title") || text("h2[class*='pp-header']") || text("h1");
  const desc = text("p[data-testid='property-description']") ||
               text("#summary") ||
               text(".hp_desc_main_content") ||
               document.querySelector("meta[name='description']")?.getAttribute("content");
  const address = text("[data-testid='address']") || text(".hp_address_subtitle");
  const reviewScore = text("[data-testid='review-score']") || text(".review-score-widget__score");

  // Room rows in the room table
  const roomNames = Array.from(document.querySelectorAll(".hprt-roomtype-link, .hprt-roomtype-icon-link, [data-testid='room-name']"))
    .map((n) => n.textContent?.trim()).filter(Boolean);

  // Prices
  const prices = Array.from(document.querySelectorAll(".prco-valign-middle-helper, [data-testid='price-and-discounted-price'], .bui-price-display__value, [data-testid='price-info']"))
    .map((n) => n.textContent?.trim()).filter(Boolean);

  return { name, desc, address, reviewScore, roomNames, prices, imgs, bgImgs, jsonld };
});

writeFileSync("/tmp/mangrove/data.json", JSON.stringify(data, null, 2));
console.log("Saved data.json");
console.log("Name:", data.name);
console.log("Rooms:", data.roomNames.length);
console.log("Imgs:", data.imgs.length, "BG:", data.bgImgs.length);

await browser.close();
