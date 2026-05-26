/**
 * Audit hotel/resort media provenance and lodging data completeness.
 *
 * This does not decide legal ownership. It checks local evidence and flags
 * Booking-origin media as not permission-cleared unless a local authorization
 * manifest/report exists for that store.
 *
 * Usage:
 *   set -a && . ./.scrape-session.local && set +a
 *   node --experimental-strip-types --no-warnings scripts/audit-hotel-resort-media-permissions.ts
 *
 * Options:
 *   --categories=hotel,resort,lodging
 *   --output=data/hotel-imports/reports/hotel-resort-media-permission-audit-YYYY-MM-DD.json
 */

import { createClient } from "@supabase/supabase-js";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars.");
  process.exit(1);
}

const args = process.argv.slice(2);
const getArg = (name: string) =>
  args.find((arg) => arg.startsWith(`--${name}=`))?.split("=").slice(1).join("=") || null;

const CATEGORIES = (getArg("categories") || "hotel,resort")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const dateStamp = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Chicago",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const OUTPUT =
  getArg("output") ||
  `data/hotel-imports/reports/hotel-resort-media-permission-audit-${dateStamp}.json`;

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

type JsonRecord = Record<string, any>;

function extractUrl(item: any): string | null {
  if (!item) return null;
  if (typeof item === "string") return item;
  if (typeof item === "object") return item.url || item.src || item.public_url || null;
  return null;
}

function isDirectBookingUrl(url: string): boolean {
  return /(^https?:\/\/)?([^/]+\.)?(booking\.com|bstatic\.com)\//i.test(url);
}

function isBookingImportStorageUrl(url: string): boolean {
  return /\/storage\/v1\/(?:object\/public|render\/image\/public)\/store-assets\/booking-import\//i.test(url);
}

function isSupabaseStorageUrl(url: string): boolean {
  return /\/storage\/v1\//i.test(url);
}

function countMedia(refs: any[]) {
  const out = {
    total: 0,
    direct_booking: 0,
    booking_import_storage: 0,
    supabase_storage: 0,
    other: 0,
  };

  for (const ref of refs) {
    const url = extractUrl(ref);
    if (!url) continue;
    out.total += 1;
    if (isDirectBookingUrl(url)) out.direct_booking += 1;
    else if (isBookingImportStorageUrl(url)) out.booking_import_storage += 1;
    else if (isSupabaseStorageUrl(url)) out.supabase_storage += 1;
    else out.other += 1;
  }

  return out;
}

function addCounts(target: ReturnType<typeof countMedia>, source: ReturnType<typeof countMedia>) {
  target.total += source.total;
  target.direct_booking += source.direct_booking;
  target.booking_import_storage += source.booking_import_storage;
  target.supabase_storage += source.supabase_storage;
  target.other += source.other;
}

function walkJsonFiles(dir: string, out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJsonFiles(fullPath, out);
    else if (entry.name.endsWith(".json")) out.push(fullPath);
  }
  return out;
}

