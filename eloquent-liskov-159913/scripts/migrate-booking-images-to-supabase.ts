/**
 * migrate-booking-images-to-supabase.ts
 *
 * Downloads Booking.com hotel images via an authenticated Playwright session
 * (the only way to bypass their 401/hotlink protection) and uploads them to
 * Supabase Storage. Then updates store_profiles.gallery_images,
 * store_profiles.banner_url, and lodge_rooms.photos with the new public URLs.
 *
 * Usage:
 *   set -a && . ./.scrape-session.local && set +a
 *   node --experimental-strip-types --no-warnings \
 *     scripts/migrate-booking-images-to-supabase.ts [--store-id=UUID] [--limit=N]
 */

import { chromium, type BrowserContext, type Page } from "playwright";

// We fetch images from inside a live booking.com page tab so the browser
// supplies the right cookies, Referer, sec-fetch-* and TLS fingerprint.
let sharedPage: Page | null = null;
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import path from "path";
import fs from "fs";

// ─── Config ───────────────────────────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BUCKET = "store-assets";

// CLI args
const args = process.argv.slice(2);
const STORE_ID =
  args.find((a) => a.startsWith("--store-id="))?.split("=")[1] || null;
const BOOKING_URL =
  args.find((a) => a.startsWith("--booking-url="))?.split("=")[1] || null;
const LIMIT = (() => {
  const v = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
  return v ? parseInt(v, 10) : null;
})();
const DRY_RUN = args.includes("--dry-run");
const bookingPageImageUrls = new Map<string, string>();

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function extractUrl(item: any): string | null {
  if (!item) return null;
  if (typeof item === "string") return item;
  if (typeof item === "object") return item.url || item.src || null;
  return null;
}

function isBookingUrl(url: string): boolean {
  return /bstatic\.com|booking\.com/.test(url);
}

function hashUrl(url: string): string {
  return createHash("md5").update(url).digest("hex").substring(0, 12);
}

function fileExtFromUrl(url: string): string {
  const m = url.match(/\.(jpg|jpeg|png|webp|gif)(?:\?|$)/i);
  return m ? m[1].toLowerCase() : "jpg";
}

function bookingImageId(url: string): string | null {
  return url.match(/\/xdata\/images\/hotel\/[^/]+\/(\d+)\.(?:jpg|jpeg|png|webp|gif)(?:\?|$)/i)?.[1] || null;
}

function normalizeBookingUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl.replace(/&amp;/g, "&"));
    if (!/booking\.com$/i.test(url.hostname) && !/\.booking\.com$/i.test(url.hostname)) {
      return null;
    }
    url.searchParams.set("selected_currency", "USD");
    url.searchParams.set("lang", "en-us");
    return `${url.origin}${url.pathname}?${url.searchParams.toString()}`;
  } catch {
    return null;
  }
}

function loadBookingUrlMap(): Map<string, string> {
  const map = new Map<string, string>();
  const files = fs
    .readdirSync(".")
    .filter((name) => name.startsWith("booking-") && name.endsWith(".json"));

  for (const file of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(file, "utf8"));
      const visit = (value: unknown) => {
        if (!value || typeof value !== "object") return;
        if (Array.isArray(value)) {
          value.forEach(visit);
          return;
        }

        const record = value as Record<string, unknown>;
        const id = record.storeId || record.store_id || record.id;
        const rawUrl =
          record.bookingUrl ||
          record.booking_url ||
          record.cleanUrl ||
          record.source_url ||
          record.url;

        if (
          typeof id === "string" &&
          id.length > 30 &&
          typeof rawUrl === "string" &&
          rawUrl.includes("booking.com")
        ) {
          const url = normalizeBookingUrl(rawUrl);
          if (url && !map.has(id)) map.set(id, url);
        }

        Object.values(record).forEach(visit);
      };
      visit(raw);
    } catch {
      // Ignore partial logs or unrelated JSON files.
    }
  }

  return map;
}

function sourceUrlForDownload(url: string): string {
  const id = bookingImageId(url);
  if (!id) return url;
  return bookingPageImageUrls.get(id) || url;
}

