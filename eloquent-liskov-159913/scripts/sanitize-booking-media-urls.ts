/**
 * Remove stale direct Booking CDN URLs from lodging media fields.
 *
 * The import/rescue scripts upload capturable Booking images into Supabase
 * Storage. Some older Booking image IDs are no longer served on the live
 * property page, so they cannot be rescued. Leaving those direct bstatic URLs
 * causes broken gallery/room images in ZIVO.
 *
 * Usage:
 *   set -a && . ./.scrape-session.local && set +a
 *   node --experimental-strip-types --no-warnings scripts/sanitize-booking-media-urls.ts [--dry-run]
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

type MediaItem = string | { url?: string | null; src?: string | null; [key: string]: unknown };

function extractUrl(item: MediaItem | null | undefined): string | null {
  if (!item) return null;
  if (typeof item === "string") return item;
  if (typeof item === "object") return item.url || item.src || null;
  return null;
}

function isBookingImageUrl(url: string | null | undefined): boolean {
  return Boolean(url && /bstatic\.com\/xdata\/images\/hotel/.test(url));
}

function mediaKey(item: MediaItem): string {
  return JSON.stringify(item);
}

function uniqueMedia(items: MediaItem[]): MediaItem[] {
  const seen = new Set<string>();
  const out: MediaItem[] = [];
  for (const item of items) {
    const url = extractUrl(item);
    if (!url || isBookingImageUrl(url)) continue;
    const key = mediaKey(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function fallbackMediaForProfile(profile: {
  banner_url?: string | null;
  logo_url?: string | null;
  gallery_images?: unknown;
}): MediaItem[] {
  const gallery = Array.isArray(profile.gallery_images)
    ? uniqueMedia(profile.gallery_images as MediaItem[])
    : [];
  const fallbacks: MediaItem[] = [...gallery];
  if (profile.banner_url && !isBookingImageUrl(profile.banner_url)) {
    fallbacks.unshift({ url: profile.banner_url, source: "store-banner-fallback" });
  }
  if (profile.logo_url && !isBookingImageUrl(profile.logo_url)) {
    fallbacks.push({ url: profile.logo_url, source: "store-logo-fallback" });
  }
  return uniqueMedia(fallbacks).slice(0, 8);
}

async function main() {
  console.log("ZIVO Booking CDN sanitizer");
  console.log("===========================");
  if (DRY_RUN) console.log("** DRY RUN — no DB writes **\n");

  const { data: profiles, error: profileError } = await supabase
    .from("store_profiles")
    .select("id, name, category, banner_url, logo_url, gallery_images")
    .in("category", ["lodging", "resort", "hotel"]);
  if (profileError) throw new Error(`store_profiles: ${profileError.message}`);

  const fallbackByStore = new Map<string, MediaItem[]>();
  let profilesUpdated = 0;
  let profileGalleryRemoved = 0;

  for (const profile of profiles || []) {
    const originalGallery = Array.isArray(profile.gallery_images)
      ? (profile.gallery_images as MediaItem[])
      : [];
    const cleanedGallery = uniqueMedia(originalGallery);
    const removed = originalGallery.length - cleanedGallery.length;

    let nextGallery = cleanedGallery;
    if (nextGallery.length === 0) {
      nextGallery = fallbackMediaForProfile(profile).slice(0, 4);
    }
    fallbackByStore.set(profile.id, fallbackMediaForProfile({ ...profile, gallery_images: nextGallery }));

    const bannerIsStale = isBookingImageUrl(profile.banner_url);
    const logoIsStale = isBookingImageUrl(profile.logo_url);
    const shouldUpdate =
      removed > 0 ||
      bannerIsStale ||
      logoIsStale ||
      JSON.stringify(nextGallery) !== JSON.stringify(originalGallery);

    if (!shouldUpdate) continue;
    profilesUpdated++;
    profileGalleryRemoved += removed;

    if (!DRY_RUN) {
      const fallback = fallbackByStore.get(profile.id) || [];
      const { error } = await supabase
        .from("store_profiles")
        .update({
          banner_url: bannerIsStale ? extractUrl(fallback[0]) : profile.banner_url,
          logo_url: logoIsStale ? extractUrl(fallback[1] || fallback[0]) : profile.logo_url,
          gallery_images: nextGallery,
        })
        .eq("id", profile.id);
      if (error) console.error(`  ✗ ${profile.name}: ${error.message}`);
    }
  }

  let roomsUpdated = 0;
  let roomPhotosRemoved = 0;
  let roomFallbacksAdded = 0;
  const PAGE_SIZE = 1000;

  for (let page = 0; ; page++) {
    const { data: rooms, error: roomError } = await supabase
      .from("lodge_rooms")
      .select("id, store_id, name, photos")
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    if (roomError) throw new Error(`lodge_rooms: ${roomError.message}`);
    if (!rooms || rooms.length === 0) break;

    for (const room of rooms) {
      const originalPhotos = Array.isArray(room.photos)
        ? (room.photos as MediaItem[])
        : [];
      const cleanedPhotos = uniqueMedia(originalPhotos);
      const removed = originalPhotos.length - cleanedPhotos.length;
      if (removed === 0) continue;

      let nextPhotos = cleanedPhotos;
      if (nextPhotos.length === 0) {
        const fallback = fallbackByStore.get(room.store_id) || [];
        nextPhotos = fallback.slice(0, 4);
        roomFallbacksAdded += nextPhotos.length;
      }

      roomsUpdated++;
      roomPhotosRemoved += removed;

      if (!DRY_RUN) {
        const { error } = await supabase
          .from("lodge_rooms")
          .update({ photos: nextPhotos })
          .eq("id", room.id);
        if (error) console.error(`  ✗ room ${room.id} (${room.name}): ${error.message}`);
      }
    }

    if (rooms.length < PAGE_SIZE) break;
  }

  console.log(
    JSON.stringify(
      {
        profilesUpdated,
        profileGalleryRemoved,
        roomsUpdated,
        roomPhotosRemoved,
        roomFallbacksAdded,
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
