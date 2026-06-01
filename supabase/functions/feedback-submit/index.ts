/**
 * feedback-submit
 * ---------------
 * Records ordinary product feedback server-side so category, rating, optional
 * contact email, and user_id are normalized before reaching feedback_submissions.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const MAX_TEXT = 240;
const MAX_MESSAGE = 4_000;
const CATEGORIES = new Set(["general", "rating", "price_mismatch", "suggestion", "bug", "feature", "praise", "ux"]);

type Body = {
  category?: unknown;
  subject?: unknown;
  message?: unknown;
  rating?: unknown;
  email?: unknown;
  device_info?: unknown;
  app_version?: unknown;
};

serve(withSecurity("feedback-submit", async (req, ctx) => {
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
  const category = cleanEnum(body.category, CATEGORIES) ?? "general";
  const message = cleanText(body.message, MAX_MESSAGE);
  if (!message || message.length < 3) return json({ error: "Invalid feedback" }, 400);

  const email = cleanEmail(body.email);
  const normalizedMessage = email
    ? JSON.stringify({ message, email, submitted_at: new Date().toISOString() })
    : message;

  const { data, error } = await admin
    .from("feedback_submissions")
    .insert({
      user_id: userId,
      category,
      subject: cleanText(body.subject, MAX_TEXT),
      message: normalizedMessage,
      rating: cleanRating(body.rating),
      device_info: cleanText(body.device_info, MAX_TEXT),
      app_version: cleanText(body.app_version, 120),
      status: "new",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[feedback-submit]", error.message);
    return json({ error: "Feedback submission failed" }, 500);
  }

  return json({ ok: true, id: data?.id ?? null });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

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

function cleanEmail(value: unknown): string | null {
  const email = cleanText(value, 254)?.toLowerCase();
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function cleanRating(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const rating = Math.round(value);
  return rating >= 1 && rating <= 5 ? rating : null;
}
