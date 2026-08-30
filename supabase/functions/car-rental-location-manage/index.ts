/**
 * car-rental-location-manage
 * --------------------------
 * Server-gated owner/admin CRUD for car-rental pickup/dropoff locations.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/;
const ACTIONS = new Set(["create", "update", "delete"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  location_id?: unknown;
  location?: unknown;
};

serve(withSecurity("car-rental-location-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid location action" }, 400);

  const locationId = cleanUuid(body.location_id);
  const existing = action === "create" ? null : await getLocation(admin, locationId);
  const storeId = action === "create" ? cleanUuid(body.store_id) : existing?.store_id ?? null;
  if (!storeId) return json({ error: "Invalid store or location id" }, 400);

  if (!await canManageStore(admin, user.id, storeId)) {
    return json({ error: "Not authorized for this store" }, 403);
  }

  if (action === "delete") {
    const { error } = await admin
      .from("car_rental_locations")
      .delete()
      .eq("id", locationId)
      .eq("store_id", storeId);
    if (error) {
      console.error("[car-rental-location-manage:delete]", error.message);
      return json({ error: "Could not delete location" }, 500);
    }
    return json({ ok: true, location_id: locationId });
  }

  const location = cleanLocation(body.location, action);
  if (!location.ok) return json({ error: location.error }, 400);

  if (location.values.is_default === true) {
    await clearDefaultLocations(admin, storeId, locationId);
  }

  if (action === "update") {
    const { data, error } = await admin
      .from("car_rental_locations")
      .update(location.values)
      .eq("id", locationId)
      .eq("store_id", storeId)
      .select("*")
      .single();
    if (error) {
      console.error("[car-rental-location-manage:update]", error.message);
      return json({ error: "Could not update location" }, 500);
    }
    return json({ ok: true, location: data });
  }

  const { data, error } = await admin
    .from("car_rental_locations")
    .insert({ ...location.values, store_id: storeId })
    .select("*")
    .single();
  if (error) {
    console.error("[car-rental-location-manage:create]", error.message);
    return json({ error: "Could not create location" }, 500);
  }
  return json({ ok: true, location: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[car-rental-location-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[car-rental-location-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getLocation(admin: any, locationId: string | null): Promise<{ store_id: string } | null> {
  if (!locationId) return null;
  const { data, error } = await admin
    .from("car_rental_locations")
    .select("store_id")
    .eq("id", locationId)
    .maybeSingle();
  if (error) {
    console.error("[car-rental-location-manage:location-store]", error.message);
    return null;
  }
  return data ?? null;
}

async function clearDefaultLocations(admin: any, storeId: string, exceptLocationId: string | null): Promise<void> {
  let query = admin
    .from("car_rental_locations")
    .update({ is_default: false })
    .eq("store_id", storeId)
    .eq("is_default", true);
  if (exceptLocationId) query = query.neq("id", exceptLocationId);
  const { error } = await query;
  if (error) console.error("[car-rental-location-manage:clear-default]", error.message);
}

function cleanLocation(value: unknown, action: string):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Location payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  if ("name" in input) {
    const name = cleanText(input.name, 1, 120);
    if (!name) return { ok: false, error: "Location name is required" };
    values.name = name;
  }
  for (const [key, maxLength] of [
    ["address", 500],
    ["city", 120],
    ["state", 120],
    ["postal_code", 40],
    ["country", 120],
    ["phone", 60],
  ] as const) {
    if (key in input) values[key] = cleanText(input[key], 0, maxLength);
  }
  if ("latitude" in input) {
    const latitude = cleanNumber(input.latitude, -90, 90);
    if (latitude === null) return { ok: false, error: "Invalid latitude" };
    values.latitude = latitude;
  }
  if ("longitude" in input) {
    const longitude = cleanNumber(input.longitude, -180, 180);
    if (longitude === null) return { ok: false, error: "Invalid longitude" };
    values.longitude = longitude;
  }
  if ("open_time" in input) {
    const openTime = cleanNullableTime(input.open_time);
    if (openTime === undefined) return { ok: false, error: "Invalid opening time" };
    values.open_time = openTime;
  }
  if ("close_time" in input) {
    const closeTime = cleanNullableTime(input.close_time);
    if (closeTime === undefined) return { ok: false, error: "Invalid closing time" };
    values.close_time = closeTime;
  }
  if ("is_default" in input) {
    if (typeof input.is_default !== "boolean") return { ok: false, error: "Invalid default status" };
    values.is_default = input.is_default;
  }
  if ("is_active" in input) {
    if (typeof input.is_active !== "boolean") return { ok: false, error: "Invalid active status" };
    values.is_active = input.is_active;
  }

  if (action === "create") {
    if (!("name" in values)) return { ok: false, error: "Location name is required" };
  } else if (Object.keys(values).length === 0) {
    return { ok: false, error: "No location changes supplied" };
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
  if (value === null || value === undefined) return minLength === 0 ? null : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanNullableTime(value: unknown): string | null | undefined {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const time = value.trim();
  return TIME_RE.test(time) ? time : undefined;
}

function cleanNumber(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}
