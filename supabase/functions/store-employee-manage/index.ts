/**
 * store-employee-manage
 * ---------------------
 * Server-gated store staff mutations and employee self-linking.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const ACTIONS = new Set(["save", "toggle_status", "delete", "link_self_by_email"]);
const ROLES = new Set(["owner", "manager", "supervisor", "cashier", "staff", "intern"]);
const STATUSES = new Set(["active", "inactive"]);
const PAY_TYPES = new Set(["hourly", "monthly"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  employee_id?: unknown;
  employee?: unknown;
  status?: unknown;
};

serve(withSecurity("store-employee-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid employee action" }, 400);

  if (action === "link_self_by_email") {
    const email = typeof user.email === "string" ? user.email.trim().toLowerCase() : "";
    if (!email) return json({ error: "User email is required" }, 400);
    const { data: employee, error: lookupError } = await admin
      .from("store_employees")
      .select("id, store_id, user_id, name, role, employee_number, created_at, hourly_rate, pay_type")
      .ilike("email", email)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (lookupError) {
      console.error("[store-employee-manage:link-lookup]", lookupError.message);
      return json({ error: "Could not verify employee record" }, 500);
    }
    if (!employee) return json({ error: "Employee record not found" }, 404);
    if (employee.user_id && employee.user_id !== user.id) return json({ error: "Employee record is already linked" }, 409);

    const { data, error } = await admin
      .from("store_employees")
      .update({ user_id: user.id })
      .eq("id", employee.id)
      .select("id, store_id, name, role, employee_number, created_at, hourly_rate, pay_type")
      .single();
    if (error) {
      console.error("[store-employee-manage:link]", error.message);
      return json({ error: "Could not link employee record" }, 500);
    }
    return json({ ok: true, employee: data });
  }

  const employeeId = cleanUuid(body.employee_id);
  const storeId = cleanUuid(body.store_id);

  if (action === "save") {
    const employee = cleanEmployee(body.employee);
    if (!employee.ok) return json({ error: employee.error }, 400);

    const targetStoreId = employeeId ? await getEmployeeStoreId(admin, employeeId) : storeId;
    if (!targetStoreId) return json({ error: "Invalid store or employee id" }, 400);
    if (!await canManageStore(admin, user.id, targetStoreId)) return json({ error: "Not authorized for this store" }, 403);

    if (employeeId) {
      const { data, error } = await admin
        .from("store_employees")
        .update(employee.values)
        .eq("id", employeeId)
        .select("id, store_id, name, role, status, email, phone, hourly_rate, pay_type")
        .single();
      if (error) {
        console.error("[store-employee-manage:update]", error.message);
        return json({ error: "Could not update employee" }, 500);
      }
      return json({ ok: true, employee: data });
    }

    const { data, error } = await admin
      .from("store_employees")
      .insert({ ...employee.values, store_id: targetStoreId, status: employee.values.status ?? "active" })
      .select("id, store_id, name, role, status, email, phone, hourly_rate, pay_type")
      .single();
    if (error) {
      console.error("[store-employee-manage:create]", error.message);
      return json({ error: "Could not create employee" }, 500);
    }
    return json({ ok: true, employee: data });
  }

  if (!employeeId) return json({ error: "Invalid employee id" }, 400);
  const targetStoreId = await getEmployeeStoreId(admin, employeeId);
  if (!targetStoreId) return json({ error: "Employee not found" }, 404);
  if (!await canManageStore(admin, user.id, targetStoreId)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "toggle_status") {
    const status = cleanStatus(body.status);
    if (!status) return json({ error: "Invalid status" }, 400);
    const { data, error } = await admin
      .from("store_employees")
      .update({ status })
      .eq("id", employeeId)
      .select("id, status")
      .single();
    if (error) {
      console.error("[store-employee-manage:status]", error.message);
      return json({ error: "Could not update employee status" }, 500);
    }
    return json({ ok: true, employee: data });
  }

  const { error } = await admin.from("store_employees").delete().eq("id", employeeId);
  if (error) {
    console.error("[store-employee-manage:delete]", error.message);
    return json({ error: "Could not delete employee" }, 500);
  }
  return json({ ok: true, employee_id: employeeId });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[store-employee-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[store-employee-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getEmployeeStoreId(admin: any, employeeId: string): Promise<string | null> {
  const { data, error } = await admin
    .from("store_employees")
    .select("store_id")
    .eq("id", employeeId)
    .maybeSingle();
  if (error) {
    console.error("[store-employee-manage:employee-store]", error.message);
    return null;
  }
  return data?.store_id ?? null;
}

function cleanEmployee(value: unknown):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Employee payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};
  const name = cleanText(input.name, 1, 180);
  if (!name) return { ok: false, error: "Employee name is required" };
  values.name = name;

  if ("email" in input) values.email = cleanText(input.email, 0, 320);
  if ("phone" in input) values.phone = cleanText(input.phone, 0, 80);
  if ("notes" in input) values.notes = cleanText(input.notes, 0, 4000);
  if ("assigned_truck_label" in input) values.assigned_truck_label = cleanText(input.assigned_truck_label, 0, 120);
  if ("role" in input) values.role = cleanRole(input.role);
  if ("status" in input) values.status = cleanStatus(input.status);
  if ("hourly_rate" in input) values.hourly_rate = cleanNumber(input.hourly_rate, 0, 1000000);
  if ("pay_type" in input) values.pay_type = cleanPayType(input.pay_type);
  if ("user_id" in input) {
    const userId = cleanUuid(input.user_id);
    if (userId) values.user_id = userId;
  }
  return { ok: true, values };
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

function cleanRole(value: unknown): string {
  if (typeof value !== "string") return "staff";
  const role = value.trim().toLowerCase();
  return ROLES.has(role) ? role : "staff";
}

function cleanStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const status = value.trim().toLowerCase();
  return STATUSES.has(status) ? status : null;
}

function cleanPayType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const payType = value.trim().toLowerCase();
  return PAY_TYPES.has(payType) ? payType : null;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanNumber(value: unknown, min: number, max: number): number | null {
  if (value === null || value === "" || value === undefined) return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return Math.round(number * 100) / 100;
}
