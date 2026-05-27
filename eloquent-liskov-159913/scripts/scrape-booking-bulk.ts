/**
 * Booking.com → ZIVO Bulk Hotel Scraper
 *
 * For every lodging store in the database:
 *   1. Searches Booking.com by hotel name + city
 *   2. Picks the best-matching result
 *   3. Scrapes the hotel page for:
 *        – All gallery photos  (cover + full gallery)
 *        – Per-room photos, prices, original/crossed-out prices, beds, size, amenities
 *        – Hotel description, check-in/out times, facilities
 *   4. Saves everything to store_profiles, lodge_property_profile, lodge_rooms
 *
 * Usage:
 *   SUPABASE_URL=https://slirphzzwcogdbkeicff.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *     bun scripts/scrape-booking-bulk.ts [options]
 *
 * Options:
 *   --start=N     Skip first N stores (resume from N)
 *   --limit=N     Process at most N stores
 *   --force       Re-process stores that already have a banner
 *   --dry-run     Scrape but don't write to database
 *   --rooms-only  Only scrape & save rooms (skip if hotel photos already exist)
 *   --upload-media Upload authorized Booking images to Supabase Storage before saving
 *   --allow-third-party-media Required with --upload-media for Booking/bstatic media
 *   --booking-url=URL Use an exact Booking.com URL in --store-id mode
 *   --store-ids=a,b Process only these store ids (comma-separated)
 *   --store-ids-file=PATH Process only store ids listed in a JSON/text file
 *   --categories=a,b Restrict eligible store categories (default: lodging cats)
 *   --log=PATH    JSON results log path (default: booking-bulk-DATE.json)
 */

import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import type { Page, BrowserContext } from "@playwright/test";

// ─── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Alternative: an admin user's JWT + the anon key. This lets us run without
// the service-role secret as long as RLS policies grant admin users write
// access to the target tables.
const USER_JWT  = process.env.SUPABASE_USER_JWT;
const ANON_KEY  = process.env.SUPABASE_ANON_KEY;
const USER_REFRESH = process.env.SUPABASE_USER_REFRESH;

if (!SUPABASE_URL || (!SERVICE_KEY && !(USER_JWT && ANON_KEY))) {
  console.error(
    "Missing credentials. Provide either:\n" +
      "  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or\n" +
      "  SUPABASE_URL + SUPABASE_ANON_KEY + SUPABASE_USER_JWT (admin user)"
  );
  process.exit(1);
}

// Active access token for user-JWT mode (mutable so we can rotate it).
let activeJwt: string | undefined = USER_JWT;
let activeRefresh: string | undefined = USER_REFRESH;

function buildClient() {
  if (SERVICE_KEY) return createClient(SUPABASE_URL!, SERVICE_KEY);
  return createClient(SUPABASE_URL!, ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${activeJwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let supabase = buildClient();

/** Refresh the admin user's access token using the stored refresh_token. */
async function refreshUserJwt(): Promise<boolean> {
  if (SERVICE_KEY) return true;
  if (!activeRefresh) {
    console.warn("  (no refresh_token available — cannot rotate JWT)");
    return false;
  }
  try {
    const res = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: ANON_KEY!,
          Authorization: `Bearer ${ANON_KEY}`,
        },
        body: JSON.stringify({ refresh_token: activeRefresh }),
      }
    );
    if (!res.ok) {
      console.warn(`  (token refresh failed: ${res.status} ${await res.text()})`);
      return false;
    }
    const json = await res.json() as { access_token: string; refresh_token: string };
    activeJwt = json.access_token;
    activeRefresh = json.refresh_token;
    supabase = buildClient();
    console.log("  (admin JWT refreshed)");
    return true;
  } catch (e) {
    console.warn(`  (token refresh error: ${(e as Error).message})`);
    return false;
  }
}

console.log(
  SERVICE_KEY
    ? "Auth: service_role (full bypass)"
    : "Auth: admin user JWT (RLS applies, auto-refresh)"
);

// CLI flags
const args     = process.argv.slice(2);
const getInt   = (k: string, d: number | null = null) => { const f = args.find(a => a.startsWith(`--${k}=`)); return f ? parseInt(f.split("=")[1]) : d; };
const getStr   = (k: string, d: string | null = null) => { const f = args.find(a => a.startsWith(`--${k}=`)); return f ? f.split("=").slice(1).join("=") : d; };

const START      = getInt("start", 0)!;
const LIMIT      = getInt("limit");
const FORCE      = args.includes("--force");
const DRY_RUN    = args.includes("--dry-run");
const ROOMS_ONLY = args.includes("--rooms-only");
const UPLOAD_MEDIA = args.includes("--upload-media");
const ALLOW_THIRD_PARTY_MEDIA = args.includes("--allow-third-party-media");
const STORE_ID   = getStr("store-id");   // process a single store by uuid
const BOOKING_URL = getStr("booking-url"); // exact Booking.com URL for single-store mode
const STORE_IDS_ARG = getStr("store-ids");
const STORE_IDS_FILE = getStr("store-ids-file");
const OWNER_ID   = getStr("owner");      // restrict queue to one owner_id
const CATEGORY_ARG = getStr("categories");
const LOG_PATH   = getStr("log") ?? `booking-bulk-${new Date().toISOString().slice(0, 10)}.json`;

if (UPLOAD_MEDIA && !ALLOW_THIRD_PARTY_MEDIA) {
  console.error("--upload-media requires --allow-third-party-media after rights confirmation.");
  process.exit(1);
}

// Booking.com search dates (a week from now for price display)
const CHECKIN  = "2026-05-22";
const CHECKOUT = "2026-05-23";

const LODGING_CATS = ["hotel","resort","guesthouse","hostel","villa","lodge","motel","inn","boutique"];
const TARGET_CATEGORIES = CATEGORY_ARG
  ? CATEGORY_ARG.split(",").map((cat) => cat.trim()).filter(Boolean)
  : LODGING_CATS;
function parseStoreIdsFromText(text: string): string[] {
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => typeof item === "string" ? item : (item?.id ?? item?.store_id ?? item?.storeId))
        .filter((id): id is string => typeof id === "string");
    }
  } catch {}
  return text.split(/[\s,]+/).map((id) => id.trim()).filter(Boolean);
}
const STORE_IDS = new Set<string>([
  ...(STORE_IDS_ARG ? STORE_IDS_ARG.split(",").map((id) => id.trim()).filter(Boolean) : []),
  ...(STORE_IDS_FILE ? parseStoreIdsFromText(readFileSync(STORE_IDS_FILE, "utf8")) : []),
]);
const CAMBODIA_PLACES = [
  "Phnom Penh",
  "Siem Reap",
  "Kampot",
  "Kep",
  "Battambang",
  "Sihanoukville",
  "Preah Sihanouk",
  "Kratie",
  "Koh Kong",
  "Kampong Cham",
  "Kampong Chhnang",
  "Kampong Speu",
  "Kampong Thom",
  "Preah Vihear",
  "Pursat",
  "Takeo",
  "Kampong Tralach",
  "Kampong Seila",
  "Banteay Meanchey",
  "Kampong Chheuteal",
  "Mondulkiri",
  "Ratanakiri",
  "Stung Treng",
  "Kandal",
];

