/**
 * Import a hotel manifest into Supabase.
 *
 * This importer is intentionally conservative:
 * - dry-run is the default;
 * - room prices are skipped unless --apply-rates is passed;
 * - media is skipped unless --apply-media is passed and the manifest has
 *   media_authorized=true.
 *
 * Usage:
 *   node --experimental-strip-types --no-warnings \
 *     scripts/import-authorized-hotel-manifest.ts \
 *     data/hotel-imports/chateau-kampot.authorized-template.json
 *
 * Apply factual fields:
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node --experimental-strip-types --no-warnings \
 *     scripts/import-authorized-hotel-manifest.ts data/hotel-imports/chateau-kampot.authorized-template.json --apply
 *
 * Apply explicitly authorized third-party media:
 *   node --experimental-strip-types --no-warnings \
 *     scripts/import-authorized-hotel-manifest.ts data/hotel-imports/chateau-kampot.booking-authorized-import.json \
 *     --apply --apply-media --apply-rates --allow-third-party-media
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";

type JsonRecord = Record<string, any>;
type MediaRef = string | {
  url?: string | null;
  public_url?: string | null;
  file?: string | null;
  path?: string | null;
  src?: string | null;
  caption?: string;
  order?: number;
};

interface ImportManifest {
  store_id: string;
  media_authorized?: boolean;
  media?: {
    logo_url?: string | null;
    logo_file?: string | null;
    banner_url?: string | null;
    banner_file?: string | null;
    gallery_images?: unknown[];
  };
  store_profile?: JsonRecord;
  property_profile?: JsonRecord;
  rooms?: JsonRecord[];
}

const args = process.argv.slice(2);
const manifestPath = args.find((arg) => !arg.startsWith("--"));
const APPLY = args.includes("--apply");
const APPLY_MEDIA = args.includes("--apply-media");
const APPLY_RATES = args.includes("--apply-rates");
const ALLOW_THIRD_PARTY_MEDIA = args.includes("--allow-third-party-media");

if (!manifestPath) {
  console.error("Usage: import-authorized-hotel-manifest.ts <manifest.json> [--apply] [--apply-media] [--apply-rates] [--allow-third-party-media]");
  process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "store-assets";

function readManifest(filePath: string): ImportManifest {
  const fullPath = path.resolve(filePath);
  const parsed = JSON.parse(readFileSync(fullPath, "utf8")) as ImportManifest;
  if (!parsed.store_id || typeof parsed.store_id !== "string") {
    throw new Error("Manifest is missing store_id.");
  }
  return parsed;
}

function compact<T extends JsonRecord>(input: T): Partial<T> {
  const out: JsonRecord = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (value !== undefined && value !== null) out[key] = value;
  }
  return out as Partial<T>;
}

function slugify(input: string): string {
  const slug = input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return slug || "media";
}

function hash(input: string): string {
  return createHash("sha1").update(input).digest("hex").slice(0, 10);
}

function mediaValue(ref: MediaRef | null | undefined): string | null {
  if (!ref) return null;
  if (typeof ref === "string") return ref.trim() || null;
  return (
    ref.file ||
    ref.path ||
    ref.public_url ||
    ref.url ||
    ref.src ||
    null
  );
}

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isBlockedThirdPartyMedia(value: string): boolean {
  return /(^https?:\/\/)?([^/]+\.)?(booking\.com|bstatic\.com)\//i.test(value);
}

function extFromName(value: string): string {
  const parsed = value.split("?")[0].match(/\.([a-z0-9]{2,5})$/i)?.[1]?.toLowerCase();
  if (parsed && ["jpg", "jpeg", "png", "webp", "gif"].includes(parsed)) return parsed === "jpeg" ? "jpg" : parsed;
  return "jpg";
}

function contentTypeFromExt(ext: string): string {
  if (ext === "png") return "image/png";
  if (ext === "webp") return "image/webp";
  if (ext === "gif") return "image/gif";
  return "image/jpeg";
}

async function mediaBytes(value: string, manifestDir: string, allowThirdPartyMedia: boolean): Promise<Buffer> {
  if (isBlockedThirdPartyMedia(value) && !allowThirdPartyMedia) {
    throw new Error(`Refusing protected third-party media URL without --allow-third-party-media: ${value}`);
  }
  if (isHttpUrl(value)) {
    const response = await fetch(value, { redirect: "follow" });
    if (!response.ok) throw new Error(`Unable to download media ${value}: HTTP ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  const localPath = path.isAbsolute(value) ? value : path.resolve(manifestDir, value);
  if (!existsSync(localPath)) throw new Error(`Media file does not exist: ${localPath}`);
  return readFileSync(localPath);
}

async function uploadMediaRef(
  supabase: any,
  ref: MediaRef | null | undefined,
  manifestDir: string,
  storageBase: string,
  allowThirdPartyMedia: boolean,
  uploadCache: Map<string, string | null>,
): Promise<string | null> {
  const value = mediaValue(ref);
  if (!value) return null;
  if (isHttpUrl(value) && value.includes("/storage/v1/object/public/")) return value;
  if (uploadCache.has(value)) return uploadCache.get(value) || null;

  const ext = extFromName(value);
  const storagePath = `${storageBase}-${hash(value)}.${ext}`;
  const buffer = await mediaBytes(value, manifestDir, allowThirdPartyMedia);
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, buffer, {
      contentType: contentTypeFromExt(ext),
      cacheControl: "31536000",
      upsert: true,
    });
  if (error) throw new Error(`Upload failed for ${value}: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  uploadCache.set(value, data.publicUrl);
  return data.publicUrl;
}

async function resolveMediaArray(
  supabase: any,
  refs: unknown[] | undefined,
  manifestDir: string,
  storageBase: string,
  allowThirdPartyMedia: boolean,
  uploadCache: Map<string, string | null>,
): Promise<unknown[]> {
  const out: unknown[] = [];
  for (let index = 0; index < (refs || []).length; index += 1) {
    const ref = refs![index] as MediaRef;
    const url = await uploadMediaRef(
      supabase,
      ref,
      manifestDir,
      `${storageBase}/${String(index + 1).padStart(2, "0")}`,
      allowThirdPartyMedia,
      uploadCache,
    );
    if (!url) continue;
    if (typeof ref === "object" && ref) {
      const { file: _file, path: _path, src: _src, public_url: _publicUrl, ...rest } = ref as JsonRecord;
      out.push({ ...rest, url, order: typeof rest.order === "number" ? rest.order : index });
    } else {
      out.push({ url, order: index });
    }
  }
  return out;
}

function stripMediaFields(room: JsonRecord): JsonRecord {
  const next = { ...room };
  delete next.photos;
  delete next.gallery_images;
  delete next.image_urls;
  delete next.cover_photo;
  return next;
}

function stripRateFields(room: JsonRecord): JsonRecord {
  const next = { ...room };
  delete next.base_rate_cents;
  delete next.original_rate_cents;
  delete next.breakfast_rate_cents;
  delete next.weekly_discount_pct;
  delete next.monthly_discount_pct;
  return next;
}

function normalizeNameForMatch(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\bnon smoking\b/g, "")
    .replace(/\b1 bedroom\b/g, "")
    .replace(/\bcity view\b/g, "")
    .replace(/\bbalcony\b/g, "with balcony")
    .replace(/[^\w\s]/g, " ")
    .replace(/\bwith\s+with\b/g, "with")
    .replace(/\s+/g, " ")
    .trim();
}

function roomMatchKeys(name: string): string[] {
  const normalized = normalizeNameForMatch(name);
  const keys = new Set([normalized]);
  keys.add(normalized.replace(/\broom\b/g, "").replace(/\s+/g, " ").trim());
  keys.add(normalized.replace(/\bsuite\b/g, "").replace(/\s+/g, " ").trim());
  keys.add(normalized.replace(/\bwith balcony\b/g, "").replace(/\s+/g, " ").trim());
  keys.add(normalized.replace(/\broom with balcony\b/g, "room").replace(/\s+/g, " ").trim());
  return Array.from(keys).filter(Boolean);
}

function normalizeRoomPayload(storeId: string, room: JsonRecord): JsonRecord {
  let payload = compact({
    store_id: storeId,
    name: room.name,
    room_type: room.room_type,
    beds: room.beds,
    bed_config: room.bed_config,
    max_guests: room.max_guests,
    size_sqm: room.size_sqm,
    units_total: room.units_total ?? 1,
    base_rate_cents: room.base_rate_cents,
    original_rate_cents: room.original_rate_cents,
    breakfast_rate_cents: room.breakfast_rate_cents,
    weekly_discount_pct: room.weekly_discount_pct,
    monthly_discount_pct: room.monthly_discount_pct,
    breakfast_included: room.breakfast_included,
    amenities: room.amenities,
    badges: room.badges,
    expandable_features: room.expandable_features,
    photos: room.photos,
    view: room.view,
    floor: room.floor,
    wing: room.wing,
    child_policy: room.child_policy,
    fees: room.fees,
    seasonal_rates: room.seasonal_rates,
    min_stay: room.min_stay,
    max_stay: room.max_stay,
    sort_order: room.sort_order,
    is_active: room.is_active ?? true,
    description: room.description,
    cancellation_policy: room.cancellation_policy,
  });

  if (!APPLY_RATES) payload = stripRateFields(payload);
  if (!APPLY_MEDIA) payload = stripMediaFields(payload);
  return payload;
}

function normalizeStorePayload(manifest: ImportManifest): JsonRecord {
  const storePayload = compact(manifest.store_profile || {});

  return storePayload;
}

async function main() {
  const manifest = readManifest(manifestPath);
  const manifestDir = path.dirname(path.resolve(manifestPath));
  const storePayload = normalizeStorePayload(manifest);
  const profilePayload = compact({
    store_id: manifest.store_id,
    ...(manifest.property_profile || {}),
  });
  const rooms = (manifest.rooms || []).map((room, index) =>
    normalizeRoomPayload(manifest.store_id, { sort_order: index, ...room }),
  );

  console.log(`Manifest: ${manifestPath}`);
  console.log(`Store: ${manifest.store_id}`);
  console.log(`Mode: ${APPLY ? "apply" : "dry-run"}`);
  console.log(`Media: ${APPLY_MEDIA ? "apply" : "skip"}${manifest.media_authorized ? " (authorized)" : " (not authorized)"}`);
  console.log(`Third-party media: ${ALLOW_THIRD_PARTY_MEDIA ? "explicitly allowed" : "blocked"}`);
  console.log(`Rates: ${APPLY_RATES ? "apply" : "skip"}`);
  console.log(`Store fields: ${Object.keys(storePayload).join(", ") || "(none)"}`);
  console.log(`Property profile fields: ${Object.keys(profilePayload).filter((k) => k !== "store_id").join(", ") || "(none)"}`);
  console.log(`Rooms: ${rooms.length}`);

  if (!APPLY) {
    console.log("\nDry-run room payload preview:");
    for (const room of rooms) {
      console.log(`- ${room.name}: ${Object.keys(room).join(", ")}`);
    }
    return;
  }

  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  if (APPLY_MEDIA) {
    if (!manifest.media_authorized) {
      throw new Error("Refusing to apply media: manifest.media_authorized must be true.");
    }
    const media = manifest.media || {};
    const mediaBase = `hotel-imports/${manifest.store_id}`;
    const uploadCache = new Map<string, string | null>();
    const logoRef = media.logo_file || media.logo_url;
    const bannerRef = media.banner_file || media.banner_url;
    const logoUrl = await uploadMediaRef(
      supabase,
      logoRef,
      manifestDir,
      `${mediaBase}/profile/logo`,
      ALLOW_THIRD_PARTY_MEDIA,
      uploadCache,
    );
    const bannerUrl = await uploadMediaRef(
      supabase,
      bannerRef,
      manifestDir,
      `${mediaBase}/profile/cover`,
      ALLOW_THIRD_PARTY_MEDIA,
      uploadCache,
    );
    const gallery = await resolveMediaArray(
      supabase,
      media.gallery_images,
      manifestDir,
      `${mediaBase}/gallery`,
      ALLOW_THIRD_PARTY_MEDIA,
      uploadCache,
    );
    if (logoUrl) storePayload.logo_url = logoUrl;
    if (bannerUrl) storePayload.banner_url = bannerUrl;
    if (gallery.length) {
      storePayload.gallery_images = gallery;
      if (!storePayload.banner_url) storePayload.banner_url = (gallery[0] as JsonRecord).url;
    }

    for (const room of rooms) {
      const source = (manifest.rooms || []).find((candidate) => candidate.name === room.name);
      const refs = source?.photos || source?.gallery_images || source?.image_urls;
      const roomPhotos = await resolveMediaArray(
        supabase,
        refs,
        manifestDir,
        `${mediaBase}/rooms/${slugify(String(room.name))}`,
        ALLOW_THIRD_PARTY_MEDIA,
        uploadCache,
      );
      if (roomPhotos.length) room.photos = roomPhotos;
    }
  }

  if (Object.keys(storePayload).length) {
    const { error } = await supabase
      .from("store_profiles")
      .update(storePayload)
      .eq("id", manifest.store_id);
    if (error) throw new Error(`store_profiles update failed: ${error.message}`);
  }

  if (Object.keys(profilePayload).length > 1) {
    const { error } = await supabase
      .from("lodge_property_profile")
      .upsert(profilePayload, { onConflict: "store_id" });
    if (error) throw new Error(`lodge_property_profile upsert failed: ${error.message}`);
  }

  const { data: existingRooms, error: roomsError } = await supabase
    .from("lodge_rooms")
    .select("id,name")
    .eq("store_id", manifest.store_id);
  if (roomsError) throw new Error(`lodge_rooms read failed: ${roomsError.message}`);

  const existingByName = new Map<string, string>();
  for (const room of existingRooms || []) {
    if (!room?.name) continue;
    for (const key of roomMatchKeys(String(room.name))) {
      if (!existingByName.has(key)) existingByName.set(key, room.id);
    }
  }

  for (const room of rooms) {
    if (!room.name) continue;
    const existingId = roomMatchKeys(String(room.name))
      .map((key) => existingByName.get(key))
      .find(Boolean);
    if (existingId) {
      const { error } = await supabase
        .from("lodge_rooms")
        .update(room)
        .eq("id", existingId);
      if (error) throw new Error(`room update failed for ${room.name}: ${error.message}`);
    } else {
      const { error } = await supabase.from("lodge_rooms").insert(room);
      if (error) throw new Error(`room insert failed for ${room.name}: ${error.message}`);
    }
  }

  console.log("Import complete.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
