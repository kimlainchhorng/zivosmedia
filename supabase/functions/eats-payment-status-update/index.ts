/**
 * eats-payment-status-update
 * --------------------------
 * Server-gated payment status transitions for Eats orders.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type Action = "card_processing" | "cash_on_delivery" | "wallet_paid" | "payment_failed";
type Body = {
  action?: unknown;
  order_id?: unknown;
  error_message?: unknown;
};

serve(withSecurity("eats-payment-status-update", async (req, ctx) => {
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
  const orderId = cleanUuid(body.order_id);
  const action = cleanAction(body.action);
  if (!orderId || !action) return json({ error: "Invalid payment status request" }, 400);

  const { data: order, error: orderError } = await admin
    .from("food_orders")
    .select("id, customer_id, user_id, payment_type, payment_status")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) {
    console.error("[eats-payment-status-update:lookup]", orderError.message);
    return json({ error: "Could not verify order" }, 500);
  }
  if (!order) return json({ error: "Order not found" }, 404);
  if (order.customer_id !== user.id && order.user_id !== user.id) {
    return json({ error: "Not authorized for this order" }, 403);
  }

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (action === "card_processing") {
    if (order.payment_type !== "card") return json({ error: "Order is not a card payment" }, 400);
    update.payment_status = "processing";
  } else if (action === "cash_on_delivery") {
    if (order.payment_type !== "cash") return json({ error: "Order is not cash on delivery" }, 400);
    update.payment_status = "cash_on_delivery";
  } else if (action === "wallet_paid") {
    if (order.payment_type !== "wallet") return json({ error: "Order is not a wallet payment" }, 400);
    const ledgerOk = await hasWalletPaymentLedger(admin, user.id, orderId);
    if (!ledgerOk) return json({ error: "Wallet payment ledger not found" }, 409);
    update.payment_status = "paid";
    update.payment_provider = "wallet";
    update.last_payment_error = null;
  } else if (action === "payment_failed") {
    if (order.payment_status === "paid") return json({ error: "Paid orders cannot be marked failed" }, 409);
    update.payment_status = "failed";
    update.last_payment_error = cleanText(body.error_message, 180) ?? "Payment setup failed";
  }

  const { data, error } = await admin
    .from("food_orders")
    .update(update)
    .eq("id", orderId)
    .select("id, payment_status, payment_provider")
    .maybeSingle();
  if (error) {
    console.error("[eats-payment-status-update:update]", error.message);
    return json({ error: "Could not update payment status" }, 500);
  }

  return json({ ok: true, order: data });
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function hasWalletPaymentLedger(admin: any, userId: string, orderId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("customer_wallet_transactions")
    .select("id")
    .eq("user_id", userId)
    .eq("reference_id", orderId)
    .eq("type", "payment")
    .lt("amount_cents", 0)
    .maybeSingle();
  if (error) {
    console.error("[eats-payment-status-update:ledger]", error.message);
    return false;
  }
  return Boolean(data?.id);
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanAction(value: unknown): Action | null {
  if (
    value === "card_processing" ||
    value === "cash_on_delivery" ||
    value === "wallet_paid" ||
    value === "payment_failed"
  ) {
    return value;
  }
  return null;
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}
