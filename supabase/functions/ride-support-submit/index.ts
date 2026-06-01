/**
 * ride-support-submit
 * -------------------
 * Records ride-adjacent support events server-side: ratings, lost items, and
 * airport transfer requests. This keeps user binding and payload shape trusted.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const MAX_TEXT = 240;
const MAX_MESSAGE = 4_000;
const CATEGORIES = new Set(["ride_rating", "lost_item_report", "transfer_request"]);

type Body = {
  category?: unknown;
  subject?: unknown;
  message?: unknown;
  rating?: unknown;
  metadata?: unknown;
  user_agent?: unknown;
};

serve(withSecurity("ride-support-submit", async (req, ctx) => {
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
  const message = cleanMessage(body.message, body.metadata);
  if (!category || !message) return json({ error: "Invalid ride support request" }, 400);

  const { data, error } = await admin
    .from("feedback_submissions")
    .insert({
      user_id: userId,
      category,
      subject: cleanText(body.subject, MAX_TEXT) ?? defaultSubject(category),
      message,
      rating: cleanRating(body.rating),
      device_info: cleanText(body.user_agent, MAX_TEXT),
      status: category === "transfer_request" ? "pending" : "new",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[ride-support-submit]", error.message);
    return json({ error: "Ride support submission failed" }, 500);
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

function cleanRating(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rating = Math.round(value);
  return rating >= 1 && rating <= 5 ? rating : null;
}

function cleanMessage(message: unknown, metadata: unknown): string | null {
  const text = cleanText(message, MAX_MESSAGE);
  if (text) return text;
  if (isRecord(metadata)) {
    const safe = Object.fromEntries(
      Object.entries(metadata)
        .filter(([key, value]) => /^[a-zA-Z0-9_.-]{1,80}$/.test(key) && isSafeValue(value))
        .slice(0, 25),
    );
    const encoded = JSON.stringify(safe);
    return encoded.length <= MAX_MESSAGE && encoded !== "{}" ? encoded : null;
  }
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeValue(value: unknown): boolean {
  if (value == null || typeof value === "boolean" || typeof value === "number") return true;
  return typeof value === "string" && value.length <= 1_000;
}

function defaultSubject(category: string): string {
  switch (category) {
    case "ride_rating": return "Ride rating";
    case "lost_item_report": return "Lost item report";
    case "transfer_request": return "Airport transfer request";
    default: return "Ride support";
  }
}
