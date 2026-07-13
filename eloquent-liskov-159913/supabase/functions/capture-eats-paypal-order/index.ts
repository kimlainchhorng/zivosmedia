/**
 * capture-eats-paypal-order
 * --------------------------
 * Called from the SPA after the buyer returns from PayPal approval. Idempotent —
 * skips if paypal_capture_id is already stamped on the order.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const PAYPAL_BASE = (Deno.env.get("PAYPAL_MODE") ?? "live") === "sandbox"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";

async function token() {
  const id = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal credentials not configured");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${await res.text()}`);
  return (await res.json()).access_token as string;
}

Deno.serve(withSecurity("capture-eats-paypal-order", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: req.headers.get("authorization") ?? "" } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { order_id } = await req.json();
    if (!order_id) return new Response(JSON.stringify({ error: "Missing order_id" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: o } = await admin
      .from("food_orders")
      .select("id, customer_id, payment_status, paypal_capture_id")
      .eq("paypal_order_id", order_id)
      .maybeSingle();
    if (!o) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    if ((o as any).customer_id !== user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    if ((o as any).paypal_capture_id) {
      return new Response(JSON.stringify({ ok: true, status: "already_captured", capture_id: (o as any).paypal_capture_id }), { headers: { ...cors, "Content-Type": "application/json" } });
    }

    const accessToken = await token();
    const capRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${order_id}/capture`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "PayPal-Request-Id": `cap-eats-${order_id}` },
    });
    const capJson = await capRes.json();
    if (!capRes.ok) {
      const msg = capJson?.message || "Capture failed";
      await admin.from("food_orders").update({ payment_status: "failed", last_payment_error: msg } as any).eq("id", (o as any).id);
      return new Response(JSON.stringify({ error: msg }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const cap = capJson.purchase_units?.[0]?.payments?.captures?.[0];
    const captureId = cap?.id ?? null;
    await admin
      .from("food_orders")
      .update({ paypal_capture_id: captureId, payment_status: "paid", last_payment_error: null } as any)
      .eq("id", (o as any).id);

    return new Response(JSON.stringify({ ok: true, capture_id: captureId, payment_status: "paid" }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[capture-eats-paypal-order]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
