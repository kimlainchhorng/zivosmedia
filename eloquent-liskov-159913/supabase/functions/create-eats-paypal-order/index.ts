/**
 * create-eats-paypal-order
 * -------------------------
 * Creates a PayPal Order for a placed eats order. Returns approve_url. The SPA
 * redirects the buyer to PayPal; on approval they come back to ?eats_paypal_return=...
 * and capture-eats-paypal-order finalises the payment.
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

Deno.serve(withSecurity("create-eats-paypal-order", async (req, ctx) => {
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

    const { order_id, amount_cents, return_url, cancel_url } = await req.json();
    if (!order_id || !amount_cents || amount_cents < 50) {
      return new Response(JSON.stringify({ error: "Invalid order_id or amount" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: order } = await admin
      .from("food_orders")
      .select("id, customer_id, payment_status, total")
      .eq("id", order_id)
      .maybeSingle();
    if (!order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    if ((order as any).customer_id !== user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    if (["paid", "refunded"].includes((order as any).payment_status)) return new Response(JSON.stringify({ error: "Order already settled" }), { status: 409, headers: { ...cors, "Content-Type": "application/json" } });

    const accessToken = await token();
    const orderRes = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "PayPal-Request-Id": `eats-${order_id}-${amount_cents}` },
      body: JSON.stringify({
        intent: "CAPTURE",
        purchase_units: [{
          reference_id: order_id,
          custom_id: order_id,
          description: "ZIVO Eats order",
          amount: { currency_code: "USD", value: (amount_cents / 100).toFixed(2) },
        }],
        application_context: {
          brand_name: "ZIVO",
          shipping_preference: "NO_SHIPPING",
          user_action: "PAY_NOW",
          return_url: safeRedirectUrl(req, return_url, "/orders"),
          cancel_url: safeRedirectUrl(req, cancel_url, "/orders"),
        },
      }),
    });
    const orderJson = await orderRes.json();
    if (!orderRes.ok) {
      return new Response(JSON.stringify({ error: orderJson?.message || "PayPal order create failed" }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }

    const approveLink = orderJson.links?.find((l: any) => l.rel === "approve")?.href ?? null;
    await admin
      .from("food_orders")
      .update({ payment_provider: "paypal", paypal_order_id: orderJson.id, payment_status: "pending" } as any)
      .eq("id", order_id);

    return new Response(JSON.stringify({ order_id: orderJson.id, approve_url: approveLink }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[create-eats-paypal-order]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function safeRedirectUrl(req: Request, value: unknown, fallbackPath: string) {
  const origin = req.headers.get("origin") || "https://hizivo.com";
  const fallback = `${origin}${fallbackPath}`;
  if (typeof value !== "string" || !value) return fallback;
  try {
    const url = new URL(value, origin);
    return url.origin === origin ? url.toString() : fallback;
  } catch {
    return fallback;
  }
}
