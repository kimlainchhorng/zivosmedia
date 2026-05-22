import { createClient } from "../_shared/deps.ts";
import { scanContentForLinks, logBlockedAttempt, isAbuseThresholdExceeded, isIpAbuseThresholdExceeded, getRequestIpHash } from "../_shared/contentLinkValidation.ts";
import { isLikelyMaliciousBot } from "../_shared/botDetection.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const VALID_CATEGORIES = new Set(["overcharge", "no_service", "safety", "other"]);

Deno.serve(withSecurity("submit-refund-request", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    if (isLikelyMaliciousBot(req.headers)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { ride_request_id, reason_category, description, requested_amount_cents } = body || {};

    if (!ride_request_id || typeof ride_request_id !== "string") {
      return new Response(JSON.stringify({ error: "ride_request_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!VALID_CATEGORIES.has(reason_category)) {
      return new Response(JSON.stringify({ error: "invalid reason_category" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (typeof requested_amount_cents !== "number" || requested_amount_cents <= 0) {
      return new Response(JSON.stringify({ error: "requested_amount_cents must be positive" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const ipHash = await getRequestIpHash(req);
    if (await isIpAbuseThresholdExceeded(admin, ipHash)) {
      return new Response(JSON.stringify({ error: "rate_limited", code: "ip_abuse_threshold_exceeded", message: "Too many recent blocked submissions from your network." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (await isAbuseThresholdExceeded(admin, user.id)) {
      return new Response(JSON.stringify({ error: "rate_limited", code: "abuse_threshold_exceeded", message: "Too many recent blocked submissions. Try again in 24 hours." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (typeof description === "string") {
      const linkScan = scanContentForLinks(description);
      if (!linkScan.ok) {
        logBlockedAttempt(admin, {
          endpoint: "submit-refund-request",
          userId: user.id,
          urls: linkScan.blocked,
          text: description,
          ip: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for"),
        });
        return new Response(
          JSON.stringify({ error: "blocked_link", code: "blocked_link", urls: linkScan.blocked }),
          { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // Validate ride: completed, owned by user, within 30 days
    const { data: ride, error: rideErr } = await admin
      .from("ride_requests")
      .select("id, user_id, status, captured_amount_cents, payment_amount, completed_at, created_at, payment_status")
      .eq("id", ride_request_id)
      .maybeSingle();

    if (rideErr || !ride) {
      return new Response(JSON.stringify({ error: "ride not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (ride.user_id !== user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (ride.status !== "completed") {
      return new Response(JSON.stringify({ error: "ride not completed" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const completedAt = ride.completed_at ? new Date(ride.completed_at as string) : new Date(ride.created_at as string);
    const daysSince = (Date.now() - completedAt.getTime()) / 86_400_000;
    if (daysSince > 30) {
      return new Response(JSON.stringify({ error: "refund window expired (30 days)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cap amount to trip total
    const tripTotalCents = (ride.captured_amount_cents as number) ?? Math.round(((ride.payment_amount as number) ?? 0) * 100);
    if (tripTotalCents <= 0) {
      return new Response(JSON.stringify({ error: "no captured payment to refund" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const cappedAmount = Math.min(requested_amount_cents, tripTotalCents);

    // Check no existing pending request
    const { data: existing } = await admin
      .from("ride_refund_requests")
      .select("id")
      .eq("ride_request_id", ride_request_id)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ error: "pending refund request already exists" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: inserted, error: insertErr } = await admin
      .from("ride_refund_requests")
      .insert({
        ride_request_id,
        requester_id: user.id,
        reason_category,
        description: typeof description === "string" ? description.slice(0, 500) : null,
        requested_amount_cents: cappedAmount,
        status: "pending",
      } as any)
      .select("id")
      .single();

    if (insertErr) {
      console.error("[submit-refund-request] insert error", insertErr);
      return new Response(JSON.stringify({ error: "failed to submit" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Notify admins (best-effort)
    try {
      await admin.from("admin_notifications").insert({
        category: "payments",
        severity: "info",
        title: "New refund request",
        message: `Rider requested ${(cappedAmount / 100).toFixed(2)} refund for ride ${ride_request_id.slice(0, 8)}`,
        entity_type: "ride_refund_request",
        entity_id: inserted.id,
        link: "/admin/payments/refunds",
      } as any);
    } catch (e) {
      console.warn("[submit-refund-request] notify failed", e);
    }

    return new Response(JSON.stringify({ ok: true, request_id: inserted.id, capped_amount_cents: cappedAmount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[submit-refund-request]", e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}, { strictCors: true, rateLimit: "payment", trackNetwork: "suspicious" }));
