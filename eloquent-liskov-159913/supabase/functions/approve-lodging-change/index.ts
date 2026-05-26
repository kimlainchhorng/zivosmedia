/** approve-lodging-change — host/admin approves or declines lodging change requests. */
import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { notifyLodgingReservation } from "../_shared/lodging-notifications.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const ACTIVE = ["hold", "confirmed", "checked_in"];

function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { change_request_id, action, host_response } = await req.json();
    if (!change_request_id || !["approve", "decline"].includes(action)) return new Response(JSON.stringify({ error: "invalid_request" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: cr } = await admin.from("lodge_reservation_change_requests").select("*").eq("id", change_request_id).maybeSingle();
    if (!cr) return new Response(JSON.stringify({ error: "request_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (cr.status !== "pending") return new Response(JSON.stringify({ error: "already_decided" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: store } = await admin.from("restaurants").select("owner_id").eq("id", cr.store_id).maybeSingle();
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin");
    if (!isAdmin && store?.owner_id !== user.id) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const now = new Date().toISOString();
    if (action === "decline") {
      await admin.from("lodge_reservation_change_requests").update({ status: "declined", host_response: host_response || null, decided_by: user.id, decided_at: now }).eq("id", change_request_id);
      await notifyLodgingReservation(admin, { reservationId: cr.reservation_id, event: "reschedule_update", templateName: "lodging-reschedule-update", idempotencyKey: `reschedule-declined-${change_request_id}`, title: "Date change declined", message: host_response || "Your original lodging dates are unchanged.", templateData: { status: "declined" }, smsBody: "ZIVO: Your lodging date change was declined." });
      return new Response(JSON.stringify({ ok: true, status: "declined" }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: reservation } = await admin.from("lodge_reservations").select("id, store_id, room_id, guest_id, guest_email, check_in, check_out, total_cents, paid_cents, stripe_payment_intent_id").eq("id", cr.reservation_id).maybeSingle();
    if (!reservation) return new Response(JSON.stringify({ error: "reservation_not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let paymentStatus = "not_required";
    let paymentIntentId: string | null = null;

    if (cr.type === "reschedule" && cr.proposed_check_in && cr.proposed_check_out) {
      const { data: conflicts } = await admin.from("lodge_reservations").select("id").eq("room_id", reservation.room_id).in("status", ACTIVE).neq("id", reservation.id).lt("check_in", cr.proposed_check_out).gt("check_out", cr.proposed_check_in).limit(1);
      if (conflicts?.length) return new Response(JSON.stringify({ error: "room_unavailable" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const { data: blocks } = await admin.from("lodge_room_blocks").select("id, block_date").eq("room_id", reservation.room_id).gte("block_date", cr.proposed_check_in).lt("block_date", cr.proposed_check_out).limit(1);
      if (blocks?.length) return new Response(JSON.stringify({ error: "room_blocked", block_date: blocks[0].block_date }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const delta = Number(cr.price_delta_cents || 0);
      if (delta > 0) {
        const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
        const customers = await stripe.customers.list({ email: reservation.guest_email, limit: 1 });
        const customer = customers.data[0];
        if (!customer) return new Response(JSON.stringify({ error: "no_saved_payment_method" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const fullCustomer = await stripe.customers.retrieve(customer.id) as Stripe.Customer;
        let method = typeof fullCustomer.invoice_settings?.default_payment_method === "string" ? fullCustomer.invoice_settings.default_payment_method : undefined;
        if (!method) method = (await stripe.paymentMethods.list({ customer: customer.id, type: "card", limit: 1 })).data[0]?.id;
        if (!method) return new Response(JSON.stringify({ error: "no_saved_payment_method" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        const pi = await stripe.paymentIntents.create({ amount: delta, currency: "usd", customer: customer.id, payment_method: method, off_session: true, confirm: true, description: `Lodging date change ${reservation.id}`, metadata: { reservation_id: reservation.id, change_request_id: cr.id, type: "lodging_reschedule_delta" } });
        if (pi.status !== "succeeded") return new Response(JSON.stringify({ error: "payment_not_completed", payment_status: pi.status }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        paymentStatus = "captured";
        paymentIntentId = pi.id;
        await admin.from("lodge_reservation_charges").insert({ reservation_id: reservation.id, store_id: reservation.store_id, label: "Date change price difference", amount_cents: delta });
      } else if (delta < 0) {
        paymentStatus = "credit_recorded";
      }

      const nights = daysBetween(cr.proposed_check_in, cr.proposed_check_out);
      await admin.from("lodge_reservations").update({ check_in: cr.proposed_check_in, check_out: cr.proposed_check_out, nights, total_cents: cr.proposed_total_cents, paid_cents: Number(reservation.paid_cents || 0) + Math.max(0, delta) }).eq("id", cr.reservation_id);
      await admin.from("lodge_reservation_audit").insert({ reservation_id: reservation.id, store_id: reservation.store_id, action: "reschedule_approved", actor_id: user.id, notes: host_response || null, metadata: { change_request_id: cr.id, price_delta_cents: delta } }).then(() => null);
    }

    await admin.from("lodge_reservation_change_requests").update({ status: "approved", host_response: host_response || null, decided_by: user.id, decided_at: now, applied_at: now, payment_status: paymentStatus, stripe_payment_intent_id: paymentIntentId }).eq("id", change_request_id);
    await notifyLodgingReservation(admin, { reservationId: cr.reservation_id, event: "reschedule_update", templateName: "lodging-reschedule-update", idempotencyKey: `reschedule-approved-${change_request_id}`, title: "Date change approved", message: "Your lodging reservation has been updated.", templateData: { checkIn: cr.proposed_check_in, checkOut: cr.proposed_check_out, status: "approved" }, smsBody: "ZIVO: Your lodging date change was approved." });
    return new Response(JSON.stringify({ ok: true, status: "approved", payment_status: paymentStatus }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
