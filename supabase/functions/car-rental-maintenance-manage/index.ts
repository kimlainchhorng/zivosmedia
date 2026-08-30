/**
 * car-rental-maintenance-manage
 * -----------------------------
 * Server-gated owner/admin CRUD for car-rental maintenance records.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ACTIONS = new Set(["create", "update", "delete"]);
const SERVICE_TYPES = new Set([
  "oil_change",
  "tire_rotation",
  "tire_replacement",
  "brake_service",
  "battery",
  "inspection",
  "cleaning",
  "detailing",
  "body_work",
  "engine",
  "transmission",
  "recall",
  "other",
]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  maintenance_id?: unknown;
  maintenance?: unknown;
};

serve(withSecurity("car-rental-maintenance-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid maintenance action" }, 400);

  const maintenanceId = cleanUuid(body.maintenance_id);
  const existing = action === "create" ? null : await getMaintenance(admin, maintenanceId);
  const storeId = action === "create" ? cleanUuid(body.store_id) : existing?.store_id ?? null;
  if (!storeId) return json({ error: "Invalid store or maintenance id" }, 400);

  if (!await canManageStore(admin, user.id, storeId)) {
    return json({ error: "Not authorized for this store" }, 403);
  }

  if (action === "delete") {
    const { error } = await admin
      .from("car_rental_maintenance")
      .delete()
      .eq("id", maintenanceId)
      .eq("store_id", storeId);
    if (error) {
      console.error("[car-rental-maintenance-manage:delete]", error.message);
      return json({ error: "Could not delete maintenance record" }, 500);
    }
    return json({ ok: true, maintenance_id: maintenanceId });
  }

  const maintenance = cleanMaintenance(body.maintenance, action);
  if (!maintenance.ok) return json({ error: maintenance.error }, 400);

  const vehicleId = (maintenance.values.vehicle_id ?? existing?.vehicle_id) as string | undefined;
  if (!vehicleId || !await vehicleBelongsToStore(admin, vehicleId, storeId)) {
    return json({ error: "Invalid vehicle for this store" }, 400);
  }

  if (action === "update") {
    const { data, error } = await admin
      .from("car_rental_maintenance")
      .update(maintenance.values)
      .eq("id", maintenanceId)
      .eq("store_id", storeId)
      .select("*")
      .single();
    if (error) {
      console.error("[car-rental-maintenance-manage:update]", error.message);
      return json({ error: "Could not update maintenance record" }, 500);
    }
    await maybeMarkVehicleMaintenance(admin, maintenance.values, vehicleId);
    return json({ ok: true, maintenance: data });
  }

  const { data, error } = await admin
    .from("car_rental_maintenance")
    .insert({ ...maintenance.values, store_id: storeId, created_by_user_id: user.id })
    .select("*")
    .single();
  if (error) {
    console.error("[car-rental-maintenance-manage:create]", error.message);
    return json({ error: "Could not create maintenance record" }, 500);
  }
  await maybeMarkVehicleMaintenance(admin, maintenance.values, vehicleId);
  return json({ ok: true, maintenance: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[car-rental-maintenance-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[car-rental-maintenance-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getMaintenance(admin: any, maintenanceId: string | null): Promise<{ store_id: string; vehicle_id: string } | null> {
  if (!maintenanceId) return null;
  const { data, error } = await admin
    .from("car_rental_maintenance")
    .select("store_id, vehicle_id")
    .eq("id", maintenanceId)
    .maybeSingle();
  if (error) {
    console.error("[car-rental-maintenance-manage:record-store]", error.message);
    return null;
  }
  return data ?? null;
}

async function vehicleBelongsToStore(admin: any, vehicleId: string, storeId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("car_rental_vehicles")
    .select("id")
    .eq("id", vehicleId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error("[car-rental-maintenance-manage:vehicle]", error.message);
    return false;
  }
  return Boolean(data?.id);
}

async function maybeMarkVehicleMaintenance(admin: any, values: Record<string, unknown>, vehicleId: string): Promise<void> {
  if (values.took_vehicle_offline !== true) return;
  const { error } = await admin
    .from("car_rental_vehicles")
    .update({ status: "maintenance" })
    .eq("id", vehicleId);
  if (error) console.error("[car-rental-maintenance-manage:vehicle-status]", error.message);
}

function cleanMaintenance(value: unknown, action: string):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Maintenance payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  if ("vehicle_id" in input) {
    const vehicleId = cleanUuid(input.vehicle_id);
    if (!vehicleId) return { ok: false, error: "Vehicle is required" };
    values.vehicle_id = vehicleId;
  }
  if ("service_type" in input) {
    const serviceType = cleanServiceType(input.service_type);
    if (!serviceType) return { ok: false, error: "Invalid service type" };
    values.service_type = serviceType;
  }
  if ("description" in input) {
    const description = cleanText(input.description, 1, 500);
    if (!description) return { ok: false, error: "Maintenance description is required" };
    values.description = description;
  }
  if ("notes" in input) values.notes = cleanText(input.notes, 0, 2000);
  if ("cost_cents" in input) {
    const cost = cleanInteger(input.cost_cents, 0, 100000000);
    if (cost === null) return { ok: false, error: "Invalid maintenance cost" };
    values.cost_cents = cost;
  }
  if ("shop" in input) values.shop = cleanText(input.shop, 0, 160);
  if ("odometer" in input) values.odometer = cleanNullableInteger(input.odometer, 0, 2000000);
  if ("service_date" in input) {
    const date = cleanDate(input.service_date);
    if (!date) return { ok: false, error: "Invalid service date" };
    values.service_date = date;
  }
  if ("next_service_due_date" in input) {
    const date = cleanNullableDate(input.next_service_due_date);
    if (date === undefined) return { ok: false, error: "Invalid next service date" };
    values.next_service_due_date = date;
  }
  if ("next_service_due_odometer" in input) {
    values.next_service_due_odometer = cleanNullableInteger(input.next_service_due_odometer, 0, 2000000);
  }
  if ("took_vehicle_offline" in input) {
    if (typeof input.took_vehicle_offline !== "boolean") return { ok: false, error: "Invalid offline status" };
    values.took_vehicle_offline = input.took_vehicle_offline;
  }

  if (action === "create") {
    for (const key of ["vehicle_id", "service_type", "description", "cost_cents", "service_date"]) {
      if (!(key in values)) return { ok: false, error: "Missing required maintenance fields" };
    }
  } else if (Object.keys(values).length === 0) {
    return { ok: false, error: "No maintenance changes supplied" };
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

function cleanServiceType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const serviceType = value.trim().toLowerCase();
  return SERVICE_TYPES.has(serviceType) ? serviceType : null;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (value === null || value === undefined) return minLength === 0 ? null : null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
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
