/**
 * legal-dispute-file
 * ------------------
 * Files legal disputes server-side so complainant_id, status, and audit
 * evidence cannot be forged from the browser.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const MAX_TEXT = 240;
const MAX_DESCRIPTION = 4_000;
const DISPUTE_TYPES = new Set(["refund", "chargeback", "service", "safety", "privacy", "account", "other"]);
const SERVICE_TYPES = new Set(["flights", "hotels", "cars", "rides", "eats", "move", "lodging", "marketplace", "social", "other"]);
const PARTY_TYPES = new Set(["user", "customer", "merchant", "driver", "store", "platform", "other"]);
const CURRENCIES = new Set(["USD", "KHR", "EUR", "GBP", "CAD", "AUD"]);

type Body = {
  dispute_type?: unknown;
  service_type?: unknown;
  complainant_type?: unknown;
  respondent_id?: unknown;
  respondent_type?: unknown;
  booking_id?: unknown;
  amount_disputed?: unknown;
  currency?: unknown;
  description?: unknown;
};

serve(withSecurity("legal-dispute-file", async (req, ctx) => {
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
  const user = await getAuthenticatedUser(req, supabaseUrl, serviceKey);
  if (!user) return json({ error: "Authentication required" }, 401);

  try {
    const body = await req.json().catch(() => ({})) as Body;
    const disputeType = cleanEnum(body.dispute_type, DISPUTE_TYPES);
    const serviceType = cleanEnum(body.service_type, SERVICE_TYPES);
    const description = cleanText(body.description, MAX_DESCRIPTION);
    if (!disputeType || !serviceType || !description) {
      return json({ error: "Invalid dispute" }, 400);
    }

    const payload = {
      dispute_type: disputeType,
      service_type: serviceType,
      complainant_id: user.id,
      complainant_type: cleanEnum(body.complainant_type, PARTY_TYPES) ?? "user",
      respondent_id: cleanUuid(body.respondent_id),
      respondent_type: cleanEnum(body.respondent_type, PARTY_TYPES),
      booking_id: cleanText(body.booking_id, MAX_TEXT),
      amount_disputed: cleanMoney(body.amount_disputed),
      currency: cleanEnum(body.currency, CURRENCIES) ?? "USD",
      description,
      status: "open",
    };

    const { data, error } = await admin
      .from("legal_disputes")
      .insert(payload)
      .select("id")
      .single();

    if (error) {
      console.error("[legal-dispute-file]", error.message);
      return json({ error: "Dispute filing failed" }, 500);
    }

    await admin.from("legal_audit_log").insert({
      action_type: "legal_dispute_filed",
      actor_id: user.id,
      actor_type: "user",
      target_type: "legal_disputes",
      target_id: data?.id ?? null,
      description: "legal_dispute_filed",
      metadata: {
        dispute_type: disputeType,
        service_type: serviceType,
        booking_id: payload.booking_id,
      },
    });

    return json({ ok: true, id: data?.id ?? null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    console.error("[legal-dispute-file]", message);
    return json({ error: message }, 400);
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function getAuthenticatedUser(req: Request, supabaseUrl: string, serviceKey: string): Promise<{ id: string } | null> {
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return null;

  const authClient = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data } = await authClient.auth.getUser(token);
  return data.user ? { id: data.user.id } : null;
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

function cleanMoney(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > 1_000_000) return null;
  return Math.round(value * 100) / 100;
}
