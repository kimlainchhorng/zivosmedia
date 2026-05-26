#!/usr/bin/env node
/**
 * Cleanup script: null out banner_url / logo_url / gallery_images on
 * store_profiles rows whose image URLs are NOT real Booking.com hotel photos.
 *
 * A real hotel photo URL contains "/xdata/images/hotel/". Anything else
 * (country flags, UI icons, avatar sprites, etc.) is junk that slipped in
 * before scripts/scrape-booking-bulk.ts was tightened.
 *
 * After this runs, the bulk scraper can be re-run (it picks up stores
 * WHERE banner_url IS NULL) to refill them correctly.
 *
 * Usage:
 *   set -a && . ./.scrape-session.local && set +a && \
 *     node --experimental-strip-types --no-warnings scripts/cleanup-bad-store-images.ts
 *
 * Pass --dry to only report, without writing.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL  = process.env.SUPABASE_URL!;
const ANON_KEY      = process.env.SUPABASE_ANON_KEY!;
const USER_JWT      = process.env.SUPABASE_USER_JWT!;
const DRY           = process.argv.includes("--dry");

if (!SUPABASE_URL || !ANON_KEY || !USER_JWT) {
  console.error("Need SUPABASE_URL + SUPABASE_ANON_KEY + SUPABASE_USER_JWT");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, ANON_KEY, {
  global: { headers: { Authorization: `Bearer ${USER_JWT}` } },
  auth:   { persistSession: false, autoRefreshToken: false },
});

const HOTEL_PHOTO_RE = /\/xdata\/images\/hotel\//;
const LODGING_CATS   = ["hotel","resort","guesthouse","hostel","villa","lodge","motel","inn","boutique"];

function isHotelPhoto(url: unknown): boolean {
  return typeof url === "string" && HOTEL_PHOTO_RE.test(url);
}

async function main() {
  console.log(`\nCleanup bad store images${DRY ? " (DRY RUN)" : ""}`);
  console.log("============================================\n");

  // Page through all lodging stores
  const PAGE = 200;
  const bad: { id: string; name: string; banner_bad: boolean; logo_bad: boolean; gallery_bad_count: number }[] = [];
  for (let p = 0; ; p++) {
    const { data, error } = await supabase
      .from("store_profiles")
      .select("id,name,banner_url,logo_url,gallery_images")
      .in("category", LODGING_CATS)
      .order("name")
      .range(p * PAGE, p * PAGE + PAGE - 1);
    if (error) { console.error(error.message); process.exit(1); }
    if (!data?.length) break;
    for (const s of data) {
      const banner_bad = !!s.banner_url && !isHotelPhoto(s.banner_url);
      const logo_bad   = !!s.logo_url   && !isHotelPhoto(s.logo_url);
      const gallery    = Array.isArray(s.gallery_images) ? s.gallery_images : [];
      const gallery_clean = gallery.filter((g: any) => isHotelPhoto(typeof g === "string" ? g : g?.url));
      const gallery_bad_count = gallery.length - gallery_clean.length;
      if (banner_bad || logo_bad || gallery_bad_count > 0) {
        bad.push({ id: s.id, name: s.name, banner_bad, logo_bad, gallery_bad_count });
      }
    }
    if (data.length < PAGE) break;
  }

  console.log(`Stores with bad images: ${bad.length}\n`);
  for (const b of bad.slice(0, 30)) {
    console.log(
      `  ${b.name.padEnd(45)} ` +
      `${b.banner_bad ? "banner✗ " : "        "}` +
      `${b.logo_bad ? "logo✗ " : "      "}` +
      `${b.gallery_bad_count > 0 ? `gallery=${b.gallery_bad_count}` : ""}`
    );
  }
  if (bad.length > 30) console.log(`  …and ${bad.length - 30} more`);

  if (DRY) {
    console.log("\n(dry run — no writes)");
    return;
  }

  console.log("\nPatching…");
  let ok = 0, fail = 0;
  for (const b of bad) {
    // Re-fetch the row to compute filtered gallery
    const { data: row } = await supabase
      .from("store_profiles")
      .select("gallery_images")
      .eq("id", b.id)
      .maybeSingle();
    const gallery = Array.isArray(row?.gallery_images) ? row!.gallery_images : [];
    const gallery_clean = gallery.filter((g: any) => isHotelPhoto(typeof g === "string" ? g : g?.url));

    const patch: Record<string, unknown> = {};
    if (b.banner_bad) patch.banner_url = null;
    if (b.logo_bad)   patch.logo_url   = null;
    if (b.gallery_bad_count > 0) patch.gallery_images = gallery_clean;

    const { error } = await supabase.from("store_profiles").update(patch).eq("id", b.id);
    if (error) { console.error(`  ✗ ${b.name}: ${error.message}`); fail++; }
    else { ok++; }
  }
  console.log(`\nDone. Cleaned ${ok}, failed ${fail}.`);
  console.log("Re-run scripts/scrape-booking-bulk.ts to refill them.\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
