/**
 * service-waitlist-submit
 * -----------------------
 * Records service launch waitlist interest server-side so the submitted email
 * and service name are validated and persisted in the existing feedback queue.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const MAX_TEXT = 240;

type Body = {
  email?: unknown;
  service?: unknown;
  user_agent?: unknown;
};

serve(withSecurity("service-waitlist-submit", async (req, ctx) => {
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
  const email = cleanEmail(body.email);
  const service = cleanText(body.service, MAX_TEXT);
  if (!email || !service) return json({ error: "Invalid waitlist request" }, 400);

  const message = JSON.stringify({
    email,
    service,
    submitted_at: new Date().toISOString(),
  });

  const { data, error } = await admin
    .from("feedback_submissions")
    .insert({
      user_id: userId,
      category: "service_waitlist",
      subject: `Waitlist: ${service}`,
      message,
      device_info: cleanText(body.user_agent, MAX_TEXT),
      status: "new",
    })
    .select("id")
    .single();

  if (error) {
    console.error("[service-waitlist-submit]", error.message);
    return json({ error: "Waitlist signup failed" }, 500);
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

function cleanEmail(value: unknown): string | null {
  const email = cleanText(value, 254)?.toLowerCase();
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
