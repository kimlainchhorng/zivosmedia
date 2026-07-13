import { createClient } from "../_shared/deps.ts";

// Cron-triggered: expire pending offers older than 15s and re-dispatch with widened radius.
Deno.serve(async (_req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
    const nowIso = new Date().toISOString();

    // Expire stale offers
    const { data: expired } = await admin
      .from("job_offers")
      .update({ offer_status: "expired", status: "expired", expired_at: nowIso } as any)
      .eq("offer_status", "sent")
      .lt("expires_at", nowIso)
      .select("ride_request_id");

    const rideIds = Array.from(new Set((expired ?? []).map((r: any) => r.ride_request_id)));
    let escalated = 0;

    for (const rideId of rideIds) {
      // Skip if accepted in the meantime
      const { data: ride } = await admin
        .from("ride_requests")
        .select("id, status, assigned_driver_id")
        .eq("id", rideId)
        .single();
      if (!ride || ride.assigned_driver_id || ["accepted", "cancelled", "completed"].includes(ride.status)) continue;

      // Count prior dispatch rounds via existing offers
      const { count } = await admin.from("job_offers").select("id", { count: "exact", head: true }).eq("ride_request_id", rideId);
      const round = Math.min(3, Math.floor((count ?? 0) / 5));
      const radius = [10, 15, 20, 25][round] ?? 25;

      // Re-dispatch
      await admin.functions.invoke("dispatch-ride", { body: { ride_request_id: rideId, radius_km: radius } });
      escalated++;
    }

    return new Response(JSON.stringify({ ok: true, expired: expired?.length ?? 0, escalated }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[dispatch-escalate]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500 });
  }
});
