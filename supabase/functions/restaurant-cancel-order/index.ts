/**
 * Restaurant-initiated Eats cancellation. Ownership, cancellation state,
 * exact refunds, driver cascade, and payout reversal are all retry-safe.
 */
import { createClient } from "../_shared/deps.ts";
import Stripe from "../_shared/stripe.ts";
import { notifyEatsRefundIssued } from "../_shared/eats-notifications.ts";
import { cascadeCancellationToDriver } from "../_shared/cancellation-cascade.ts";
import { requireExplicitProviderMode } from "../_shared/providerMode.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

type RpcResult = Record<string, any>;
type RefundEvidence = {
  id: string;
  amountCents: number;
  currency: string;
  status: "succeeded" | "pending" | "failed";
  error?: string;
};

function normalizeRefundStatus(value: unknown): RefundEvidence["status"] {
  const status = String(value ?? "")
    .trim()
    .toUpperCase();
  if (["SUCCEEDED", "COMPLETED"].includes(status)) return "succeeded";
  if (
    ["FAILED", "REJECTED", "DECLINED", "CANCELED", "CANCELLED"].includes(status)
  )
    return "failed";
  return "pending";
}

function rpcObject(value: unknown): RpcResult | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && typeof candidate === "object"
    ? (candidate as RpcResult)
    : null;
}

function paypalBase(): string {
  return requireExplicitProviderMode("PAYPAL_MODE") === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
}

function squareBase(): string {
  return requireExplicitProviderMode("SQUARE_MODE") === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";
}

async function paypalToken(base: string): Promise<string> {
  const id = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal credentials not configured");
  const response = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!response.ok) throw new Error(`PayPal auth failed (${response.status})`);
  const payload = await response.json();
  if (!payload?.access_token) throw new Error("PayPal token missing");
  return payload.access_token;
}

