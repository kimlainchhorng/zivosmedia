import { createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// Computes driver→pickup ETA via Google Distance Matrix and writes to ride_requests.
Deno.serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Internal-only: require service role key
  const authHeader = req.headers.get("Authorization");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!authHeader || !serviceKey || authHeader !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401, headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const mapsKey = Deno.env.get("GOOGLE_MAPS_API_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { ride_request_id } = await req.json();
    if (!ride_request_id) {
      return new Response(JSON.stringify({ error: "ride_request_id required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: ride } = await admin
      .from("ride_requests")
      .select("id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, assigned_driver_id, status")
      .eq("id", ride_request_id)
      .single();
    if (!ride) {
      return new Response(JSON.stringify({ error: "Ride not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }

    let originLat: number | null = null;
    let originLng: number | null = null;
    let destLat = ride.pickup_lat;
    let destLng = ride.pickup_lng;

    // If driver assigned and en route → use driver location
    if (ride.assigned_driver_id) {
      const { data: driver } = await admin
        .from("drivers")
        .select("current_lat, current_lng")
        .eq("id", ride.assigned_driver_id)
        .maybeSingle();
      originLat = driver?.current_lat ?? null;
      originLng = driver?.current_lng ?? null;

      // After pickup → ETA to dropoff
      if (ride.status === "in_progress") {
        destLat = ride.dropoff_lat;
        destLng = ride.dropoff_lng;
      }
    }

    if (!originLat || !originLng || !destLat || !destLng) {
      return new Response(JSON.stringify({ error: "Missing coordinates" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originLat},${originLng}&destinations=${destLat},${destLng}&mode=driving&departure_time=now&key=${mapsKey}`;
    const resp = await fetch(url);
    const json = await resp.json();
    const elem = json?.rows?.[0]?.elements?.[0];
    if (!elem || elem.status !== "OK") {
      return new Response(JSON.stringify({ error: "Distance Matrix failed", details: elem?.status }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const seconds = elem.duration_in_traffic?.value ?? elem.duration?.value ?? 0;
    const minutes = Math.max(1, Math.round(seconds / 60));

    await admin.from("ride_requests").update({
      eta_minutes: minutes,
      eta_updated_at: new Date().toISOString(),
    } as any).eq("id", ride_request_id);

    return new Response(JSON.stringify({ ok: true, eta_minutes: minutes }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[compute-eta]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
