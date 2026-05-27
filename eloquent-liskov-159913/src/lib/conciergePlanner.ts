/**
 * conciergePlanner — turn a free-form sentence into a 3-step action plan
 * spanning reservation / hotel / flight / ride. Pure heuristics — no API
 * call — fast and offline-safe. Good enough as a UX scaffold; can be swapped
 * for a real LLM endpoint later without changing the call sites.
 *
 * Returns up to 3 ranked actions with a `to` deep-link each.
 */

export type ConciergeStepKind = "reserve" | "ride" | "flight" | "hotel" | "eats";

export interface ConciergeStep {
  kind: ConciergeStepKind;
  title: string;
  detail: string;
  to: string;
}

export interface ConciergePlan {
  intentSummary: string;
  steps: ConciergeStep[];
}

const FOOD_HINTS = [
  "dinner", "lunch", "brunch", "breakfast", "coffee", "drinks", "happy hour",
  "eat", "food", "meal", "restaurant", "menu", "pizza", "sushi", "ramen",
  "tacos", "burger", "italian", "thai", "korean", "japanese", "indian",
  "vegan", "steak",
];
const HOTEL_HINTS = [
  "hotel", "stay", "weekend", "getaway", "trip", "vacation", "honeymoon",
  "spa", "resort", "lodge", "airbnb",
];
const FLIGHT_HINTS = ["fly", "flight", "plane", "airport", "ticket", "airline"];
const RIDE_HINTS = ["ride", "taxi", "cab", "uber", "lyft", "drive", "pickup", "drop"];