const PROP_DELAY   = 5_000;  // ms between hotels
const PAGE_DELAY   = 1_500;  // ms between page actions
const SEARCH_DELAY = 2_500;  // ms after search navigation

// ─── Types ────────────────────────────────────────────────────────────────────
interface Store {
  id: string;
  name: string;
  address: string | null;
  banner_url: string | null;
  logo_url: string | null;
  description?: string | null;
}
interface RawRoom {
  name: string; beds: string; maxGuests: number; sizeSqm: number | null;
  priceUsd: number; originalPriceUsd: number | null;
  unitsTotal: number | null;
  description: string | null;
  amenities: string[]; thumbUrl: string | null;
}
interface ScrapedHotel {
  description: string | null;
  description_sections: Array<{ title: string; body: string }>;
  checkIn: string | null;
  checkOut: string | null;
  rating: number | null;
  phone: string | null;
  address: string | null;
  facilities: string[];
  popular_amenities: string[];
  property_highlights: Record<string, unknown>;
  house_rules: Record<string, string>;
  cancellation_policy: string | null;
  photos: string[];
  rooms: RawRoom[];
  source: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function dedupe(arr: string[]): string[] { return [...new Set(arr)]; }

function roomPhotoCount(room: RawRoom): number {
  return Array.isArray((room as any).photos) ? (room as any).photos.length : 0;
}

function preferRoomCandidate(a: RawRoom, b: RawRoom): RawRoom {
  const aRate = a.priceUsd > 0 ? a.priceUsd : Number.MAX_SAFE_INTEGER;
  const bRate = b.priceUsd > 0 ? b.priceUsd : Number.MAX_SAFE_INTEGER;
  if (aRate !== bRate) return aRate < bRate ? a : b;
  const aPhotos = roomPhotoCount(a);
  const bPhotos = roomPhotoCount(b);
  if (aPhotos !== bPhotos) return aPhotos > bPhotos ? a : b;
  return a.amenities.length >= b.amenities.length ? a : b;
}

function dedupeRooms(rooms: RawRoom[]): RawRoom[] {
  const byName = new Map<string, RawRoom>();
  const order: string[] = [];
  for (const room of rooms) {
    const key = room.name.trim().toLowerCase();
    if (!key) continue;
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, room);
      order.push(key);
    } else {
      byName.set(key, preferRoomCandidate(existing, room));
    }
  }
  return order.map((key) => byName.get(key)!).filter(Boolean);
}

function galleryFallbackForRoom(galleryUrls: string[], roomIndex: number, count = 6): string[] {
  if (galleryUrls.length === 0) return [];
  const limit = Math.min(count, galleryUrls.length);
  const start = (roomIndex * limit) % galleryUrls.length;
  const fallback: string[] = [];
  for (let i = 0; i < limit; i++) {
    fallback.push(galleryUrls[(start + i) % galleryUrls.length]);
  }
  return dedupe(fallback);
}

function maxRes(url: string): string {
  return url
    .replace(/\/square\d+\//g, "/max1280x900/")
    .replace(/\/max\d+(?:x\d+)?\//g, "/max1280x900/")
    .replace(/\/crop\/\d+x\d+\//g, "/max1280x900/");
}

function isBstatic(url: string): boolean {
  return url.includes("bstatic.com") && url.includes("/xdata/images/hotel/");
}

function hashUrl(url: string): string {
  return createHash("sha1").update(url).digest("hex").slice(0, 12);
}

function fileExtFromUrl(url: string): string {
  const ext = url.split("?")[0].match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  if (ext && ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;
  return "jpg";
}

function contentTypeForExt(ext: string): string {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

async function uploadBookingImage(
  url: string,
  storeId: string,
  subdir: "gallery" | "rooms",
  uploadCache: Map<string, string>,
): Promise<string | null> {
  if (!UPLOAD_MEDIA) return url;
  if (!ALLOW_THIRD_PARTY_MEDIA) throw new Error("Third-party media upload is not authorized.");
  if (!isBstatic(url)) return url;
  if (uploadCache.has(url)) return uploadCache.get(url)!;

  const ext = fileExtFromUrl(url);
  const storagePath = `booking-import/${storeId}/${subdir}/${hashUrl(url)}.${ext}`;
  const { data: existing } = await supabase.storage
    .from("store-assets")
    .list(`booking-import/${storeId}/${subdir}`, { search: `${hashUrl(url)}.${ext}` });
  if (existing?.some((file) => file.name === `${hashUrl(url)}.${ext}`)) {
    const { data } = supabase.storage.from("store-assets").getPublicUrl(storagePath);
    uploadCache.set(url, data.publicUrl);
    return data.publicUrl;
  }

  let response: Response | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      response = await fetch(url, {
        redirect: "follow",
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
          "Referer": "https://www.booking.com/",
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        },
      });
      if (response.ok) break;
      console.warn(`  ✗ media fetch ${response.status}: ${url.slice(0, 120)}`);
    } catch (e) {
      console.warn(`  ✗ media fetch failed (${attempt}/2): ${(e as Error).message}`);
    }
    response = null;
    await sleep(700 * attempt);
  }
  if (!response?.ok) return null;

  const bytes = Buffer.from(await response.arrayBuffer());
  let uploadError: Error | null = null;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const { error } = await supabase.storage
      .from("store-assets")
      .upload(storagePath, bytes, {
        contentType: contentTypeForExt(ext),
        cacheControl: "31536000",
        upsert: true,
      });
    if (!error) {
      uploadError = null;
      break;
    }
    uploadError = new Error(`media upload failed: ${error.message}`);
    await sleep(700 * attempt);
  }
  if (uploadError) {
    console.warn(`  ✗ ${uploadError.message}`);
    return null;
  }

  const { data } = supabase.storage.from("store-assets").getPublicUrl(storagePath);
  uploadCache.set(url, data.publicUrl);
  return data.publicUrl;
}

async function uploadBookingImages(
  urls: string[],
  storeId: string,
  subdir: "gallery" | "rooms",
  uploadCache: Map<string, string>,
): Promise<string[]> {
  const out: string[] = [];
  for (let i = 0; i < urls.length; i++) {
    const uploaded = await uploadBookingImage(urls[i], storeId, subdir, uploadCache);
    if (uploaded) out.push(uploaded);
    if (UPLOAD_MEDIA && i % 10 === 9) process.stdout.write(`  uploaded ${i + 1}/${urls.length} ${subdir}\r`);
  }
  if (UPLOAD_MEDIA && urls.length) process.stdout.write(" ".repeat(60) + "\r");
  return dedupe(out);
}

/** Slugify a name for rough fuzzy matching */
function slug(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

/** Check if two hotel names are a good match */
function namesMatch(queryName: string, resultName: string): boolean {
  const q = slug(queryName);
  const r = slug(resultName);
  // Direct substring check
  if (r.includes(q) || q.includes(r)) return true;
  // Word overlap: ≥60% of query words appear in result
  const qWords = q.split(" ").filter(w => w.length > 3);
  const matches = qWords.filter(w => r.includes(w));
  return qWords.length > 0 && matches.length / qWords.length >= 0.6;
}

function extractCity(address: string | null): string {
  if (!address) return "Cambodia";
  const lower = address.toLowerCase();
  const known = CAMBODIA_PLACES.find(place => lower.includes(place.toLowerCase()));
  if (known) return known;
  const parts = address.split(",").map(p => p.trim()).filter(Boolean);
  const filtered = parts.filter(p => !p.toLowerCase().includes("cambodia"));
  return filtered.length >= 2 ? filtered[filtered.length - 2]
       : filtered.length >= 1 ? filtered[filtered.length - 1]
       : "Cambodia";
}

function searchQueries(store: Store): string[] {
  const variants: string[] = [];
  const add = (value: string | null | undefined) => {
    const normalized = (value ?? "").replace(/\s+/g, " ").trim();
    if (normalized && !variants.some(v => v.toLowerCase() === normalized.toLowerCase())) {
      variants.push(normalized);
    }
  };

  const city = extractCity(store.address);
  add(`${store.name} ${city}`);

  if (store.address) {
    const parts = store.address.split(",").map(p => p.trim()).filter(Boolean);
    for (const part of parts.slice().reverse()) {
      if (!part || /cambodia/i.test(part) || /^\d+$/.test(part)) continue;
      add(`${store.name} ${part}`);
    }
  }

  add(`${store.name} Cambodia`);
  add(store.name);
  return variants.slice(0, 5);
}

function normalizeBookingUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl.replace(/&amp;/g, "&"));
    if (!/booking\.com$/i.test(url.hostname) && !/\.booking\.com$/i.test(url.hostname)) {
      return null;
    }
    url.searchParams.set("selected_currency", "USD");
    url.searchParams.set("lang", "en-us");
    url.searchParams.set("checkin", CHECKIN);
    url.searchParams.set("checkout", CHECKOUT);
    url.searchParams.set("group_adults", "2");
    url.searchParams.set("no_rooms", "1");
    return `${url.origin}${url.pathname}?${url.searchParams.toString()}`;
  } catch {
    return null;
  }
}

