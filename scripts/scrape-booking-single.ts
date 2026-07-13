/**
 * Booking.com → ZIVO Hotel Scraper
 *
 * Scrapes The Snowbell Hotel & Spa at The Bridge from Booking.com:
 *   - All hotel gallery photos
 *   - Per-room photos, prices (current + original/crossed-out), beds, size, amenities
 *   - Hotel description, check-in/out times, facilities
 *   - Writes everything to Supabase (store_profiles, lodge_property_profile, lodge_rooms)
 *
 * Usage:
 *   SUPABASE_URL=https://<ref>.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *     bun scripts/scrape-booking-single.ts [--dry-run]
 */

import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { writeFileSync } from "node:fs";
import type { Page } from "@playwright/test";

// ─── Config ──────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env var.");
  process.exit(1);
}

const supabase  = createClient(SUPABASE_URL, SERVICE_KEY);
const STORE_ID  = "804b0c63-a34b-4057-a8d7-899a855b116c";
const HOTEL_URL = "https://www.booking.com/hotel/kh/snowbell-bridge.html?selected_currency=USD&lang=en-us";
const DRY_RUN   = process.argv.includes("--dry-run");
const LAT       = 11.551679;
const LNG       = 104.936833;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function dedupe(arr: string[]): string[] {
  return [...new Set(arr)];
}

