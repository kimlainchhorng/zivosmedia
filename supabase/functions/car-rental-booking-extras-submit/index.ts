/**
 * car-rental-booking-extras-submit
 * --------------------------------
 * Capability-protected checkout companion. Authorization is resolved before
 * service-role work, then one service-only database RPC locks, validates,
 * prices, and replaces add-ons/promotion/totals atomically.
 */
import { createClient, serve } from "../_shared/deps.ts";
import {
  authorizeCarRentalReservationAccess,
  cleanCarRentalReservationId,
} from "../_shared/carRentalReservationAccess.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const CODE_RE = /^[A-Z0-9-]{4,24}$/i;

type AddonInput = {
  addon_id?: unknown;
  quantity?: unknown;
};

type PromoInput = {
  promo_id?: unknown;
};

type Body = {
  store_id?: unknown;
  reservation_id?: unknown;
  access_token?: unknown;
  /** Optional support identifier only. It never grants access. */
  confirmation_code?: unknown;
  addons?: unknown;
  promo?: unknown;
};

serve(withSecurity("car-rental-booking-extras-submit", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !anonKey || !serviceKey) {
    return json({
      error: "Reservation access is temporarily unavailable",
      code: "car_rental_extras_unavailable",
    }, 503);
  }

  const body = await req.json().catch(() => ({})) as Body;
  const storeId = cleanCarRentalReservationId(body.store_id);
  const reservationId = cleanCarRentalReservationId(body.reservation_id);
  const confirmationCode = body.confirmation_code == null
    ? null
    : cleanCode(body.confirmation_code);
  if (
    !storeId || !reservationId ||
    (body.confirmation_code != null && !confirmationCode)
  ) {
    return json({ error: "Invalid reservation reference" }, 400);
  }

  const addons = cleanAddons(body.addons);
  if (!addons.ok) return json({ error: addons.error }, 400);
  const promo = cleanPromo(body.promo);
  if (!promo.ok) return json({ error: promo.error }, 400);

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  }) as any;
  const authorized = await authorizeCarRentalReservationAccess({
    admin,
    req,
    supabaseUrl,
    anonKey,
    reservationId,
    accessToken: body.access_token,
    scope: "manage",
  });
  if (!authorized) {
    return json({ error: "Invalid or expired reservation access" }, 403);
  }

  // The RPC is one PostgreSQL transaction. Its reservation lock serializes
  // replays for this booking; promotion-row locks serialize global/account
  // redemption caps across different bookings. It also refuses any mutation
  // after payment activity before touching billable rows.
  const { data, error } = await admin.rpc(
    "car_rental_apply_booking_extras",
    {
      p_reservation_id: reservationId,
      p_store_id: storeId,
      p_addons: addons.values,
      p_promo_id: promo.value?.promo_id ?? null,
      p_confirmation_code: confirmationCode,
      p_access_token: authorized.accessToken,
      p_user_id: authorized.userId,
    },
  );
  if (error) {
    console.error(
      "[car-rental-booking-extras-submit:atomic-rpc]",
      error.code ?? "unknown",
      error.message,
    );
    const status = rpcErrorStatus(error.code);
    if (status !== 503) {
      return json({ error: publicRpcError(error.message, status) }, status);
    }
    return json({
      error:
        "Booking was created, but checkout extras are temporarily unavailable",
      code: "car_rental_extras_unavailable",
    }, 503);
  }

  if (!data || typeof data !== "object" || data.ok !== true) {
    console.error(
      "[car-rental-booking-extras-submit:atomic-rpc] Invalid RPC response",
    );
    return json({
      error:
        "Booking was created, but checkout extras are temporarily unavailable",
      code: "car_rental_extras_unavailable",
    }, 503);
  }

  return json(data);
}, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));

function cleanAddons(value: unknown):
  | { ok: true; values: Array<{ addon_id: string; quantity: number }> }
  | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, values: [] };
  if (!Array.isArray(value) || value.length > 20) {
    return { ok: false, error: "Invalid add-ons" };
  }

  const values = [];
  const seen = new Set<string>();
  for (const raw of value as AddonInput[]) {
    if (!raw || typeof raw !== "object") {
      return { ok: false, error: "Invalid add-on" };
    }
    const addonId = cleanCarRentalReservationId(raw.addon_id);
    const quantity = cleanInt(raw.quantity, 1, 20);
    if (!addonId || quantity === null || seen.has(addonId)) {
      return { ok: false, error: "Invalid add-on" };
    }
    seen.add(addonId);
    values.push({ addon_id: addonId, quantity });
  }
  return { ok: true, values };
}

function cleanPromo(value: unknown):
  | { ok: true; value: { promo_id: string } | null }
  | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Invalid promo" };
  }
  const promoId = cleanCarRentalReservationId((value as PromoInput).promo_id);
  if (!promoId) return { ok: false, error: "Invalid promo" };
  return { ok: true, value: { promo_id: promoId } };
}

function cleanCode(value: unknown): string | null {
  return typeof value === "string" && CODE_RE.test(value.trim())
    ? value.trim().toUpperCase()
    : null;
}

function cleanInt(value: unknown, min: number, max: number): number | null {
  const numberValue = typeof value === "number"
    ? value
    : typeof value === "string"
    ? Number(value)
    : Number.NaN;
  return Number.isInteger(numberValue) && numberValue >= min &&
      numberValue <= max
    ? numberValue
    : null;
}

function rpcErrorStatus(code: unknown): number {
  if (code === "42501") return 403;
  if (code === "P0002") return 404;
  if (code === "22023" || code === "22003") return 400;
  if (code === "P0001" || code === "23P01" || code === "23505") return 409;
  return 503;
}

function publicRpcError(message: unknown, status: number): string {
  if (typeof message !== "string" || message.length === 0) {
    return status === 403 ? "Reservation access denied" : "Invalid extras";
  }
  // The service-only function emits product-safe validation messages only.
  return message.slice(0, 240);
}
