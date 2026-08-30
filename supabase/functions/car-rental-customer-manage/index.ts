/**
 * car-rental-customer-manage
 * --------------------------
 * Server-gated owner/admin CRUD for car-rental renter records.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACTIONS = new Set(["create", "update", "delete"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  customer_id?: unknown;
  customer?: unknown;
};

serve(withSecurity("car-rental-customer-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid renter action" }, 400);

  const customerId = cleanUuid(body.customer_id);
  const existing = action === "create" ? null : await getCustomer(admin, customerId);
  const storeId = action === "create" ? cleanUuid(body.store_id) : existing?.store_id ?? null;
  if (!storeId) return json({ error: "Invalid store or renter id" }, 400);

  if (!await canManageStore(admin, user.id, storeId)) {
    return json({ error: "Not authorized for this store" }, 403);
  }

  if (action === "delete") {
    const { error } = await admin
      .from("car_rental_customers")
      .delete()
      .eq("id", customerId)
      .eq("store_id", storeId);
    if (error) {
      console.error("[car-rental-customer-manage:delete]", error.message);
      return json({ error: "Could not delete renter" }, 500);
    }
    return json({ ok: true, customer_id: customerId });
  }

  const customer = cleanCustomer(body.customer, action);
  if (!customer.ok) return json({ error: customer.error }, 400);

  if (action === "update") {
    const { data, error } = await admin
      .from("car_rental_customers")
      .update(customer.values)
      .eq("id", customerId)
      .eq("store_id", storeId)
      .select("*")
      .single();
    if (error) {
      console.error("[car-rental-customer-manage:update]", error.message);
      return json({ error: "Could not update renter" }, 500);
    }
    return json({ ok: true, customer: data });
  }

  const { data, error } = await admin
    .from("car_rental_customers")
    .insert({ ...customer.values, store_id: storeId })
    .select("*")
    .single();
  if (error) {
    console.error("[car-rental-customer-manage:create]", error.message);
    return json({ error: "Could not create renter" }, 500);
  }
  return json({ ok: true, customer: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[car-rental-customer-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[car-rental-customer-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getCustomer(admin: any, customerId: string | null): Promise<{ store_id: string } | null> {
  if (!customerId) return null;
  const { data, error } = await admin
    .from("car_rental_customers")
    .select("store_id")
    .eq("id", customerId)
    .maybeSingle();
  if (error) {
    console.error("[car-rental-customer-manage:customer-store]", error.message);
    return null;
  }
  return data ?? null;
}

function cleanCustomer(value: unknown, action: string):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Renter payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  if ("display_name" in input) {
    const displayName = cleanText(input.display_name, 1, 120);
    if (!displayName) return { ok: false, error: "Renter name is required" };
    values.display_name = displayName;
  }
  if ("email" in input) {
    const email = cleanEmail(input.email);
    if (email === undefined) return { ok: false, error: "Invalid renter email" };
    values.email = email;
  }
  for (const [key, maxLength] of [
    ["phone", 60],
    ["driver_license_number", 120],
    ["driver_license_state", 80],
    ["driver_license_country", 120],
    ["driver_license_photo_url", 2000],
    ["driver_license_photo_back_url", 2000],
    ["address", 500],
    ["city", 120],
    ["state", 120],
    ["postal_code", 40],
    ["country", 120],
    ["notes", 1000],
  ] as const) {
    if (key in input) values[key] = cleanText(input[key], 0, maxLength);
  }
  for (const key of ["date_of_birth", "driver_license_expiry"] as const) {
    if (key in input) {
      const date = cleanNullableDate(input[key]);
      if (date === undefined) return { ok: false, error: `Invalid ${key}` };
      values[key] = date;
    }
  }
  if ("tags" in input) {
    const tags = cleanTags(input.tags);
    if (!tags) return { ok: false, error: "Invalid renter tags" };
    values.tags = tags;
  }
  if ("is_blocked" in input) {
    if (typeof input.is_blocked !== "boolean") return { ok: false, error: "Invalid block status" };
    values.is_blocked = input.is_blocked;
  }

  if (action === "create") {
    if (!("display_name" in values)) return { ok: false, error: "Renter name is required" };
  } else if (Object.keys(values).length === 0) {
    return { ok: false, error: "No renter changes supplied" };
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

function cleanEmail(value: unknown): string | null | undefined {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const email = value.trim().toLowerCase();
  return email.length <= 254 && EMAIL_RE.test(email) ? email : undefined;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (value === null || value === undefined) return minLength === 0 ? null : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanTags(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > 30) return null;
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") return null;
    const tag = item.trim().slice(0, 40);
    if (tag) seen.add(tag);
  }
  return Array.from(seen);
}

function cleanNullableDate(value: unknown): string | null | undefined {
  if (value === null || value === "" || value === undefined) return null;
  return cleanDate(value) ?? undefined;
}

function cleanDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = value.trim();
  if (!DATE_RE.test(date)) return null;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === date ? date : null;
}
