/**
 * notification-manage
 * -------------------
 * Server-gated user notification mutations. Notification creation still uses
 * existing sender/admin paths; this endpoint owns user read/delete/snooze.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const ACTIONS = new Set(["mark_read", "mark_all_read", "delete", "clear_in_app", "snooze"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_IDS = 100;

type Body = {
  action?: unknown;
  notification_id?: unknown;
  notification_ids?: unknown;
  snoozed_until?: unknown;
};

serve(withSecurity("notification-manage", async (req, ctx) => {
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
  const action = cleanAction(body.action);
  if (!action) return json({ error: "Invalid notification action" }, 400);

  if (action === "mark_all_read") {
    const { error } = await admin
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .or(userOwnershipFilter(user.id))
      .eq("is_read", false);
    if (error) return fail(action, error, json);
    return json({ ok: true, action });
  }

  if (action === "clear_in_app") {
    const { error } = await admin
      .from("notifications")
      .delete()
      .or(userOwnershipFilter(user.id))
      .eq("channel", "in_app");
    if (error) return fail(action, error, json);
    return json({ ok: true, action });
  }

  const ids = cleanIds(body);
  if (!ids.length) return json({ error: "Invalid notification selection" }, 400);

  if (action === "delete") {
    const { error } = await admin
      .from("notifications")
      .delete()
      .or(userOwnershipFilter(user.id))
      .in("id", ids);
    if (error) return fail(action, error, json);
    return json({ ok: true, action, count: ids.length });
  }

  if (action === "snooze") {
    const snoozedUntil = cleanDate(body.snoozed_until);
    if (!snoozedUntil) return json({ error: "Invalid notification snooze" }, 400);
    const { error } = await admin
      .from("notifications")
      .update({ snoozed_until: snoozedUntil })
      .or(userOwnershipFilter(user.id))
      .in("id", ids);
    if (error) return fail(action, error, json);
    return json({ ok: true, action, count: ids.length });
  }

  const { error } = await admin
    .from("notifications")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .or(userOwnershipFilter(user.id))
    .in("id", ids);
  if (error) return fail(action, error, json);
  return json({ ok: true, action, count: ids.length });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanAction(value: unknown): "mark_read" | "mark_all_read" | "delete" | "clear_in_app" | "snooze" | null {
  if (typeof value !== "string") return null;
  const action = value.trim();
  return ACTIONS.has(action) ? action as "mark_read" | "mark_all_read" | "delete" | "clear_in_app" | "snooze" : null;
}

function cleanIds(body: Body): string[] {
  const raw = Array.isArray(body.notification_ids) ? body.notification_ids : [body.notification_id];
  return [...new Set(raw.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter((value) => UUID_RE.test(value)))].slice(0, MAX_IDS);
}

function cleanDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value.trim());
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function userOwnershipFilter(userId: string) {
  return `user_id.eq.${userId},to_value.eq.${userId}`;
}

function fail(action: string, error: { message?: string }, json: (body: unknown, status?: number) => Response) {
  console.error(`[notification-manage:${action}]`, error.message);
  return json({ error: "Could not update notification" }, 500);
}
