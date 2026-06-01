/**
 * bug-report-submit
 * -----------------
 * Accepts support and marketplace bug reports through trusted server-side
 * ingestion so user_id, metadata shape, and URL fields cannot be forged by
 * browser Data API writes.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const MAX_DESCRIPTION = 4_000;
const MAX_TEXT = 500;
const MAX_METADATA_BYTES = 8_192;
const SEVERITIES = new Set(["low", "medium", "high", "critical"]);
const CATEGORIES = new Set(["bug", "support", "marketplace", "payment", "account", "security", "other"]);

type Body = {
  description?: unknown;
  screenshot_url?: unknown;
  page_url?: unknown;
  user_agent?: unknown;
  app_version?: unknown;
  metadata?: unknown;
  title?: unknown;
  category?: unknown;
  severity?: unknown;
};

serve(withSecurity("bug-report-submit", async (req, ctx) => {
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
    const description = cleanText(body.description, MAX_DESCRIPTION);
    if (!description || description.length < 10) {
      return json({ error: "Invalid report description" }, 400);
    }

    const payload = {
      user_id: userId,
      description,
      screenshot_url: safeUrl(body.screenshot_url),
      page_url: safeUrl(body.page_url),
      user_agent: cleanText(body.user_agent, MAX_TEXT),
      app_version: cleanText(body.app_version, 120),
      metadata: cleanMetadata(body),
    };

    const { data, error } = await admin
      .from("bug_reports")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("[bug-report-submit]", error.message);
      return json({ error: "Bug report submission failed" }, 500);
    }

    return json({ ok: true, id: data?.id ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    console.error("[bug-report-submit]", message);
    return json({ error: message }, 400);
  }
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
  const text = cleanText(value, 120)?.toLowerCase();
  return text && allowed.has(text) ? text : null;
}

function safeUrl(value: unknown): string | null {
  const text = cleanText(value, 2_000);
  if (!text) return null;
  try {
    const url = new URL(text);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function cleanMetadata(body: Body): Record<string, unknown> | null {
  const metadata: Record<string, unknown> = {};
  if (isRecord(body.metadata)) {
    for (const [key, value] of Object.entries(body.metadata)) {
      if (/^[a-zA-Z0-9_.-]{1,80}$/.test(key) && isSafeJsonValue(value)) {
        metadata[key] = value;
      }
    }
  }

  const title = cleanText(body.title, 180);
  const category = cleanEnum(body.category, CATEGORIES);
  const severity = cleanEnum(body.severity, SEVERITIES);
  if (title) metadata.title = title;
  if (category) metadata.category = category;
  if (severity) metadata.severity = severity;

  return JSON.stringify(metadata).length <= MAX_METADATA_BYTES && Object.keys(metadata).length > 0 ? metadata : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isSafeJsonValue(value: unknown): boolean {
  if (value == null || typeof value === "boolean" || typeof value === "number") return true;
  if (typeof value === "string") return value.length <= 2_000;
  if (Array.isArray(value)) return value.length <= 25 && value.every(isSafeJsonValue);
  if (isRecord(value)) {
    return Object.keys(value).length <= 25 && Object.values(value).every(isSafeJsonValue);
  }
  return false;
}
