/**
 * travel-support-submit
 * ---------------------
 * Records travel/staff support queue entries server-side so request categories,
 * optional user binding, and JSON payload shape are trusted.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const MAX_TEXT = 240;
const MAX_MESSAGE = 6_000;
const CATEGORIES = new Set(["time_off_request", "shift_swap_request", "flight_companion"]);

type Body = {
  category?: unknown;
  subject?: unknown;
  message?: unknown;
  payload?: unknown;
  user_agent?: unknown;
};

serve(withSecurity("travel-support-submit", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const userId = await getAuthenticatedUserId(req, supabaseUrl, serviceKey);

  const body = await req.json().catch(() => ({})) as Body;
  const category = cleanEnum(body.category, CATEGORIES);
  const message = cleanMessage(body.message, body.payload);
  if (!category || !message) return json({ error: "Invalid travel support request" }, 400);

  const { data, error } = await admin
    .from("feedback_submissions")
    .insert({
      user_id: userId,
      category,
      subject: cleanText(body.subject, MAX_TEXT) ?? defaultSubject(category),
      message,
      device_info: cleanText(body.user_agent, MAX_TEXT),
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[travel-support-submit]", error.message);
    return json({ error: "Travel support submission failed" }, 500);
  }

  return json({ ok: true, id: data?.id ?? null });
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function getAuthenticatedUserId(req: Request, supabaseUrl: string, serviceKey: string): Promise<string | null> {
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const authClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data } = await authClient.auth.getUser(token);
  return data.user?.id ?? null;
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

function cleanMessage(message: unknown, payload: unknown): string | null {
  const text = cleanText(message, MAX_MESSAGE);
  if (text) return text;
  if (!isRecord(payload)) return null;
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    if (/^[a-zA-Z0-9_.-]{1,80}$/.test(key) && isSafeValue(value)) cleaned[key] = value;
  }
  const encoded = JSON.stringify(cleaned);
  return encoded.length <= MAX_MESSAGE && encoded !== "{}" ? encoded : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeValue(value: unknown): boolean {
  if (value == null || typeof value === "boolean" || typeof value === "number") return true;
  if (typeof value === "string") return value.length <= 2_000;
  return Array.isArray(value) && value.length <= 25 && value.every((item) => typeof item === "string" && item.length <= 240);
}

function defaultSubject(category: string): string {
  switch (category) {
    case "time_off_request": return "Time off request";
    case "shift_swap_request": return "Shift swap request";
    case "flight_companion": return "Flight companion registration";
    default: return "Travel support request";
  }
}