async function loadBookingPageImageUrls(page: Page, bookingUrl: string) {
  console.log("  Loading Booking.com hotel page for signed image URLs...");
  await page.goto(bookingUrl, {
    waitUntil: "domcontentloaded",
    timeout: 45_000,
  });
  await sleep(4_000);

  const urls = await page.evaluate(() =>
    Array.from(document.images)
      .map((img) => img.currentSrc || img.src)
      .filter((src) => src.includes("/xdata/images/hotel/")),
  );

  for (const url of urls) {
    const id = bookingImageId(url);
    if (id && !bookingPageImageUrls.has(id)) bookingPageImageUrls.set(id, url);
  }
  console.log(`  Found ${bookingPageImageUrls.size} signed hotel image URLs on Booking.com`);
}

async function downloadViaPlaywright(
  context: BrowserContext,
  url: string,
): Promise<Buffer | null> {
  if (!sharedPage) {
    console.warn("  ✗ sharedPage not initialized");
    return null;
  }

  // Strategy 1: fetch from inside the booking.com page context (real browser
  // origin → browser auto-attaches cookies, Referer, sec-fetch-site, etc).
  try {
    const dataUrl = await sharedPage.evaluate(async (imgUrl: string) => {
      try {
        const r = await fetch(imgUrl, {
          credentials: "include",
          referrerPolicy: "strict-origin-when-cross-origin",
        });
        if (!r.ok) return `ERR:${r.status}`;
        const blob = await r.blob();
        const buf = await blob.arrayBuffer();
        // Convert to base64 in chunks to avoid call-stack overflow
        const bytes = new Uint8Array(buf);
        let binary = "";
        const chunk = 0x8000;
        for (let i = 0; i < bytes.length; i += chunk) {
          binary += String.fromCharCode.apply(
            null,
            Array.from(bytes.subarray(i, i + chunk)),
          );
        }
        return `OK:${btoa(binary)}`;
      } catch (e) {
        return `ERR:${(e as Error).message}`;
      }
    }, url);

    if (dataUrl.startsWith("OK:")) {
      return Buffer.from(dataUrl.slice(3), "base64");
    }
    // Fall through to strategy 2
    if (!dataUrl.startsWith("ERR:404")) {
      // console.warn(`  page-fetch: ${dataUrl.slice(0, 40)}`);
    }
  } catch (err) {
    // fall through
  }

  // Strategy 2: navigate a tab directly to the image URL and capture response
  try {
    const imgPage = await context.newPage();
    let buf: Buffer | null = null;
    imgPage.on("response", async (resp) => {
      if (resp.url() === url && resp.ok()) {
        try {
          buf = await resp.body();
        } catch {}
      }
    });
    const navResp = await imgPage.goto(url, {
      waitUntil: "load",
      timeout: 15000,
      referer: "https://www.booking.com/",
    });
    if (!buf && navResp && navResp.ok()) {
      try {
        buf = Buffer.from(await navResp.body());
      } catch {}
    }
    await imgPage.close();
    if (buf) return buf;
    if (navResp) {
      console.warn(`  ✗ ${navResp.status()} for ${url.slice(-60)}`);
    }
    return null;
  } catch (err) {
    console.warn(`  ✗ fetch error: ${(err as Error).message}`);
    return null;
  }
}

async function uploadToSupabase(
  buffer: Buffer,
  storagePath: string,
  contentType = "image/jpeg",
): Promise<string | null> {
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType,
      upsert: true,
      cacheControl: "31536000",
    });
  if (error) {
    console.warn(`  ✗ upload error: ${error.message}`);
    return null;
  }
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

