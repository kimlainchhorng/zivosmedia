/**
 * employee-shift-manage
 * ---------------------
 * Server-gated store schedule mutations for employee shifts.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "delete"]);

type Body = {
  action?: unknown;
  shift_id?: unknown;
  shift?: unknown;
};

serve(withSecurity("employee-shift-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid shift action" }, 400);

  if (action === "create") {
    const shift = cleanShift(body.shift);
    if (!shift.ok) return json({ error: shift.error }, 400);
    if (!await canManageStore(admin, user.id, shift.values.store_id as string)) {
      return json({ error: "Not authorized for this store" }, 403);
    }

    const { data: employee, error: employeeError } = await admin
      .from("store_employees")
      .select("id, store_id")
      .eq("id", shift.values.employee_id)
      .maybeSingle();
    if (employeeError) {
      console.error("[employee-shift-manage:employee]", employeeError.message);
      return json({ error: "Could not verify employee" }, 500);
    }
    if (!employee || employee.store_id !== shift.values.store_id) {
      return json({ error: "Employee does not belong to this store" }, 400);
    }

    const { data, error } = await admin
      .from("employee_shifts")
      .insert(shift.values)
      .select("id, store_id, employee_id, day_index, start_time, end_time, role, week_offset")
      .single();
    if (error) {
      console.error("[employee-shift-manage:create]", error.message);
      return json({ error: "Could not create shift" }, 500);
    }
    return json({ ok: true, shift: data });
  }

  const shiftId = cleanUuid(body.shift_id);
  if (!shiftId) return json({ error: "Invalid shift id" }, 400);

  const { data: existing, error: lookupError } = await admin
    .from("employee_shifts")
    .select("id, store_id")
    .eq("id", shiftId)
    .maybeSingle();
  if (lookupError) {
    console.error("[employee-shift-manage:lookup]", lookupError.message);
    return json({ error: "Could not verify shift" }, 500);
  }
  if (!existing) return json({ error: "Shift not found" }, 404);
  if (!await canManageStore(admin, user.id, existing.store_id)) {
    return json({ error: "Not authorized for this store" }, 403);
  }

  const { error } = await admin.from("employee_shifts").delete().eq("id", shiftId);
  if (error) {
    console.error("[employee-shift-manage:delete]", error.message);
    return json({ error: "Could not delete shift" }, 500);
  }
  return json({ ok: true, shift_id: shiftId });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[employee-shift-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[employee-shift-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

function cleanShift(value: unknown):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Shift payload is required" };
  }
  const input = value as Record<string, unknown>;
  const storeId = cleanUuid(input.store_id);
  const employeeId = cleanUuid(input.employee_id);
  const dayIndex = cleanInteger(input.day_index, 0, 6);
  const weekOffset = cleanInteger(input.week_offset, -104, 104);
  const startTime = cleanTime(input.start_time);
  const endTime = cleanTime(input.end_time);
  if (!storeId || !employeeId || dayIndex == null || weekOffset == null || !startTime || !endTime) {
    return { ok: false, error: "Invalid shift payload" };
  }
  if (startTime >= endTime) return { ok: false, error: "Shift end time must be after start time" };

  return {
    ok: true,
    values: {
      store_id: storeId,
      employee_id: employeeId,
      day_index: dayIndex,
      start_time: startTime,
      end_time: endTime,
      role: cleanText(input.role, 0, 120),
      week_offset: weekOffset,
    },
  };
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}

function cleanTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const time = value.trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(time) ? time : null;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}
