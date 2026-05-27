/**
 * Hotel Data Auto-Import Script
 *
 * For every lodging in store_profiles:
 *   1. Finds the hotel's own website (via DuckDuckGo)
 *   2. Scrapes full photo gallery + thumbnails from the hotel site
 *   3. Finds the Facebook page → gets profile photo (logo_url)
 *   4. Falls back to TripAdvisor for ratings, description, and facilities
 *   5. Writes everything to store_profiles + lodge_property_profile
 *
 * Usage:
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *     bun scripts/import-hotel-data.ts [options]
 *
 * Options:
 *   --start=N    Skip first N properties (resume from N)
 *   --limit=N    Process at most N properties
 *   --force      Re-process even if already filled
 *   --dry-run    Fetch and log but don't write to database
 *   --log=PATH   JSON results log path (default: import-results-DATE.json)
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

// --- CLI ---
const args = process.argv.slice(2);
const getInt = (name: string, def: number | null = null) => {
  const f = args.find(a => a.startsWith(`--${name}=`));
  return f ? parseInt(f.split("=")[1], 10) : def;
};
const getStr = (name: string, def: string | null = null) => {
  const f = args.find(a => a.startsWith(`--${name}=`));
  return f ? f.split("=").slice(1).join("=") : def;
};

const START   = getInt("start", 0)!;
const LIMIT   = getInt("limit");
const FORCE   = args.includes("--force");
const DRY_RUN = args.includes("--dry-run");
const LOG_PATH = getStr("log") ?? `import-results-${new Date().toISOString().slice(0, 10)}.json`;

// --- Config ---
const REQ_DELAY  = 2500;   // ms between requests to same host
const PROP_DELAY = 7000;   // ms between properties
const TIMEOUT_MS = 25000;
const MAX_RETRIES = 2;

const LODGING_CATS = ["hotel","resort","guesthouse","hostel","villa","lodge","motel","inn","boutique"];

// Booking sites to skip when looking for the hotel's own website
const BOOKING_DOMAINS = [
  "booking.com","tripadvisor.com","agoda.com","hotels.com","expedia.com",
  "airbnb.com","trip.com","trivago.com","kayak.com","priceline.com",
  "traveloka.com","klook.com","cloudbeds.com","hostelworld.com",
];

const HEADERS: Record<string, string> = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

// --- Types ---
interface Property {
  id: string;
  name: string;
  address: string | null;
  rating: number | null;
  banner_url: string | null;
  logo_url: string | null;
  category: string | null;
  description: string | null;
  phone: string | null;
}

interface HotelData {
  photos: string[];          // full-size gallery photos
  logoUrl: string | null;    // profile/thumbnail photo
  rating: number | null;
  description: string | null;
  facilities: string[];
  checkIn: string | null;
  checkOut: string | null;
  phone: string | null;
  source: string;
}

interface GalleryImage { url: string; caption: string; order: number; }

// --- Utilities ---
const sleep = (ms: number) => new Promise<void>(r => setTimeout(r, ms));

function extractCity(address: string | null): string {
  if (!address) return "Cambodia";
  const parts = address.split(",").map(p => p.trim()).filter(Boolean);
  const filtered = parts.filter(p => !p.toLowerCase().includes("cambodia"));
  return filtered.length >= 2 ? filtered[filtered.length - 2]
       : filtered.length >= 1 ? filtered[filtered.length - 1]
       : "Cambodia";
}

function dedupe(urls: string[]): string[] {
  const seen = new Set<string>();
  return urls.filter(u => { if (seen.has(u)) return false; seen.add(u); return true; });
}

function isBookingSite(url: string): boolean {
  return BOOKING_DOMAINS.some(d => url.includes(d));
}

function decodeEntities(s: string): string {
  return s.replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">")
          .replace(/&quot;/g,'"').replace(/&#39;/g,"'");
}

function toTitleCase(s: string): string {
  return s.replace(/\w\S*/g, t => t[0].toUpperCase() + t.slice(1).toLowerCase());
}

