import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const json = (body: Record<string, unknown>, corsHeaders: Record<string, string>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });

function isServiceRoleRequest(req: Request, serviceKey: string): boolean {
  const authorization = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || "";
  return authorization === `Bearer ${serviceKey}` || apikey === serviceKey;
}

const toRad = (d: number) => (d * Math.PI) / 180;
const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// deno-lint-ignore no-explicit-any
async function manualDispatch(adminClient: any, jobId: string, customerId: string, radiusMeters: number, offerTtlSeconds: number) {
  const { data: fullJob } = await adminClient
    .from("jobs")
    .select("pickup_lat, pickup_lng")
    .eq("id", jobId)
    .maybeSingle();

  if (!fullJob?.pickup_lat || !fullJob?.pickup_lng) {
    console.error("[dispatch-start] Job missing pickup coordinates");
    return null;
  }

  // Find online, NOT-busy drivers. The is_busy check matters because
  // accept_offer RPC (used by IncomingOfferModal) flips is_busy=true but
  // leaves driver_state='online_available'. Without this filter a driver
  // mid-trip can still receive new offers they can't accept.
  // `.not("is_busy", "is", true)` matches both false AND null.
  const { data: nearby } = await adminClient
    .from("drivers_status")
    .select("driver_id, lat, lng")
    .eq("is_online", true)
    .not("is_busy", "is", true)
    .in("driver_state", ["online_available", "online"]);

  if (!nearby || nearby.length === 0) {
    console.info("[dispatch-start] No online drivers found");
    return null;
  }

  // Get already-offered driver IDs to avoid duplicates
  const { data: existingOffers } = await adminClient
    .from("job_offers")
    .select("driver_id")
    .eq("job_id", jobId);

  const alreadyOffered = new Set((existingOffers || []).map((o: { driver_id: string }) => o.driver_id));

  // Score candidates: drivers WITH coordinates get distance-based priority,
  // drivers WITHOUT coordinates are still eligible (placed after distance-matched ones)
  const candidates = nearby
    .filter((d: { driver_id: string }) => !alreadyOffered.has(d.driver_id) && d.driver_id !== customerId)
    .map((d: { driver_id: string; lat: number | null; lng: number | null }) => {
      const hasCoords = d.lat != null && d.lng != null;
      const distance = hasCoords
        ? haversine(fullJob.pickup_lat, fullJob.pickup_lng, d.lat!, d.lng!)
        : 999999; // no coords = lowest priority but still eligible
      return { ...d, distance, hasCoords };
    })
    .filter((d: { distance: number; hasCoords: boolean }) => !d.hasCoords || d.distance <= radiusMeters)
    .sort((a: { distance: number }, b: { distance: number }) => a.distance - b.distance);

  if (candidates.length === 0) {
    console.info("[dispatch-start] No eligible drivers within radius");
    return null;
  }

  const best = candidates[0];
  const expiresAt = new Date(Date.now() + offerTtlSeconds * 1000).toISOString();

  const { data: offerData, error: insertError } = await adminClient
    .from("job_offers")
    .upsert(
      {
        job_id: jobId,
        driver_id: best.driver_id,
        offer_status: "sent",
        status: "pending",
        expires_at: expiresAt,
      },
      { onConflict: "job_id,driver_id" }
    )
    .select("id")
    .maybeSingle();

  if (insertError) {
    console.error("[dispatch-start] Insert job_offers error:", insertError);
    return null;
  }

  // Update job status
  await adminClient.from("jobs").update({ status: "dispatched" }).eq("id", jobId);

  console.info(`[dispatch-start] Matched driver ${best.driver_id} (distance: ${best.hasCoords ? Math.round(best.distance) + "m" : "unknown"})`);

  return { offer_id: offerData?.id, driver_id: best.driver_id, distance_m: best.hasCoords ? Math.round(best.distance) : null };
}

serve(withSecurity("dispatch-start", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    if (!authHeader) return json({ error: "Unauthorized" }, corsHeaders, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return json({ error: "Supabase env is not configured" }, corsHeaders, 500);
    }

    const isInternal = isServiceRoleRequest(req, serviceRoleKey);
    let userId: string | null = null;
    if (!isInternal) {
      const userClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false },
        global: { headers: { Authorization: authHeader } },
      });

      const { data: { user }, error: userError } = await userClient.auth.getUser();
      if (userError || !user) return json({ error: "Unauthorized" }, corsHeaders, 401);
      userId = user.id;
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const body = await req.json().catch(() => ({}));
    const jobId = typeof body.job_id === "string" ? body.job_id : "";
    const offerTtlSeconds = Number.isFinite(body.offer_ttl_seconds)
      ? Math.max(10, Math.min(120, Number(body.offer_ttl_seconds)))
      : 25;
    const radiusMeters = Number.isFinite(body.radius_meters)
      ? Math.max(200, Math.min(50000, Number(body.radius_meters)))
      : 15000;

    if (!jobId) return json({ error: "job_id is required" }, corsHeaders, 400);

    const { data: job, error: jobError } = await adminClient
      .from("jobs")
      .select("id, customer_id, status, assigned_driver_id")
      .eq("id", jobId)
      .maybeSingle();

    if (jobError) throw jobError;
    if (!job) return json({ error: "Job not found" }, corsHeaders, 404);
    if (!isInternal && job.customer_id !== userId) return json({ error: "Forbidden" }, corsHeaders, 403);
    if (job.assigned_driver_id) return json({ ok: true, already_assigned: true, job_id: jobId }, corsHeaders);

    if (!["created", "requested", "dispatched"].includes(job.status)) {
      return json({ error: `Job status ${job.status} cannot be dispatched` }, corsHeaders, 400);
    }

    // Always use manual dispatch (reliable, handles null coords)
    const offer = await manualDispatch(adminClient, jobId, job.customer_id, radiusMeters, offerTtlSeconds);

    return json({
      ok: true,
      job_id: jobId,
      dispatched: Boolean(offer?.offer_id),
      offer,
    }, corsHeaders);
  } catch (error) {
    console.error("[dispatch-start]", error);
    return json(
      { error: error instanceof Error ? error.message : "Unexpected error" },
      corsHeaders,
      500,
    );
  }
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80, skipBotDetection: true }));
