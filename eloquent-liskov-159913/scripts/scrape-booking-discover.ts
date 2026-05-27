/**
 * Booking.com → ZIVO Hotel Discovery Scraper
 *
 * Searches Booking.com for Cambodian hotels that are NOT yet in the database,
 * then inserts them as new store_profiles + lodge_property_profile + lodge_rooms.
 *
 * Usage:
 *   SUPABASE_URL=https://slirphzzwcogdbkeicff.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *     node --experimental-strip-types --no-warnings scripts/scrape-booking-discover.ts [options]
 *
 * Options:
 *   --city=NAME    Only search a specific city
 *   --limit=N      Max new hotels to add
 *   --dry-run      Scrape but don't write to database
 *   --log=PATH     JSON results log path
 */

import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import type { Page, BrowserContext } from "@playwright/test";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const args    = process.argv.slice(2);
const getStr  = (k: string, d: string | null = null) => { const f = args.find(a => a.startsWith(`--${k}=`)); return f ? f.split("=").slice(1).join("=") : d; };
const getInt  = (k: string, d: number | null = null) => { const f = args.find(a => a.startsWith(`--${k}=`)); return f ? parseInt(f.split("=")[1]) : d; };

const DRY_RUN    = args.includes("--dry-run");
const CITY_FILTER = getStr("city");
const LIMIT      = getInt("limit");
const LOG_PATH   = getStr("log", `booking-discover-${new Date().toISOString().slice(0,10)}.json`);

const CHECKIN  = "2026-05-22";
const CHECKOUT = "2026-05-23";

// Cambodian cities to search with their Booking.com dest_id and coordinates
const CAMBODIA_CITIES = [
  { name: "Phnom Penh",     dest: "Phnom+Penh%2C+Cambodia",    lat: 11.5564,  lng: 104.9282 },
  { name: "Siem Reap",      dest: "Siem+Reap%2C+Cambodia",     lat: 13.3671,  lng: 103.8448 },
  { name: "Sihanoukville",  dest: "Sihanoukville%2C+Cambodia", lat: 10.6250,  lng: 103.5220 },
  { name: "Kampot",         dest: "Kampot%2C+Cambodia",        lat: 10.5966,  lng: 104.1686 },
  { name: "Kep",            dest: "Kep%2C+Cambodia",           lat: 10.4830,  lng: 104.3162 },
  { name: "Battambang",     dest: "Battambang%2C+Cambodia",    lat: 13.0957,  lng: 103.2022 },
  { name: "Kratie",         dest: "Kratie%2C+Cambodia",        lat: 12.4881,  lng: 106.0188 },
  { name: "Mondulkiri",     dest: "Mondulkiri%2C+Cambodia",    lat: 12.4543,  lng: 107.1887 },
  { name: "Koh Kong",       dest: "Koh+Kong%2C+Cambodia",      lat: 11.6166,  lng: 102.9836 },
  { name: "Takeo",          dest: "Takeo%2C+Cambodia",         lat: 10.9905,  lng: 104.7850 },
  { name: "Pursat",         dest: "Pursat%2C+Cambodia",        lat: 12.5388,  lng: 103.9192 },
  { name: "Preah Sihanouk", dest: "Preah+Sihanouk%2C+Cambodia",lat: 10.6250,  lng: 103.5220 },
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const SEARCH_DELAY = 2_500;
const PAGE_DELAY   = 3_500;

function toSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[&]/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function isBstatic(url: string) {
  return url.includes("bstatic.com") || url.includes("cf.bstatic.com");
}

function maxRes(url: string): string {
  return url.replace(/\/square\d+|\/max\d+|\/\d+x\d+/g, "/max1280x900");
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr));
}

async function dismissOverlays(page: Page) {
  for (const sel of [
    "button#onetrust-accept-btn-handler",
    'button[data-gdpr-consent="accept"]',
  ]) {
    try { await page.click(sel, { timeout: 1_500 }); await sleep(500); break; } catch {}
  }
  for (const sel of ['[aria-label="Dismiss sign-in info."]', ".bui-button--secondary"]) {
    try { await page.click(sel, { timeout: 1_000 }); break; } catch {}
  }
  await page.keyboard.press("Escape").catch(() => {});
}