function bookingUrlFromStore(store: Store): string | null {
  const match = (store.description ?? "").match(/https?:\/\/(?:www\.)?booking\.com\/hotel\/[^\s"')<>]+/i);
  return match ? normalizeBookingUrl(match[0]) : null;
}

function loadKnownBookingUrlMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const file of readdirSync(".").filter((name) => name.startsWith("booking-") && name.endsWith(".json"))) {
    try {
      const raw = JSON.parse(readFileSync(file, "utf8"));
      const visit = (value: unknown) => {
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) {
          value.forEach(visit);
          return;
        }
        const record = value as Record<string, unknown>;
        const id = record.storeId || record.store_id || record.id;
        const url = record.bookingUrl || record.booking_url || record.cleanUrl || record.source_url || record.url;
        if (typeof id === "string" && typeof url === "string" && id.length > 30 && url.includes("booking.com")) {
          const normalized = normalizeBookingUrl(url);
          if (normalized && !map.has(id)) map.set(id, normalized);
        }
        Object.values(record).forEach(visit);
      };
      visit(raw);
    } catch {
      // Ignore partial or non-result JSON files.
    }
  }
  return map;
}

// ─── Page helpers ─────────────────────────────────────────────────────────────
async function collectPagePhotos(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const urls: string[] = [];
    const seen = new Set<string>();
    const add = (src: string) => {
      if (!src || !src.includes("bstatic.com")) return;
      // Only accept ACTUAL hotel photos. Booking serves hotel images from
      // /xdata/images/hotel/<size>/<id>.jpg. Everything else (flags, UI
      // sprites, avatars, etc.) lives under /static/img/ or other paths
      // and must be filtered out — otherwise we end up saving a country
      // flag as the hotel's banner_url.
      if (!src.includes("/xdata/images/hotel/")) return;
      const clean = src.replace(/&amp;/g, "&");
      if (!seen.has(clean)) { seen.add(clean); urls.push(clean); }
    };
    const addSrcset = (val: string) => {
      if (!val) return;
      // "url1 1x, url2 2x" or "url1 300w, url2 600w"
      val.split(",").forEach(part => {
        const url = part.trim().split(/\s+/)[0];
        if (url) add(url);
      });
    };
    document.querySelectorAll("img").forEach(img => {
      add(img.src);
      add(img.getAttribute("data-src") ?? "");
      add(img.getAttribute("data-lazy-src") ?? "");
      addSrcset(img.getAttribute("srcset") ?? "");
      addSrcset(img.getAttribute("data-srcset") ?? "");
    });
    document.querySelectorAll("source").forEach(src => {
      addSrcset(src.getAttribute("srcset") ?? "");
    });
    document.querySelectorAll("[data-src],[data-lazy-src]").forEach(el => {
      add(el.getAttribute("data-src") ?? "");
      add(el.getAttribute("data-lazy-src") ?? "");
    });
    // Background-image styles (used by Booking's modern gallery tiles)
    document.querySelectorAll<HTMLElement>("[style*='background-image']").forEach(el => {
      const style = el.getAttribute("style") ?? "";
      const m = style.match(/background-image:\s*url\((['"]?)(.*?)\1\)/i);
      if (m && m[2]) add(m[2]);
    });
    return urls;
  });
}

async function dismissOverlays(page: Page) {
  for (const sel of [
    "button#onetrust-accept-btn-handler",
    'button[data-gdpr-consent="accept"]',
  ]) {
    try { await page.click(sel, { timeout: 1_500 }); await sleep(500); break; } catch {}
  }
  for (const sel of [
    '[aria-label="Dismiss sign-in info."]',
  ]) {
    try { await page.click(sel, { timeout: 1_000 }); break; } catch {}
  }
  await page.keyboard.press("Escape").catch(() => {});
}

// ─── Find Booking.com URL for a hotel ────────────────────────────────────────
async function findBookingUrl(page: Page, store: Store): Promise<string | null> {
  for (const rawQuery of searchQueries(store)) {
    const query = encodeURIComponent(rawQuery);
    const urls = [
      `https://www.booking.com/searchresults.html?ss=${query}&checkin=${CHECKIN}&checkout=${CHECKOUT}&lang=en-us&group_adults=2&no_rooms=1`,
      `https://www.booking.com/searchresults.html?ss=${query}&lang=en-us&group_adults=2&no_rooms=1`,
    ];

    for (const url of urls) {
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
        await sleep(SEARCH_DELAY);
        await dismissOverlays(page);

        // Extract search result hotel names + links
        const results = await page.evaluate(() => {
          const cards = document.querySelectorAll('[data-testid="property-card"]');
          return Array.from(cards).slice(0, 10).map(card => {
            const nameEl = card.querySelector('[data-testid="title"]');
            const linkEl = card.querySelector<HTMLAnchorElement>('a[data-testid="title-link"]');
            return {
              name: nameEl?.textContent?.trim() ?? "",
              href: linkEl?.href ?? "",
            };
          });
        });

        // Find best match
        for (const r of results) {
          if (r.href && namesMatch(store.name, r.name)) {
            // Strip to clean hotel URL with dates so the room table loads
            const u = new URL(r.href);
            return `${u.origin}${u.pathname}?selected_currency=USD&lang=en-us&checkin=${CHECKIN}&checkout=${CHECKOUT}&group_adults=2&no_rooms=1`;
          }
        }
      } catch {}
    }
  }

  return null;
}

// ─── Scrape hotel detail page ─────────────────────────────────────────────────
async function scrapeHotelPage(page: Page, hotelUrl: string): Promise<ScrapedHotel> {
  // Network-level capture: every image URL Booking.com fetches for /xdata/images/hotel/
  // — this catches gallery photos that lazy-load even if the DOM scan misses them.
  const networkPhotos = new Set<string>();
  const onResponse = (resp: any) => {
    try {
      const u = resp.url();
      if (typeof u === "string" && u.includes("/xdata/images/hotel/")) {
        networkPhotos.add(u.replace(/&amp;/g, "&"));
      }
    } catch {}
  };
  page.on("response", onResponse);

  try {
    await page.goto(hotelUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
    return await scrapeHotelPageInner(page, networkPhotos);
  } finally {
    page.off("response", onResponse);
  }
}

async function scrapeHotelPageInner(page: Page, networkPhotos: Set<string>): Promise<ScrapedHotel> {
  await sleep(PAGE_DELAY);
  await dismissOverlays(page);

  // ── Hotel info ──────────────────────────────────────────────────────────────
  const hotelInfo = await page.evaluate(() => {
    const cleanText = (s: string | null | undefined) =>
      (s ?? "").replace(/\s+/g, " ").trim();

    // Description (rich text, may contain multiple paragraphs)
    let description: string | null = null;
    for (const sel of [
      "[data-testid='property-description']",
      "#property_description_content",
      ".hp-description__text",
      ".hp_desc_main_content p",
    ]) {
      const el = document.querySelector(sel);
      const txt = cleanText(el?.textContent);
      if (txt) { description = txt; break; }
    }

    // Description sections — Booking's "About this property", "Most popular facilities", etc.
    const description_sections: Array<{ title: string; body: string }> = [];
    document.querySelectorAll<HTMLElement>(
      "[data-testid='property-description'] h2, [data-testid='property-description'] h3, " +
      "#property_description_content h3, .hp-description h2, .hp-description h3"
    ).forEach(h => {
      const title = cleanText(h.textContent);
      const next  = h.nextElementSibling;
      const body  = cleanText(next?.textContent);
      if (title && body && body.length > 20) description_sections.push({ title, body });
    });

    // Check-in/check-out times — JSON-LD first, regex fallback
    let checkIn: string | null = null, checkOut: string | null = null;
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
      try {
        const d = JSON.parse(s.textContent ?? "{}");
        if (d.checkinTime)  checkIn  = String(d.checkinTime);
        if (d.checkoutTime) checkOut = String(d.checkoutTime);
      } catch {}
    });

    const normalizeClock = (raw: string | null): string | null => {
      const m = raw?.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
      if (!m) return raw ?? null;
      let hour = Number(m[1]);
      const meridiem = m[3]?.toUpperCase();
      if (meridiem === "PM" && hour < 12) hour += 12;
      if (meridiem === "AM" && hour === 12) hour = 0;
      return `${String(hour).padStart(2, "0")}:${m[2]}`;
    };

    if (!checkIn || !checkOut) {
      const text = document.body.innerText;
      const timesNear = (label: RegExp) => {
        const m = text.match(label);
        return m?.[0].match(/\d{1,2}:\d{2}\s*(?:AM|PM)?/gi) ?? [];
      };
      const ciTimes = timesNear(/[Cc]heck-?\s*in\b[\s\S]{0,160}/);
      const coTimes = timesNear(/[Cc]heck-?\s*out\b[\s\S]{0,160}/);
      if (!checkIn  && ciTimes.length) checkIn  = normalizeClock(ciTimes[0]);
      if (!checkOut && coTimes.length) checkOut = normalizeClock(coTimes[coTimes.length - 1]);
    }
    checkIn = normalizeClock(checkIn);
    checkOut = normalizeClock(checkOut);

    // Rating
    const ratingEl =
      document.querySelector("[data-testid='review-score-badge']") ??
      document.querySelector(".bui-review-score__badge") ??
      document.querySelector("[data-testid='review-score'] .ac4a7896c7");
    const rating = ratingEl ? parseFloat(cleanText(ratingEl.textContent)) || null : null;

    // Phone — wider net (tel: links + structured data)
    let phone: string | null = null;
    const phoneEl = document.querySelector<HTMLElement>(
      "[data-testid='phone-number'], a[href^='tel:'], .hp_address_subtitle a[href^='tel:']"
    );
    if (phoneEl) {
      const href = phoneEl.getAttribute("href") ?? "";
      phone = href.startsWith("tel:") ? href.replace("tel:", "").trim() : cleanText(phoneEl.textContent);
    }

    // Address (display string, used as a fallback)
    let address: string | null = null;
    const addrEl = document.querySelector<HTMLElement>(
      "[data-testid='address'], [data-testid='hotel-address'], .hp_address_subtitle, .hp-hotel-location-block"
    );
    if (addrEl) address = cleanText(addrEl.textContent);

    // ── Facilities (REAL — replaces the hardcoded fallback) ────────────────────
    const facilitiesSet = new Set<string>();
    // Most-popular facilities row near the top
    document.querySelectorAll<HTMLElement>(
      "[data-testid='property-most-popular-facilities-wrapper'] li, " +
      "[data-testid='property-most-popular-facilities-wrapper'] div span, " +
      ".most-popular-facility, .most-popular-facility span, " +
      ".hp-most-popular-facilities .hp-most-popular-facility"
    ).forEach(el => {
      const txt = cleanText(el.textContent);
      if (txt && txt.length > 1 && txt.length < 60) facilitiesSet.add(txt);
    });
    // Full facilities checklist further down the page
    document.querySelectorAll<HTMLElement>(
      ".hotel-facilities-group li, .facilitiesChecklist li, " +
      "#hp_facilities_box li, .hotel-facilities li, " +
      "[data-testid='property-section--facilities'] li, " +
      "[data-testid='facilities-block'] li"
    ).forEach(el => {
      const txt = cleanText(el.textContent);
      if (txt && txt.length > 1 && txt.length < 60) facilitiesSet.add(txt);
    });
    const facilities = [...facilitiesSet];

    // Popular amenities = first 8 from the "most popular" wrapper if available,
    // otherwise first 8 facilities
    const popularSet = new Set<string>();
    document.querySelectorAll<HTMLElement>(
      "[data-testid='property-most-popular-facilities-wrapper'] li, " +
      ".most-popular-facility, .hp-most-popular-facilities .hp-most-popular-facility"
    ).forEach(el => {
      const txt = cleanText(el.textContent);
      if (txt && txt.length > 1 && txt.length < 60) popularSet.add(txt);
    });
    const popular_amenities = popularSet.size > 0 ? [...popularSet].slice(0, 10) : facilities.slice(0, 8);

    // ── Property highlights ────────────────────────────────────────────────────
    const highlights: Record<string, unknown> = {};
    const highlightStrip = document.querySelector<HTMLElement>(
      ".hp_nav_reviews_link, .hp-highlights, [data-testid='property-highlights']"
    );
    if (highlightStrip) {
      const tlsEl = highlightStrip.querySelector("[data-testid='review-score-component'] .bui-review-score__badge, .review-score-badge");
      const tls   = tlsEl ? parseFloat(cleanText(tlsEl.textContent)) : NaN;
      if (!Number.isNaN(tls)) highlights.top_location_score = tls;
      const perfectEl = highlightStrip.querySelector(".hp_nav_reviews_link__text, .perfect_for");
      if (perfectEl) highlights.perfect_for = cleanText(perfectEl.textContent);
      const breakfastEl = highlightStrip.querySelector(".breakfast_review_score");
      if (breakfastEl) highlights.breakfast_info = cleanText(breakfastEl.textContent);
    }

    // ── House rules / Policies (raw text snapshot — admin can refine later) ────
    const houseRulesObj: Record<string, string> = {};
    const policyBlocks = document.querySelectorAll<HTMLElement>(
      "[data-testid='property-section--policies'] [data-testid='content-row'], " +
      "#hotelPoliciesInc .policyContent, " +
      ".hotel-policies-content [data-testid='content-row']"
    );
    policyBlocks.forEach((row, idx) => {
      const titleEl = row.querySelector("h3, h4, strong, [data-testid='policy-title']");
      const bodyEl  = row.querySelector("[data-testid='policy-content'], .content, p, div");
      const title = cleanText(titleEl?.textContent) || `policy_${idx + 1}`;
      const body  = cleanText(bodyEl?.textContent);
      if (body && body.length > 5) houseRulesObj[title] = body;
    });

    // Cancellation policy — pull from the policies area or fallback to room-level text
    let cancellation_policy: string | null = null;
    const cancelEl = document.querySelector<HTMLElement>(
      "[data-testid='policy-cancellation'], .policyContent--cancellation, " +
      "[data-testid='property-section--policies'] [data-testid='cancellation-content']"
    );
    if (cancelEl) cancellation_policy = cleanText(cancelEl.textContent);
    if (!cancellation_policy) {
      // Body-text fallback near the word "cancellation"
      const m = document.body.innerText.match(/[Cc]ancellation[\s\S]{0,500}/);
      if (m && m[0].length > 30) cancellation_policy = cleanText(m[0]).slice(0, 600);
    }

    return {
      description,
      description_sections,
      checkIn,
      checkOut,
      rating,
      phone,
      address,
      facilities,
      popular_amenities,
      property_highlights: highlights,
      house_rules: houseRulesObj,
      cancellation_policy,
    };
  });

  // ── Gallery photos ──────────────────────────────────────────────────────────
  // Scroll the page so lazy-loaded thumbnails populate before we collect.
  try {
    await page.evaluate(async () => {
      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await sleep(120);
      }
      window.scrollTo(0, 0);
    });
    await sleep(600);
  } catch {}

  let photos: string[] = await collectPagePhotos(page);

  const galleryOpened = await (async () => {
    // Try explicit "See all photos" buttons first
    for (const sel of [
      '[data-testid="bh-photo-grid-open-gallery-button"]',
      ".bh-photo-grid__see-all-button",
      '[data-testid="gallery-open-button"]',
      '[data-testid="property-gallery-trigger"]',
      'button:has-text("See all photos")',
      'a:has-text("See all photos")',
      'button:has-text("Show all")',
    ]) {
      try { await page.click(sel, { timeout: 2_500 }); await sleep(1_500); return true; } catch {}
    }
    // Fallback: click the first hero photo / gallery tile to open the modal
    for (const sel of [
      '[data-testid="property-gallery-image-0"]',
      '[data-testid="property-gallery-image"]',
      ".bh-photo-grid-item a",
      ".bh-photo-grid-photo",
      "#photo_wrapper a",
      "a.bh-photo-grid-photo-link",
    ]) {
      try { await page.click(sel, { timeout: 2_500 }); await sleep(1_500); return true; } catch {}
    }
    return false;
  })();

  if (galleryOpened) {
    for (let i = 0; i < 200; i++) {
      const batch = await collectPagePhotos(page);
      const before = photos.length;
      photos.push(...batch);
      photos = dedupe(photos);
      await page.keyboard.press("ArrowRight");
      await sleep(180);
      // Stop only if we've stalled for at least 8 consecutive iterations
      // after an initial warm-up.
      if (i > 20 && photos.length === before) {
        // Re-check after a longer wait in case modal is still loading
        await sleep(500);
        const recheck = await collectPagePhotos(page);
        photos.push(...recheck);
        photos = dedupe(photos);
        if (photos.length === before) break;
      }
    }
    await page.keyboard.press("Escape").catch(() => {});
    await sleep(800);
  }

  // ── Photos-gallery tab pass ─────────────────────────────────────────────────
  // Navigating to ?activeTab=photosGallery loads Booking's dedicated photo
  // gallery view which exposes many more thumbnails than the hotel landing
  // page. We harvest from DOM + the running network listener captures all
  // /xdata/images/hotel/ requests automatically.
  const mainUrl = page.url();
  try {
    const galUrl = mainUrl.split("#")[0] + (mainUrl.includes("?") ? "&" : "?") + "activeTab=photosGallery";
    await page.goto(galUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await sleep(1_500);
    // Scroll the page + inner scrollable containers to trigger lazy loads
    await page.evaluate(async () => {
      const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
      for (let y = 0; y < 6000; y += 600) { window.scrollTo(0, y); await sleep(120); }
      const scrollables: HTMLElement[] = [];
      document.querySelectorAll<HTMLElement>("*").forEach(el => {
        const cs = getComputedStyle(el);
        if ((cs.overflowY === "auto" || cs.overflowY === "scroll") && el.scrollHeight > el.clientHeight + 100) {
          scrollables.push(el);
        }
      });
      for (const el of scrollables.slice(0, 5)) {
        for (let i = 0; i < 30; i++) {
          el.scrollTop += 500;
          await sleep(150);
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) break;
        }
      }
      window.scrollTo(0, 0);
    });
    await sleep(1_000);
    const galBatch = await collectPagePhotos(page);
    photos.push(...galBatch);
    // Navigate back to the main hotel page so the rooms table can be loaded.
    await page.goto(mainUrl, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await sleep(1_000);
  } catch {}

  // Merge in everything captured at the network level so we don't miss any
  // image Booking lazily fetched while scrolling/navigating the gallery.
  photos.push(...networkPhotos);
  photos = dedupe(photos.map(maxRes)).filter(isBstatic);

  // ── Submit availability form to load the room table ───────────────────────
  // The room table (hprt-table) only appears after "Check availability" is submitted
  await page.waitForLoadState("domcontentloaded", { timeout: 10_000 }).catch(() => {});
  let hprtLoaded = false;
  try {
    hprtLoaded = !!await page.$("#hprt-table");
  } catch {
    await sleep(1_000);
    try { hprtLoaded = !!await page.$("#hprt-table"); } catch {}
  }
  if (!hprtLoaded) {
    try {
      // Scroll to and click "Check availability" button
      const checkBtn = page.locator('button:has-text("Check availability"), input[value="Check availability"], .availability-search__search--button, #availability_search_submit').first();
      await checkBtn.scrollIntoViewIfNeeded({ timeout: 3_000 });
      await checkBtn.click({ timeout: 3_000 });
      // Wait up to 12s for the room table to appear
      await page.waitForSelector("#hprt-table, .hprt-table", { timeout: 12_000 });
      hprtLoaded = true;
    } catch {
      // Some hotels have no availability table (fully booked or different layout)
    }
  }
  await sleep(1_000);

  // ── Parse rooms table ───────────────────────────────────────────────────────
  const rawRooms: RawRoom[] = await page.evaluate(() => {
    const rooms: any[] = [];
    const seen = new Set<string>();
    const table = document.getElementById("hprt-table") ?? document.querySelector(".hprt-table");
    if (!table) return rooms;

    table.querySelectorAll<HTMLElement>(
      "tr.hprt-table-block-click, tr[data-block-id], .js-hprt-room-block, .hprt-table-row"
    ).forEach(row => {
      const nameEl =
        row.querySelector(".hprt-roomtype-icon-link") ??
        row.querySelector("[data-testid='room-name']") ??
        row.querySelector(".room-link");
      const name = nameEl?.textContent?.trim();
      if (!name || seen.has(name)) return;
      seen.add(name);

      const priceEl =
        row.querySelector(".prco-valign-middle-helper strong") ??
        row.querySelector(".bui-price-display__value");
      const priceUsd = parseFloat(priceEl?.textContent?.replace(/[^\d.]/g, "") ?? "0") || 0;

      const origEl =
        row.querySelector(".prco-group-nobr-helper del") ??
        row.querySelector(".prco-prev-price") ??
        row.querySelector("del");
      const originalPriceUsd = parseFloat(origEl?.textContent?.replace(/[^\d.]/g, "") ?? "") || null;

      const bedsEl = row.querySelector(".hprt-roomtype-bed, [data-testid='bed-type']");
      const beds   = bedsEl?.textContent?.trim() ?? "";

      const guestEl = row.querySelector(".hprt-occupancy-occupancy-info");
      const maxGuests = parseInt(guestEl?.textContent?.match(/\d+/)?.[0] ?? "2") || 2;

      const sizeMatch = (row.textContent ?? "").match(/([\d.]+)\s*m²/);
      const sizeSqm   = sizeMatch ? parseFloat(sizeMatch[1]) : null;

      const amenEls   = row.querySelectorAll(".hprt-facilities-block li, .hprt-facility");
      const amenities = Array.from(amenEls).map(el => el.textContent?.trim()).filter((s): s is string => !!s && s.length > 1);

      const imgEl  = row.querySelector<HTMLImageElement>("img[src*='bstatic.com']");
      const thumbUrl = imgEl?.src ?? imgEl?.getAttribute("data-src") ?? null;

      // Number of available units of this room type. Booking renders a
      // <select name="nr_rooms_xxx"> with one <option> per available count.
      let unitsTotal: number | null = null;
      const selectEl = row.querySelector<HTMLSelectElement>("select[name^='nr_rooms_']");
      if (selectEl) {
        const opts = Array.from(selectEl.querySelectorAll("option"))
          .map(o => parseInt(o.getAttribute("value") ?? o.textContent ?? "0"))
          .filter(n => Number.isFinite(n) && n > 0);
        if (opts.length) unitsTotal = Math.max(...opts);
      }
      if (unitsTotal == null) {
        // "Only X left" or "X rooms left" text
        const leftMatch = (row.textContent ?? "").match(/(\d+)\s+(?:rooms?|left)/i);
        if (leftMatch) unitsTotal = parseInt(leftMatch[1]);
      }

      // Per-room description (Booking embeds a short "What this room offers" body)
      const descEl =
        row.querySelector(".hprt-roomtype-bed + .hprt-roomtype-link-content") ??
        row.querySelector(".roomtype-info") ??
        row.querySelector("[data-testid='room-description']");
      const description = descEl ? (descEl.textContent ?? "").replace(/\s+/g, " ").trim() : null;

      rooms.push({ name, beds, maxGuests, sizeSqm, priceUsd, originalPriceUsd, unitsTotal, description, amenities, thumbUrl });
    });
    return rooms;
  });

  // ── Per-room photos ─────────────────────────────────────────────────────────
  const roomPhotos: Record<string, string[]> = {};
  for (const room of rawRooms) {
    const rp: string[] = [];
    if (room.thumbUrl && isBstatic(room.thumbUrl)) rp.push(maxRes(room.thumbUrl));

    try {
      const link = page.locator(
        `.hprt-roomtype-icon-link:has-text("${room.name.replace(/"/g, "")}")`,
      ).first();
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
      await page.evaluate(() =>
        document.getElementById("hprt-table")?.scrollIntoView({ behavior: "smooth", block: "center" })
      );
      await sleep(800);
    } catch {}

    roomPhotos[room.name] = dedupe(rp);
  }

  return {
    ...hotelInfo,
    photos,
    rooms: rawRooms.map(r => ({ ...r, photos: roomPhotos[r.name] ?? [] })),
    source: "booking.com",
  };
}

