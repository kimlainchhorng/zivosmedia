/**
 * Grocery Nearby Stores - Find real store locations near customer
 * Uses Google Maps Places API (Text Search) to find actual store locations
 */
import { getCorsHeaders } from "../_shared/cors.ts";

const STORE_QUERIES: Record<string, string> = {
  walmart: "Walmart",
  costco: "Costco",
  target: "Target store",
  kroger: "Kroger grocery",
};

Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: cors });
  }

  try {
    const GOOGLE_MAPS_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!GOOGLE_MAPS_KEY) {
      throw new Error("GOOGLE_MAPS_API_KEY not configured");
    }

    const { lat, lng, radius_miles } = await req.json();
    if (!lat || !lng) {
      return new Response(JSON.stringify({ error: "lat and lng required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const radiusMeters = Math.round((radius_miles || 15) * 1609.34);
    const results: Record<string, any[]> = {};

    console.log(`[nearby-stores] Searching near ${lat},${lng} radius=${radiusMeters}m`);

    // Search for each store type in parallel using Text Search API
    const searches = Object.entries(STORE_QUERIES).map(async ([slug, query]) => {
      try {
        // Use textsearch which is more reliable for chain stores
        const url = new URL("https://maps.googleapis.com/maps/api/place/textsearch/json");
        url.searchParams.set("query", query);
        url.searchParams.set("location", `${lat},${lng}`);
        url.searchParams.set("radius", String(radiusMeters));
        url.searchParams.set("key", GOOGLE_MAPS_KEY);

        const resp = await fetch(url.toString());
        if (!resp.ok) {
          console.error(`[nearby-stores] ${slug} API error: ${resp.status}`);
          results[slug] = [];
          return;
        }

        const data = await resp.json();
        console.log(`[nearby-stores] ${slug} API status: ${data.status}, results: ${(data.results || []).length}`);
        
        if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
          console.error(`[nearby-stores] ${slug} Google error: ${data.status} - ${data.error_message || "unknown"}`);
        }

        const places = (data.results || []).slice(0, 5); // max 5 locations per chain

        results[slug] = places.map((place: any) => {
          const pLat = place.geometry?.location?.lat;
          const pLng = place.geometry?.location?.lng;
          const distMiles = pLat && pLng ? haversineMiles(lat, lng, pLat, pLng) : null;

          return {
            place_id: place.place_id,
            name: place.name,
            address: place.formatted_address || place.vicinity || "",
            lat: pLat,
            lng: pLng,
            distance_miles: distMiles ? Math.round(distMiles * 10) / 10 : null,
            rating: place.rating || null,
            open_now: place.opening_hours?.open_now ?? null,
            photo_ref: place.photos?.[0]?.photo_reference || null,
          };
        });

        console.log(`[nearby-stores] ${slug}: found ${results[slug].length} locations`);
      } catch (err) {
        console.error(`[nearby-stores] ${slug} error:`, err);
        results[slug] = [];
      }
    });

    await Promise.all(searches);

    return new Response(
      JSON.stringify({ ok: true, stores: results }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("[nearby-stores] Error:", e);
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
});

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
