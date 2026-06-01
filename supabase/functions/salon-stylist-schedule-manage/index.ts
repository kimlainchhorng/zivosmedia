/**
 * salon-stylist-schedule-manage
 * -----------------------------
 * Owner/admin mutation gate for stylist weekly working hours.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const ACTIONS = new Set(["upsert"]);
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

type Body = {
  action?: unknown;
  store_id?: unknown;
  stylist_id?: unknown;
  schedules?: unknown;
};

serve(withSecurity("salon-stylist-schedule-manage", async (req, ctx) => {
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

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;
  const { data: authData } = await admin.auth.getUser(token);
  const user = authData.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({})) as Body;
  const action = cleanAction(body.action);
  if (!action) return json({ error: "Invalid schedule action" }, 400);

  const storeId = cleanUuid(body.store_id);
  const stylistId = cleanUuid(body.stylist_id);
  if (!storeId) return json({ error: "Invalid store id" }, 400);
  if (!stylistId) return json({ error: "Invalid stylist id" }, 400);
  if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);
  if (!await stylistBelongsToStore(admin, stylistId, storeId)) return json({ error: "Stylist does not belong to this store" }, 400);

  const schedules = cleanSchedules(body.schedules, storeId, stylistId);
  if (!schedules.ok) return json({ error: schedules.error }, 400);

  const { data, error } = await admin
    .from("salon_stylist_schedules")
    .upsert(schedules.rows, { onConflict: "stylist_id,day_of_week" })
    .select("*");
  if (error) {
    console.error("[salon-stylist-schedule-manage:upsert]", error.message);
    return json({ error: "Could not save schedule" }, 500);
  }
  return json({ ok: true, schedules: data ?? [] });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-stylist-schedule-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-stylist-schedule-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function stylistBelongsToStore(admin: any, stylistId: string, storeId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("salon_stylists")
    .select("id")
    .eq("id", stylistId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error("[salon-stylist-schedule-manage:stylist]", error.message);
    return false;
  }
  return Boolean(data?.id);
}

function cleanSchedules(value: unknown, storeId: string, stylistId: string):
  | { ok: true; rows: Array<Record<string, string | number | boolean | null>> }
  | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length === 0 || value.length > 7) {
    return { ok: false, error: "Schedule rows are required" };
  }
  const seen = new Set<number>();
  const rows: Array<Record<string, string | number | boolean | null>> = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, error: "Invalid schedule row" };
    }
    const input = item as Record<string, unknown>;
    const day = cleanInteger(input.day_of_week, 0, 6);
    if (day === null || seen.has(day)) return { ok: false, error: "Invalid schedule day" };
    seen.add(day);

    const isWorking = typeof input.is_working === "boolean" ? input.is_working : false;
    const startTime = isWorking ? cleanTime(input.start_time) : null;
    const endTime = isWorking ? cleanTime(input.end_time) : null;
    if (isWorking && (!startTime || !endTime)) return { ok: false, error: "Working days need start and end times" };
    if (startTime && endTime && endTime <= startTime) return { ok: false, error: "End time must be after start time" };

    rows.push({
      store_id: storeId,
      stylist_id: stylistId,
      day_of_week: day,
      is_working: isWorking,
      start_time: startTime,
      end_time: endTime,
    });
  }
  return { ok: true, rows };
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

function cleanTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const time = value.trim();
  if (!TIME_RE.test(time)) return null;
  return time.length === 5 ? `${time}:00` : time;
}
