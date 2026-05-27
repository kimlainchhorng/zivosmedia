/**
 * rescue-booking-images.ts
 *
 * Definitive approach: navigate Playwright to each hotel's actual booking.com
 * page. While the page loads, the browser legitimately fetches all hotel
 * images from cf.bstatic.com. We listen to network responses and capture the
 * image bytes (Booking can't block its own browser session). Then we upload
 * to Supabase Storage and rewrite DB URLs.
 *
 * Usage:
 *   set -a && . ./.scrape-session.local && set +a
 *   node --experimental-strip-types --no-warnings \
 *     scripts/rescue-booking-images.ts [--store-id=UUID] [--booking-url=URL] [--start=N] [--limit=N]
 */

import { chromium, type BrowserContext, type Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import path from "path";
import fs from "fs";

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BUCKET = "store-assets";

const args = process.argv.slice(2);
const STORE_ID = args.find((a) => a.startsWith("--store-id="))?.split("=")[1] || null;
const BOOKING_URL = args.find((a) => a.startsWith("--booking-url="))?.split("=").slice(1).join("=") || null;
const START_ARG = args.find((a) => a.startsWith("--start="))?.split("=")[1];
const START = START_ARG ? parseInt(START_ARG, 10) : 0;
const LIMIT_ARG = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
const LIMIT = LIMIT_ARG ? parseInt(LIMIT_ARG, 10) : null;
const DRY_RUN = args.includes("--dry-run");
const DEBUG_PROGRESS = args.includes("--debug-progress");
const EXCLUDE_STORE_IDS = new Set(
  args
    .filter((a) => a.startsWith("--exclude-store-id="))
    .flatMap((a) => a.split("=").slice(1).join("=").split(","))
    .map((id) => id.trim())
    .filter(Boolean),
);

function debugProgress(message: string) {
  if (!DEBUG_PROGRESS) return;
  fs.appendFileSync(
    "booking-rescue-debug.log",
    `${new Date().toISOString()} ${message}\n`,
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function extractUrl(item: any): string | null {
  if (!item) return null;
  if (typeof item === "string") return item;
  if (typeof item === "object") return item.url || item.src || null;
  return null;
}

function isBookingImageUrl(url: string): boolean {
  return /bstatic\.com\/xdata\/images\/hotel/.test(url);
}

/** Extract the unique image identifier from a Booking CDN URL.
 *  Example: https://cf.bstatic.com/xdata/images/hotel/max1280x900/558574196.jpg
 *  → "558574196"
 */
function imageIdFromUrl(url: string): string | null {
  const m = url.match(/\/hotel\/[^/]+\/(\d+)\.(?:jpg|jpeg|png|webp)/i);
  return m ? m[1] : null;
}

function normalizeBookingUrl(raw: string): string {
  try {
    const url = new URL(raw);
    url.searchParams.set("selected_currency", "USD");
    url.searchParams.set("lang", "en-us");
    url.searchParams.set("group_adults", "2");
    url.searchParams.set("no_rooms", "1");
    if (!url.searchParams.has("checkin")) url.searchParams.set("checkin", "2026-05-22");
    if (!url.searchParams.has("checkout")) url.searchParams.set("checkout", "2026-05-23");
    return `${url.origin}${url.pathname}?${url.searchParams.toString()}`;
  } catch {
    return raw;
  }
}

function hashUrl(url: string): string {
  return createHash("md5").update(url).digest("hex").substring(0, 12);
}

function fileExtFromUrl(url: string): string {
  const m = url.match(/\.(jpg|jpeg|png|webp|gif)(?:\?|$)/i);
  return m ? m[1].toLowerCase() : "jpg";
}

async function uploadBuffer(
  buffer: Buffer,
  storagePath: string,
  contentType: string,
): Promise<string | null> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });
  if (error) {
    console.warn(`  ✗ upload: ${error.message}`);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

// ─── Build storeId → bookingUrl map from log files ────────────────────────────
function loadBookingUrlMap(): Map<string, string> {
  const map = new Map<string, string>();
  const candidates: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if ([
          ".git",
          ".booking-session",
          "dist",
          "node_modules",
        ].includes(entry.name)) continue;
        walk(fullPath);
        continue;
      }
      if (entry.isFile() && entry.name.endsWith(".json")) {
        candidates.push(fullPath);
      }
    }
  };
  walk(".");

  for (const f of candidates) {
    try {
      const raw = JSON.parse(fs.readFileSync(f, "utf8"));
      const visit = (obj: any) => {
        if (!obj || typeof obj !== "object") return;
        if (Array.isArray(obj)) {
          for (const item of obj) visit(item);
          return;
        }
        const id = obj.storeId || obj.store_id || obj.id;
        const url =
          obj.bookingUrl ||
          obj.booking_url ||
          obj.cleanUrl ||
          obj.url ||
          obj.source_url;
        if (
          id &&
          typeof id === "string" &&
          id.length > 30 &&
          url &&
          typeof url === "string" &&
          url.includes("booking.com")
        ) {
          if (!map.has(id)) map.set(id, normalizeBookingUrl(url));
        }
        for (const v of Object.values(obj)) visit(v);
      };
      visit(raw);
    } catch {
      // skip invalid
    }
  }
  return map;
}

