/**
 * migrate-admin-lodging-profile-media.ts
 *
 * Clears the admin "Missing media" issue for lodging stores whose logo/cover
 * still point at Booking/bstatic by copying one authorized Booking image into
 * ZIVO Supabase Storage and using that stored image for profile + cover.
 *
 * Usage:
 *   set -a && . ./.scrape-session.local && set +a
 *   node --experimental-strip-types --no-warnings \
 *     scripts/migrate-admin-lodging-profile-media.ts --categories=hotel,resort
 */

import { chromium, type BrowserContext, type Page } from "playwright";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import fs from "fs";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BUCKET = "store-assets";
const PROTECTED_MEDIA_RE = /(^https?:\/\/)?([^/]+\.)?(booking\.com|bstatic\.com)\//i;

const args = process.argv.slice(2);
const CATEGORIES =
  args
    .find((arg) => arg.startsWith("--categories="))
    ?.split("=")[1]
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean) || ["hotel", "resort"];
const SKIP_IDS = new Set(
  (args.find((arg) => arg.startsWith("--skip-id="))?.split("=")[1] || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
);
const LIMIT = (() => {
  const value = args.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
  return value ? Number.parseInt(value, 10) : null;
})();
const CONCURRENCY = (() => {
  const value = args.find((arg) => arg.startsWith("--concurrency="))?.split("=")[1];
  return value ? Math.max(1, Number.parseInt(value, 10)) : 5;
})();
const DRY_RUN = args.includes("--dry-run");
const DIRECT_ONLY = args.includes("--direct-only");
const SIGNED_ONLY = args.includes("--signed-only");
const UNSIGNED_ONLY = args.includes("--unsigned-only");

type StoreRow = {
  id: string;
  name: string;
  category: string | null;
  logo_url: string | null;
  banner_url: string | null;
  gallery_images: unknown;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function mediaRefUrl(entry: unknown): string | null {
  if (!entry) return null;
  if (typeof entry === "string") return entry.trim() || null;
  if (typeof entry !== "object") return null;
  const ref = entry as Record<string, unknown>;
  const value = ref.url || ref.src || ref.public_url || ref.path || ref.file;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function mediaUrls(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map(mediaRefUrl).filter(Boolean) as string[];
  if (typeof value === "object") return Object.values(value).map(mediaRefUrl).filter(Boolean) as string[];
  const url = mediaRefUrl(value);
  return url ? [url] : [];
}

function isProtectedMedia(url: string | null | undefined) {
  return Boolean(url && PROTECTED_MEDIA_RE.test(url));
}

function hasAdminMissingMedia(store: StoreRow) {
  return (
    !store.logo_url ||
    !store.banner_url ||
    isProtectedMedia(store.logo_url) ||
    isProtectedMedia(store.banner_url) ||
    mediaUrls(store.gallery_images).length === 0
  );
}

function hashUrl(url: string) {
  return createHash("md5").update(url).digest("hex").slice(0, 16);
}

function fileExtFromUrl(url: string) {
  return url.match(/\.(jpg|jpeg|png|webp|gif)(?:\?|$)/i)?.[1].toLowerCase() || "jpg";
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
      // Ignore unrelated or partial logs.
    }
  }

  return map;
}

function chooseSource(store: StoreRow) {
  const candidates = [
    store.banner_url,
    store.logo_url,
    ...mediaUrls(store.gallery_images),
  ].filter(Boolean) as string[];
  return (
    candidates.find((url) => isProtectedMedia(url) && /[?&]k=/.test(url)) ||
    candidates.find(isProtectedMedia) ||
    candidates[0] ||
    null
  );
}

function hasSignedMediaCandidate(store: StoreRow) {
  return [
    store.banner_url,
    store.logo_url,
    ...mediaUrls(store.gallery_images),
  ].some((url) => Boolean(url && isProtectedMedia(url) && /[?&]k=/.test(url)));
}

async function loadBookingPageImageUrls(page: Page, bookingUrl: string) {
  const imageUrls = new Map<string, string>();
  await page.goto(bookingUrl, { waitUntil: "domcontentloaded", timeout: 15_000 });
  await sleep(1_000);
  let urls: string[] = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      urls = await page.evaluate(() =>
        Array.from(document.images)
          .map((img) => img.currentSrc || img.src)
          .filter((src) => src.includes("/xdata/images/hotel/")),
      );
      break;
    } catch (error) {
      if (!/Execution context was destroyed/i.test(String((error as Error).message || error))) {
        throw error;
      }
      await sleep(1_000);
    }
  }

  for (const url of urls) {
    const id = bookingImageId(url);
    if (id && !imageUrls.has(id)) imageUrls.set(id, url);
  }
  return imageUrls;
}

