/**
 * ads-studio-track
 * Public tracking pixel for Ads Studio creatives.
 * Records impressions/clicks/conversions from external ad platforms via UTM params.
 *
 * GET  /functions/v1/ads-studio-track?c=<creative_id>&t=click&v=<variant_id>&src=google
 * POST /functions/v1/ads-studio-track  { creative_id, event_type, variant_id, revenue_cents, utm_* }
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const VALID_EVENTS = new Set(["impression", "click", "conversion", "signup"]);

// 1x1 transparent GIF
const PIXEL = Uint8Array.from([
  0x47,0x49,0x46,0x38,0x39,0x61,0x01,0x00,0x01,0x00,0x80,0x00,0x00,0xff,0xff,0xff,
  0x00,0x00,0x00,0x21,0xf9,0x04,0x01,0x00,0x00,0x00,0x00,0x2c,0x00,0x00,0x00,0x00,
  0x01,0x00,0x01,0x00,0x00,0x02,0x02,0x44,0x01,0x00,0x3b,
]);

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const url = new URL(req.url);
    let payload: any = {};
    if (req.method === "POST") {
      payload = await req.json().catch(() => ({}));
    } else {
      payload = {
        creative_id: url.searchParams.get("c"),
        variant_id: url.searchParams.get("v"),
        event_type: url.searchParams.get("t") || "impression",
        utm_source: url.searchParams.get("src") || url.searchParams.get("utm_source"),
        utm_medium: url.searchParams.get("utm_medium"),
        utm_campaign: url.searchParams.get("utm_campaign"),
        utm_content: url.searchParams.get("utm_content"),
        revenue_cents: Number(url.searchParams.get("rev") || 0),
      };
    }

    if (!payload.creative_id || !VALID_EVENTS.has(payload.event_type)) {
      return new Response(PIXEL, { status: 200, headers: { ...corsHeaders, "Content-Type": "image/gif" } });
    }

    // Resolve store_id from creative
    const { data: creative } = await admin
      .from("ads_studio_creatives")
      .select("store_id")
      .eq("id", payload.creative_id)
      .maybeSingle();

    if (!creative) {
      return new Response(PIXEL, { status: 200, headers: { ...corsHeaders, "Content-Type": "image/gif" } });
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
    const ipHash = await sha256(ip);
    const ua = req.headers.get("user-agent") || "";

    await admin.from("ads_studio_events").insert({
      creative_id: payload.creative_id,
      variant_id: payload.variant_id || null,
      store_id: creative.store_id,
      event_type: payload.event_type,
      revenue_cents: Math.max(0, Number(payload.revenue_cents) || 0),
      utm_source: payload.utm_source || null,
      utm_medium: payload.utm_medium || null,
      utm_campaign: payload.utm_campaign || null,
      utm_content: payload.utm_content || null,
      ip_hash: ipHash,
      user_agent: ua.slice(0, 200),
    });

    if (req.method === "POST") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(PIXEL, {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "image/gif", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("track err", e);
    return new Response(PIXEL, { status: 200, headers: { ...corsHeaders, "Content-Type": "image/gif" } });
  }
});
