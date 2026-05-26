import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("/tmp/mangrove/full.html", "utf8");

// --- 1. Photos from bstatic CDN, dedup, normalize to max1024 ---
const imgRegex = /https:\/\/(?:cf|q)\.bstatic\.com\/xdata\/images\/hotel\/[\w]+\/(\d+)\.jpg\?k=[a-f0-9]+/g;
const imgMap = new Map();
for (const m of html.matchAll(imgRegex)) {
  const id = m[1];
  const url = m[0].replace(/\/(max\d+x?\d*|square\d+)\//, "/max1024x768/");
  if (!imgMap.has(id)) imgMap.set(id, url);
}
const allPhotos = [...imgMap.values()];

// --- 2. Property description (og:description) ---
const ogDesc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/)?.[1];

// --- 3. Address ---
const address = html.match(/<p[^>]+data-source="hotel_header"[^>]*>([^<]+)<\/p>/)?.[1]?.trim() ||
                html.match(/"address":\s*"([^"]+)"/)?.[1];

// --- 4. Review score ---
const reviewScore = html.match(/"reviewScore":\s*([\d.]+)/)?.[1] ||
                    html.match(/data-testid="review-score"[^>]*>\s*([\d.]+)/)?.[1];
const reviewCount = html.match(/"reviewCount":\s*(\d+)/)?.[1];

// --- 5. Per-room data from hprt-table rows ---
// Booking renders rooms via repeated <tr> blocks with class hprt-table-cheapest-block etc.
// Parse plainly with regex on the rendered HTML.

// Find all room blocks
const roomBlocks = [];
const roomBlockRegex = /<tr[^>]*class="[^"]*hprt-table-room-row[^"]*"[^>]*>([\s\S]*?)<\/tr>/g;
const blocks = [...html.matchAll(roomBlockRegex)];

// Fallback: search for room-table sections by data attributes
const roomNameRegex = /<a[^>]*class="[^"]*hprt-roomtype-link[^"]*"[^>]*>([^<]+)<\/a>/g;
const roomNames = [...new Set([...html.matchAll(roomNameRegex)].map((m) => m[1].trim()))];

// Pull all "price after discount" + "price before discount" pairs near each room
// Booking uses .bui-price-display__original (strikethrough) and .prco-valign-middle-helper (final)
const priceBlockRegex = /<div[^>]*class="[^"]*bui-price-display__original[^"]*"[^>]*>\s*\$?([\d,]+)[\s\S]{0,200}?<span[^>]*class="[^"]*prco-valign-middle-helper[^"]*"[^>]*>\s*\$?([\d,]+)/g;
const priceBlocks = [...html.matchAll(priceBlockRegex)].map((m) => ({
  original: parseInt(m[1].replace(/,/g, ""), 10),
  final: parseInt(m[2].replace(/,/g, ""), 10),
}));

// Per-room max occupancy (from room-occ class)
const occRegex = /<span[^>]*class="[^"]*bk-icon-wrapper[^"]*c2-occupancy[^"]*"[\s\S]{0,500}?max occupancy[^<]*<\/span>\s*<span[^>]*>\s*(\d+)/gi;
const occs = [...html.matchAll(occRegex)].map((m) => parseInt(m[1], 10));

// "x% off" badges
const discountRegex = /(\d{1,2})%\s*off/gi;
const discounts = [...new Set([...html.matchAll(discountRegex)].map((m) => parseInt(m[1], 10)))];

// Genius/discount labels
const labels = [...new Set([
  ...[...html.matchAll(/data-testid="[^"]*discount-label[^"]*"[^>]*>([^<]+)</gi)].map((m) => m[1].trim()),
  ...[...html.matchAll(/class="[^"]*bui-badge[^"]*"[^>]*>([^<]+)</gi)].map((m) => m[1].trim()),
])].filter((l) => l.length < 80);

// All visible USD prices in order
const priceRegex = /\$([\d,]+)(?:\.\d{2})?/g;
const allPrices = [...html.matchAll(priceRegex)].map((m) => parseInt(m[1].replace(/,/g, ""), 10)).filter((n) => n >= 20 && n <= 2000);

// --- 6. Room cards from the new design (data-testid=room-name) ---
// Booking sometimes uses <h3 data-testid="room-name">…</h3>
const roomCardNames = [...html.matchAll(/data-testid="room-name"[^>]*>([^<]+)</g)].map((m) => m[1].trim());

// --- 7. Per-room min price from window.booking object ---
const bookingPriceJson = html.match(/"prices":\s*(\{[\s\S]{0,5000}?\})\s*,\s*"/);

const out = {
  name: "Mangrove Beach Bungalows",
  description: ogDesc,
  address,
  reviewScore,
  reviewCount,
  roomNames,
  roomCardNames,
  priceBlocks,
  discounts,
  labels,
  occupancies: occs,
  totalPhotos: allPhotos.length,
  photos: allPhotos,
  allPricesSorted: [...new Set(allPrices)].sort((a, b) => a - b),
};

writeFileSync("/tmp/mangrove/parsed.json", JSON.stringify(out, null, 2));
console.log("=== Parsed ===");
console.log("Name:", out.name);
console.log("Description:", out.description?.slice(0, 200));
console.log("Address:", out.address);
console.log("Score:", out.reviewScore, "(", out.reviewCount, "reviews)");
console.log("Rooms:", out.roomNames);
console.log("Discounts %:", out.discounts);
console.log("Labels:", out.labels.slice(0, 15));
console.log("Photos:", out.totalPhotos);
console.log("Sample price blocks:", out.priceBlocks.slice(0, 10));
console.log("All prices:", out.allPricesSorted.slice(0, 25));
