/**
 * car-rental-reservation-manage
 * -----------------------------
 * Server-gated owner/admin CRUD for car-rental reservations.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ACTIONS = new Set(["create", "update", "delete"]);
const STATUSES = new Set(["pending", "confirmed", "picked_up", "returned", "cancelled", "no_show"]);
const SOURCES = new Set(["walk_in", "phone", "app", "admin"]);
const REFUND_METHODS = new Set(["original_payment", "cash", "store_credit", "other"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  reservation_id?: unknown;
  reservation?: unknown;
};

serve(withSecurity("car-rental-reservation-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid reservation action" }, 400);

  const reservationId = cleanUuid(body.reservation_id);
  const existing = action === "create" ? null : await getReservation(admin, reservationId);
  const storeId = action === "create" ? cleanUuid(body.store_id) : existing?.store_id ?? null;
  if (!storeId) return json({ error: "Invalid store or reservation id" }, 400);

  if (!await canManageStore(admin, user.id, storeId)) {
    return json({ error: "Not authorized for this store" }, 403);
  }

  if (action === "delete") {
    const { error } = await admin
      .from("car_rental_reservations")
      .delete()
      .eq("id", reservationId)
      .eq("store_id", storeId);
    if (error) {
      console.error("[car-rental-reservation-manage:delete]", error.message);
      return json({ error: "Could not delete reservation" }, 500);
    }
    return json({ ok: true, reservation_id: reservationId });
  }

  const reservation = cleanReservation(body.reservation, action);
  if (!reservation.ok) return json({ error: reservation.error }, 400);

  const relationError = await validateRelations(admin, reservation.values, storeId);
  if (relationError) return json({ error: relationError }, 400);

  if (action === "update") {
    const { data, error } = await admin
      .from("car_rental_reservations")
      .update(reservation.values)
      .eq("id", reservationId)
      .eq("store_id", storeId)
      .select("*")
      .single();
    if (error) return reservationError(json, error, "update");
    return json({ ok: true, reservation: data });
  }

  const { data, error } = await admin
    .from("car_rental_reservations")
    .insert({ ...reservation.values, store_id: storeId, created_by_user_id: user.id })
    .select("*")
    .single();
  if (error) return reservationError(json, error, "create");
  return json({ ok: true, reservation: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function reservationError(json: (body: unknown, status?: number) => Response, error: { code?: string; message?: string }, action: string): Response {
  console.error(`[car-rental-reservation-manage:${action}]`, error.message);
  const message = error.message ?? "";
  if (error.code === "23P01") return json({ error: "Vehicle is already booked for the selected time" }, 409);
  if (message.startsWith("CUSTOMER_BLOCKED:")) return json({ error: message.replace(/^CUSTOMER_BLOCKED:\s*/, "") }, 400);
  return json({ error: `Could not ${action} reservation` }, 500);
}

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[car-rental-reservation-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[car-rental-reservation-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getReservation(admin: any, reservationId: string | null): Promise<{ store_id: string } | null> {
  if (!reservationId) return null;
  const { data, error } = await admin
    .from("car_rental_reservations")
    .select("store_id")
    .eq("id", reservationId)
    .maybeSingle();
  if (error) {
    console.error("[car-rental-reservation-manage:reservation-store]", error.message);
    return null;
  }
  return data ?? null;
}

async function validateRelations(admin: any, values: Record<string, unknown>, storeId: string): Promise<string | null> {
  const checks: Array<[string, string, string]> = [
    ["vehicle_id", "car_rental_vehicles", "Invalid vehicle for this store"],
    ["customer_id", "car_rental_customers", "Invalid renter for this store"],
    ["pickup_location_id", "car_rental_locations", "Invalid pickup location for this store"],
    ["dropoff_location_id", "car_rental_locations", "Invalid drop-off location for this store"],
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
      console.error(`[car-rental-reservation-manage:${key}]`, error.message);
      return message;
    }
    if (!data?.id) return message;
  }
  return null;
}

function cleanReservation(value: unknown, action: string):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Reservation payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  for (const key of ["vehicle_id", "customer_id", "pickup_location_id", "dropoff_location_id"] as const) {
    if (key in input) {
      const id = cleanNullableUuid(input[key]);
      if (id === undefined) return { ok: false, error: `Invalid ${key}` };
      values[key] = id;
    }
  }
  for (const [key, min, max] of [
    ["vehicle_label", 1, 180],
    ["vehicle_category", 0, 80],
    ["customer_name", 1, 120],
    ["customer_phone", 0, 60],
    ["pickup_location_name", 0, 120],
    ["dropoff_location_name", 0, 120],
    ["customer_notes", 0, 1000],
    ["internal_notes", 0, 1000],
    ["damage_notes", 0, 2000],
    ["cancellation_reason", 0, 500],
  ] as const) {
    if (key in input) {
      const text = cleanText(input[key], min, max);
      if (min > 0 && !text) return { ok: false, error: `Invalid ${key}` };
      values[key] = text;
    }
  }
  if ("customer_email" in input) {
    const email = cleanEmail(input.customer_email);
    if (email === undefined) return { ok: false, error: "Invalid customer email" };
    values.customer_email = email;
  }
  for (const key of ["pickup_at", "dropoff_at", "picked_up_at", "returned_at", "cancelled_at", "refund_at"] as const) {
    if (key in input) {
      const iso = cleanNullableIso(input[key]);
      if (iso === undefined) return { ok: false, error: `Invalid ${key}` };
      values[key] = iso;
    }
  }
  if (values.pickup_at && values.dropoff_at && new Date(values.dropoff_at as string).getTime() <= new Date(values.pickup_at as string).getTime()) {
    return { ok: false, error: "Drop-off must be after pickup" };
  }
  for (const [key, min, max] of [
    ["rental_days", 1, 3650],
    ["daily_rate_cents", 0, 100000000],
    ["base_total_cents", 0, 100000000],
    ["addons_total_cents", 0, 100000000],
    ["insurance_total_cents", 0, 100000000],
    ["taxes_cents", 0, 100000000],
    ["fees_cents", 0, 100000000],
    ["discount_cents", 0, 100000000],
    ["security_deposit_cents", 0, 100000000],
    ["total_cents", 0, 100000000],
    ["deposit_paid_cents", 0, 100000000],
    ["amount_paid_cents", 0, 100000000],
    ["pickup_odometer", 0, 2000000],
    ["dropoff_odometer", 0, 2000000],
    ["pickup_fuel_level", 0, 100],
    ["dropoff_fuel_level", 0, 100],
    ["refund_amount_cents", 0, 100000000],
  ] as const) {
    if (key in input) {
      const number = cleanNullableInteger(input[key], min, max);
      if (number === undefined) return { ok: false, error: `Invalid ${key}` };
      values[key] = number;
    }
  }
  if ("status" in input) {
    const status = cleanEnum(input.status, STATUSES);
    if (!status) return { ok: false, error: "Invalid reservation status" };
    values.status = status;
  }
  if ("source" in input) {
    const source = cleanEnum(input.source, SOURCES);
    if (!source) return { ok: false, error: "Invalid reservation source" };
    values.source = source;
  }
  if ("refund_method" in input) {
    if (input.refund_method === null || input.refund_method === "") values.refund_method = null;
    else {
      const method = cleanEnum(input.refund_method, REFUND_METHODS);
      if (!method) return { ok: false, error: "Invalid refund method" };
      values.refund_method = method;
    }
  }

  if (action === "create") {
    for (const key of [
      "vehicle_label",
      "customer_name",
      "pickup_at",
      "dropoff_at",
      "rental_days",
      "daily_rate_cents",
      "base_total_cents",
      "total_cents",
    ]) {
      if (!(key in values)) return { ok: false, error: "Missing required reservation fields" };
    }
  } else if (Object.keys(values).length === 0) {
    return { ok: false, error: "No reservation changes supplied" };
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

function cleanNullableIso(value: unknown): string | null | undefined {
  if (value === null || value === "" || value === undefined) return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

function cleanNullableInteger(value: unknown, min: number, max: number): number | null | undefined {
  if (value === null || value === "" || value === undefined) return null;
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return undefined;
  return number;
}