async function storesWithBookingRoomPhotos(
  eligibleStoreIds: Set<string>,
): Promise<Set<string>> {
  const out = new Set<string>();
  const PAGE_SIZE = 1000;

  for (let p = 0; ; p++) {
    const { data, error } = await supabase
      .from("lodge_rooms")
      .select("store_id, photos")
      .range(p * PAGE_SIZE, p * PAGE_SIZE + PAGE_SIZE - 1);
    if (error) throw new Error(`lodge_rooms scan: ${error.message}`);
    if (!data || data.length === 0) break;

    for (const room of data) {
      if (!eligibleStoreIds.has(room.store_id)) continue;
      const photos = Array.isArray(room.photos) ? room.photos : [];
      const hasBookingPhoto = photos.some((photo: any) => {
        const url = extractUrl(photo);
        return url && isBookingImageUrl(url);
      });
      if (hasBookingPhoto) out.add(room.store_id);
    }

    if (data.length < PAGE_SIZE) break;
  }

  return out;
}

// ─── Core: capture images for a single hotel ──────────────────────────────────
async function captureHotelImages(
  context: BrowserContext,
  bookingUrl: string,
  wantedIds?: Set<string>,
  debugLabel?: string,
): Promise<Map<string, { buffer: Buffer; url: string; contentType: string }>> {
  // Key = image id (e.g. "558574196"), Value = best-quality buffer we captured
  const captured = new Map<
    string,
    { buffer: Buffer; url: string; contentType: string; size: number }
  >();

  const page = await context.newPage();
  const hasAllWantedImages = () =>
    Boolean(wantedIds?.size && captured.size >= wantedIds.size);
  const debugIfComplete = (stage: string) => {
    if (debugLabel && hasAllWantedImages()) {
      debugProgress(
        `${debugLabel} capture:complete-after-${stage} captured=${captured.size}/${wantedIds?.size}`,
      );
    }
  };

  const onResponse = async (resp: any) => {
    try {
      const url = resp.url();
      if (!isBookingImageUrl(url)) return;
      if (!resp.ok()) return;
      const ct = resp.headers()["content-type"] || "";
      if (!ct.startsWith("image/")) return;
      const id = imageIdFromUrl(url);
      if (!id) return;
      if (wantedIds?.size && !wantedIds.has(id)) return;

      const buf = await resp.body();
      const size = buf.length;
      // Prefer larger versions (max1280 > max500 > max300)
      const prev = captured.get(id);
      if (!prev || size > prev.size) {
        captured.set(id, { buffer: buf, url, contentType: ct, size });
      }
    } catch {
      // ignore body-already-consumed etc
    }
  };

  page.on("response", onResponse);

  try {
    if (debugLabel) debugProgress(`${debugLabel} capture:goto:start`);
    await page.goto(bookingUrl, {
      waitUntil: "domcontentloaded",
      timeout: 45000,
    });
    if (debugLabel) debugProgress(`${debugLabel} capture:goto:done captured=${captured.size}`);
    await sleep(3500);
    if (debugLabel) debugProgress(`${debugLabel} capture:after-initial-wait captured=${captured.size}`);
    debugIfComplete("initial-wait");

    // Scroll the property page first to trigger lazy-loaded room images
    if (!hasAllWantedImages()) {
      for (let i = 0; i < 12; i++) {
        await page.mouse.wheel(0, 1200).catch(() => {});
        await sleep(400);
        if (hasAllWantedImages()) break;
      }
    }
    if (debugLabel) debugProgress(`${debugLabel} capture:after-scroll captured=${captured.size}`);
    debugIfComplete("scroll");
    await sleep(1500);

    // Dedicated photo tab exposes more thumbnails and causes the browser to
    // fetch additional signed cf.bstatic.com image URLs.
    const mainUrl = page.url();
    if (!hasAllWantedImages()) {
      try {
        if (debugLabel) debugProgress(`${debugLabel} capture:photo-tab:start`);
        const galUrl = mainUrl.split("#")[0] + (mainUrl.includes("?") ? "&" : "?") + "activeTab=photosGallery";
        await page.goto(galUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(1200);
        for (let i = 0; i < 12; i++) {
          await page.mouse.wheel(0, 1200).catch(() => {});
          await sleep(250);
          if (hasAllWantedImages()) break;
        }
        await sleep(1000);
        await page.goto(mainUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
        await sleep(1000);
        if (debugLabel) debugProgress(`${debugLabel} capture:photo-tab:done captured=${captured.size}`);
      } catch {}
      debugIfComplete("photo-tab");
    }

    // Try to open the photo gallery — multiple selector variants
    const gallerySelectors = [
      "[data-testid='property-gallery-trigger']",
      "[data-testid='gallery-trigger']",
      "[data-component='hotel/new-rooms-table/HotelGalleryDesktop']",
      "button:has-text('Show all photos')",
      "button:has-text('See all photos')",
      "button:has-text('See all')",
      "a[data-testid='gallery-trigger']",
      "div.bh-photo-grid-thumb-more",
      "div.bh-photo-grid-photo",
      "img[data-headerimage]",
    ];
    let opened = false;
    if (!hasAllWantedImages()) {
      if (debugLabel) debugProgress(`${debugLabel} capture:modal:start`);
      for (const sel of gallerySelectors) {
        try {
          const el = page.locator(sel).first();
          if ((await el.count()) > 0) {
            await el.click({ timeout: 3000 }).catch(() => {});
            await sleep(2000);
            opened = true;
            break;
          }
        } catch {}
      }
      if (opened) {
        // Walk through many photos in the gallery modal
        for (let i = 0; i < 60; i++) {
          await page.keyboard.press("ArrowRight").catch(() => {});
          await sleep(250);
          if (hasAllWantedImages()) break;
        }
        await sleep(1500);
        // Close gallery
        await page.keyboard.press("Escape").catch(() => {});
        await sleep(800);
      }
      if (debugLabel) debugProgress(`${debugLabel} capture:modal:done opened=${opened} captured=${captured.size}`);
      debugIfComplete("modal");
    }

    // Make sure the classic Booking rooms table is present before trying room
    // photo modals.
    if (!hasAllWantedImages()) {
      try {
        if (debugLabel) debugProgress(`${debugLabel} capture:availability:start`);
        const loaded = await page.$("#hprt-table, .hprt-table");
        if (!loaded) {
          const checkBtn = page.locator(
            'button:has-text("Check availability"), input[value="Check availability"], .availability-search__search--button, #availability_search_submit',
          ).first();
          await checkBtn.scrollIntoViewIfNeeded({ timeout: 3000 });
          await checkBtn.click({ timeout: 3000 });
          await page.waitForSelector("#hprt-table, .hprt-table", { timeout: 12000 });
        }
        await sleep(1000);
        if (debugLabel) debugProgress(`${debugLabel} capture:availability:done captured=${captured.size}`);
      } catch {}
      debugIfComplete("availability");
    }

    if (!hasAllWantedImages()) {
      // Click on room rows to expand room galleries. Booking has both modern
      // data-testid triggers and older .hprt-roomtype-icon-link anchors.
      try {
        if (debugLabel) debugProgress(`${debugLabel} capture:rooms:start`);
        const roomTriggers = await page
          .locator(
            ".hprt-roomtype-icon-link, [data-testid='room-block-photo'], button[aria-label*='photo'], img[data-room-photo], [data-testid='room-name'], .room-link",
          )
          .all();
        for (let i = 0; i < Math.min(roomTriggers.length, 12); i++) {
          if (debugLabel) debugProgress(`${debugLabel} capture:room-trigger:${i}:start captured=${captured.size}`);
          await roomTriggers[i].scrollIntoViewIfNeeded({ timeout: 2000 }).catch(() => {});
          await roomTriggers[i].click({ timeout: 2000 }).catch(() => {});
          await sleep(800);
          for (let k = 0; k < 18; k++) {
            await page.keyboard.press("ArrowRight").catch(() => {});
            await sleep(200);
            if (hasAllWantedImages()) break;
          }
          await page.keyboard.press("Escape").catch(() => {});
          await sleep(500);
          if (debugLabel) debugProgress(`${debugLabel} capture:room-trigger:${i}:done captured=${captured.size}`);
          if (hasAllWantedImages()) break;
        }
        if (debugLabel) debugProgress(`${debugLabel} capture:rooms:done captured=${captured.size}`);
      } catch {}
      debugIfComplete("rooms");
    }

    if (!hasAllWantedImages()) {
      // Final wait for any trailing network
      await sleep(2000);
      if (debugLabel) debugProgress(`${debugLabel} capture:final-wait:done captured=${captured.size}`);
    } else if (debugLabel) {
      debugProgress(`${debugLabel} capture:final-wait:skipped captured=${captured.size}`);
    }
  } catch (err) {
    console.warn(`  ✗ navigation: ${(err as Error).message}`);
  } finally {
    page.off("response", onResponse);
    await page.close().catch(() => {});
  }

  // Convert Map type
  const result = new Map<
    string,
    { buffer: Buffer; url: string; contentType: string }
  >();
  for (const [k, v] of captured)
    result.set(k, { buffer: v.buffer, url: v.url, contentType: v.contentType });
  return result;
}

// ─── Process one store ────────────────────────────────────────────────────────
async function processStore(
  context: BrowserContext,
  store: { id: string; name: string },
  bookingUrl: string,
) {
  console.log(`\n→ ${store.name} (${store.id})`);
  console.log(`  URL: ${bookingUrl.slice(0, 80)}`);
  debugProgress(`${store.id} start`);

  debugProgress(`${store.id} profile:read:start`);
  const { data: profile } = await supabase
    .from("store_profiles")
    .select("banner_url, logo_url, gallery_images")
    .eq("id", store.id)
    .single();
  debugProgress(`${store.id} profile:read:done`);

  debugProgress(`${store.id} rooms:read:start`);
  const { data: rooms } = await supabase
    .from("lodge_rooms")
    .select("id, name, photos")
    .eq("store_id", store.id);
  debugProgress(`${store.id} rooms:read:done ${rooms?.length ?? 0}`);

  const wantedIds = new Set<string>();
  const addWantedId = (url: string | null) => {
    if (!url || !isBookingImageUrl(url)) return;
    const id = imageIdFromUrl(url);
    if (id) wantedIds.add(id);
  };
  addWantedId(profile?.banner_url || null);
  addWantedId(profile?.logo_url || null);
  const profileGallery: any[] = Array.isArray(profile?.gallery_images)
    ? profile!.gallery_images
    : [];
  profileGallery.forEach((item) => addWantedId(extractUrl(item)));
  for (const room of rooms || []) {
    const photos: any[] = Array.isArray(room.photos) ? (room.photos as any[]) : [];
    photos.forEach((photo) => addWantedId(extractUrl(photo)));
  }

  debugProgress(`${store.id} capture:start wanted=${wantedIds.size}`);
  const captured = await captureHotelImages(context, bookingUrl, wantedIds, store.id);
  debugProgress(`${store.id} capture:done ${captured.size}`);
  console.log(`  Captured ${captured.size} unique images`);

  if (captured.size === 0) {
    console.warn(`  ⚠ No images captured — skipping.`);
    return { gallery: 0, rooms: 0, total: 0 };
  }

  // Upload all captured images to Supabase + build id→publicUrl map
  const idToPublicUrl = new Map<string, string>();
  let uploaded = 0;
  for (const [id, info] of captured) {
    if (wantedIds.size > 0 && !wantedIds.has(id)) continue;
    debugProgress(`${store.id} upload:start ${id}`);
    const ext = fileExtFromUrl(info.url);
    const storagePath = `booking-import/${store.id}/${id}.${ext}`;
    const publicUrl = DRY_RUN
      ? `dry-run://${storagePath}`
      : await uploadBuffer(
          info.buffer,
          storagePath,
          info.contentType || "image/jpeg",
        );
    if (publicUrl) {
      idToPublicUrl.set(id, publicUrl);
      uploaded++;
      debugProgress(`${store.id} upload:done ${id}`);
    }
  }
  debugProgress(`${store.id} uploads:done ${uploaded}`);
  console.log(`  ${DRY_RUN ? "Would upload" : "Uploaded"} ${uploaded}/${captured.size} to storage`);

  // ── Update store_profiles (banner, logo, gallery_images) ───────────────────
  const rewrite = (origUrl: string | null): string | null => {
    if (!origUrl) return origUrl;
    if (!isBookingImageUrl(origUrl)) return origUrl;
    const id = imageIdFromUrl(origUrl);
    if (!id) return origUrl;
    return idToPublicUrl.get(id) || origUrl;
  };

  const newBanner = rewrite(profile?.banner_url || null);
  const newLogo = rewrite(profile?.logo_url || null);

  const origGallery: any[] = profileGallery;
  let galleryMigrated = 0;
  const newGallery = origGallery.map((item) => {
    const origUrl = extractUrl(item);
    if (!origUrl || !isBookingImageUrl(origUrl)) return item;
    const newUrl = rewrite(origUrl);
    if (newUrl && newUrl !== origUrl) galleryMigrated++;
    if (typeof item === "object" && item !== null) {
      return { ...item, url: newUrl };
    }
    return newUrl;
  });

  // If gallery was empty/missing but we have captured images, populate from
  // captured (excluding banner/logo dupes)
  if (newGallery.length === 0 && idToPublicUrl.size > 0) {
    for (const url of idToPublicUrl.values()) {
      if (url !== newBanner && url !== newLogo) {
        newGallery.push({ url });
      }
    }
    galleryMigrated = newGallery.length;
  }

  console.log(`  Gallery: ${galleryMigrated} URLs rewritten`);

  if (!DRY_RUN) {
    debugProgress(`${store.id} profile:update:start`);
    const { error } = await supabase
      .from("store_profiles")
      .update({
        banner_url: newBanner,
        logo_url: newLogo,
        gallery_images: newGallery,
      })
      .eq("id", store.id);
    if (error) console.error(`  ✗ store_profiles update: ${error.message}`);
    debugProgress(`${store.id} profile:update:done`);
  }

  // ── Update lodge_rooms.photos ──────────────────────────────────────────────
  let roomsTotal = 0;
  for (const room of rooms || []) {
    const photos: any[] = Array.isArray(room.photos) ? (room.photos as any[]) : [];
    if (photos.length === 0) continue;
    let migrated = 0;
    const newPhotos = photos.map((p) => {
      const origUrl = extractUrl(p);
      if (!origUrl || !isBookingImageUrl(origUrl)) return p;
      const newUrl = rewrite(origUrl);
      if (newUrl && newUrl !== origUrl) migrated++;
      if (typeof p === "object" && p !== null) return { ...p, url: newUrl };
      return newUrl;
    });
    roomsTotal += migrated;
    console.log(`  Room "${room.name}": ${migrated}/${photos.length} rewritten`);
    if (!DRY_RUN && migrated > 0) {
      debugProgress(`${store.id} room:update:start ${room.id}`);
      const { error } = await supabase
        .from("lodge_rooms")
        .update({ photos: newPhotos })
        .eq("id", room.id);
      if (error) console.error(`  ✗ lodge_rooms update: ${error.message}`);
      debugProgress(`${store.id} room:update:done ${room.id}`);
    }
  }

  debugProgress(`${store.id} done`);
  return { gallery: galleryMigrated, rooms: roomsTotal, total: uploaded };
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log("ZIVO Image Rescue: Booking page → Supabase Storage");
  console.log("==================================================");
  if (DRY_RUN) console.log("** DRY RUN — no DB writes **\n");

  const urlMap = loadBookingUrlMap();
  if (STORE_ID && BOOKING_URL) urlMap.set(STORE_ID, normalizeBookingUrl(BOOKING_URL));
  console.log(`Loaded ${urlMap.size} storeId→bookingUrl entries from logs.\n`);

  let query = supabase
    .from("store_profiles")
    .select("id, name, gallery_images, banner_url, logo_url")
    .in("category", ["lodging", "resort", "hotel"]);
  if (STORE_ID) query = query.eq("id", STORE_ID);

  const { data: stores, error } = await query;
  if (error) {
    console.error("Fetch stores failed:", error.message);
    process.exit(1);
  }

  const eligibleIds = new Set((stores || []).map((s) => s.id));
  const roomNeeds = await storesWithBookingRoomPhotos(eligibleIds);

  // Stores that need migration: any profile media or room photo still on
  // bstatic.com. Store-id mode stays explicit even if only one side needs work.
  const needs = (stores || []).filter((s) => {
    if (STORE_ID) return true;
    if (s.banner_url && isBookingImageUrl(s.banner_url)) return true;
    if (s.logo_url && isBookingImageUrl(s.logo_url)) return true;
    const gallery = Array.isArray(s.gallery_images) ? s.gallery_images : [];
    if (gallery.some((it: any) => {
      const u = extractUrl(it);
      return u && isBookingImageUrl(u);
    })) return true;
    return roomNeeds.has(s.id);
  });

  // Filter to those we have a booking URL for
  const withUrls = needs.filter((s) => urlMap.has(s.id) && !EXCLUDE_STORE_IDS.has(s.id));
  const missing = needs.filter((s) => !urlMap.has(s.id));
  console.log(
    `${needs.length} stores need migration. ${withUrls.length} have booking URL, ${missing.length} missing.`,
  );
  if (EXCLUDE_STORE_IDS.size > 0) {
    console.log(`Skipping ${EXCLUDE_STORE_IDS.size} excluded store ids.`);
  }

  const toProcess = withUrls.slice(START, LIMIT != null ? START + LIMIT : undefined);
  if (toProcess.length === 0) {
    console.log("Nothing to process.");
    return;
  }

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-blink-features=AutomationControlled"],
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    viewport: { width: 1440, height: 900 },
    locale: "en-US",
    extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
  });

  // Optional warm-up
  try {
    const wp = await context.newPage();
    await wp.goto("https://www.booking.com/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await sleep(1500);
    await wp.close();
  } catch {}

  let totalUploaded = 0;
  let totalGallery = 0;
  let totalRooms = 0;
  let processed = 0;

  for (const store of toProcess) {
    const url = urlMap.get(store.id)!;
    try {
      const r = await processStore(context, store, url);
      totalUploaded += r.total;
      totalGallery += r.gallery;
      totalRooms += r.rooms;
    } catch (err) {
      console.error(`✗ ${store.name}: ${(err as Error).message}`);
    }
    processed++;
    console.log(`Progress: ${processed}/${toProcess.length}`);
  }

  await context.close();
  await browser.close();
  console.log(
    `\n✓ Done. Uploaded ${totalUploaded} images. Gallery: ${totalGallery}, Rooms: ${totalRooms}.`,
  );
  if (missing.length > 0) {
    console.log(
      `\n⚠ ${missing.length} stores skipped (no source URL in logs). First 5 ids:`,
    );
    missing.slice(0, 5).forEach((s) => console.log(`  ${s.id} — ${s.name}`));
  }
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
