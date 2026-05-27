import { createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

// Find nearby online drivers and create job_offers for a ride request.
// Uses Haversine distance fallback if PostGIS not available.
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
    const admin = createClient(supabaseUrl, serviceKey);

    const { ride_request_id, radius_km = 10 } = await req.json();
    if (!ride_request_id) {
      return new Response(JSON.stringify({ error: "ride_request_id required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const { data: ride, error: rideErr } = await admin
      .from("ride_requests")
      .select("id, user_id, pickup_address, pickup_lat, pickup_lng, dropoff_address, dropoff_lat, dropoff_lng, ride_type, quoted_total, distance_miles, duration_minutes, status")
      .eq("id", ride_request_id)
      .single();
    if (rideErr || !ride) {
      return new Response(JSON.stringify({ error: "Ride not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    }
    if (ride.pickup_lat == null || ride.pickup_lng == null) {
      return new Response(JSON.stringify({ error: "Ride missing pickup coordinates" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const jobNotes = `ride_request:${ride_request_id}`;
    let jobId: string | null = null;

    const { data: existingJob } = await admin
      .from("jobs")
      .select("id")
      .eq("notes", jobNotes)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingJob?.id) {
      jobId = existingJob.id;
    } else {
      const { data: job, error: jobErr } = await admin
        .from("jobs")
        .insert({
          customer_id: ride.user_id,
          job_type: "ride",
          status: "requested",
          pickup_address: ride.pickup_address,
          pickup_lat: ride.pickup_lat,
          pickup_lng: ride.pickup_lng,
          dropoff_address: ride.dropoff_address,
          dropoff_lat: ride.dropoff_lat,
          dropoff_lng: ride.dropoff_lng,
          estimated_miles: ride.distance_miles,
          estimated_minutes: ride.duration_minutes,
          price_total: ride.quoted_total,
          pricing_total_estimate: ride.quoted_total,
          requested_at: new Date().toISOString(),
          notes: jobNotes,
        } as any)
        .select("id")
        .single();

      if (jobErr || !job?.id) {
        console.error("[dispatch-ride] create job", jobErr);
        return new Response(JSON.stringify({ error: "Failed to create dispatch job" }), {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      jobId = job.id;
    }

    // Pull online driver sessions. drivers_status.driver_id is auth.users.id,
    // which matches job_offers.driver_id and the driver app realtime filters.
    const { data: drivers } = await admin
      .from("drivers_status")
      .select("driver_id, lat, lng, is_online, is_busy, driver_state")
      .eq("is_online", true)
      .limit(500);

    const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371;
      const toRad = (d: number) => (d * Math.PI) / 180;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.sqrt(a));
    };

    const candidates = (drivers ?? [])
      .map((d: any) => ({
        ...d,
        distance_km: d.lat != null && d.lng != null
          ? haversine(ride.pickup_lat, ride.pickup_lng, d.lat, d.lng)
          : 999,
      }))
      .filter((d: any) => !d.is_busy && ["online_available", "online"].includes(d.driver_state ?? "online") && d.distance_km <= radius_km)
      .sort((a: any, b: any) => a.distance_km - b.distance_km)
      .slice(0, 5);

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ ok: true, offered: 0, message: "No drivers in radius" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const offers = candidates.map((d: any) => ({
      job_id: jobId,
      ride_request_id,
      driver_id: d.driver_id,
      offer_status: "sent",
      status: "pending",
      miles_to_pickup: d.distance_km === 999 ? null : d.distance_km * 0.621371,
      expires_at: new Date(Date.now() + 15_000).toISOString(),
    }));

    const { error: insErr } = await admin.from("job_offers").upsert(offers as any, {
      onConflict: "job_id,driver_id",
    });
    if (insErr) console.error("[dispatch-ride] insert offers", insErr);

    await admin.from("ride_requests").update({ status: "dispatching" } as any).eq("id", ride_request_id);
    await admin.from("jobs").update({ status: "dispatched" } as any).eq("id", jobId);

    return new Response(JSON.stringify({ ok: true, job_id: jobId, offered: candidates.length, candidates: candidates.map((c: any) => c.driver_id) }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[dispatch-ride]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } });
  }
});
