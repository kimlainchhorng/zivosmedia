import { readFileSync, writeFileSync } from "node:fs";

const data = JSON.parse(readFileSync("/tmp/mangrove/import.json", "utf8"));

const sqlEscape = (s) => `'${String(s).replace(/'/g, "''")}'`;
const jsonbLit  = (obj) => `'${JSON.stringify(obj).replace(/'/g, "''")}'::jsonb`;
const textArr   = (arr) => `ARRAY[${arr.map(sqlEscape).join(",")}]::text[]`;

const STORE_ID = data.store_id;

// --- store_profiles update ---
const galleryObjs = data.gallery.map((url, i) => ({ url, caption: data.name, order: i }));
const storeSql = `UPDATE store_profiles SET
  banner_url = ${sqlEscape(data.banner)},
  gallery_images = ${jsonbLit(galleryObjs)},
  rating = ${data.rating},
  description = ${sqlEscape(data.description)},
  updated_at = now()
WHERE id = ${sqlEscape(STORE_ID)};`;

// --- lodge_property_profile upsert ---
const profileSql = `INSERT INTO lodge_property_profile (store_id, facilities, popular_amenities, check_in_from, check_out_until)
VALUES (
  ${sqlEscape(STORE_ID)},
  ${textArr(data.facilities)},
  ${textArr(data.facilities.slice(0, 12))},
  ${sqlEscape(data.check_in_from)},
  ${sqlEscape(data.check_out_until)}
)
ON CONFLICT (store_id) DO UPDATE SET
  facilities = EXCLUDED.facilities,
  popular_amenities = EXCLUDED.popular_amenities,
  check_in_from = EXCLUDED.check_in_from,
  check_out_until = EXCLUDED.check_out_until;`;

// --- existing room mapping ---
const EXISTING = {
  "Villa with Sea View":         { id: "6698032d-f991-4a9d-a298-d7c1ee5f4b40", booking: "Villa with Sea View" },
  "Twin Room with Balcony":      { id: "42828187-8c45-4b8e-bb80-5924af0f39ae", booking: "Twin Room with Balcony" },
  // Budget Double Room: rename to mirror Booking inventory (cheapest 4-person room)
  "Budget Double Room":          { id: "b94bfefe-406c-40cb-b23c-716e16c5a8f2", booking: "Bungalow with Garden View", rename: "Bungalow with Garden View" },
};

const BOOKING_DETAILS = {
  "Bungalow - Beach Front": {
    room_type: "Bungalow",
    beds: "1 Double Bed",
    size_sqm: 30,
    description: "Beachfront bungalow with private terrace and direct sea access. Wooden interior, fan-cooled, mosquito net over the double bed, and en-suite bathroom with shower. Step out from the porch onto the white sand of Saracen Bay.",
    amenities: ["Free toiletries","Towels","Toilet","Shower","Fan","Mosquito net","Wardrobe or closet","Outdoor furniture","Seating area","Terrace","Beachfront","Sea view","Garden view","Non-smoking","Linen"],
    view: "Beach Front",
  },
  "Villa with Sea View": {
    room_type: "Villa",
    beds: "1 Queen Bed",
    size_sqm: 48,
    description: "Sea-view villa with private bathroom, balcony, and terrace in a beachfront setting. Air-conditioning, canopy or wooden bed, full bathroom with shower, and outdoor seating. Views over Saracen Bay.",
    amenities: ["Free toiletries","Towels","Toilet","Shower","Wi-Fi","Air conditioning","Wardrobe or closet","Desk","Non-smoking","Garden view","Sea view","Balcony","Terrace","Beachfront","Outdoor furniture","Seating area","Linen"],
    view: "Sea View",
  },
  "Twin Room with Balcony": {
    room_type: "Standard",
    beds: "2 Single Beds",
    size_sqm: 25,
    description: "Twin room with balcony seating, two single beds, en-suite bathroom and sea breeze views. Air-conditioned, suitable for friends or family of up to 4 with extra bedding.",
    amenities: ["Free toiletries","Towels","Toilet","Shower","Wi-Fi","Air conditioning","Wardrobe or closet","Desk","Non-smoking","Balcony","Seating area","Outdoor furniture","Linen","Mosquito net"],
    view: "Balcony",
  },
  "Bungalow with Garden View": {
    room_type: "Bungalow",
    beds: "1 Double Bed",
    size_sqm: 25,
    description: "Cozy garden-view bungalow set in the tropical garden a short stroll from the beach. Wooden interior, fan-cooled, mosquito net, private porch with hammock, and en-suite bathroom.",
    amenities: ["Free toiletries","Towels","Toilet","Shower","Fan","Mosquito net","Wardrobe or closet","Outdoor furniture","Seating area","Terrace","Garden view","Non-smoking","Linen"],
    view: "Garden View",
  },
  "Deluxe Bungalow": {
    room_type: "Deluxe",
    beds: "1 King Bed",
    size_sqm: 40,
    description: "Spacious deluxe bungalow with canopy king bed, sitting area, full en-suite bathroom, and large private veranda overlooking the garden and beach. Air-conditioned, with hammock and outdoor lounge.",
    amenities: ["Free toiletries","Towels","Toilet","Shower","Wi-Fi","Air conditioning","Wardrobe or closet","Desk","Non-smoking","Balcony","Terrace","Outdoor furniture","Seating area","Garden view","Linen","Mosquito net","Bath or Shower"],
    view: "Deluxe",
  },
};