async function migrateOneUrl(
  context: BrowserContext,
  storeId: string,
  url: string,
  subdir: "gallery" | "rooms",
): Promise<string | null> {
  if (!isBookingUrl(url)) return url; // already migrated or external

  const ext = fileExtFromUrl(url);
  const filename = `${hashUrl(url)}.${ext}`;
  const storagePath = `booking-import/${storeId}/${subdir}/${filename}`;

  // Check if already uploaded
  const { data: existing } = await supabase.storage
    .from(BUCKET)
    .list(`booking-import/${storeId}/${subdir}`, {
      search: filename,
    });
  if (existing && existing.some((f) => f.name === filename)) {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
    return data.publicUrl;
  }

  const sourceUrl = sourceUrlForDownload(url);
  const buffer = await downloadViaPlaywright(context, sourceUrl);
  if (!buffer) return null;

  const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  return await uploadToSupabase(buffer, storagePath, contentType);
}

// ─── Main migration ───────────────────────────────────────────────────────────
async function processStore(
  context: BrowserContext,
  store: { id: string; name: string },
) {
  console.log(`\n→ ${store.name} (${store.id})`);

  // 1) Gallery images
  const { data: profile } = await supabase
    .from("store_profiles")
    .select("banner_url, logo_url, gallery_images")
    .eq("id", store.id)
    .single();

  let bannerUrl: string | null = profile?.banner_url || null;
  let logoUrl: string | null = profile?.logo_url || null;
  let gallery: any[] = Array.isArray(profile?.gallery_images)
    ? profile!.gallery_images
    : [];
  if (gallery.length === 0 && bookingPageImageUrls.size > 0) {
    gallery = Array.from(bookingPageImageUrls.values())
      .slice(0, 60)
      .map((url, index) => ({ url, order: index }));
    console.log(`  Rebuilt empty gallery from ${gallery.length} Booking.com page images`);
  }

  // Migrate gallery items
  let migrated = 0;
  const newGallery: any[] = [];
  for (let i = 0; i < gallery.length; i++) {
    const item = gallery[i];
    const origUrl = extractUrl(item);
    if (!origUrl) continue;
    if (!isBookingUrl(origUrl)) {
      newGallery.push(item);
      continue;
    }
    const newUrl = await migrateOneUrl(context, store.id, origUrl, "gallery");
    if (newUrl) {
      // Preserve metadata if it was an object
      if (typeof item === "object" && item !== null) {
        newGallery.push({ ...item, url: newUrl });
      } else {
        newGallery.push({ url: newUrl });
      }
      migrated++;
    } else {
      newGallery.push(item);
    }
    if (i % 5 === 4) process.stdout.write(`  ...${i + 1}/${gallery.length}\r`);
  }

  // Migrate banner
  let newBanner = bannerUrl;
  if (bannerUrl && isBookingUrl(bannerUrl)) {
    newBanner = (await migrateOneUrl(context, store.id, bannerUrl, "gallery")) || bannerUrl;
  }
  // If banner wasn't migrated but gallery has urls, use first gallery item
  if ((!newBanner || isBookingUrl(newBanner)) && newGallery.length > 0) {
    newBanner = extractUrl(newGallery[0]);
  }

  // Migrate logo
  let newLogo = logoUrl;
  if (logoUrl && isBookingUrl(logoUrl)) {
    newLogo = (await migrateOneUrl(context, store.id, logoUrl, "gallery")) || logoUrl;
  }

  console.log(`  Gallery: ${migrated}/${gallery.length} migrated`);

  if (!DRY_RUN) {
    const { error } = await supabase
      .from("store_profiles")
      .update({
        banner_url: newBanner,
        logo_url: newLogo,
        gallery_images: newGallery,
      })
      .eq("id", store.id);
    if (error) console.error(`  ✗ store_profiles update: ${error.message}`);
  }

  // 2) Room photos
  const { data: rooms } = await supabase
    .from("lodge_rooms")
    .select("id, name, photos")
    .eq("store_id", store.id);

  for (const room of rooms || []) {
    const photos = Array.isArray(room.photos) ? (room.photos as any[]) : [];
    if (photos.length === 0) continue;

    const newPhotos: any[] = [];
    let roomMigrated = 0;
    for (const photo of photos) {
      const origUrl = extractUrl(photo);
      if (!origUrl) continue;
      if (!isBookingUrl(origUrl)) {
        newPhotos.push(photo);
        continue;
      }
      const newUrl = await migrateOneUrl(context, store.id, origUrl, "rooms");
      if (newUrl) {
        if (typeof photo === "object" && photo !== null) {
          newPhotos.push({ ...photo, url: newUrl });
        } else {
          newPhotos.push({ url: newUrl });
        }
        roomMigrated++;
      } else {
        newPhotos.push(photo);
      }
    }
    console.log(`  Room "${room.name}": ${roomMigrated}/${photos.length} migrated`);

    if (!DRY_RUN && roomMigrated > 0) {
      const { error } = await supabase
        .from("lodge_rooms")
        .update({ photos: newPhotos })
        .eq("id", room.id);
      if (error) console.error(`  ✗ lodge_rooms update: ${error.message}`);
    }
  }
}

