/**
 * salon-booking-manage
 * --------------------
 * Owner/admin mutation gate for salon bookings. Public customer booking intake
 * remains handled by salon-booking-submit.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["create", "update", "change_status", "delete"]);
const STATUSES = new Set(["pending", "confirmed", "completed", "cancelled", "no_show"]);
const SOURCES = new Set(["walk_in", "phone", "app", "admin"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  booking_id?: unknown;
  booking?: unknown;
  patch?: unknown;
  status?: unknown;
  reason?: unknown;
  no_show_fee_cents?: unknown;
};

serve(withSecurity("salon-booking-manage", async (req, ctx) => {
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

    const booking = await cleanBooking(admin, body.booking, storeId, { partial: false });
    if (!booking.ok) return json({ error: booking.error }, 400);
    const { data, error } = await admin
      .from("salon_bookings")
      .insert({ ...booking.values, store_id: storeId, created_by_user_id: user.id })
      .select("*")
      .single();
    if (error) return bookingWriteError(json, "create", error);
    return json({ ok: true, booking: data });
  }

  const bookingId = cleanUuid(body.booking_id);
  if (!bookingId) return json({ error: "Invalid booking id" }, 400);

  const existing = await getBooking(admin, bookingId);
  if (!existing.ok) return json({ error: existing.error }, existing.status);
  if (!await canManageStore(admin, user.id, existing.data.store_id)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "delete") {
    const { error } = await admin
      .from("salon_bookings")
      .delete()
      .eq("id", bookingId)
      .eq("store_id", existing.data.store_id);
    if (error) return bookingWriteError(json, "delete", error);
    return json({ ok: true, booking_id: bookingId });
  }

  let values: Record<string, unknown>;
  if (action === "change_status") {
    const status = cleanStatus(body.status);
    if (!status) return json({ error: "Invalid booking status" }, 400);
    values = { status };
    if (status === "cancelled") {
      values.cancelled_at = new Date().toISOString();
      const reason = cleanNullableText(body.reason, 500);
      if (reason) values.cancellation_reason = reason;
    }
    // The fee the owner sets goes on `no_show_fee_cents` — what is owed.
    // `no_show_fee_charged_cents` means what Stripe actually took, and it is
    // the idempotency guard: charge-salon-no-show-fee refuses with "No-show fee
    // already charged." when it is > 0, and uses `.eq("no_show_fee_charged_cents", 0)`
    // as its race guard against the webhook. Writing the intended fee there
    // permanently blocked the real charge while the row asserted money had been
    // collected that nobody ever took.
    //
    // DO NOT DEPLOY THIS FUNCTION BEFORE MIGRATION
    // 20260524420000_salon_no_show_fees.sql. That migration is what adds
    // no_show_fee_cents to salon_bookings ("snapshot of
    // store_payment_settings.no_show_fee_cents at booking-insert") and it has
    // never been applied — production has only no_show_fee_charged_cents. Until
    // it lands this write 400s. The already-live charge-salon-no-show-fee
    // selects the same missing columns, so salon no-show fees have never
    // worked in production at all.
    if (status === "no_show" && body.no_show_fee_cents !== undefined) {
      const fee = cleanInteger(body.no_show_fee_cents, 0, 1_000_000);
      if (fee === null) return json({ error: "Invalid no-show fee" }, 400);
      values.no_show_fee_cents = fee;
    }
    if (
      existing.data.status === "no_show" &&
      status !== "no_show" &&
      Number(existing.data.no_show_fee_cents ?? 0) > 0
    ) {
      values.no_show_fee_cents = 0;
    }
  } else {
    const booking = await cleanBooking(admin, body.patch, existing.data.store_id, { partial: true, current: existing.data });
    if (!booking.ok) return json({ error: booking.error }, 400);
    values = booking.values;
  }

  if (Object.keys(values).length === 0) return json({ error: "No booking changes provided" }, 400);
  const { data, error } = await admin
    .from("salon_bookings")
    .update(values)
    .eq("id", bookingId)
    .eq("store_id", existing.data.store_id)
    .select("*")
    .single();
  if (error) return bookingWriteError(json, action, error);
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
    console.error("[salon-booking-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-booking-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getBooking(admin: any, bookingId: string):
  Promise<{ ok: true; data: Record<string, any> & { id: string; store_id: string } } | { ok: false; error: string; status: number }> {
  const { data, error } = await admin
    .from("salon_bookings")
    .select("*")
    .eq("id", bookingId)
    .maybeSingle();
  if (error) {
    console.error("[salon-booking-manage:lookup]", error.message);
    return { ok: false, error: "Could not verify booking", status: 500 };
  }
  if (!data) return { ok: false, error: "Booking not found", status: 404 };
  return { ok: true, data };
}

async function cleanBooking(
  admin: any,
  value: unknown,
  storeId: string,
  options: { partial: boolean; current?: Record<string, any> },
): Promise<{ ok: true; values: Record<string, unknown> } | { ok: false; error: string }> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Booking payload is required" };
  }
  const input = value as Record<string, unknown>;
  const values: Record<string, unknown> = {};

  if (input.client_id !== undefined) values.client_id = cleanUuidOrNull(input.client_id);
  if (input.stylist_id !== undefined) values.stylist_id = cleanUuidOrNull(input.stylist_id);
  if (input.service_id !== undefined) values.service_id = cleanUuidOrNull(input.service_id);
  for (const key of ["client_id", "stylist_id", "service_id"]) {
    if (values[key] === undefined) return { ok: false, error: `Invalid ${key}` };
  }

  if (!options.partial || input.service_name !== undefined) {
    const serviceName = cleanText(input.service_name, 1, 180);
    if (!serviceName) return { ok: false, error: "Service name is required" };
    values.service_name = serviceName;
  }
  if (!options.partial || input.client_name !== undefined) {
    const clientName = cleanText(input.client_name, 1, 200);
    if (!clientName) return { ok: false, error: "Client name is required" };
    values.client_name = clientName;
  }
  if (input.stylist_name !== undefined || !options.partial) {
    const text = cleanNullableText(input.stylist_name, 120);
    if (text === undefined) return { ok: false, error: "Invalid stylist name" };
    values.stylist_name = text;
  }
  if (input.client_phone !== undefined || !options.partial) {
    const text = cleanNullableText(input.client_phone, 40);
    if (text === undefined) return { ok: false, error: "Invalid client phone" };
    values.client_phone = text;
  }
  if (input.client_email !== undefined || !options.partial) {
    const text = cleanNullableText(input.client_email, 320);
    if (text === undefined) return { ok: false, error: "Invalid client email" };
    values.client_email = text;
  }
  if (input.price_cents !== undefined || !options.partial) {
    const price = cleanInteger(input.price_cents, 0, 10_000_000);
    if (price === null) return { ok: false, error: "Invalid price" };
    values.price_cents = price;
  }
  if (input.duration_minutes !== undefined || !options.partial) {
    const duration = cleanInteger(input.duration_minutes, 5, 480);
    if (duration === null) return { ok: false, error: "Invalid duration" };
    values.duration_minutes = duration;
  }
  if (input.start_at !== undefined || !options.partial) {
    const startAt = cleanIso(input.start_at);
    if (!startAt) return { ok: false, error: "Invalid start time" };
    values.start_at = startAt;
  }
  if (input.status !== undefined || !options.partial) {
    const status = cleanStatus(input.status);
    if (!status) return { ok: false, error: "Invalid booking status" };
    values.status = status;
  }
  if (input.source !== undefined || !options.partial) {
    const source = cleanSource(input.source);
    if (!source) return { ok: false, error: "Invalid booking source" };
    values.source = source;
  }
  if (input.tip_cents !== undefined) {
    const amount = cleanInteger(input.tip_cents, 0, 1_000_000);
    if (amount === null) return { ok: false, error: "Invalid tip" };
    values.tip_cents = amount;
  }
  if (input.tax_cents !== undefined) {
    const amount = cleanInteger(input.tax_cents, 0, 1_000_000);
    if (amount === null) return { ok: false, error: "Invalid tax" };
    values.tax_cents = amount;
  }
  if (input.deposit_paid_cents !== undefined) {
    const amount = cleanInteger(input.deposit_paid_cents, 0, 1_000_000);
    if (amount === null) return { ok: false, error: "Invalid deposit" };
    values.deposit_paid_cents = amount;
  }
  if (input.deposit_paid_at !== undefined) {
    const paidAt = cleanNullableIso(input.deposit_paid_at);
    if (paidAt === undefined) return { ok: false, error: "Invalid deposit paid time" };
    values.deposit_paid_at = paidAt;
  }
  if (input.client_notes !== undefined || !options.partial) {
    const text = cleanNullableText(input.client_notes, 1000);
    if (text === undefined) return { ok: false, error: "Invalid client notes" };
    values.client_notes = text;
  }
  if (input.internal_notes !== undefined || !options.partial) {
    const text = cleanNullableText(input.internal_notes, 1000);
    if (text === undefined) return { ok: false, error: "Invalid internal notes" };
    values.internal_notes = text;
  }
  if (input.referral_source !== undefined) {
    const text = cleanNullableText(input.referral_source, 120);
    if (text === undefined) return { ok: false, error: "Invalid referral source" };
    values.referral_source = text;
  }
  if (input.cancelled_at !== undefined) {
    const at = cleanNullableIso(input.cancelled_at);
    if (at === undefined) return { ok: false, error: "Invalid cancellation time" };
    values.cancelled_at = at;
  }
  if (input.cancellation_reason !== undefined) {
    const text = cleanNullableText(input.cancellation_reason, 500);
    if (text === undefined) return { ok: false, error: "Invalid cancellation reason" };
    values.cancellation_reason = text;
  }
  if (input.series_id !== undefined) {
    const seriesId = cleanUuidOrNull(input.series_id);
    if (seriesId === undefined) return { ok: false, error: "Invalid series id" };
    values.series_id = seriesId;
  }
  if (input.series_occurrence_number !== undefined) {
    const occurrence = input.series_occurrence_number === null ? null : cleanInteger(input.series_occurrence_number, 0, 10_000);
    if (occurrence === null && input.series_occurrence_number !== null) return { ok: false, error: "Invalid series occurrence" };
    values.series_occurrence_number = occurrence;
  }

  const start = (values.start_at as string | undefined) ?? options.current?.start_at;
  const duration = Number((values.duration_minutes as number | undefined) ?? options.current?.duration_minutes ?? 0);
  if (start && Number.isFinite(duration) && (values.start_at !== undefined || values.duration_minutes !== undefined || !options.partial)) {
    const addonMinutes = Number(options.current?.addons_duration_minutes ?? 0);
    values.end_at = new Date(new Date(start).getTime() + (duration + addonMinutes) * 60_000).toISOString();
  }

  if (!await referencesBelongToStore(admin, values, storeId)) {
    return { ok: false, error: "Booking references do not belong to this store" };
  }
  return { ok: true, values };
}

async function referencesBelongToStore(admin: any, values: Record<string, unknown>, storeId: string): Promise<boolean> {
  if (values.client_id) {
    const { data, error } = await admin.from("salon_clients").select("id").eq("id", values.client_id).eq("store_id", storeId).maybeSingle();
    if (error || !data?.id) return false;
  }
  if (values.stylist_id) {
    const { data, error } = await admin.from("salon_stylists").select("id").eq("id", values.stylist_id).eq("store_id", storeId).maybeSingle();
    if (error || !data?.id) return false;
  }
  if (values.service_id) {
    const { data, error } = await admin.from("salon_services").select("id").eq("id", values.service_id).eq("store_id", storeId).maybeSingle();
    if (error || !data?.id) return false;
  }
  return true;
}

function bookingWriteError(json: (body: unknown, status?: number) => Response, action: string, error: any): Response {
  console.error(`[salon-booking-manage:${action}]`, error.message);
  if (error.code === "23P01") return json({ error: error.message, code: "slot_conflict" }, 409);
  return json({ error: "Could not save booking" }, 500);
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

function cleanSource(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const source = value.trim().toLowerCase();
  return SOURCES.has(source) ? source : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanUuidOrNull(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  return cleanUuid(value) ?? undefined;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanNullableText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const text = value.trim();
  if (!text) return null;
  return text.length <= maxLength ? text : undefined;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function cleanIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function cleanNullableIso(value: unknown): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  return cleanIso(value) ?? undefined;
}