function buildAddons(rateOpts, breakfastIncluded) {
  // Booking shows two rate plans per room. Represent the higher one as a breakfast addon.
  const flex = rateOpts?.find((o) => o.label === "Flexible") || rateOpts?.[rateOpts.length - 1];
  const cheap = rateOpts?.find((o) => o.label === "Non-refundable") || rateOpts?.[0];
  if (!flex || !cheap || flex.nightly_cents === cheap.nightly_cents) return [];
  const diff = flex.nightly_cents - cheap.nightly_cents;
  return [
    {
      name: "Breakfast included (flexible rate)",
      description: "Switch to the flexible rate with breakfast included. Free cancellation usually applies.",
      price_cents: diff,
      per: "night",
      enabled: true,
    },
  ];
}

const updateRoomSqls = [];
const insertRoomSqls = [];

// existing rooms — update
for (const [origName, info] of Object.entries(EXISTING)) {
  const bRoom = data.rooms.find((r) => r.booking_room_name === info.booking);
  if (!bRoom) continue;
  const details = BOOKING_DETAILS[info.booking];
  const photos = bRoom.photos.map((p) => p.url);
  const finalName = info.rename || origName;
  const orig = bRoom.original_rate_cents && bRoom.original_rate_cents > bRoom.base_rate_cents ? bRoom.original_rate_cents : null;
  const discountPct = orig ? Math.round((1 - bRoom.base_rate_cents / orig) * 1000) / 10 : null;

  updateRoomSqls.push(`UPDATE lodge_rooms SET
  name = ${sqlEscape(finalName)},
  room_type = ${sqlEscape(details.room_type)},
  beds = ${sqlEscape(details.beds)},
  max_guests = ${bRoom.max_persons},
  size_sqm = ${details.size_sqm},
  base_rate_cents = ${bRoom.base_rate_cents},
  weekend_rate_cents = ${bRoom.weekend_rate_cents},
  original_rate_cents = ${orig ?? "NULL"},
  breakfast_rate_cents = ${bRoom.original_rate_cents ?? "NULL"},
  breakfast_included = false,
  weekly_discount_pct = ${discountPct ?? "NULL"},
  description = ${sqlEscape(details.description)},
  view = ${sqlEscape(details.view)},
  amenities = ${textArr(details.amenities)},
  photos = ${jsonbLit(photos)},
  addons = ${jsonbLit(buildAddons(bRoom.rate_options, false))},
  bed_config = ${jsonbLit([{ type: details.beds.split(" ").slice(1).join(" "), count: parseInt(details.beds) || 1 }])},
  badges = ${textArr(orig ? [`${discountPct}% off`, "Beachfront", "Free WiFi"] : ["Beachfront", "Free WiFi"])},
  is_active = true,
  updated_at = now()
WHERE id = ${sqlEscape(info.id)};`);
}

// new rooms — insert
const NEW_ROOMS = ["Bungalow - Beach Front", "Deluxe Bungalow"];
let sortOrder = 1;
for (const roomName of NEW_ROOMS) {
  const bRoom = data.rooms.find((r) => r.booking_room_name === roomName);
  if (!bRoom) continue;
  const details = BOOKING_DETAILS[roomName];
  const photos = bRoom.photos.map((p) => p.url);
  const orig = bRoom.original_rate_cents && bRoom.original_rate_cents > bRoom.base_rate_cents ? bRoom.original_rate_cents : null;
  const discountPct = orig ? Math.round((1 - bRoom.base_rate_cents / orig) * 1000) / 10 : null;

  insertRoomSqls.push(`INSERT INTO lodge_rooms (
  store_id, name, room_type, beds, max_guests, size_sqm, units_total,
  base_rate_cents, weekend_rate_cents, original_rate_cents, breakfast_rate_cents, breakfast_included, weekly_discount_pct,
  description, view, amenities, photos, addons, bed_config, badges,
  sort_order, is_active, cancellation_policy, cover_photo_index, min_stay
) VALUES (
  ${sqlEscape(STORE_ID)},
  ${sqlEscape(roomName)},
  ${sqlEscape(details.room_type)},
  ${sqlEscape(details.beds)},
  ${bRoom.max_persons},
  ${details.size_sqm},
  1,
  ${bRoom.base_rate_cents},
  ${bRoom.weekend_rate_cents},
  ${orig ?? "NULL"},
  ${bRoom.original_rate_cents ?? "NULL"},
  false,
  ${discountPct ?? "NULL"},
  ${sqlEscape(details.description)},
  ${sqlEscape(details.view)},
  ${textArr(details.amenities)},
  ${jsonbLit(photos)},
  ${jsonbLit(buildAddons(bRoom.rate_options, false))},
  ${jsonbLit([{ type: details.beds.split(" ").slice(1).join(" "), count: parseInt(details.beds) || 1 }])},
  ${textArr(orig ? [`${discountPct}% off`, "Beachfront", "Free WiFi"] : ["Beachfront", "Free WiFi"])},
  ${sortOrder++},
  true,
  'flexible',
  0,
  1
);`);
}

const fullSql = [
  "-- store_profiles update",
  storeSql,
  "",
  "-- lodge_property_profile upsert",
  profileSql,
  "",
  "-- existing rooms",
  ...updateRoomSqls,
  "",
  "-- new rooms",
  ...insertRoomSqls,
].join("\n");

writeFileSync("/tmp/mangrove/import.sql", fullSql);
console.log("Wrote /tmp/mangrove/import.sql (" + fullSql.length + " chars)");
console.log("Statements:", 2 + updateRoomSqls.length + insertRoomSqls.length);