async function main() {
  console.log("ZIVO Image Migration: Booking.com → Supabase Storage");
  console.log("====================================================");
  if (DRY_RUN) console.log("** DRY RUN — no database writes **");

  // Fetch lodging stores to migrate
  let query = supabase
    .from("store_profiles")
    .select("id, name, description, banner_url, logo_url, gallery_images")
    .in("category", ["lodging", "resort", "hotel"]);

  if (STORE_ID) query = query.eq("id", STORE_ID);

  const { data: stores, error } = await query;
  if (error) {
    console.error("Failed to fetch stores:", error.message);
    process.exit(1);
  }

  // Filter to stores that still have Booking URLs
  const needsMigration = STORE_ID ? (stores || []) : (stores || []).filter((s) => {
    const gallery = Array.isArray(s.gallery_images) ? s.gallery_images : [];
    const hasGalleryBookingUrl = gallery.some((item: any) => {
      const url = extractUrl(item);
      return url && isBookingUrl(url);
    });
    return (
      hasGalleryBookingUrl ||
      (s.banner_url && isBookingUrl(s.banner_url)) ||
      (s.logo_url && isBookingUrl(s.logo_url))
    );
  });

  const toProcess = LIMIT ? needsMigration.slice(0, LIMIT) : needsMigration;
  console.log(
    `Found ${needsMigration.length} stores with Booking URLs. Processing ${toProcess.length}.\n`,
  );

  if (toProcess.length === 0) {
    console.log("Nothing to migrate.");
    return;
  }

  // Launch Playwright with persistent session
  const sessionDir = path.resolve(".booking-session");
  const context = await chromium.launchPersistentContext(sessionDir, {
    headless: true,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });

  // Warm up session by visiting Booking once. Keep this tab around — we'll
  // use it as the origin for in-page fetch() calls so the browser supplies
  // cookies, Referer, and sec-fetch headers automatically.
  const page = await context.newPage();
  await page.goto("https://www.booking.com/", {
    waitUntil: "domcontentloaded",
    timeout: 30000,
  });
  await sleep(2000);
  sharedPage = page;
  const bookingUrlsByStore = loadBookingUrlMap();
  const directBookingUrl = BOOKING_URL ? normalizeBookingUrl(BOOKING_URL) : null;
  console.log(`Loaded ${bookingUrlsByStore.size} saved Booking.com hotel URLs.`);

  let processed = 0;
  for (const store of toProcess) {
    try {
      bookingPageImageUrls.clear();
      const bookingUrl =
        STORE_ID && directBookingUrl
          ? directBookingUrl
          : bookingUrlsByStore.get(store.id);
      if (bookingUrl) {
        try {
          await loadBookingPageImageUrls(page, bookingUrl);
        } catch (err) {
          console.warn(
            `  Could not load Booking.com page for signed images: ${(err as Error).message}`,
          );
        }
      } else {
        console.warn("  No saved Booking.com hotel URL for this store; using existing URLs only.");
      }
      await processStore(context, store);
      processed++;
    } catch (err) {
      console.error(`✗ Error processing ${store.name}: ${(err as Error).message}`);
    }
    console.log(`Progress: ${processed}/${toProcess.length}`);
  }

  await context.close();
  console.log(`\n✓ Done. Processed ${processed}/${toProcess.length} stores.`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
