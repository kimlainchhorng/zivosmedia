/**
 * ads-studio-track
 * Public tracking pixel for Ads Studio creatives and generic browser analytics.
 * Records impressions/clicks/conversions from external ad platforms via UTM params.
 *
 * GET  /functions/v1/ads-studio-track?c=<creative_id>&t=click&v=<variant_id>&src=google
 * POST /functions/v1/ads-studio-track  { creative_id, event_type, variant_id, revenue_cents, utm_* }
 * POST /functions/v1/ads-studio-track  { event_name, session_id, page, meta, ...analytics_fields }
 */
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const VALID_EVENTS = new Set(["impression", "click", "conversion", "signup"]);
const ANALYTICS_EVENT_PATTERN = /^[a-zA-Z0-9_.:-]{1,120}$/;
const MAX_TEXT = 240;
const MAX_PAGE = 2048;
const MAX_META_JSON = 8_192;

type AnalyticsBody = {
  event_name?: unknown;
  session_id?: unknown;
  page?: unknown;
  meta?: unknown;
  order_id?: unknown;
  value?: unknown;
  device_type?: unknown;
  traffic_source?: unknown;
  is_new_user?: unknown;
  country?: unknown;
  created_at?: unknown;
};

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

serve(withSecurity("ads-studio-track", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const trackingHeaders = { ...corsHeaders, "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };

  if (req.method === "OPTIONS") return new Response(null, { headers: trackingHeaders });

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

    if (req.method === "POST" && typeof payload.event_name !== "undefined") {
      return await handleAnalyticsEvent(req, trackingHeaders, admin, payload);
    }

    if (!payload.creative_id || !VALID_EVENTS.has(payload.event_type)) {
      return new Response(PIXEL, { status: 200, headers: { ...trackingHeaders, "Content-Type": "image/gif" } });
    }

    // Resolve store_id from creative
    const { data: creative } = await admin
      .from("ads_studio_creatives")
      .select("store_id")
      .eq("id", payload.creative_id)
      .maybeSingle();

    if (!creative) {
      return new Response(PIXEL, { status: 200, headers: { ...trackingHeaders, "Content-Type": "image/gif" } });
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
        headers: { ...trackingHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(PIXEL, {
      status: 200,
      headers: { ...trackingHeaders, "Content-Type": "image/gif", "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("track err", e);
    return new Response(PIXEL, { status: 200, headers: { ...trackingHeaders, "Content-Type": "image/gif" } });
  }
}, { allowedMethods: ["GET", "POST"], strictCors: true, rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80, skipBotDetection: true }));

async function handleAnalyticsEvent(
  req: Request,
  headers: Record<string, string>,
  admin: ReturnType<typeof createClient>,
  body: AnalyticsBody,
): Promise<Response> {
  const json = (payload: unknown, status = 200) =>
    new Response(JSON.stringify(payload), {
      status,
      headers: { ...headers, "Content-Type": "application/json" },
    });

  const eventName = cleanEventName(body.event_name);
  if (!eventName) return json({ error: "Invalid event name" }, 400);

  const meta = cleanJson(body.meta);
  if (meta === undefined) return json({ error: "Invalid event metadata" }, 400);

  const userId = await getAuthenticatedUserId(req, admin);
  const payload = {
    event_name: eventName,
    session_id: cleanText(body.session_id, MAX_TEXT) ?? crypto.randomUUID(),
    user_id: userId,
    page: cleanText(body.page, MAX_PAGE),
    meta,
    order_id: cleanText(body.order_id, MAX_TEXT),
    value: cleanNumber(body.value),
    device_type: cleanText(body.device_type, 32),
    traffic_source: cleanText(body.traffic_source, MAX_TEXT),
    is_new_user: typeof body.is_new_user === "boolean" ? body.is_new_user : null,
    country: cleanText(body.country, 2),
    created_at: cleanTimestamp(body.created_at) ?? new Date().toISOString(),
  };

  const { data, error } = await admin
    .from("analytics_events")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("[ads-studio-track:analytics]", error.message);
    return json({ error: "Analytics event failed" }, 500);
  }

  return json({ ok: true, id: data?.id ?? null });
}

async function getAuthenticatedUserId(
  req: Request,
  admin: ReturnType<typeof createClient>,
): Promise<string | null> {
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const { data } = await admin.auth.getUser(token);
  return data.user?.id ?? null;
}

function cleanEventName(value: unknown): string | null {
  const eventName = cleanText(value, 120);
  if (!eventName || !ANALYTICS_EVENT_PATTERN.test(eventName)) return null;
  return eventName;
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function cleanNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

function cleanTimestamp(value: unknown): string | null {
  const raw = cleanText(value, 64);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function cleanJson(value: unknown): unknown | undefined {
  if (value === undefined) return null;
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length > MAX_META_JSON) return undefined;
    return JSON.parse(serialized);
  } catch {
    return undefined;
  }
}
