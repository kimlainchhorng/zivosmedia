import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { notifyLodgingReservation } from "../_shared/lodging-notifications.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Addon = { id?: string; name?: string; label?: string; price_cents?: number; amount_cents?: number; unit?: string; pricing_unit?: string; disabled?: boolean; min_guests?: number; max_guests?: number; min_nights?: number; max_nights?: number; available_from?: string; available_until?: string; exclude_blocked_dates?: boolean; max_quantity?: number; requires_status?: string | string[] };
type Selection = { id: string; quantity?: number };

const keyFor = (addon: Addon) => String(addon.id || addon.name || addon.label || "addon");
function unitTotal(price: number, unit: string, qty: number, nights: number, guests: number) {
  if (unit === "per_night") return price * nights * qty;
  if (unit === "per_guest") return price * guests * qty;
  if (unit === "per_person_night") return price * guests * nights * qty;
  return price * qty;
}
function eligibilityReason(addon: Addon, ctx: { guests: number; nights: number; status: string; checkIn: string; checkOut: string; hasBlockedDates: boolean }) {
  const requiredStatuses = Array.isArray(addon.requires_status) ? addon.requires_status : addon.requires_status ? [addon.requires_status] : [];
  if (addon.disabled) return "This service is currently unavailable.";
  if (addon.min_guests && ctx.guests < addon.min_guests) return `Only available for ${addon.min_guests}+ guests.`;
  if (addon.max_guests && ctx.guests > addon.max_guests) return `Only available for up to ${addon.max_guests} guests.`;
  if (addon.min_nights && ctx.nights < addon.min_nights) return `Only available for ${addon.min_nights}+ nights.`;
  if (addon.max_nights && ctx.nights > addon.max_nights) return `Only available for stays up to ${addon.max_nights} nights.`;
  if (addon.available_from && ctx.checkOut <= addon.available_from) return "Unavailable for these stay dates.";
  if (addon.available_until && ctx.checkIn > addon.available_until) return "Unavailable for these stay dates.";
  if (addon.exclude_blocked_dates && ctx.hasBlockedDates) return "Unavailable because this stay includes blocked service dates.";
  if (requiredStatuses.length && !requiredStatuses.includes(ctx.status)) return "Unavailable for the current reservation status.";
  return null;
}
async function recordFailed(admin: any, r: any, userId: string, selections: unknown, reason: string, paymentStatus = "failed") {
  await admin.from("lodge_reservation_change_requests").insert({
    reservation_id: r.id,
    store_id: r.store_id,
    type: "addon",
    status: "failed",
    addon_payload: { selections, failure_reason: reason },
    price_delta_cents: 0,
    requested_by: userId,
    payment_status: paymentStatus,
  }).then(() => null);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.email) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { reservation_id, selections } = await req.json();
    if (!reservation_id || !Array.isArray(selections) || selections.length === 0) {
      return new Response(JSON.stringify({ error: "invalid_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: r } = await admin
      .from("lodge_reservations")
      .select("id, store_id, room_id, guest_id, guest_email, adults, children, nights, check_in, check_out, total_cents, paid_cents, extras_cents, addons, addon_selections, status")
      .eq("id", reservation_id)
      .maybeSingle();
    if (!r) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.guest_id !== user.id) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (["cancelled", "checked_out", "no_show"].includes(r.status)) return new Response(JSON.stringify({ error: "reservation_inactive" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: room } = await admin.from("lodge_rooms").select("addons").eq("id", r.room_id).maybeSingle();
    const catalog = Array.isArray(room?.addons) ? room.addons as Addon[] : [];
    const { data: blocks } = await admin.from("lodge_room_blocks").select("id").eq("room_id", r.room_id).gte("block_date", r.check_in).lt("block_date", r.check_out).limit(1);
    const guests = Math.max(1, Number(r.adults || 1) + Number(r.children || 0));
    const nights = Math.max(1, Number(r.nights || 1));
    const ctx = { guests, nights, status: String(r.status || ""), checkIn: String(r.check_in), checkOut: String(r.check_out), hasBlockedDates: Boolean(blocks?.length) };
    const normalized: any[] = [];
    let total = 0;

    for (const sel of selections as Selection[]) {
      const addon = catalog.find((a) => keyFor(a) === String(sel.id));
      if (!addon) {
        await recordFailed(admin, r, user.id, selections, "addon_not_available");
        return new Response(JSON.stringify({ error: "addon_not_available", addon_id: sel.id }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const reason = eligibilityReason(addon, ctx);
      if (reason) {
        await recordFailed(admin, r, user.id, selections, reason);
        return new Response(JSON.stringify({ error: "addon_unavailable", addon_id: sel.id, reason }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const maxQty = Math.max(1, Math.min(20, Number(addon.max_quantity || 20)));
      const qty = Math.max(1, Math.min(maxQty, Number(sel.quantity || 1)));
      const price = Number(addon.price_cents ?? addon.amount_cents ?? 0);
      const unit = String(addon.unit || addon.pricing_unit || "per_stay");
      const lineTotal = unitTotal(price, unit, qty, nights, guests);
      total += lineTotal;
      normalized.push({ id: sel.id, name: addon.name || addon.label || "Add-on", unit, quantity: qty, price_cents: price, total_cents: lineTotal });
    }

    if (total <= 0) return new Response(JSON.stringify({ error: "nothing_to_charge" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: r.guest_email || user.email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) {
      await recordFailed(admin, r, user.id, normalized, "no_saved_payment_method", "no_saved_payment_method");
      return new Response(JSON.stringify({ error: "no_saved_payment_method" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const fullCustomer = await stripe.customers.retrieve(customer.id) as Stripe.Customer;
    let paymentMethod = typeof fullCustomer.invoice_settings?.default_payment_method === "string" ? fullCustomer.invoice_settings.default_payment_method : undefined;
    if (!paymentMethod) {
      const methods = await stripe.paymentMethods.list({ customer: customer.id, type: "card", limit: 1 });
      paymentMethod = methods.data[0]?.id;
    }
    if (!paymentMethod) {
      await recordFailed(admin, r, user.id, normalized, "no_saved_payment_method", "no_saved_payment_method");
      return new Response(JSON.stringify({ error: "no_saved_payment_method" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let pi: Stripe.PaymentIntent;
    try {
      pi = await stripe.paymentIntents.create({ amount: total, currency: "usd", customer: customer.id, payment_method: paymentMethod, off_session: true, confirm: true, description: `Lodging add-ons for reservation ${r.id}`, metadata: { reservation_id: r.id, store_id: r.store_id, type: "lodging_addons" } });
    } catch (e) {
      const msg = String((e as Error).message || e);
      await recordFailed(admin, r, user.id, normalized, msg, "failed");
      return new Response(JSON.stringify({ error: "payment_failed", message: msg }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (pi.status !== "succeeded") {
      await recordFailed(admin, r, user.id, normalized, "payment_not_completed", pi.status);
      return new Response(JSON.stringify({ error: "payment_not_completed", payment_status: pi.status }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const existingSelections = Array.isArray(r.addon_selections) ? r.addon_selections : [];
    const existingAddons = Array.isArray(r.addons) ? r.addons : [];
    const now = new Date().toISOString();
    await admin.from("lodge_reservation_change_requests").insert({ reservation_id: r.id, store_id: r.store_id, type: "addon", status: "auto_approved", addon_payload: normalized, price_delta_cents: total, requested_by: user.id, decided_by: user.id, decided_at: now, applied_at: now, stripe_payment_intent_id: pi.id, payment_status: "captured" });
    for (const item of normalized) await admin.from("lodge_reservation_charges").insert({ reservation_id: r.id, store_id: r.store_id, label: item.name, amount_cents: item.total_cents });
    await admin.from("lodge_reservations").update({ extras_cents: Number(r.extras_cents || 0) + total, total_cents: Number(r.total_cents || 0) + total, paid_cents: Number(r.paid_cents || 0) + total, addon_selections: [...existingSelections, ...normalized], addons: [...existingAddons, ...normalized], payment_status: "captured", last_payment_error: null }).eq("id", r.id);
    await notifyLodgingReservation(admin, { reservationId: r.id, event: "addon_success", templateName: "lodging-addon-status", idempotencyKey: `addon-success-${pi.id}`, title: "Add-on charge successful", message: "Your add-ons were charged to your saved payment method and added to your reservation.", templateData: { amountCents: total, items: normalized.map((i) => `${i.name} ×${i.quantity}`).join(", ") }, smsBody: `ZIVO: Add-ons charged successfully for reservation ${r.id}.` });

    return new Response(JSON.stringify({ ok: true, charged_cents: total, payment_intent_id: pi.id, items: normalized }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
