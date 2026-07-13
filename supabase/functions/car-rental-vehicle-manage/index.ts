/**
 * car-rental-vehicle-manage
 * -------------------------
 * Server-gated owner/admin CRUD for car-rental fleet vehicles.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ACTIONS = new Set(["create", "create_many", "update", "delete"]);
const CATEGORIES = new Set(["economy", "compact", "standard", "fullsize", "suv", "minivan", "truck", "luxury", "convertible", "sports"]);
const TRANSMISSIONS = new Set(["automatic", "manual"]);
const FUELS = new Set(["gasoline", "diesel", "hybrid", "electric"]);
const STATUSES = new Set(["available", "rented", "maintenance", "retired"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  vehicle_id?: unknown;
  vehicle?: unknown;
  vehicles?: unknown;
};

serve(withSecurity("car-rental-vehicle-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid vehicle action" }, 400);

  const vehicleId = cleanUuid(body.vehicle_id);
  const existing = action === "create" || action === "create_many" ? null : await getVehicle(admin, vehicleId);
  const storeId = action === "create" || action === "create_many" ? cleanUuid(body.store_id) : existing?.store_id ?? null;
  if (!storeId) return json({ error: "Invalid store or vehicle id" }, 400);

  if (!await canManageStore(admin, user.id, storeId)) {
    return json({ error: "Not authorized for this store" }, 403);
  }

  if (action === "delete") {
    const { error } = await admin
      .from("car_rental_vehicles")
      .delete()
      .eq("id", vehicleId)
      .eq("store_id", storeId);
    if (error) {
      console.error("[car-rental-vehicle-manage:delete]", error.message);
      return json({ error: "Could not delete vehicle" }, 500);
    }
    return json({ ok: true, vehicle_id: vehicleId });
  }

  if (action === "create_many") {
    if (!Array.isArray(body.vehicles) || body.vehicles.length < 1 || body.vehicles.length > 25) {
      return json({ error: "Invalid vehicle batch" }, 400);
    }
    const cleanedVehicles: Record<string, unknown>[] = [];
    for (const input of body.vehicles) {
      const vehicle = cleanVehicle(input, "create");
      if (!vehicle.ok) return json({ error: vehicle.error }, 400);
      if (!await validateLocation(admin, vehicle.values.home_location_id, storeId)) {
        return json({ error: "Invalid location for this store" }, 400);
      }
      cleanedVehicles.push({ ...vehicle.values, store_id: storeId });
    }
    const { data, error } = await admin
      .from("car_rental_vehicles")
      .insert(cleanedVehicles)
      .select("*");
    if (error) {
      console.error("[car-rental-vehicle-manage:create-many]", error.message);
      return json({ error: error.message?.includes("unique") ? "A vehicle plate already exists" : "Could not create vehicles" }, 500);
    }
    return json({ ok: true, vehicles: data ?? [] });
  }

  const vehicle = cleanVehicle(body.vehicle, action);
  if (!vehicle.ok) return json({ error: vehicle.error }, 400);
  if (!await validateLocation(admin, vehicle.values.home_location_id, storeId)) {
    return json({ error: "Invalid location for this store" }, 400);
  }

  if (action === "update") {
    const { data, error } = await admin
      .from("car_rental_vehicles")
      .update(vehicle.values)
      .eq("id", vehicleId)
      .eq("store_id", storeId)
      .select("*")
      .single();
    if (error) {
      console.error("[car-rental-vehicle-manage:update]", error.message);
      return json({ error: error.message?.includes("unique") ? "A vehicle plate already exists" : "Could not update vehicle" }, 500);
    }
    return json({ ok: true, vehicle: data });
  }

  const { data, error } = await admin
    .from("car_rental_vehicles")
    .insert({ ...vehicle.values, store_id: storeId })
    .select("*")
    .single();
  if (error) {
    console.error("[car-rental-vehicle-manage:create]", error.message);
    return json({ error: error.message?.includes("unique") ? "A vehicle plate already exists" : "Could not create vehicle" }, 500);
  }
  return json({ ok: true, vehicle: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[car-rental-vehicle-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[car-rental-vehicle-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getVehicle(admin: any, vehicleId: string | null): Promise<{ store_id: string } | null> {
  if (!vehicleId) return null;
  const { data, error } = await admin
    .from("car_rental_vehicles")
    .select("store_id")
    .eq("id", vehicleId)
    .maybeSingle();
  if (error) {
    console.error("[car-rental-vehicle-manage:vehicle-store]", error.message);
    return null;
  }
  return data ?? null;
}

async function validateLocation(admin: any, locationId: unknown, storeId: string): Promise<boolean> {
  if (locationId === null || locationId === undefined) return true;
  if (typeof locationId !== "string") return false;
  const { data, error } = await admin
    .from("car_rental_locations")
    .select("id")
    .eq("id", locationId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error("[car-rental-vehicle-manage:location]", error.message);
    return false;
  }
  return Boolean(data?.id);
}

function cleanVehicle(value: unknown, action: string):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Vehicle payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  if ("make" in input) {
    const make = cleanText(input.make, 1, 120);
    if (!make) return { ok: false, error: "Vehicle make is required" };
    values.make = make;
  }
  if ("model" in input) {
    const model = cleanText(input.model, 1, 120);
    if (!model) return { ok: false, error: "Vehicle model is required" };
    values.model = model;
  }
  if ("year" in input) values.year = cleanNullableInteger(input.year, 1900, 2100);
  if ("color" in input) values.color = cleanText(input.color, 0, 80);
  if ("license_plate" in input) values.license_plate = cleanText(input.license_plate, 0, 40);
  if ("vin" in input) values.vin = cleanText(input.vin, 0, 64);
  if ("category" in input) {
    const category = cleanEnum(input.category, CATEGORIES);
    if (!category) return { ok: false, error: "Invalid vehicle category" };
    values.category = category;
  }
  if ("transmission" in input) {
    const transmission = cleanEnum(input.transmission, TRANSMISSIONS);
    if (!transmission) return { ok: false, error: "Invalid transmission" };
    values.transmission = transmission;
  }
  if ("fuel_type" in input) {
    const fuelType = cleanEnum(input.fuel_type, FUELS);
    if (!fuelType) return { ok: false, error: "Invalid fuel type" };
    values.fuel_type = fuelType;
  }
  for (const [key, min, max] of [
    ["seats", 1, 20],
    ["doors", 1, 10],
    ["luggage_capacity", 0, 50],
    ["daily_rate_cents", 0, 100000000],
    ["weekly_rate_cents", 0, 100000000],
    ["monthly_rate_cents", 0, 100000000],
    ["hourly_rate_cents", 0, 100000000],
    ["extra_mile_cents", 0, 1000000],
    ["security_deposit_cents", 0, 100000000],
    ["current_odometer", 0, 2000000],
  ] as const) {
    if (key in input) {
      const number = cleanInteger(input[key], min, max);
      if (number === null) return { ok: false, error: `Invalid ${key}` };
      values[key] = number;
    }
  }
  if ("mileage_limit_per_day" in input) values.mileage_limit_per_day = cleanNullableInteger(input.mileage_limit_per_day, 0, 1000000);
  if ("air_conditioning" in input) {
    if (typeof input.air_conditioning !== "boolean") return { ok: false, error: "Invalid air conditioning value" };
    values.air_conditioning = input.air_conditioning;
  }
  if ("photo_url" in input) values.photo_url = cleanText(input.photo_url, 0, 2000);
  if ("photo_urls" in input) {
    const urls = cleanStringArray(input.photo_urls, 20, 2000);
    if (!urls) return { ok: false, error: "Invalid vehicle photos" };
    values.photo_urls = urls;
  }
  if ("home_location_id" in input) {
    const locationId = cleanNullableUuid(input.home_location_id);
    if (locationId === undefined) return { ok: false, error: "Invalid home location" };
    values.home_location_id = locationId;
  }
  if ("description" in input) values.description = cleanText(input.description, 0, 2000);
  if ("features" in input) {
    const features = cleanStringArray(input.features, 40, 80);
    if (!features) return { ok: false, error: "Invalid vehicle features" };
    values.features = features;
  }
  if ("is_active" in input) {
    if (typeof input.is_active !== "boolean") return { ok: false, error: "Invalid active status" };
    values.is_active = input.is_active;
  }
  if ("status" in input) {
    const status = cleanEnum(input.status, STATUSES);
    if (!status) return { ok: false, error: "Invalid vehicle status" };
    values.status = status;
  }
  for (const key of ["registration_expires_at", "insurance_expires_at", "inspection_due_at"] as const) {
    if (key in input) {
      const date = cleanNullableDate(input[key]);
      if (date === undefined) return { ok: false, error: `Invalid ${key}` };
      values[key] = date;
    }
  }
  if ("registration_number" in input) values.registration_number = cleanText(input.registration_number, 0, 120);
  if ("insurance_provider" in input) values.insurance_provider = cleanText(input.insurance_provider, 0, 160);
  if ("insurance_policy_number" in input) values.insurance_policy_number = cleanText(input.insurance_policy_number, 0, 120);

  if (action === "create") {
    for (const key of ["make", "model", "category", "transmission", "fuel_type", "seats", "doors", "luggage_capacity", "air_conditioning", "daily_rate_cents"]) {
      if (!(key in values)) return { ok: false, error: "Missing required vehicle fields" };
    }
  } else if (Object.keys(values).length === 0) {
    return { ok: false, error: "No vehicle changes supplied" };
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
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanStringArray(value: unknown, maxItems: number, maxLength: number): string[] | null {
  if (!Array.isArray(value) || value.length > maxItems) return null;
  const cleaned = value
    .map((item) => typeof item === "string" ? item.trim() : "")
    .filter(Boolean);
  if (cleaned.some((item) => item.length > maxLength)) return null;
  return cleaned;
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

function cleanNullableInteger(value: unknown, min: number, max: number): number | null {
  if (value === null || value === "" || value === undefined) return null;
  return cleanInteger(value, min, max);
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}
