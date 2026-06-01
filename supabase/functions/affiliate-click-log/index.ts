/**
 * affiliate-click-log
 * -------------------
 * Records affiliate click telemetry server-side so the exposed
 * affiliate_click_logs table does not need a public INSERT policy.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const MAX_TEXT = 160;
const MAX_URL = 2048;

type ClickLogBody = {
  session_id?: unknown;
  partner_id?: unknown;
  partner_name?: unknown;
  product?: unknown;
  page_source?: unknown;
  subid?: unknown;
  subid_components?: unknown;
  utm_source?: unknown;
  utm_medium?: unknown;
  utm_campaign?: unknown;
  utm_content?: unknown;
  utm_term?: unknown;
  creator?: unknown;
  destination_url?: unknown;
  final_url?: unknown;
  device_type?: unknown;
  user_agent?: unknown;
  referrer?: unknown;
};

serve(withSecurity("affiliate-click-log", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json().catch(() => ({})) as ClickLogBody;
    const destinationUrl = safeUrl(body.destination_url);
    const finalUrl = safeUrl(body.final_url);

    if (!destinationUrl || !finalUrl) {
      return json({ error: "Invalid affiliate URL" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const userId = await getAuthenticatedUserId(req, supabaseUrl, serviceKey);
    const payload = {
      session_id: cleanText(body.session_id, MAX_TEXT) ?? crypto.randomUUID(),
      user_id: userId,
      partner_id: cleanText(body.partner_id, MAX_TEXT) ?? "unknown",
      partner_name: cleanText(body.partner_name, MAX_TEXT) ?? "unknown",
      product: cleanText(body.product, MAX_TEXT) ?? "unknown",
      page_source: cleanText(body.page_source, MAX_TEXT) ?? "unknown",
      subid: cleanText(body.subid, MAX_TEXT) ?? cleanText(body.session_id, MAX_TEXT) ?? crypto.randomUUID(),
      subid_components: isPlainObject(body.subid_components) ? body.subid_components : null,
      utm_source: cleanText(body.utm_source, MAX_TEXT) ?? "zivo",
      utm_medium: cleanText(body.utm_medium, MAX_TEXT) ?? "affiliate",
      utm_campaign: cleanText(body.utm_campaign, MAX_TEXT) ?? "tracking",
      utm_content: cleanText(body.utm_content, MAX_TEXT),
      utm_term: cleanText(body.utm_term, MAX_TEXT),
      creator: cleanText(body.creator, MAX_TEXT),
      destination_url: destinationUrl,
      final_url: finalUrl,
      device_type: cleanText(body.device_type, 32),
      user_agent: cleanText(body.user_agent ?? ctx.userAgent, 512),
      referrer: cleanText(body.referrer, MAX_URL),
    };

    const { data, error } = await supabase
      .from("affiliate_click_logs")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("[affiliate-click-log]", error.message);
      return json({ error: "Click log failed" }, 500);
    }

    return json({ ok: true, id: data?.id ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    console.error("[affiliate-click-log]", message);
    return json({ error: message }, 400);
  }
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function getAuthenticatedUserId(req: Request, supabaseUrl: string, serviceKey: string): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  const token = authHeader?.match(/^Bearer\s+(.+)$/i)?.[1];
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