function moneyToCents(value: unknown): number | null {
  if (typeof value !== "string" || !/^\d+(?:\.\d{1,2})?$/.test(value))
    return null;
  const cents = Math.round(Number(value) * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

async function issueProviderRefund(
  provider: string,
  paymentId: string,
  amountCents: number,
  currency: string,
  orderId: string,
  idempotencyKey: string,
): Promise<RefundEvidence> {
  if (provider === "stripe") {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    if (!stripeKey) throw new Error("Stripe is not configured");
    const stripe = new (Stripe as any)(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });
    const refund = await stripe.refunds.create(
      {
        payment_intent: paymentId,
        amount: amountCents,
        metadata: {
          order_id: orderId,
          payment_intent_id: paymentId,
          type: "eats",
          reason: "restaurant_cancel",
        },
      },
      { idempotencyKey },
    );
    const actualAmount = Number(refund?.amount);
    const actualCurrency = String(refund?.currency ?? "").toUpperCase();
    if (
      !refund?.id ||
      !Number.isSafeInteger(actualAmount) ||
      actualAmount <= 0 ||
      !/^[A-Z]{3}$/.test(actualCurrency)
    ) {
      throw new Error("Stripe refund evidence incomplete");
    }
    return {
      id: refund.id,
      amountCents: actualAmount,
      currency: actualCurrency,
      status: normalizeRefundStatus(refund.status),
      error: refund.failure_reason ?? undefined,
    };
  }

  if (provider === "paypal") {
    const base = paypalBase();
    const token = await paypalToken(base);
    const response = await fetch(
      `${base}/v2/payments/captures/${paymentId}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": idempotencyKey,
        },
        body: JSON.stringify({
          amount: {
            value: (amountCents / 100).toFixed(2),
            currency_code: currency,
          },
          note_to_payer: "ZIVO Eats — restaurant cancelled",
          invoice_id: orderId,
        }),
      },
    );
    let payload = await response.json().catch(() => null);
    if (
      payload?.id &&
      (!payload?.amount?.value || !payload?.amount?.currency_code)
    ) {
      const details = await fetch(`${base}/v2/payments/refunds/${payload.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (details.ok) payload = await details.json();
    }
    const actualAmount = moneyToCents(payload?.amount?.value);
    const actualCurrency = String(
      payload?.amount?.currency_code ?? "",
    ).toUpperCase();
    const evidenceIncomplete =
      !payload?.id ||
      actualAmount == null ||
      !/^[A-Z]{3}$/.test(actualCurrency);
    if (evidenceIncomplete) {
      if (!response.ok)
        throw new Error(
          payload?.message || `PayPal refund failed (${response.status})`,
        );
      throw new Error("PayPal refund evidence incomplete");
    }
    return {
      id: payload.id,
      amountCents: actualAmount,
      currency: actualCurrency,
      status: normalizeRefundStatus(payload.status),
      error: response.ok
        ? undefined
        : payload?.message || `PayPal refund failed (${response.status})`,
    };
  }

  if (provider === "square") {
    const token = Deno.env.get("SQUARE_ACCESS_TOKEN");
    if (!token) throw new Error("Square access token not configured");
    const response = await fetch(`${squareBase()}/v2/refunds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "Square-Version": "2025-01-22",
      },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        payment_id: paymentId,
        amount_money: { amount: amountCents, currency },
        reason: "ZIVO Eats — restaurant cancelled",
      }),
    });
    const payload = await response.json().catch(() => null);
    const refund = payload?.refund;
    const actualAmount = Number(refund?.amount_money?.amount);
    const actualCurrency = String(
      refund?.amount_money?.currency ?? "",
    ).toUpperCase();
    const evidenceIncomplete =
      !refund?.id ||
      !Number.isSafeInteger(actualAmount) ||
      actualAmount <= 0 ||
      !/^[A-Z]{3}$/.test(actualCurrency);
    if (evidenceIncomplete) {
      if (!response.ok)
        throw new Error(
          payload?.errors?.[0]?.detail ||
            `Square refund failed (${response.status})`,
        );
      throw new Error("Square refund evidence incomplete");
    }
    return {
      id: refund.id,
      amountCents: actualAmount,
      currency: actualCurrency,
      status: normalizeRefundStatus(refund.status),
      error: response.ok
        ? undefined
        : payload?.errors?.[0]?.detail ||
          `Square refund failed (${response.status})`,
    };
  }

  throw new Error("Unsupported payment provider");
}

async function cascadeDurably(admin: any, orderId: string): Promise<void> {
  const result = await admin.rpc("cascade_eats_cancellation", {
    p_order_id: orderId,
    p_cancel_source: "restaurant",
  });
  if (result.error || !rpcObject(result.data)?.ok) {
    throw new Error(
      result.error?.message ||
        rpcObject(result.data)?.code ||
        "cancellation_cascade_pending",
    );
  }
}

async function reversePayoutIfNeeded(
  admin: any,
  orderId: string,
): Promise<void> {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
  let reversalLedgerId: string | null = null;
  try {
    let result = await admin.rpc("claim_eats_payout_reversal", {
      p_order_id: orderId,
    });
    let claim = rpcObject(result.data);
    if (result.error || !claim?.ok)
      throw new Error(
        result.error?.message || claim?.code || "payout_reversal_claim_pending",
      );

    if (claim.transfer_recovery_required === true) {
      if (!stripeKey)
        throw new Error("Stripe transfer recovery is not configured");
      const amount = Number(claim.amount_cents);
      const commission = Number(claim.commission_cents);
      if (
        !Number.isSafeInteger(amount) ||
        amount <= 0 ||
        !Number.isSafeInteger(commission) ||
        commission < 0 ||
        !claim.stripe_account_id
      ) {
        throw new Error("Invalid Eats transfer recovery evidence");
      }
      const stripe = new (Stripe as any)(stripeKey, {
        apiVersion: "2025-08-27.basil",
      });
      const recoveredTransfer = await stripe.transfers.create(
        {
          amount,
          currency: "usd",
          destination: claim.stripe_account_id,
          transfer_group: `eats-${orderId}`,
          metadata: {
            order_id: orderId,
            restaurant_id: claim.restaurant_id,
            commission_cents: String(commission),
            type: "eats_auto_transfer",
          },
        },
        { idempotencyKey: String(claim.idempotency_key) },
      );
      const bound = await admin.rpc("bind_eats_payout_transfer", {
        p_order_id: orderId,
        p_transfer_ledger_id: claim.transfer_ledger_id,
        p_stripe_transfer_id: recoveredTransfer.id,
      });
      if (bound.error || !rpcObject(bound.data)?.ok)
        throw new Error(
          bound.error?.message || "transfer_evidence_binding_pending",
        );
      result = await admin.rpc("claim_eats_payout_reversal", {
        p_order_id: orderId,
      });
      claim = rpcObject(result.data);
      if (result.error || !claim?.ok)
        throw new Error(
          result.error?.message ||
            claim?.code ||
            "payout_reversal_claim_pending",
        );
    }

    if (claim.reversal_required !== true) return;
    if (!stripeKey) throw new Error("Stripe reversal is not configured");
    reversalLedgerId = String(claim.reversal_ledger_id);
    const stripe = new (Stripe as any)(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });
    const reversal = await stripe.transfers.createReversal(
      String(claim.stripe_transfer_id),
      {
        amount: Number(claim.amount_cents),
        metadata: { order_id: orderId, reason: "restaurant_cancel" },
      },
      { idempotencyKey: String(claim.idempotency_key) },
    );
    const finished = await admin.rpc("finish_eats_payout_reversal", {
      p_order_id: orderId,
      p_reversal_ledger_id: reversalLedgerId,
      p_stripe_reversal_id: reversal.id,
      p_succeeded: true,
      p_error: null,
    });
    if (finished.error || !rpcObject(finished.data)?.ok)
      throw new Error(
        finished.error?.message || "payout_reversal_finish_pending",
      );
  } catch (error) {
    if (reversalLedgerId) {
      await admin.rpc("finish_eats_payout_reversal", {
        p_order_id: orderId,
        p_reversal_ledger_id: reversalLedgerId,
        p_stripe_reversal_id: null,
        p_succeeded: false,
        p_error: error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
}

Deno.serve(
  withSecurity(
    "restaurant-cancel-order",
    async (req, ctx) => {
      const cors = ctx.corsHeaders;
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      if (req.method !== "POST")
        return json({ error: "Method not allowed" }, 405);

      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const userClient = createClient(supabaseUrl, anonKey, {
          global: {
            headers: { Authorization: req.headers.get("authorization") ?? "" },
          },
        });
        const {
          data: { user },
        } = await userClient.auth.getUser();
        if (!user) return json({ error: "Authentication required" }, 401);

        const body = await req.json().catch(() => ({}));
        const orderId =
          typeof body.order_id === "string" ? body.order_id.trim() : "";
        if (!orderId) return json({ error: "order_id required" }, 400);
        const reason =
          typeof body.reason === "string" ? body.reason.slice(0, 500) : null;
        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { persistSession: false },
        });

        const claimed = await admin.rpc("claim_eats_restaurant_cancellation", {
          p_order_id: orderId,
          p_restaurant_owner_id: user.id,
          p_reason: reason,
        });
        const claim = rpcObject(claimed.data);
        if (claimed.error)
          return json(
            { error: "cancellation_claim_pending", retryable: true },
            503,
          );
        if (!claim?.ok) {
          const code = String(claim?.code ?? "cancellation_claim_pending");
          return json(
            { error: code },
            code === "not_found" ? 404 : code === "forbidden" ? 403 : 409,
          );
        }

        await cascadeDurably(admin, orderId);
        let paymentStatus = String(claim.payment_status ?? "unpaid");
        let provider = String(claim.payment_provider ?? "");
        let actualRefundCents = 0;
        let providerRefundId: string | null = null;
        let remainingRefunds = 0;
        let shouldReversePayout = claim.code === "already_refunded";

        if (
          claim.reconciliation_required === true &&
          claim.refund_required !== true
        ) {
          return json(
            {
              error: "provider_evidence_reconciliation_pending",
              retryable: true,
            },
            503,
          );
        }

        if (claim.wallet_refund_required === true) {
          provider = "wallet";
          const refunded = await admin.rpc("process_eats_wallet_refund", {
            p_user_id: claim.customer_id,
            p_order_id: orderId,
            p_description: `Eats order ${orderId} — restaurant cancelled`,
          });
          const wallet = rpcObject(refunded.data);
          if (refunded.error || !wallet || Number(wallet.refund_cents) <= 0) {
            return json(
              { error: "wallet_refund_pending", retryable: true },
              503,
            );
          }
          actualRefundCents = Number(wallet.refund_cents);
          paymentStatus = "refunded";
          shouldReversePayout = true;
        } else if (claim.refund_required === true) {
          provider = String(claim.payment_provider ?? "");
          const paymentId = String(claim.payment_id ?? "");
          const amountCents = Number(claim.total_cents);
          const currency = String(claim.refund_currency ?? "").toUpperCase();
          if (
            !paymentId ||
            !Number.isSafeInteger(amountCents) ||
            amountCents <= 0 ||
            !/^[A-Z]{3}$/.test(currency)
          ) {
            return json(
              {
                error: "provider_evidence_reconciliation_pending",
                retryable: true,
              },
              503,
            );
          }

          let evidence: RefundEvidence;
          try {
            evidence = await issueProviderRefund(
              provider,
              paymentId,
              amountCents,
              currency,
              orderId,
              String(claim.refund_idempotency_key),
            );
          } catch (error) {
            await admin.rpc("finish_eats_provider_refund", {
              p_order_id: orderId,
              p_provider: provider,
              p_payment_id: paymentId,
              p_refund_succeeded: false,
              p_error: error instanceof Error ? error.message : String(error),
            });
            return json(
              { error: "provider_refund_pending", retryable: true },
              503,
            );
          }

          providerRefundId = evidence.id;
          actualRefundCents = evidence.amountCents;
          const finished = await admin.rpc(
            "finish_eats_provider_refund_with_evidence",
            {
              p_order_id: orderId,
              p_provider: provider,
              p_payment_id: paymentId,
              p_refund_id: evidence.id,
              p_refund_amount_cents: evidence.amountCents,
              p_refund_currency: evidence.currency,
              p_refund_status: evidence.status,
              p_error:
                evidence.status === "succeeded"
                  ? null
                  : (evidence.error ?? `Provider refund ${evidence.status}`),
            },
          );
          const finish = rpcObject(finished.data);
          if (finished.error || !finish?.ok)
            return json(
              { error: "refund_reconciliation_pending", retryable: true },
              503,
            );
          paymentStatus = String(finish.payment_status ?? "refund_pending");
          remainingRefunds = Number(finish.remaining_refund_count ?? 0);
          if (
            evidence.status !== "succeeded" ||
            finish.refund_complete !== true ||
            remainingRefunds > 0 ||
            paymentStatus !== "refunded"
          ) {
            return json(
              {
                error: "provider_refund_pending",
                retryable: true,
                remaining_refund_count: remainingRefunds,
              },
              503,
            );
          }
          shouldReversePayout = true;
        }

        if (shouldReversePayout) {
          try {
            await reversePayoutIfNeeded(admin, orderId);
          } catch (error) {
            console.error(
              "[restaurant-cancel-order] payout reversal pending",
              error,
            );
            return json(
              {
                error: "payout_reversal_pending",
                retryable: true,
                payment_status: paymentStatus,
              },
              503,
            );
          }
        }

        cascadeCancellationToDriver(admin, orderId, "delivery").catch((error) =>
          console.warn("[restaurant-cancel-order] driver push skipped", error),
        );
        if (actualRefundCents > 0) {
          const labels: Record<string, string> = {
            stripe: "Card",
            paypal: "PayPal",
            square: "Square",
            wallet: "ZIVO Wallet",
          };
          notifyEatsRefundIssued(
            admin,
            orderId,
            actualRefundCents,
            labels[provider] ?? "your payment method",
            "complete",
            `${claim.restaurant_name || "the restaurant"} cancelled your order`,
          ).catch((error) =>
            console.warn(
              "[restaurant-cancel-order] refund notice skipped",
              error,
            ),
          );
        }

        return json({
          ok: true,
          status: "cancelled",
          order_status: paymentStatus === "refunded" ? "refunded" : "cancelled",
          refund_cents: actualRefundCents,
          payment_status: paymentStatus,
          provider,
          provider_refund_id: providerRefundId,
          remaining_refund_count: remainingRefunds,
        });
      } catch (error) {
        console.error("[restaurant-cancel-order]", error);
        return json(
          { error: "cancellation_recovery_pending", retryable: true },
          503,
        );
      }
    },
    {
      allowedMethods: ["POST"],
      rateLimit: "payment",
      strictCors: true,
      trackNetwork: "suspicious",
      blockNetworkRiskAt: 80,
    },
  ),
);
