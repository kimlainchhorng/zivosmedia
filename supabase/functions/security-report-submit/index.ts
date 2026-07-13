/**
 * security-report-submit
 * ----------------------
 * Receives responsible-disclosure reports server-side so security_report rows
 * cannot be spoofed through direct browser inserts into feedback_submissions.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const MAX_TEXT = 240;
const MAX_LONG_TEXT = 4_000;
const SEVERITIES = new Set(["low", "medium", "high", "critical"]);

type Body = {
  name?: unknown;
  email?: unknown;
  severity?: unknown;
  title?: unknown;
  description?: unknown;
  steps?: unknown;
  impact?: unknown;
  user_agent?: unknown;
};

serve(withSecurity("security-report-submit", async (req, ctx) => {
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

  try {
    const body = await req.json().catch(() => ({})) as Body;
    const title = cleanText(body.title, MAX_TEXT);
    const description = cleanText(body.description, MAX_LONG_TEXT);
    const steps = cleanText(body.steps, MAX_LONG_TEXT);
    const impact = cleanText(body.impact, MAX_LONG_TEXT);
    const email = cleanEmail(body.email);
    const severity = cleanSeverity(body.severity);

    if (!title || !description || !steps || !impact || !email || !severity) {
      return json({ error: "Invalid security report" }, 400);
    }

    const reporter = cleanText(body.name, MAX_TEXT) ?? "Security researcher";
    const message = [
      `Severity: ${severity}`,
      `Title: ${title}`,
      `Description: ${description}`,
      `Steps: ${steps}`,
      `Impact: ${impact}`,
      `Reporter: ${reporter} <${email}>`,
    ].join("\n");

    const { data, error } = await admin
      .from("feedback_submissions")
      .insert({
        user_id: userId,
        category: "security_report",
        subject: title,
        message,
        device_info: cleanText(body.user_agent, MAX_TEXT),
        status: "new",
      })
      .select("id")
      .single();

    if (error) {
      console.error("[security-report-submit]", error.message);
      return json({ error: "Security report submission failed" }, 500);
    }

    return json({ ok: true, id: data?.id ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    console.error("[security-report-submit]", message);
    return json({ error: message }, 400);
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 90 }));

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

function cleanSeverity(value: unknown): string | null {
  const severity = cleanText(value, 40)?.toLowerCase();
  return severity && SEVERITIES.has(severity) ? severity : null;
}
