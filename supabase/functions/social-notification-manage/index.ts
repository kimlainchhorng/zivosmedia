/**
 * social-notification-manage
 * --------------------------
 * Server-gated social notification creation and read-state updates.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const ACTIONS = new Set(["create", "mark_read", "mark_all_read"]);
const TYPES = new Set(["like", "comment", "reply", "share", "follow", "mention", "story_reaction"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Body = {
  action?: unknown;
  ids?: unknown;
  user_id?: unknown;
  type?: unknown;
  entity_id?: unknown;
  entity_type?: unknown;
  message?: unknown;
};

serve(withSecurity("social-notification-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid action" }, 400);

  if (action === "mark_read") {
    const ids = cleanIds(body.ids);
    if (ids.length === 0) return json({ error: "No notification ids supplied" }, 400);
    const { error } = await admin
      .from("user_notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .in("id", ids);
    if (error) {
      console.error("[social-notification-manage:mark_read]", error.message);
      return json({ error: "Could not mark notifications read" }, 500);
    }
    return json({ ok: true, count: ids.length });
  }

  if (action === "mark_all_read") {
    const { error } = await admin
      .from("user_notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    if (error) {
      console.error("[social-notification-manage:mark_all_read]", error.message);
      return json({ error: "Could not mark notifications read" }, 500);
    }
    return json({ ok: true });
  }

  const targetUserId = cleanUuid(body.user_id);
  const type = cleanEnum(body.type, TYPES);
  const message = cleanMessage(body.message);
  if (!targetUserId || !type || !message) return json({ error: "Invalid notification payload" }, 400);
  if (targetUserId === user.id) return json({ ok: true, skipped: "self" });

  const { error } = await admin.from("user_notifications").insert({
    user_id: targetUserId,
    actor_id: user.id,
    type,
    entity_id: cleanOptionalText(body.entity_id, 128),
    entity_type: cleanOptionalText(body.entity_type, 64),
    message,
  });
  if (error) {
    console.error("[social-notification-manage:create]", error.message);
    return json({ error: "Could not create notification" }, 500);
  }

  return json({ ok: true });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanIds(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((id): id is string => typeof id === "string" && UUID_RE.test(id)))].slice(0, 100);
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanEnum(value: unknown, allowed: Set<string>): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return allowed.has(text) ? text : null;
}

function cleanMessage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text && text.length <= 280 ? text : null;
}

function cleanOptionalText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text.slice(0, max) : null;
}
