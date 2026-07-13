/**
 * legal-acceptance-record
 * -----------------------
 * Records policy consent and role terms acceptance server-side so acceptance
 * evidence cannot forge user_id or audit context from the browser.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const MAX_TEXT = 240;
const MAX_URL = 2048;
const POLICY_TYPES = new Set(["terms", "privacy", "refunds", "cancellation", "seller_of_travel", "transportation", "car_rental", "insurance", "cookies", "marketing"]);
const ROLE_TYPES = new Set(["customer", "driver", "car_owner", "fleet_owner", "restaurant_partner", "shop_owner", "creator", "merchant", "admin"]);

type Body = {
  type?: unknown;
  policy_type?: unknown;
  policy_version?: unknown;
  consent_method?: unknown;
  page_url?: unknown;
  device_type?: unknown;
  role_type?: unknown;
  terms_version?: unknown;
  role_terms_id?: unknown;
  user_agent?: unknown;
};

serve(withSecurity("legal-acceptance-record", async (req, ctx) => {
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
    switch (cleanText(body.type, 64)) {
      case "policy_consent":
        return await recordPolicyConsent(admin, body, user.id, ctx.userAgent, json);
      case "role_terms":
        return await recordRoleTerms(admin, body, user.id, ctx.userAgent, json);
      default:
        return json({ error: "Invalid acceptance type" }, 400);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    console.error("[legal-acceptance-record]", message);
    return json({ error: message }, 400);
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function recordPolicyConsent(
  admin: ReturnType<typeof createClient>,
  body: Body,
  userId: string,
  userAgent: string | null,
  json: (body: unknown, status?: number) => Response,
) {
  const policyType = cleanEnum(body.policy_type, POLICY_TYPES);
  const policyVersion = cleanText(body.policy_version, MAX_TEXT);
  if (!policyType || !policyVersion) return json({ error: "Invalid policy consent" }, 400);

  const payload = {
    user_id: userId,
    policy_type: policyType,
    policy_version: policyVersion,
    consent_given: true,
    consent_method: cleanText(body.consent_method, 64) ?? "checkbox",
    page_url: cleanText(body.page_url, MAX_URL),
    user_agent: cleanText(body.user_agent ?? userAgent, 512),
    device_type: cleanText(body.device_type, 32),
  };

  const { data, error } = await admin
    .from("user_consent_logs")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("[legal-acceptance-record:policy]", error.message);
    return json({ error: "Policy consent failed" }, 500);
  }

  await audit(admin, userId, "policy_consent_recorded", "user_consent_logs", data?.id ?? null, {
    policy_type: policyType,
    policy_version: policyVersion,
  });

  return json({ ok: true, id: data?.id ?? null });
}

async function recordRoleTerms(
  admin: ReturnType<typeof createClient>,
  body: Body,
  userId: string,
  userAgent: string | null,
  json: (body: unknown, status?: number) => Response,
) {
  const roleType = cleanEnum(body.role_type, ROLE_TYPES);
  const termsVersion = cleanText(body.terms_version, MAX_TEXT);
  if (!roleType || !termsVersion) return json({ error: "Invalid role terms acceptance" }, 400);

  const payload = {
    user_id: userId,
    role_type: roleType,
    terms_version: termsVersion,
    role_terms_id: cleanUuid(body.role_terms_id),
    user_agent: cleanText(body.user_agent ?? userAgent, 512),
  };

  const { data, error } = await admin
    .from("role_terms_acceptance")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    console.error("[legal-acceptance-record:role]", error.message);
    return json({ error: "Role terms acceptance failed" }, 500);
  }

  await audit(admin, userId, "role_terms_accepted", "role_terms_acceptance", data?.id ?? null, {
    role_type: roleType,
    terms_version: termsVersion,
  });

  return json({ ok: true, id: data?.id ?? null });
}

async function audit(
  admin: ReturnType<typeof createClient>,
  actorId: string,
  actionType: string,
  targetType: string,
  targetId: string | null,
  metadata: Record<string, unknown>,
) {
  await admin.from("legal_audit_log").insert({
    action_type: actionType,
    actor_id: actorId,
    actor_type: "user",
    target_type: targetType,
    target_id: targetId,
    description: actionType,
    metadata,
  });
}

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