// --- HTTP ---
async function get(url: string, retries = MAX_RETRIES): Promise<string | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
      const res = await fetch(url, { headers: HEADERS, signal: ctrl.signal, redirect: "follow" });
      clearTimeout(t);
      if (res.status === 429 || res.status === 503) { await sleep(12000); continue; }
      if (!res.ok) { if (i < retries - 1) await sleep(REQ_DELAY); continue; }
      return await res.text();
    } catch (e: any) {
      if (i < retries - 1) await sleep(REQ_DELAY);
    }
  }
  return null;
}

// --- DuckDuckGo search (no API key needed) ---
async function ddgSearch(query: string): Promise<string[]> {
  const q = encodeURIComponent(query);
  const html = await get(`https://html.duckduckgo.com/html/?q=${q}`);
  if (!html) return [];
  const urls: string[] = [];
  for (const m of html.matchAll(/href="(https?:\/\/[^"]{10,300})"/gi)) {
    const u = m[1];
    if (!u.includes("duckduckgo.com") && !u.includes("duck.com")) urls.push(u);
  }
  return [...new Set(urls)];
}

// ─── 1. Find hotel's own website ─────────────────────────────────────────────
async function findHotelWebsite(name: string, city: string): Promise<string | null> {
  await sleep(REQ_DELAY);
  const results = await ddgSearch(`"${name}" ${city} Cambodia hotel official website`);
  for (const url of results.slice(0, 10)) {
    if (!isBookingSite(url) && (url.includes(city.toLowerCase().replace(/\s+/g, ""))
        || name.toLowerCase().split(" ").some(w => w.length > 3 && url.toLowerCase().includes(w)))) {
      return url;
    }
  }
  // Broader fallback
  for (const url of results.slice(0, 10)) {
    if (!isBookingSite(url)) return url;
  }
  return null;
}

// ─── 2. Scrape photos from kh-hotel.net or generic hotel website ──────────────
function extractKhHotelPhotos(html: string, baseUrl: string): { full: string[]; thumb: string | null } {
  const origin = new URL(baseUrl).origin;
  const fullRe = /\/data\/Photos\/OriginalPhoto\/[\d/]+\/[^"'\s)]+\.(?:JPEG|JPG|jpeg|jpg|png|webp)/gi;
  const thumbRe = /\/data\/Photos\/450x450w\/[\d/]+\.(?:JPEG|JPG|jpeg|jpg|png|webp)/gi;

  const full = dedupe([...html.matchAll(fullRe)].map(m => origin + m[0]));
  const thumbs = dedupe([...html.matchAll(thumbRe)].map(m => origin + m[0]));

  return { full, thumb: thumbs[0] ?? null };
}

function extractGenericPhotos(html: string, baseUrl: string): string[] {
  const origin = (() => { try { return new URL(baseUrl).origin; } catch { return ""; } })();
  const photos: string[] = [];

  // og:image
  for (const m of html.matchAll(/<meta[^>]+(?:property|name)="og:image"[^>]+content="([^"]+)"/gi)) photos.push(m[1]);
  for (const m of html.matchAll(/<meta[^>]+content="([^"]+)"[^>]+(?:property|name)="og:image"/gi)) photos.push(m[1]);

  // <img src/data-src with common photo paths
  for (const m of html.matchAll(/(?:src|data-src|data-lazy-src)="([^"]{20,}\.(?:jpg|jpeg|png|webp))"/gi)) {
    const u = m[1].startsWith("http") ? m[1] : origin + (m[1].startsWith("/") ? m[1] : "/" + m[1]);
    if (!u.includes("logo") && !u.includes("icon") && !u.includes("flag")) photos.push(u);
  }

  return dedupe(photos).slice(0, 60);
}

async function fetchHotelWebsiteData(websiteUrl: string): Promise<{ photos: string[]; logo: string | null; phone: string | null } | null> {
  await sleep(REQ_DELAY);
  const html = await get(websiteUrl);
  if (!html) return null;

  let photos: string[] = [];
  let logo: string | null = null;

  // Check if it's a kh-hotel.net site (common for Cambodian hotels)
  if (websiteUrl.includes("kh-hotel.net")) {
    const { full, thumb } = extractKhHotelPhotos(html, websiteUrl);
    photos = full;
    logo = thumb;
  } else {
    photos = extractGenericPhotos(html, websiteUrl);
  }

  // Extract phone number
  const phoneMatch = html.match(/(?:\+855|0855|855)?[\s.-]?(?:\d[\s.-]?){8,11}/);
  const phone = phoneMatch ? phoneMatch[0].replace(/\s+/g, " ").trim() : null;

  return { photos, logo, phone };
}