const TIME_PATTERN = /\b(at\s+)?(\d{1,2})(:\d{2})?\s*(am|pm)?\b/i;
const PLACE_PATTERN = /\b(?:in|near|to|at)\s+([A-Z][\w'-]+(?:\s+[A-Z][\w'-]+){0,3})/;
const DATE_HINT = /\b(today|tonight|tomorrow|this weekend|next weekend|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/i;

export function planFromQuery(raw: string): ConciergePlan {
  const q = raw.trim();
  if (!q) {
    return { intentSummary: "", steps: [] };
  }

  // Compound queries: "land at JFK at 8pm AND THEN sushi by 9 AND a ride" → split
  // and merge the steps. We split on common conjunctions, plan each clause,
  // then dedupe and cap the merged list.
  const clauses = splitClauses(q);
  if (clauses.length > 1) {
    const merged: ConciergeStep[] = [];
    const seen = new Set<string>();
    let combinedSummary = "";
    for (const clause of clauses) {
      const sub = planSingleClause(clause);
      if (!combinedSummary && sub.intentSummary) combinedSummary = sub.intentSummary;
      else if (sub.intentSummary) combinedSummary += ` + ${sub.intentSummary.replace(/^Plan a /, "")}`;
      for (const s of sub.steps) {
        const key = `${s.kind}|${s.title}`;
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(s);
      }
    }
    return {
      intentSummary: combinedSummary || `Plan ${q}`,
      steps: merged.slice(0, 4),
    };
  }

  return planSingleClause(q);
}

function splitClauses(q: string): string[] {
  // Split on " and then ", " then ", " after that ", " also ", " plus "
  const parts = q.split(/\s+(?:and\s+then|then|after\s+that|also|plus)\s+/i);
  // Also split a leading "and" inside the same clause (less common but happens)
  return parts.map((p) => p.trim()).filter(Boolean);
}

function planSingleClause(q: string): ConciergePlan {
  const lower = q.toLowerCase();
  const hasFood = FOOD_HINTS.some((w) => lower.includes(w));
  const hasHotel = HOTEL_HINTS.some((w) => lower.includes(w));
  const hasFlight = FLIGHT_HINTS.some((w) => lower.includes(w));
  const hasRide = RIDE_HINTS.some((w) => lower.includes(w));

  const time = extractTime(q);
  const place = extractPlace(q);
  const dateHint = q.match(DATE_HINT)?.[0];

  const steps: ConciergeStep[] = [];

  if (hasFood) {
    const cuisine = pickCuisine(lower) ?? "restaurants";
    steps.push({
      kind: "reserve",
      title: time
        ? `Reserve a table for ${time}${place ? ` near ${place}` : ""}`
        : `Find ${cuisine}${place ? ` in ${place}` : " near you"}`,
      detail: dateHint ? `${capitalize(dateHint)} · ${cuisine}` : cuisine,
      to: `/eats/reserve?restaurantName=${encodeURIComponent(place ?? cuisine)}`,
    });
    if (place) {
      steps.push({
        kind: "ride",
        title: `Get a ride to ${place}`,
        detail: time ? `Arriving by ${time}` : "We'll time it to your booking",
        to: `/rides/hub?destination=${encodeURIComponent(place)}`,
      });
    }
    steps.push({
      kind: "eats",
      title: place ? `Browse menus near ${place}` : "Browse delivery menus",
      detail: "Or order delivery if you'd rather stay in",
      to: `/eats?q=${encodeURIComponent(place ?? cuisine)}`,
    });
  } else if (hasHotel || hasFlight) {
    if (place) {
      steps.push({
        kind: "flight",
        title: `Search flights to ${place}`,
        detail: dateHint ? `For ${dateHint}` : "Pick your dates",
        to: `/flights?to=${encodeURIComponent(place)}&bundle=1`,
      });
      steps.push({
        kind: "hotel",
        title: `Find hotels in ${place}`,
        detail: "Stay where the network has partners",
        to: `/hotels?city=${encodeURIComponent(place)}&bundle=1`,
      });
      steps.push({
        kind: "ride",
        title: "Add an airport ride",
        detail: "Pickup timed to your flight",
        to: `/rides/hub?bundle=1`,
      });
    } else {
      steps.push({
        kind: "flight",
        title: "Search flights",
        detail: dateHint ?? "Pick a destination & dates",
        to: `/flights?bundle=1`,
      });
      steps.push({
        kind: "hotel",
        title: "Find a hotel",
        detail: "Bundle with your flight to save",
        to: `/hotels?bundle=1`,
      });
    }
  } else if (hasRide || place) {
    steps.push({
      kind: "ride",
      title: place ? `Get a ride to ${place}` : "Request a ride",
      detail: time ? `Pickup ${time}` : "We'll match a driver in seconds",
      to: place ? `/rides/hub?destination=${encodeURIComponent(place)}` : "/rides/hub",
    });
    if (place) {
      steps.push({
        kind: "eats",
        title: `Look around ${place}`,
        detail: "Browse spots to eat or stay",
        to: `/network?tab=all`,
      });
    }
  } else {
    // Fallback: open smart search prefilled
    steps.push({
      kind: "ride",
      title: "Open ZIVO services",
      detail: "Pick from rides, eats, flights, or hotels",
      to: "/services",
    });
  }

  // Cap to 3
  const top = steps.slice(0, 3);

  return {
    intentSummary: summarize({ hasFood, hasHotel, hasFlight, hasRide, place, time, dateHint }),
    steps: top,
  };
}

function extractTime(q: string): string | null {
  const m = q.match(TIME_PATTERN);
  if (!m) return null;
  const hour = m[2];
  const minutes = m[3] ?? "";
  const ampm = m[4] ? m[4].toLowerCase() : "";
  return `${hour}${minutes}${ampm ? ` ${ampm}` : ""}`.trim();
}

function extractPlace(q: string): string | null {
  const m = q.match(PLACE_PATTERN);
  if (!m) return null;
  return m[1].trim();
}

function pickCuisine(lower: string): string | null {
  const cuisines = [
    "pizza", "sushi", "ramen", "tacos", "burger", "italian", "thai", "korean",
    "japanese", "indian", "vegan", "steak", "mexican", "chinese",
  ];
  return cuisines.find((c) => lower.includes(c)) ?? null;
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function summarize({
  hasFood,
  hasHotel,
  hasFlight,
  hasRide,
  place,
  time,
  dateHint,
}: {
  hasFood: boolean;
  hasHotel: boolean;
  hasFlight: boolean;
  hasRide: boolean;
  place: string | null;
  time: string | null;
  dateHint: string | undefined;
}): string {
  const parts: string[] = [];
  if (hasFood) parts.push("dining");
  if (hasFlight) parts.push("flight");
  if (hasHotel) parts.push("hotel");
  if (hasRide && !hasFood) parts.push("ride");
  const intent = parts.length ? parts.join(" + ") : "trip";
  const where = place ? ` in ${place}` : "";
  const when = time ? ` at ${time}` : dateHint ? ` ${dateHint}` : "";
  return `Plan a ${intent}${where}${when}`;
}
