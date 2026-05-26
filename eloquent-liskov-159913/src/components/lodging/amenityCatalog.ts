/**
 * Booking.com-grade canonical amenity catalog.
 * Each amenity has a stable `key`, a human `label`, optional `extraCharge` flag,
 * and reuses `getAmenityIcon` for its Lucide icon.
 *
 * Categories are ordered exactly how they render in the host editor and guest panel.
 */
export interface AmenityItem {
  key: string;
  label: string;
  extraChargeAllowed?: boolean;
}

export interface AmenityCategory {
  key: string;
  label: string;
  /** When true, this category renders as a single-select radio group. */
  singleSelect?: boolean;
  /** When true, items render as compact chips (e.g. languages). */
  asChips?: boolean;
  items: AmenityItem[];
}

export const AMENITY_CATEGORIES: AmenityCategory[] = [
  {
    key: "popular",
    label: "Most popular",
    items: [
      { key: "outdoor_pool", label: "Outdoor pool" },
      { key: "non_smoking_rooms", label: "Non-smoking rooms" },
      { key: "wifi", label: "Free Wi-Fi" },
      { key: "restaurant", label: "Restaurant" },
      { key: "fitness_centre", label: "Fitness centre" },
      { key: "beachfront", label: "Beachfront" },
      { key: "bar", label: "Bar" },
      { key: "private_beach", label: "Private beach" },
      { key: "airport_shuttle", label: "Airport shuttle", extraChargeAllowed: true },
      { key: "family_rooms", label: "Family rooms" },
    ],
  },
  {
    key: "great_for_stay",
    label: "Great for your stay",
    items: [
      { key: "private_bathroom", label: "Private bathroom" },
      { key: "ac", label: "Air conditioning" },
      { key: "adults_only", label: "Adults only" },
      { key: "free_shuttle", label: "Free shuttle service" },
      { key: "watersports", label: "Watersports facilities", extraChargeAllowed: true },
      { key: "breakfast", label: "Breakfast", extraChargeAllowed: true },
      { key: "spa", label: "Spa" },
      { key: "concierge", label: "Concierge" },
    ],
  },
  {
    key: "bathroom",
    label: "Bathroom",
    items: [
      { key: "toilet_paper", label: "Toilet paper" },
      { key: "towels", label: "Towels" },
      { key: "bidet", label: "Bidet" },
      { key: "extra_linen", label: "Towels/Sheets (extra)", extraChargeAllowed: true },
      { key: "private_bathroom", label: "Private bathroom" },
      { key: "toilet", label: "Toilet" },
      { key: "shower", label: "Shower" },
      { key: "hairdryer", label: "Hairdryer" },
      { key: "bathrobe", label: "Bathrobe" },
      { key: "slippers", label: "Slippers" },
      { key: "free_toiletries", label: "Free toiletries" },
    ],
  },
  {
    key: "bedroom",
    label: "Bedroom",
    items: [
      { key: "linens", label: "Linens" },
      { key: "wardrobe", label: "Wardrobe or closet" },
      { key: "alarm_clock", label: "Alarm clock" },
    ],
  },
  {
    key: "outdoors",
    label: "Outdoors",
    items: [
      { key: "picnic_area", label: "Picnic area" },
      { key: "outdoor_furniture", label: "Outdoor furniture" },
      { key: "beachfront", label: "Beachfront" },
      { key: "sun_deck", label: "Sun deck" },
      { key: "private_beach", label: "Private beach area" },
      { key: "terrace", label: "Terrace" },
      { key: "bbq", label: "BBQ facilities", extraChargeAllowed: true },
      { key: "garden", label: "Garden" },
    ],
  },
  {
    key: "room_amenities",
    label: "Room amenities",
    items: [
      { key: "socket_near_bed", label: "Socket near the bed" },
      { key: "drying_rack", label: "Drying rack for clothing" },
      { key: "iron", label: "Iron" },
      { key: "fan", label: "Fan" },
      { key: "mosquito_net", label: "Mosquito net" },
    ],
  },
  {
    key: "activities",
    label: "Activities",
    items: [
      { key: "bicycle_rental", label: "Bicycle rental", extraChargeAllowed: true },
      { key: "bingo", label: "Bingo" },
      { key: "live_sports", label: "Live sports broadcast" },
      { key: "happy_hour", label: "Happy hour" },
      { key: "themed_dinners", label: "Themed dinner nights", extraChargeAllowed: true },
      { key: "beach", label: "Beach" },
      { key: "evening_entertainment", label: "Evening entertainment" },
      { key: "watersports", label: "Watersports facilities (on site)", extraChargeAllowed: true },
    ],
  },
  {
    key: "food_drink",
    label: "Food & Drink",
    items: [
      { key: "wine_champagne", label: "Wine/Champagne", extraChargeAllowed: true },
      { key: "special_diet_meals", label: "Special diet meals (on request)" },
      { key: "snack_bar", label: "Snack bar" },
      { key: "bar", label: "Bar" },
      { key: "restaurant", label: "Restaurant" },
      { key: "kids_meals", label: "Kids' meals", extraChargeAllowed: true },
      { key: "breakfast_in_room", label: "Breakfast in the room" },
    ],
  },
  {
    key: "internet",
    label: "Internet",
    singleSelect: true,
    items: [
      { key: "free_all", label: "Wi-Fi available in all areas (free)" },
      { key: "free_some", label: "Wi-Fi in public areas only (free)" },
      { key: "paid", label: "Wi-Fi available (paid)" },
      { key: "wired", label: "Wired internet" },
      { key: "none", label: "No internet" },
    ],
  },
  {
    key: "parking",
    label: "Parking",
    singleSelect: true,
    items: [
      { key: "none", label: "No parking" },
      { key: "free_public", label: "Free public parking nearby" },
      { key: "free_private", label: "Free private parking on site" },
      { key: "paid_public", label: "Paid public parking nearby" },
      { key: "paid_private", label: "Paid private parking on site" },
      { key: "ev_charging", label: "EV charging station" },
      { key: "valet", label: "Valet parking" },
    ],
  },
  {
    key: "transportation",
    label: "Transportation",
    items: [
      { key: "public_transit_tickets", label: "Public transit tickets", extraChargeAllowed: true },
      { key: "airport_shuttle", label: "Airport shuttle", extraChargeAllowed: true },
      { key: "car_hire", label: "Car hire" },
      { key: "bicycle_hire", label: "Bicycle hire", extraChargeAllowed: true },
    ],
  },
  {
    key: "services",
    label: "Reception services",
    items: [
      { key: "shuttle", label: "Shuttle service" },
      { key: "daily_housekeeping", label: "Daily housekeeping" },
      { key: "lockers", label: "Lockers" },
      { key: "baggage_storage", label: "Baggage storage" },
      { key: "tour_desk", label: "Tour desk" },
      { key: "laundry", label: "Laundry", extraChargeAllowed: true },
      { key: "front_desk_24h", label: "24-hour front desk" },
      { key: "concierge", label: "Concierge" },
      { key: "currency_exchange", label: "Currency exchange" },
    ],
  },
  {
    key: "front_desk",
    label: "Front desk",
    items: [
      { key: "invoice_provided", label: "Invoice provided" },
      { key: "express_checkin", label: "Express check-in/out" },
      { key: "private_checkin", label: "Private check-in/out" },
    ],
  },
  {
    key: "entertainment_family",
    label: "Entertainment & family",
    items: [
      { key: "board_games", label: "Board games/Puzzles" },
      { key: "kids_club", label: "Kids' club" },
      { key: "babysitting", label: "Babysitting/Child services", extraChargeAllowed: true },
      { key: "playground", label: "Playground" },
      { key: "family_rooms", label: "Family rooms" },
    ],
  },
  {
    key: "safety_security",
    label: "Safety & security",
    items: [
      { key: "fire_extinguishers", label: "Fire extinguishers" },
      { key: "cctv_common", label: "CCTV in common areas" },
      { key: "smoke_alarms", label: "Smoke alarms" },
      { key: "security_alarm", label: "Security alarm" },
      { key: "key_card_access", label: "Key card access" },
      { key: "key_access", label: "Key access" },
      { key: "security_24h", label: "24-hour security" },
      { key: "safe", label: "Safe" },
    ],
  },
  {
    key: "general",
    label: "General",
    items: [
      { key: "adults_only", label: "Adults only" },
      { key: "designated_smoking", label: "Designated smoking area" },
      { key: "soundproof", label: "Soundproofing" },
      { key: "soundproof_rooms", label: "Soundproof rooms" },
      { key: "non_smoking_rooms", label: "Non-smoking rooms" },
      { key: "ac", label: "Air conditioning" },
      { key: "elevator", label: "Lift" },
      { key: "heating", label: "Heating" },
    ],
  },
  {
    key: "accessibility",
    label: "Accessibility",
    items: [
      { key: "ground_floor", label: "Entire unit on ground floor" },
      { key: "wheelchair_accessible", label: "Wheelchair accessible" },
      { key: "roll_in_shower", label: "Roll-in shower" },
      { key: "braille_signage", label: "Braille signage" },
      { key: "visual_alarm", label: "Visual alarm" },
    ],
  },
  {
    key: "pool",
    label: "Pool & wellness",
    items: [
      { key: "pool_open_year", label: "Open all year" },
      { key: "pool_adults_only", label: "Adults only pool" },
      { key: "loungers", label: "Beach chairs/Loungers" },
      { key: "pool_towels", label: "Pool towels" },
      { key: "heated_pool", label: "Heated pool" },
    ],
  },
  {
    key: "spa",
    label: "Spa",
    items: [
      { key: "fitness_centre", label: "Fitness centre" },
      { key: "beach_umbrellas", label: "Beach umbrellas" },
      { key: "hot_tub", label: "Hot tub/Jacuzzi" },
      { key: "sauna", label: "Sauna" },
      { key: "steam_room", label: "Steam room" },
      { key: "massage", label: "Massage", extraChargeAllowed: true },
      { key: "body_treatments", label: "Body treatments", extraChargeAllowed: true },
    ],
  },
  {
    key: "languages",
    label: "Languages spoken",
    asChips: true,
    items: [
      { key: "english", label: "English" },
      { key: "khmer", label: "Khmer" },
      { key: "french", label: "French" },
      { key: "spanish", label: "Spanish" },
      { key: "german", label: "German" },
      { key: "italian", label: "Italian" },
      { key: "chinese", label: "Chinese" },
      { key: "japanese", label: "Japanese" },
      { key: "korean", label: "Korean" },
      { key: "russian", label: "Russian" },
      { key: "arabic", label: "Arabic" },
      { key: "hindi", label: "Hindi" },
      { key: "thai", label: "Thai" },
      { key: "vietnamese", label: "Vietnamese" },
      { key: "portuguese", label: "Portuguese" },
    ],
  },
];

/** Total selectable amenity rows (excludes singleSelect categories — those are 1 each). */
export const TOTAL_AMENITY_COUNT = AMENITY_CATEGORIES.reduce(
  (sum, cat) => sum + (cat.singleSelect ? 1 : cat.items.length),
  0,
);

/** Flatten categories → flat `{ key: true }` shape for legacy `lodge_amenities.amenities` jsonb. */
export function flattenCategoriesToLegacy(
  categories: Record<string, string[]>,
  parkingMode?: string | null,
  internetMode?: string | null,
): Record<string, boolean> {
  const flat: Record<string, boolean> = {};
  for (const cat of AMENITY_CATEGORIES) {
    if (cat.singleSelect) continue;
    const selected = categories[cat.key] || [];
    for (const k of selected) flat[k] = true;
  }
  if (parkingMode && parkingMode !== "none") flat.parking = true;
  if (internetMode && internetMode !== "none" && internetMode !== "wired") flat.wifi = true;
  return flat;
}

export function findCategoryByKey(catKey: string): AmenityCategory | undefined {
  return AMENITY_CATEGORIES.find((c) => c.key === catKey);
}