// ─── 3. Find Facebook page + profile photo ───────────────────────────────────
async function findFacebookPage(name: string, city: string): Promise<string | null> {
  await sleep(REQ_DELAY);
  const results = await ddgSearch(`"${name}" ${city} Cambodia site:facebook.com`);
  const fbUrl = results.find(u => u.includes("facebook.com/") && !u.includes("facebook.com/groups/"));
  return fbUrl ?? null;
}

async function getFacebookProfilePhoto(fbUrl: string): Promise<string | null> {
  const pageMatch = fbUrl.match(/facebook\.com\/([^/?#\s]+)/);
  if (!pageMatch) return null;
  const pageName = pageMatch[1];
  if (["profile.php", "pages", "groups", "events"].includes(pageName)) return null;

  await sleep(REQ_DELAY);
  // Graph API returns stable profile picture URL without needing auth for public pages
  const apiUrl = `https://graph.facebook.com/${pageName}/picture?type=large&redirect=false`;
  const body = await get(apiUrl);
  if (!body) return `https://graph.facebook.com/${pageName}/picture?type=large`;
  try {
    const data = JSON.parse(body);
    if (data?.data?.url && !data?.data?.is_silhouette) return data.data.url;
  } catch {}
  return null;
}

// ─── 4. TripAdvisor fallback (rating + description + facilities) ─────────────
async function searchTripAdvisor(name: string, city: string): Promise<string | null> {
  await sleep(REQ_DELAY);
  const q = encodeURIComponent(`${name} ${city} Cambodia`);
  const html = await get(`https://www.tripadvisor.com/Search?q=${q}&blockRedirect=true`);
  if (!html) return null;
  const re = /\/Hotel_Review-g\d+-d\d+-Reviews-[^"'\s>]{4,200}\.html/g;
  const matches = [...new Set(html.match(re) ?? [])];
  if (!matches.length) return null;
  const nameParts = name.toLowerCase().replace(/[^a-z0-9]/g,"_").split("_").filter(p => p.length > 3);
  const best = matches.find(m => nameParts.some(p => m.toLowerCase().includes(p)));
  return "https://www.tripadvisor.com" + (best ?? matches[0]);
}

function extractTARating(html: string): number | null {
  for (const m of html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { const rv = JSON.parse(m[1])?.aggregateRating?.ratingValue; if (rv) return parseFloat(rv); } catch {}
  }
  const m = html.match(/"ratingValue":\s*"?([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

function extractTADescription(html: string): string | null {
  const og = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)
           ?? html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:description"/i);
  return og ? decodeEntities(og[1]) : null;
}

const KNOWN_FACILITIES = [
  "Swimming Pool","Outdoor Pool","Indoor Pool","Infinity Pool",
  "Free WiFi","WiFi","Restaurant","Bar","Lounge","Coffee Shop",
  "Spa","Massage","Fitness Center","Gym","Sauna",
  "Free Parking","Parking","Airport Transfer","Airport Shuttle",
  "Room Service","Laundry Service","24-Hour Front Desk","Concierge",
  "Air Conditioning","Breakfast Available","Breakfast Included",
  "Beach Access","Beachfront","Private Beach","Ocean View","Sea View",
  "Garden","Terrace","Balcony","Meeting Room","Business Center",
  "Kids Club","Tour Desk","Non-Smoking Rooms","Pet Friendly",
  "Elevator","Luggage Storage","Safety Deposit Box","Currency Exchange",
];

function extractTAFacilities(html: string): string[] {
  const found = new Set<string>();
  for (const m of html.matchAll(/"(?:amenities|facilities)":\s*\[([^\]]{1,2000})\]/gi))
    for (const item of m[1].matchAll(/"([^"]{3,80})"/g)) found.add(toTitleCase(item[1].trim()));
  for (const kw of KNOWN_FACILITIES) if (html.includes(kw)) found.add(kw);
  return [...found];
}

function extractTACheckInOut(html: string) {
  const t = /([\d]{1,2}:[\d]{2}\s*(?:AM|PM)?)/i;
  const ci = html.match(new RegExp(`[Cc]heck[- ]?[Ii]n[^<]{0,60}?${t.source}`, "i"));
  const co = html.match(new RegExp(`[Cc]heck[- ]?[Oo]ut[^<]{0,60}?${t.source}`, "i"));
  return { checkIn: ci ? ci[1].trim() : null, checkOut: co ? co[1].trim() : null };
}

async function fetchTripAdvisorData(url: string) {
  await sleep(REQ_DELAY);
  const html = await get(url);
  if (!html) return null;
  return {
    rating: extractTARating(html),
    description: extractTADescription(html),
    facilities: extractTAFacilities(html),
    ...extractTACheckInOut(html),
  };
}

// ─── 5. Orchestrate per-property ─────────────────────────────────────────────
async function importProperty(prop: Property): Promise<HotelData | null> {
  const city = extractCity(prop.address);
  const result: HotelData = {
    photos: [], logoUrl: null, rating: null,
    description: null, facilities: [], checkIn: null, checkOut: null,
    phone: null, source: "none",
  };

  // Step A: hotel's own website (best photos, no hotlink issues)
  console.log(`    Searching for official website…`);
  const websiteUrl = await findHotelWebsite(prop.name, city);
  if (websiteUrl) {
    console.log(`    Website: ${websiteUrl}`);
    const siteData = await fetchHotelWebsiteData(websiteUrl);
    if (siteData && siteData.photos.length > 0) {
      result.photos = siteData.photos;
      result.logoUrl = siteData.logo;
      result.phone = siteData.phone;
      result.source = "website";
      console.log(`    Photos from website: ${result.photos.length}`);
    }
  }

  // Step B: Facebook profile photo (for logo_url)
  if (!result.logoUrl) {
    console.log(`    Searching Facebook page…`);
    const fbUrl = await findFacebookPage(prop.name, city);
    if (fbUrl) {
      console.log(`    Facebook: ${fbUrl}`);
      result.logoUrl = await getFacebookProfilePhoto(fbUrl);
      if (result.logoUrl) console.log(`    Profile photo: found`);
    }
  }

  // Step C: TripAdvisor for rating + description + facilities
  // (and photos if website scrape failed)
  console.log(`    Checking TripAdvisor for rating/description…`);
  const taUrl = await searchTripAdvisor(prop.name, city);
  if (taUrl) {
    const ta = await fetchTripAdvisorData(taUrl);
    if (ta) {
      result.rating = ta.rating;
      result.description = ta.description;
      result.facilities = ta.facilities;
      result.checkIn = ta.checkIn;
      result.checkOut = ta.checkOut;
      console.log(`    TripAdvisor rating: ${ta.rating ?? "—"} | Facilities: ${ta.facilities.length}`);

      // Use TA photos only if we got nothing from the hotel website
      if (result.photos.length === 0) {
        await sleep(REQ_DELAY);
        const taHtml = await get(taUrl);
        if (taHtml) {
          const taCdnRe = /dynamic-media-cdn\.tripadvisor\.com\/media\/photo-[a-z]\/[\w/.\-]+\.(?:jpg|jpeg|png|webp)/gi;
          const taPhotos = dedupe([...taHtml.matchAll(taCdnRe)].map(m => "https://" + m[0].replace(/\/photo-[a-z]\//, "/photo-o/")));
          if (taPhotos.length > 0) {
            result.photos = taPhotos;
            result.source = "tripadvisor";
            console.log(`    Photos from TripAdvisor: ${result.photos.length} (note: may hotlink-block)`);
          }
        }
      }
    }
  }

  if (result.photos.length === 0 && !result.logoUrl) return null;
  return result;
}

// ─── 6. Database writes ───────────────────────────────────────────────────────
async function saveToDb(prop: Property, data: HotelData): Promise<void> {
  if (DRY_RUN) { console.log(`    [dry-run] would save ${prop.id}`); return; }

  const gallery: GalleryImage[] = data.photos.slice(0, 54).map((url, i) => ({
    url, caption: prop.name, order: i,
  }));

  const profileUpdate: Record<string, unknown> = {};
  if (data.photos.length > 0) {
    profileUpdate.banner_url = data.photos[0];
    profileUpdate.gallery_images = gallery;
  }
  if (data.logoUrl) profileUpdate.logo_url = data.logoUrl;
  if (data.rating !== null) profileUpdate.rating = data.rating;
  if (data.description) profileUpdate.description = data.description;
  if (data.phone && !prop.phone) profileUpdate.phone = data.phone;

  if (Object.keys(profileUpdate).length > 0) {
    const { error } = await supabase.from("store_profiles").update(profileUpdate).eq("id", prop.id);
    if (error) throw new Error(`store_profiles: ${error.message}`);
  }

  if (data.facilities.length > 0 || data.checkIn || data.checkOut) {
    const lpPayload: Record<string, unknown> = {
      store_id: prop.id,
      facilities: data.facilities,
      popular_amenities: data.facilities.slice(0, 12),
    };
    if (data.checkIn) lpPayload.check_in_from = data.checkIn;
    if (data.checkOut) lpPayload.check_out_until = data.checkOut;
    const { error } = await supabase.from("lodge_property_profile")
      .upsert(lpPayload, { onConflict: "store_id", ignoreDuplicates: false });
    if (error) throw new Error(`lodge_property_profile: ${error.message}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log(`\nZIVO Hotel Auto-Import v2`);
  console.log(`==========================`);
  if (DRY_RUN) console.log(`** DRY RUN — no writes **`);
  console.log(`start=${START}  limit=${LIMIT ?? "all"}  force=${FORCE}\n`);

  // Load all eligible properties
  const all: Property[] = [];
  const PAGE = 200;
  for (let p = 0; ; p++) {
    let q = supabase
      .from("store_profiles")
      .select("id,name,address,rating,banner_url,logo_url,category,description,phone")
      .in("category", LODGING_CATS)
      .order("name")
      .range(p * PAGE, p * PAGE + PAGE - 1);
    if (!FORCE) q = q.is("banner_url", null);
    const { data, error } = await q;
    if (error) { console.error(error.message); process.exit(1); }
    if (!data?.length) break;
    all.push(...(data as Property[]));
    if (data.length < PAGE) break;
  }

  const queue = all.slice(START, LIMIT != null ? START + LIMIT : undefined);
  console.log(`Eligible: ${all.length}  Processing: ${queue.length}\n`);

  const results: Array<{ id: string; name: string; status: string; photos: number; source: string; error?: string }> = [];
  let updated = 0, notFound = 0, errors = 0;

  for (let i = 0; i < queue.length; i++) {
    const prop = queue[i];
    console.log(`[${i + 1}/${queue.length}] ${prop.name}`);

    try {
      const data = await importProperty(prop);

      if (!data) {
        console.log(`    ✗ No data found\n`);
        results.push({ id: prop.id, name: prop.name, status: "not_found", photos: 0, source: "none" });
        notFound++;
      } else {
        await saveToDb(prop, data);
        console.log(`    ✓ Saved — ${data.photos.length} photos, logo: ${data.logoUrl ? "yes" : "no"}, source: ${data.source}\n`);
        results.push({ id: prop.id, name: prop.name, status: "updated", photos: data.photos.length, source: data.source });
        updated++;
      }
    } catch (err: any) {
      console.error(`    ✗ Error: ${err.message}\n`);
      results.push({ id: prop.id, name: prop.name, status: "error", photos: 0, source: "none", error: err.message });
      errors++;
    }

    await sleep(PROP_DELAY);
  }

  console.log(`\n===== Done =====`);
  console.log(`Updated:   ${updated}`);
  console.log(`Not found: ${notFound}`);
  console.log(`Errors:    ${errors}`);
  console.log(`Total:     ${queue.length}`);

  writeFileSync(LOG_PATH, JSON.stringify({
    run_at: new Date().toISOString(),
    flags: { START, LIMIT, FORCE, DRY_RUN },
    summary: { total: queue.length, updated, not_found: notFound, errors },
    results,
  }, null, 2));
  console.log(`\nLog → ${LOG_PATH}`);
}

main().catch(e => { console.error(e); process.exit(1); });
