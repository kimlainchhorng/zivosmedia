/**
 * car-dealership-expense-manage
 * -----------------------------
 * Server-gated owner/admin CRUD for dealership expense records.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ACTIONS = new Set(["create", "update", "delete"]);
const CATEGORIES = new Set([
  "acquisition",
  "reconditioning",
  "detailing",
  "transport",
  "parts",
  "advertising",
  "rent",
  "utilities",
  "insurance",
  "payroll",
  "licensing",
  "general",
]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  expense_id?: unknown;
  expense?: unknown;
};

serve(withSecurity("car-dealership-expense-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid expense action" }, 400);

  const expenseId = cleanUuid(body.expense_id);
  const existing = action === "create" ? null : await getExpense(admin, expenseId);
  const storeId = action === "create" ? cleanUuid(body.store_id) : existing?.store_id ?? null;
  if (!storeId) return json({ error: "Invalid store or expense id" }, 400);

  if (!await canManageStore(admin, user.id, storeId)) {
    return json({ error: "Not authorized for this store" }, 403);
  }

  if (action === "delete") {
    const { error } = await admin
      .from("car_dealership_expenses")
      .delete()
      .eq("id", expenseId)
      .eq("store_id", storeId);
    if (error) {
      console.error("[car-dealership-expense-manage:delete]", error.message);
      return json({ error: "Could not delete expense" }, 500);
    }
    return json({ ok: true, expense_id: expenseId });
  }

  const expense = cleanExpense(body.expense, action);
  if (!expense.ok) return json({ error: expense.error }, 400);

  if ("vehicle_id" in expense.values && expense.values.vehicle_id !== null) {
    const belongs = await vehicleBelongsToStore(admin, expense.values.vehicle_id as string, storeId);
    if (!belongs) return json({ error: "Invalid vehicle for this store" }, 400);
  }

  if (action === "update") {
    const { data, error } = await admin
      .from("car_dealership_expenses")
      .update(expense.values)
      .eq("id", expenseId)
      .eq("store_id", storeId)
      .select("*")
      .single();
    if (error) {
      console.error("[car-dealership-expense-manage:update]", error.message);
      return json({ error: "Could not update expense" }, 500);
    }
    return json({ ok: true, expense: data });
  }

  const { data, error } = await admin
    .from("car_dealership_expenses")
    .insert({ ...expense.values, store_id: storeId })
    .select("*")
    .single();
  if (error) {
    console.error("[car-dealership-expense-manage:create]", error.message);
    return json({ error: "Could not create expense" }, 500);
  }
  return json({ ok: true, expense: data });
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
    console.error("[car-dealership-expense-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[car-dealership-expense-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getExpense(admin: any, expenseId: string | null): Promise<{ store_id: string } | null> {
  if (!expenseId) return null;
  const { data, error } = await admin
    .from("car_dealership_expenses")
    .select("store_id")
    .eq("id", expenseId)
    .maybeSingle();
  if (error) {
    console.error("[car-dealership-expense-manage:expense-store]", error.message);
    return null;
  }
  return data ?? null;
}

async function vehicleBelongsToStore(admin: any, vehicleId: string, storeId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("car_dealership_vehicles")
    .select("id")
    .eq("id", vehicleId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error("[car-dealership-expense-manage:vehicle]", error.message);
    return false;
  }
  return Boolean(data?.id);
}

function cleanExpense(value: unknown, action: string):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Expense payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  if ("vehicle_id" in input) {
    const vehicleId = cleanNullableUuid(input.vehicle_id);
    if (vehicleId === undefined) return { ok: false, error: "Invalid vehicle id" };
    values.vehicle_id = vehicleId;
  }
  if ("category" in input) {
    const category = cleanEnum(input.category, CATEGORIES);
    if (!category) return { ok: false, error: "Invalid expense category" };
    values.category = category;
  }
  if ("description" in input) {
    const description = cleanText(input.description, 1, 300);
    if (!description) return { ok: false, error: "Expense description is required" };
    values.description = description;
  }
  if ("amount_cents" in input) {
    const amount = cleanInteger(input.amount_cents, 0, 100000000);
    if (amount === null) return { ok: false, error: "Invalid expense amount" };
    values.amount_cents = amount;
  }
  if ("vendor" in input) values.vendor = cleanText(input.vendor, 0, 160);
  if ("paid_at" in input) {
    const date = cleanDate(input.paid_at);
    if (!date) return { ok: false, error: "Invalid paid date" };
    values.paid_at = date;
  }
  if ("receipt_url" in input) {
    const url = cleanNullableUrl(input.receipt_url);
    if (url === undefined) return { ok: false, error: "Invalid receipt URL" };
    values.receipt_url = url;
  }
  if ("notes" in input) values.notes = cleanText(input.notes, 0, 1000);

  if (action === "create") {
    for (const key of ["category", "description", "amount_cents", "paid_at"] as const) {
      if (!(key in values)) return { ok: false, error: "Missing required expense fields" };
    }
  } else if (Object.keys(values).length === 0) {
    return { ok: false, error: "No expense changes supplied" };
  }
  return { ok: true, values };
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
}

function cleanUuid(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value.trim()) ? value.trim() : null;
}

function cleanNullableUuid(value: unknown): string | null | undefined {
  if (value === null || value === "" || value === undefined) return null;
  return cleanUuid(value) ?? undefined;
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

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

function cleanDate(value: unknown): string | null {
  if (typeof value !== "string" || !DATE_RE.test(value)) return null;
  const time = new Date(`${value}T00:00:00Z`).getTime();
  return Number.isFinite(time) ? value : null;
}

function cleanNullableUrl(value: unknown): string | null | undefined {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const url = value.trim();
  return /^https?:\/\//i.test(url) && url.length <= 1000 ? url : undefined;
}
