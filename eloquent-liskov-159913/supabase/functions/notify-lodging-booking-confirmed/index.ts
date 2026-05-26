/**
 * notify-lodging-booking-confirmed
 * ----------------------------------
 * Thin callable wrapper around notifyLodgingBookingConfirmed for payment paths
 * that don't go through a Stripe/PayPal/Square webhook (pay_at_property,
 * bank_transfer, khqr). Idempotent — the underlying helper keys on
 * (reservation_id, paid_cents) so duplicate calls do not double-send.
 *
 * Auth: caller must be the guest on the reservation.
 */
import { createClient } from "../_shared/deps.ts";
import { notifyLodgingBookingConfirmed } from "../_shared/lodging-notifications.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PAY_METHOD_LABELS: Record<string, string> = {
  pay_at_property: "Pay at Property",
  bank_transfer: "Bank Transfer",
  khqr: "KHQR / ABA Pay",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reservationId, paymentMethod } = await req.json();
    if (!reservationId) {
      return new Response(JSON.stringify({ error: "missing_reservationId" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: r } = await admin
      .from("lodge_reservations")
      .select("id, guest_id")
      .eq("id", reservationId)
      .maybeSingle();

    if (!r) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((r as any).guest_id !== user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const label = PAY_METHOD_LABELS[String(paymentMethod || "")] || String(paymentMethod || "Other");
    await notifyLodgingBookingConfirmed(admin, reservationId, label);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[notify-lodging-booking-confirmed]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