// ─── Save to database ─────────────────────────────────────────────────────────
async function saveToDb(store: Store, data: ScrapedHotel) {
  const uploadCache = new Map<string, string>();
  const rooms = dedupeRooms(data.rooms);
  const galleryUrls = UPLOAD_MEDIA
    ? await uploadBookingImages(data.photos.map(maxRes).filter(isBstatic), store.id, "gallery", uploadCache)
    : data.photos.map(maxRes).filter(isBstatic);

  // store_profiles
  const patch: Record<string, unknown> = {};
  if (galleryUrls.length > 0) {
    // Normalise to the high-res /max1280x900/ variant so the cover image
    // looks good on the detail page. Falls back to the raw URL if it
    // doesn't match the pattern.
    const hero = galleryUrls[0];
    patch.banner_url     = hero;
    // Profile picture: a square crop of the first photo so avatars/list-cards
    // render correctly. Booking's CDN supports /square240/ out of the box.
    patch.logo_url       = UPLOAD_MEDIA ? hero : hero.replace(/\/max\d+(?:x\d+)?\//, "/square240/");
    patch.gallery_images = galleryUrls.map((url, i) => ({ url, caption: store.name, order: i, source: "booking.com" }));
  }
  if (data.description) patch.description = data.description;
  if (data.phone)       patch.phone       = data.phone;
  if (data.rating)      patch.rating      = data.rating;
  if (data.address && !store.address)   patch.address     = data.address;
  // Flip setup_complete once we have a banner + at least one room — the bulk
  // pipeline counts as the property having been "set up".
  if (data.photos.length > 0 && rooms.length > 0) patch.setup_complete = true;

  if (Object.keys(patch).length > 0) {
    const { error } = await supabase.from("store_profiles").update(patch).eq("id", store.id);
    if (error) throw new Error(`store_profiles: ${error.message}`);
  }

  // lodge_property_profile — only write fields we actually have. NO hardcoded
  // fallback facilities; an empty list is better than misleading fake data.
  // Under --force, always include every field (even empty) so the upsert
  // overwrites any stale data from previous runs (e.g. the old hardcoded
  // 12-facility list).
  const lppPatch: Record<string, unknown> = { store_id: store.id };
  if (FORCE || data.facilities.length > 0)        lppPatch.facilities          = data.facilities;
  if (FORCE || data.popular_amenities.length > 0) lppPatch.popular_amenities   = data.popular_amenities;
  if (data.checkIn)                               lppPatch.check_in_from       = data.checkIn;
  if (data.checkOut)                              lppPatch.check_out_until     = data.checkOut;
  if (FORCE || data.cancellation_policy)          lppPatch.cancellation_policy = data.cancellation_policy ?? null;
  if (FORCE || Object.keys(data.property_highlights).length > 0)
    lppPatch.property_highlights = data.property_highlights;
  if (FORCE || Object.keys(data.house_rules).length > 0)
    lppPatch.house_rules = data.house_rules;
  if (FORCE || data.description_sections.length > 0)
    lppPatch.description_sections = data.description_sections;

  const { error: e2 } = await supabase.from("lodge_property_profile").upsert(
    lppPatch, { onConflict: "store_id", ignoreDuplicates: false },
  );
  if (e2) throw new Error(`lodge_property_profile: ${e2.message}`);

  // lodge_rooms
  if (rooms.length > 0) {
    const { error: deleteError } = await supabase.from("lodge_rooms").delete().eq("store_id", store.id);
    if (deleteError) throw new Error(`lodge_rooms delete: ${deleteError.message}`);
    const rows = [];
    for (let i = 0; i < rooms.length; i++) {
      const r = rooms[i];
      const n = r.name.toLowerCase();
      const roomType =
        n.includes("penthouse") ? "penthouse" :
        n.includes("suite")     ? "suite" :
        n.includes("executive") ? "executive" :
        n.includes("deluxe")    ? "deluxe" :
        n.includes("superior")  ? "superior" :
        "standard";
      // Pricing: priceUsd is the displayed sale price. If originalPriceUsd is
      // present and higher, the difference is the discount; we store both.
      const base = Math.round(r.priceUsd * 100);
      const orig = r.originalPriceUsd ? Math.round(r.originalPriceUsd * 100) : null;
      const roomPhotoUrls = UPLOAD_MEDIA
        ? await uploadBookingImages(((r as any).photos ?? []).map(maxRes).filter(isBstatic), store.id, "rooms", uploadCache)
        : ((r as any).photos ?? []);
      rows.push({
        store_id:            store.id,
        name:                r.name,
        room_type:           roomType,
        beds:                r.beds || null,
        max_guests:          r.maxGuests,
        size_sqm:            r.sizeSqm,
        units_total:         r.unitsTotal ?? 1,
        base_rate_cents:     base,
        original_rate_cents: orig && orig > base ? orig : null,
        breakfast_included:  /breakfast/i.test(r.description ?? "") || r.amenities.some(a => /breakfast/i.test(a)),
        badges:              orig && orig > base ? [`-${Math.round((1 - base / orig) * 100)}%`, "Booking.com rate"] : ["Booking.com rate"],
        description:         r.description,
        amenities:           r.amenities,
        photos:              roomPhotoUrls.map((url, order) => ({ url, caption: r.name, order, source: "booking.com" })),
        sort_order:          i,
        is_active:           true,
      });
    }
    const { error: e3 } = await supabase.from("lodge_rooms").insert(rows);
    if (e3) throw new Error(`lodge_rooms: ${e3.message}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\nZIVO Booking.com Bulk Scraper");
  console.log("==============================");
  if (DRY_RUN)    console.log("** DRY RUN — no database writes **");
  if (ROOMS_ONLY) console.log("** ROOMS ONLY mode **");
  console.log(`start=${START}  limit=${LIMIT ?? "all"}  force=${FORCE}  store-id=${STORE_ID ?? "—"}  store-ids=${STORE_IDS.size || "—"}  booking-url=${BOOKING_URL ? "yes" : "—"}  owner=${OWNER_ID ?? "—"}  categories=${TARGET_CATEGORIES.join(",")}\n`);

  // Load all eligible stores
  const all: Store[] = [];
  const PAGE_SIZE = 200;

  if (STORE_ID) {
    // Single-store mode (testing) — fetch just this one row regardless of banner state
    const { data, error } = await supabase
      .from("store_profiles")
      .select("id,name,address,banner_url,logo_url,description")
      .eq("id", STORE_ID)
      .maybeSingle();
    if (error) { console.error(error.message); process.exit(1); }
    if (!data) { console.error(`store-id ${STORE_ID} not found`); process.exit(1); }
    all.push(data as Store);
  } else if (STORE_IDS.size > 0) {
    const ids = [...STORE_IDS];
    for (let i = 0; i < ids.length; i += PAGE_SIZE) {
      const chunk = ids.slice(i, i + PAGE_SIZE);
      const { data, error } = await supabase
        .from("store_profiles")
        .select("id,name,address,banner_url,logo_url,description")
        .in("id", chunk)
        .order("name");
      if (error) { console.error(error.message); process.exit(1); }
      all.push(...((data ?? []) as Store[]));
    }
  } else {
    for (let p = 0; ; p++) {
      let q = supabase
        .from("store_profiles")
        .select("id,name,address,banner_url,logo_url,description")
        .in("category", TARGET_CATEGORIES)
        .order("name")
        .range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1);
      if (!FORCE && !ROOMS_ONLY) q = q.or("banner_url.is.null,logo_url.is.null");
      if (OWNER_ID) q = q.eq("owner_id", OWNER_ID);
      const { data, error } = await q;
      if (error) { console.error(error.message); process.exit(1); }
      if (!data?.length) break;
      all.push(...(data as Store[]));
      if (data.length < PAGE_SIZE) break;
    }
  }

  const queue = all.slice(START, LIMIT != null ? START + LIMIT : undefined);
  console.log(`Eligible: ${all.length}  Processing: ${queue.length}\n`);
  const knownBookingUrls = loadKnownBookingUrlMap();

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
  // String-form init script bypasses tsx/esbuild's __name wrapper so
  // page.evaluate callbacks can reference __name without ReferenceError.
  await context.addInitScript({
    content: `
      globalThis.__name = globalThis.__name || ((fn) => fn);
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      window.chrome = { runtime: {} };
    `,
  });

  const page = await context.newPage();

  // First, accept cookies by visiting Booking.com home
  console.log("Initialising Booking.com session…");
  try {
    await page.goto("https://www.booking.com/?lang=en-us", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await sleep(2_000);
    await dismissOverlays(page);
  } catch (e) {
    console.warn(`  (Booking.com home init skipped: ${(e as Error).message})`);
  }
  console.log("Ready.\n");

  const results: Array<{
    id: string; name: string; status: string;
    photos: number; rooms: number; bookingUrl: string | null; error?: string;
  }> = [];
  let updated = 0, notFound = 0, errors = 0;

  for (let i = 0; i < queue.length; i++) {
    const store = queue[i];
    console.log(`[${i + 1 + START}/${all.length}] ${store.name}`);

    let bookingUrl: string | null = null;
    try {
      // Step 1: find Booking.com page. Prefer explicit URLs captured during
      // discovery/import, then fall back to fuzzy name/city search.
      bookingUrl = STORE_ID && BOOKING_URL
        ? normalizeBookingUrl(BOOKING_URL)
        : bookingUrlFromStore(store) || knownBookingUrls.get(store.id) || null;
      if (bookingUrl) {
        console.log(`  Using stored Booking.com URL…`);
      } else {
        console.log(`  Searching Booking.com…`);
        bookingUrl = await findBookingUrl(page, store);
      }

      if (!bookingUrl) {
        console.log(`  ✗ Not found on Booking.com\n`);
        results.push({ id: store.id, name: store.name, status: "not_found", photos: 0, rooms: 0, bookingUrl: null });
        notFound++;
        continue;
      }
      console.log(`  Found: ${bookingUrl}`);

      // Step 2: scrape detail page
      console.log(`  Scraping…`);
      const data = await scrapeHotelPage(page, bookingUrl);
      console.log(`  Photos: ${data.photos.length} | Rooms: ${data.rooms.length} | Check-in: ${data.checkIn ?? "—"}`);

      data.rooms.forEach(r =>
        console.log(`    ${r.name.padEnd(38)} $${(r.priceUsd).toFixed(0)}/night${r.originalPriceUsd ? ` (was $${r.originalPriceUsd.toFixed(0)})` : ""} | ${(r as any).photos?.length ?? 0} photos`)
      );

      // Step 3: save
      if (!DRY_RUN) {
        try {
          await saveToDb(store, data);
        } catch (e: any) {
          // If the admin user's JWT expired mid-run, refresh it once and retry.
          if (/JWT expired|invalid JWT|invalid token/i.test(e.message)) {
            const ok = await refreshUserJwt();
            if (ok) {
              await saveToDb(store, data);
            } else {
              throw e;
            }
          } else {
            throw e;
          }
        }
        console.log(`  ✓ Saved`);
      } else {
        console.log(`  [dry-run] skipping save`);
      }

      results.push({ id: store.id, name: store.name, status: "updated", photos: data.photos.length, rooms: data.rooms.length, bookingUrl });
      updated++;
    } catch (err: any) {
      console.error(`  ✗ Error: ${err.message}`);
      results.push({ id: store.id, name: store.name, status: "error", photos: 0, rooms: 0, bookingUrl, error: err.message });
      errors++;
    }

    console.log();
    await sleep(PROP_DELAY);
  }

  await browser.close();

  console.log(`\n===== Done =====`);
  console.log(`Updated  : ${updated}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Errors   : ${errors}`);
  console.log(`Total    : ${queue.length}`);

  writeFileSync(LOG_PATH, JSON.stringify({
    run_at: new Date().toISOString(),
    flags: { START, LIMIT, FORCE, DRY_RUN, ROOMS_ONLY, STORE_IDS: STORE_IDS.size, TARGET_CATEGORIES },
    summary: { total: queue.length, updated, not_found: notFound, errors },
    results,
  }, null, 2));
  console.log(`\nLog → ${LOG_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
