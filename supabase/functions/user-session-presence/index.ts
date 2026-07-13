/**
 * user-session-presence
 * ---------------------
 * Server-gated heartbeat and revoke actions for the legacy user_sessions
 * surface used by chat/privacy settings.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const ACTIONS = new Set(["heartbeat", "revoke", "revoke_all_others"]);

type Body = Record<string, unknown>;

serve(withSecurity("user-session-presence", async (req, ctx) => {
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
  const action = cleanEnum(body.action, ACTIONS);
  if (!action) return json({ error: "Invalid session action" }, 400);

  if (action === "heartbeat") {
    const result = await heartbeat(admin, user.id, body);
    return json(result.body, result.status);
  }

  if (action === "revoke") {
    const sessionId = cleanUuid(body.session_id);
    if (!sessionId) return json({ error: "Invalid session" }, 400);
    const { error } = await admin
      .from("user_sessions")
      .update({ is_active: false })
      .eq("id", sessionId)
      .eq("user_id", user.id);
    await recordAlert(admin, user.id, "session_revoked", { session_id: sessionId });
    return done(error);
  }

  const currentSessionId = cleanUuid(body.current_session_id);
  let query = admin
    .from("user_sessions")
    .update({ is_active: false })
    .eq("user_id", user.id)
    .eq("is_active", true);
  if (currentSessionId) query = query.neq("id", currentSessionId);
  const { error } = await query;
  await recordAlert(admin, user.id, "session_revoked", { all_others: true });
  return done(error);
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function heartbeat(admin: any, userId: string, body: Body) {
  const now = new Date().toISOString();
  const existingId = cleanUuid(body.session_id);
  if (existingId) {
    const { data, error } = await admin
      .from("user_sessions")
      .update({ last_active_at: now, is_active: true })
      .eq("id", existingId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (!error && data?.id) return { status: 200, body: { ok: true, session_id: data.id } };
  }

  const { data, error } = await admin
    .from("user_sessions")
    .insert({
      user_id: userId,
      is_active: true,
      last_active_at: now,
      device_info: cleanText(body.device_info, 180),
      device_type: cleanText(body.device_type, 60),
      os: cleanText(body.os, 80),
      browser: cleanText(body.browser, 80),
    })
    .select("id")
    .single();

  if (error) return done(error);
  await recordAlert(admin, userId, "login", {
    device_name: cleanText(body.device_info, 180),
    platform: cleanText(body.device_type, 60),
    user_agent: cleanText(body.user_agent, 600),
  });
  return { status: 200, body: { ok: true, session_id: data?.id ?? null } };
}

async function recordAlert(admin: any, userId: string, event: string, metadata: Record<string, unknown>) {
  await admin.from("login_alerts").insert({
    user_id: userId,
    event,
    device_name: typeof metadata.device_name === "string" ? metadata.device_name : null,
    platform: typeof metadata.platform === "string" ? metadata.platform : null,
    user_agent: typeof metadata.user_agent === "string" ? metadata.user_agent : null,
    metadata,
  });
}

function done(error: any) {
  if (error) {
    console.error("[user-session-presence]", error.message);
    return { status: 500, body: { error: "Session update failed" } };
  }
  return { status: 200, body: { ok: true } };
}

function cleanEnum(value: unknown, allowed: Set<string>): string | null {
  const text = cleanText(value, 80);
  return text && allowed.has(text) ? text : null;
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, maxLength) : null;
}

function cleanUuid(value: unknown): string | null {
  const text = cleanText(value, 80);
  if (!text) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(text)
    ? text
    : null;
}
