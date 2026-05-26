/**
 * notify-eats-order-confirmed
 * ----------------------------
 * Tiny callable wrapper around notifyEatsOrderConfirmed for payment paths
 * that don't go through a Stripe/PayPal/Square webhook (wallet, eventually
 * cash-on-delivery once the driver marks it paid).
 *
 * Auth: caller must own the order. Idempotent — the helper keys on
 * (order_id, paid_cents) so calling twice does not double-send.
 */
import { createClient } from "../_shared/deps.ts";
import { notifyEatsOrderConfirmed } from "../_shared/eats-notifications.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
      return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { order_id, payment_method } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "missing_order_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: o } = await admin.from("food_orders").select("id, customer_id, payment_status").eq("id", order_id).maybeSingle();
    if (!o) {
      return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if ((o as any).customer_id !== user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if ((o as any).payment_status !== "paid") {
      return new Response(JSON.stringify({ error: "not_paid", payment_status: (o as any).payment_status }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await notifyEatsOrderConfirmed(admin, order_id, String(payment_method || "Wallet"));
    return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[notify-eats-order-confirmed]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
