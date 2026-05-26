/**
 * useNearbyPlaces – fetches real nearby places from Google Maps Places API
 * grouped by category (restaurants, shops, gas stations).
 */
import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface NearbyPlace {
  name: string;
  address: string;
  lat: number;
  lng: number;
  distanceMi: string;
  timeMin: string;
  priceEst: string;
  iconUrl: string; // Google place icon or photo
  placeId: string;
}

export interface NearbyCategory {
  label: string;
  type: string; // "restaurant" | "shop" | "gas"
  places: NearbyPlace[];
}

// Google type keywords per category
const CATEGORY_CONFIG = [
  { label: "Restaurants", type: "restaurant", keyword: "restaurant" },
  { label: "Shops & Grocery", type: "shop", keyword: "store|grocery|supermarket" },
  { label: "Gas Stations", type: "gas", keyword: "gas_station" },
];

// Haversine distance in miles
function haversineMi(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Estimate ride price from distance using optional DB pricing, with safe fallbacks
function estimatePrice(distMi: number, pricing?: { base_fare?: number | null; per_mile?: number | null; per_minute?: number | null; booking_fee?: number | null; minimum_fare?: number | null }): string {
  const baseFare = pricing?.base_fare ?? 3.50;
  const perMile = pricing?.per_mile ?? 1.75;
  const perMinute = pricing?.per_minute ?? 0.35;
  const bookingFee = pricing?.booking_fee ?? 2.50;
  const minimumFare = pricing?.minimum_fare ?? 7.00;
  const estMinutes = Math.max(3, Math.round(distMi * 3));
  const raw = baseFare + perMile * distMi + perMinute * estMinutes + bookingFee;
  const total = Math.max(raw, minimumFare);
  return `$${total.toFixed(2)}`;
}

// Estimate drive time (rough: 2 min per mile in city)
function estimateTime(distMi: number): string {
  return Math.max(1, Math.round(distMi * 2.5)).toString();
}

async function getApiKey(): Promise<string> {
  const envKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";
  try {
    const { data, error } = await supabase.functions.invoke("maps-api-key");
    if (!error && data?.key) return data.key;
  } catch {
    // fallback
  }
  return envKey;
}

// Ensure Google Maps JS with places library is loaded (uses unified loader)
async function ensureGooglePlaces(apiKey: string): Promise<boolean> {
  if (window.google?.maps?.places) return true;
  try {
    const { loadGoogleMaps } = await import("@/lib/maps/loadGoogleMaps");
    await loadGoogleMaps(apiKey);
    return !!window.google?.maps?.places;
  } catch {
    return false;
  }
}

async function fetchNearbyForType(
  lat: number,
  lng: number,
  type: string,
  apiKey: string,
  economyPricing?: { base_fare?: number | null; per_mile?: number | null; per_minute?: number | null; booking_fee?: number | null; minimum_fare?: number | null },
): Promise<NearbyPlace[]> {
  // Use the Places API Nearby Search via CORS proxy or directly
  // Google Places Nearby Search requires server-side calls, so we use a text search approach
  // via the Maps JavaScript API PlacesService
  return new Promise((resolve) => {
    if (!window.google?.maps?.places) {
      resolve([]);
      return;
    }

    // Create a hidden div for PlacesService (required by API)
    const div = document.createElement("div");
    const service = new google.maps.places.PlacesService(div);
    const location = new google.maps.LatLng(lat, lng);

    // Split compound types (e.g. "store|grocery|supermarket") and use the first one
    const searchType = type.split("|")[0];

    const request: google.maps.places.PlaceSearchRequest = {
      location,
      rankBy: google.maps.places.RankBy.DISTANCE,
      type: searchType,
    };

    service.nearbySearch(request, (results, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results) {
        resolve([]);
        return;
      }

      const places: NearbyPlace[] = results.slice(0, 10).map((r) => {
        const placeLat = r.geometry?.location?.lat() ?? lat;
        const placeLng = r.geometry?.location?.lng() ?? lng;
        const dist = haversineMi(lat, lng, placeLat, placeLng);

        // Get real photo from Google Places (same photos shown on Google Maps)
        let iconUrl = "";
        if (r.photos && r.photos.length > 0) {
          try {
            iconUrl = r.photos[0].getUrl({ maxWidth: 200, maxHeight: 200 });
          } catch (e) {
            console.warn(`[NearbyPlaces] Photo fetch failed for ${r.name}:`, e);
          }
        }
        // iconUrl remains undefined if no photo is available

        return {
          name: r.name ?? "Unknown",
          address: r.vicinity ?? "",
          lat: placeLat,
          lng: placeLng,
          distanceMi: dist.toFixed(1),
          timeMin: estimateTime(dist),
          priceEst: estimatePrice(dist, economyPricing),
          iconUrl,
          placeId: r.place_id ?? "",
        };
      });

      resolve(places);
    });
  });
}

export function useNearbyPlaces(userLat: number | null, userLng: number | null, economyPricing?: { base_fare?: number | null; per_mile?: number | null; per_minute?: number | null; booking_fee?: number | null; minimum_fare?: number | null }) {
  const [categories, setCategories] = useState<NearbyCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef<string>("");

  useEffect(() => {
    if (!userLat || !userLng) return;

    // Avoid re-fetching for same location (rounded to ~100m)
    const locKey = `${userLat.toFixed(3)},${userLng.toFixed(3)}`;
    if (fetchedRef.current === locKey) return;
    fetchedRef.current = locKey;

    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      const apiKey = await getApiKey();
      if (!apiKey || cancelled) {
        setLoading(false);
        return;
      }

      // Ensure Google Maps JS is loaded with places library
      const placesReady = await ensureGooglePlaces(apiKey);
      if (!placesReady || cancelled) {
        setLoading(false);
        return;
      }

      const results: NearbyCategory[] = [];

      for (const cat of CATEGORY_CONFIG) {
        if (cancelled) break;
        const places = await fetchNearbyForType(userLat, userLng, cat.keyword, apiKey, economyPricing);
        if (places.length > 0) {
          results.push({ label: cat.label, type: cat.type, places });
        }
      }

      if (!cancelled) {
        setCategories(results);
        setLoading(false);
      }
    }

    fetchAll();

    return () => {
      cancelled = true;
    };
  }, [userLat, userLng]);

  return { categories, loading };
}
