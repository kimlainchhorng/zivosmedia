/**
 * salon-booking-addon-manage
 * --------------------------
 * Owner/admin mutation gate for add-on services attached to salon bookings.
 * The database rollup trigger remains responsible for booking totals,
 * duration, and end_at recalculation after rows are inserted.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["attach_many"]);
const MAX_ADDONS = 20;

type Body = {
  action?: unknown;
  store_id?: unknown;
  booking_id?: unknown;
  addons?: unknown;
};

type AddonInput = {
  service_id?: unknown;
  name?: unknown;
  price_cents?: unknown;
  duration_minutes?: unknown;
  quantity?: unknown;
};

type CleanAddon = {
  service_id: string | null;
  name: string;
  price_cents: number;
  duration_minutes: number;
  quantity: number;
};

serve(withSecurity("salon-booking-addon-manage", async (req, ctx) => {
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
  const storeId = cleanUuid(body.store_id);
  const bookingId = cleanUuid(body.booking_id);
  if (!action) return json({ error: "Invalid add-on action" }, 400);
  if (!storeId || !bookingId) return json({ error: "Invalid store or booking id" }, 400);
  if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

  const booking = await getBooking(admin, bookingId, storeId);
  if (!booking.ok) return json({ error: booking.error }, booking.status);

  const addons = await cleanAddons(admin, body.addons, storeId);
  if (!addons.ok) return json({ error: addons.error }, addons.status);
  if (addons.data.length === 0) return json({ ok: true, inserted: 0 });

  const { error } = await admin
    .from("salon_booking_addons")
    .insert(addons.data.map((addon) => ({
      ...addon,
      booking_id: booking.data.id,
      store_id: storeId,
    })));
  if (error) {
    console.error("[salon-booking-addon-manage:insert]", error.message);
    return json({ error: "Could not attach add-ons" }, 500);
  }

  return json({ ok: true, inserted: addons.data.length });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[salon-booking-addon-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[salon-booking-addon-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getBooking(admin: any, bookingId: string, storeId: string):
  Promise<{ ok: true; data: { id: string } } | { ok: false; error: string; status: number }> {
  const { data, error } = await admin
    .from("salon_bookings")
    .select("id")
    .eq("id", bookingId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error("[salon-booking-addon-manage:booking]", error.message);
    return { ok: false, error: "Could not verify booking", status: 500 };
  }
  if (!data) return { ok: false, error: "Booking not found", status: 404 };
  return { ok: true, data };
}

async function cleanAddons(admin: any, value: unknown, storeId: string):
  Promise<{ ok: true; data: CleanAddon[] } | { ok: false; error: string; status: number }> {
  if (!Array.isArray(value)) return { ok: false, error: "Add-ons are required", status: 400 };
  if (value.length > MAX_ADDONS) return { ok: false, error: "Too many add-ons", status: 400 };

  const rows: CleanAddon[] = [];
  for (const raw of value as AddonInput[]) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return { ok: false, error: "Invalid add-on payload", status: 400 };
    }

    const serviceId = cleanUuid(raw.service_id);
    const quantity = cleanInt(raw.quantity, 1, 100);
    if (quantity === null) return { ok: false, error: "Invalid add-on quantity", status: 400 };

    if (serviceId) {
      const service = await getService(admin, serviceId, storeId);
      if (!service.ok) return { ok: false, error: service.error, status: service.status };
      rows.push({
        service_id: service.data.id,
        name: service.data.name,
        price_cents: service.data.price_cents,
        duration_minutes: service.data.duration_minutes,
        quantity,
      });
      continue;
    }

    const name = cleanText(raw.name, 1, 120);
    const priceCents = cleanInt(raw.price_cents, 0, 10_000_000);
    const durationMinutes = cleanInt(raw.duration_minutes, 0, 480);
    if (!name || priceCents === null || durationMinutes === null) {
      return { ok: false, error: "Invalid add-on snapshot", status: 400 };
    }
    rows.push({
      service_id: null,
      name,
      price_cents: priceCents,
      duration_minutes: durationMinutes,
      quantity,
    });
  }

  return { ok: true, data: rows };
}

async function getService(admin: any, serviceId: string, storeId: string):
  Promise<{ ok: true; data: { id: string; name: string; price_cents: number; duration_minutes: number } } | { ok: false; error: string; status: number }> {
  const { data, error } = await admin
    .from("salon_services")
    .select("id, name, price_cents, duration_minutes, is_active")
    .eq("id", serviceId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (error) {
    console.error("[salon-booking-addon-manage:service]", error.message);
    return { ok: false, error: "Could not verify add-on service", status: 500 };
  }
  if (!data || !data.is_active) return { ok: false, error: "Add-on service not found", status: 404 };
  return {
    ok: true,
    data: {
      id: data.id,
      name: data.name,
      price_cents: data.price_cents,
      duration_minutes: data.duration_minutes,
    },
  };
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

function cleanInt(value: unknown, min: number, max: number): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < min || value > max) return null;
  return value;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}
