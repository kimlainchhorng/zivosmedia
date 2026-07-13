/**
 * car-dealership-lead-activity-manage
 * -----------------------------------
 * Server-gated owner/admin create/delete for dealership lead activity logs.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "delete"]);
const ACTIVITY_TYPES = new Set(["note", "call", "email", "sms", "meeting", "test_drive", "offer_made", "status_change", "other", "system"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  lead_id?: unknown;
  activity_id?: unknown;
  activity?: unknown;
};

serve(withSecurity("car-dealership-lead-activity-manage", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;
  const { data: authData } = await admin.auth.getUser(token);
  const user = authData.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({})) as Body;
  const action = cleanAction(body.action);
  if (!action) return json({ error: "Invalid activity action" }, 400);

  const activityId = cleanUuid(body.activity_id);
  const existing = action === "create" ? null : await getActivity(admin, activityId);
  const storeId = action === "create" ? cleanUuid(body.store_id) : existing?.store_id ?? null;
  const leadId = action === "create" ? cleanUuid(body.lead_id) : existing?.lead_id ?? null;
  if (!storeId || !leadId) return json({ error: "Invalid store, lead, or activity id" }, 400);

  if (!await canManageStore(admin, user.id, storeId)) {
    return json({ error: "Not authorized for this store" }, 403);
  }
  if (!await leadBelongsToStore(admin, leadId, storeId)) {
    return json({ error: "Invalid lead for this store" }, 400);
  }

  if (action === "delete") {
    const { error } = await admin
      .from("car_dealership_lead_activities")
      .delete()
      .eq("id", activityId)
      .eq("store_id", storeId)
      .eq("lead_id", leadId);
    if (error) {
      console.error("[car-dealership-lead-activity-manage:delete]", error.message);
      return json({ error: "Could not delete activity" }, 500);
    }
    return json({ ok: true, activity_id: activityId });
  }

  const activity = cleanActivity(body.activity);
  if (!activity.ok) return json({ error: activity.error }, 400);

  const { data, error } = await admin
    .from("car_dealership_lead_activities")
    .insert({ ...activity.values, store_id: storeId, lead_id: leadId, user_id: user.id })
    .select("*")
    .single();
  if (error) {
    console.error("[car-dealership-lead-activity-manage:create]", error.message);
    return json({ error: "Could not log activity" }, 500);
  }
  return json({ ok: true, activity: data });
}, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[car-dealership-lead-activity-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[car-dealership-lead-activity-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getActivity(admin: any, activityId: string | null): Promise<{ store_id: string; lead_id: string } | null> {
  if (!activityId) return null;
  const { data, error } = await admin
    .from("car_dealership_lead_activities")
    .select("store_id, lead_id")
    .eq("id", activityId)
    .maybeSingle();
  if (error) {
    console.error("[car-dealership-lead-activity-manage:activity-store]", error.message);
    return null;
  }
  return data ?? null;
}

async function leadBelongsToStore(admin: any, leadId: string, storeId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("car_dealership_leads")
    .select("id")
    .eq("id", leadId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error("[car-dealership-lead-activity-manage:lead]", error.message);
    return false;
  }
  return Boolean(data?.id);
}

function cleanActivity(value: unknown):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Activity payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  const activityType = cleanEnum(input.activity_type, ACTIVITY_TYPES);
  if (!activityType) return { ok: false, error: "Invalid activity type" };
  values.activity_type = activityType;

  const summary = cleanText(input.summary, 1, 500);
  if (!summary) return { ok: false, error: "Activity summary is required" };
  values.summary = summary;

  values.body = cleanText(input.body, 0, 4000);
  values.outcome = cleanText(input.outcome, 0, 500);

  const occurredAt = "occurred_at" in input ? cleanNullableIso(input.occurred_at) : new Date().toISOString();
  if (occurredAt === undefined) return { ok: false, error: "Invalid activity time" };
  values.occurred_at = occurredAt ?? new Date().toISOString();

  return { ok: true, values };
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
}

function cleanUuid(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value.trim()) ? value.trim() : null;
}

function cleanEnum(value: unknown, allowed: Set<string>): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim().toLowerCase();
  return allowed.has(text) ? text : null;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (value === null || value === undefined) return minLength === 0 ? null : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length < minLength || text.length > maxLength) return null;
  return text.length ? text : null;
}

function cleanNullableIso(value: unknown): string | null | undefined {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return undefined;
  return new Date(time).toISOString();
}
