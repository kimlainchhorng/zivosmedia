import { readFileSync, writeFileSync } from "node:fs";

const gallery = JSON.parse(readFileSync("/tmp/mangrove/gallery.json", "utf8"));
const rooms = JSON.parse(readFileSync("/tmp/mangrove/rooms_condensed.json", "utf8"));

// Normalize every URL to max1024x768 (highest reliable size that Booking serves publicly).
function toMax1024(u) {
  return u.replace(/\/(max\d+x?\d*|square\d+)\//, "/max1024x768/");
}

// Deduplicate by the numeric ID inside the URL.
function idOf(u) {
  return u.match(/\/(\d+)\.jpg/)?.[1];
}

const seen = new Set();
const allPhotos = [];
for (const item of gallery.labelled) {
  const id = idOf(item.src);
  if (!id || seen.has(id)) continue;
  seen.add(id);
  allPhotos.push({
    id,
    url: toMax1024(item.src),
    alt: (item.alt || "").replace(/ at Mangrove Beach Bungalows in Koh Rong Sanloem.*$/i, "").trim(),
  });
}

console.log("Unique photos:", allPhotos.length);

// Tag each photo by likely category from alt-text keywords.
function tag(alt) {
  const a = alt.toLowerCase();
  if (/two beds|twin|bunk/.test(a)) return "twin";
  if (/canopy bed|canopy|king|large bed/.test(a)) return "villa";
  if (/garden|tropical|palm trees|wooden cottages|wooden house|chalet|small wooden/.test(a)) return "garden";
  if (/hammock|porch|deluxe|balcony|tree house/.test(a)) return "deluxe";
  if (/beach front|beachfront|ocean|sea|sand|water|boat|sunset|coral|hammock on a beach|umbrella|dock/.test(a))
    return "beachfront";
  if (/bedroom|bed|blue sheets|blue comforter|towels|mosquito/.test(a)) return "bedroom-generic";
  if (/bar|restaurant|food|dining|altar|welcome|map|gas station/.test(a)) return "property";
  return "property";
}

for (const p of allPhotos) p.tag = tag(p.alt);
const byTag = {};
for (const p of allPhotos) (byTag[p.tag] ||= []).push(p);
console.log("Tag distribution:");
for (const [t, arr] of Object.entries(byTag)) console.log("  ", t, arr.length);

// Build per-room photo lists by combining specific + bedroom-generic.
function pickForRoom(primary, ...secondary) {
  const used = new Set();
  const out = [];
  const push = (p) => { if (!used.has(p.id)) { used.add(p.id); out.push(p); } };
  for (const t of [primary, ...secondary]) for (const p of (byTag[t] || [])) push(p);
  return out;
}

const photosByRoom = {
  "Bungalow - Beach Front": pickForRoom("beachfront", "bedroom-generic", "deluxe"),
  "Villa with Sea View":    pickForRoom("villa", "bedroom-generic", "beachfront"),
  "Twin Room with Balcony": pickForRoom("twin", "bedroom-generic"),
  "Bungalow with Garden View": pickForRoom("garden", "bedroom-generic"),
  "Deluxe Bungalow":         pickForRoom("deluxe", "bedroom-generic", "villa"),
};
for (const [k, v] of Object.entries(photosByRoom)) console.log(" ", k, ":", v.length, "photos");

// Property gallery = everything (max 30 in storage UI tile, but we keep all).
const propertyGallery = allPhotos.map((p) => p.url);

// Banner = first beachfront photo (it's the obvious cover) or fall back to first photo.
const banner =
  byTag.beachfront?.[0]?.url ||
  byTag.property?.[0]?.url ||
  allPhotos[0]?.url;

// Build the final shape we'll push to Supabase.
// Convert Booking's 2-night totals to per-night cents.
// Each room has two rate options: cheaper (non-refundable) + higher (flexible / breakfast).
function buildRoom(roomName) {
  const r = rooms.find((rr) => rr.room_name === roomName);
  const cheap = r?.blocks?.[0];
  const flex = r?.blocks?.[1] || r?.blocks?.[0];
  const nights = 2;
  const baseCents = Math.round(((cheap?.raw_price || 0) / nights) * 100);
  const flexCents = Math.round(((flex?.raw_price || 0) / nights) * 100);
  const originalCents = flexCents > baseCents ? flexCents : null;
  const photos = photosByRoom[roomName].slice(0, 10).map((p, idx) => ({
    url: p.url,
    caption: p.alt || roomName,
    order: idx,
  }));
  return {
    booking_room_name: roomName,
    booking_room_id: r?.room_id,
    max_persons: cheap?.max_persons || 2,
    base_rate_cents: baseCents,
    original_rate_cents: originalCents,
    weekend_rate_cents: flexCents,
    rate_options: r?.blocks?.map((b) => ({
      label: b.raw_price && b.raw_price < (flex?.raw_price || Infinity) ? "Non-refundable" : "Flexible",
      total_text: b.price_text,
      nightly_text: b.nightly_price_text,
      total_cents: Math.round((b.raw_price || 0) * 100),
      nightly_cents: Math.round((b.raw_price || 0) / nights * 100),
      max_persons: b.max_persons,
      block_id: b.block_id,
    })),
    photos,
  };
}

const allRoomData = [
  buildRoom("Bungalow - Beach Front"),
  buildRoom("Villa with Sea View"),
  buildRoom("Twin Room with Balcony"),
  buildRoom("Bungalow with Garden View"),
  buildRoom("Deluxe Bungalow"),
];

const out = {
  store_id: "14e406a0-1126-42bb-b611-50288cf4a43b",
  name: "Mangrove Beach Bungalows",
  description: "Beachfront Location: Mangrove Beach Bungalows in Koh Rong Samloem offers a private beach area and direct beachfront access. Guests enjoy sea views, a sun terrace, and a lush garden.\n\nComfortable Accommodations: Rooms feature private bathrooms, balconies, and terraces. Free WiFi is available in public areas. Family rooms and ground-floor units cater to all travelers.\n\nDining Experience: The family-friendly restaurant serves French, American, and Cambodian cuisines. Breakfast, brunch, lunch, dinner, drinks, and snacks are available daily.",
  rating: 9.0,
  banner,
  gallery: propertyGallery,
  facilities: [
    "Free WiFi","Restaurant","Bar","Garden","Terrace","Private beach area","Beachfront","Sun deck",
    "Non-smoking rooms","Family rooms","Free parking","Airport shuttle","Room service","Pet friendly",
    "BBQ facilities","Snorkeling","Diving","Canoeing","Hiking","Tour desk","Car rental","Cycling",
    "Daily housekeeping","Baggage storage","Express check-in/out","Snack bar","Coffee house on site",
    "Outdoor fireplace","Picnic area","Outdoor furniture",
  ],
  check_in_from: "14:00",
  check_out_until: "12:00",
  rooms: allRoomData,
};

writeFileSync("/tmp/mangrove/import.json", JSON.stringify(out, null, 2));
console.log("\nBanner:", banner);
console.log("Gallery size:", propertyGallery.length);
console.log("\n--- Rooms summary ---");
for (const r of allRoomData) {
  console.log(
    r.booking_room_name,
    `| base $${(r.base_rate_cents / 100).toFixed(2)} / orig $${((r.original_rate_cents || 0) / 100).toFixed(2)}`,
    `| ${r.photos.length} photos | ${r.rate_options?.length} rate options`
  );
}
