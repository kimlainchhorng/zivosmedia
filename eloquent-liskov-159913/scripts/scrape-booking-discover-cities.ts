/**
 * Booking.com → ZIVO Lightweight City Discovery Scraper
 *
 * Paginates Booking.com search results for one or more cities, dedupes against
 * existing lodging stores (case-insensitive match within the same city), and
 * INSERTS the new ones as minimal store_profiles rows with banner_url=NULL so
 * that scrape-booking-bulk.ts can pick them up afterwards and fill in
 * photos/rooms/prices/etc.
 *
 * Auth mirrors scrape-booking-bulk.ts — prefers SUPABASE_SERVICE_ROLE_KEY but
 * supports admin user JWT + anon key (with refresh token rotation) sourced
 * from ./.scrape-session.local.
 *
 * Usage:
 *   set -a && . ./.scrape-session.local && set +a && \
 *   node --experimental-strip-types --no-warnings \
 *     scripts/scrape-booking-discover-cities.ts \
 *     --cities="Siem Reap,Phnom Penh,Sihanoukville,Kampot,Kep" \
 *     --per-city=100 \
 *     --log=booking-discover-$(date +%F-%H%M).json
 *
 * Options:
 *   --cities=CSV     Comma-separated city names (must match CAMBODIA_CITIES below)
 *   --per-city=N     Max NEW rows to insert per city (default 100)
 *   --dry-run        Scrape but don't write to database
 *   --headless       Run Playwright headless (default: headful)
 *   --log=PATH       JSON results log path
 */

import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import type { Page, BrowserContext } from "@playwright/test";

// ─── Auth (same dual-mode as scrape-booking-bulk.ts) ─────────────────────────
const SUPABASE_URL  = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON_KEY      = process.env.SUPABASE_ANON_KEY;
const USER_JWT_ENV  = process.env.SUPABASE_USER_JWT;
const USER_REFRESH_ENV = process.env.SUPABASE_USER_REFRESH;

if (!SUPABASE_URL || (!SERVICE_KEY && !(USER_JWT_ENV && ANON_KEY))) {
  console.error(
    "Missing credentials. Provide either:\n" +
      "  SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY, or\n" +
      "  SUPABASE_URL + SUPABASE_ANON_KEY + SUPABASE_USER_JWT (admin user)"
  );
  process.exit(1);
}

let activeJwt: string | undefined = USER_JWT_ENV;
let activeRefresh: string | undefined = USER_REFRESH_ENV;