async function collectPagePhotos(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const urls: string[] = [];
    const seen = new Set<string>();
    const add = (src: string) => {
      if (!src || !src.includes("bstatic.com")) return;
      const clean = src.split("?")[0];
      if (!seen.has(clean)) { seen.add(clean); urls.push(clean); }
    };
    document.querySelectorAll("img").forEach(img => {
      add(img.src);
      add(img.getAttribute("data-src") ?? "");
    });
    document.querySelectorAll("[data-src]").forEach(el => {
      add(el.getAttribute("data-src") ?? "");
    });
    return urls;
  });
}

// Search one city page and return hotel cards (name + url + rating + address)
async function searchCityPage(page: Page, city: typeof CAMBODIA_CITIES[0], offset: number): Promise<Array<{name: string, url: string, rating: number | null, address: string}>> {
  const url = `https://www.booking.com/searchresults.html?ss=${city.dest}&checkin=${CHECKIN}&checkout=${CHECKOUT}&lang=en-us&group_adults=2&no_rooms=1&dest_type=city&offset=${offset}&rows=25&order=popularity`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await sleep(SEARCH_DELAY);
    await dismissOverlays(page);

    return await page.evaluate(() => {
      const cards = document.querySelectorAll('[data-testid="property-card"]');
      return Array.from(cards).map(card => {
        const nameEl  = card.querySelector('[data-testid="title"]');
        const linkEl  = card.querySelector<HTMLAnchorElement>('a[data-testid="title-link"]');
        const ratingEl = card.querySelector('[data-testid="review-score"] .ac4a7896c7');
        const addrEl  = card.querySelector('[data-testid="address"]');
        const rating  = parseFloat(ratingEl?.textContent?.trim() ?? "") || null;
        return {
          name:    nameEl?.textContent?.trim() ?? "",
          url:     linkEl?.href ?? "",
          rating,
          address: addrEl?.textContent?.trim() ?? "",
        };
      }).filter(h => h.name && h.url);
    });
  } catch {
    return [];
  }
}

