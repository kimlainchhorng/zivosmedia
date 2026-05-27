import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { scanContentForLinks, logBlockedAttempt, isAbuseThresholdExceeded, isIpAbuseThresholdExceeded, getRequestIpHash } from "../_shared/contentLinkValidation.ts";
import { isLikelyMaliciousBot } from "../_shared/botDetection.ts";

// Admin-gated approve/block for trip_messages, with admin_actions audit entry.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(withSecurity("admin-moderate-message", async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (isLikelyMaliciousBot(req.headers)) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step-up MFA — moderation actions require an AAL2 admin session
    const mfaErr = enforceAal2(authHeader, corsHeaders);
    if (mfaErr) return mfaErr;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    } as any);
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ipHash = await getRequestIpHash(req);
    if (await isIpAbuseThresholdExceeded(admin, ipHash)) {
      return new Response(JSON.stringify({ error: "rate_limited", code: "ip_abuse_threshold_exceeded", message: "Too many recent blocked submissions from your network." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (await isAbuseThresholdExceeded(admin, user.id)) {
      return new Response(JSON.stringify({ error: "rate_limited", code: "abuse_threshold_exceeded", message: "Too many recent blocked submissions. Try again in 24 hours." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { message_id, decision, notes } = await req.json();
    if (!message_id || !["clean", "blocked"].includes(decision)) {
      return new Response(JSON.stringify({ error: "message_id and decision (clean|blocked) required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (typeof notes === "string") {
      const linkScan = scanContentForLinks(notes);
      if (!linkScan.ok) {
        logBlockedAttempt(admin, { endpoint: "admin-moderate-message", userId: user.id, urls: linkScan.blocked, text: notes, ip: req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for") });
        return new Response(JSON.stringify({ error: "blocked_link", code: "blocked_link", urls: linkScan.blocked }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { error: updErr } = await admin
      .from("trip_messages")
      .update({
        moderation_status: decision,
        moderation_reason: notes ?? (decision === "blocked" ? "admin_blocked" : "admin_approved"),
      } as any)
      .eq("id", message_id);

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("admin_actions").insert({
      admin_id: user.id,
      action_type: decision === "clean" ? "approve_message" : "block_message",
      entity_type: "trip_message",
      entity_id: message_id,
      payload_json: { decision, notes: notes ?? null },
    } as any);

    return new Response(JSON.stringify({ ok: true, message_id, decision }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[admin-moderate-message]", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "admin_action" }));
