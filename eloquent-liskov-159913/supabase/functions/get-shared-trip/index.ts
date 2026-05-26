import { createClient } from "../_shared/deps.ts";

// Public endpoint — resolves a share_token to limited ride info.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    if (!token) {
      return new Response(JSON.stringify({ error: "token required" }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: share } = await admin
      .from("trip_shares")
      .select("ride_id, expires_at, revoked")
      .eq("share_token", token)
      .single();

    if (!share || (share as any).revoked || new Date((share as any).expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Link expired or invalid" }), { status: 404, headers: corsHeaders });
    }

    const { data: ride } = await admin
      .from("ride_requests")
      .select("id, status, eta_minutes, eta_updated_at, pickup_address, dropoff_address, assigned_driver_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng")
      .eq("id", (share as any).ride_id)
      .single();

    let driver: any = null;
    if (ride?.assigned_driver_id) {
      const { data: d } = await admin
        .from("drivers")
        .select("id, full_name, vehicle_make, vehicle_model, vehicle_color, vehicle_plate, current_lat, current_lng, rating")
        .eq("id", ride.assigned_driver_id)
        .single();
      driver = d;
    }

    return new Response(JSON.stringify({ ride, driver, expires_at: (share as any).expires_at }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[get-shared-trip]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders });
  }
});