async function scrapeHotelFull(page: Page, hotelUrl: string, cityName: string): Promise<{
  description: string | null;
  phone: string | null;
  rating: number | null;
  checkIn: string | null;
  checkOut: string | null;
  lat: number | null;
  lng: number | null;
  address: string | null;
  photos: string[];
  rooms: Array<{
    name: string; beds: string; maxGuests: number; sizeSqm: number | null;
    priceUsd: number; originalPriceUsd: number | null; amenities: string[]; photos: string[];
  }>;
}> {
  await page.goto(hotelUrl, { waitUntil: "networkidle", timeout: 45_000 });
  await sleep(PAGE_DELAY);
  await dismissOverlays(page);

  // ── Hotel meta ──────────────────────────────────────────────────────────────
  const meta = await page.evaluate(() => {
    let description: string | null = null;
    for (const sel of ["[data-testid='property-description']", "#property_description_content", ".hp-description__text"]) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) { description = el.textContent.trim(); break; }
    }
    let checkIn: string | null = null, checkOut: string | null = null;
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      try {
        const d = JSON.parse(s.textContent ?? "");
        if (d.checkinTime)  checkIn  = d.checkinTime;
        if (d.checkoutTime) checkOut = d.checkoutTime;
      } catch {}
    });
    let lat: number | null = null, lng: number | null = null;
    const mapEl = document.querySelector<HTMLElement>('#map, [data-atlas-latlng], [data-coordinates]');
    if (mapEl) {
      const coords = mapEl.getAttribute("data-atlas-latlng") ?? mapEl.getAttribute("data-coordinates");
      if (coords) {
        const [a, b] = coords.split(",").map(Number);
        if (!isNaN(a) && !isNaN(b)) { lat = a; lng = b; }
      }
    }
    const ratingEl = document.querySelector('.js-score-badge .bui-review-score__badge, .b5cd09854e');
    const rating   = parseFloat(ratingEl?.textContent?.trim() ?? "") || null;
    const phoneEl  = document.querySelector('[data-testid="hotel-phone-number"], .hp_address_subtitle a[href^="tel:"]');
    const phone    = phoneEl?.getAttribute("href")?.replace("tel:", "") ?? null;
    const addrEl   = document.querySelector('[data-testid="hotel-address"], .hp_address_subtitle span');
    const address  = addrEl?.textContent?.trim() ?? null;
    return { description, checkIn, checkOut, lat, lng, rating, phone, address };
  });

  // ── Gallery photos ──────────────────────────────────────────────────────────
  let photos: string[] = await collectPagePhotos(page);

  // Try opening full gallery
  try {
    const galleryBtn = page.locator('[data-testid="property-gallery-trigger"], .bh-photo-grid-thumbs-more, .photos_gallery_header').first();
    await galleryBtn.click({ timeout: 3_000 });
    await sleep(2_000);
    for (let i = 0; i < 80; i++) {
      const batch = await collectPagePhotos(page);
      photos.push(...batch);
      photos = dedupe(photos);
      await page.keyboard.press("ArrowRight");
      await sleep(120);
      if (i > 10 && photos.length > 0 && photos.length === (await collectPagePhotos(page)).length) break;
    }
    await page.keyboard.press("Escape").catch(() => {});
    await sleep(600);
  } catch {}

  photos = dedupe(photos.map(maxRes)).filter(isBstatic);

  // ── Availability → room table ───────────────────────────────────────────────
  let hprtLoaded = !!await page.$("#hprt-table");
  if (!hprtLoaded) {
    try {
      const checkBtn = page.locator('button:has-text("Check availability"), input[value="Check availability"], .availability-search__search--button, #availability_search_submit').first();
      await checkBtn.scrollIntoViewIfNeeded({ timeout: 3_000 });
      await checkBtn.click({ timeout: 3_000 });
      await page.waitForSelector("#hprt-table, .hprt-table", { timeout: 12_000 });
      hprtLoaded = true;
    } catch {}
  }
  await sleep(1_000);

  const rawRooms = await page.evaluate(() => {
    const rooms: any[] = [];
    const seen = new Set<string>();
    const table = document.getElementById("hprt-table") ?? document.querySelector(".hprt-table");
    if (!table) return rooms;
    table.querySelectorAll<HTMLElement>("tr.hprt-table-block-click, tr[data-block-id], .js-hprt-room-block, .hprt-table-row").forEach(row => {
      const nameEl = row.querySelector(".hprt-roomtype-icon-link") ?? row.querySelector("[data-testid='room-name']") ?? row.querySelector(".room-link");
      const name = nameEl?.textContent?.trim();
      if (!name || seen.has(name)) return;
      seen.add(name);
      const priceEl = row.querySelector(".prco-valign-middle-helper strong") ?? row.querySelector(".bui-price-display__value");
      const priceUsd = parseFloat(priceEl?.textContent?.replace(/[^\d.]/g, "") ?? "0") || 0;
      const origEl  = row.querySelector(".prco-group-nobr-helper del") ?? row.querySelector(".prco-prev-price") ?? row.querySelector("del");
      const originalPriceUsd = parseFloat(origEl?.textContent?.replace(/[^\d.]/g, "") ?? "") || null;
      const bedsEl  = row.querySelector(".hprt-roomtype-bed, [data-testid='bed-type']");
      const beds    = bedsEl?.textContent?.trim() ?? "";
      const guestEl = row.querySelector(".hprt-occupancy-occupancy-info");
      const maxGuests = parseInt(guestEl?.textContent?.match(/\d+/)?.[0] ?? "2") || 2;
      const sizeMatch = (row.textContent ?? "").match(/([\d.]+)\s*m²/);
      const sizeSqm = sizeMatch ? parseFloat(sizeMatch[1]) : null;
      const amenEls   = row.querySelectorAll(".hprt-facilities-block li, .hprt-facility");
      const amenities = Array.from(amenEls).map(el => el.textContent?.trim()).filter((s): s is string => !!s && s.length > 1);
      const imgEl    = row.querySelector<HTMLImageElement>("img[src*='bstatic.com']");
      const thumbUrl = imgEl?.src ?? imgEl?.getAttribute("data-src") ?? null;
      rooms.push({ name, beds, maxGuests, sizeSqm, priceUsd, originalPriceUsd, amenities, thumbUrl });
    });
    return rooms;
  });

  // ── Per-room photos ─────────────────────────────────────────────────────────
  const roomPhotos: Record<string, string[]> = {};
  for (const room of rawRooms) {
    const rp: string[] = [];
    if (room.thumbUrl && isBstatic(room.thumbUrl)) rp.push(maxRes(room.thumbUrl));
    try {
      const link = page.locator(`.hprt-roomtype-icon-link:has-text("${room.name.replace(/"/g, "")}")`).first();
      await link.click({ timeout: 3_000 });
      await sleep(1_200);
      for (let i = 0; i < 30; i++) {
        const batch = await collectPagePhotos(page);
        rp.push(...batch.map(maxRes).filter(isBstatic));
        const uniq = dedupe(rp); rp.length = 0; rp.push(...uniq);
        await page.keyboard.press("ArrowRight");
        await sleep(180);
        if (i > 5 && rp.length === (roomPhotos[room.name]?.length ?? 0)) break;
      }
      await page.keyboard.press("Escape").catch(() => {});
      await sleep(600);
    } catch {}
    roomPhotos[room.name] = dedupe(rp);
  }

  return {
    ...meta,
    address: meta.address ?? `${cityName}, Cambodia`,
    photos,
    rooms: rawRooms.map(r => ({ ...r, photos: roomPhotos[r.name] ?? [] })),
  };
}

