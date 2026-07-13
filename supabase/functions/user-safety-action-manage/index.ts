/**
 * user-safety-action-manage
 * -------------------------
 * Server-gated mute/block action writes for the legacy user_safety_actions
 * table. Social report intake can still use service-role writes; browsers
 * must come through this endpoint.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const ACTIONS = new Set(["mute", "block"]);
const OPERATIONS = new Set(["add", "remove"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = {
  operation?: unknown;
  action?: unknown;
  safety_action_id?: unknown;
  target_user_id?: unknown;
};

serve(withSecurity("user-safety-action-manage", async (req, ctx) => {
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
  const operation = cleanOperation(body.operation);
  if (!operation) return json({ error: "Invalid safety action request" }, 400);

  if (operation === "remove") {
    const safetyActionId = cleanUuid(body.safety_action_id);
    const targetUserId = cleanUuid(body.target_user_id);
    const action = cleanAction(body.action);
    if (!safetyActionId && (!targetUserId || !action)) {
      return json({ error: "Invalid safety action request" }, 400);
    }

    let query = admin.from("user_safety_actions").delete().eq("user_id", user.id);
    query = safetyActionId ? query.eq("id", safetyActionId) : query.eq("target_user_id", targetUserId).eq("action", action);
    const { error } = await query;
    if (error) {
      console.error("[user-safety-action-manage:remove]", error.message);
      return json({ error: "Could not update safety action" }, 500);
    }
    return json({ ok: true, operation });
  }

  const targetUserId = cleanUuid(body.target_user_id);
  const action = cleanAction(body.action);
  if (!targetUserId || targetUserId === user.id || !action) {
    return json({ error: "Invalid safety action request" }, 400);
  }

  const { error } = await admin
    .from("user_safety_actions")
    .upsert({ user_id: user.id, target_user_id: targetUserId, action }, { onConflict: "user_id,target_user_id,action" });

  if (error) {
    console.error("[user-safety-action-manage:add]", error.message);
    return json({ error: "Could not update safety action" }, 500);
  }

  return json({ ok: true, operation, action, target_user_id: targetUserId });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanOperation(value: unknown): "add" | "remove" | null {
  if (typeof value !== "string") return null;
  const operation = value.trim();
  return OPERATIONS.has(operation) ? operation as "add" | "remove" : null;
}

function cleanAction(value: unknown): "mute" | "block" | null {
  if (typeof value !== "string") return null;
  const action = value.trim();
  return ACTIONS.has(action) ? action as "mute" | "block" : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}
