/**
 * restaurant-cancel-order
 * ------------------------
 * Restaurant-initiated cancellation of a food order. The previous UI ran a
 * bare `food_orders.update({ status: "cancelled" })` — keeping the customer's
 * money, leaving the driver en route, and silently. This function does it
 * properly:
 *
 *   1. Auth + ownership: caller must own the restaurant
 *   2. Refund the customer (multi-rail: stripe / paypal / square / wallet)
 *   3. Reverse the Stripe Connect auto-transfer if it was already queued
 *   4. Mark food_orders.status = 'cancelled', payment_status accordingly
 *   5. Cascade to service_orders + jobs + push the assigned driver
 *   6. Email + SMS the customer (refund-issued template)
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import Stripe from "../_shared/stripe.ts";
import { notifyEatsRefundIssued } from "../_shared/eats-notifications.ts";
import { cascadeCancellationToDriver } from "../_shared/cancellation-cascade.ts";

const PAYPAL_BASE = (Deno.env.get("PAYPAL_MODE") ?? "live") === "sandbox"
  ? "https://api-m.sandbox.paypal.com"
  : "https://api-m.paypal.com";
const SQUARE_BASE = (Deno.env.get("SQUARE_MODE") ?? "production") === "sandbox"
  ? "https://connect.squareupsandbox.com"
  : "https://connect.squareup.com";

async function paypalToken(): Promise<string> {
  const id = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal credentials not configured");
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: "POST",
    headers: { Authorization: `Basic ${btoa(`${id}:${secret}`)}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${await res.text()}`);
  return (await res.json()).access_token;
}

Deno.serve(withSecurity("restaurant-cancel-order", async (req, ctx) => {
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
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") || "";

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { order_id, reason } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: order } = await admin
      .from("food_orders")
      .select("id, customer_id, restaurant_id, status, payment_status, payment_provider, total_amount, stripe_payment_id, paypal_capture_id, paypal_order_id, square_payment_id, tracking_code")
      .eq("id", order_id)
      .maybeSingle();
    if (!order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Auth: caller must own the restaurant.
    const { data: restaurant } = await admin
      .from("restaurants")
      .select("id, owner_id, name")
      .eq("id", (order as any).restaurant_id)
      .maybeSingle();
    if (!restaurant || (restaurant as any).owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const status = String((order as any).status || "").toLowerCase();
    if (["cancelled", "delivered", "completed"].includes(status)) {
      return new Response(JSON.stringify({ error: "already_inactive", current_status: status }), {
        status: 409, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Restaurant cancel = full refund to customer (no fee, restaurant fault).
    const totalCents = Math.round(Number((order as any).total_amount || 0) * 100);
    const refundCents = totalCents;
    const provider = (order as any).payment_provider as string | null;
    const wasPaid = (order as any).payment_status === "paid";

    let stripeRefundId: string | null = null;
    let paypalRefundId: string | null = null;
    let squareRefundId: string | null = null;
    let providerRefundError: string | null = null;
    let nextPaymentStatus = "unpaid";

    if (refundCents > 0 && wasPaid) {
      try {
        if (provider === "stripe" && (order as any).stripe_payment_id) {
          const stripe = new (Stripe as any)(stripeKey, { apiVersion: "2025-08-27.basil" });
          const refund = await stripe.refunds.create({
            payment_intent: (order as any).stripe_payment_id,
            amount: refundCents,
            metadata: { order_id, type: "restaurant_cancel" },
          });
          stripeRefundId = refund.id;
          nextPaymentStatus = refund.status === "succeeded" ? "refunded" : "refund_pending";

          // Reverse the auto-transfer to the restaurant (if any).
          const { data: ledger } = await admin
            .from("eats_payout_ledger")
            .select("id, stripe_transfer_id, amount_cents, restaurant_id, stripe_account_id")
            .eq("order_id", order_id)
            .eq("direction", "transfer")
            .eq("status", "created")
            .maybeSingle();
          if (ledger && (ledger as any).stripe_transfer_id) {
            try {
              await admin.from("eats_payout_ledger").insert({
                order_id,
                restaurant_id: (ledger as any).restaurant_id,
                stripe_account_id: (ledger as any).stripe_account_id,
                direction: "reversal",
                amount_cents: (ledger as any).amount_cents,
                commission_cents: 0,
                status: "queued",
              });
              const reversal = await stripe.transfers.createReversal(
                (ledger as any).stripe_transfer_id,
                { amount: (ledger as any).amount_cents, metadata: { order_id, reason: "restaurant_cancel" } },
                { idempotencyKey: `eats-rest-rev-${order_id}` },
              );
              await admin.from("eats_payout_ledger")
                .update({ status: "created", stripe_reversal_id: reversal.id, updated_at: new Date().toISOString() })
                .eq("order_id", order_id).eq("direction", "reversal");
            } catch (revErr: any) {
              if ((revErr as any)?.code !== "23505") {
                console.error("[restaurant-cancel-order] reversal failed", revErr?.message || revErr);
                await admin.from("eats_payout_ledger")
                  .update({ status: "failed", error_message: String(revErr?.message || revErr), updated_at: new Date().toISOString() })
                  .eq("order_id", order_id).eq("direction", "reversal");
              }
            }
          }
        } else if (provider === "paypal" && (order as any).paypal_capture_id) {
          const tok = await paypalToken();
          const res = await fetch(`${PAYPAL_BASE}/v2/payments/captures/${(order as any).paypal_capture_id}/refund`, {
            method: "POST",
            headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", "PayPal-Request-Id": `rest-cancel-${order_id}-${refundCents}` },
            body: JSON.stringify({
              amount: { value: (refundCents / 100).toFixed(2), currency_code: "USD" },
              note_to_payer: "ZIVO Eats — restaurant cancelled",
              invoice_id: order_id,
            }),
          });
          const j = await res.json();
          if (!res.ok) throw new Error(j?.message || "PayPal refund failed");
          paypalRefundId = j.id ?? null;
          nextPaymentStatus = j.status === "COMPLETED" ? "refunded" : "refund_pending";
        } else if (provider === "square" && (order as any).square_payment_id) {
          const tok = Deno.env.get("SQUARE_ACCESS_TOKEN");
          if (!tok) throw new Error("Square access token not configured");
          const res = await fetch(`${SQUARE_BASE}/v2/refunds`, {
            method: "POST",
            headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", "Square-Version": "2025-01-22" },
            body: JSON.stringify({
              idempotency_key: `rest-cancel-${order_id}-${refundCents}`,
              payment_id: (order as any).square_payment_id,
              amount_money: { amount: refundCents, currency: "USD" },
              reason: "ZIVO Eats — restaurant cancelled",
            }),
          });
          const j = await res.json();
          if (!res.ok) throw new Error(j?.errors?.[0]?.detail || `Square refund failed (${res.status})`);
          squareRefundId = j.refund?.id ?? null;
          nextPaymentStatus = j.refund?.status === "COMPLETED" ? "refunded" : "refund_pending";
        } else if (provider === "wallet") {
          const { error: walErr } = await admin.from("wallet_transactions").insert({
            user_id: (order as any).customer_id,
            amount_cents: refundCents,
            kind: "refund",
            description: `Eats order ${(order as any).tracking_code || order_id} — restaurant cancelled`,
            metadata: { order_id, type: "restaurant_cancel" },
          } as any);
          if (walErr) throw walErr;
          nextPaymentStatus = "refunded";
        } else if (provider === "cash") {
          nextPaymentStatus = "unpaid";
        } else {
          nextPaymentStatus = "refund_pending";
          providerRefundError = `Unknown provider "${provider}"; manual refund required.`;
        }
      } catch (refundErr: any) {
        providerRefundError = String(refundErr?.message || refundErr);
        console.error("[restaurant-cancel-order] refund failed", provider, providerRefundError);
        nextPaymentStatus = "refund_pending";
      }
    } else if (!wasPaid) {
      nextPaymentStatus = "unpaid";
    }

    await admin
      .from("food_orders")
      .update({
        status: "cancelled",
        payment_status: nextPaymentStatus,
        last_payment_error: providerRefundError ? `Restaurant cancelled: ${providerRefundError}` : null,
        cancel_reason: reason ? String(reason).slice(0, 500) : "Restaurant cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: "restaurant",
      } as any)
      .eq("id", order_id);

    // Cascade to service_orders + jobs + assigned driver.
    try { await cascadeCancellationToDriver(admin, order_id, "delivery"); }
    catch (e) { console.warn("[restaurant-cancel-order] cascade skipped", e); }

    // Email + SMS the customer about the refund.
    if (refundCents > 0 && wasPaid) {
      const providerLabels: Record<string, string> = {
        stripe: "Card", paypal: "PayPal", square: "Square", wallet: "ZIVO Wallet", cash: "Cash",
      };
      const label = providerLabels[provider as string] ?? "your payment method";
      const refundStatus = nextPaymentStatus === "refunded" ? "complete" : "in progress";
      try {
        await notifyEatsRefundIssued(
          admin, order_id, refundCents, label, refundStatus,
          `${(restaurant as any).name || "the restaurant"} cancelled your order`,
        );
      } catch (e) { console.warn("[restaurant-cancel-order] refund email skipped", e); }
    }

    return new Response(JSON.stringify({
      ok: true,
      status: "cancelled",
      refund_cents: refundCents,
      payment_status: nextPaymentStatus,
      provider,
      stripe_refund_id: stripeRefundId,
      paypal_refund_id: paypalRefundId,
      square_refund_id: squareRefundId,
      provider_refund_error: providerRefundError,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[restaurant-cancel-order]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