function guessCategory(name: string): string {
  const n = name.toLowerCase();
  if (n.includes("resort")) return "resort";
  if (n.includes("hostel")) return "hostel";
  if (n.includes("guesthouse") || n.includes("guest house")) return "guesthouse";
  if (n.includes("villa")) return "villa";
  if (n.includes("lodge")) return "lodge";
  if (n.includes("motel")) return "motel";
  if (n.includes("inn")) return "inn";
  if (n.includes("boutique")) return "boutique";
  return "hotel";
}

async function insertNewHotel(name: string, cityName: string, cityLat: number, cityLng: number, data: Awaited<ReturnType<typeof scrapeHotelFull>>) {
  // Generate a unique slug
  const baseSlug = toSlug(name);
  const { data: existing } = await supabase.from("store_profiles").select("id").like("slug", `${baseSlug}%`);
  const slug = existing && existing.length > 0 ? `${baseSlug}-${existing.length + 1}` : baseSlug;

  const insert: Record<string, unknown> = {
    name,
    slug,
    category:      guessCategory(name),
    market:        "KH",
    is_active:     true,
    setup_complete: true,
    payment_types: ["cash", "card"],
    address:       data.address ?? `${cityName}, Cambodia`,
    latitude:      data.lat ?? cityLat,
    longitude:     data.lng ?? cityLng,
    rating:        data.rating ?? 4.0,
  };
  if (data.description)   insert.description   = data.description;
  if (data.phone)         insert.phone         = data.phone;
  if (data.photos.length > 0) {
    insert.banner_url     = data.photos[0];
    insert.gallery_images = data.photos.slice(0, 60).map((url, i) => ({ url, caption: name, order: i }));
  }

  const { data: row, error } = await supabase.from("store_profiles").insert(insert).select("id").single();
  if (error) throw new Error(`store_profiles insert: ${error.message}`);
  const storeId = row.id as string;

  const facilities = ["Free WiFi","Swimming Pool","Restaurant","Bar","Room Service","24-Hour Front Desk","Air Conditioning","Fitness Center","Spa","Parking","Airport Shuttle","Laundry Service"];
  await supabase.from("lodge_property_profile").upsert({
    store_id:          storeId,
    facilities,
    popular_amenities: facilities.slice(0, 8),
    check_in_from:     data.checkIn,
    check_out_until:   data.checkOut,
  }, { onConflict: "store_id" });

  if (data.rooms.length > 0) {
    const roomRows = data.rooms.map((r, i) => {
      const n = r.name.toLowerCase();
      return {
        store_id:            storeId,
        name:                r.name,
        room_type:           n.includes("penthouse") ? "penthouse" : n.includes("suite") ? "suite" : n.includes("executive") ? "executive" : n.includes("deluxe") ? "deluxe" : n.includes("superior") ? "superior" : "standard",
        beds:                r.beds || null,
        max_guests:          r.maxGuests,
        size_sqm:            r.sizeSqm,
        base_rate_cents:     Math.round(r.priceUsd * 100),
        original_rate_cents: r.originalPriceUsd ? Math.round(r.originalPriceUsd * 100) : null,
        amenities:           r.amenities,
        photos:              r.photos,
        sort_order:          i,
        is_active:           true,
      };
    });
    await supabase.from("lodge_rooms").insert(roomRows);
  }

  return storeId;
}

