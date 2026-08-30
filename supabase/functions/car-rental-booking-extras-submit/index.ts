/**
 * car-rental-booking-extras-submit
 * --------------------------------
 * Public checkout companion for attaching validated add-ons and promo
 * redemptions to an app-created car-rental reservation.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CODE_RE = /^[A-Z0-9-]{4,24}$/i;

type AddonInput = {
  addon_id?: unknown;
  quantity?: unknown;
};

type PromoInput = {
  promo_id?: unknown;
  amount_discounted_cents?: unknown;
};

type Body = {
  store_id?: unknown;
  reservation_id?: unknown;
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
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;

  const body = await req.json().catch(() => ({})) as Body;
  const storeId = cleanUuid(body.store_id);
  const reservationId = cleanUuid(body.reservation_id);
  const confirmationCode = cleanCode(body.confirmation_code);
  if (!storeId || !reservationId || !confirmationCode) {
    return json({ error: "Invalid reservation reference" }, 400);
  }

  const { data: reservation, error: reservationError } = await admin
    .from("car_rental_reservations")
    .select("id, store_id, confirmation_code, source, status, rental_days, customer_id, total_cents")
    .eq("id", reservationId)
    .eq("store_id", storeId)
    .maybeSingle();
  if (reservationError) {
    console.error("[car-rental-booking-extras-submit:reservation]", reservationError.message);
    return json({ error: "Could not verify reservation" }, 500);
  }
  if (!reservation?.id || reservation.confirmation_code !== confirmationCode) {
    return json({ error: "Reservation not found" }, 404);
  }
  if (reservation.source !== "app" || !["pending", "confirmed"].includes(String(reservation.status))) {
    return json({ error: "Reservation cannot accept checkout extras" }, 409);
  }

  const addons = cleanAddons(body.addons);
  if (!addons.ok) return json({ error: addons.error }, 400);

  const promo = cleanPromo(body.promo);
  if (!promo.ok) return json({ error: promo.error }, 400);

  if (addons.values.length > 0) {
    const addonError = await replaceReservationAddons(admin, reservationId, storeId, Number(reservation.rental_days ?? 1), addons.values);
    if (addonError) return json({ error: addonError }, 400);
  }

  if (promo.value) {
    const promoError = await recordPromoRedemption(admin, reservation, storeId, promo.value);
    if (promoError.status >= 500) {
      return json({ error: promoError.message }, promoError.status);
    }
    if (promoError.message) return json({ error: promoError.message }, promoError.status);
  }

  return json({ ok: true, reservation_id: reservationId });
}, {
  strictCors: true,
  allowedMethods: ["POST"],
  rateLimit: "api_general",
  trackNetwork: "suspicious",
  blockNetworkRiskAt: 80,
}));

async function replaceReservationAddons(
  admin: any,
  reservationId: string,
  storeId: string,
  rentalDays: number,
  addons: Array<{ addon_id: string; quantity: number }>,
): Promise<string | null> {
  const ids = [...new Set(addons.map((addon) => addon.addon_id))];
  const { data: catalog, error: catalogError } = await admin
    .from("car_rental_addons")
    .select("id, store_id, name, price_cents, billing, is_active")
    .eq("store_id", storeId)
    .in("id", ids);
  if (catalogError) {
    console.error("[car-rental-booking-extras-submit:addon-catalog]", catalogError.message);
    return "Could not verify add-ons";
  }

  const byId = new Map((catalog ?? []).map((addon: any) => [addon.id, addon]));
  const rows = [];
  for (const addon of addons) {
    const catalogAddon = byId.get(addon.addon_id) as any;
    if (!catalogAddon?.is_active) return "One or more add-ons are no longer available";
    const unitPrice = Number(catalogAddon.price_cents ?? 0);
    const billing = catalogAddon.billing === "per_rental" ? "per_rental" : "per_day";
    rows.push({
      reservation_id: reservationId,
      addon_id: catalogAddon.id,
      name: String(catalogAddon.name ?? "").slice(0, 120),
      unit_price_cents: unitPrice,
      billing,
      quantity: addon.quantity,
      total_cents: billing === "per_day" ? unitPrice * addon.quantity * Math.max(1, rentalDays) : unitPrice * addon.quantity,
    });
  }

  const { error: deleteError } = await admin
    .from("car_rental_reservation_addons")
    .delete()
    .eq("reservation_id", reservationId);
  if (deleteError) {
    console.error("[car-rental-booking-extras-submit:addon-delete]", deleteError.message);
    return "Could not update add-ons";
  }

  const { error: insertError } = await admin
    .from("car_rental_reservation_addons")
    .insert(rows);
  if (insertError) {
    console.error("[car-rental-booking-extras-submit:addon-insert]", insertError.message);
    return "Could not attach add-ons";
  }
  return null;
}

async function recordPromoRedemption(
  admin: any,
  reservation: any,
  storeId: string,
  promo: { promo_id: string; amount_discounted_cents: number },
): Promise<{ status: number; message: string }> {
  const { data: promotion, error: promoError } = await admin
    .from("car_rental_promotions")
    .select("id, store_id, is_active, starts_at, ends_at, current_redemptions, max_redemptions")
    .eq("id", promo.promo_id)
    .eq("store_id", storeId)
    .maybeSingle();
  if (promoError) {
    console.error("[car-rental-booking-extras-submit:promo]", promoError.message);
    return { status: 500, message: "Could not verify promo" };
  }
  if (!promotion?.id || !promotion.is_active) return { status: 400, message: "Promo is no longer available" };

  const now = Date.now();
  if (promotion.starts_at && new Date(promotion.starts_at).getTime() > now) {
    return { status: 400, message: "Promo is not active yet" };
  }
  if (promotion.ends_at && new Date(promotion.ends_at).getTime() <= now) {
    return { status: 400, message: "Promo has expired" };
  }
  if (promotion.max_redemptions !== null && Number(promotion.current_redemptions ?? 0) >= Number(promotion.max_redemptions)) {
    return { status: 400, message: "Promo redemption limit reached" };
  }
  if (promo.amount_discounted_cents > Number(reservation.total_cents ?? 0)) {
    return { status: 400, message: "Invalid promo discount" };
  }

  const { error: deleteError } = await admin
    .from("car_rental_promo_redemptions")
    .delete()
    .eq("reservation_id", reservation.id);
  if (deleteError) {
    console.error("[car-rental-booking-extras-submit:promo-delete]", deleteError.message);
    return { status: 500, message: "Could not update promo" };
  }

  const { error: redemptionError } = await admin
    .from("car_rental_promo_redemptions")
    .insert({
      store_id: storeId,
      promo_id: promotion.id,
      reservation_id: reservation.id,
      customer_id: reservation.customer_id ?? null,
      amount_discounted_cents: promo.amount_discounted_cents,
    });
  if (redemptionError) {
    console.error("[car-rental-booking-extras-submit:promo-redemption]", redemptionError.message);
    return { status: 500, message: "Could not attach promo" };
  }
  return { status: 200, message: "" };
}

function cleanAddons(value: unknown):
  | { ok: true; values: Array<{ addon_id: string; quantity: number }> }
  | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, values: [] };
  if (!Array.isArray(value) || value.length > 20) return { ok: false, error: "Invalid add-ons" };

  const values = [];
  for (const raw of value as AddonInput[]) {
    if (!raw || typeof raw !== "object") return { ok: false, error: "Invalid add-on" };
    const addonId = cleanUuid(raw.addon_id);
    const quantity = cleanInt(raw.quantity, 1, 20);
    if (!addonId || quantity === null) return { ok: false, error: "Invalid add-on" };
    values.push({ addon_id: addonId, quantity });
  }
  return { ok: true, values };
}

function cleanPromo(value: unknown):
  | { ok: true; value: { promo_id: string; amount_discounted_cents: number } | null }
  | { ok: false; error: string } {
  if (value === undefined || value === null) return { ok: true, value: null };
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false, error: "Invalid promo" };
  const input = value as PromoInput;
  const promoId = cleanUuid(input.promo_id);
  const amount = cleanInt(input.amount_discounted_cents, 0, 100000000);
  if (!promoId || amount === null) return { ok: false, error: "Invalid promo" };
  return { ok: true, value: { promo_id: promoId, amount_discounted_cents: amount } };
}

function cleanUuid(value: unknown): string | null {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

function cleanCode(value: unknown): string | null {
  return typeof value === "string" && CODE_RE.test(value.trim()) ? value.trim().toUpperCase() : null;
}

function cleanInt(value: unknown, min: number, max: number): number | null {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}
