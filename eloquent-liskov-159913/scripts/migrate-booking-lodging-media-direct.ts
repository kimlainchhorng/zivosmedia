/**
 * migrate-booking-lodging-media-direct.ts
 *
 * Fast path for authorized Booking.com lodging media migration. Signed
 * cf.bstatic.com image URLs with a `k=` token can be downloaded directly, then
 * uploaded to Supabase Storage and rewritten in store_profiles.gallery_images
 * and lodge_rooms.photos.
 *
 * Usage:
 *   set -a && . ./.scrape-session.local && set +a
 *   node --experimental-strip-types --no-warnings \
 *     scripts/migrate-booking-lodging-media-direct.ts --categories=hotel,resort
 */

import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const BUCKET = "store-assets";

const args = process.argv.slice(2);
const STORE_ID = args.find((a) => a.startsWith("--store-id="))?.split("=")[1] || null;
const CATEGORIES =
  args
    .find((a) => a.startsWith("--categories="))
    ?.split("=")[1]
    ?.split(",")
    .map((s) => s.trim())
    .filter(Boolean) || ["hotel", "resort"];
const LIMIT = (() => {
  const raw = args.find((a) => a.startsWith("--limit="))?.split("=")[1];
  return raw ? Number.parseInt(raw, 10) : null;
})();
const STORE_CONCURRENCY = (() => {
  const raw = args.find((a) => a.startsWith("--concurrency="))?.split("=")[1];
  return raw ? Math.max(1, Number.parseInt(raw, 10)) : 4;
})();
const IMAGE_CONCURRENCY = (() => {
  const raw = args.find((a) => a.startsWith("--image-concurrency="))?.split("=")[1];
  return raw ? Math.max(1, Number.parseInt(raw, 10)) : 12;
})();
const DRY_RUN = args.includes("--dry-run");
const UNSIGNED_ONLY = args.includes("--unsigned-only");
const INCLUDE_UNSIGNED = args.includes("--include-unsigned") || UNSIGNED_ONLY;
const SIGNED_ONLY = args.includes("--signed-only") || !INCLUDE_UNSIGNED;
const SKIP_IDS = new Set(
  args
    .filter((a) => a.startsWith("--skip-id="))
    .flatMap((a) => a.split("=").slice(1).join("=").split(","))
    .map((id) => id.trim())
    .filter(Boolean),
);

type StoreRow = {
  id: string;
  name: string;
  category: string;
  logo_url: string | null;
  banner_url: string | null;
  gallery_images: unknown;
};

type RoomRow = {
  id: string;
  store_id: string;
  name: string | null;
  photos: unknown;
};

