/**
 * car-rental-addon-manage
 * -----------------------
 * Server-gated owner/admin CRUD for car-rental booking add-ons.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "create_many", "update", "delete"]);
const BILLING = new Set(["per_day", "per_rental"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  addon_id?: unknown;
  addon?: unknown;
  addons?: unknown;
};

serve(withSecurity("car-rental-addon-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid add-on action" }, 400);

  const addonId = cleanUuid(body.addon_id);
  const existing = action === "create" || action === "create_many" ? null : await getAddon(admin, addonId);
  const storeId = action === "create" || action === "create_many" ? cleanUuid(body.store_id) : existing?.store_id ?? null;
  if (!storeId) return json({ error: "Invalid store or add-on id" }, 400);

  if (!await canManageStore(admin, user.id, storeId)) {
    return json({ error: "Not authorized for this store" }, 403);
  }

  if (action === "delete") {
    const { error } = await admin
      .from("car_rental_addons")
      .delete()
      .eq("id", addonId)
      .eq("store_id", storeId);
    if (error) {
      console.error("[car-rental-addon-manage:delete]", error.message);
      return json({ error: "Could not delete add-on" }, 500);
    }
    return json({ ok: true, addon_id: addonId });
  }

  if (action === "create_many") {
    if (!Array.isArray(body.addons) || body.addons.length < 1 || body.addons.length > 50) {
      return json({ error: "Invalid add-on batch" }, 400);
    }
    const rows: Record<string, unknown>[] = [];
    for (const input of body.addons) {
      const addon = cleanAddon(input, "create");
      if (!addon.ok) return json({ error: addon.error }, 400);
      rows.push({ ...addon.values, store_id: storeId });
    }
    const { data, error } = await admin
      .from("car_rental_addons")
      .insert(rows)
      .select("*");
    if (error) {
      console.error("[car-rental-addon-manage:create-many]", error.message);
      return json({ error: "Could not create add-ons" }, 500);
    }
    return json({ ok: true, addons: data ?? [] });
  }

  const addon = cleanAddon(body.addon, action);
  if (!addon.ok) return json({ error: addon.error }, 400);

  if (action === "update") {
    const { data, error } = await admin
      .from("car_rental_addons")
      .update(addon.values)
      .eq("id", addonId)
      .eq("store_id", storeId)
      .select("*")
      .single();
    if (error) {
      console.error("[car-rental-addon-manage:update]", error.message);
      return json({ error: "Could not update add-on" }, 500);
    }
    return json({ ok: true, addon: data });
  }

  const { data, error } = await admin
    .from("car_rental_addons")
    .insert({ ...addon.values, store_id: storeId })
    .select("*")
    .single();
  if (error) {
    console.error("[car-rental-addon-manage:create]", error.message);
    return json({ error: "Could not create add-on" }, 500);
  }
  return json({ ok: true, addon: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[car-rental-addon-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[car-rental-addon-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getAddon(admin: any, addonId: string | null): Promise<{ store_id: string } | null> {
  if (!addonId) return null;
  const { data, error } = await admin
    .from("car_rental_addons")
    .select("store_id")
    .eq("id", addonId)
    .maybeSingle();
  if (error) {
    console.error("[car-rental-addon-manage:addon-store]", error.message);
    return null;
  }
  return data ?? null;
}

function cleanAddon(value: unknown, action: string):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Add-on payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  if ("name" in input) {
    const name = cleanText(input.name, 1, 120);
    if (!name) return { ok: false, error: "Add-on name is required" };
    values.name = name;
  }
  if ("description" in input) values.description = cleanText(input.description, 0, 500);
  if ("price_cents" in input) {
    const price = cleanInteger(input.price_cents, 0, 100000000);
    if (price === null) return { ok: false, error: "Invalid add-on price" };
    values.price_cents = price;
  }
  if ("billing" in input) {
    const billing = cleanBilling(input.billing);
    if (!billing) return { ok: false, error: "Invalid add-on billing" };
    values.billing = billing;
  }
  if ("icon" in input) values.icon = cleanText(input.icon, 0, 80);
  if ("is_active" in input) {
    if (typeof input.is_active !== "boolean") return { ok: false, error: "Invalid active status" };
    values.is_active = input.is_active;
  }
  if ("sort_order" in input) {
    const sortOrder = cleanInteger(input.sort_order, -1000000, 1000000);
    if (sortOrder === null) return { ok: false, error: "Invalid sort order" };
    values.sort_order = sortOrder;
  }

  if (action === "create") {
    for (const key of ["name", "price_cents", "billing"]) {
      if (!(key in values)) return { ok: false, error: "Missing required add-on fields" };
    }
  } else if (Object.keys(values).length === 0) {
    return { ok: false, error: "No add-on changes supplied" };
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

function cleanBilling(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const billing = value.trim().toLowerCase();
  return BILLING.has(billing) ? billing : null;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (value === null || value === undefined) return minLength === 0 ? null : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}
