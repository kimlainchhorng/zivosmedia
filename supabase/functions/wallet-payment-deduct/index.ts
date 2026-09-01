/**
 * wallet-payment-deduct
 * ---------------------
 * Server-gated customer wallet debit for checkout payments.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_PAYMENT_CENTS = 5_000_000;

type Body = {
  user_id?: unknown;
  amount_cents?: unknown;
  order_id?: unknown;
  description?: unknown;
};

serve(withSecurity("wallet-payment-deduct", async (req, ctx) => {
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
  const requestedUserId = cleanUuid(body.user_id);
  const orderId = cleanUuid(body.order_id);
  const amountCents = cleanAmount(body.amount_cents);
  const description = cleanDescription(body.description);
  if (!requestedUserId || requestedUserId !== user.id || !orderId || amountCents === null) {
    return json({ error: "Invalid wallet payment request" }, 400);
  }

  const { data: order, error: orderError } = await admin
    .from("food_orders")
    .select("id, customer_id, status, payment_type, payment_status, total_amount")
    .eq("id", orderId)
    .maybeSingle();
  if (orderError) {
    console.error("[wallet-payment-deduct:order]", orderError.message);
    return json({ error: "Could not verify order" }, 500);
  }
  if (!order) return json({ error: "Order not found", not_charged: true }, 404);
  if (order.customer_id !== user.id) return json({ error: "Forbidden" }, 403);
  if (order.payment_type !== "wallet") {
    return json({ error: "Order is not a wallet payment", not_charged: true }, 400);
  }
  if (order.status === "cancelled" || ["refunded", "refund_pending"].includes(order.payment_status ?? "")) {
    return json({ error: "Order can no longer be charged", not_charged: true }, 409);
  }

  const expectedAmountCents = Math.round(Number(order.total_amount) * 100);
  if (!Number.isSafeInteger(expectedAmountCents) || expectedAmountCents <= 0) {
    return json({ error: "Order total is unavailable", not_charged: true }, 409);
  }
  if (expectedAmountCents !== amountCents) {
    return json({ error: "Wallet amount does not match the order", not_charged: true }, 409);
  }

  const { data, error } = await admin.rpc("process_customer_wallet_payment", {
    p_user_id: user.id,
    p_amount_cents: expectedAmountCents,
    p_description: description,
    p_reference_id: orderId,
  });

  if (error) {
    const message = String(error.message ?? "");
    if (message.includes("wallet_not_found")) {
      return json({ ok: false, error: "Wallet not found", not_charged: true });
    }
    if (message.includes("insufficient_funds")) {
      return json({ ok: false, error: "Insufficient wallet balance", not_charged: true });
    }
    if (message.includes("wallet_payment_reference_amount_mismatch")) {
      return json(
        {
          ok: false,
          error: "Existing wallet payment needs reconciliation",
          reconciliation_required: true,
        },
        409,
      );
    }
    if (message.includes("invalid_amount")) return json({ error: "Invalid amount" }, 400);
    console.error("[wallet-payment-deduct]", error.message);
    return json({ error: "Wallet payment failed" }, 500);
  }

  const result = Array.isArray(data) ? data[0] : data;
  return json({
    ok: true,
    charged: true,
    transactionId: result?.transaction_id ?? null,
    newBalance: Number(result?.new_balance_cents ?? 0),
  });
}, { allowedMethods: ["POST"], strictCors: true, rateLimit: "payment", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanAmount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value <= 0 || value > MAX_PAYMENT_CENTS) return null;
  return value;
}

function cleanDescription(value: unknown): string {
  if (typeof value !== "string") return "Wallet payment";
  const description = value.trim().slice(0, 180);
  return description || "Wallet payment";
}
