import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

function isServiceRoleRequest(req: Request, serviceKey: string): boolean {
  const authorization = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  return authorization === `Bearer ${serviceKey}` || apikey === serviceKey;
}

// Cron-triggered: expire pending offers older than 15s and re-dispatch with widened radius.
Deno.serve(withSecurity("dispatch-escalate", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  const provided = new URL(req.url).searchParams.get("secret") ?? req.headers.get("x-cron-secret") ?? "";
  const isInternal = Boolean(cronSecret && provided === cronSecret) || isServiceRoleRequest(req, serviceKey);
  if (!isInternal) {
    return new Response(JSON.stringify({ error: "forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

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
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[dispatch-escalate]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80, skipBotDetection: true }));