function buildClient() {
  if (SERVICE_KEY) return createClient(SUPABASE_URL!, SERVICE_KEY);
  return createClient(SUPABASE_URL!, ANON_KEY!, {
    global: { headers: { Authorization: `Bearer ${activeJwt}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

let supabase = buildClient();

async function refreshUserJwt(): Promise<boolean> {
  if (SERVICE_KEY) return true;
  if (!activeRefresh) return false;
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
    if (!res.ok) return false;
    const json = await res.json() as { access_token: string; refresh_token: string };
    activeJwt = json.access_token;
    activeRefresh = json.refresh_token;
    supabase = buildClient();
    console.log("  (admin JWT refreshed)");
    return true;
  } catch {
    return false;
  }
}

async function withJwtRetry<T>(op: () => Promise<{ data: T | null; error: any }>): Promise<{ data: T | null; error: any }> {
  let res = await op();
  if (res.error && /jwt/i.test(res.error.message ?? "") && /expired/i.test(res.error.message ?? "")) {
    if (await refreshUserJwt()) res = await op();
  }
  return res;
}

console.log(
  SERVICE_KEY
    ? "Auth: service_role (full bypass)"
    : "Auth: admin user JWT (RLS applies, auto-refresh)"
);

// ─── CLI flags ────────────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const getStr = (k: string, d: string | null = null) => {
  const f = args.find(a => a.startsWith(`--${k}=`));
  return f ? f.split("=").slice(1).join("=") : d;
};
const getInt = (k: string, d: number | null = null) => {
  const v = getStr(k);
  return v ? parseInt(v) : d;
};

const CITIES_CSV = getStr("cities", "Siem Reap,Phnom Penh,Sihanoukville,Kampot,Kep")!;
const PER_CITY   = getInt("per-city", 100)!;
const DRY_RUN    = args.includes("--dry-run");
const HEADLESS   = args.includes("--headless");
const LOG_PATH   = getStr("log", `booking-discover-${new Date().toISOString().slice(0,10)}.json`)!;

const OWNER_ID = "2e0e7bfe-edda-4369-8c87-3ad82bb52b1d";

// Dates only used for URL params (search rankings can depend on them)
const CHECKIN  = "2026-05-22";
const CHECKOUT = "2026-05-23";

const CAMBODIA_CITIES: Array<{ name: string; dest: string; lat: number; lng: number }> = [
  { name: "Phnom Penh",     dest: "Phnom+Penh%2C+Cambodia",    lat: 11.5564, lng: 104.9282 },
  { name: "Siem Reap",      dest: "Siem+Reap%2C+Cambodia",     lat: 13.3671, lng: 103.8448 },
  { name: "Sihanoukville",  dest: "Sihanoukville%2C+Cambodia", lat: 10.6250, lng: 103.5220 },
  { name: "Kampot",         dest: "Kampot%2C+Cambodia",        lat: 10.5966, lng: 104.1686 },
  { name: "Kep",            dest: "Kep%2C+Cambodia",           lat: 10.4830, lng: 104.3162 },
  { name: "Battambang",     dest: "Battambang%2C+Cambodia",    lat: 13.0957, lng: 103.2022 },
  { name: "Koh Kong",       dest: "Koh+Kong%2C+Cambodia",      lat: 11.6166, lng: 102.9836 },
];

const requestedCities = CITIES_CSV.split(",").map(s => s.trim()).filter(Boolean);
const cities = requestedCities
  .map(name => CAMBODIA_CITIES.find(c => c.name.toLowerCase() === name.toLowerCase()))
  .filter((c): c is typeof CAMBODIA_CITIES[number] => !!c);

if (cities.length === 0) {
  console.error(`No matching cities. Requested: ${requestedCities.join(", ")}`);
  console.error(`Available: ${CAMBODIA_CITIES.map(c => c.name).join(", ")}`);
  process.exit(1);
}

const LODGING_CATS = ["hotel","resort","guesthouse","hostel","villa","lodge","motel","inn","boutique"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, " ").replace(/\s+/g, " ").trim();
}

function toSlug(name: string): string {
  return name.toLowerCase()
    .replace(/[&]/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
}

function guessCategory(name: string): "hotel" | "resort" {
  const n = name.toLowerCase();
  if (n.includes("resort")) return "resort";
  return "hotel";
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
    ".bui-button--secondary",
  ]) {
    try { await page.click(sel, { timeout: 1_000 }); break; } catch {}
  }
  await page.keyboard.press("Escape").catch(() => {});
}

// ─── Booking.com search result extraction ────────────────────────────────────
interface CardListing {
  name:      string;
  bookingUrl: string;
  rating:    number | null;
  reviewScore: number | null;
  address:   string;
}

async function extractCards(page: Page): Promise<CardListing[]> {
  return page.evaluate(() => {
    const cards = document.querySelectorAll('[data-testid="property-card"]');
    return Array.from(cards).map(card => {
      const nameEl    = card.querySelector('[data-testid="title"]');
      const linkEl    = card.querySelector<HTMLAnchorElement>('a[data-testid="title-link"]');
      const addrEl    = card.querySelector('[data-testid="address"]');
      const scoreEl   = card.querySelector('[data-testid="review-score"]');
      let reviewScore: number | null = null;
      if (scoreEl) {
        const m = (scoreEl.textContent ?? "").match(/(\d+(?:\.\d+)?)/);
        if (m) reviewScore = parseFloat(m[1]);
      }
      let rating: number | null = null;
      const starEl = card.querySelector('[data-testid="rating-stars"], [aria-label*="out of 5"], [data-testid="rating-squares"]');
      if (starEl) {
        const al = starEl.getAttribute("aria-label") ?? "";
        const sm = al.match(/(\d+)\s*out of 5/);
        if (sm) rating = parseInt(sm[1]);
        else rating = starEl.querySelectorAll('svg, span.fcd9eec8fb').length || null;
      }
      return {
        name:        nameEl?.textContent?.trim() ?? "",
        bookingUrl:  linkEl?.href ?? "",
        rating,
        reviewScore,
        address:     addrEl?.textContent?.trim() ?? "",
      };
    }).filter(h => h.name && h.bookingUrl);
  });
}

/**
 * Load Booking.com search results for a city using infinite-scroll + Load more
 * button. Booking's URL `offset=N` is not reliable (often returns the same first
 * 25 results), so we accumulate by scrolling/clicking until no growth.
 */
async function scrapeCityAllResults(
  page: Page,
  city: typeof CAMBODIA_CITIES[number],
  targetCount: number,
  log: (msg: string) => void,
): Promise<CardListing[]> {
  const url = `https://www.booking.com/searchresults.html?ss=${city.dest}&checkin=${CHECKIN}&checkout=${CHECKOUT}&lang=en-us&group_adults=2&no_rooms=1&dest_type=city&order=popularity`;
  try {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    await sleep(3_000);
    await dismissOverlays(page);
  } catch (e) {
    log(`  page load error: ${(e as Error).message.slice(0,80)}`);
    return [];
  }

  // Keep accumulating cards by scrolling + clicking "Load more results".
  // Stop when count plateaus, target reached, or hard cap.
  const MAX_ROUNDS = 60;
  let prevCount = 0;
  let plateau = 0;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    // Scroll to bottom to trigger lazy load
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await sleep(800);

    // Try to click any "Load more results" style button
    let clicked = false;
    for (const sel of [
      'button:has-text("Load more results")',
      'button:has-text("Show more results")',
      '[data-testid="load-more"]',
      'button.dba1b3bddf:has-text("Load more")',
    ]) {
      try {
        const btn = page.locator(sel).first();
        if (await btn.isVisible({ timeout: 800 })) {
          await btn.scrollIntoViewIfNeeded({ timeout: 1_500 });
          await btn.click({ timeout: 2_500 });
          clicked = true;
          await sleep(1_800);
          break;
        }
      } catch {}
    }

    const count = await page.evaluate(() => document.querySelectorAll('[data-testid="property-card"]').length);
    if (round === 0 || round % 5 === 0 || count !== prevCount) {
      log(`    [scroll ${round.toString().padStart(2)}] cards=${count}${clicked ? " (clicked)" : ""}`);
    }
    if (count >= targetCount + 200) break; // plenty of headroom for dedup
    if (count === prevCount) {
      plateau++;
      if (plateau >= 3) break;
    } else {
      plateau = 0;
    }
    prevCount = count;
  }

  const cards = await extractCards(page);
  log(`    total cards collected: ${cards.length}`);
  return cards;
}

function cleanBookingUrl(raw: string): string | null {
  try {
    const u = new URL(raw);
    return `${u.origin}${u.pathname}?selected_currency=USD&lang=en-us&checkin=${CHECKIN}&checkout=${CHECKOUT}&group_adults=2&no_rooms=1`;
  } catch {
    return null;
  }
}

// ─── DB helpers ──────────────────────────────────────────────────────────────
async function loadExistingForCity(cityName: string): Promise<Set<string>> {
  // Pull lodging stores whose address contains the city name (case-insensitive)
  const set = new Set<string>();
  let page = 0;
  while (true) {
    const { data, error } = await withJwtRetry(() =>
      supabase.from("store_profiles")
        .select("name,address")
        .in("category", LODGING_CATS)
        .ilike("address", `%${cityName}%`)
        .range(page * 500, page * 500 + 499)
    );
    if (error) {
      console.warn(`  (existing-lookup error for ${cityName}: ${error.message})`);
      break;
    }
    const rows = (data as Array<{ name: string; address: string | null }>) ?? [];
    rows.forEach(r => set.add(normalizeName(r.name)));
    if (rows.length < 500) break;
    page++;
  }
  // Also pull rows with no address but maybe seeded with the city (fallback)
  return set;
}

async function loadAllSlugs(): Promise<Set<string>> {
  const set = new Set<string>();
  let page = 0;
  while (true) {
    const { data, error } = await withJwtRetry(() =>
      supabase.from("store_profiles")
        .select("slug")
        .range(page * 1000, page * 1000 + 999)
    );
    if (error) break;
    const rows = (data as Array<{ slug: string }>) ?? [];
    rows.forEach(r => set.add(r.slug));
    if (rows.length < 1000) break;
    page++;
  }
  return set;
}

function makeUniqueSlug(name: string, taken: Set<string>): string {
  const base = toSlug(name) || `lodging-${Date.now()}`;
  if (!taken.has(base)) { taken.add(base); return base; }
  for (let i = 2; i < 999; i++) {
    const cand = `${base}-${i}`.slice(0, 64);
    if (!taken.has(cand)) { taken.add(cand); return cand; }
  }
  const fallback = `${base}-${Date.now().toString(36)}`;
  taken.add(fallback);
  return fallback;
}

async function insertRow(args: {
  name: string;
  cityName: string;
  cityLat: number;
  cityLng: number;
  rating: number | null;
  bookingUrl: string;
  slug: string;
}): Promise<{ id: string } | { error: string }> {
  const row: Record<string, unknown> = {
    name:          args.name,
    slug:          args.slug,
    category:      guessCategory(args.name),
    market:        "KH",
    address:       `${args.cityName}, Cambodia`,
    latitude:      args.cityLat,
    longitude:     args.cityLng,
    rating:        args.rating ?? 4.5,
    banner_url:    null,
    is_active:     true,
    setup_complete: false,
    payment_types: ["cash", "card"],
    owner_id:      OWNER_ID,
    description:   `Booking URL: ${args.bookingUrl}`,
  };
  const { data, error } = await withJwtRetry(() =>
    supabase.from("store_profiles").insert(row).select("id").single()
  );
  if (error) return { error: error.message };
  return { id: (data as { id: string }).id };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
type CandidateRecord = CardListing & {
  cityName: string;
  cityLat: number;
  cityLng: number;
  cleanUrl: string;
  slug?: string;
  status?: "added" | "skipped-existing" | "skipped-dup-this-run" | "error" | "dry-run";
  storeId?: string;
  error?: string;
};

async function main() {
  console.log("\nZIVO Booking.com City Discovery");
  console.log("================================");
  if (DRY_RUN) console.log("** DRY RUN — no database writes **");
  console.log(`Cities:   ${cities.map(c => c.name).join(", ")}`);
  console.log(`Per-city: ${PER_CITY}`);
  console.log(`Log:      ${LOG_PATH}\n`);

  const allSlugs = await loadAllSlugs();
  console.log(`Loaded ${allSlugs.size} existing slugs.`);

  const browser = await chromium.launch({
    headless: HEADLESS,
    args: ["--disable-blink-features=AutomationControlled", "--no-sandbox"],
  });
  const context: BrowserContext = await browser.newContext({
    userAgent: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    viewport: { width: 1400, height: 900 },
    locale: "en-US",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    // @ts-ignore
    window.chrome = { runtime: {} };
  });
  const page = await context.newPage();

  console.log("Initialising Booking.com session…");
  await page.goto("https://www.booking.com/?lang=en-us", { waitUntil: "domcontentloaded", timeout: 30_000 });
  await sleep(2_000);
  await dismissOverlays(page);
  console.log("Ready.\n");

  // PHASE 1: collect candidate listings for every city
  const candidates: CandidateRecord[] = [];
  const seenThisRun = new Set<string>(); // normalized name across all cities (chains)

  for (const city of cities) {
    console.log(`── ${city.name} ───────────────────────────`);
    const existing = await loadExistingForCity(city.name);
    console.log(`  Existing in ${city.name}: ${existing.size}`);

    const cards = await scrapeCityAllResults(page, city, PER_CITY, m => console.log(m));

    let cityCollected = 0;
    let dupExisting = 0, dupThisRun = 0, badUrl = 0;
    for (const card of cards) {
      if (cityCollected >= PER_CITY) break;
      const norm = normalizeName(card.name);
      if (!norm) continue;
      if (existing.has(norm))                          { dupExisting++; continue; }
      if (seenThisRun.has(`${city.name}|${norm}`))     { dupThisRun++;  continue; }
      const clean = cleanBookingUrl(card.bookingUrl);
      if (!clean)                                      { badUrl++;      continue; }
      seenThisRun.add(`${city.name}|${norm}`);
      candidates.push({
        ...card,
        cityName: city.name,
        cityLat:  city.lat,
        cityLng:  city.lng,
        cleanUrl: clean,
        status:   undefined,
      });
      cityCollected++;
    }
    console.log(`  ${city.name}: cards=${cards.length}  new=${cityCollected}  skipped(existing=${dupExisting}, dup-this-run=${dupThisRun}, bad-url=${badUrl})\n`);
  }

  console.log(`\n=== Discovery summary ===`);
  console.log(`Total new candidates across all cities: ${candidates.length}`);
  const byCity = cities.map(c => {
    const n = candidates.filter(x => x.cityName === c.name).length;
    return `  ${c.name}: ${n}`;
  }).join("\n");
  console.log(byCity);
  console.log();

  if (DRY_RUN) {
    candidates.forEach(c => c.status = "dry-run");
    await browser.close();
    writeFileSync(LOG_PATH, JSON.stringify(candidates, null, 2));
    console.log(`Log → ${LOG_PATH}`);
    return;
  }

  // PHASE 2: insert
  console.log(`Inserting ${candidates.length} new rows…`);
  let added = 0, errored = 0;
  for (const c of candidates) {
    const slug = makeUniqueSlug(c.name, allSlugs);
    c.slug = slug;
    const res = await insertRow({
      name:       c.name,
      cityName:   c.cityName,
      cityLat:    c.cityLat,
      cityLng:    c.cityLng,
      rating:     c.rating,
      bookingUrl: c.cleanUrl,
      slug,
    });
    if ("id" in res) {
      c.status = "added";
      c.storeId = res.id;
      added++;
      if (added % 25 === 0) console.log(`  …${added}/${candidates.length}`);
    } else {
      c.status = "error";
      c.error = res.error;
      errored++;
      console.log(`  ✗ ${c.name} (${c.cityName}): ${res.error.slice(0, 80)}`);
    }
  }

  await browser.close();

  console.log(`\n===== Done =====`);
  console.log(`Added:   ${added}`);
  console.log(`Errored: ${errored}`);
  writeFileSync(LOG_PATH, JSON.stringify(candidates, null, 2));
  console.log(`Log → ${LOG_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
