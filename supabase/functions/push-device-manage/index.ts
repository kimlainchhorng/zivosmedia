/**
 * push-device-manage
 * ------------------
 * Server-gated push subscription management for account device controls.
 * Register/unregister flows already use Edge Functions; this covers revoking
 * a listed subscription by id from the push devices page.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = {
  action?: unknown;
  subscription_id?: unknown;
  endpoint?: unknown;
};

serve(withSecurity("push-device-manage", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: authData } = await admin.auth.getUser(token);
  const user = authData.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({})) as Body;
  if (body.action !== "revoke") return json({ error: "Invalid push device action" }, 400);

  const subscriptionId = cleanUuid(body.subscription_id);
  const endpoint = cleanEndpoint(body.endpoint);
  if (!subscriptionId && !endpoint) return json({ error: "Invalid push device request" }, 400);

  let query = admin.from("push_subscriptions").delete().eq("user_id", user.id);
  query = subscriptionId ? query.eq("id", subscriptionId) : query.eq("endpoint", endpoint);
  const { error } = await query;

  if (error) {
    console.error("[push-device-manage:revoke]", error.message);
    return json({ error: "Could not revoke push device" }, 500);
  }

  return json({ ok: true, action: "revoke" });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanEndpoint(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const endpoint = value.trim();
  if (!endpoint || endpoint.length > 2048) return null;
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" ? endpoint : null;
  } catch {
    return null;
  }
}
