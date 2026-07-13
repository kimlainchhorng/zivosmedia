/**
 * marketing-interest-submit
 * -------------------------
 * Captures public newsletter, deals, waitlist, and B2B lead interest through a
 * validated server-side path instead of direct feedback_submissions inserts.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const MAX_TEXT = 240;
const MAX_MESSAGE = 4_000;
const CATEGORIES = new Set([
  "newsletter_signup",
  "deals_alert_signup",
  "api_waitlist",
  "corporate_lead",
  "business_inquiry",
]);

type Body = {
  category?: unknown;
  email?: unknown;
  subject?: unknown;
  message?: unknown;
  company?: unknown;
  context?: unknown;
  user_agent?: unknown;
};

serve(withSecurity("marketing-interest-submit", async (req, ctx) => {
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
  const email = cleanEmail(body.email);
  if (!category || !email) return json({ error: "Invalid marketing interest" }, 400);

  const message = JSON.stringify({
    email,
    company: cleanText(body.company, MAX_TEXT),
    context: cleanText(body.context, MAX_TEXT),
    message: cleanText(body.message, MAX_MESSAGE),
    submitted_at: new Date().toISOString(),
  });

  const { data, error } = await admin
    .from("feedback_submissions")
    .insert({
      user_id: userId,
      category,
      subject: cleanText(body.subject, MAX_TEXT) ?? defaultSubject(category),
      message,
      device_info: cleanText(body.user_agent, MAX_TEXT),
      status: "new",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[marketing-interest-submit]", error.message);
    return json({ error: "Marketing interest submission failed" }, 500);
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

function defaultSubject(category: string): string {
  switch (category) {
    case "newsletter_signup": return "Newsletter signup";
    case "deals_alert_signup": return "Deals alert signup";
    case "api_waitlist": return "API Partner Waitlist";
    case "corporate_lead": return "Corporate Travel Inquiry";
    case "business_inquiry": return "Business Inquiry";
    default: return "Marketing interest";
  }
}
