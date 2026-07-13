// @ts-nocheck
/**
 * marketing-event-track
 * ---------------------
 * Unified, consented marketing event ingestion.
 *
 * This function records one first-party analytics event and then sends/audits
 * provider delivery from the same payload. It intentionally avoids calling
 * other Edge Functions so provider fan-out is not affected by nested function
 * rate limits.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const EVENT_PATTERN = /^[a-zA-Z0-9_.:-]{1,120}$/;
const MAX_TEXT = 240;
const MAX_PAGE = 2048;
const MAX_JSON = 12_288;
const META_GRAPH_VERSION = "v19.0";

type MarketingBody = {
  event_name?: unknown;
  event_id?: unknown;
  session_id?: unknown;
  page?: unknown;
  value?: unknown;
  currency?: unknown;
  content_type?: unknown;
  content_id?: unknown;
  content_name?: unknown;
  source?: unknown;
  order_id?: unknown;
  click_ids?: unknown;
  fbc?: unknown;
  fbp?: unknown;
  external_id?: unknown;
  meta?: unknown;
};

serve(withSecurity("marketing-event-track", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const body = (await req.json().catch(() => ({}))) as MarketingBody;
    const eventName = cleanEventName(body.event_name);
    if (!eventName) return json({ ok: false, error: "Invalid event_name" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const userId = await getAuthenticatedUserId(req, supabaseUrl, serviceKey);

    const normalized = normalizePayload(body, req, ctx, userId);
    if (!normalized) return json({ ok: false, error: "Invalid event payload" }, 400);

    const analytics = await insertAnalyticsEvent(admin, eventName, normalized, userId);
    const providers = await deliverProviders(admin, eventName, normalized, userId);

    return json({
      ok: true,
      analytics_event_id: analytics.id,
      providers,
    });
  } catch (error) {
    console.error("[marketing-event-track]", error);
    return json({ ok: false, error: error instanceof Error ? error.message : "Request failed" }, 500);
  }
}, {
  allowedMethods: ["POST"],
  strictCors: true,
  rateLimit: "api_general",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
  skipBotDetection: true,
}));

function normalizePayload(body: MarketingBody, req: Request, ctx: unknown, userId: string | null) {
  const meta = cleanJson(body.meta);
  if (meta === undefined) return null;

  const clickIds = cleanJson(body.click_ids);
  if (clickIds === undefined) return null;

  const currency = normalizeCurrency(cleanText(body.currency, 8));
  const value = cleanNumber(body.value) ?? 0;
  const eventId = cleanText(body.event_id, MAX_TEXT) ?? crypto.randomUUID();

  return {
    event_id: eventId,
    session_id: cleanText(body.session_id, MAX_TEXT) ?? crypto.randomUUID(),
    page: cleanText(body.page, MAX_PAGE),
    value,
    value_cents: Math.round(value * 100),
    currency,
    content_type: cleanText(body.content_type, MAX_TEXT),
    content_id: cleanText(body.content_id, MAX_TEXT),
    content_name: cleanText(body.content_name, MAX_TEXT),
    source: cleanText(body.source, MAX_TEXT),
    order_id: cleanText(body.order_id, MAX_TEXT),
    external_id: cleanText(body.external_id, MAX_TEXT) ?? userId,
    fbc: cleanText(body.fbc, MAX_TEXT),
    fbp: cleanText(body.fbp, MAX_TEXT),
    click_ids: clickIds && typeof clickIds === "object" ? clickIds : {},
    meta: meta ?? {},
    diagnostic: isDiagnosticEvent(body, meta),
    client_ip: ctx?.ip ?? null,
    user_agent: req.headers.get("user-agent"),
    created_at: new Date().toISOString(),
  };
}

async function insertAnalyticsEvent(admin: any, eventName: string, payload: any, userId: string | null) {
  const { data, error } = await admin
    .from("analytics_events")
    .insert({
      event_name: `marketing_${toSnake(eventName)}`,
      session_id: payload.session_id,
      user_id: userId,
      page: payload.page,
      meta: {
        event_id: payload.event_id,
        original_event_name: eventName,
        content_type: payload.content_type,
        content_id: payload.content_id,
        content_name: payload.content_name,
        source: payload.source,
        click_ids: payload.click_ids,
        ...payload.meta,
      },
      order_id: payload.order_id,
      value: payload.value,
      traffic_source: payload.source,
      created_at: payload.created_at,
    })
    .select("id")
    .single();

  if (error) throw new Error(`Analytics insert failed: ${error.message}`);
  return { id: data?.id ?? null };
}

async function deliverProviders(admin: any, eventName: string, payload: any, userId: string | null) {
  if (payload.diagnostic) {
    return auditDiagnosticProviders(admin, eventName, payload, userId);
  }

  const providers = [];

  providers.push(await deliverMeta(admin, eventName, payload, userId));
  providers.push(await deliverGoogleAds(admin, eventName, payload, userId));

  // TikTok and X are currently covered by browser pixels. We audit that the
  // unified server event saw them, without pretending a server API is active.
  if (isConversionLike(eventName)) {
    providers.push(await auditProvider(admin, {
      eventName,
      source: "tiktok_browser_pixel",
      status: "browser_only",
      userId,
      payload,
      response: { reason: "TikTok Events API not configured in this server path" },
    }));
    providers.push(await auditProvider(admin, {
      eventName,
      source: "x_browser_pixel",
      status: "browser_only",
      userId,
      payload,
      response: { reason: "X server conversion API not configured in this server path" },
    }));
  }

  return providers;
}

async function auditDiagnosticProviders(admin: any, eventName: string, payload: any, userId: string | null) {
  const providers = ["meta_capi", "google_ads", "tiktok_browser_pixel", "x_browser_pixel"];
  const audits = [];
  for (const source of providers) {
    audits.push(await auditProvider(admin, {
      eventName,
      source,
      status: "diagnostic",
      userId,
      payload,
      response: {
        diagnostic: true,
        reason: "Admin diagnostics test recorded without sending provider network calls",
      },
    }));
  }
  return audits;
}

async function deliverMeta(admin: any, eventName: string, payload: any, userId: string | null) {
  const metaEventName = toMetaEvent(eventName);
  if (!metaEventName || !isConversionLike(eventName)) {
    return { source: "meta_capi", status: "skipped", reason: "event_not_server_sent" };
  }

  const pixelId = Deno.env.get("META_PIXEL_ID");
  const accessToken = Deno.env.get("META_ACCESS_TOKEN");
  if (!pixelId || !accessToken) {
    return auditProvider(admin, {
      eventName,
      source: "meta_capi",
      status: "not_configured",
      userId,
      payload,
      response: { missing: [!pixelId && "META_PIXEL_ID", !accessToken && "META_ACCESS_TOKEN"].filter(Boolean) },
    });
  }

  const userData: Record<string, unknown> = {};
  if (payload.external_id) userData.external_id = await sha256Hex(String(payload.external_id));
  if (payload.fbc) userData.fbc = payload.fbc;
  if (payload.fbp) userData.fbp = payload.fbp;
  if (payload.client_ip) userData.client_ip_address = payload.client_ip;
  if (payload.user_agent) userData.client_user_agent = payload.user_agent;

  const requestBody = {
    data: [{
      event_name: metaEventName,
      event_time: Math.floor(Date.now() / 1000),
      event_id: payload.event_id,
      action_source: "website",
      event_source_url: payload.page ? `${Deno.env.get("PUBLIC_ORIGIN") ?? Deno.env.get("APP_URL") ?? ""}${payload.page}` : undefined,
      user_data: userData,
      custom_data: {
        currency: payload.currency,
        value: payload.value,
        content_type: payload.content_type,
        content_ids: payload.content_id ? [payload.content_id] : undefined,
        content_name: payload.content_name,
        order_id: payload.order_id,
      },
    }],
  };

  const url = `https://graph.facebook.com/${META_GRAPH_VERSION}/${pixelId}/events?access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });
  const responseJson = await safeJson(response);

  return auditProvider(admin, {
    eventName,
    source: "meta_capi",
    status: response.ok ? "sent" : "failed",
    userId,
    payload: requestBody,
    response: responseJson,
  });
}

async function deliverGoogleAds(admin: any, eventName: string, payload: any, userId: string | null) {
  if (!isConversionLike(eventName)) {
    return { source: "google_ads", status: "skipped", reason: "event_not_server_sent" };
  }

  const actionId = googleConversionActionId(eventName);
  const gclid = payload.click_ids?.gclid;
  const missing = [
    !actionId && googleActionEnvName(eventName),
    !gclid && "gclid",
    !Deno.env.get("GOOGLE_ADS_CLIENT_ID") && "GOOGLE_ADS_CLIENT_ID",
    !Deno.env.get("GOOGLE_ADS_CLIENT_SECRET") && "GOOGLE_ADS_CLIENT_SECRET",
    !Deno.env.get("GOOGLE_ADS_REFRESH_TOKEN") && "GOOGLE_ADS_REFRESH_TOKEN",
    !Deno.env.get("GOOGLE_ADS_CUSTOMER_ID") && "GOOGLE_ADS_CUSTOMER_ID",
    !Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN") && "GOOGLE_ADS_DEVELOPER_TOKEN",
  ].filter(Boolean);

  if (missing.length) {
    return auditProvider(admin, {
      eventName,
      source: "google_ads",
      status: "not_configured",
      userId,
      payload,
      response: { missing },
    });
  }

  const accessToken = await getGoogleAccessToken();
  const customerId = Deno.env.get("GOOGLE_ADS_CUSTOMER_ID")!;
  const conversionDateTime = new Date().toISOString().replace("T", " ").replace("Z", "+00:00").split(".")[0] + "+00:00";
  const requestBody = {
    conversions: [{
      conversionAction: `customers/${customerId}/conversionActions/${actionId}`,
      conversionDateTime,
      conversionValue: payload.value,
      currencyCode: payload.currency,
      gclid,
      ...(payload.order_id ? { orderId: payload.order_id } : {}),
    }],
    partialFailure: true,
    validateOnly: false,
  };

  const response = await fetch(`https://googleads.googleapis.com/v18/customers/${customerId}:uploadClickConversions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "developer-token": Deno.env.get("GOOGLE_ADS_DEVELOPER_TOKEN")!,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  const responseJson = await safeJson(response);

  return auditProvider(admin, {
    eventName,
    source: "google_ads",
    status: response.ok ? "sent" : "failed",
    userId,
    payload: requestBody,
    response: responseJson,
  });
}

async function auditProvider(admin: any, input: {
  eventName: string;
  source: string;
  status: string;
  userId: string | null;
  payload: any;
  response: any;
}) {
  const { error } = await admin.from("conversion_events").insert({
    event_name: input.eventName,
    source: input.source,
    value_cents: input.payload?.value_cents ?? Math.round((input.payload?.value ?? 0) * 100),
    currency: input.payload?.currency ?? "USD",
    external_id: input.payload?.order_id ?? input.payload?.event_id ?? null,
    user_id: input.userId,
    payload: trimJson(input.payload),
    response: trimJson(input.response),
    status: input.status,
  });

  if (error) console.error("[marketing-event-track] provider audit failed", input.source, error.message);
  return { source: input.source, status: input.status };
}

async function getAuthenticatedUserId(req: Request, supabaseUrl: string, serviceKey: string): Promise<string | null> {
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;
  const authClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data } = await authClient.auth.getUser(token);
  return data.user?.id ?? null;
}

async function getGoogleAccessToken(): Promise<string> {
  const params = new URLSearchParams({
    client_id: Deno.env.get("GOOGLE_ADS_CLIENT_ID")!,
    client_secret: Deno.env.get("GOOGLE_ADS_CLIENT_SECRET")!,
    refresh_token: Deno.env.get("GOOGLE_ADS_REFRESH_TOKEN")!,
    grant_type: "refresh_token",
  });
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params,
  });
  const json = await response.json();
  if (!response.ok || !json.access_token) throw new Error("Google Ads OAuth token request failed");
  return json.access_token;
}

async function safeJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text, status: response.status };
  }
}

function cleanEventName(value: unknown): string | null {
  const eventName = cleanText(value, 120);
  if (!eventName || !EVENT_PATTERN.test(eventName)) return null;
  return eventName;
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function cleanNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function normalizeCurrency(value: string | null): string {
  return (value || "USD").toUpperCase().slice(0, 8);
}

function cleanJson(value: unknown): unknown | undefined {
  if (value === undefined) return null;
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length > MAX_JSON) return undefined;
    return JSON.parse(serialized);
  } catch {
    return undefined;
  }
}

function isDiagnosticEvent(body: MarketingBody, meta: unknown): boolean {
  const source = cleanText(body.source, MAX_TEXT);
  if (source === "admin_diagnostics") return true;
  if (!meta || typeof meta !== "object") return false;
  return (meta as Record<string, unknown>).diagnostic === true;
}

function trimJson(value: unknown): unknown {
  try {
    const serialized = JSON.stringify(value);
    if (serialized.length <= MAX_JSON) return JSON.parse(serialized);
    return { truncated: true, bytes: serialized.length };
  } catch {
    return null;
  }
}

function toSnake(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
}

function isConversionLike(eventName: string): boolean {
  return ["Lead", "InitiateCheckout", "Purchase", "SignUp", "Share"].includes(eventName);
}

function toMetaEvent(eventName: string): string | null {
  if (eventName === "SignUp") return "CompleteRegistration";
  if (["Lead", "InitiateCheckout", "Purchase", "ViewContent", "PageView"].includes(eventName)) return eventName;
  return null;
}

function googleActionEnvName(eventName: string): string {
  return `GOOGLE_ADS_CONVERSION_ACTION_ID_${toSnake(eventName).toUpperCase()}`;
}

function googleConversionActionId(eventName: string): string | null {
  return Deno.env.get(googleActionEnvName(eventName)) || Deno.env.get("GOOGLE_ADS_CONVERSION_ACTION_ID") || null;
}

async function sha256Hex(input: string): Promise<string> {
  const normalized = input.trim().toLowerCase();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  const bytes = new Uint8Array(digest);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
