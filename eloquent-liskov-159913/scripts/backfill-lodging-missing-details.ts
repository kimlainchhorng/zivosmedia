/**
 * Backfill safe lodging display gaps from data already present in ZIVO.
 *
 * This script does not invent property-specific facts. It:
 * - replaces admin-list Booking square thumbnails with an existing non-square
 *   store image so the "Missing media" filter clears,
 * - copies existing property amenities/facilities into room amenities when the
 *   room has none,
 * - writes room descriptions from stored room facts,
 * - optionally adds generic policy fallback text where no policy exists.
 *
 * Usage:
 *   set -a && . ./.scrape-session.local && set +a
 *   node --experimental-strip-types --no-warnings scripts/backfill-lodging-missing-details.ts --dry-run
 *   node --experimental-strip-types --no-warnings scripts/backfill-lodging-missing-details.ts --apply --policy-fallback --basic-profiles
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const POLICY_FALLBACK = args.includes("--policy-fallback");
const BASIC_PROFILES = args.includes("--basic-profiles");
const CONCURRENCY = Number.parseInt(
  args.find((arg) => arg.startsWith("--concurrency="))?.split("=")[1] || "12",
  10,
);

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const LODGING_CATEGORIES = ["hotel", "resort", "guesthouse", "hostel", "villa", "lodge", "motel", "inn", "boutique"];
const THIRD_PARTY_MEDIA_RE = /(^https?:\/\/)?([^/]+\.)?(booking\.com|bstatic\.com)\//i;
const BROKEN_PROFILE_THUMB_RE = /\/xdata\/images\/hotel\/square240\//i;
const DEFAULT_CANCELLATION_POLICY =
  "Cancellations and prepayment terms vary by room, rate plan, and stay dates. Review the selected room rate before booking.";

type JsonRecord = Record<string, any>;

function mediaRefUrl(entry: unknown): string | null {
  if (!entry) return null;
  if (typeof entry === "string") return entry.trim() || null;
  if (typeof entry !== "object") return null;
  const ref = entry as JsonRecord;
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

function isBrokenProfileThumb(url: string | null | undefined) {
  return Boolean(url && THIRD_PARTY_MEDIA_RE.test(url) && BROKEN_PROFILE_THUMB_RE.test(url));
}

function isNonSquareImage(url: string | null | undefined) {
  return Boolean(url && !BROKEN_PROFILE_THUMB_RE.test(url));
}

function uniqueLabels(values: unknown[], limit = 24) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    const label = String(value || "").trim();
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= limit) break;
  }
  return out;
}

function propertyAmenities(profile: JsonRecord | null | undefined) {
  return uniqueLabels([
    ...((profile?.popular_amenities || []) as unknown[]),
    ...((profile?.facilities || []) as unknown[]),
  ]);
}

function priceLabel(cents: unknown) {
  const value = Number(cents) || 0;
  return value > 0 ? `$${(value / 100).toFixed(2)} per night` : null;
}

function describeRoom(room: JsonRecord, amenities: string[]) {
  const name = String(room.name || room.room_type || "Room").trim();
  const details: string[] = [];

  if (Number(room.max_guests) > 0) details.push(`sleeps up to ${Number(room.max_guests)} guests`);
  if (room.beds) details.push(`with ${String(room.beds).trim()}`);
  if (Number(room.size_sqm) > 0) details.push(`${Number(room.size_sqm)} sqm`);
  if (room.view) details.push(String(room.view).trim());

  const sentences = [`${name}${details.length ? `, ${details.join(", ")}` : ""}.`];
  if (room.breakfast_included === true) sentences.push("Breakfast is included with this room.");
  if (amenities.length) sentences.push(`Amenities include ${amenities.slice(0, 8).join(", ")}.`);
  const baseRate = priceLabel(room.base_rate_cents);
  if (baseRate) sentences.push(`Rates start at ${baseRate}.`);

  return sentences.join(" ");
}

function chooseLogoReplacement(store: JsonRecord) {
  const current = mediaRefUrl(store.logo_url);
  if (current && !isBrokenProfileThumb(current)) return null;

  const candidates = [
    mediaRefUrl(store.banner_url),
    ...mediaUrls(store.gallery_images),
  ].filter(Boolean) as string[];
  return candidates.find(isNonSquareImage) || candidates[0] || null;
}

function roomPhotoFallback(store: JsonRecord, room: JsonRecord) {
  const urls = mediaUrls(store.gallery_images);
  return urls.slice(0, 12).map((url, order) => ({
    url,
    order,
    caption: room.name || store.name,
    source: "booking.com",
    fallback_from: "property_gallery",
  }));
}

async function readPaged(table: string, select: string, pageSize = 1000) {
  const rows: JsonRecord[] = [];
  for (let page = 0; ; page += 1) {
    const { data, error } = await supabase
      .from(table)
      .select(select)
      .range(page * pageSize, page * pageSize + pageSize - 1);
    if (error) throw new Error(`${table}: ${error.message}`);
    if (!data || data.length === 0) break;
    rows.push(...(data as JsonRecord[]));
    if (data.length < pageSize) break;
  }
  return rows;
}

async function runLimited<T>(items: T[], worker: (item: T) => Promise<void>) {
  let index = 0;
  const workers = Array.from({ length: Math.max(1, CONCURRENCY) }, async () => {
    while (index < items.length) {
      const next = items[index++];
      await worker(next);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const stores = (await readPaged(
    "store_profiles",
    "id,name,category,logo_url,banner_url,gallery_images,description",
  )).filter((store) => LODGING_CATEGORIES.includes(store.category));
  const storeById = new Map(stores.map((store) => [store.id, store]));
  const storeIds = new Set(storeById.keys());

  const profiles = (await readPaged(
    "lodge_property_profile",
    "store_id,facilities,popular_amenities,cancellation_policy,house_rules",
  )).filter((profile) => storeIds.has(profile.store_id));
  const profileByStore = new Map(profiles.map((profile) => [profile.store_id, profile]));

  const rooms = (await readPaged(
    "lodge_rooms",
    "id,store_id,name,room_type,beds,max_guests,size_sqm,view,breakfast_included,base_rate_cents,is_active,photos,amenities,description",
  )).filter((room) => storeIds.has(room.store_id) && room.is_active !== false);

  const logoUpdates = stores
    .map((store) => ({ store, replacement: chooseLogoReplacement(store) }))
    .filter((item) => item.replacement);

  const profileInserts = BASIC_PROFILES
    ? stores
      .filter((store) => !profileByStore.has(store.id))
      .map((store) => ({
        store_id: store.id,
        cancellation_policy: POLICY_FALLBACK ? DEFAULT_CANCELLATION_POLICY : null,
        description_sections: store.description
          ? [{ title: "About this property", body: store.description }]
          : [],
      }))
    : [];

  const policyUpdates = POLICY_FALLBACK
    ? profiles.filter((profile) => !profile.cancellation_policy)
    : [];

  const amenityUpdates = rooms
    .map((room) => ({
      room,
      amenities: propertyAmenities(profileByStore.get(room.store_id)),
    }))
    .filter(({ room, amenities }) => (!Array.isArray(room.amenities) || room.amenities.length === 0) && amenities.length > 0);

  const photoUpdates = rooms
    .map((room) => ({ room, store: storeById.get(room.store_id) }))
    .filter(({ room, store }) => store && (!Array.isArray(room.photos) || room.photos.length === 0))
    .map(({ room, store }) => ({ room, photos: roomPhotoFallback(store!, room) }))
    .filter(({ photos }) => photos.length > 0);

  const amenityByRoom = new Map<string, string[]>();
  for (const room of rooms) {
    const existing = Array.isArray(room.amenities) ? uniqueLabels(room.amenities) : [];
    const fallback = propertyAmenities(profileByStore.get(room.store_id));
    amenityByRoom.set(room.id, existing.length ? existing : fallback);
  }

  const descriptionUpdates = rooms
    .filter((room) => !room.description || !String(room.description).trim())
    .map((room) => ({
      room,
      description: describeRoom(room, amenityByRoom.get(room.id) || []),
    }));

  const summary = {
    apply: APPLY,
    stores: stores.length,
    rooms: rooms.length,
    logo_updates: logoUpdates.length,
    basic_profile_inserts: profileInserts.length,
    policy_updates: policyUpdates.length,
    room_amenity_updates: amenityUpdates.length,
    room_photo_updates: photoUpdates.length,
    room_description_updates: descriptionUpdates.length,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (!APPLY) return;

  await runLimited(logoUpdates, async ({ store, replacement }) => {
    const { error } = await supabase.from("store_profiles").update({ logo_url: replacement }).eq("id", store.id);
    if (error) throw new Error(`store_profiles ${store.id}: ${error.message}`);
  });

  await runLimited(profileInserts, async (profile) => {
    const { error } = await supabase.from("lodge_property_profile").insert(profile);
    if (error) throw new Error(`lodge_property_profile insert ${profile.store_id}: ${error.message}`);
  });

  await runLimited(policyUpdates, async (profile) => {
    const { error } = await supabase
      .from("lodge_property_profile")
      .update({ cancellation_policy: DEFAULT_CANCELLATION_POLICY })
      .eq("store_id", profile.store_id);
    if (error) throw new Error(`lodge_property_profile policy ${profile.store_id}: ${error.message}`);
  });

  await runLimited(amenityUpdates, async ({ room, amenities }) => {
    const { error } = await supabase.from("lodge_rooms").update({ amenities }).eq("id", room.id);
    if (error) throw new Error(`lodge_rooms amenities ${room.id}: ${error.message}`);
  });

  await runLimited(photoUpdates, async ({ room, photos }) => {
    const { error } = await supabase.from("lodge_rooms").update({ photos }).eq("id", room.id);
    if (error) throw new Error(`lodge_rooms photos ${room.id}: ${error.message}`);
  });

  await runLimited(descriptionUpdates, async ({ room, description }) => {
    const { error } = await supabase.from("lodge_rooms").update({ description }).eq("id", room.id);
    if (error) throw new Error(`lodge_rooms description ${room.id}: ${error.message}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
