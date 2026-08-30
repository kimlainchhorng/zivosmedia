/**
 * car-dealership-financing-manage
 * -------------------------------
 * Server-gated owner/admin CRUD for dealership financing applications.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ACTIONS = new Set(["create", "update", "delete"]);
const STATUSES = new Set(["draft", "submitted", "approved", "conditionally_approved", "declined", "funded", "cancelled"]);
const FREQUENCIES = new Set(["weekly", "biweekly", "monthly"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  financing_id?: unknown;
  financing?: unknown;
};

serve(withSecurity("car-dealership-financing-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid financing action" }, 400);

  const financingId = cleanUuid(body.financing_id);
  const existing = action === "create" ? null : await getFinancing(admin, financingId);
  const storeId = action === "create" ? cleanUuid(body.store_id) : existing?.store_id ?? null;
  if (!storeId) return json({ error: "Invalid store or financing id" }, 400);

  if (!await canManageStore(admin, user.id, storeId)) {
    return json({ error: "Not authorized for this store" }, 403);
  }

  if (action === "delete") {
    const { error } = await admin
      .from("car_dealership_financing")
      .delete()
      .eq("id", financingId)
      .eq("store_id", storeId);
    if (error) {
      console.error("[car-dealership-financing-manage:delete]", error.message);
      return json({ error: "Could not delete financing application" }, 500);
    }
    return json({ ok: true, financing_id: financingId });
  }

  const financing = cleanFinancing(body.financing, action);
  if (!financing.ok) return json({ error: financing.error }, 400);

  const relationError = await validateRelations(admin, financing.values, storeId);
  if (relationError) return json({ error: relationError }, 400);

  if (action === "update") {
    const { data, error } = await admin
      .from("car_dealership_financing")
      .update(financing.values)
      .eq("id", financingId)
      .eq("store_id", storeId)
      .select("*")
      .single();
    if (error) {
      console.error("[car-dealership-financing-manage:update]", error.message);
      return json({ error: "Could not update financing application" }, 500);
    }
    return json({ ok: true, financing: data });
  }

  const { data, error } = await admin
    .from("car_dealership_financing")
    .insert({ ...financing.values, store_id: storeId })
    .select("*")
    .single();
  if (error) {
    console.error("[car-dealership-financing-manage:create]", error.message);
    return json({ error: "Could not create financing application" }, 500);
  }
  return json({ ok: true, financing: data });
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
    console.error("[car-dealership-financing-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[car-dealership-financing-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getFinancing(admin: any, financingId: string | null): Promise<{ store_id: string } | null> {
  if (!financingId) return null;
  const { data, error } = await admin
    .from("car_dealership_financing")
    .select("store_id")
    .eq("id", financingId)
    .maybeSingle();
  if (error) {
    console.error("[car-dealership-financing-manage:financing-store]", error.message);
    return null;
  }
  return data ?? null;
}

async function validateRelations(admin: any, values: Record<string, unknown>, storeId: string): Promise<string | null> {
  const checks: Array<[string, string, string]> = [
    ["sale_id", "car_dealership_sales", "Invalid sale for this store"],
    ["customer_id", "car_dealership_customers", "Invalid customer for this store"],
  ];
  for (const [key, table, message] of checks) {
    const id = values[key];
    if (id === null || id === undefined) continue;
    const { data, error } = await admin
      .from(table)
      .select("id")
      .eq("id", id)
      .eq("store_id", storeId)
      .maybeSingle();
    if (error) {
      console.error(`[car-dealership-financing-manage:${key}]`, error.message);
      return message;
    }
    if (!data?.id) return message;
  }
  return null;
}

function cleanFinancing(value: unknown, action: string):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Financing payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  for (const key of ["sale_id", "customer_id"] as const) {
    if (key in input) {
      const id = cleanNullableUuid(input[key]);
      if (id === undefined) return { ok: false, error: `Invalid ${key}` };
      values[key] = id;
    }
  }
  for (const [key, min, max] of [
    ["lender_name", 0, 160],
    ["application_number", 0, 100],
    ["decision_notes", 0, 2000],
  ] as const) {
    if (key in input) values[key] = cleanText(input[key], min, max);
  }
  for (const [key, min, max] of [
    ["amount_financed_cents", 0, 1000000000],
    ["down_payment_cents", 0, 1000000000],
    ["monthly_payment_cents", 0, 100000000],
    ["apr_bps", 0, 100000],
    ["term_months", 1, 120],
  ] as const) {
    if (key in input) {
      const n = cleanInteger(input[key], min, max);
      if (n === null) return { ok: false, error: `Invalid ${key}` };
      values[key] = n;
    }
  }
  if ("payment_frequency" in input) {
    const frequency = cleanEnum(input.payment_frequency, FREQUENCIES);
    if (!frequency) return { ok: false, error: "Invalid payment frequency" };
    values.payment_frequency = frequency;
  }
  if ("status" in input) {
    const status = cleanEnum(input.status, STATUSES);
    if (!status) return { ok: false, error: "Invalid financing status" };
    values.status = status;
  }
  if ("first_payment_due" in input) {
    const date = cleanNullableDate(input.first_payment_due);
    if (date === undefined) return { ok: false, error: "Invalid first payment date" };
    values.first_payment_due = date;
  }
  for (const key of ["submitted_at", "decision_at", "funded_at"] as const) {
    if (key in input) {
      const iso = cleanNullableIso(input[key]);
      if (iso === undefined) return { ok: false, error: `Invalid ${key}` };
      values[key] = iso;
    }
  }

  if (action === "create") {
    for (const key of ["amount_financed_cents", "down_payment_cents", "apr_bps", "term_months", "monthly_payment_cents", "payment_frequency", "status"] as const) {
      if (!(key in values)) return { ok: false, error: "Missing required financing fields" };
    }
  } else if (Object.keys(values).length === 0) {
    return { ok: false, error: "No financing changes supplied" };
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

function cleanNullableDate(value: unknown): string | null | undefined {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string" || !DATE_RE.test(value)) return undefined;
  const time = new Date(`${value}T00:00:00Z`).getTime();
  return Number.isFinite(time) ? value : undefined;
}

function cleanNullableIso(value: unknown): string | null | undefined {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return undefined;
  return new Date(time).toISOString();
}