function signedSourceUrl(url: string, imageUrls: Map<string, string>) {
  const id = bookingImageId(url);
  return (id && imageUrls.get(id)) || url;
}

async function downloadDirect(imageUrl: string): Promise<Buffer | null> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        referer: "https://www.booking.com/",
        "user-agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      signal: AbortSignal.timeout(15_000),
    });
    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !contentType.startsWith("image/")) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    return buffer.length > 1024 ? buffer : null;
  } catch {
    return null;
  }
}

async function downloadInBookingPage(
  context: BrowserContext,
  page: Page,
  imageUrl: string,
): Promise<Buffer | null> {
  const result = await page.evaluate(async (url: string) => {
    try {
      const response = await fetch(url, {
        credentials: "include",
        referrerPolicy: "strict-origin-when-cross-origin",
      });
      if (!response.ok) return { ok: false, status: response.status, body: "" };
      const blob = await response.blob();
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      const chunkSize = 0x8000;
      for (let offset = 0; offset < bytes.length; offset += chunkSize) {
        binary += String.fromCharCode.apply(
          null,
          Array.from(bytes.subarray(offset, offset + chunkSize)),
        );
      }
      return {
        ok: true,
        status: response.status,
        body: btoa(binary),
      };
    } catch (error) {
      return { ok: false, status: 0, body: String((error as Error).message || error) };
    }
  }, imageUrl);

  if (!result.ok) {
    const imagePage = await context.newPage();
    try {
      let buffer: Buffer | null = null;
      imagePage.on("response", async (response) => {
        if (response.url() === imageUrl && response.ok()) {
          try {
            buffer = Buffer.from(await response.body());
          } catch {}
        }
      });
      const response = await imagePage.goto(imageUrl, {
        waitUntil: "load",
        timeout: 15_000,
        referer: "https://www.booking.com/",
      });
      if (!buffer && response?.ok()) {
        buffer = Buffer.from(await response.body());
      }
      if (buffer) return buffer;
      console.warn(`  fetch failed ${result.status}: ${imageUrl}`);
      return null;
    } finally {
      await imagePage.close().catch(() => {});
    }
  }

  return Buffer.from(result.body, "base64");
}

async function uploadProfileMedia(storeId: string, imageUrl: string, buffer: Buffer) {
  const ext = fileExtFromUrl(imageUrl);
  const storagePath = `booking-import/${storeId}/profile/profile-cover-${hashUrl(imageUrl)}.${ext}`;
  const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    upsert: true,
    contentType,
    cacheControl: "31536000",
  });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

async function fetchStores() {
  let rows: StoreRow[] = [];
  const pageSize = 1000;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from("store_profiles")
      .select("id,name,category,logo_url,banner_url,gallery_images")
      .in("category", CATEGORIES)
      .order("created_at", { ascending: false })
      .range(from, from + pageSize - 1);

    if (error) throw error;
    rows = rows.concat((data || []) as StoreRow[]);
    if (!data || data.length < pageSize) break;
  }

  return rows;
}

async function launchBookingContext() {
  const browser = await chromium.launch({
    headless: true,
  });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  });
  const closeContext = context.close.bind(context);
  context.close = async (...args: Parameters<typeof context.close>) => {
    await closeContext(...args).catch(() => {});
    await browser.close().catch(() => {});
  };
  return context;
}

function isContextClosedError(error: unknown) {
  return /Target page, context or browser has been closed|Browser closed|has been closed/i.test(
    String((error as Error)?.message || error),
  );
}

