/**
 * travel-tracking-log
 * -------------------
 * Server-side ingestion for travel search, abandoned search, and partner
 * redirect telemetry. Keeps conversion tracking tables closed to direct
 * browser inserts while preserving best-effort frontend logging.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const SEARCH_TYPES = new Set(["flights", "hotels", "cars"]);
const ABANDONED_TYPES = new Set(["hotel", "flight", "ride", "lodging", "eats"]);
const CHECKOUT_MODES = new Set(["redirect", "iframe"]);
const MAX_TEXT = 240;
const MAX_URL = 2048;
const MAX_JSON = 8_192;

type Body = {
  type?: unknown;
  session_id?: unknown;
  search_type?: unknown;
  partner_name?: unknown;
  partner_id?: unknown;
  offer_id?: unknown;
  redirect_url?: unknown;
  checkout_mode?: unknown;
  origin?: unknown;
  destination?: unknown;
  depart_date?: unknown;
  return_date?: unknown;
  passengers?: unknown;
  rooms?: unknown;
  guests?: unknown;
  cabin_class?: unknown;
  search_params?: unknown;
  metadata?: unknown;
  user_email?: unknown;
  device_type?: unknown;
  user_agent?: unknown;
};

serve(withSecurity("travel-tracking-log", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({})) as Body;
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const authUser = await getAuthenticatedUser(req, supabaseUrl, serviceKey);

    switch (cleanText(body.type, 64)) {
      case "partner_redirect":
        return await logPartnerRedirect(supabase, body, authUser?.id ?? null, json);
      case "search_session":
        return await logSearchSession(supabase, body, authUser, ctx.userAgent, json);
      case "abandoned_search":
        return await logAbandonedSearch(supabase, body, authUser, json);
      default:
        return json({ error: "Invalid tracking type" }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    console.error("[travel-tracking-log]", message);
    return json({ error: message }, 400);
  }
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function logPartnerRedirect(
  supabase: ReturnType<typeof createClient>,
  body: Body,
  userId: string | null,
  json: (body: unknown, status?: number) => Response,
) {
  const searchType = cleanEnum(body.search_type, SEARCH_TYPES);
  const redirectUrl = safeUrl(body.redirect_url);
  const partnerName = cleanText(body.partner_name, MAX_TEXT);
  if (!searchType || !redirectUrl || !partnerName) return json({ error: "Invalid redirect log" }, 400);

  const { data, error } = await supabase
    .from("partner_redirect_logs")
    .insert({
      session_id: cleanText(body.session_id, MAX_TEXT),
      partner_name: partnerName,
      partner_id: cleanUuid(body.partner_id),
      search_type: searchType,
      offer_id: cleanText(body.offer_id, MAX_TEXT),
      redirect_url: redirectUrl,
      checkout_mode: cleanEnum(body.checkout_mode, CHECKOUT_MODES) ?? "redirect",
      status: "pending",
      user_id: userId,
      search_params: cleanJson(body.search_params) ?? null,
      metadata: cleanJson(body.metadata) ?? null,
    })
    .select("id, session_id, partner_name, redirect_url, created_at")
    .single();

  if (error) {
    console.error("[travel-tracking-log:partner_redirect]", error.message);
    return json({ error: "Redirect log failed" }, 500);
  }

  return json({ ok: true, log: data });
}

async function logSearchSession(
  supabase: ReturnType<typeof createClient>,
  body: Body,
  authUser: { id: string; email: string | null } | null,
  userAgent: string | null,
  json: (body: unknown, status?: number) => Response,
) {
  const searchType = cleanEnum(body.search_type, SEARCH_TYPES);
  const sessionId = cleanText(body.session_id, MAX_TEXT);
  if (!searchType || !sessionId) return json({ error: "Invalid search session" }, 400);

  const { error } = await supabase
    .from("search_sessions")
    .upsert({
      session_id: sessionId,
      type: searchType,
      origin: cleanText(body.origin, 32),
      destination: cleanText(body.destination, 32),
      depart_date: cleanDate(body.depart_date),
      return_date: cleanDate(body.return_date),
      passengers: cleanInteger(body.passengers, 1, 20) ?? 1,
      rooms: cleanInteger(body.rooms, 1, 20) ?? 1,
      guests: cleanInteger(body.guests, 1, 50) ?? 1,
      cabin_class: cleanText(body.cabin_class, 64),
      search_params: cleanJson(body.search_params) ?? null,
      user_id: authUser?.id ?? null,
      user_email: authUser?.email ?? cleanEmail(body.user_email),
      device_type: cleanText(body.device_type, 32),
      user_agent: cleanText(body.user_agent ?? userAgent, 512),
    }, { onConflict: "session_id" });

  if (error) {
    console.error("[travel-tracking-log:search_session]", error.message);
    return json({ error: "Search session log failed" }, 500);
  }

  return json({ ok: true, session_id: sessionId });
}

async function logAbandonedSearch(
  supabase: ReturnType<typeof createClient>,
  body: Body,
  authUser: { id: string; email: string | null } | null,
  json: (body: unknown, status?: number) => Response,
) {
  const searchType = cleanEnum(body.search_type, ABANDONED_TYPES);
  const sessionId = cleanText(body.session_id, MAX_TEXT);
  const email = authUser?.email ?? null;
  if (!searchType || !sessionId) return json({ error: "Invalid abandoned search" }, 400);
  if (!email) return json({ ok: true, skipped: "missing_authenticated_email" });

  const { error } = await supabase
    .from("abandoned_searches")
    .insert({
      search_session_id: sessionId,
      email,
      search_type: searchType,
      search_params: cleanJson(body.search_params) ?? {},
      searched_at: new Date().toISOString(),
    });

  if (error) {
    console.error("[travel-tracking-log:abandoned_search]", error.message);
    return json({ error: "Abandoned search log failed" }, 500);
  }

  return json({ ok: true });
}

async function getAuthenticatedUser(req: Request, supabaseUrl: string, serviceKey: string): Promise<{ id: string; email: string | null } | null> {
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const authClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data } = await authClient.auth.getUser(token);
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function cleanEnum(value: unknown, allowed: Set<string>): string | null {
  const text = cleanText(value, MAX_TEXT);
  return text && allowed.has(text) ? text : null;
}

function cleanUuid(value: unknown): string | null {
  const text = cleanText(value, 64);
  return text && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text) ? text : null;
}

function cleanEmail(value: unknown): string | null {
  const text = cleanText(value, 320);
  return text && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text) ? text : null;
}

function cleanDate(value: unknown): string | null {
  const text = cleanText(value, 32);
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return null;
  const date = new Date(`${text}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? null : text;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  return value >= min && value <= max ? value : null;
}

function safeUrl(value: unknown): string | null {
  const raw = cleanText(value, MAX_URL);
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!url.hostname || /\s/.test(raw)) return null;
    return url.toString();
  } catch {
    return null;
  }
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
