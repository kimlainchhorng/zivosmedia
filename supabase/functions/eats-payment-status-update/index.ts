/**
 * eats-payment-status-update
 * --------------------------
 * Server-gated payment status transitions and synchronous Eats dispatch
 * reconciliation for wallet and cash-on-delivery orders.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { notifyEatsOrderConfirmed } from "../_shared/eats-notifications.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DISPATCH_PENDING_ERROR = "delivery_dispatch_pending";

type Action =
  | "card_processing"
  | "cash_on_delivery"
  | "wallet_paid"
  | "payment_failed"
  | "retry_dispatch";
type Body = {
  action?: unknown;
  order_id?: unknown;
  error_message?: unknown;
};

type WalletLedgerCheck = {
  found: boolean;
  lookupFailed: boolean;
};

serve(
  withSecurity(
    "eats-payment-status-update",
    async (req, ctx) => {
      const corsHeaders = ctx.corsHeaders;
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      if (req.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (!supabaseUrl || !serviceKey) {
        return json({ error: "Payment service unavailable" }, 500);
      }

      const token = req.headers
        .get("Authorization")
        ?.match(/^Bearer\s+(.+)$/i)?.[1];
      if (!token) return json({ error: "Unauthorized" }, 401);

      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { persistSession: false },
      }) as any;
      const { data: authData } = await admin.auth.getUser(token);
      const user = authData.user;
      if (!user) return json({ error: "Unauthorized" }, 401);

      const body = (await req.json().catch(() => ({}))) as Body;
      const orderId = cleanUuid(body.order_id);
      const action = cleanAction(body.action);
      if (!orderId || !action) {
        return json({ error: "Invalid payment status request" }, 400);
      }

      const { data: order, error: orderError } = await admin
        .from("food_orders")
        .select(
          "id, customer_id, status, payment_type, payment_status, payment_provider, total_amount, last_payment_error",
        )
        .eq("id", orderId)
        .maybeSingle();
      if (orderError) {
        console.error(
          "[eats-payment-status-update:lookup]",
          orderError.message,
        );
        return json({ error: "Could not verify order" }, 500);
      }
      if (!order) return json({ error: "Order not found" }, 404);
      if (order.customer_id !== user.id) {
        return json({ error: "Not authorized for this order" }, 403);
      }
      if (order.status === "cancelled") {
        return json({ error: "Cancelled orders cannot be reconciled" }, 409);
      }

      if (action === "retry_dispatch") {
        if (
          order.last_payment_error !== DISPATCH_PENDING_ERROR ||
          !["paid", "cash_on_delivery"].includes(order.payment_status ?? "")
        ) {
          return json(
            { error: "Order does not require dispatch recovery" },
            409,
          );
        }

        const dispatched = await dispatchOrder(
          supabaseUrl,
          serviceKey,
          orderId,
        );
        if (!dispatched) {
          return json(
            {
              ok: false,
              state: "retryable",
              code: "dispatch_pending",
              payment_confirmed: true,
              dispatch_pending: true,
              order,
            },
            503,
          );
        }

        const { data: reconciledOrder, error: clearError } = await admin
          .from("food_orders")
          .update({
            last_payment_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId)
          .neq("status", "cancelled")
          .neq("status", "refunded")
          .select("id, payment_status, payment_provider, last_payment_error")
          .maybeSingle();
        if (clearError || !reconciledOrder) {
          if (clearError) {
            console.error(
              "[eats-payment-status-update:clear-dispatch-marker]",
              clearError.message,
            );
          }
          return json(
            {
              ok: false,
              state: "retryable",
              code: "dispatch_pending",
              payment_confirmed: true,
              dispatch_pending: true,
              order,
            },
            503,
          );
        }

        return json({
          ok: true,
          state: "confirmed",
          order: reconciledOrder,
        });
      }

      if (action === "wallet_paid" || action === "cash_on_delivery") {
        const paymentUpdate: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
          last_payment_error: DISPATCH_PENDING_ERROR,
        };

        if (action === "wallet_paid") {
          if (order.payment_type !== "wallet") {
            return json({ error: "Order is not a wallet payment" }, 400);
          }

          const expectedAmountCents = Math.round(
            Number(order.total_amount) * 100,
          );
          if (
            !Number.isSafeInteger(expectedAmountCents) ||
            expectedAmountCents <= 0
          ) {
            return json(
              { error: "Could not verify wallet payment amount" },
              500,
            );
          }

          const ledger = await hasWalletPaymentLedger(
            admin,
            user.id,
            orderId,
            expectedAmountCents,
          );
          if (ledger.lookupFailed) {
            return json({ error: "Could not verify wallet payment" }, 500);
          }
          if (!ledger.found) {
            return json({ error: "Wallet payment ledger not found" }, 409);
          }

          paymentUpdate.payment_status = "paid";
          paymentUpdate.payment_provider = "wallet";
        } else {
          if (order.payment_type !== "cash") {
            return json({ error: "Order is not cash on delivery" }, 400);
          }
          paymentUpdate.payment_status = "cash_on_delivery";
          paymentUpdate.payment_provider = "cash";
        }

        // Persist the retry marker in the same write as the payment transition,
        // before making the external dispatch call. A crash cannot leave a paid
        // or COD order without an authoritative reconciliation marker.
        const { data: pendingOrder, error: pendingError } = await admin
          .from("food_orders")
          .update(paymentUpdate)
          .eq("id", orderId)
          .neq("status", "cancelled")
          .neq("status", "refunded")
          .select("id, payment_status, payment_provider, last_payment_error")
          .maybeSingle();
        if (pendingError) {
          console.error(
            "[eats-payment-status-update:update]",
            pendingError.message,
          );
          return json({ error: "Could not update payment status" }, 500);
        }
        if (!pendingOrder) {
          return json({ error: "Order is no longer dispatchable" }, 409);
        }

        const dispatched = await dispatchOrder(
          supabaseUrl,
          serviceKey,
          orderId,
        );
        if (!dispatched) {
          return json(
            {
              ok: false,
              state: "retryable",
              code: "dispatch_pending",
              payment_confirmed: true,
              dispatch_pending: true,
            },
            503,
          );
        }

        const { data: reconciledOrder, error: clearError } = await admin
          .from("food_orders")
          .update({
            last_payment_error: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId)
          .neq("status", "cancelled")
          .neq("status", "refunded")
          .select("id, payment_status, payment_provider, last_payment_error")
          .maybeSingle();
        if (clearError || !reconciledOrder) {
          if (clearError) {
            console.error(
              "[eats-payment-status-update:clear-dispatch-marker]",
              clearError.message,
            );
          }
          return json(
            {
              ok: false,
              state: "retryable",
              code: "dispatch_pending",
              payment_confirmed: true,
              dispatch_pending: true,
            },
            503,
          );
        }

        if (action === "wallet_paid") {
          // The notification helper uses an order-derived idempotency key. Keep
          // this server-side so every recovery retry shares the same key.
          await notifyEatsOrderConfirmed(admin, orderId, "ZIVO Wallet");
        }

        return json({
          ok: true,
          state: "confirmed",
          order: reconciledOrder,
        });
      }

      if (action === "card_processing") {
        if (order.payment_type !== "card") {
          return json({ error: "Order is not a card payment" }, 400);
        }
      } else if (action === "payment_failed") {
        if (
          ["paid", "refund_pending", "refunded"].includes(
            order.payment_status ?? "",
          )
        ) {
          return json({ error: "Settled orders cannot be marked failed" }, 409);
        }

        if (order.payment_type === "wallet") {
          const expectedAmountCents = Math.round(
            Number(order.total_amount) * 100,
          );
          if (
            !Number.isSafeInteger(expectedAmountCents) ||
            expectedAmountCents <= 0
          ) {
            return json(
              { error: "Could not verify wallet payment amount" },
              500,
            );
          }

          const ledger = await hasWalletPaymentLedger(
            admin,
            user.id,
            orderId,
            expectedAmountCents,
          );
          if (ledger.lookupFailed) {
            return json({ error: "Could not verify wallet payment" }, 500);
          }
          if (ledger.found) {
            return json(
              { error: "Wallet payment requires reconciliation" },
              409,
            );
          }
        }
      }

      const provider =
        order.payment_provider ??
        (order.payment_type === "card" ? "stripe" : order.payment_type);
      const { data: transitionData, error: transitionError } = await admin.rpc(
        "transition_eats_payment_status",
        {
          p_order_id: orderId,
          p_provider: provider,
          p_payment_id: null,
          p_next_status: action === "card_processing" ? "processing" : "failed",
          p_error:
            action === "payment_failed"
              ? (cleanText(body.error_message, 180) ?? "Payment setup failed")
              : null,
        },
      );
      if (transitionError) {
        console.error(
          "[eats-payment-status-update:transition]",
          transitionError.message,
        );
        return json({ error: "Could not update payment status" }, 500);
      }
      const transition = rpcObject(transitionData);
      if (!transition?.ok) {
        return json(
          {
            error: "Payment status changed before this request completed",
            code: transition?.code ?? "stale_transition",
            payment_status: transition?.payment_status,
          },
          409,
        );
      }

      return json({
        ok: true,
        order: {
          id: orderId,
          payment_status: transition.payment_status,
          payment_provider: provider,
          last_payment_error:
            action === "payment_failed"
              ? (cleanText(body.error_message, 180) ?? "Payment setup failed")
              : null,
        },
      });
    },
    {
      allowedMethods: ["POST"],
      strictCors: true,
      rateLimit: "payment",
      trackNetwork: "suspicious",
      blockNetworkRiskAt: 80,
    },
  ),
);

async function hasWalletPaymentLedger(
  admin: any,
  userId: string,
  orderId: string,
  expectedAmountCents: number,
): Promise<WalletLedgerCheck> {
  const { data, error } = await admin
    .from("customer_wallet_transactions")
    .select("id")
    .eq("user_id", userId)
    .or(`reference_id.eq.${orderId},order_id.eq.${orderId}`)
    .in("type", ["purchase", "payment"])
    .eq("amount_cents", -expectedAmountCents)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("[eats-payment-status-update:ledger]", error.message);
    return { found: false, lookupFailed: true };
  }
  return { found: Boolean(data?.id), lookupFailed: false };
}

async function dispatchOrder(
  supabaseUrl: string,
  serviceKey: string,
  orderId: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/dispatch-eats-order`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ order_id: orderId }),
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.ok !== true) {
      console.error("[eats-payment-status-update:dispatch]", {
        status: response.status,
        accepted: payload?.ok === true,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error("[eats-payment-status-update:dispatch]", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return false;
  }
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
    value === "payment_failed" ||
    value === "retry_dispatch"
  ) {
    return value;
  }
  return null;
}

function rpcObject(value: unknown): Record<string, any> | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && typeof candidate === "object"
    ? (candidate as Record<string, any>)
    : null;
}

function cleanText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  return text.slice(0, maxLength);
}