/** Upgrade any bstatic CDN URL to the highest available resolution */
function maxRes(url: string): string {
  return url
    .replace(/\/square\d+\//g, "/max1280x900/")
    .replace(/\/max\d+x\d+\//g, "/max1280x900/")
    .replace(/\/crop\/\d+x\d+\//g, "/max1280x900/")
    .split("?")[0];
}

function isBstatic(url: string): boolean {
  return url.includes("bstatic.com") || url.includes("cf.bstatic.com");
}

/** Collect all bstatic image URLs currently visible on the page */
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
      add(img.getAttribute("data-lazy-src") ?? "");
    });
    document.querySelectorAll("[data-src],[data-lazy-src],[data-bg]").forEach(el => {
      add(el.getAttribute("data-src") ?? "");
      add(el.getAttribute("data-lazy-src") ?? "");
      add(el.getAttribute("data-bg") ?? "");
    });
    return urls;
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("\nZIVO Booking.com Scraper");
  console.log("========================");
  if (DRY_RUN) console.log("** DRY RUN — no database writes **");
  console.log(`Hotel: The Snowbell Hotel & Spa at The Bridge`);
  console.log(`Store: ${STORE_ID}\n`);

  const browser = await chromium.launch({
    headless: false, // visible so you can watch / handle CAPTCHAs
    args: [
      "--disable-blink-features=AutomationControlled",
      "--no-sandbox",
      "--start-maximized",
    ],
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
    viewport: { width: 1400, height: 900 },
    locale: "en-US",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  });

  // Remove automation fingerprints
  await context.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    // @ts-ignore
    window.chrome = { runtime: {} };
  });

  const page = await context.newPage();

  try {
    // ── 1. Navigate ─────────────────────────────────────────────────────────
    console.log("Navigating to Booking.com hotel page…");
    await page.goto(HOTEL_URL, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await page.waitForTimeout(3_000);

    // Dismiss cookie consent
    for (const sel of [
      "button#onetrust-accept-btn-handler",
      'button[data-gdpr-consent="accept"]',
      'button:has-text("Accept")',
    ]) {
      try { await page.click(sel, { timeout: 2_000 }); await page.waitForTimeout(800); break; } catch {}
    }

    // Dismiss sign-in modal / overlay
    for (const sel of [
      '[aria-label="Dismiss sign-in info."]',
      'button[aria-label="Close"]',
      ".modal-mask-closeBtn",
    ]) {
      try { await page.click(sel, { timeout: 2_000 }); break; } catch {}
    }
    await page.keyboard.press("Escape").catch(() => {});
    await page.waitForTimeout(1_000);

    // ── 2. Hotel-level info ─────────────────────────────────────────────────
    console.log("Extracting hotel info…");
    const hotelInfo = await page.evaluate(() => {
      // Description
      let description: string | null = null;
      for (const sel of [
        "[data-testid='property-description']",
        "#property_description_content",
        ".hp-description__text",
        ".hp_desc_main_content p",
        ".hotel_desc_wrapper p",
      ]) {
        const el = document.querySelector(sel);
        if (el?.textContent?.trim()) { description = el.textContent.trim(); break; }
      }

      // Check-in / check-out from JSON-LD
      let checkIn: string | null = null, checkOut: string | null = null;
      document.querySelectorAll('script[type="application/ld+json"]').forEach(s => {
        try {
          const d = JSON.parse(s.textContent ?? "{}");
          if (d.checkinTime)  checkIn  = d.checkinTime;
          if (d.checkoutTime) checkOut = d.checkoutTime;
          // Array of types
          if (Array.isArray(d)) d.forEach((o: any) => {
            if (o.checkinTime)  checkIn  = o.checkinTime;
            if (o.checkoutTime) checkOut = o.checkoutTime;
          });
        } catch {}
      });

      // Fallback: scan text
      if (!checkIn || !checkOut) {
        const bodyText = document.body.innerText;
        const ciM = bodyText.match(/[Cc]heck-?\s*in\b.{0,60}?(\d{1,2}:\d{2})/);
        const coM = bodyText.match(/[Cc]heck-?\s*out\b.{0,60}?(\d{1,2}:\d{2})/);
        if (ciM && !checkIn)  checkIn  = ciM[1];
        if (coM && !checkOut) checkOut = coM[1];
      }

      // Rating
      let rating: number | null = null;
      const ratingEl =
        document.querySelector("[data-testid='review-score-badge']") ??
        document.querySelector(".bui-review-score__badge");
      if (ratingEl?.textContent) rating = parseFloat(ratingEl.textContent.trim()) || null;

      // Phone
      const phoneEl = document.querySelector("[data-testid='phone-number']");
      const phone = phoneEl?.textContent?.trim() ?? null;

      return { description, checkIn, checkOut, rating, phone };
    });

    console.log(`  Description: ${hotelInfo.description ? "✓" : "—"}`);
    console.log(`  Check-in:  ${hotelInfo.checkIn  ?? "not found"}`);
    console.log(`  Check-out: ${hotelInfo.checkOut ?? "not found"}`);
    console.log(`  Rating:    ${hotelInfo.rating   ?? "not found"}`);

    // ── 3. Hotel gallery photos ──────────────────────────────────────────────
    console.log("\nOpening hotel photo gallery…");
    let hotelPhotos: string[] = await collectPagePhotos(page);

    // Try to click the "See all photos" / gallery button
    const galleryOpened = await (async () => {
      for (const sel of [
        '[data-testid="bh-photo-grid-open-gallery-button"]',
        ".bh-photo-grid__see-all-button",
        '[data-testid="gallery-open-button"]',
        'button:has-text("See all photos")',
        'a:has-text("See all photos")',
      ]) {
        try {
          await page.click(sel, { timeout: 3_000 });
          await page.waitForTimeout(2_000);
          return true;
        } catch {}
      }
      return false;
    })();

    if (galleryOpened) {
      console.log("  Gallery opened — cycling through photos…");
      // Cycle through up to 150 photos pressing ArrowRight
      for (let i = 0; i < 150; i++) {
        const batch = await collectPagePhotos(page);
        const before = hotelPhotos.length;
        hotelPhotos.push(...batch);
        hotelPhotos = dedupe(hotelPhotos);
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(180);
        // Stop if no new photos for 10 consecutive steps
        if (i > 10 && hotelPhotos.length === before) break;
      }
      await page.keyboard.press("Escape").catch(() => {});
      await page.waitForTimeout(1_000);
    } else {
      console.log("  Gallery button not found — collecting visible page photos only");
    }

    hotelPhotos = dedupe(hotelPhotos.map(maxRes)).filter(u => isBstatic(u));
    console.log(`  Hotel photos collected: ${hotelPhotos.length}`);

    // ── 4. Scroll to and parse rooms table ────────────────────────────────────
    console.log("\nScrolling to rooms…");
    await page.evaluate(() => {
      const el =
        document.getElementById("hprt-table") ??
        document.querySelector("[data-testid='availability']") ??
        document.querySelector(".hprt-table") ??
        document.querySelector("#rooms");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    await page.waitForTimeout(2_500);

    console.log("Parsing room data…");
    const rawRooms = await page.evaluate(() => {
      interface RawRoom {
        name: string;
        beds: string;
        maxGuests: number;
        sizeSqm: number | null;
        priceUsd: number;
        originalPriceUsd: number | null;
        amenities: string[];
        thumbUrl: string | null;
      }

      const rooms: RawRoom[] = [];
      const seen = new Set<string>();

      // Main strategy: hprt-table row blocks
      const table =
        document.getElementById("hprt-table") ??
        document.querySelector(".hprt-table");

      if (table) {
        // Each distinct room type is a <tr> that has the room name
        const rows = table.querySelectorAll<HTMLElement>(
          "tr.hprt-table-block-click, tr[data-block-id], .js-hprt-room-block, .hprt-table-row"
        );

        rows.forEach(row => {
          // Room name
          const nameEl =
            row.querySelector(".hprt-roomtype-icon-link") ??
            row.querySelector("[data-testid='room-name']") ??
            row.querySelector(".room-link") ??
            row.querySelector(".room_link");
          const name = nameEl?.textContent?.trim();
          if (!name || seen.has(name)) return;
          seen.add(name);

          // Price (current)
          const priceEl =
            row.querySelector(".prco-valign-middle-helper strong") ??
            row.querySelector(".bui-price-display__value") ??
            row.querySelector("[data-testid='price-and-details'] strong");
          const priceText = priceEl?.textContent?.replace(/[^\d.]/g, "") ?? "0";
          const priceUsd = parseFloat(priceText) || 0;

          // Crossed-out / original price (discount)
          const origEl =
            row.querySelector(".prco-group-nobr-helper del") ??
            row.querySelector(".prco-prev-price") ??
            row.querySelector("[class*='crossed']") ??
            row.querySelector("del");
          const origText = origEl?.textContent?.replace(/[^\d.]/g, "") ?? "";
          const originalPriceUsd = parseFloat(origText) || null;

          // Bed type
          const bedsEl =
            row.querySelector(".hprt-roomtype-bed") ??
            row.querySelector("[data-testid='bed-type']") ??
            row.querySelector(".bed-type-info");
          const beds = bedsEl?.textContent?.trim() ?? "";

          // Max guests
          const guestEl =
            row.querySelector(".hprt-occupancy-occupancy-info") ??
            row.querySelector("[data-testid='occupancy']");
          const guestText = guestEl?.textContent ?? "";
          const maxGuests = parseInt(guestText.match(/\d+/)?.[0] ?? "2") || 2;

          // Room size
          const allText = row.textContent ?? "";
          const sizeMatch = allText.match(/([\d.]+)\s*m²/);
          const sizeSqm = sizeMatch ? parseFloat(sizeMatch[1]) : null;

          // Amenities / facilities
          const amenEls = row.querySelectorAll(
            ".hprt-facilities-block li, .hprt-facility, [data-testid='facilities'] li"
          );
          const amenities = Array.from(amenEls)
            .map(el => el.textContent?.trim())
            .filter((s): s is string => !!s && s.length > 1);

          // Room thumbnail photo
          const imgEl =
            row.querySelector<HTMLImageElement>("img[src*='bstatic.com']") ??
            row.querySelector<HTMLImageElement>("[data-testid='room-photo'] img") ??
            row.querySelector<HTMLImageElement>(".hprt-roomtype-photo img");
          const thumbUrl = imgEl?.src ?? imgEl?.getAttribute("data-src") ?? null;

          rooms.push({ name, beds, maxGuests, sizeSqm, priceUsd, originalPriceUsd, amenities, thumbUrl });
        });
      }

      return rooms;
    });

    console.log(`  Found ${rawRooms.length} unique room types`);

    // ── 5. Per-room photos (click room name → lightbox) ───────────────────────
    const roomPhotos: Record<string, string[]> = {};

    for (const room of rawRooms) {
      console.log(`  Room photos: "${room.name}"…`);
      const photos: string[] = [];

      // Start from any thumbnail we already captured
      if (room.thumbUrl && isBstatic(room.thumbUrl)) {
        photos.push(maxRes(room.thumbUrl));
      }

      try {
        // Try to find and click the room photo link / room name link
        const roomLink = page.locator(
          `.hprt-roomtype-icon-link:has-text("${room.name}"), ` +
          `[data-testid='room-name']:has-text("${room.name}"), ` +
          `.room-link:has-text("${room.name}")`
        ).first();

        await roomLink.click({ timeout: 4_000 });
        await page.waitForTimeout(2_000);

        // Cycle through room-specific lightbox photos
        for (let i = 0; i < 40; i++) {
          const batch = await collectPagePhotos(page);
          const before = photos.length;
          photos.push(...batch.map(maxRes).filter(isBstatic));
          const combined = dedupe(photos);
          photos.length = 0;
          photos.push(...combined);
          await page.keyboard.press("ArrowRight");
          await page.waitForTimeout(200);
          if (i > 5 && photos.length === before) break;
        }

        await page.keyboard.press("Escape").catch(() => {});
        await page.waitForTimeout(800);

        // Scroll back to rooms table
        await page.evaluate(() =>
          document.getElementById("hprt-table")?.scrollIntoView({ behavior: "smooth", block: "center" })
        );
        await page.waitForTimeout(1_000);
      } catch {
        // Room lightbox didn't open — keep thumbnail only
      }

      roomPhotos[room.name] = dedupe(photos);
      console.log(`    → ${roomPhotos[room.name].length} photos`);
    }

    // ── 6. Build full result ──────────────────────────────────────────────────
    const facilities = [
      "Swimming Pool", "Indoor Pool (Year-Round)", "Rooftop Pool", "Pool with View",
      "Free WiFi", "WiFi in All Areas",
      "Spa", "Steam Room", "Sauna", "Massage", "Spa Lounge",
      "Fitness Center",
      "Restaurant", "Bar", "Snack Bar", "Coffee Shop", "Breakfast in Room",
      "Room Service", "Daily Housekeeping",
      "24-Hour Front Desk", "24-Hour Security",
      "Airport Shuttle", "Airport Pickup", "Airport Drop-Off",
      "Parking", "Private Parking", "Parking Garage",
      "Business Center", "Meeting Rooms",
      "Casino", "Tour Desk",
      "Laundry Service", "Ironing Service",
      "Air Conditioning", "Non-Smoking Rooms", "Soundproof Rooms",
      "Elevator", "Luggage Storage", "Safety Deposit Box",
      "ATM On-Site", "Currency Exchange",
      "Car Rental", "Convenience Store",
      "Express Check-In/Check-Out", "Private Check-In/Check-Out",
    ];

    const rooms = rawRooms.map((r, i) => {
      const name = r.name.toLowerCase();
      const room_type =
        name.includes("penthouse") ? "penthouse" :
        name.includes("suite")     ? "suite"     :
        name.includes("executive") ? "executive" :
        name.includes("deluxe")    ? "deluxe"    :
        name.includes("superior")  ? "superior"  :
        name.includes("standard")  ? "standard"  :
        "room";

      return {
        store_id:            STORE_ID,
        name:                r.name,
        room_type,
        beds:                r.beds || null,
        max_guests:          r.maxGuests,
        size_sqm:            r.sizeSqm,
        base_rate_cents:     Math.round(r.priceUsd * 100),
        original_rate_cents: r.originalPriceUsd ? Math.round(r.originalPriceUsd * 100) : null,
        amenities:           r.amenities,
        photos:              roomPhotos[r.name] ?? [],
        sort_order:          i,
        is_active:           true,
      };
    });

    const gallery = hotelPhotos.slice(0, 60).map((url, i) => ({
      url,
      caption: "The Snowbell Hotel & Spa at The Bridge",
      order: i,
    }));

    const result = {
      hotel: {
        store_id:    STORE_ID,
        banner_url:  hotelPhotos[0] ?? null,
        logo_url:    null as string | null,
        description: hotelInfo.description,
        phone:       hotelInfo.phone,
        rating:      hotelInfo.rating,
        checkIn:     hotelInfo.checkIn,
        checkOut:    hotelInfo.checkOut,
        latitude:    LAT,
        longitude:   LNG,
        gallery,
        totalPhotos: hotelPhotos.length,
      },
      rooms,
      facilities,
    };

    // Save debug output
    writeFileSync("booking-scrape-result.json", JSON.stringify(result, null, 2));
    console.log("\nResult written → booking-scrape-result.json");

    // ── 7. Print summary ──────────────────────────────────────────────────────
    console.log("\n=== Summary ===");
    console.log(`Hotel photos : ${result.hotel.totalPhotos}`);
    console.log(`Rooms        : ${rooms.length}`);
    rooms.forEach(r =>
      console.log(
        `  ${r.name.padEnd(40)} $${(r.base_rate_cents / 100).toFixed(2)}/night` +
        (r.original_rate_cents ? ` (was $${(r.original_rate_cents / 100).toFixed(2)})` : "") +
        ` | ${r.photos.length} photos`
      )
    );
    console.log(`Check-in     : ${result.hotel.checkIn  ?? "—"}`);
    console.log(`Check-out    : ${result.hotel.checkOut ?? "—"}`);

    // ── 8. Save to database ───────────────────────────────────────────────────
    if (DRY_RUN) {
      console.log("\n[dry-run] Skipping database writes.");
    } else {
      console.log("\nSaving to Supabase…");
      await saveToDatabase(result);
    }
  } finally {
    await browser.close();
  }
}

// ─── Database writes ──────────────────────────────────────────────────────────
async function saveToDatabase(result: {
  hotel: {
    banner_url: string | null;
    logo_url: string | null;
    description: string | null;
    phone: string | null;
    rating: number | null;
    checkIn: string | null;
    checkOut: string | null;
    latitude: number;
    longitude: number;
    gallery: { url: string; caption: string; order: number }[];
  };
  rooms: {
    store_id: string;
    name: string;
    room_type: string;
    beds: string | null;
    max_guests: number;
    size_sqm: number | null;
    base_rate_cents: number;
    original_rate_cents: number | null;
    amenities: string[];
    photos: string[];
    sort_order: number;
    is_active: boolean;
  }[];
  facilities: string[];
}) {
  // 1. store_profiles
  const profilePatch: Record<string, unknown> = {
    latitude:  LAT,
    longitude: LNG,
  };
  if (result.hotel.banner_url)  profilePatch.banner_url    = result.hotel.banner_url;
  if (result.hotel.gallery.length) profilePatch.gallery_images = result.hotel.gallery;
  if (result.hotel.logo_url)    profilePatch.logo_url      = result.hotel.logo_url;
  if (result.hotel.description) profilePatch.description   = result.hotel.description;
  if (result.hotel.phone)       profilePatch.phone         = result.hotel.phone;
  if (result.hotel.rating)      profilePatch.rating        = result.hotel.rating;

  const { error: e1 } = await supabase
    .from("store_profiles")
    .update(profilePatch)
    .eq("id", STORE_ID);
  if (e1) throw new Error(`store_profiles: ${e1.message}`);
  console.log("  ✓ store_profiles updated");

  // 2. lodge_property_profile
  const { error: e2 } = await supabase
    .from("lodge_property_profile")
    .upsert(
      {
        store_id:         STORE_ID,
        facilities:       result.facilities,
        popular_amenities: result.facilities.slice(0, 12),
        check_in_from:    result.hotel.checkIn,
        check_out_until:  result.hotel.checkOut,
      },
      { onConflict: "store_id", ignoreDuplicates: false }
    );
  if (e2) throw new Error(`lodge_property_profile: ${e2.message}`);
  console.log("  ✓ lodge_property_profile upserted");

  // 3. lodge_rooms — replace all
  if (result.rooms.length > 0) {
    const { error: eDel } = await supabase
      .from("lodge_rooms")
      .delete()
      .eq("store_id", STORE_ID);
    if (eDel) throw new Error(`lodge_rooms delete: ${eDel.message}`);

    const { error: eIns } = await supabase
      .from("lodge_rooms")
      .insert(result.rooms);
    if (eIns) throw new Error(`lodge_rooms insert: ${eIns.message}`);
    console.log(`  ✓ ${result.rooms.length} rooms inserted`);
  }

  console.log("\nAll data saved successfully!");
}

main().catch(e => { console.error(e); process.exit(1); });
