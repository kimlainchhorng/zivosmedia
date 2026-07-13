/**
 * create-grocery-square-checkout
 * -------------------------------
 * Creates a Square Payment Link for a grocery shopping_orders row.
 * SPA redirects to the URL. Square posts payment.updated to square-grocery-webhook.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const SQUARE_BASE = (Deno.env.get("SQUARE_MODE") ?? "production") === "sandbox"
  ? "https://connect.squareupsandbox.com"
  : "https://connect.squareup.com";

Deno.serve(withSecurity("create-grocery-square-checkout", async (req, ctx) => {
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
    const accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
    const locationId = Deno.env.get("SQUARE_LOCATION_ID");
    if (!accessToken || !locationId) {
      return new Response(JSON.stringify({ error: "Square not configured" }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: req.headers.get("authorization") ?? "" } } });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Authentication required" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const { order_id, amount_cents, return_url } = await req.json();
    if (!order_id || !amount_cents || amount_cents < 50) {
      return new Response(JSON.stringify({ error: "Invalid order_id or amount" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: order } = await admin
      .from("shopping_orders")
      .select("id, user_id, payment_status")
      .eq("id", order_id)
      .maybeSingle();
    if (!order) return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...cors, "Content-Type": "application/json" } });
    if ((order as any).user_id !== user.id) return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...cors, "Content-Type": "application/json" } });
    if (["paid", "refunded"].includes((order as any).payment_status)) return new Response(JSON.stringify({ error: "Order already settled" }), { status: 409, headers: { ...cors, "Content-Type": "application/json" } });

    const idemKey = `grocery-${order_id}-${amount_cents}`;
    const linkRes = await fetch(`${SQUARE_BASE}/v2/online-checkout/payment-links`, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "Square-Version": "2025-01-22" },
      body: JSON.stringify({
        idempotency_key: idemKey,
        quick_pay: { name: "ZIVO Grocery order", price_money: { amount: amount_cents, currency: "USD" }, location_id: locationId },
        checkout_options: {
          redirect_url: safeRedirectUrl(req, return_url, "/grocery/orders"),
          ask_for_shipping_address: false,
        },
        pre_populated_data: { buyer_email: user.email ?? undefined },
        payment_note: `Grocery order ${order_id}`,
      }),
    });
    const linkJson = await linkRes.json();
    if (!linkRes.ok) {
      return new Response(JSON.stringify({ error: linkJson?.errors?.[0]?.detail || `Square API error ${linkRes.status}` }), { status: 502, headers: { ...cors, "Content-Type": "application/json" } });
    }
    const checkoutId: string = linkJson.payment_link?.id;
    const url: string = linkJson.payment_link?.url;
    await admin
      .from("shopping_orders")
      .update({ payment_provider: "square", square_checkout_id: checkoutId, payment_status: "pending" } as any)
      .eq("id", order_id);

    return new Response(JSON.stringify({ url, checkout_id: checkoutId }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[create-grocery-square-checkout]", msg);
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