type MigrationResult = {
  processed: number;
  updatedStores: number;
  updatedRooms: number;
  uploaded: number;
  failed: number;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function extractUrl(item: unknown): string | null {
  if (!item) return null;
  if (typeof item === "string") return item;
  if (typeof item === "object") {
    const record = item as Record<string, unknown>;
    const value =
      record.url ||
      record.src ||
      record.public_url ||
      record.path ||
      record.file;
    return typeof value === "string" ? value : null;
  }
  return null;
}

function replaceUrl(item: unknown, url: string): unknown {
  if (item && typeof item === "object" && !Array.isArray(item)) {
    return { ...(item as Record<string, unknown>), url };
  }
  return { url };
}

function isBookingImageUrl(url: string): boolean {
  return /(^https?:\/\/)?([^/]+\.)?(booking\.com|bstatic\.com)\//i.test(url);
}

function isSignedBookingImageUrl(url: string): boolean {
  return /[?&]k=/i.test(url);
}

function shouldMigrateUrl(url: string | null): url is string {
  if (!url || !isBookingImageUrl(url)) return false;
  if (SIGNED_ONLY && !isSignedBookingImageUrl(url)) return false;
  if (UNSIGNED_ONLY && isSignedBookingImageUrl(url)) return false;
  return true;
}

function hashUrl(url: string): string {
  return createHash("sha256").update(url).digest("hex").slice(0, 24);
}

function fileExtFromUrl(url: string): string {
  const match = url.match(/\.(jpg|jpeg|png|webp|gif)(?:[?#]|$)/i);
  return match ? match[1].toLowerCase() : "jpg";
}

function contentTypeForExt(ext: string): string {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    for (;;) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

async function fetchStores(): Promise<StoreRow[]> {
  let query = supabase
    .from("store_profiles")
    .select("id,name,category,logo_url,banner_url,gallery_images")
    .in("category", CATEGORIES)
    .order("created_at", { ascending: false });
  if (STORE_ID) query = query.eq("id", STORE_ID);

  const rows: StoreRow[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query.range(from, from + 999);
    if (error) throw new Error(`store_profiles read failed: ${error.message}`);
    rows.push(...((data || []) as StoreRow[]));
    if (!data || data.length < 1000) break;
  }
  return rows.filter((s) => !SKIP_IDS.has(s.id));
}

async function fetchRooms(storeIds: string[]): Promise<RoomRow[]> {
  const rooms: RoomRow[] = [];
  for (let i = 0; i < storeIds.length; i += 200) {
    const { data, error } = await supabase
      .from("lodge_rooms")
      .select("id,store_id,name,photos")
      .in("store_id", storeIds.slice(i, i + 200));
    if (error) throw new Error(`lodge_rooms read failed: ${error.message}`);
    rooms.push(...((data || []) as RoomRow[]));
  }
  return rooms;
}

async function downloadImage(url: string): Promise<Buffer | null> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          accept: "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
          "accept-language": "en-US,en;q=0.9",
          referer: "https://www.booking.com/",
          "user-agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      if (!response.ok) return null;
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.startsWith("image/")) return null;
      return Buffer.from(await response.arrayBuffer());
    } catch (error) {
      if (attempt === 3) throw error;
      await sleep(400 * attempt);
    }
  }
  return null;
}

async function uploadImage(storeId: string, url: string): Promise<string | null> {
  const ext = fileExtFromUrl(url);
  const storagePath = `booking-import/${storeId}/direct/${hashUrl(url)}.${ext}`;
  if (DRY_RUN) return `dry-run://${storagePath}`;

  const buffer = await downloadImage(url);
  if (!buffer) return null;

  const { error } = await supabase.storage.from(BUCKET).upload(storagePath, buffer, {
    cacheControl: "31536000",
    contentType: contentTypeForExt(ext),
    upsert: true,
  });
  if (error) {
    console.warn(`  upload failed ${storagePath}: ${error.message}`);
    return null;
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  return data.publicUrl;
}

function hasMigratableStoreMedia(store: StoreRow): boolean {
  if (shouldMigrateUrl(store.logo_url)) return true;
  if (shouldMigrateUrl(store.banner_url)) return true;
  const gallery = Array.isArray(store.gallery_images) ? store.gallery_images : [];
  return gallery.some((item) => shouldMigrateUrl(extractUrl(item)));
}

function hasMigratableRoomMedia(rooms: RoomRow[]): boolean {
  return rooms.some((room) => {
    const photos = Array.isArray(room.photos) ? room.photos : [];
    return photos.some((item) => shouldMigrateUrl(extractUrl(item)));
  });
}

async function processStore(store: StoreRow, rooms: RoomRow[]): Promise<MigrationResult> {
  const urls = new Set<string>();
  if (shouldMigrateUrl(store.logo_url)) urls.add(store.logo_url);
  if (shouldMigrateUrl(store.banner_url)) urls.add(store.banner_url);
  for (const item of Array.isArray(store.gallery_images) ? store.gallery_images : []) {
    const url = extractUrl(item);
    if (shouldMigrateUrl(url)) urls.add(url);
  }
  for (const room of rooms) {
    for (const photo of Array.isArray(room.photos) ? room.photos : []) {
      const url = extractUrl(photo);
      if (shouldMigrateUrl(url)) urls.add(url);
    }
  }

  const urlList = Array.from(urls);
  const replacements = new Map<string, string>();
  let failed = 0;
  await mapPool(urlList, IMAGE_CONCURRENCY, async (url) => {
    const newUrl = await uploadImage(store.id, url).catch((error) => {
      console.warn(`  download/upload failed: ${(error as Error).message}`);
      return null;
    });
    if (newUrl) replacements.set(url, newUrl);
    else failed++;
  });

  let updatedStores = 0;
  const profilePatch: Partial<StoreRow> = {};
  if (store.logo_url && replacements.has(store.logo_url)) profilePatch.logo_url = replacements.get(store.logo_url)!;
  if (store.banner_url && replacements.has(store.banner_url)) profilePatch.banner_url = replacements.get(store.banner_url)!;

  const gallery = Array.isArray(store.gallery_images) ? store.gallery_images : [];
  let galleryChanged = false;
  const newGallery = gallery.map((item) => {
    const url = extractUrl(item);
    if (!url || !replacements.has(url)) return item;
    galleryChanged = true;
    return replaceUrl(item, replacements.get(url)!);
  });
  if (galleryChanged) profilePatch.gallery_images = newGallery as never;

  if (Object.keys(profilePatch).length > 0) {
    updatedStores = 1;
    if (!DRY_RUN) {
      const { error } = await supabase.from("store_profiles").update(profilePatch).eq("id", store.id);
      if (error) throw new Error(`store_profiles update failed: ${error.message}`);
    }
  }

  let updatedRooms = 0;
  for (const room of rooms) {
    const photos = Array.isArray(room.photos) ? room.photos : [];
    let changed = false;
    const newPhotos = photos.map((photo) => {
      const url = extractUrl(photo);
      if (!url || !replacements.has(url)) return photo;
      changed = true;
      return replaceUrl(photo, replacements.get(url)!);
    });
    if (!changed) continue;
    updatedRooms++;
    if (!DRY_RUN) {
      const { error } = await supabase
        .from("lodge_rooms")
        .update({ photos: newPhotos })
        .eq("id", room.id);
      if (error) throw new Error(`lodge_rooms update failed for ${room.id}: ${error.message}`);
    }
  }

  return {
    failed,
    processed: 1,
    updatedRooms,
    updatedStores,
    uploaded: replacements.size,
  };
}

async function main() {
  console.log("ZIVO direct Booking lodging media migration");
  console.log("===========================================");
  console.log(`Categories: ${CATEGORIES.join(", ")}`);
  console.log(`Mode: ${SIGNED_ONLY ? "signed-only" : UNSIGNED_ONLY ? "unsigned-only" : "all direct URLs"}`);
  console.log(`Store concurrency: ${STORE_CONCURRENCY}, image concurrency: ${IMAGE_CONCURRENCY}`);
  if (DRY_RUN) console.log("** DRY RUN — no writes **");

  const stores = await fetchStores();
  const rooms = await fetchRooms(stores.map((s) => s.id));
  const roomsByStore = new Map<string, RoomRow[]>();
  for (const room of rooms) {
    if (!roomsByStore.has(room.store_id)) roomsByStore.set(room.store_id, []);
    roomsByStore.get(room.store_id)!.push(room);
  }

  const needs = stores.filter(
    (store) =>
      hasMigratableStoreMedia(store) ||
      hasMigratableRoomMedia(roomsByStore.get(store.id) || []),
  );
  const toProcess = LIMIT == null ? needs : needs.slice(0, LIMIT);
  console.log(`Need migration: ${needs.length}; processing: ${toProcess.length}`);

  const total: MigrationResult = {
    failed: 0,
    processed: 0,
    updatedRooms: 0,
    updatedStores: 0,
    uploaded: 0,
  };

  await mapPool(toProcess, STORE_CONCURRENCY, async (store, index) => {
    const roomRows = roomsByStore.get(store.id) || [];
    const result = await processStore(store, roomRows).catch((error) => {
      console.error(`✗ ${store.name}: ${(error as Error).message}`);
      return {
        failed: 0,
        processed: 1,
        updatedRooms: 0,
        updatedStores: 0,
        uploaded: 0,
      };
    });
    total.failed += result.failed;
    total.processed += result.processed;
    total.updatedRooms += result.updatedRooms;
    total.updatedStores += result.updatedStores;
    total.uploaded += result.uploaded;
    console.log(
      `[${index + 1}/${toProcess.length}] ${store.name}: uploaded ${result.uploaded}, store ${result.updatedStores}, rooms ${result.updatedRooms}, failed ${result.failed}`,
    );
  });

  console.log("\nDone");
  console.log(JSON.stringify(total, null, 2));
}

main().catch((error) => {
  console.error("Fatal:", error);
  process.exit(1);
});
