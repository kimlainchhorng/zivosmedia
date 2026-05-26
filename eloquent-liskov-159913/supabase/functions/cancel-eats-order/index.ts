/**
 * cancel-eats-order
 * ------------------
 * Customer-initiated cancellation of an Eats order with multi-rail refund.
 *
 * Refund policy (simpler than lodging — food prep is irreversible):
 *   - status in (pending|confirmed) and not yet picked up   → full refund
 *   - status = preparing and no driver assigned             → full refund
 *   - driver assigned OR status in (in_transit|delivered)   → no refund (already cooked / out for delivery)
 *
 * Dispatches the refund by `payment_provider`:
 *   stripe → stripe.refunds.create
 *   paypal → POST /v2/payments/captures/{capture_id}/refund
 *   square → POST /v2/refunds
 *   wallet → credit back to ZIVO wallet
 *   cash   → just mark cancelled (nothing was paid)
 *
 * Idempotent — returns the existing cancellation result if called twice.
 */
import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { notifyEatsRefundIssued } from "../_shared/eats-notifications.ts";
import { cascadeCancellationToDriver } from "../_shared/cancellation-cascade.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

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

Deno.serve(withSecurity("cancel-eats-order", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }
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

    const { order_id, reason, preview } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "missing_order_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: o } = await admin
      .from("food_orders")
      .select("id, customer_id, status, payment_status, payment_provider, total_amount, stripe_payment_id, paypal_capture_id, paypal_order_id, square_payment_id, driver_id, tracking_code")
      .eq("id", order_id)
      .maybeSingle();
    if (!o) {
      return new Response(JSON.stringify({ error: "not_found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if ((o as any).customer_id !== user.id) {
      return new Response(JSON.stringify({ error: "forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const status = String((o as any).status || "").toLowerCase();
    if (["cancelled", "delivered", "completed"].includes(status)) {
      return new Response(JSON.stringify({ error: "already_inactive", current_status: status }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Refund eligibility
    const driverAssigned = !!(o as any).driver_id;
    const inFlight = ["in_transit", "out_for_delivery", "picked_up"].includes(status);
    const eligible = !driverAssigned && !inFlight;
    const totalCents = Math.round(Number((o as any).total_amount || 0) * 100);
    const refundCents = eligible ? totalCents : 0;
    const provider = (o as any).payment_provider as string | null;
    const wasPaid = (o as any).payment_status === "paid";

    if (preview) {
      return new Response(JSON.stringify({
        ok: true,
        preview: true,
        eligible,
        reason_label: eligible ? "Full refund" : driverAssigned ? "Driver already on the way — refund not available" : "Order already in transit",
        refund_cents: refundCents,
        provider: provider || "—",
        total_cents: totalCents,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let stripeRefundId: string | null = null;
    let paypalRefundId: string | null = null;
    let squareRefundId: string | null = null;
    let providerRefundError: string | null = null;
    let nextPaymentStatus = "unpaid";

    if (refundCents > 0 && wasPaid) {
      try {
        if (provider === "stripe" && (o as any).stripe_payment_id) {
          const stripe = new (Stripe as any)(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
          const refund = await stripe.refunds.create({
            payment_intent: (o as any).stripe_payment_id,
            amount: refundCents,
            metadata: { order_id, type: "eats_cancel" },
          });
          stripeRefundId = refund.id;
          nextPaymentStatus = refund.status === "succeeded" ? "refunded" : "refund_pending";

          // Reverse the Stripe Connect auto-transfer (if any) so the refund
          // doesn't come out of platform balance. Idempotent — UNIQUE
          // (order_id, direction) on eats_payout_ledger blocks doubles.
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
                { amount: (ledger as any).amount_cents, metadata: { order_id, reason: "eats_cancel" } },
                { idempotencyKey: `eats-reversal-${order_id}` },
              );
              await admin
                .from("eats_payout_ledger")
                .update({ status: "created", stripe_reversal_id: reversal.id, updated_at: new Date().toISOString() })
                .eq("order_id", order_id)
                .eq("direction", "reversal");
            } catch (revErr: any) {
              const code = (revErr as any)?.code;
              if (code !== "23505") {
                const m = String(revErr?.message || revErr);
                console.error("[cancel-eats-order] reversal failed", m);
                await admin
                  .from("eats_payout_ledger")
                  .update({ status: "failed", error_message: m, updated_at: new Date().toISOString() })
                  .eq("order_id", order_id)
                  .eq("direction", "reversal");
              }
            }
          }
        } else if (provider === "paypal" && (o as any).paypal_capture_id) {
          const tok = await paypalToken();
          const res = await fetch(`${PAYPAL_BASE}/v2/payments/captures/${(o as any).paypal_capture_id}/refund`, {
            method: "POST",
            headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", "PayPal-Request-Id": `refund-eats-${order_id}-${refundCents}` },
            body: JSON.stringify({
              amount: { value: (refundCents / 100).toFixed(2), currency_code: "USD" },
              note_to_payer: "ZIVO Eats cancellation refund",
              invoice_id: order_id,
            }),
          });
          const j = await res.json();
          if (!res.ok) throw new Error(j?.message || j?.details?.[0]?.description || "PayPal refund failed");
          paypalRefundId = j.id ?? null;
          nextPaymentStatus = j.status === "COMPLETED" ? "refunded" : "refund_pending";
        } else if (provider === "square" && (o as any).square_payment_id) {
          const tok = Deno.env.get("SQUARE_ACCESS_TOKEN");
          if (!tok) throw new Error("Square access token not configured");
          const res = await fetch(`${SQUARE_BASE}/v2/refunds`, {
            method: "POST",
            headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", "Square-Version": "2025-01-22" },
            body: JSON.stringify({
              idempotency_key: `refund-eats-${order_id}-${refundCents}`,
              payment_id: (o as any).square_payment_id,
              amount_money: { amount: refundCents, currency: "USD" },
              reason: "ZIVO Eats cancellation",
            }),
          });
          const j = await res.json();
          if (!res.ok) throw new Error(j?.errors?.[0]?.detail || `Square refund failed (${res.status})`);
          squareRefundId = j.refund?.id ?? null;
          nextPaymentStatus = j.refund?.status === "COMPLETED" ? "refunded" : "refund_pending";
        } else if (provider === "wallet") {
          // Credit back to ZIVO wallet — uses existing wallet_transactions infra.
          const { error: walErr } = await admin.from("wallet_transactions").insert({
            user_id: user.id,
            amount_cents: refundCents,
            kind: "refund",
            description: `Eats order ${(o as any).tracking_code ?? order_id} — cancellation refund`,
            metadata: { order_id, type: "eats_cancel" },
          } as any);
          if (walErr) throw walErr;
          nextPaymentStatus = "refunded";
        } else if (provider === "cash") {
          // Cash on delivery — nothing to refund through a gateway.
          nextPaymentStatus = "unpaid";
        } else {
          // Unknown provider — surface for ops review.
          nextPaymentStatus = "refund_pending";
          providerRefundError = `Unknown provider "${provider}"; manual refund required.`;
        }
      } catch (refundErr: any) {
        providerRefundError = String(refundErr?.message || refundErr);
        console.error("[cancel-eats-order] refund failed", provider, providerRefundError);
        nextPaymentStatus = "refund_pending";
      }
    } else if (!wasPaid) {
      // Wasn't paid yet — just mark unpaid.
      nextPaymentStatus = "unpaid";
    }

    // Mark cancelled regardless of refund outcome.
    await admin
      .from("food_orders")
      .update({
        status: "cancelled",
        payment_status: nextPaymentStatus,
        last_payment_error: providerRefundError,
      } as any)
      .eq("id", order_id);

    // Cascade to service_orders + jobs + notify the assigned driver so they
    // stop driving toward this order.
    try {
      await cascadeCancellationToDriver(admin, order_id, "delivery");
    } catch (e) {
      console.warn("[cancel-eats-order] driver cascade skipped", e);
    }

    // Refund-issued email + SMS — only when an actual refund was triggered.
    if (refundCents > 0 && wasPaid) {
      const providerLabels: Record<string, string> = { stripe: "Card", paypal: "PayPal", square: "Square", wallet: "ZIVO Wallet", cash: "Cash" };
      const label = providerLabels[provider as string] ?? "your payment method";
      const status = nextPaymentStatus === "refunded" ? "complete" : "in progress";
      try {
        await notifyEatsRefundIssued(admin, order_id, refundCents, label, status, "you cancelled");
      } catch (e) {
        console.warn("[cancel-eats-order] refund email skipped", e);
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      status: "cancelled",
      eligible,
      refund_cents: refundCents,
      payment_status: nextPaymentStatus,
      provider,
      stripe_refund_id: stripeRefundId,
      paypal_refund_id: paypalRefundId,
      square_refund_id: squareRefundId,
      provider_refund_error: providerRefundError,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[cancel-eats-order]", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
}, { strictCors: true, rateLimit: "payment", trackNetwork: "suspicious" }));
