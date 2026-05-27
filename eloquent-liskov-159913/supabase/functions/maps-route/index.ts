import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  const { data: { user }, error: authErr } = await createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } }
  ).auth.getUser();
  if (authErr || !user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { origin_lat, origin_lng, dest_lat, dest_lng, waypoints } = await req.json();

    if (
      origin_lat == null || origin_lng == null ||
      dest_lat == null || dest_lng == null
    ) {
      return new Response(JSON.stringify({ error: "Missing coordinates" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (
      Math.abs(origin_lat) > 90 || Math.abs(dest_lat) > 90 ||
      Math.abs(origin_lng) > 180 || Math.abs(dest_lng) > 180 ||
      !isFinite(origin_lat) || !isFinite(origin_lng) ||
      !isFinite(dest_lat) || !isFinite(dest_lng)
    ) {
      return new Response(JSON.stringify({ error: "Invalid coordinates" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const key = Deno.env.get("GOOGLE_MAPS_API_KEY");
    if (!key) {
      console.error("[maps-route] GOOGLE_MAPS_API_KEY not configured");
      return new Response(JSON.stringify({ error: "Maps service unavailable" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Try Routes API v2 first (provides traffic-colored segments) ──
    const routesApiResult = await tryRoutesApi(key, origin_lat, origin_lng, dest_lat, dest_lng, waypoints);
    if (routesApiResult) {
      return new Response(JSON.stringify(routesApiResult), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fallback to Directions API ──
    console.debug("[maps-route] Falling back to Directions API");
    return await fallbackDirectionsApi(key, origin_lat, origin_lng, dest_lat, dest_lng, waypoints);

  } catch (e) {
    console.error("[maps-route] Error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ── Routes API v2 (returns speed reading intervals for traffic coloring) ──
async function tryRoutesApi(
  key: string,
  originLat: number, originLng: number,
  destLat: number, destLng: number,
  waypoints?: { lat: number; lng: number }[]
) {
  try {
    const intermediates = Array.isArray(waypoints)
      ? waypoints
          .filter((wp: any) => wp?.lat != null && wp?.lng != null)
          .map((wp: any) => ({
            location: { latLng: { latitude: wp.lat, longitude: wp.lng } },
          }))
      : [];

    const body: any = {
      origin: { location: { latLng: { latitude: originLat, longitude: originLng } } },
      destination: { location: { latLng: { latitude: destLat, longitude: destLng } } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE_OPTIMAL",
      computeAlternativeRoutes: false,
      extraComputations: ["TRAFFIC_ON_POLYLINE"],
      polylineEncoding: "ENCODED_POLYLINE",
    };

    if (intermediates.length > 0) {
      body.intermediates = intermediates;
    }

    const fieldMask = [
      "routes.duration",
      "routes.distanceMeters",
      "routes.polyline.encodedPolyline",
      "routes.legs.duration",
      "routes.legs.distanceMeters",
      "routes.legs.startLocation",
      "routes.legs.endLocation",
      "routes.legs.polyline.encodedPolyline",
      "routes.travelAdvisory.speedReadingIntervals",
    ].join(",");

    const res = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
        "X-Goog-FieldMask": fieldMask,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!data.routes || data.routes.length === 0) {
      console.warn("[maps-route] Routes API returned no routes", data.error?.message);
      return null;
    }

    const route = data.routes[0];
    const legs = route.legs || [];

    // Parse total duration (e.g., "1234s" → 1234)
    const totalDurationSeconds = parseDurationString(route.duration);
    const totalDistanceMeters = route.distanceMeters || 0;

    // Build leg details
    const legDetails = legs.map((leg: any) => {
      const legDurS = parseDurationString(leg.duration);
      const legDistM = leg.distanceMeters || 0;
      return {
        distance_miles: Number((legDistM / 1609.344).toFixed(2)),
        duration_minutes: Math.max(1, Math.round(legDurS / 60)),
        duration_in_traffic_minutes: Math.max(1, Math.round(legDurS / 60)),
        start_address: "",
        end_address: "",
      };
    });

    const distanceMiles = totalDistanceMeters / 1609.344;
    const durationMinutes = totalDurationSeconds / 60;

    // Speed reading intervals for traffic coloring
    const speedIntervals = route.travelAdvisory?.speedReadingIntervals || [];
    const trafficSegments = speedIntervals.map((interval: any) => ({
      startPolylinePointIndex: interval.startPolylinePointIndex || 0,
      endPolylinePointIndex: interval.endPolylinePointIndex || 0,
      speed: interval.speed || "NORMAL", // NORMAL, SLOW, TRAFFIC_JAM
    }));

    // Calculate traffic level from speed intervals
    let slowCount = 0;
    let jamCount = 0;
    const totalCount = trafficSegments.length || 1;
    for (const seg of trafficSegments) {
      if (seg.speed === "SLOW") slowCount++;
      if (seg.speed === "TRAFFIC_JAM") jamCount++;
    }
    const heavyRatio = (slowCount + jamCount * 2) / totalCount;
    let trafficLevel: "light" | "moderate" | "heavy" = "light";
    if (heavyRatio > 0.4) trafficLevel = "heavy";
    else if (heavyRatio > 0.15) trafficLevel = "moderate";

    const etaMs = Date.now() + totalDurationSeconds * 1000;

    console.debug(`[maps-route] Routes API success: ${distanceMiles.toFixed(1)}mi, ${durationMinutes.toFixed(0)}min, ${trafficSegments.length} traffic segments`);

    return {
      ok: true,
      distance_miles: Number(distanceMiles.toFixed(2)),
      duration_minutes: Math.max(1, Math.round(durationMinutes)),
      duration_in_traffic_minutes: Math.max(1, Math.round(durationMinutes)),
      traffic_ratio: 1.0,
      traffic_level: trafficLevel,
      eta_iso: new Date(etaMs).toISOString(),
      polyline: route.polyline?.encodedPolyline ?? null,
      traffic_segments: trafficSegments,
      start_address: "",
      end_address: "",
      legs: legDetails,
    };
  } catch (e) {
    console.warn("[maps-route] Routes API failed, will fallback:", e);
    return null;
  }
}

function parseDurationString(dur: string | undefined): number {
  if (!dur) return 0;
  // Format: "1234s" or "1234.5s"
  const match = dur.match(/([\d.]+)s/);
  return match ? parseFloat(match[1]) : 0;
}

// ── Fallback: original Directions API ──
async function fallbackDirectionsApi(
  key: string,
  originLat: number, originLng: number,
  destLat: number, destLng: number,
  waypoints?: { lat: number; lng: number }[]
) {
  let url = `https://maps.googleapis.com/maps/api/directions/json` +
    `?origin=${originLat},${originLng}` +
    `&destination=${destLat},${destLng}` +
    `&mode=driving` +
    `&departure_time=now` +
    `&key=${encodeURIComponent(key)}`;

  if (Array.isArray(waypoints) && waypoints.length > 0) {
    const waypointStr = waypoints
      .filter((wp: any) => wp?.lat != null && wp?.lng != null)
      .map((wp: any) => `${wp.lat},${wp.lng}`)
      .join("|");
    if (waypointStr) {
      url += `&waypoints=${encodeURIComponent(waypointStr)}`;
    }
  }

  console.debug(`[maps-route] Fetching route via Directions API`);

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "OK") {
    console.error("[maps-route] Google API error:", data.status, data.error_message);
    return new Response(JSON.stringify({ ok: false, error: "No route found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const route = data.routes?.[0];
  const legs = route?.legs;

  if (!route || !legs || legs.length === 0) {
    return new Response(JSON.stringify({ ok: false, error: "No route found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  let totalDistanceMeters = 0;
  let totalDurationSeconds = 0;
  let totalDurationInTrafficSeconds = 0;

  const legDetails = [];
  for (const leg of legs) {
    const legDistM = leg.distance?.value ?? 0;
    const legDurS = leg.duration?.value ?? 0;
    const legDurTrafficS = leg.duration_in_traffic?.value ?? legDurS;

    totalDistanceMeters += legDistM;
    totalDurationSeconds += legDurS;
    totalDurationInTrafficSeconds += legDurTrafficS;

    legDetails.push({
      distance_miles: Number((legDistM / 1609.344).toFixed(2)),
      duration_minutes: Math.max(1, Math.round(legDurS / 60)),
      duration_in_traffic_minutes: Math.max(1, Math.round(legDurTrafficS / 60)),
      start_address: leg.start_address,
      end_address: leg.end_address,
    });
  }

  const distanceMiles = totalDistanceMeters / 1609.344;
  const durationMinutes = totalDurationSeconds / 60;
  const durationInTrafficMinutes = totalDurationInTrafficSeconds / 60;

  const trafficRatio = totalDurationSeconds > 0 ? totalDurationInTrafficSeconds / totalDurationSeconds : 1.0;
  let trafficLevel: "light" | "moderate" | "heavy" = "moderate";
  if (trafficRatio < 1.1) trafficLevel = "light";
  else if (trafficRatio > 1.3) trafficLevel = "heavy";

  const etaMs = Date.now() + (totalDurationInTrafficSeconds * 1000);

  return new Response(JSON.stringify({
    ok: true,
    distance_miles: Number(distanceMiles.toFixed(2)),
    duration_minutes: Math.max(1, Math.round(durationMinutes)),
    duration_in_traffic_minutes: Math.max(1, Math.round(durationInTrafficMinutes)),
    traffic_ratio: Number(trafficRatio.toFixed(2)),
    traffic_level: trafficLevel,
    eta_iso: new Date(etaMs).toISOString(),
    polyline: route.overview_polyline?.points ?? null,
    traffic_segments: null,
    start_address: legs[0].start_address,
    end_address: legs[legs.length - 1].end_address,
    legs: legDetails,
  }), {
    headers: { "Content-Type": "application/json" },
  });
}
