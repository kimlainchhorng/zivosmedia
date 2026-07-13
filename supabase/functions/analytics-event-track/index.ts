/**
 * analytics-event-track
 * ---------------------
 * Server-side analytics ingestion for browser events. This keeps the
 * analytics_events table closed to direct public inserts while preserving
 * lightweight fire-and-forget tracking from the frontend.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const EVENT_PATTERN = /^[a-zA-Z0-9_.:-]{1,120}$/;
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

serve(withSecurity("analytics-event-track", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({})) as AnalyticsBody;
    const eventName = cleanEventName(body.event_name);
    if (!eventName) return json({ error: "Invalid event name" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const userId = await getAuthenticatedUserId(req, supabaseUrl, serviceKey);
    const meta = cleanJson(body.meta);
    if (meta === undefined) return json({ error: "Invalid event metadata" }, 400);

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

    const { data, error } = await supabase
      .from("analytics_events")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("[analytics-event-track]", error.message);
      return json({ error: "Analytics event failed" }, 500);
    }

    return json({ ok: true, id: data?.id ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    console.error("[analytics-event-track]", message);
    return json({ error: message }, 400);
  }
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function getAuthenticatedUserId(req: Request, supabaseUrl: string, serviceKey: string): Promise<string | null> {
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const authClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data } = await authClient.auth.getUser(token);
  return data.user?.id ?? null;
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