async function main() {
  console.log("ZIVO Admin Missing Media Profile/Cover Migration");
  console.log("================================================");
  console.log(`Categories: ${CATEGORIES.join(", ")}`);
  console.log(`Concurrency: ${CONCURRENCY}`);
  if (DRY_RUN) console.log("** DRY RUN — no database writes **");
  if (DIRECT_ONLY) console.log("** DIRECT ONLY — browser fallback disabled **");
  if (SIGNED_ONLY) console.log("** SIGNED ONLY **");
  if (UNSIGNED_ONLY) console.log("** UNSIGNED ONLY **");

  const allStores = await fetchStores();
  let missing = allStores.filter(hasAdminMissingMedia);
  if (SIGNED_ONLY) missing = missing.filter(hasSignedMediaCandidate);
  if (UNSIGNED_ONLY) missing = missing.filter((store) => !hasSignedMediaCandidate(store));
  if (SKIP_IDS.size) missing = missing.filter((store) => !SKIP_IDS.has(store.id));
  const toProcess = LIMIT ? missing.slice(0, LIMIT) : missing;
  console.log(`Found ${missing.length} admin-missing media stores. Processing ${toProcess.length}.`);

  if (!toProcess.length) return;

  let context = DIRECT_ONLY ? null : await launchBookingContext();

  const bookingUrlsByStore = loadBookingUrlMap();
  console.log(`Loaded ${bookingUrlsByStore.size} saved Booking.com hotel URLs.`);

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  async function processOne(store: StoreRow, index: number) {
    const source = chooseSource(store);
    const prefix = `[${index + 1}/${toProcess.length}] ${store.name}`;

    if (!source) {
      console.log(`${prefix} ... skipped (no image source)`);
      return "skipped" as const;
    }

    try {
      let buffer = await downloadDirect(source);
      if (!buffer && DIRECT_ONLY) {
        console.log(`${prefix} ... failed`);
        return "failed" as const;
      }

      if (!buffer) {
        if (!context) context = await launchBookingContext();
        let page: Page | null = null;
        try {
          page = await context.newPage();
          const bookingUrl = bookingUrlsByStore.get(store.id);
          let imageUrls = new Map<string, string>();
          if (bookingUrl) {
            imageUrls = await loadBookingPageImageUrls(page, bookingUrl).catch((error) => {
              console.warn(`  page load failed: ${(error as Error).message}`);
              return new Map<string, string>();
            });
          } else {
            await page.goto("https://www.booking.com/", {
              waitUntil: "domcontentloaded",
              timeout: 30_000,
            });
          }

          const signedUrl = signedSourceUrl(source, imageUrls);
          const pageImageUrl =
            signedUrl === source && imageUrls.size > 0
              ? Array.from(imageUrls.values())[0]
              : signedUrl;
          buffer = await downloadDirect(pageImageUrl);
          if (!buffer) buffer = await downloadInBookingPage(context, page, pageImageUrl);
        } finally {
          await page?.close().catch(() => {});
        }
      }

      if (!buffer) {
        console.log(`${prefix} ... failed`);
        return "failed" as const;
      }

      const publicUrl = await uploadProfileMedia(store.id, source, buffer);
      if (!DRY_RUN) {
        const gallery = mediaUrls(store.gallery_images);
        const patch: Record<string, unknown> = {
          logo_url: publicUrl,
          banner_url: publicUrl,
        };
        if (gallery.length === 0) patch.gallery_images = [{ url: publicUrl, order: 0 }];

        const { error } = await supabase
          .from("store_profiles")
          .update(patch)
          .eq("id", store.id);
        if (error) throw error;
      }

      console.log(`${prefix} ... updated`);
      return "updated" as const;
    } catch (error) {
      if (isContextClosedError(error)) {
        console.log(`${prefix} ... browser closed; will retry after relaunch`);
        return "browser-closed" as const;
      }
      console.log(`${prefix} ... error: ${(error as Error).message}`);
      return "failed" as const;
    }
  }

  for (let index = 0; index < toProcess.length; index += CONCURRENCY) {
    const batch = toProcess.slice(index, index + CONCURRENCY);
    const results = await Promise.all(
      batch.map((store, offset) => processOne(store, index + offset)),
    );
    for (const result of results) {
      if (result === "updated") updated++;
      else if (result === "skipped") skipped++;
      else if (result === "browser-closed") failed++;
      else failed++;
    }
    if (results.some((result) => result === "browser-closed")) {
      await context?.close().catch(() => {});
      context = await launchBookingContext();
      console.log("Relaunched browser context after a closed-context failure.");
    }
    console.log(`Progress: ${Math.min(index + batch.length, toProcess.length)}/${toProcess.length}`);
  }

  await context?.close();
  console.log(`Done. updated=${updated} skipped=${skipped} failed=${failed}`);
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