async function main() {
  console.log("\nZIVO Booking.com Discovery Scraper");
  console.log("====================================");
  if (DRY_RUN) console.log("** DRY RUN — no database writes **");
  console.log(`cities=${CITY_FILTER ?? "all"}  limit=${LIMIT ?? "unlimited"}\n`);

  // Load all existing hotel names for dedup check
  console.log("Loading existing hotels from database…");
  const existingNames = new Set<string>();
  let page = 0;
  while (true) {
    const { data } = await supabase.from("store_profiles")
      .select("name")
      .in("category", ["hotel","resort","guesthouse","hostel","villa","lodge","motel","inn","boutique"])
      .range(page * 500, page * 500 + 499);
    if (!data?.length) break;
    data.forEach(r => existingNames.add(r.name.toLowerCase().trim()));
    if (data.length < 500) break;
    page++;
  }
  console.log(`Existing hotels: ${existingNames.size}\n`);

  const cities = CITY_FILTER
    ? CAMBODIA_CITIES.filter(c => c.name.toLowerCase().includes(CITY_FILTER.toLowerCase()))
    : CAMBODIA_CITIES;

  const results: { name: string; city: string; storeId?: string; rooms: number; photos: number; status: string }[] = [];
  let addedCount = 0;

  const browser = await chromium.launch({
    headless: false,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox", "--start-maximized"],
  });
  const context: BrowserContext = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    viewport: { width: 1400, height: 900 },
    locale: "en-US",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    // @ts-ignore
    window.chrome = { runtime: {} };
  });

  const browserPage = await context.newPage();

  // Warm up session
  console.log("Initialising Booking.com session…");
  await browserPage.goto("https://www.booking.com/?lang=en-us", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await sleep(2_000);
  await dismissOverlays(browserPage);
  console.log("Ready.\n");

  for (const city of cities) {
    if (LIMIT && addedCount >= LIMIT) break;
    console.log(`\n── ${city.name} ──────────────────────────`);

    // Paginate through search results (up to 200 results = 8 pages × 25)
    for (let offset = 0; offset < 200; offset += 25) {
      if (LIMIT && addedCount >= LIMIT) break;

      const hotels = await searchCityPage(browserPage, city, offset);
      if (hotels.length === 0) { console.log(`  [offset ${offset}] No more results`); break; }

      console.log(`  [offset ${offset}] Found ${hotels.length} listings`);

      for (const hotel of hotels) {
        if (LIMIT && addedCount >= LIMIT) break;
        if (!hotel.name || !hotel.url) continue;

        const key = hotel.name.toLowerCase().trim();
        if (existingNames.has(key)) {
          // Already in DB
          continue;
        }

        // New hotel — scrape full details
        const cleanUrl = (() => {
          try {
            const u = new URL(hotel.url);
            return `${u.origin}${u.pathname}?selected_currency=USD&lang=en-us&checkin=${CHECKIN}&checkout=${CHECKOUT}&group_adults=2&no_rooms=1`;
          } catch { return null; }
        })();
        if (!cleanUrl) continue;

        console.log(`  + NEW: ${hotel.name}`);
        console.log(`    URL: ${cleanUrl}`);

        try {
          const data = await scrapeHotelFull(browserPage, cleanUrl, city.name);
          const roomSummary = data.rooms.map(r => `${r.name} $${r.priceUsd}/night`).join(", ").slice(0, 80);
          console.log(`    Photos: ${data.photos.length} | Rooms: ${data.rooms.length} | ${roomSummary}`);

          if (!DRY_RUN) {
            const storeId = await insertNewHotel(hotel.name, city.name, city.lat, city.lng, data);
            results.push({ name: hotel.name, city: city.name, storeId, rooms: data.rooms.length, photos: data.photos.length, status: "added" });
            console.log(`    ✓ Added (id: ${storeId})`);
          } else {
            results.push({ name: hotel.name, city: city.name, rooms: data.rooms.length, photos: data.photos.length, status: "dry-run" });
            console.log(`    ✓ (dry-run)`);
          }

          existingNames.add(key); // prevent re-processing from other city search overlaps
          addedCount++;
        } catch (err: any) {
          console.log(`    ✗ Error: ${err?.message?.slice(0, 80)}`);
          results.push({ name: hotel.name, city: city.name, rooms: 0, photos: 0, status: `error: ${err?.message?.slice(0, 60)}` });
        }

        await sleep(1_200);
      }

      await sleep(1_500);
    }
  }

  await browser.close();

  console.log(`\n===== Done =====`);
  console.log(`New hotels added: ${addedCount}`);
  writeFileSync(LOG_PATH!, JSON.stringify(results, null, 2));
  console.log(`Log → ${LOG_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