function loadAuthorizationEvidence() {
  const authorized = new Map<string, string[]>();
  const pending = new Map<string, string[]>();

  const storeIdsFromValue = (value: unknown): string[] => {
    if (!value) return [];
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.flatMap(storeIdsFromValue);
    if (typeof value !== "object") return [];
    const record = value as JsonRecord;
    const id = record.store_id || record.storeId || record.id;
    return typeof id === "string" ? [id] : [];
  };

  const addEvidence = (target: Map<string, string[]>, ids: string[], file: string) => {
    for (const id of ids) {
      target.set(id, [...(target.get(id) || []), file]);
    }
  };

  for (const file of walkJsonFiles("data/hotel-imports")) {
    try {
      const parsed = JSON.parse(readFileSync(file, "utf8")) as JsonRecord;
      const rootStoreIds = [
        ...storeIdsFromValue(parsed.store_id || parsed.storeId),
        ...storeIdsFromValue(parsed.store_ids || parsed.storeIds),
      ];

      const hasAuthorization =
        parsed.media_authorized === true ||
        parsed.permission?.documented_authorization_found === true;
      if (hasAuthorization) {
        addEvidence(authorized, rootStoreIds, file);
      }

      const isPending =
        parsed.media_authorized === false ||
        /pending/i.test(String(parsed.permission_status || "")) ||
        parsed.permission?.documented_authorization_found === false;
      if (isPending) {
        addEvidence(pending, rootStoreIds, file);
      }

      if (Array.isArray(parsed.stores)) {
        for (const entry of parsed.stores) {
          const ids = storeIdsFromValue(entry);
          if (entry?.media_authorized === true || entry?.permission?.documented_authorization_found === true) {
            addEvidence(authorized, ids, file);
          }
          if (
            entry?.media_authorized === false ||
            /pending/i.test(String(entry?.permission_status || "")) ||
            entry?.permission?.documented_authorization_found === false
          ) {
            addEvidence(pending, ids, file);
          }
        }
      }
    } catch {
      // Ignore malformed local artifacts.
    }
  }

  return { authorized, pending };
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

async function main() {
  const { authorized, pending } = loadAuthorizationEvidence();

  const { data: stores, error: storesError } = await supabase
    .from("store_profiles")
    .select("id,name,category,logo_url,banner_url,gallery_images,phone,address,description,rating,setup_complete")
    .in("category", CATEGORIES)
    .order("name");
  if (storesError) throw new Error(`store_profiles: ${storesError.message}`);

  const storeRows = (stores || []) as JsonRecord[];
  const storeIds = new Set(storeRows.map((store) => store.id));

  const rooms = (await readPaged(
    "lodge_rooms",
    "store_id,name,is_active,base_rate_cents,original_rate_cents,weekly_discount_pct,monthly_discount_pct,beds,bed_config,amenities,description,photos",
  )).filter((room) => storeIds.has(room.store_id));

  const profiles = (await readPaged(
    "lodge_property_profile",
    "store_id,facilities,popular_amenities,check_in_from,check_out_until,house_rules,cancellation_policy,description_sections",
  )).filter((profile) => storeIds.has(profile.store_id));

  const roomsByStore = new Map<string, JsonRecord[]>();
  for (const room of rooms) {
    roomsByStore.set(room.store_id, [...(roomsByStore.get(room.store_id) || []), room]);
  }

  const propertyByStore = new Map<string, JsonRecord>();
  for (const profile of profiles) propertyByStore.set(profile.store_id, profile);

  const summary = {
    categories: CATEGORIES,
    stores: storeRows.length,
    rooms: rooms.length,
    media: countMedia([]),
    permission: {
      stores_with_local_authorization: 0,
      stores_with_pending_or_negative_evidence: 0,
      stores_with_booking_origin_media: 0,
      stores_with_direct_booking_media: 0,
      stores_with_booking_import_storage_media: 0,
      stores_with_booking_origin_media_without_local_authorization: 0,
    },
    profile_gaps: {
      missing_logo: 0,
      missing_banner: 0,
      missing_gallery: 0,
      missing_phone: 0,
      missing_address: 0,
      missing_description: 0,
      setup_incomplete: 0,
      low_property_detail: 0,
    },
    room_gaps: {
      missing_photos: 0,
      missing_base_price: 0,
      missing_original_or_discount: 0,
      missing_description: 0,
      missing_beds: 0,
      missing_amenities: 0,
    },
  };

  const perStore = storeRows.map((store) => {
    const storeRooms = roomsByStore.get(store.id) || [];
    const property = propertyByStore.get(store.id) || null;
    const storeMedia = countMedia([
      store.logo_url,
      store.banner_url,
      ...(Array.isArray(store.gallery_images) ? store.gallery_images : []),
    ]);
    const roomMedia = countMedia(storeRooms.flatMap((room) => room.photos || []));
    const totalMedia = countMedia([]);
    addCounts(totalMedia, storeMedia);
    addCounts(totalMedia, roomMedia);
    addCounts(summary.media, totalMedia);

    const hasAuthorization = authorized.has(store.id);
    const hasPending = pending.has(store.id);
    const directBooking = totalMedia.direct_booking > 0;
    const bookingImport = totalMedia.booking_import_storage > 0;
    const bookingOrigin = directBooking || bookingImport;

    if (hasAuthorization) summary.permission.stores_with_local_authorization += 1;
    if (hasPending) summary.permission.stores_with_pending_or_negative_evidence += 1;
    if (bookingOrigin) summary.permission.stores_with_booking_origin_media += 1;
    if (directBooking) summary.permission.stores_with_direct_booking_media += 1;
    if (bookingImport) summary.permission.stores_with_booking_import_storage_media += 1;
    if (bookingOrigin && !hasAuthorization) {
      summary.permission.stores_with_booking_origin_media_without_local_authorization += 1;
    }

    const issues: string[] = [];
    const galleryCount = Array.isArray(store.gallery_images) ? store.gallery_images.length : 0;
    if (!store.logo_url) { summary.profile_gaps.missing_logo += 1; issues.push("missing_logo"); }
    if (!store.banner_url) { summary.profile_gaps.missing_banner += 1; issues.push("missing_banner"); }
    if (galleryCount === 0) { summary.profile_gaps.missing_gallery += 1; issues.push("missing_gallery"); }
    if (!store.phone) { summary.profile_gaps.missing_phone += 1; issues.push("missing_phone"); }
    if (!store.address) { summary.profile_gaps.missing_address += 1; issues.push("missing_address"); }
    if (!store.description) { summary.profile_gaps.missing_description += 1; issues.push("missing_description"); }
    if (!store.setup_complete) { summary.profile_gaps.setup_incomplete += 1; issues.push("setup_incomplete"); }

    const facilitiesCount = Array.isArray(property?.facilities) ? property.facilities.length : 0;
    const amenitiesCount = Array.isArray(property?.popular_amenities) ? property.popular_amenities.length : 0;
    const hasPolicies = Boolean(property?.house_rules && Object.keys(property.house_rules).length) || Boolean(property?.cancellation_policy);
    if (!property || facilitiesCount < 5 || amenitiesCount < 3 || !property.check_in_from || !property.check_out_until || !hasPolicies) {
      summary.profile_gaps.low_property_detail += 1;
      issues.push("low_property_detail");
    }

    const roomIssueCounts = {
      missing_photos: 0,
      missing_base_price: 0,
      missing_original_or_discount: 0,
      missing_description: 0,
      missing_beds: 0,
      missing_amenities: 0,
    };

    const activeStoreRooms = storeRooms.filter((room) => room.is_active !== false);

    for (const room of activeStoreRooms) {
      const photos = Array.isArray(room.photos) ? room.photos : [];
      const amenities = Array.isArray(room.amenities) ? room.amenities : [];
      const hasDiscount =
        Number(room.original_rate_cents || 0) > Number(room.base_rate_cents || 0) ||
        Number(room.weekly_discount_pct || 0) > 0 ||
        Number(room.monthly_discount_pct || 0) > 0;

      if (photos.length === 0) roomIssueCounts.missing_photos += 1;
      if (room.base_rate_cents == null) roomIssueCounts.missing_base_price += 1;
      if (!hasDiscount) roomIssueCounts.missing_original_or_discount += 1;
      if (!room.description) roomIssueCounts.missing_description += 1;
      if (!room.beds && !room.bed_config) roomIssueCounts.missing_beds += 1;
      if (amenities.length === 0) roomIssueCounts.missing_amenities += 1;
    }

    for (const key of Object.keys(roomIssueCounts) as Array<keyof typeof roomIssueCounts>) {
      summary.room_gaps[key] += roomIssueCounts[key];
      if (roomIssueCounts[key] > 0) issues.push(`rooms_${key}`);
    }
    if (bookingOrigin && !hasAuthorization) issues.push("booking_origin_media_without_local_authorization");
    if (directBooking) issues.push("direct_booking_hotlinks");

    return {
      id: store.id,
      name: store.name,
      category: store.category,
      media: totalMedia,
      local_authorization_files: authorized.get(store.id) || [],
      pending_or_negative_evidence_files: pending.get(store.id) || [],
      profile: {
        setup_complete: Boolean(store.setup_complete),
        phone_present: Boolean(store.phone),
        address_present: Boolean(store.address),
        description_present: Boolean(store.description),
        gallery_count: galleryCount,
        rating: store.rating ?? null,
        property_detail: {
          facilities_count: facilitiesCount,
          popular_amenities_count: amenitiesCount,
          check_in_from: property?.check_in_from ?? null,
          check_out_until: property?.check_out_until ?? null,
          has_house_rules_or_cancellation: hasPolicies,
        },
      },
      rooms: {
        count: storeRooms.length,
        active_count: storeRooms.filter((room) => room.is_active !== false).length,
        gaps: roomIssueCounts,
      },
      issues,
    };
  });

  const report = {
    generated_at: new Date().toISOString(),
    conclusion:
      "Booking.com/bstatic direct URLs and Supabase booking-import media are treated as Booking-origin media. They are not considered permission-cleared unless a local authorization manifest/report is present for the store.",
    summary,
    top_issues: perStore
      .filter((store) => store.issues.length > 0)
      .sort((a, b) => b.issues.length - a.issues.length)
      .slice(0, 100),
    stores: perStore,
  };

  mkdirSync(path.dirname(OUTPUT), { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ output: OUTPUT, summary }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
