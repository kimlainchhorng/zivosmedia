import { readFileSync, writeFileSync } from "node:fs";

const html = readFileSync("/tmp/mangrove/full.html", "utf8");

// Locate b_rooms_available_and_soldout: [ ... ] — bounded JSON array.
function extractJsonArrayAt(s, key) {
  const idx = s.indexOf(`${key}:`);
  if (idx < 0) return null;
  // Find the next "[" after the key
  const start = s.indexOf("[", idx);
  if (start < 0) return null;
  // Walk balancing brackets, ignoring those inside strings.
  let depth = 0;
  let inStr = false;
  let escape = false;
  for (let i = start; i < s.length; i++) {
    const c = s[i];
    if (escape) { escape = false; continue; }
    if (c === "\\") { escape = true; continue; }
    if (c === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (c === "[") depth++;
    else if (c === "]") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;
}

const roomsJsonStr = extractJsonArrayAt(html, "b_rooms_available_and_soldout");
if (!roomsJsonStr) { console.error("rooms json not found"); process.exit(1); }
writeFileSync("/tmp/mangrove/rooms_raw.json", roomsJsonStr);

const rooms = JSON.parse(roomsJsonStr);
console.log("Total rooms:", rooms.length);

// Photos by room type — booking groups by b_roomtype_id; photos are usually rendered separately.
// Find room photos: each room <li data-block-id="..."> has data-room-id and contains <img> tags.
// Simpler: do a positional pass — for each "data-room-id=NNN" extract nearby <img src=...>
const roomPhotos = {};
const roomPhotoRegex = /data-room-id="(\d+)"[\s\S]{0,80000}?(?=data-room-id="\d+"|$)/g;
for (const m of html.matchAll(roomPhotoRegex)) {
  const rid = m[1];
  const chunk = m[0];
  const imgs = [...chunk.matchAll(/https:\/\/cf\.bstatic\.com\/xdata\/images\/hotel\/[\w]+\/(\d+)\.jpg\?k=[a-f0-9]+/g)]
    .map((mm) => mm[0].replace(/\/(max\d+x?\d*|square\d+)\//, "/max1024x768/"));
  if (!roomPhotos[rid]) roomPhotos[rid] = [];
  roomPhotos[rid].push(...imgs);
}
for (const k of Object.keys(roomPhotos)) roomPhotos[k] = [...new Set(roomPhotos[k])];

// Also get the b_id for each "block" so we map rate -> room
const condensed = rooms.map((r) => ({
  room_name: r.b_name,
  room_id: r.b_id,
  roomtype_id: r.b_roomtype_id,
  blocks: r.b_blocks?.map((bk) => ({
    rate_name: bk.b_rate_name || bk.b_block_name || null,
    max_persons: bk.b_max_persons,
    meal_plan: bk.b_mealplan_included_name,
    price_text: bk.b_price,
    raw_price: bk.b_stay_prices?.find((sp) => sp.b_stays === 1)?.b_raw_price,
    nightly_price_text: bk.b_stay_prices?.find((sp) => sp.b_stays === 1)?.b_price_per_night,
    is_genius: bk.b_rate_is_genius,
    breakfast: bk.b_breakfast_included,
    refundable: bk.b_refundable,
    nonrefundable: bk.b_nonrefundable,
    free_cancellation_until: bk.b_free_cancellation_until,
    sum_discounts: bk.b_price_breakdown_simplified?.b_sum_discounts_percentage,
    excluded_charges: bk.b_price_breakdown_simplified?.b_excluded_charges_amount,
    average_per_night: bk.b_price_breakdown_simplified?.b_average_per_night_net_price?.[0]?.b_copy,
    block_id: bk.b_block_id,
  })) || [],
}));

writeFileSync("/tmp/mangrove/rooms_condensed.json", JSON.stringify(condensed, null, 2));

console.log("\nCondensed:");
console.log(JSON.stringify(condensed, null, 2));

writeFileSync("/tmp/mangrove/room_photos.json", JSON.stringify(roomPhotos, null, 2));
console.log("\nRoom photos per room_id:");
for (const [rid, ps] of Object.entries(roomPhotos)) {
  console.log(`  ${rid}: ${ps.length} photos`);
}
