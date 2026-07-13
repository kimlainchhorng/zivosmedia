/**
 * service-booking-manage
 * ----------------------
 * Owner/admin mutations for service bookings created from the repair booking board.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "delete", "update_status", "save_notes", "reschedule", "link_workorder"]);
const STATUSES = new Set(["pending", "confirmed", "completed", "cancelled"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  booking_id?: unknown;
  booking?: unknown;
  status?: unknown;
  admin_notes?: unknown;
  preferred_date?: unknown;
  preferred_time?: unknown;
  workorder_id?: unknown;
};

serve(withSecurity("service-booking-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid booking action" }, 400);

  if (action === "create") {
    const storeId = cleanUuid(body.store_id);
    if (!storeId) return json({ error: "Invalid store id" }, 400);
    if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

    const booking = cleanBooking(body.booking);
    if (!booking.ok) return json({ error: booking.error }, 400);
    const { data, error } = await admin
      .from("service_bookings")
      .insert({ ...booking.values, store_id: storeId })
      .select("*")
      .single();
    if (error) {
      console.error("[service-booking-manage:create]", error.message);
      return json({ error: "Could not create booking" }, 500);
    }
    return json({ ok: true, booking: data });
  }

  const bookingId = cleanUuid(body.booking_id);
  if (!bookingId) return json({ error: "Invalid booking id" }, 400);

  const bookingStoreId = await getBookingStoreId(admin, bookingId);
  if (!bookingStoreId) return json({ error: "Booking not found" }, 404);
  if (!await canManageStore(admin, user.id, bookingStoreId)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "delete") {
    const { error } = await admin.from("service_bookings").delete().eq("id", bookingId);
    if (error) {
      console.error("[service-booking-manage:delete]", error.message);
      return json({ error: "Could not delete booking" }, 500);
    }
    return json({ ok: true, booking_id: bookingId });
  }

  const values: Record<string, unknown> = {};
  if (action === "update_status") {
    const status = cleanStatus(body.status);
    if (!status) return json({ error: "Invalid status" }, 400);
    values.status = status;
  } else if (action === "save_notes") {
    values.admin_notes = cleanNullableText(body.admin_notes, 4000);
  } else if (action === "reschedule") {
    const preferredDate = cleanDate(body.preferred_date);
    const preferredTime = cleanText(body.preferred_time, 1, 40);
    if (!preferredDate || !preferredTime) return json({ error: "Invalid schedule" }, 400);
    values.preferred_date = preferredDate;
    values.preferred_time = preferredTime;
  } else if (action === "link_workorder") {
    const workorderId = cleanUuid(body.workorder_id);
    if (!workorderId) return json({ error: "Invalid work order id" }, 400);
    if (!await workorderBelongsToStore(admin, workorderId, bookingStoreId)) {
      return json({ error: "Work order does not belong to this store" }, 400);
    }
    values.workorder_id = workorderId;
  }

  const { data, error } = await admin
    .from("service_bookings")
    .update(values)
    .eq("id", bookingId)
    .select("*")
    .single();
  if (error) {
    console.error(`[service-booking-manage:${action}]`, error.message);
    return json({ error: "Could not update booking" }, 500);
  }
  return json({ ok: true, booking: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[service-booking-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[service-booking-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getBookingStoreId(admin: any, bookingId: string): Promise<string | null> {
  const { data, error } = await admin
    .from("service_bookings")
    .select("store_id")
    .eq("id", bookingId)
    .maybeSingle();
  if (error) {
    console.error("[service-booking-manage:booking-store]", error.message);
    return null;
  }
  return data?.store_id ?? null;
}

async function workorderBelongsToStore(admin: any, workorderId: string, storeId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("ar_work_orders")
    .select("id")
    .eq("id", workorderId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error("[service-booking-manage:workorder]", error.message);
    return false;
  }
  return Boolean(data?.id);
}

function cleanBooking(value: unknown):
  | { ok: true; values: Record<string, unknown> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Booking payload is required" };
  }
  const input = value as Record<string, unknown>;
  const customerName = cleanText(input.customer_name, 1, 200);
  const customerPhone = cleanText(input.customer_phone, 1, 40);
  const serviceName = cleanText(input.service_name, 1, 180);
  const preferredDate = cleanDate(input.preferred_date);
  const preferredTime = cleanText(input.preferred_time, 1, 40);
  if (!customerName || !customerPhone || !serviceName || !preferredDate || !preferredTime) {
    return { ok: false, error: "Name, phone, service, date, and time are required" };
  }
  const status = cleanStatus(input.status) ?? "confirmed";

  return {
    ok: true,
    values: {
      customer_name: customerName,
      customer_phone: customerPhone,
      customer_email: cleanNullableText(input.customer_email, 320),
      service_name: serviceName,
      vehicle_year: cleanNullableText(input.vehicle_year, 12),
      vehicle_make: cleanNullableText(input.vehicle_make, 80),
      vehicle_model: cleanNullableText(input.vehicle_model, 80),
      notes: cleanNullableText(input.notes, 2000),
      preferred_date: preferredDate,
      preferred_time: preferredTime,
      status,
    },
  };
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
}

function cleanStatus(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const status = value.trim().toLowerCase();
  return STATUSES.has(status) ? status : null;
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

function cleanDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  return Number.isNaN(new Date(`${value}T00:00:00Z`).getTime()) ? null : value;
}
