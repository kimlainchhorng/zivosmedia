/**
 * salon-expense-manage
 * --------------------
 * Server-gated owner/admin CRUD for salon expense records.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ACTIONS = new Set(["create", "update", "delete"]);
const RECURRENCES = new Set(["weekly", "monthly", "quarterly", "yearly"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  expense_id?: unknown;
  expense?: unknown;
};

serve(withSecurity("salon-expense-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid expense action" }, 400);

  const expenseId = cleanUuid(body.expense_id);
  const existing = action === "create" ? null : await getExpense(admin, expenseId);
  const storeId = action === "create" ? cleanUuid(body.store_id) : existing?.store_id ?? null;
  if (!storeId) return json({ error: "Invalid store or expense id" }, 400);
  if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "delete") {
    const { error } = await admin
      .from("salon_expenses")
      .delete()
      .eq("id", expenseId)
      .eq("store_id", storeId);
    if (error) {
      console.error("[salon-expense-manage:delete]", error.message);
      return json({ error: "Could not delete expense" }, 500);
    }
    return json({ ok: true, expense_id: expenseId });
  }

  const expense = cleanExpense(body.expense, action);
  if (!expense.ok) return json({ error: expense.error }, 400);

  if (action === "update") {
    const { data, error } = await admin
      .from("salon_expenses")
      .update(expense.values)
      .eq("id", expenseId)
      .eq("store_id", storeId)
      .select("*")
      .single();
    if (error) {
      console.error("[salon-expense-manage:update]", error.message);
      return json({ error: "Could not update expense" }, 500);
    }
    return json({ ok: true, expense: data });
  }

  const { data, error } = await admin
    .from("salon_expenses")
    .insert({ ...expense.values, store_id: storeId, created_by_user_id: user.id })
    .select("*")
    .single();
  if (error) {
    console.error("[salon-expense-manage:create]", error.message);
    return json({ error: "Could not create expense" }, 500);
  }
  return json({ ok: true, expense: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-expense-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-expense-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getExpense(admin: any, expenseId: string | null): Promise<{ store_id: string } | null> {
  if (!expenseId) return null;
  const { data, error } = await admin
    .from("salon_expenses")
    .select("store_id")
    .eq("id", expenseId)
    .maybeSingle();
  if (error) {
    console.error("[salon-expense-manage:expense-store]", error.message);
    return null;
  }
  return data ?? null;
}

function cleanExpense(value: unknown, action: string):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Expense payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  if ("expense_date" in input) {
    const date = cleanDate(input.expense_date);
    if (!date) return { ok: false, error: "Invalid expense date" };
    values.expense_date = date;
  }
  if ("amount_cents" in input) {
    const amount = cleanInteger(input.amount_cents, 1, 100_000_000);
    if (amount === null) return { ok: false, error: "Invalid expense amount" };
    values.amount_cents = amount;
  }
  if ("category" in input) {
    const category = cleanText(input.category, 1, 40);
    if (!category) return { ok: false, error: "Invalid expense category" };
    values.category = category;
  }
  if ("vendor" in input) values.vendor = cleanNullableText(input.vendor, 80);
  if ("description" in input) {
    const description = cleanText(input.description, 1, 200);
    if (!description) return { ok: false, error: "Expense description is required" };
    values.description = description;
  }
  if ("notes" in input) values.notes = cleanNullableText(input.notes, 1000);
  if ("is_recurring" in input) {
    if (typeof input.is_recurring !== "boolean") return { ok: false, error: "Invalid recurring status" };
    values.is_recurring = input.is_recurring;
  }
  if ("recurrence" in input) {
    const recurrence = cleanRecurrence(input.recurrence);
    if (recurrence === undefined) return { ok: false, error: "Invalid recurrence" };
    values.recurrence = recurrence;
  }
  if (values.is_recurring === false) values.recurrence = null;
  if (values.is_recurring === true && !values.recurrence) return { ok: false, error: "Recurring expenses need a frequency" };

  if (action === "create") {
    for (const key of ["expense_date", "amount_cents", "category", "description"]) {
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
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanNullableText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > maxLength ? null : text || null;
}

function cleanRecurrence(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const recurrence = value.trim().toLowerCase();
  return RECURRENCES.has(recurrence) ? recurrence : undefined;
}

function cleanDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = value.trim();
  if (!DATE_RE.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === date ? date : null;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}
