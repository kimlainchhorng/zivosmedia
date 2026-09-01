/**
 * Stripe Webhook Handler - OTA-Grade Payment Processing
 * Handles: checkout.session.completed, payment_intent.succeeded/failed,
 * charge.refunded, refund.updated/failed, charge.dispute.created
 */
import { serve, createClient } from "../_shared/deps.ts";
import { formatStripeAmount } from "../_shared/stripeMoney.ts";
import Stripe from "../_shared/stripe.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import {
  notifyEatsOrderConfirmed,
  notifyEatsRefundIssued,
} from "../_shared/eats-notifications.ts";
import { cascadeCancellationToDriver } from "../_shared/cancellation-cascade.ts";
import { notifyGroceryOrderConfirmed } from "../_shared/grocery-notifications.ts";
import { creditCreatorTipToWallet } from "../_shared/tipWalletCredit.ts";
import {
  creatorMonetizationWebhookAcknowledgement,
  isCreatorMonetizationDisabled,
} from "../_shared/creatorMonetizationCompliance.ts";
import { isAdultCreatorAccount } from "../_shared/adultCreatorPaymentBoundary.ts";

const EATS_DISPATCH_PENDING_ERROR = "delivery_dispatch_pending";

function rpcObject(value: unknown): Record<string, any> | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && typeof candidate === "object"
    ? (candidate as Record<string, any>)
    : null;
}

async function dispatchPaidEatsOrder(
  admin: any,
  supabaseUrl: string,
  serviceKey: string,
  orderId: string,
  source: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      `${supabaseUrl}/functions/v1/dispatch-eats-order`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({ order_id: orderId }),
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.ok !== true) {
      console.error(`[${source}] Eats dispatch remains pending`, {
        order_id: orderId,
        status: response.status,
        accepted: payload?.ok === true,
      });
      return false;
    }

    const { data: clearedOrder, error: clearError } = await admin
      .from("food_orders")
      .update({
        last_payment_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId)
      .eq("payment_status", "paid")
      .eq("last_payment_error", EATS_DISPATCH_PENDING_ERROR)
      .select("id")
      .maybeSingle();
    if (clearError || !clearedOrder) {
      console.error(`[${source}] Could not clear Eats dispatch marker`, {
        order_id: orderId,
        error: clearError?.message ?? "order_state_changed",
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error(`[${source}] Eats dispatch remains pending`, {
      order_id: orderId,
      error: error instanceof Error ? error.name : "unknown",
    });
    return false;
  }
}

// Audit logging helper
async function logPaymentAudit(
  supabase: any,
  data: {
    bookingId?: string;
    stripeEventType: string;
    stripeEventId?: string;
    stripePaymentIntentId?: string;
    duffelAction?: string;
    amount?: number;
    currency?: string;
    status: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
  },
) {
  try {
    await supabase.from("flight_payment_audit_log").insert({
      booking_id: data.bookingId || null,
      stripe_event_type: data.stripeEventType,
      stripe_event_id: data.stripeEventId,
      stripe_payment_intent_id: data.stripePaymentIntentId,
      duffel_action: data.duffelAction,
      amount: data.amount,
      currency: data.currency || "USD",
      status: data.status,
      error_message: data.errorMessage,
      metadata: data.metadata || {},
    });
  } catch (err) {
    console.error("[Audit] Failed to log payment event:", err);
  }
}

async function upsertPurchaseRecord(
  supabase: any,
  input: {
    userId?: string | null;
    transactionId: string;
    sourceType: string;
    amountCents: number;
    currency: string;
    status?: string;
    metadata?: Record<string, any>;
  },
) {
  const payload = {
    user_id: input.userId || null,
    transaction_id: input.transactionId,
    source_type: input.sourceType,
    amount_cents: input.amountCents,
    currency: (input.currency || "USD").toUpperCase(),
    status: input.status || "completed",
    metadata: input.metadata || {},
  };

  const { error } = await supabase
    .from("purchase_records")
    .upsert(payload, { onConflict: "transaction_id" });

  if (error) {
    console.error("[Webhook] Failed to upsert purchase record:", error);
  }
}

function addMonthsUtc(date: Date, months: number) {
  const next = new Date(date.getTime());
  const originalDate = next.getUTCDate();
  next.setUTCMonth(next.getUTCMonth() + months);
  if (next.getUTCDate() < originalDate) {
    next.setUTCDate(0);
  }
  return next;
}

function normalizeZivoPlusStatus(status: string | null | undefined) {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
    case "cancelled":
      return "cancelled";
    case "past_due":
    case "unpaid":
      return "paused";
    default:
      return "expired";
  }
}

async function syncZivoPlusSubscription(
  supabase: any,
  input: {
    userId: string;
    planId: string;
    status: string;
    billingCycle: string;
    planCode?: string;
    currentPeriodStart: string;
    currentPeriodEnd?: string;
    stripeSubscriptionId?: string | null;
    extendByMonths?: number;
  },
) {
  const normalizedStatus = normalizeZivoPlusStatus(input.status);
  const now = new Date();
  const { data: existing, error: existingError } = await supabase
    .from("zivo_subscriptions")
    .select("id, current_period_end")
    .eq("user_id", input.userId)
    .order("current_period_end", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  const basePeriodEnd =
    existing?.current_period_end && new Date(existing.current_period_end) > now
      ? new Date(existing.current_period_end)
      : now;
  const currentPeriodEnd = input.extendByMonths
    ? addMonthsUtc(basePeriodEnd, input.extendByMonths).toISOString()
    : input.currentPeriodEnd;

  if (!currentPeriodEnd) {
    throw new Error(
      "current_period_end is required for ZIVO+ subscription sync",
    );
  }

  const payload = {
    user_id: input.userId,
    plan_id: input.planId,
    status: normalizedStatus,
    billing_cycle: input.billingCycle === "yearly" ? "yearly" : "monthly",
    plan_code: ["monthly", "chat", "pro", "annual"].includes(
      String(input.planCode || ""),
    )
      ? String(input.planCode)
      : input.billingCycle === "yearly"
        ? "annual"
        : "monthly",
    current_period_start: input.currentPeriodStart,
    current_period_end: currentPeriodEnd,
    stripe_subscription_id: input.stripeSubscriptionId ?? null,
    cancelled_at: normalizedStatus === "cancelled" ? now.toISOString() : null,
  };

  if (existing?.id) {
    const { error } = await supabase
      .from("zivo_subscriptions")
      .update(payload)
      .eq("id", existing.id);
    if (error) throw error;
    return existing.id;
  }

  const { data, error } = await supabase
    .from("zivo_subscriptions")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data?.id ?? null;
}

async function upsertShopPulse(
  supabase: any,
  storeId: string,
  transactionId: string,
) {
  if (!storeId) return;

  const nowIso = new Date().toISOString();
  const { error } = await supabase.from("shop_live_pulse").upsert(
    {
      store_id: storeId,
      last_purchase_at: nowIso,
      last_event_id: transactionId,
      updated_at: nowIso,
    },
    { onConflict: "store_id" },
  );

  if (error) {
    console.error("[Webhook] Failed to upsert live pulse:", error);
  }
}

serve(
  withSecurity(
    "stripe-webhook",
    async (req, ctx) => {
      const corsHeaders = ctx.corsHeaders;
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
            Allow: "POST, OPTIONS",
          },
          status: 405,
        });
      }

      try {
        const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
        const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");

        if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

        const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
        const supabaseServiceKey =
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
        const supabase = createClient(supabaseUrl, supabaseServiceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const stripe = new Stripe(stripeKey, {
          apiVersion: "2025-08-27.basil",
        });

        /**
         * Auto-transfer the restaurant's share to their Connect account on a paid
         * Eats order. Idempotent — UNIQUE(order_id, direction) on the ledger
         * prevents double-transfer on webhook redelivery. Skips silently when the
         * restaurant hasn't onboarded Connect or has opted out.
         */
        const queueEatsAutoTransfer = async (orderId: string) => {
          const { data: payoutClaimData, error: payoutClaimError } =
            await supabase.rpc("claim_eats_payout_transfer", {
              p_order_id: orderId,
            });
          const payoutClaim = rpcObject(payoutClaimData);
          if (payoutClaimError || !payoutClaim?.ok) {
            throw (
              payoutClaimError ||
              new Error(
                payoutClaim?.code ?? "Could not claim Eats merchant payout",
              )
            );
          }
          if (payoutClaim.payout_required !== true) {
            if (
              ![
                "payout_not_authorized",
                "provider_not_stripe",
                "zero_payout",
                "connect_payout_not_enabled",
                "already_transferred",
              ].includes(String(payoutClaim.code ?? ""))
            ) {
              throw new Error("Unexpected Eats merchant payout claim state");
            }
            return;
          }

          const payoutLedger = {
            id: String(payoutClaim.transfer_ledger_id ?? "").trim(),
            order_id: String(payoutClaim.order_id ?? "").trim(),
            restaurant_id: String(payoutClaim.restaurant_id ?? "").trim(),
            stripe_account_id: String(
              payoutClaim.stripe_account_id ?? "",
            ).trim(),
            amount_cents: Number(payoutClaim.amount_cents),
            commission_cents: Number(payoutClaim.commission_cents),
            commission_rate: Number(payoutClaim.commission_rate),
            status: String(payoutClaim.status ?? ""),
            stripe_transfer_id: payoutClaim.stripe_transfer_id,
          };
          const payoutIdempotencyKey = String(
            payoutClaim.idempotency_key ?? "",
          ).trim();
          const reservedTransferCents = Number(payoutLedger.amount_cents);
          const reservedCommissionCents = Number(payoutLedger.commission_cents);
          const reservedCommissionPercent = Number(
            payoutLedger.commission_rate,
          );
          if (
            !Number.isSafeInteger(reservedTransferCents) ||
            reservedTransferCents <= 0 ||
            !Number.isSafeInteger(reservedCommissionCents) ||
            reservedCommissionCents < 0 ||
            !Number.isFinite(reservedCommissionPercent) ||
            payoutLedger.id.length === 0 ||
            payoutLedger.order_id !== orderId ||
            payoutLedger.restaurant_id.length === 0 ||
            payoutLedger.stripe_account_id.length === 0 ||
            !["queued", "failed"].includes(payoutLedger.status) ||
            payoutLedger.stripe_transfer_id != null ||
            payoutIdempotencyKey !== `eats-transfer-${orderId}`
          ) {
            throw new Error("Invalid Eats payout ledger reservation");
          }

          try {
            const transfer = await stripe.transfers.create(
              {
                amount: reservedTransferCents,
                currency: "usd",
                destination: payoutLedger.stripe_account_id,
                transfer_group: `eats-${orderId}`,
                metadata: {
                  order_id: orderId,
                  restaurant_id: payoutLedger.restaurant_id,
                  commission_cents: String(reservedCommissionCents),
                  type: "eats_auto_transfer",
                },
              },
              { idempotencyKey: payoutIdempotencyKey },
            );
            const { data: bindData, error: bindError } = await supabase.rpc(
              "bind_eats_payout_transfer",
              {
                p_order_id: orderId,
                p_transfer_ledger_id: payoutLedger.id,
                p_stripe_transfer_id: transfer.id,
              },
            );
            const bindResult = rpcObject(bindData);
            if (bindError || !bindResult?.ok) {
              throw new Error(
                `Could not persist Eats transfer evidence: ${bindError?.message ?? bindResult?.code ?? "unknown error"}`,
              );
            }
          } catch (e: any) {
            const msg = String(e?.message || e);
            console.error("[stripe-webhook] eats auto-transfer failed", msg);
            await supabase
              .from("eats_payout_ledger")
              .update({
                status: "failed",
                error_message: msg,
                updated_at: new Date().toISOString(),
              })
              .eq("id", payoutLedger.id)
              .neq("status", "created");
            throw e;
          }
        };

        /**
         * Reverse the auto-transfer when an Eats refund completes.
         */
        const queueEatsAutoReversal = async (
          orderId: string,
          reason: string,
        ) => {
          const { data: order, error: orderError } = await supabase
            .from("food_orders")
            .select("status, payment_status, refund_status, last_payment_error")
            .eq("id", orderId)
            .maybeSingle();
          if (orderError) {
            throw new Error(
              `Could not load Eats refund authority for reversal: ${orderError.message}`,
            );
          }
          if (!order) return;
          const paidWithoutRefund =
            (order as any).payment_status === "paid" &&
            (order as any).last_payment_error === "cancelled_no_refund";
          const refundAuthorizesReversal =
            (order as any).payment_status === "refunded" &&
            (order as any).refund_status === "refunded";
          if (paidWithoutRefund || !refundAuthorizesReversal) return;

          const payoutReversalMarker = "payout_reversal_pending";
          const clearEatsPayoutReversalMarker = async () => {
            const { data: clearedOrder, error: clearMarkerError } =
              await supabase
                .from("food_orders")
                .update({
                  last_payment_error: null,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", orderId)
                .eq("last_payment_error", payoutReversalMarker)
                .select("id")
                .maybeSingle();
            if (clearMarkerError || !clearedOrder) {
              throw new Error(
                `Could not clear Eats payout reversal marker: ${clearMarkerError?.message ?? "order state changed"}`,
              );
            }
          };
          const { data: markedOrder, error: markerError } = await supabase
            .from("food_orders")
            .update({
              last_payment_error: payoutReversalMarker,
              updated_at: new Date().toISOString(),
            })
            .eq("id", orderId)
            .select("id")
            .maybeSingle();
          if (markerError || !markedOrder) {
            throw new Error(
              `Could not mark Eats payout reversal pending: ${markerError?.message ?? "order state changed"}`,
            );
          }

          const { data: ledger, error: ledgerError } = await supabase
            .from("eats_payout_ledger")
            .select(
              "id, status, stripe_transfer_id, amount_cents, commission_cents, restaurant_id, stripe_account_id",
            )
            .eq("order_id", orderId)
            .eq("direction", "transfer")
            .maybeSingle();
          if (ledgerError) {
            throw new Error(
              `Could not load Eats transfer for reversal: ${ledgerError.message}`,
            );
          }
          if (!ledger) {
            await clearEatsPayoutReversalMarker();
            return;
          }

          let stripeTransferId = (ledger as any).stripe_transfer_id as
            string | null;
          if (!stripeTransferId) {
            if (
              !["queued", "failed", "created"].includes((ledger as any).status)
            ) {
              throw new Error(
                `Eats transfer has an unrecoverable status: ${(ledger as any).status}`,
              );
            }
            const recoveryAmountCents = Number((ledger as any).amount_cents);
            const recoveryCommissionCents = Number(
              (ledger as any).commission_cents,
            );
            if (
              !Number.isSafeInteger(recoveryAmountCents) ||
              recoveryAmountCents <= 0 ||
              !Number.isSafeInteger(recoveryCommissionCents) ||
              recoveryCommissionCents < 0 ||
              !(ledger as any).stripe_account_id
            ) {
              throw new Error("Invalid Eats transfer recovery reservation");
            }
            try {
              const recoveredTransfer = await stripe.transfers.create(
                {
                  amount: recoveryAmountCents,
                  currency: "usd",
                  destination: (ledger as any).stripe_account_id,
                  transfer_group: `eats-${orderId}`,
                  metadata: {
                    order_id: orderId,
                    restaurant_id: (ledger as any).restaurant_id,
                    commission_cents: String(recoveryCommissionCents),
                    type: "eats_auto_transfer",
                  },
                },
                { idempotencyKey: `eats-transfer-${orderId}` },
              );
              stripeTransferId = recoveredTransfer.id;
              const { error: recoveredTransferError } = await supabase
                .from("eats_payout_ledger")
                .update({
                  status: "created",
                  stripe_transfer_id: stripeTransferId,
                  error_message: null,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", (ledger as any).id);
              if (recoveredTransferError) {
                throw new Error(
                  `Could not persist recovered Eats transfer: ${recoveredTransferError.message}`,
                );
              }
            } catch (transferRecoveryError) {
              const message =
                transferRecoveryError instanceof Error
                  ? transferRecoveryError.message
                  : String(transferRecoveryError);
              await supabase
                .from("eats_payout_ledger")
                .update({
                  status: "failed",
                  error_message: message,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", (ledger as any).id)
                .neq("status", "created");
              throw transferRecoveryError;
            }
          }

          const { data: insertedReversal, error: insertErr } = await supabase
            .from("eats_payout_ledger")
            .insert({
              order_id: orderId,
              restaurant_id: (ledger as any).restaurant_id,
              stripe_account_id: (ledger as any).stripe_account_id,
              direction: "reversal",
              amount_cents: (ledger as any).amount_cents,
              commission_cents: 0,
              status: "queued",
            })
            .select(
              "id, restaurant_id, stripe_account_id, amount_cents, status, stripe_reversal_id",
            )
            .maybeSingle();
          let reversalLedger = insertedReversal as any;
          if (insertErr) {
            if ((insertErr as any).code !== "23505") {
              throw new Error(
                `Could not reserve Eats reversal: ${insertErr.message}`,
              );
            }
            const { data: existingReversal, error: existingReversalError } =
              await supabase
                .from("eats_payout_ledger")
                .select(
                  "id, restaurant_id, stripe_account_id, amount_cents, status, stripe_reversal_id",
                )
                .eq("order_id", orderId)
                .eq("direction", "reversal")
                .maybeSingle();
            if (existingReversalError || !existingReversal) {
              throw new Error(
                `Could not recover Eats reversal: ${existingReversalError?.message ?? "missing reservation"}`,
              );
            }
            reversalLedger = existingReversal as any;
          }
          if (!reversalLedger) {
            throw new Error("Missing Eats reversal ledger reservation");
          }
          if (
            reversalLedger.status === "created" &&
            reversalLedger.stripe_reversal_id
          ) {
            await clearEatsPayoutReversalMarker();
            return;
          }
          if (
            !["queued", "failed", "created"].includes(reversalLedger.status)
          ) {
            throw new Error(
              `Eats reversal has an unrecoverable status: ${reversalLedger.status}`,
            );
          }
          const reservedReversalCents = Number(reversalLedger.amount_cents);
          if (
            !Number.isSafeInteger(reservedReversalCents) ||
            reservedReversalCents <= 0
          ) {
            throw new Error("Invalid Eats reversal reservation");
          }

          try {
            const reversal = await stripe.transfers.createReversal(
              stripeTransferId,
              {
                amount: reservedReversalCents,
                metadata: { order_id: orderId, reason },
              },
              { idempotencyKey: `eats-reversal-${orderId}` },
            );
            const { error: createdError } = await supabase
              .from("eats_payout_ledger")
              .update({
                status: "created",
                stripe_reversal_id: reversal.id,
                error_message: null,
                updated_at: new Date().toISOString(),
              })
              .eq("id", reversalLedger.id);
            if (createdError) {
              throw new Error(
                `Could not persist Eats reversal evidence: ${createdError.message}`,
              );
            }
            await clearEatsPayoutReversalMarker();
          } catch (e: any) {
            const msg = String(e?.message || e);
            console.error("[stripe-webhook] eats auto-reversal failed", msg);
            await supabase
              .from("eats_payout_ledger")
              .update({
                status: "failed",
                error_message: msg,
                updated_at: new Date().toISOString(),
              })
              .eq("id", reversalLedger.id)
              .neq("status", "created");
            throw e;
          }
        };

        const finishStripeEatsRefundEvidence = async (input: {
          orderId: string;
          paymentIntentId: string;
          refundId: string;
          amountCents: number;
          currency: string;
          status: "succeeded" | "pending" | "failed";
          error?: string | null;
        }): Promise<Record<string, any>> => {
          const { data, error } = await supabase.rpc(
            "finish_eats_provider_refund_with_evidence",
            {
              p_order_id: input.orderId,
              p_provider: "stripe",
              p_payment_id: input.paymentIntentId,
              p_refund_id: input.refundId,
              p_refund_amount_cents: input.amountCents,
              p_refund_currency: input.currency.toUpperCase(),
              p_refund_status: input.status,
              p_error: input.error ?? null,
            },
          );
          const finish = rpcObject(data);
          if (error || !finish?.ok) {
            throw (
              error ||
              new Error(
                finish?.code ?? "Could not persist Stripe refund evidence",
              )
            );
          }
          return finish;
        };

        const normalizeStripeRefundOutcome = (
          status: Stripe.Refund["status"],
        ): "succeeded" | "pending" | "failed" => {
          if (status === "succeeded") return "succeeded";
          if (status === "failed" || String(status) === "canceled") {
            return "failed";
          }
          return "pending";
        };

        const listSucceededStripeRefunds = async (
          chargeId: string,
        ): Promise<Stripe.Refund[]> => {
          const refunds: Stripe.Refund[] = [];
          let startingAfter: string | undefined;
          for (let pageNumber = 0; pageNumber < 100; pageNumber += 1) {
            const page = await stripe.refunds.list({
              charge: chargeId,
              limit: 100,
              ...(startingAfter ? { starting_after: startingAfter } : {}),
            });
            for (const refund of page.data) {
              if (refund.status !== "succeeded") continue;
              if (
                !refund.id ||
                !Number.isSafeInteger(refund.amount) ||
                refund.amount <= 0 ||
                !refund.currency
              ) {
                throw new Error("Stripe returned invalid Eats refund evidence");
              }
              refunds.push(refund);
            }
            if (!page.has_more) return refunds;
            const lastRefund = page.data.at(-1);
            if (!lastRefund?.id) {
              throw new Error("Stripe refund pagination could not advance");
            }
            startingAfter = lastRefund.id;
          }
          throw new Error("Stripe refund pagination exceeded safety limit");
        };

        const recordStripeEatsSettlementEvidence = async (
          orderId: string,
          paymentIntentId: string,
          amountCents: number,
          currency: string,
        ): Promise<Record<string, any>> => {
          const { data, error } = await supabase.rpc(
            "record_eats_provider_settlement",
            {
              p_order_id: orderId,
              p_provider: "stripe",
              p_payment_id: paymentIntentId,
              p_amount_cents: amountCents,
              p_currency: currency.toUpperCase(),
            },
          );
          const settlement = rpcObject(data);
          if (error || !settlement?.ok) {
            throw (
              error ||
              new Error(
                settlement?.code ?? "Could not persist Stripe Eats settlement",
              )
            );
          }
          return settlement;
        };

        const settleStripeEatsPayment = async (
          orderId: string,
          paymentIntentId: string,
          amountCents: number,
          currency: string,
        ): Promise<Record<string, any>> => {
          const settlement = await recordStripeEatsSettlementEvidence(
            orderId,
            paymentIntentId,
            amountCents,
            currency,
          );

          if (settlement.refund_required === true) {
            const refundAmountCents = Number(settlement.refund_amount_cents);
            const refundCurrency = String(
              settlement.provider_currency ?? "",
            ).toUpperCase();
            const refundAttemptGeneration = Number(
              settlement.refund_attempt_generation,
            );
            const refundIdempotencyKey = String(
              settlement.refund_idempotency_key ?? "",
            ).trim();
            const refundEvidenceId = String(
              settlement.refund_evidence_id ?? "",
            ).trim();
            const expectedRefundIdempotencyKey = `refund-eats-${paymentIntentId}-${refundAmountCents}${
              refundAttemptGeneration > 0 ? `-r${refundAttemptGeneration}` : ""
            }`;
            const exactRefundAuthority =
              String(settlement.provider_payment_id ?? "").trim() ===
                paymentIntentId &&
              Number.isSafeInteger(refundAmountCents) &&
              refundAmountCents > 0 &&
              refundCurrency === currency.toUpperCase() &&
              Number.isSafeInteger(refundAttemptGeneration) &&
              refundAttemptGeneration >= 0 &&
              refundAttemptGeneration <= 999999 &&
              refundEvidenceId.length > 0 &&
              refundIdempotencyKey === expectedRefundIdempotencyKey;
            if (!exactRefundAuthority) {
              throw new Error(
                "Stripe settlement refund authority is incomplete",
              );
            }

            let refund: Stripe.Refund;
            try {
              refund = await stripe.refunds.create(
                {
                  payment_intent: paymentIntentId,
                  amount: refundAmountCents,
                  metadata: {
                    type: "eats",
                    order_id: orderId,
                    payment_intent_id: paymentIntentId,
                    reason: String(
                      settlement.refund_reason ?? "late_eats_settlement",
                    ),
                    refund_attempt_generation: String(refundAttemptGeneration),
                  },
                },
                { idempotencyKey: refundIdempotencyKey },
              );
            } catch (refundError) {
              const message =
                refundError instanceof Error
                  ? refundError.message
                  : "Stripe refund failed";
              await supabase.rpc("finish_eats_provider_refund", {
                p_order_id: orderId,
                p_provider: "stripe",
                p_payment_id: paymentIntentId,
                p_refund_succeeded: false,
                p_error: message,
              });
              throw refundError;
            }

            if (
              !refund.id ||
              !Number.isSafeInteger(refund.amount) ||
              refund.amount <= 0 ||
              !refund.currency
            ) {
              throw new Error("Stripe refund evidence is incomplete");
            }
            const refundOutcome = normalizeStripeRefundOutcome(refund.status);
            const finish = await finishStripeEatsRefundEvidence({
              orderId,
              paymentIntentId,
              refundId: refund.id,
              amountCents: refund.amount,
              currency: refund.currency,
              status: refundOutcome,
              error:
                refundOutcome === "succeeded"
                  ? null
                  : `Stripe refund ${refund.status ?? "pending"}`,
            });
            if (
              refundOutcome !== "succeeded" ||
              finish.refund_complete !== true
            ) {
              // Exact failed evidence advances the durable generation in the
              // RPC. Pending evidence retains the same key, so Stripe retry
              // returns/reconciles the same provider Refund rather than
              // creating a duplicate attempt.
              throw new Error(`Stripe refund ${refundOutcome}`);
            }
            if (finish.payment_status === "refunded") {
              await cascadeCancellationToDriver(supabase, orderId, "delivery");
              await queueEatsAutoReversal(orderId, "eats_payment_reconciled");
            }
            return {
              ...settlement,
              refund_completed: true,
              refund_status: refund.status,
            };
          }

          return settlement;
        };

        const reconcileStripeEatsPayout = async (orderId: string) => {
          // This is safe on both Stripe settlement event types. The payout ledger's
          // unique key makes retries harmless, while the helper rechecks active/paid
          // state immediately before reserving a transfer.
          await queueEatsAutoTransfer(orderId);
          const { data: postTransferOrder, error: postTransferOrderError } =
            await supabase
              .from("food_orders")
              .select(
                "status, payment_status, refund_status, last_payment_error",
              )
              .eq("id", orderId)
              .maybeSingle();
          if (postTransferOrderError) {
            throw new Error(
              `Could not reconcile Eats payout state: ${postTransferOrderError.message}`,
            );
          }
          const paidWithoutRefund =
            (postTransferOrder as any)?.payment_status === "paid" &&
            (postTransferOrder as any)?.last_payment_error ===
              "cancelled_no_refund";
          const refundAuthorizesReversal =
            (postTransferOrder as any)?.payment_status === "refunded" &&
            (postTransferOrder as any)?.refund_status === "refunded";
          if (
            postTransferOrder &&
            !paidWithoutRefund &&
            refundAuthorizesReversal
          ) {
            await queueEatsAutoReversal(orderId, "eats_payment_state_changed");
          }
        };

        const body = await req.text();
        const signature = req.headers.get("stripe-signature");

        let event: Stripe.Event;

        // Verify webhook signature if secret is configured
        if (webhookSecret && signature) {
          try {
            event = stripe.webhooks.constructEvent(
              body,
              signature,
              webhookSecret,
            );
          } catch (err: unknown) {
            const errMessage =
              err instanceof Error ? err.message : "Unknown error";
            console.error("Webhook signature verification failed:", errMessage);
            return new Response(
              JSON.stringify({ error: "Invalid signature" }),
              {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
              },
            );
          }
        } else {
          // SECURITY: Webhook signature verification is mandatory
          console.error(
            "[Webhook] Missing STRIPE_WEBHOOK_SECRET or stripe-signature header",
          );
          return new Response(
            JSON.stringify({
              error:
                "Webhook signature verification required. Configure STRIPE_WEBHOOK_SECRET.",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            },
          );
        }

        console.log("[Webhook] Processing event:", event.type, "ID:", event.id);

        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;
            const metadata = session.metadata || {};
            const paymentIntentId =
              typeof session.payment_intent === "string"
                ? session.payment_intent
                : session.payment_intent?.id;

            if (
              isCreatorMonetizationDisabled() &&
              metadata.type === "zivo_plus_gift"
            ) {
              return creatorMonetizationWebhookAcknowledgement(corsHeaders);
            }

            console.log(
              "[Webhook] Checkout completed:",
              session.id,
              "Type:",
              metadata.type,
            );

            // Creator one-time / lifetime tier purchase — recurring tiers go through
            // customer.subscription.created instead. Identify by metadata.tier_id +
            // creator_id + subscriber_id and a non-subscription session mode.
            if (
              metadata.tier_id &&
              metadata.creator_id &&
              metadata.subscriber_id &&
              session.mode === "payment"
            ) {
              if (isCreatorMonetizationDisabled())
                return creatorMonetizationWebhookAcknowledgement(corsHeaders);
              const row = {
                creator_id: metadata.creator_id,
                subscriber_id: metadata.subscriber_id,
                tier_id: metadata.tier_id,
                status: "active",
                price_cents: session.amount_total ?? null,
                stripe_session_id: session.id,
                payment_method: "stripe",
                started_at: new Date().toISOString(),
                // Lifetime — no expiry. (NULL expires_at signals lifetime.)
                expires_at: null,
              } as any;
              const { error: subErr } = await supabase
                .from("creator_subscriptions")
                .upsert(row, { onConflict: "stripe_session_id" });
              if (subErr) {
                console.error("[Webhook] lifetime tier upsert failed", subErr);
              } else {
                console.log("[Webhook] Lifetime creator tier activated", {
                  session: session.id,
                });
                try {
                  await fetch(
                    `${supabaseUrl}/functions/v1/send-push-notification`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${supabaseServiceKey}`,
                      },
                      body: JSON.stringify({
                        user_id: metadata.creator_id,
                        notification_type: "creator_new_subscriber",
                        title: "New lifetime subscriber 💎",
                        body: `Someone bought your lifetime tier — that's permanent revenue.`,
                        data: {
                          type: "creator_new_subscriber",
                          tier_id: metadata.tier_id,
                          action_url: "/creator/dashboard",
                        },
                      }),
                    },
                  );
                } catch {}
              }
              break;
            }

            if (metadata.type === "ride") {
              // Update ride request
              const { error } = await supabase
                .from("ride_requests")
                .update({
                  status: "paid",
                  payment_status: "paid",
                  stripe_payment_intent_id: paymentIntentId,
                })
                .eq("stripe_checkout_session_id", session.id);

              if (error) {
                console.error("Error updating ride request:", error);
              } else {
                console.log(
                  "Ride request updated to paid:",
                  metadata.ride_request_id,
                );
                // Notify rider: payment confirmed
                if (
                  metadata.rider_id ||
                  metadata.user_id ||
                  metadata.customer_id
                ) {
                  const uid =
                    metadata.rider_id ||
                    metadata.user_id ||
                    metadata.customer_id;
                  try {
                    await fetch(
                      `${supabaseUrl}/functions/v1/send-push-notification`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${supabaseServiceKey}`,
                        },
                        body: JSON.stringify({
                          user_id: uid,
                          notification_type: "payment_confirmed",
                          title: "Ride Payment Confirmed ✅",
                          body: `Your ride payment of $${((session.amount_total || 0) / 100).toFixed(2)} was successful`,
                          data: {
                            type: "payment_confirmed",
                            service: "ride",
                            action_url: `/rides/tracking/${metadata.ride_request_id}`,
                          },
                        }),
                      },
                    );
                  } catch {}
                }
              }
            } else if (metadata.type === "eats") {
              const amountCents = session.amount_total;
              const currency = session.currency?.toUpperCase();
              if (
                session.payment_status !== "paid" ||
                !paymentIntentId ||
                !Number.isSafeInteger(amountCents) ||
                !amountCents ||
                amountCents <= 0 ||
                !currency
              ) {
                throw new Error(
                  "Stripe Eats checkout settlement evidence is incomplete",
                );
              }
              const { data: foodOrders, error } = await supabase
                .from("food_orders")
                .select("id, customer_id")
                .eq("stripe_checkout_session_id", session.id);

              if (error) {
                throw new Error(
                  `Could not resolve Stripe Eats checkout order: ${error.message}`,
                );
              }
              if ((foodOrders ?? []).length === 0) {
                throw new Error(
                  `Stripe Eats checkout ${session.id} is not mapped to an order`,
                );
              }
              for (const row of (foodOrders ?? []) as {
                id: string;
                customer_id: string;
              }[]) {
                const settlement = await settleStripeEatsPayment(
                  row.id,
                  paymentIntentId,
                  amountCents,
                  currency,
                );
                if (settlement.refund_required === true) continue;
                if (settlement.transitioned_to_paid === true) {
                  try {
                    await fetch(
                      `${supabaseUrl}/functions/v1/send-push-notification`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${supabaseServiceKey}`,
                        },
                        body: JSON.stringify({
                          user_id: row.customer_id,
                          notification_type: "payment_confirmed",
                          title: "Order Confirmed 🍕",
                          body: `Your order payment of $${(amountCents / 100).toFixed(2)} was successful`,
                          data: {
                            type: "payment_confirmed",
                            service: "eats",
                            action_url: `/eats/${row.id}`,
                          },
                        }),
                      },
                    );
                  } catch {}
                }
                if (settlement.dispatch_required === true) {
                  const dispatched = await dispatchPaidEatsOrder(
                    supabase,
                    supabaseUrl,
                    supabaseServiceKey,
                    row.id,
                    "stripe-webhook:checkout-session",
                  );
                  if (!dispatched) {
                    throw new Error(
                      `Eats dispatch remains pending for order ${row.id}`,
                    );
                  }
                }
                await reconcileStripeEatsPayout(row.id);
              }
            } else if (metadata.type === "p2p") {
              // Update P2P booking
              const { error } = await supabase
                .from("p2p_bookings")
                .update({
                  status: "confirmed",
                  payment_status: "captured",
                  stripe_payment_intent_id: paymentIntentId,
                })
                .eq("stripe_checkout_session_id", session.id);

              if (error) {
                console.error("Error updating P2P booking:", error);
              } else {
                console.log(
                  "P2P booking updated to captured:",
                  metadata.booking_id,
                );
              }
            } else if (metadata.type === "flight") {
              // Log payment audit
              await logPaymentAudit(supabase, {
                bookingId: metadata.booking_id,
                stripeEventType: event.type,
                stripeEventId: event.id,
                stripePaymentIntentId: paymentIntentId,
                status: "success",
                amount: session.amount_total
                  ? session.amount_total / 100
                  : undefined,
                currency: session.currency?.toUpperCase(),
                metadata: { checkout_session_id: session.id },
              });

              // Update flight booking with explicit payment confirmation
              const { data: updatedBooking, error: updateError } =
                await supabase
                  .from("flight_bookings")
                  .update({
                    payment_status: "paid",
                    stripe_payment_intent_id: paymentIntentId,
                    ticketing_status: "processing",
                  })
                  .eq("stripe_checkout_session_id", session.id)
                  .select()
                  .single();

              if (updateError) {
                console.error(
                  "[Webhook] Error updating flight booking:",
                  updateError,
                );

                await logPaymentAudit(supabase, {
                  bookingId: metadata.booking_id,
                  stripeEventType: event.type,
                  stripeEventId: event.id,
                  status: "error",
                  errorMessage: updateError.message,
                });

                await supabase.from("flight_admin_alerts").insert({
                  booking_id: metadata.booking_id,
                  alert_type: "payment_failed",
                  message: `Failed to update booking after payment: ${updateError.message}`,
                  severity: "critical",
                });
                break;
              }

              console.log(
                "[Webhook] Flight booking paid:",
                metadata.booking_id,
              );

              // Notify user: flight payment confirmed
              if (metadata.user_id) {
                try {
                  await fetch(
                    `${supabaseUrl}/functions/v1/send-push-notification`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${supabaseServiceKey}`,
                      },
                      body: JSON.stringify({
                        user_id: metadata.user_id,
                        notification_type: "payment_confirmed",
                        title: "Flight Payment Confirmed ✈️",
                        body: `Your flight payment of ${formatStripeAmount(session.amount_total || 0, session.currency || "usd")} was successful. Ticketing in progress.`,
                        data: {
                          type: "payment_confirmed",
                          service: "flight",
                          booking_id: metadata.booking_id,
                          action_url: `/bookings/${metadata.booking_id}`,
                        },
                      }),
                    },
                  );
                } catch {}
              }
              try {
                await fetch(`${supabaseUrl}/functions/v1/send-flight-email`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({
                    type: "payment_receipt",
                    bookingId: metadata.booking_id,
                  }),
                });
                console.log("[Webhook] Payment receipt email triggered");
              } catch (emailErr) {
                console.error("[Webhook] Payment email failed:", emailErr);
              }

              // Trigger ticketing with explicit error handling
              try {
                const ticketResponse = await fetch(
                  `${supabaseUrl}/functions/v1/issue-flight-ticket`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({ bookingId: metadata.booking_id }),
                  },
                );

                if (!ticketResponse.ok) {
                  const ticketError = await ticketResponse.json();
                  console.error(
                    "[Webhook] Ticketing trigger failed:",
                    ticketError,
                  );

                  await logPaymentAudit(supabase, {
                    bookingId: metadata.booking_id,
                    stripeEventType: "ticketing_triggered",
                    stripeEventId: event.id,
                    duffelAction: "create_order_failed",
                    status: "error",
                    errorMessage: ticketError.error || "Ticketing failed",
                  });
                } else {
                  console.log(
                    "[Webhook] Ticketing triggered successfully for:",
                    metadata.booking_id,
                  );

                  await logPaymentAudit(supabase, {
                    bookingId: metadata.booking_id,
                    stripeEventType: "ticketing_triggered",
                    stripeEventId: event.id,
                    duffelAction: "create_order",
                    status: "success",
                  });
                }
              } catch (ticketErr) {
                console.error(
                  "[Webhook] Error triggering ticketing:",
                  ticketErr,
                );
                await supabase.from("flight_admin_alerts").insert({
                  booking_id: metadata.booking_id,
                  alert_type: "ticketing_failed",
                  message: `Failed to trigger ticketing after payment: ${ticketErr instanceof Error ? ticketErr.message : "Unknown error"}`,
                  severity: "critical",
                });
              }
            } else if (metadata.type === "travel") {
              // Handle travel bookings (hotels, activities, transfers)
              console.log(
                "[Webhook] Travel checkout completed:",
                session.id,
                "Order:",
                metadata.orderId,
              );

              // Update payment status
              await supabase
                .from("travel_payments")
                .update({ status: "succeeded" })
                .eq("stripe_checkout_session_id", session.id);

              // Trigger booking confirmation with Hotelbeds
              try {
                const confirmResponse = await fetch(
                  `${supabaseUrl}/functions/v1/confirm-hotelbeds-booking`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({ orderId: metadata.orderId }),
                  },
                );

                if (!confirmResponse.ok) {
                  const confirmError = await confirmResponse.json();
                  console.error(
                    "[Webhook] Travel booking confirmation failed:",
                    confirmError,
                  );

                  // Update order status to failed
                  await supabase
                    .from("travel_orders")
                    .update({ status: "failed" })
                    .eq("id", metadata.orderId);

                  // Log audit event
                  await supabase.from("booking_audit_logs").insert({
                    order_id: metadata.orderId,
                    event: "booking_confirmation_failed",
                    meta: {
                      error: confirmError.error,
                      checkout_session_id: session.id,
                    },
                  });
                } else {
                  console.log(
                    "[Webhook] Travel booking confirmed for order:",
                    metadata.orderNumber,
                  );
                }
              } catch (confirmErr) {
                console.error(
                  "[Webhook] Error confirming travel booking:",
                  confirmErr,
                );

                await supabase
                  .from("travel_orders")
                  .update({ status: "failed" })
                  .eq("id", metadata.orderId);

                await supabase.from("booking_audit_logs").insert({
                  order_id: metadata.orderId,
                  event: "booking_confirmation_error",
                  meta: {
                    error:
                      confirmErr instanceof Error
                        ? confirmErr.message
                        : "Unknown error",
                    checkout_session_id: session.id,
                  },
                });
              }
            } else if (metadata.type === "creator_tip") {
              if (isCreatorMonetizationDisabled())
                return creatorMonetizationWebhookAcknowledgement(corsHeaders);
              // Tip via create-tip-checkout. The function inserts creator_tips with
              // status='pending' + payment_intent_id = session.payment_intent OR
              // session.id (depending on availability at session-create time).
              // Without this branch, tips stay pending forever — creator never
              // sees them as succeeded.
              if (session.payment_status !== "paid") {
                console.log(
                  "[Webhook] creator_tip session not yet paid:",
                  session.id,
                );
              } else {
                // Resolve the tip row by either payment_intent_id (if set during
                // create) or by session.id (fallback used when PI isn't known yet).
                const piRef = paymentIntentId ?? session.id;
                const sessionRef = session.id;
                const tipperId = metadata.tipper_id;

                // Try by payment_intent_id first; if no row, try by session.id.
                const tipSelect =
                  "id, status, creator_id, amount_cents, tipper_id, is_anonymous, message";
                let tipRow: any = null;
                const { data: byPi } = await supabase
                  .from("creator_tips")
                  .select(tipSelect)
                  .eq("payment_intent_id", piRef)
                  .maybeSingle();
                tipRow = byPi ?? null;
                if (!tipRow) {
                  const { data: bySession } = await supabase
                    .from("creator_tips")
                    .select(tipSelect)
                    .eq("payment_intent_id", sessionRef)
                    .maybeSingle();
                  tipRow = bySession ?? null;
                }

                if (!tipRow) {
                  console.warn("[Webhook] creator_tip row not found", {
                    session: session.id,
                    pi: piRef,
                  });
                } else if (tipRow.status === "succeeded") {
                  console.log("[Webhook] creator_tip already succeeded", {
                    tip: tipRow.id,
                  });
                  // Still attempt the wallet credit — idempotent via reference_id.
                  await creditCreatorTipToWallet(supabase, tipRow);
                } else {
                  const { error: tipErr } = await supabase
                    .from("creator_tips")
                    .update({
                      status: "succeeded",
                      payment_provider: "stripe",
                      payment_intent_id: paymentIntentId ?? sessionRef,
                      last_payment_error: null,
                    })
                    .eq("id", tipRow.id);
                  if (tipErr) {
                    console.error("[Webhook] creator_tip flip failed", tipErr);
                  } else {
                    console.log("[Webhook] creator_tip succeeded", {
                      tip: tipRow.id,
                    });
                    await creditCreatorTipToWallet(supabase, tipRow);
                    // Push notify the creator + tipper
                    const creatorId = metadata.creator_id;
                    const isAnon = metadata.is_anonymous === "true";
                    if (creatorId) {
                      try {
                        await fetch(
                          `${supabaseUrl}/functions/v1/send-push-notification`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${supabaseServiceKey}`,
                            },
                            body: JSON.stringify({
                              user_id: creatorId,
                              notification_type: "tip_received",
                              title: "You received a tip! 💰",
                              body: `${isAnon ? "Someone" : "A fan"} sent you $${((session.amount_total || 0) / 100).toFixed(2)}`,
                              data: {
                                type: "tip_received",
                                amount_cents: session.amount_total ?? 0,
                                action_url: "/wallet",
                              },
                            }),
                          },
                        );
                      } catch {}
                    }
                  }
                }
              }
            } else if (metadata.type === "reel_boost") {
              // Reel boost via create-reel-boost. Without this branch, the buyer
              // pays but the reel is never marked as boosted. Idempotent via
              // merchant_boosts.payment_ref UNIQUE-ish on session id.
              if (session.payment_status !== "paid") {
                console.log(
                  "[Webhook] reel_boost session not yet paid:",
                  session.id,
                );
              } else {
                const storeId = metadata.store_id || null;
                const reelId = metadata.reel_id || null;
                const amountCents = session.amount_total || 0;
                const featuredDays = 7; // matches the standard boost duration
                const featuredUntil = new Date(
                  Date.now() + featuredDays * 24 * 60 * 60 * 1000,
                ).toISOString();

                const { data: existing } = await supabase
                  .from("merchant_boosts")
                  .select("id")
                  .eq("payment_ref", session.id)
                  .maybeSingle();

                if (existing) {
                  console.log(
                    "[Webhook] reel_boost already credited:",
                    session.id,
                  );
                } else if (!storeId) {
                  console.warn(
                    "[Webhook] reel_boost missing store_id metadata",
                    { session: session.id },
                  );
                } else {
                  const { error: boostErr } = await supabase
                    .from("merchant_boosts")
                    .insert({
                      store_id: storeId,
                      amount_cents: amountCents,
                      currency: (session.currency || "usd").toUpperCase(),
                      paid_via: "stripe",
                      payment_ref: session.id,
                      featured_until: featuredUntil,
                      status: "active",
                    });
                  if (boostErr) {
                    console.error(
                      "[Webhook] reel_boost insert failed",
                      boostErr,
                    );
                  } else {
                    console.log("[Webhook] reel_boost activated", {
                      store: storeId,
                      reel: reelId,
                      until: featuredUntil,
                    });
                    // Notify the merchant
                    const buyer = metadata.user_id;
                    if (buyer) {
                      try {
                        await fetch(
                          `${supabaseUrl}/functions/v1/send-push-notification`,
                          {
                            method: "POST",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${supabaseServiceKey}`,
                            },
                            body: JSON.stringify({
                              user_id: buyer,
                              notification_type: "boost_activated",
                              title: "Boost active 🚀",
                              body: `Your reel boost is now live for ${featuredDays} days.`,
                              data: {
                                type: "boost_activated",
                                reel_id: reelId,
                                action_url: "/shop-dashboard/attribution",
                              },
                            }),
                          },
                        );
                      } catch {}
                    }
                  }
                }
              }
            } else if (
              metadata.type === "ads_wallet_topup" ||
              (metadata.store_id && metadata.amount_cents)
            ) {
              // SAFETY NET for ads-wallet top-ups. Primary path is verify-ads-wallet-topup
              // (called by SPA on return). If the buyer closed the tab on Stripe's
              // hosted page, they never come back to call verify and the wallet
              // never credits — even though Stripe captured the funds. This branch
              // mirrors verify-ads-wallet-topup and is idempotent via the
              // ads_wallet_ledger.ref_id check.
              if (session.payment_status !== "paid") {
                console.log(
                  "[Webhook] ads_wallet_topup session not yet paid:",
                  session.id,
                );
              } else {
                const storeId = metadata.store_id;
                const amountCents = Number(
                  metadata.amount_cents || session.amount_total || 0,
                );
                if (!storeId || !amountCents) {
                  console.warn(
                    "[Webhook] ads_wallet_topup missing storeId/amount",
                    { session: session.id },
                  );
                } else {
                  const { data: existing } = await supabase
                    .from("ads_wallet_ledger")
                    .select("id")
                    .eq("ref_id", session.id)
                    .maybeSingle();
                  if (existing) {
                    console.log(
                      "[Webhook] ads_wallet_topup already credited:",
                      session.id,
                    );
                  } else {
                    const { data: wallet } = await supabase
                      .from("ads_studio_wallet")
                      .select("balance_cents")
                      .eq("store_id", storeId)
                      .maybeSingle();
                    const newBalance =
                      (wallet?.balance_cents ?? 0) + amountCents;

                    let paymentMethodId: string | null = null;
                    try {
                      if (paymentIntentId) {
                        const stripe = new Stripe(stripeKey!, {
                          apiVersion: "2025-08-27.basil",
                        });
                        const pi =
                          await stripe.paymentIntents.retrieve(paymentIntentId);
                        paymentMethodId =
                          (typeof pi.payment_method === "string"
                            ? pi.payment_method
                            : pi.payment_method?.id) ?? null;
                      }
                    } catch (e) {
                      console.warn(
                        "[Webhook] couldn't retrieve PI for ads_wallet_topup",
                        e,
                      );
                    }

                    const upd: Record<string, unknown> = {
                      balance_cents: newBalance,
                      last_recharge_at: new Date().toISOString(),
                    };
                    if (paymentMethodId)
                      upd.stripe_payment_method_id = paymentMethodId;
                    await supabase
                      .from("ads_studio_wallet")
                      .upsert(
                        { store_id: storeId, ...upd },
                        { onConflict: "store_id" },
                      );

                    await supabase.from("ads_wallet_ledger").insert({
                      store_id: storeId,
                      entry_type: "topup",
                      amount_cents: amountCents,
                      balance_after_cents: newBalance,
                      ref_id: session.id,
                      ref_type: "stripe_checkout_session",
                      description: `Stripe top-up $${(amountCents / 100).toFixed(2)} (webhook safety net)`,
                    });
                    console.log(
                      "[Webhook] ads_wallet credit safety net fired",
                      {
                        store: storeId,
                        amount: amountCents,
                        session: session.id,
                      },
                    );
                  }
                }
              }
            } else if (metadata.type === "salon_deposit") {
              // Salon booking deposit collected at booking time. Idempotent via
              // the booking's deposit_paid_cents > 0 short-circuit — Stripe retries
              // the webhook on transient failures. We also save the Stripe
              // Customer + PaymentMethod off-session so a no-show fee can later
              // be charged via charge-salon-no-show-fee. card_brand/last4 are
              // denormalized so the owner UI's confirm dialog can show
              // "Visa ••4242" without an extra Stripe roundtrip.
              const bookingId = metadata.salon_booking_id as string | undefined;
              if (!bookingId) {
                console.warn("[Webhook] salon_deposit missing booking id", {
                  session: session.id,
                });
              } else if (session.payment_status !== "paid") {
                console.log(
                  "[Webhook] salon_deposit session not yet paid:",
                  session.id,
                );
              } else {
                const { data: existing } = await supabase
                  .from("salon_bookings")
                  .select("id, status, deposit_paid_cents")
                  .eq("id", bookingId)
                  .maybeSingle();
                if (!existing) {
                  console.warn("[Webhook] salon_deposit booking not found", {
                    booking: bookingId,
                  });
                } else if ((existing as any).deposit_paid_cents > 0) {
                  // Idempotent: already credited.
                  console.log("[Webhook] salon_deposit already credited", {
                    booking: bookingId,
                  });
                } else {
                  const amount = session.amount_total ?? 0;
                  const sessionPiId =
                    typeof session.payment_intent === "string"
                      ? session.payment_intent
                      : ((session.payment_intent as any)?.id ?? null);
                  const sessionCustomerId =
                    typeof session.customer === "string"
                      ? session.customer
                      : ((session.customer as any)?.id ?? null);

                  // Best-effort: fetch the PaymentIntent → PaymentMethod to capture
                  // the card brand/last4. Wrapped in try so a Stripe blip doesn't
                  // block the booking confirmation; the no-show flow tolerates
                  // missing card_brand (UI falls back to "card on file").
                  let paymentMethodId: string | null = null;
                  let cardBrand: string | null = null;
                  let cardLast4: string | null = null;
                  if (sessionPiId) {
                    try {
                      const pi =
                        await stripe.paymentIntents.retrieve(sessionPiId);
                      paymentMethodId =
                        typeof pi.payment_method === "string"
                          ? pi.payment_method
                          : ((pi.payment_method as any)?.id ?? null);
                      if (paymentMethodId) {
                        const pm =
                          await stripe.paymentMethods.retrieve(paymentMethodId);
                        if (pm.card) {
                          cardBrand = pm.card.brand ?? null;
                          cardLast4 = pm.card.last4 ?? null;
                        }
                      }
                    } catch (pmErr) {
                      console.warn(
                        "[Webhook] salon_deposit PM fetch failed (non-fatal)",
                        pmErr,
                      );
                    }
                  }

                  await supabase
                    .from("salon_bookings")
                    .update({
                      deposit_paid_cents: amount,
                      deposit_paid_at: new Date().toISOString(),
                      stripe_payment_intent_id: sessionPiId,
                      stripe_customer_id: sessionCustomerId,
                      stripe_payment_method_id: paymentMethodId,
                      card_brand: cardBrand,
                      card_last_four: cardLast4,
                      status: "confirmed",
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", bookingId);
                  console.log("[Webhook] salon_deposit credited", {
                    booking: bookingId,
                    amount,
                    hasCard: !!paymentMethodId,
                  });
                }
              }
            } else if (
              metadata.type === "salon_membership" &&
              session.mode === "subscription"
            ) {
              // Customer just subscribed to a membership tier. Stripe has now
              // created the Customer + Subscription; persist the salon-side
              // record so the admin sees them in the active members list and
              // checkout can read the discount tier. Idempotent via the
              // stripe_subscription_id partial unique index — re-fires from
              // Stripe just UPDATE the row.
              const subscriptionId =
                typeof session.subscription === "string"
                  ? session.subscription
                  : session.subscription?.id;
              const tierId = metadata.tier_id as string | undefined;
              const storeId = metadata.store_id as string | undefined;
              if (!subscriptionId || !tierId || !storeId) {
                console.warn(
                  "[Webhook] salon_membership missing ids on checkout.completed",
                  { session: session.id },
                );
              } else {
                // Retrieve the subscription to get period bounds + status. The
                // checkout.session payload doesn't include them inline.
                const sub = await stripe.subscriptions.retrieve(subscriptionId);
                const customerId =
                  typeof session.customer === "string"
                    ? session.customer
                    : (session.customer?.id ?? null);
                const customerEmail =
                  session.customer_details?.email ||
                  (session.customer_email ?? null);
                const customerName =
                  session.customer_details?.name ||
                  (sub.metadata?.client_name ?? null);

                // Find-or-create the salon_clients row by email at this store.
                // We don't trust customer-supplied phone here; just email +
                // display name. The customer can later link to a hizivo user
                // account via the existing salon_clients ↔ auth.users trigger.
                let clientId: string | null = null;
                if (customerEmail) {
                  const { data: existingClient } = await supabase
                    .from("salon_clients")
                    .select("id")
                    .eq("store_id", storeId)
                    .eq("email", customerEmail)
                    .maybeSingle();
                  if (existingClient) {
                    clientId = (existingClient as any).id;
                  } else {
                    const { data: newClient, error: insErr } = await supabase
                      .from("salon_clients")
                      .insert({
                        store_id: storeId,
                        display_name:
                          customerName ||
                          customerEmail.split("@")[0] ||
                          "Member",
                        email: customerEmail,
                        sms_opt_in: false,
                        email_opt_in: true,
                        marketing_opt_in: false,
                      } as never)
                      .select("id")
                      .single();
                    if (insErr) {
                      console.error(
                        "[Webhook] salon_membership client insert failed",
                        insErr,
                      );
                    } else {
                      clientId = (newClient as any).id;
                    }
                  }
                }

                if (!clientId) {
                  console.warn(
                    "[Webhook] salon_membership couldn't resolve client",
                    { session: session.id },
                  );
                } else {
                  // Map Stripe status → our enum. Defaults to 'incomplete' so
                  // a still-in-flight subscription doesn't grant the discount.
                  const nextStatus =
                    sub.status === "active"
                      ? "active"
                      : sub.status === "trialing"
                        ? "trialing"
                        : sub.status === "past_due"
                          ? "past_due"
                          : sub.status === "canceled"
                            ? "cancelled"
                            : sub.status === "paused"
                              ? "paused"
                              : "incomplete";

                  await supabase.from("salon_client_memberships").upsert(
                    {
                      store_id: storeId,
                      client_id: clientId,
                      tier_id: tierId,
                      status: nextStatus,
                      stripe_customer_id: customerId,
                      stripe_subscription_id: subscriptionId,
                      stripe_checkout_session_id: session.id,
                      current_period_start: sub.current_period_start
                        ? new Date(
                            sub.current_period_start * 1000,
                          ).toISOString()
                        : null,
                      current_period_end: sub.current_period_end
                        ? new Date(sub.current_period_end * 1000).toISOString()
                        : null,
                      cancel_at_period_end: sub.cancel_at_period_end ?? false,
                      started_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    },
                    { onConflict: "stripe_subscription_id" },
                  );
                  console.log("[Webhook] salon_membership created", {
                    subscription: subscriptionId,
                    client: clientId,
                    tier: tierId,
                  });
                }
              }
            }
            // ──── Record 2% platform fee ────
            const merchantId =
              metadata.merchant_id ||
              metadata.restaurant_id ||
              metadata.store_id ||
              null;

            if (session.amount_total && session.amount_total > 0) {
              try {
                const grossCents = session.amount_total;
                const feePct = 2.0;

                // Check for active fee waiver
                let waived = false;
                let waiverId = null;
                if (merchantId) {
                  const { data: waiver } = await supabase
                    .from("merchant_fee_waivers")
                    .select("id, waiver_pct")
                    .eq("store_id", merchantId)
                    .gte("expires_at", new Date().toISOString())
                    .lte("starts_at", new Date().toISOString())
                    .order("waiver_pct", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                  if (waiver && waiver.waiver_pct >= 100) {
                    waived = true;
                    waiverId = waiver.id;
                  }
                }

                const feeAmountCents = waived
                  ? 0
                  : Math.round((grossCents * feePct) / 100);

                await supabase.from("platform_fee_ledger").insert({
                  order_type: metadata.type || "general",
                  order_id: session.id,
                  merchant_id: merchantId,
                  gross_amount_cents: grossCents,
                  fee_pct: waived ? 0 : feePct,
                  fee_amount_cents: feeAmountCents,
                  waived,
                  waiver_id: waiverId,
                });

                if (feeAmountCents > 0) {
                  await supabase.from("admin_wallet_ledger").upsert(
                    {
                      source_type: "platform_fee",
                      source_id: session.id,
                      transaction_id: session.id,
                      amount_cents: feeAmountCents,
                      currency: session.currency?.toUpperCase() || "USD",
                      metadata: {
                        order_type: metadata.type || "general",
                        merchant_id: merchantId,
                        gross_amount_cents: grossCents,
                        fee_pct: feePct,
                      },
                    },
                    { onConflict: "transaction_id,source_type,source_id" },
                  );
                }

                console.log(
                  "[Webhook] Platform fee recorded:",
                  feeAmountCents,
                  "cents",
                  waived ? "(WAIVED)" : "",
                );
              } catch (feeErr) {
                console.error(
                  "[Webhook] Platform fee recording failed:",
                  feeErr,
                );
              }
            }

            if (session.amount_total && session.amount_total > 0) {
              const userId =
                metadata.user_id ||
                metadata.customer_id ||
                metadata.rider_id ||
                null;
              await upsertPurchaseRecord(supabase, {
                userId,
                transactionId: session.id,
                sourceType: metadata.type || "stripe_checkout",
                amountCents: session.amount_total,
                currency: session.currency?.toUpperCase() || "USD",
                status: "completed",
                metadata: {
                  stripe_event_id: event.id,
                  stripe_payment_intent_id: paymentIntentId,
                  merchant_id: merchantId,
                  checkout_session_id: session.id,
                  meta_event_id: session.id,
                },
              });

              if (merchantId) {
                await upsertShopPulse(supabase, merchantId, session.id);
              }
            }

            // ──── Fire Meta CAPI Purchase event ────
            if (session.amount_total && session.amount_total > 0) {
              try {
                const capiUrl = `${supabaseUrl}/functions/v1/meta-capi-bridge`;
                const userId =
                  metadata.user_id ||
                  metadata.customer_id ||
                  metadata.rider_id ||
                  null;
                const capiPayload: Record<string, unknown> = {
                  table: "stripe_checkout",
                  type: "INSERT",
                  record: {
                    id: session.id,
                    user_id: userId,
                    store_id: merchantId,
                    total_amount: session.amount_total / 100,
                    currency: session.currency?.toUpperCase() || "USD",
                    created_at: new Date().toISOString(),
                    service_type: metadata.type || "general",
                    metadata: {
                      store_id: merchantId,
                    },
                  },
                };
                await fetch(capiUrl, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify(capiPayload),
                });
                console.log(
                  "[Webhook] Meta CAPI Purchase event fired for:",
                  session.id,
                );
              } catch (capiErr) {
                console.error("[Webhook] Meta CAPI trigger failed:", capiErr);
              }
            }
            break;
          }

          case "checkout.session.expired": {
            // Customer abandoned the Checkout flow. Currently only the salon
            // deposit flow cares — clear the stored session_id so a retry mints
            // a fresh session. Other domains don't track session_id on the row.
            const session = event.data.object as Stripe.Checkout.Session;
            const metadata = session.metadata ?? {};
            if (
              metadata.type === "salon_deposit" &&
              metadata.salon_booking_id
            ) {
              await supabase
                .from("salon_bookings")
                .update({
                  stripe_checkout_session_id: null,
                  updated_at: new Date().toISOString(),
                })
                .eq("id", metadata.salon_booking_id)
                .eq("stripe_checkout_session_id", session.id); // only clear if still ours
            }
            break;
          }

          case "payment_intent.succeeded": {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            console.log("[Webhook] Payment succeeded:", paymentIntent.id);

            if (
              isCreatorMonetizationDisabled() &&
              paymentIntent.metadata?.type === "zivo_plus_gift"
            ) {
              return creatorMonetizationWebhookAcknowledgement(corsHeaders);
            }

            const coinUserId = paymentIntent.metadata?.user_id;
            const coinPackageId = paymentIntent.metadata?.package_id;
            const coinAmount = parseInt(
              paymentIntent.metadata?.coins || "0",
              10,
            );
            if (
              isCreatorMonetizationDisabled() &&
              coinUserId &&
              coinPackageId &&
              coinAmount > 0
            ) {
              return creatorMonetizationWebhookAcknowledgement(corsHeaders);
            }
            if (
              isCreatorMonetizationDisabled() &&
              paymentIntent.metadata?.type === "creator_tip"
            ) {
              return creatorMonetizationWebhookAcknowledgement(corsHeaders);
            }

            // Update any orders with this payment intent ID
            await supabase
              .from("ride_requests")
              .update({ payment_status: "paid" })
              .eq("stripe_payment_intent_id", paymentIntent.id);

            const { data: foodOrders, error: foodOrdersError } = await supabase
              .from("food_orders")
              .select("id")
              .eq("stripe_payment_id", paymentIntent.id);

            if (foodOrdersError) {
              throw new Error(
                `Could not resolve Stripe Eats payment orders: ${foodOrdersError.message}`,
              );
            }
            const isEatsPaymentIntent = paymentIntent.metadata?.type === "eats";
            let resolvedFoodOrders = (foodOrders ?? []) as { id: string }[];
            if (
              isEatsPaymentIntent &&
              resolvedFoodOrders.length === 0 &&
              paymentIntent.metadata?.order_id
            ) {
              const { data: metadataOrder, error: metadataOrderError } =
                await supabase
                  .from("food_orders")
                  .select("id")
                  .eq("id", paymentIntent.metadata.order_id)
                  .maybeSingle();
              if (metadataOrderError) {
                throw new Error(
                  `Could not resolve Stripe Eats metadata order: ${metadataOrderError.message}`,
                );
              }
              if (metadataOrder) resolvedFoodOrders = [metadataOrder];
            }
            if (isEatsPaymentIntent && resolvedFoodOrders.length === 0) {
              throw new Error(
                `Stripe Eats PaymentIntent ${paymentIntent.id} is not mapped to an order`,
              );
            }

            const receivedCents =
              paymentIntent.amount_received || paymentIntent.amount;
            const currency = paymentIntent.currency.toUpperCase();
            for (const row of resolvedFoodOrders) {
              const settlement = await settleStripeEatsPayment(
                row.id,
                paymentIntent.id,
                receivedCents,
                currency,
              );
              if (settlement.refund_required === true) continue;
              if (settlement.transitioned_to_paid === true) {
                try {
                  await notifyEatsOrderConfirmed(supabase, row.id, "Card");
                } catch (e) {
                  console.warn("[Webhook] eats confirmation email skipped", e);
                }
              }
              if (settlement.dispatch_required === true) {
                const dispatched = await dispatchPaidEatsOrder(
                  supabase,
                  supabaseUrl,
                  supabaseServiceKey,
                  row.id,
                  "stripe-webhook:payment-intent",
                );
                if (!dispatched) {
                  throw new Error(
                    `Eats dispatch remains pending for order ${row.id}`,
                  );
                }
              }
              await reconcileStripeEatsPayout(row.id);
            }

            // Webhook safety net for grocery orders — confirm-grocery-payment is the
            // primary path but if it fails (e.g., client closed tab) the webhook
            // still flips payment_status and fires the confirmation.
            const { data: paidGroceryOrders } = await supabase
              .from("shopping_orders")
              .update({ payment_status: "paid" })
              .eq("stripe_payment_intent_id", paymentIntent.id)
              .neq("payment_status", "paid")
              .select("id");
            for (const row of (paidGroceryOrders ?? []) as { id: string }[]) {
              try {
                await notifyGroceryOrderConfirmed(supabase, row.id, "Card");
              } catch (e) {
                console.warn("[Webhook] grocery confirmation email skipped", e);
              }
            }

            // Webhook safety net for COIN TOP-UPS — verify-coin-purchase is the
            // primary path (called by the SPA). If the buyer closes the tab right
            // after Stripe confirms but before that call, coins never credited.
            // The credit_coin_purchase RPC is idempotent (keyed on session_id /
            // payment_intent_id) so calling it from both paths is safe.
            if (coinUserId && coinPackageId && coinAmount > 0) {
              try {
                const { error: coinErr } = await supabase.rpc(
                  "credit_coin_purchase",
                  {
                    _user_id: coinUserId,
                    _session_id: paymentIntent.id,
                    _package_id: coinPackageId,
                    _coins: coinAmount,
                    _amount_cents:
                      paymentIntent.amount_received ||
                      paymentIntent.amount ||
                      0,
                    _currency: paymentIntent.currency ?? "usd",
                  },
                );
                if (coinErr) {
                  console.error("[Webhook] coin credit failed", coinErr);
                } else {
                  console.log("[Webhook] coin credit safety net fired", {
                    user: coinUserId,
                    coins: coinAmount,
                    pi: paymentIntent.id,
                  });
                  // Notify the user they got their coins (best-effort).
                  try {
                    await supabase.from("user_notifications").insert({
                      user_id: coinUserId,
                      type: "coin_topup_success",
                      entity_id: paymentIntent.id,
                      entity_type: "coin_purchase",
                      message: `+${coinAmount.toLocaleString()} Z Coins added to your wallet`,
                      is_read: false,
                    });
                  } catch (e) {
                    console.warn("[Webhook] coin notify skipped", e);
                  }
                }
              } catch (e) {
                console.error("[Webhook] coin credit error", e);
              }
            }

            // Log for flight payments
            if (paymentIntent.metadata?.type === "flight") {
              await logPaymentAudit(supabase, {
                bookingId: paymentIntent.metadata.booking_id,
                stripeEventType: event.type,
                stripeEventId: event.id,
                stripePaymentIntentId: paymentIntent.id,
                status: "success",
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency.toUpperCase(),
              });
            }

            // ZIVO wallet in-app top-up. The client also verifies immediately after
            // confirmPayment; this webhook is the safety net if the app closes.
            if (paymentIntent.metadata?.type === "user_wallet_topup") {
              const walletUserId = paymentIntent.metadata.user_id;
              const amountCents = Number(
                paymentIntent.metadata.amount_cents ??
                  paymentIntent.amount_received ??
                  paymentIntent.amount ??
                  0,
              );
              const currency = String(
                paymentIntent.metadata.currency ??
                  paymentIntent.currency ??
                  "USD",
              ).toUpperCase();

              if (
                !walletUserId ||
                !Number.isFinite(amountCents) ||
                amountCents <= 0
              ) {
                console.warn(
                  "[Webhook] user_wallet_topup missing user/amount",
                  { pi: paymentIntent.id },
                );
              } else {
                const { error: walletTopupErr } = await supabase.rpc(
                  "credit_user_wallet_topup",
                  {
                    p_user_id: walletUserId,
                    p_amount_cents: amountCents,
                    p_currency: currency,
                    p_stripe_reference: paymentIntent.id,
                    p_description: `Stripe topup ${paymentIntent.id}`,
                  },
                );

                if (walletTopupErr) {
                  console.error(
                    "[Webhook] user_wallet_topup credit failed",
                    walletTopupErr,
                  );
                } else {
                  console.log("[Webhook] user_wallet_topup credited", {
                    user: walletUserId,
                    amount_cents: amountCents,
                    pi: paymentIntent.id,
                  });
                }
              }
            }

            // Creator tip via in-app PaymentIntent (create-tip-payment-intent).
            // Without this branch the tip stays at status='pending' and the creator's
            // wallet never receives the funds — only the checkout-session flow was
            // wired previously.
            if (paymentIntent.metadata?.type === "creator_tip") {
              const { data: tipRow } = await supabase
                .from("creator_tips")
                .select(
                  "id, status, creator_id, amount_cents, tipper_id, is_anonymous, message",
                )
                .eq("payment_intent_id", paymentIntent.id)
                .maybeSingle();

              if (!tipRow) {
                console.warn("[Webhook] creator_tip row not found for PI", {
                  pi: paymentIntent.id,
                });
              } else if ((tipRow as any).status === "succeeded") {
                console.log("[Webhook] creator_tip already succeeded", {
                  tip: (tipRow as any).id,
                });
                await creditCreatorTipToWallet(supabase, tipRow as any);
              } else {
                const { error: flipErr } = await supabase
                  .from("creator_tips")
                  .update({
                    status: "succeeded",
                    payment_provider: "stripe",
                    last_payment_error: null,
                  })
                  .eq("id", (tipRow as any).id);
                if (flipErr) {
                  console.error(
                    "[Webhook] creator_tip PI flip failed",
                    flipErr,
                  );
                } else {
                  console.log("[Webhook] creator_tip succeeded via PI", {
                    tip: (tipRow as any).id,
                  });
                  await creditCreatorTipToWallet(supabase, tipRow as any);
                  const creatorId = (tipRow as any).creator_id;
                  const isAnon = !!(tipRow as any).is_anonymous;
                  const amount =
                    (tipRow as any).amount_cents ?? paymentIntent.amount ?? 0;
                  if (creatorId) {
                    try {
                      await fetch(
                        `${supabaseUrl}/functions/v1/send-push-notification`,
                        {
                          method: "POST",
                          headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${supabaseServiceKey}`,
                          },
                          body: JSON.stringify({
                            user_id: creatorId,
                            notification_type: "tip_received",
                            title: "You received a tip! 💰",
                            body: `${isAnon ? "Someone" : "A fan"} sent you $${(amount / 100).toFixed(2)}`,
                            data: {
                              type: "tip_received",
                              amount_cents: amount,
                              action_url: "/wallet",
                            },
                          }),
                        },
                      );
                    } catch {}
                  }
                }
              }
            }

            // ──── Salon no-show fee succeeded ────
            // Mirrors the salon_deposit credit pattern. The owner triggered this
            // charge from charge-salon-no-show-fee; the webhook finalizes the
            // booking row + records the 2% platform fee. Idempotent via the
            // no_show_fee_charged_cents > 0 short-circuit.
            if (paymentIntent.metadata?.type === "salon_no_show") {
              const noShowBookingId = paymentIntent.metadata
                .salon_booking_id as string | undefined;
              if (noShowBookingId) {
                const { data: existingNoShow } = await supabase
                  .from("salon_bookings")
                  .select("id, no_show_fee_charged_cents")
                  .eq("id", noShowBookingId)
                  .maybeSingle();
                if (!existingNoShow) {
                  console.warn("[Webhook] salon_no_show booking not found", {
                    booking: noShowBookingId,
                  });
                } else if (
                  ((existingNoShow as any).no_show_fee_charged_cents ?? 0) > 0
                ) {
                  console.log("[Webhook] salon_no_show already credited", {
                    booking: noShowBookingId,
                  });
                } else {
                  const amount =
                    paymentIntent.amount_received || paymentIntent.amount || 0;
                  await supabase
                    .from("salon_bookings")
                    .update({
                      no_show_fee_charged_cents: amount,
                      no_show_fee_payment_intent_id: paymentIntent.id,
                      // Clear any prior failure state — a successful retry
                      // shouldn't leave the red "Charge failed" badge up.
                      no_show_fee_charge_failed_at: null,
                      no_show_fee_charge_failed_reason: null,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", noShowBookingId);
                  console.log("[Webhook] salon_no_show credited", {
                    booking: noShowBookingId,
                    amount,
                  });

                  // 2% platform fee ledger (mirrors the salon_deposit pattern at
                  // checkout.session.completed). storeId comes from PI metadata.
                  const storeId = paymentIntent.metadata.store_id || null;
                  if (amount > 0) {
                    try {
                      const feePct = 2.0;
                      let waived = false;
                      let waiverId: string | null = null;
                      if (storeId) {
                        const { data: waiver } = await supabase
                          .from("merchant_fee_waivers")
                          .select("id, waiver_pct")
                          .eq("store_id", storeId)
                          .gte("expires_at", new Date().toISOString())
                          .lte("starts_at", new Date().toISOString())
                          .order("waiver_pct", { ascending: false })
                          .limit(1)
                          .maybeSingle();
                        if (waiver && (waiver as any).waiver_pct >= 100) {
                          waived = true;
                          waiverId = (waiver as any).id;
                        }
                      }
                      const feeAmountCents = waived
                        ? 0
                        : Math.round((amount * feePct) / 100);
                      await supabase.from("platform_fee_ledger").insert({
                        order_type: "salon_no_show",
                        order_id: paymentIntent.id,
                        merchant_id: storeId,
                        gross_amount_cents: amount,
                        fee_pct: waived ? 0 : feePct,
                        fee_amount_cents: feeAmountCents,
                        waived,
                        waiver_id: waiverId,
                      });
                      if (feeAmountCents > 0) {
                        await supabase.from("admin_wallet_ledger").upsert(
                          {
                            source_type: "platform_fee",
                            source_id: paymentIntent.id,
                            transaction_id: paymentIntent.id,
                            amount_cents: feeAmountCents,
                            currency: (
                              paymentIntent.currency ?? "usd"
                            ).toUpperCase(),
                            metadata: {
                              order_type: "salon_no_show",
                              merchant_id: storeId,
                              gross_amount_cents: amount,
                              fee_pct: feePct,
                            },
                          },
                          {
                            onConflict: "transaction_id,source_type,source_id",
                          },
                        );
                      }
                    } catch (feeErr) {
                      console.error(
                        "[Webhook] salon_no_show platform fee recording failed:",
                        feeErr,
                      );
                    }
                  }
                }
              }
            }

            // ──── Salon online tip succeeded ────
            // Customer triggered this via charge-salon-tip. The edge function
            // already credits tip_cents inline when the PI returns 'succeeded'
            // synchronously, but Stripe may also confirm async (3DS step-up
            // after the initial off-session attempt) — in that case the webhook
            // is the only path that credits the tip. Idempotent via the
            // tip_charged_at IS NULL guard.
            if (paymentIntent.metadata?.type === "salon_tip") {
              const tipBookingId = paymentIntent.metadata.salon_booking_id as
                string | undefined;
              if (tipBookingId) {
                const { data: existingTip } = await supabase
                  .from("salon_bookings")
                  .select("id, tip_cents, tip_charged_at")
                  .eq("id", tipBookingId)
                  .maybeSingle();
                if (!existingTip) {
                  console.warn("[Webhook] salon_tip booking not found", {
                    booking: tipBookingId,
                  });
                } else if ((existingTip as any).tip_charged_at) {
                  console.log("[Webhook] salon_tip already credited", {
                    booking: tipBookingId,
                  });
                } else {
                  const amount =
                    paymentIntent.amount_received || paymentIntent.amount || 0;
                  const priorTip =
                    Number((existingTip as any).tip_cents ?? 0) || 0;
                  await supabase
                    .from("salon_bookings")
                    .update({
                      tip_cents: priorTip + amount,
                      tip_charged_at: new Date().toISOString(),
                      tip_stripe_payment_intent_id: paymentIntent.id,
                      // Clear any prior failure state — a successful retry
                      // shouldn't leave a red "Tip charge failed" badge up.
                      tip_charge_failed_at: null,
                      tip_charge_failed_reason: null,
                      updated_at: new Date().toISOString(),
                    })
                    .eq("id", tipBookingId);
                  console.log("[Webhook] salon_tip credited", {
                    booking: tipBookingId,
                    amount,
                  });

                  // 2% platform fee ledger — mirrors the no-show / deposit pattern.
                  const storeId = paymentIntent.metadata.store_id || null;
                  if (amount > 0) {
                    try {
                      const feePct = 2.0;
                      let waived = false;
                      let waiverId: string | null = null;
                      if (storeId) {
                        const { data: waiver } = await supabase
                          .from("merchant_fee_waivers")
                          .select("id, waiver_pct")
                          .eq("store_id", storeId)
                          .gte("expires_at", new Date().toISOString())
                          .lte("starts_at", new Date().toISOString())
                          .order("waiver_pct", { ascending: false })
                          .limit(1)
                          .maybeSingle();
                        if (waiver && (waiver as any).waiver_pct >= 100) {
                          waived = true;
                          waiverId = (waiver as any).id;
                        }
                      }
                      const feeAmountCents = waived
                        ? 0
                        : Math.round((amount * feePct) / 100);
                      await supabase.from("platform_fee_ledger").insert({
                        order_type: "salon_tip",
                        order_id: paymentIntent.id,
                        merchant_id: storeId,
                        gross_amount_cents: amount,
                        fee_pct: waived ? 0 : feePct,
                        fee_amount_cents: feeAmountCents,
                        waived,
                        waiver_id: waiverId,
                      });
                      if (feeAmountCents > 0) {
                        await supabase.from("admin_wallet_ledger").upsert(
                          {
                            source_type: "platform_fee",
                            source_id: paymentIntent.id,
                            transaction_id: paymentIntent.id,
                            amount_cents: feeAmountCents,
                            currency: (
                              paymentIntent.currency ?? "usd"
                            ).toUpperCase(),
                            metadata: {
                              order_type: "salon_tip",
                              merchant_id: storeId,
                              gross_amount_cents: amount,
                              fee_pct: feePct,
                            },
                          },
                          {
                            onConflict: "transaction_id,source_type,source_id",
                          },
                        );
                      }
                    } catch (feeErr) {
                      console.error(
                        "[Webhook] salon_tip platform fee recording failed:",
                        feeErr,
                      );
                    }
                  }
                }
              }
            }
            break;
          }

          case "payment_intent.payment_failed": {
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            console.log("[Webhook] Payment failed:", paymentIntent.id);
            const failedUserId =
              paymentIntent.metadata?.user_id ||
              paymentIntent.metadata?.customer_id ||
              paymentIntent.metadata?.rider_id;

            // Update any orders with this payment intent ID
            await supabase
              .from("ride_requests")
              .update({ payment_status: "failed", status: "cancelled" })
              .eq("stripe_payment_intent_id", paymentIntent.id);

            const { data: failedFoodOrders, error: failedFoodOrdersError } =
              await supabase
                .from("food_orders")
                .select("id")
                .eq("stripe_payment_id", paymentIntent.id);
            if (failedFoodOrdersError) {
              throw new Error(
                `Could not resolve failed Stripe Eats orders: ${failedFoodOrdersError.message}`,
              );
            }
            const isEatsFailedPaymentIntent =
              paymentIntent.metadata?.type === "eats";
            let resolvedFailedFoodOrders = (failedFoodOrders ?? []) as {
              id: string;
            }[];
            if (
              isEatsFailedPaymentIntent &&
              resolvedFailedFoodOrders.length === 0 &&
              paymentIntent.metadata?.order_id
            ) {
              const { data: metadataOrder, error: metadataOrderError } =
                await supabase
                  .from("food_orders")
                  .select("id")
                  .eq("id", paymentIntent.metadata.order_id)
                  .maybeSingle();
              if (metadataOrderError) {
                throw new Error(
                  `Could not resolve failed Stripe Eats metadata order: ${metadataOrderError.message}`,
                );
              }
              if (metadataOrder) resolvedFailedFoodOrders = [metadataOrder];
            }
            if (
              isEatsFailedPaymentIntent &&
              resolvedFailedFoodOrders.length === 0
            ) {
              throw new Error(
                `Failed Stripe Eats PaymentIntent ${paymentIntent.id} is not mapped to an order`,
              );
            }
            for (const row of resolvedFailedFoodOrders) {
              const { data: transitionData, error: transitionError } =
                await supabase.rpc("transition_eats_payment_status", {
                  p_order_id: row.id,
                  p_provider: "stripe",
                  p_payment_id: paymentIntent.id,
                  p_next_status: "failed",
                  p_error:
                    paymentIntent.last_payment_error?.message ??
                    "Stripe reported a payment failure",
                });
              const transition = rpcObject(transitionData);
              if (transitionError || !transition?.ok) {
                throw (
                  transitionError ||
                  new Error(
                    transition?.code ??
                      "Could not persist failed Stripe Eats payment",
                  )
                );
              }
            }

            // Notify user: payment failed
            if (failedUserId) {
              try {
                await fetch(
                  `${supabaseUrl}/functions/v1/send-push-notification`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({
                      user_id: failedUserId,
                      notification_type: "payment_failed",
                      title: "Payment Failed ❌",
                      body: `Your payment of ${formatStripeAmount(paymentIntent.amount, paymentIntent.currency)} could not be processed. Please try again.`,
                      data: { type: "payment_failed", action_url: "/wallet" },
                    }),
                  },
                );
              } catch {}
            }

            // Handle flight payment failures
            if (paymentIntent.metadata?.type === "flight") {
              await supabase
                .from("flight_bookings")
                .update({
                  payment_status: "failed",
                  ticketing_status: "cancelled",
                })
                .eq("stripe_payment_intent_id", paymentIntent.id);

              await logPaymentAudit(supabase, {
                bookingId: paymentIntent.metadata.booking_id,
                stripeEventType: event.type,
                stripeEventId: event.id,
                stripePaymentIntentId: paymentIntent.id,
                status: "failed",
                errorMessage:
                  paymentIntent.last_payment_error?.message || "Payment failed",
                amount: paymentIntent.amount / 100,
                currency: paymentIntent.currency.toUpperCase(),
              });

              await supabase.from("flight_admin_alerts").insert({
                booking_id: paymentIntent.metadata.booking_id,
                alert_type: "payment_failed",
                message: `Payment failed: ${paymentIntent.last_payment_error?.message || "Unknown error"}`,
                severity: "high",
              });
            }

            // ──── Salon no-show fee failed (e.g., card declined off-session) ────
            // The edge function persists the same fields synchronously on a
            // catch — the webhook is the async safety net for cases where the
            // PI authorization succeeded then later flipped to requires_action
            // / requires_payment_method.
            if (paymentIntent.metadata?.type === "salon_no_show") {
              const noShowBookingId = paymentIntent.metadata
                .salon_booking_id as string | undefined;
              if (noShowBookingId) {
                const reason =
                  paymentIntent.last_payment_error?.message ||
                  paymentIntent.last_payment_error?.code ||
                  "unknown";
                await supabase
                  .from("salon_bookings")
                  .update({
                    no_show_fee_charge_failed_at: new Date().toISOString(),
                    no_show_fee_charge_failed_reason: reason,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", noShowBookingId);
                console.log("[Webhook] salon_no_show charge failed", {
                  booking: noShowBookingId,
                  reason,
                });
              }
            }

            // ──── Salon online tip failed (e.g., card declined off-session) ────
            // The charge-salon-tip edge function persists the failure synchronously
            // on a catch — this is the async safety net for cases where the PI
            // authorization succeeded then later flipped to requires_action /
            // requires_payment_method.
            if (paymentIntent.metadata?.type === "salon_tip") {
              const tipBookingId = paymentIntent.metadata.salon_booking_id as
                string | undefined;
              if (tipBookingId) {
                const reason =
                  paymentIntent.last_payment_error?.message ||
                  paymentIntent.last_payment_error?.code ||
                  "unknown";
                await supabase
                  .from("salon_bookings")
                  .update({
                    tip_charge_failed_at: new Date().toISOString(),
                    tip_charge_failed_reason: reason,
                    updated_at: new Date().toISOString(),
                  })
                  .eq("id", tipBookingId);
                console.log("[Webhook] salon_tip charge failed", {
                  booking: tipBookingId,
                  reason,
                });
              }
            }
            break;
          }

          case "refund.updated":
          case "refund.failed": {
            const refund = event.data.object as Stripe.Refund;
            const isExactEatsRefund = refund.metadata?.type === "eats";
            const objectPaymentIntentId =
              typeof refund.payment_intent === "string"
                ? refund.payment_intent
                : refund.payment_intent?.id;
            const metadataPaymentIntentId = isExactEatsRefund
              ? String(refund.metadata?.payment_intent_id ?? "").trim()
              : "";
            if (
              objectPaymentIntentId &&
              metadataPaymentIntentId &&
              objectPaymentIntentId !== metadataPaymentIntentId
            ) {
              throw new Error(
                `Stripe Eats refund ${refund.id} has conflicting PaymentIntent evidence`,
              );
            }
            const paymentIntentId =
              objectPaymentIntentId || metadataPaymentIntentId || undefined;
            if (!paymentIntentId) {
              if (isExactEatsRefund) {
                throw new Error(
                  `Stripe Eats refund ${refund.id} has no PaymentIntent evidence`,
                );
              }
              break;
            }

            const { data: eatsOrders, error: eatsOrdersError } = await supabase
              .from("food_orders")
              .select("id")
              .eq("stripe_payment_id", paymentIntentId);
            if (eatsOrdersError) {
              throw new Error(
                `Could not resolve Stripe Eats refund orders: ${eatsOrdersError.message}`,
              );
            }
            let resolvedEatsOrders = (eatsOrders ?? []) as { id: string }[];
            const metadataOrderId = isExactEatsRefund
              ? String(refund.metadata?.order_id ?? "").trim()
              : "";
            if (resolvedEatsOrders.length === 0 && metadataOrderId) {
              const { data: metadataOrder, error: metadataOrderError } =
                await supabase
                  .from("food_orders")
                  .select("id")
                  .eq("id", metadataOrderId)
                  .maybeSingle();
              if (metadataOrderError) {
                throw new Error(
                  `Could not resolve Stripe Eats refund metadata order: ${metadataOrderError.message}`,
                );
              }
              if (metadataOrder) resolvedEatsOrders = [metadataOrder];
            }
            if (
              isExactEatsRefund &&
              metadataOrderId &&
              resolvedEatsOrders.length > 0 &&
              !resolvedEatsOrders.some((row) => row.id === metadataOrderId)
            ) {
              throw new Error(
                `Stripe Eats refund ${refund.id} has conflicting order evidence`,
              );
            }
            if (resolvedEatsOrders.length === 0) {
              if (isExactEatsRefund) {
                throw new Error(
                  `Stripe Eats refund ${refund.id} is not mapped to an order`,
                );
              }
              break;
            }
            if (
              !refund.id ||
              !Number.isSafeInteger(refund.amount) ||
              refund.amount <= 0 ||
              !refund.currency
            ) {
              throw new Error(
                `Stripe Eats refund ${refund.id || "unknown"} has invalid provider evidence`,
              );
            }

            const refundOutcome = normalizeStripeRefundOutcome(refund.status);
            if (event.type === "refund.failed" && refundOutcome !== "failed") {
              throw new Error(
                `Stripe refund.failed ${refund.id} did not contain failed evidence`,
              );
            }
            for (const row of resolvedEatsOrders) {
              const finish = await finishStripeEatsRefundEvidence({
                orderId: row.id,
                paymentIntentId,
                refundId: refund.id,
                amountCents: refund.amount,
                currency: refund.currency,
                status: refundOutcome,
                error:
                  refundOutcome === "succeeded"
                    ? null
                    : String(
                        (refund as any).failure_reason ??
                          `Stripe refund ${refund.status ?? "pending"}`,
                      ),
              });
              // The evidence RPC is monotonic. A stale pending/failed delivery
              // after exact success can still report aggregate completion; only
              // that aggregate authority may cascade cancellation and reverse
              // the merchant transfer.
              if (
                finish.refund_complete !== true ||
                finish.payment_status !== "refunded"
              ) {
                continue;
              }
              await cascadeCancellationToDriver(supabase, row.id, "delivery");
              await queueEatsAutoReversal(
                row.id,
                "eats_refund_evidence_completed",
              );
            }
            break;
          }

          case "charge.refunded": {
            const charge = event.data.object as Stripe.Charge;
            const isEatsCharge = charge.metadata?.type === "eats";
            const paymentIntentId =
              typeof charge.payment_intent === "string"
                ? charge.payment_intent
                : charge.payment_intent?.id;
            const refundAmount = charge.amount_refunded / 100;

            console.log(
              "[Webhook] Charge refunded:",
              charge.id,
              "Amount:",
              refundAmount,
              "PI:",
              paymentIntentId,
            );

            // Notify user about refund
            const refundUserId =
              charge.metadata?.user_id ||
              charge.metadata?.customer_id ||
              charge.metadata?.rider_id;
            if (refundUserId) {
              try {
                await fetch(
                  `${supabaseUrl}/functions/v1/send-push-notification`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${supabaseServiceKey}`,
                    },
                    body: JSON.stringify({
                      user_id: refundUserId,
                      notification_type: "refund_processed",
                      title: "Refund Processed 💵",
                      body: `${formatStripeAmount(charge.amount_refunded, charge.currency)} has been refunded to your payment method`,
                      data: {
                        type: "refund_processed",
                        amount: refundAmount,
                        action_url: "/wallet",
                      },
                    }),
                  },
                );
              } catch {}
            }

            if (!paymentIntentId && isEatsCharge) {
              throw new Error(
                `Stripe Eats charge ${charge.id} has no PaymentIntent evidence`,
              );
            }

            if (paymentIntentId) {
              // Update ride requests
              await supabase
                .from("ride_requests")
                .update({
                  refund_status: "refunded",
                  refunded_at: new Date().toISOString(),
                })
                .eq("stripe_payment_intent_id", paymentIntentId);

              // Finalize Eats refunds only when Stripe confirms the full, exact order
              // amount for the same PaymentIntent. Partial refunds remain pending
              // reconciliation and never generate a false "complete" notification.
              const { data: eatsOrders, error: eatsOrdersError } =
                await supabase
                  .from("food_orders")
                  .select("id")
                  .eq("stripe_payment_id", paymentIntentId);
              if (eatsOrdersError) {
                throw new Error(
                  `Could not resolve refunded Stripe Eats orders: ${eatsOrdersError.message}`,
                );
              }
              let resolvedEatsOrders = (eatsOrders ?? []) as { id: string }[];
              if (
                isEatsCharge &&
                resolvedEatsOrders.length === 0 &&
                charge.metadata?.order_id
              ) {
                const { data: metadataOrder, error: metadataOrderError } =
                  await supabase
                    .from("food_orders")
                    .select("id")
                    .eq("id", charge.metadata.order_id)
                    .maybeSingle();
                if (metadataOrderError) {
                  throw new Error(
                    `Could not resolve refunded Stripe Eats metadata order: ${metadataOrderError.message}`,
                  );
                }
                if (metadataOrder) resolvedEatsOrders = [metadataOrder];
              }
              if (isEatsCharge && resolvedEatsOrders.length === 0) {
                throw new Error(
                  `Refunded Stripe Eats charge ${charge.id} is not mapped to an order`,
                );
              }
              if (
                resolvedEatsOrders.length > 0 &&
                (!Number.isSafeInteger(charge.amount) ||
                  charge.amount <= 0 ||
                  !charge.currency)
              ) {
                throw new Error(
                  `Stripe Eats charge ${charge.id} has invalid settlement evidence`,
                );
              }
              // Backfill the exact captured-payment evidence for historical
              // orders before binding provider refund records. This direct RPC
              // is intentionally not settleStripeEatsPayment: a verified refund
              // event must never initiate a second compensating refund.
              for (const row of resolvedEatsOrders) {
                await recordStripeEatsSettlementEvidence(
                  row.id,
                  paymentIntentId,
                  charge.amount,
                  charge.currency,
                );
              }
              const succeededRefunds =
                resolvedEatsOrders.length > 0
                  ? await listSucceededStripeRefunds(charge.id)
                  : [];
              if (
                resolvedEatsOrders.length > 0 &&
                succeededRefunds.length === 0
              ) {
                throw new Error(
                  `Stripe Eats charge ${charge.id} has no succeeded refund evidence`,
                );
              }
              for (const row of resolvedEatsOrders) {
                let finish: Record<string, any> | null = null;
                for (const refund of succeededRefunds) {
                  finish = await finishStripeEatsRefundEvidence({
                    orderId: row.id,
                    paymentIntentId,
                    refundId: refund.id,
                    amountCents: refund.amount,
                    currency: refund.currency,
                    status: "succeeded",
                  });
                }
                if (finish?.payment_status !== "refunded") continue;
                await cascadeCancellationToDriver(supabase, row.id, "delivery");
                const { data: refundedOrder, error: refundStateError } =
                  await supabase
                    .from("food_orders")
                    .update({
                      refund_status: "refunded",
                      refunded_at: new Date().toISOString(),
                    })
                    .eq("id", row.id)
                    .eq("payment_status", "refunded")
                    .select("id")
                    .maybeSingle();
                if (refundStateError || !refundedOrder) {
                  throw new Error(
                    `Could not persist Stripe Eats refund state: ${refundStateError?.message ?? "order state changed"}`,
                  );
                }
                await queueEatsAutoReversal(row.id, "eats_refund_completed");
                try {
                  await notifyEatsRefundIssued(
                    supabase,
                    row.id,
                    charge.amount_refunded,
                    "Card",
                    "complete",
                  );
                } catch (e) {
                  console.warn("[Webhook] eats refund email skipped", e);
                }
              }

              // Update P2P bookings
              await supabase
                .from("p2p_bookings")
                .update({
                  refund_status: "refunded",
                  payment_status: "refunded",
                  refunded_at: new Date().toISOString(),
                })
                .eq("stripe_payment_intent_id", paymentIntentId);

              // Update flight bookings
              const { data: flightBooking } = await supabase
                .from("flight_bookings")
                .update({
                  refund_status: "refunded",
                  payment_status: "refunded",
                  refund_amount: refundAmount,
                  refund_processed_at: new Date().toISOString(),
                })
                .eq("stripe_payment_intent_id", paymentIntentId)
                .select("id")
                .single();

              if (flightBooking) {
                await logPaymentAudit(supabase, {
                  bookingId: flightBooking.id,
                  stripeEventType: event.type,
                  stripeEventId: event.id,
                  stripePaymentIntentId: paymentIntentId,
                  status: "success",
                  amount: refundAmount,
                  currency: charge.currency.toUpperCase(),
                  metadata: { refund_id: charge.refunds?.data?.[0]?.id },
                });
              }

              // Salon booking deposit refunds — the owner can refund the deposit
              // manually from Stripe's dashboard; our DB stays in sync via this
              // webhook. amount_refunded is the cumulative refund across all
              // refund events on the charge, so we always overwrite (not increment).
              await supabase
                .from("salon_bookings")
                .update({
                  deposit_refunded_cents: charge.amount_refunded,
                  deposit_refunded_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("stripe_payment_intent_id", paymentIntentId);

              // Salon no-show fee refunds — same pattern, different column. The
              // no-show charge lives on a separate PI (created off-session by
              // charge-salon-no-show-fee) so we key off no_show_fee_payment_intent_id.
              await supabase
                .from("salon_bookings")
                .update({
                  no_show_fee_refunded_cents: charge.amount_refunded,
                  no_show_fee_refunded_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                })
                .eq("no_show_fee_payment_intent_id", paymentIntentId);
            }
            break;
          }

          case "charge.dispute.created": {
            const dispute = event.data.object as Stripe.Dispute;
            const chargeId =
              typeof dispute.charge === "string"
                ? dispute.charge
                : dispute.charge?.id;

            console.log(
              "[Webhook] DISPUTE CREATED:",
              dispute.id,
              "Reason:",
              dispute.reason,
              "Amount:",
              dispute.amount / 100,
            );

            // Get the charge to find the payment intent
            if (chargeId) {
              const charge = await stripe.charges.retrieve(chargeId);
              const paymentIntentId =
                typeof charge.payment_intent === "string"
                  ? charge.payment_intent
                  : charge.payment_intent?.id;

              if (paymentIntentId) {
                // Update flight bookings with dispute info
                const { data: flightBooking } = await supabase
                  .from("flight_bookings")
                  .update({
                    dispute_status: dispute.status,
                    dispute_id: dispute.id,
                    dispute_created_at: new Date().toISOString(),
                  })
                  .eq("stripe_payment_intent_id", paymentIntentId)
                  .select("id, booking_reference")
                  .single();

                if (flightBooking) {
                  // Create CRITICAL admin alert
                  await supabase.from("flight_admin_alerts").insert({
                    booking_id: flightBooking.id,
                    alert_type: "dispute_created",
                    message: `🚨 CHARGEBACK DISPUTE: Booking ${flightBooking.booking_reference}. Reason: ${dispute.reason}. Amount: ${formatStripeAmount(dispute.amount, dispute.currency)}. Respond within deadline!`,
                    severity: "critical",
                  });

                  await logPaymentAudit(supabase, {
                    bookingId: flightBooking.id,
                    stripeEventType: event.type,
                    stripeEventId: event.id,
                    stripePaymentIntentId: paymentIntentId,
                    status: "dispute_opened",
                    amount: dispute.amount / 100,
                    currency: dispute.currency.toUpperCase(),
                    metadata: {
                      dispute_id: dispute.id,
                      reason: dispute.reason,
                      evidence_due_by: dispute.evidence_details?.due_by,
                    },
                  });
                }

                // Also check P2P bookings
                await supabase
                  .from("p2p_bookings")
                  .update({
                    dispute_status: dispute.status,
                  })
                  .eq("stripe_payment_intent_id", paymentIntentId);
              }
            }
            break;
          }

          case "charge.dispute.closed": {
            const dispute = event.data.object as Stripe.Dispute;
            const chargeId =
              typeof dispute.charge === "string"
                ? dispute.charge
                : dispute.charge?.id;

            console.log(
              "[Webhook] Dispute closed:",
              dispute.id,
              "Status:",
              dispute.status,
            );

            if (chargeId) {
              const charge = await stripe.charges.retrieve(chargeId);
              const paymentIntentId =
                typeof charge.payment_intent === "string"
                  ? charge.payment_intent
                  : charge.payment_intent?.id;

              if (paymentIntentId) {
                const { data: flightBooking } = await supabase
                  .from("flight_bookings")
                  .update({
                    dispute_status: dispute.status,
                  })
                  .eq("stripe_payment_intent_id", paymentIntentId)
                  .select("id, booking_reference")
                  .single();

                if (flightBooking) {
                  const isWon = dispute.status === "won";
                  await supabase.from("flight_admin_alerts").insert({
                    booking_id: flightBooking.id,
                    alert_type: "dispute_closed",
                    message: isWon
                      ? `✅ Dispute WON for booking ${flightBooking.booking_reference}`
                      : `❌ Dispute LOST for booking ${flightBooking.booking_reference}. Amount: $${dispute.amount / 100}`,
                    severity: isWon ? "low" : "high",
                  });

                  await logPaymentAudit(supabase, {
                    bookingId: flightBooking.id,
                    stripeEventType: event.type,
                    stripeEventId: event.id,
                    stripePaymentIntentId: paymentIntentId,
                    status: dispute.status,
                    amount: dispute.amount / 100,
                    metadata: { dispute_id: dispute.id },
                  });
                }
              }
            }
            break;
          }

          // ============ ZIVO+ MEMBERSHIP SUBSCRIPTION EVENTS ============
          case "customer.subscription.created":
          case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;
            const metadata = subscription.metadata || {};

            // Creator tier subscription — written from subscribe-to-tier checkout.
            // Metadata is set by stripe.checkout.sessions.create({ metadata: { tier_id, creator_id, subscriber_id } })
            // and propagates to the resulting Subscription via session settings.
            if (
              metadata.tier_id &&
              metadata.creator_id &&
              metadata.subscriber_id
            ) {
              if (isCreatorMonetizationDisabled())
                return creatorMonetizationWebhookAcknowledgement(corsHeaders);
              // Wind down adult-creator subscriptions that predate the payment
              // boundary (see _shared/adultCreatorPaymentBoundary.ts). The create
              // paths refuse new ones, but a subscription opened before that guard
              // existed keeps renewing on its own — so blocking only new charges
              // would leave restricted content settling on this account every
              // month, which is precisely what a processor review would find.
              //
              // Cancelled AT PERIOD END, not immediately: the subscriber has paid
              // for the current period and pulling access mid-term would take
              // something they are owed and invite the dispute this is meant to
              // avoid. No further renewal is charged.
              //
              // Idempotent — the flag is only set when not already set, so repeated
              // webhook deliveries do not re-issue the Stripe call.
              if (
                subscription.status !== "canceled" &&
                !subscription.cancel_at_period_end &&
                (await isAdultCreatorAccount(supabase, metadata.creator_id))
              ) {
                try {
                  await stripe.subscriptions.update(subscription.id, {
                    cancel_at_period_end: true,
                    metadata: { ...metadata, adult_creator_wind_down: "true" },
                  });
                  console.log(
                    "[Webhook] adult-creator subscription set to cancel at period end",
                    {
                      sub: subscription.id,
                    },
                  );
                } catch (windDownError) {
                  // Surfaced rather than swallowed: a failure here means the
                  // subscription is still due to renew, and someone has to know.
                  console.error("[Webhook] adult-creator wind-down failed", {
                    sub: subscription.id,
                    error:
                      windDownError instanceof Error
                        ? windDownError.message
                        : String(windDownError),
                  });
                }
              }

              const periodEnd = subscription.current_period_end
                ? new Date(subscription.current_period_end * 1000).toISOString()
                : null;
              const status =
                subscription.status === "active" ||
                subscription.status === "trialing"
                  ? "active"
                  : subscription.status; // canceled | incomplete | past_due | etc.

              // Pull the unit price off the first item to record price_cents at the time of subscription.
              const item = subscription.items?.data?.[0];
              const priceCents = item?.price?.unit_amount ?? null;

              const row = {
                creator_id: metadata.creator_id,
                subscriber_id: metadata.subscriber_id,
                tier_id: metadata.tier_id,
                status,
                price_cents: priceCents,
                stripe_subscription_id: subscription.id,
                payment_method: "stripe",
                started_at: new Date(
                  subscription.start_date * 1000,
                ).toISOString(),
                expires_at: periodEnd,
              } as any;

              // Upsert by stripe_subscription_id so retries don't double-insert.
              const { error: subErr } = await supabase
                .from("creator_subscriptions")
                .upsert(row, { onConflict: "stripe_subscription_id" });
              if (subErr) {
                console.error(
                  "[Webhook] creator_subscriptions upsert failed",
                  subErr,
                );
              } else {
                console.log("[Webhook] creator_subscriptions synced", {
                  sub: subscription.id,
                  status,
                });
              }

              // Notify creator + subscriber on first activation.
              if (
                event.type === "customer.subscription.created" &&
                status === "active"
              ) {
                try {
                  await fetch(
                    `${supabaseUrl}/functions/v1/send-push-notification`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${supabaseServiceKey}`,
                      },
                      body: JSON.stringify({
                        user_id: metadata.creator_id,
                        notification_type: "creator_new_subscriber",
                        title: "New subscriber 🎉",
                        body: `Someone subscribed to your ${item?.price?.nickname || "tier"} tier.`,
                        data: {
                          type: "creator_new_subscriber",
                          tier_id: metadata.tier_id,
                          action_url: "/creator/dashboard",
                        },
                      }),
                    },
                  );
                } catch {}
                try {
                  await fetch(
                    `${supabaseUrl}/functions/v1/send-push-notification`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${supabaseServiceKey}`,
                      },
                      body: JSON.stringify({
                        user_id: metadata.subscriber_id,
                        notification_type: "subscription_active",
                        title: "Subscription active ✨",
                        body: `Your subscription is active. Welcome aboard!`,
                        data: {
                          type: "subscription_active",
                          creator_id: metadata.creator_id,
                          action_url: `/u/${metadata.creator_id}`,
                        },
                      }),
                    },
                  );
                } catch {}
              }
              break;
            }

            // Only handle membership subscriptions
            if (
              metadata.type === "membership" &&
              metadata.user_id &&
              metadata.plan_id
            ) {
              console.log(
                "[Webhook] Membership subscription event:",
                event.type,
                "Sub:",
                subscription.id,
              );

              try {
                const currentPeriodStart =
                  (subscription as any).current_period_start ??
                  subscription.start_date;
                const currentPeriodEnd =
                  (subscription as any).current_period_end ??
                  (subscription as any).items?.data?.[0]?.current_period_end;
                await syncZivoPlusSubscription(supabase, {
                  userId: metadata.user_id,
                  planId: metadata.plan_id,
                  status: subscription.status,
                  billingCycle:
                    metadata.billing_cycle ||
                    (metadata.plan === "annual" ? "yearly" : "monthly"),
                  planCode:
                    metadata.plan ||
                    (metadata.billing_cycle === "yearly"
                      ? "annual"
                      : "monthly"),
                  currentPeriodStart: new Date(
                    currentPeriodStart * 1000,
                  ).toISOString(),
                  currentPeriodEnd: new Date(
                    currentPeriodEnd * 1000,
                  ).toISOString(),
                  stripeSubscriptionId: subscription.id,
                });
                console.log(
                  "[Webhook] Membership subscription synced:",
                  metadata.user_id,
                  "Status:",
                  subscription.status,
                );
                // Notify user: ZIVO+ activated
                if (subscription.status === "active") {
                  try {
                    await fetch(
                      `${supabaseUrl}/functions/v1/send-push-notification`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${supabaseServiceKey}`,
                        },
                        body: JSON.stringify({
                          user_id: metadata.user_id,
                          notification_type: "membership_activated",
                          title: "Welcome to ZIVO+ ⭐",
                          body: "Your premium membership is now active. Enjoy exclusive perks!",
                          data: {
                            type: "membership_activated",
                            action_url: "/account",
                          },
                        }),
                      },
                    );
                  } catch {}
                }
              } catch (upsertError) {
                console.error(
                  "[Webhook] Error syncing membership:",
                  upsertError,
                );
              }
            }

            // ──── Salon membership subscription update ────
            // The checkout.session.completed handler creates the
            // salon_client_memberships row; this lifecycle event keeps status +
            // period bounds in sync as the subscription lives through trial →
            // active → past_due → cancel.
            if (metadata.type === "salon_membership") {
              const nextStatus =
                subscription.status === "active"
                  ? "active"
                  : subscription.status === "trialing"
                    ? "trialing"
                    : subscription.status === "past_due"
                      ? "past_due"
                      : subscription.status === "canceled"
                        ? "cancelled"
                        : subscription.status === "paused"
                          ? "paused"
                          : "incomplete";

              const { error: salonSubErr } = await supabase
                .from("salon_client_memberships")
                .update({
                  status: nextStatus,
                  current_period_start: (subscription as any)
                    .current_period_start
                    ? new Date(
                        (subscription as any).current_period_start * 1000,
                      ).toISOString()
                    : null,
                  current_period_end: (subscription as any).current_period_end
                    ? new Date(
                        (subscription as any).current_period_end * 1000,
                      ).toISOString()
                    : null,
                  cancel_at_period_end:
                    subscription.cancel_at_period_end ?? false,
                  updated_at: new Date().toISOString(),
                })
                .eq("stripe_subscription_id", subscription.id);
              if (salonSubErr) {
                console.error(
                  "[Webhook] salon_membership update failed",
                  salonSubErr,
                );
              } else {
                console.log("[Webhook] salon_membership synced", {
                  sub: subscription.id,
                  status: nextStatus,
                });
              }
            }
            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const metadata = subscription.metadata || {};

            // Creator tier cancellation
            if (
              metadata.tier_id &&
              metadata.creator_id &&
              metadata.subscriber_id
            ) {
              const cancelledAt = subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000).toISOString()
                : new Date().toISOString();
              const { error } = await supabase
                .from("creator_subscriptions")
                .update({ status: "cancelled", cancelled_at: cancelledAt })
                .eq("stripe_subscription_id", subscription.id);
              if (error) {
                console.error(
                  "[Webhook] creator_subscriptions cancel failed",
                  error,
                );
              } else {
                console.log(
                  "[Webhook] creator subscription cancelled",
                  subscription.id,
                );
                try {
                  await fetch(
                    `${supabaseUrl}/functions/v1/send-push-notification`,
                    {
                      method: "POST",
                      headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${supabaseServiceKey}`,
                      },
                      body: JSON.stringify({
                        user_id: metadata.subscriber_id,
                        notification_type: "subscription_cancelled",
                        title: "Subscription cancelled",
                        body: "Your creator subscription was cancelled. You can resubscribe anytime.",
                        data: {
                          type: "subscription_cancelled",
                          creator_id: metadata.creator_id,
                          action_url: `/u/${metadata.creator_id}`,
                        },
                      }),
                    },
                  );
                } catch {}
              }
              break;
            }

            if (metadata.type === "membership") {
              console.log(
                "[Webhook] Membership subscription deleted:",
                subscription.id,
              );

              const { error: updateError } = await supabase
                .from("zivo_subscriptions")
                .update({
                  status: "cancelled",
                  cancelled_at: new Date().toISOString(),
                })
                .eq("stripe_subscription_id", subscription.id);

              if (updateError) {
                console.error(
                  "[Webhook] Error cancelling membership:",
                  updateError,
                );
              } else {
                console.log(
                  "[Webhook] Membership cancelled for subscription:",
                  subscription.id,
                );
                if (metadata.user_id) {
                  try {
                    await fetch(
                      `${supabaseUrl}/functions/v1/send-push-notification`,
                      {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${supabaseServiceKey}`,
                        },
                        body: JSON.stringify({
                          user_id: metadata.user_id,
                          notification_type: "membership_cancelled",
                          title: "ZIVO+ Cancelled",
                          body: "Your ZIVO+ membership has been cancelled. You can resubscribe anytime.",
                          data: {
                            type: "membership_cancelled",
                            action_url: "/account",
                          },
                        }),
                      },
                    );
                  } catch {}
                }
              }
            }

            // ──── Salon membership cancellation ────
            if (metadata.type === "salon_membership") {
              const cancelledAt = subscription.canceled_at
                ? new Date(subscription.canceled_at * 1000).toISOString()
                : new Date().toISOString();
              const { error: salonCancelErr } = await supabase
                .from("salon_client_memberships")
                .update({
                  status: "cancelled",
                  cancelled_at: cancelledAt,
                  cancel_at_period_end: false,
                  updated_at: new Date().toISOString(),
                })
                .eq("stripe_subscription_id", subscription.id);
              if (salonCancelErr) {
                console.error(
                  "[Webhook] salon_membership cancel failed",
                  salonCancelErr,
                );
              } else {
                console.log(
                  "[Webhook] salon_membership cancelled",
                  subscription.id,
                );
              }
            }
            break;
          }

          case "invoice.paid": {
            const invoice = event.data.object as Stripe.Invoice;
            const subscriptionId =
              typeof invoice.subscription === "string"
                ? invoice.subscription
                : invoice.subscription?.id;

            if (subscriptionId) {
              // Check if this is a membership subscription
              const { data: existingSub } = await supabase
                .from("zivo_subscriptions")
                .select("id")
                .eq("stripe_subscription_id", subscriptionId)
                .maybeSingle();

              if (existingSub) {
                console.log(
                  "[Webhook] Membership invoice paid, ensuring active status",
                );
                await supabase
                  .from("zivo_subscriptions")
                  .update({ status: "active" })
                  .eq("stripe_subscription_id", subscriptionId);
              }
            }
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            const subscriptionId =
              typeof invoice.subscription === "string"
                ? invoice.subscription
                : invoice.subscription?.id;

            if (subscriptionId) {
              // Check if this is a membership subscription
              const { data: existingSub } = await supabase
                .from("zivo_subscriptions")
                .select("id")
                .eq("stripe_subscription_id", subscriptionId)
                .maybeSingle();

              if (existingSub) {
                console.log(
                  "[Webhook] Membership invoice payment failed, setting past_due",
                );
                await supabase
                  .from("zivo_subscriptions")
                  .update({ status: "past_due" })
                  .eq("stripe_subscription_id", subscriptionId);
              }
            }
            break;
          }

          // ============ STRIPE IDENTITY (KYC) ============
          case "identity.verification_session.verified":
          case "identity.verification_session.requires_input":
          case "identity.verification_session.processing":
          case "identity.verification_session.canceled": {
            const vs = event.data.object as any;
            const userId = vs.metadata?.user_id;
            const role = vs.metadata?.role || "creator";
            if (!userId) {
              console.warn(
                "[Webhook] identity event missing user_id metadata",
                { id: vs.id, type: event.type },
              );
              break;
            }

            const verified =
              event.type === "identity.verification_session.verified";
            const requiresInput =
              event.type === "identity.verification_session.requires_input";
            const canceled =
              event.type === "identity.verification_session.canceled";

            const submissionStatus = verified
              ? "verified"
              : canceled
                ? "canceled"
                : requiresInput
                  ? "requires_input"
                  : "pending";

            const update: Record<string, any> = {
              stripe_verification_status: vs.status,
              status: submissionStatus,
              updated_at: new Date().toISOString(),
            };
            if (verified) {
              update.stripe_verified_at = new Date().toISOString();
              update.reviewed_at = new Date().toISOString();
            }
            if (requiresInput && vs.last_error?.reason) {
              update.rejection_reason = vs.last_error.reason;
            }

            await supabase
              .from("kyc_submissions")
              .update(update)
              .eq("stripe_verification_session_id", vs.id);

            // Mirror to creator_profiles.is_verified for the existing dashboard.
            if (role === "creator") {
              if (verified) {
                await supabase
                  .from("creator_profiles")
                  .update({ is_verified: true })
                  .eq("user_id", userId);
              } else if (canceled || requiresInput) {
                // Don't unset is_verified — once verified, stays verified.
                // Just log for ops via console.
              }
            }

            // Notify the user.
            try {
              const titleByEvent: Record<string, string> = {
                "identity.verification_session.verified": "Identity verified ✓",
                "identity.verification_session.requires_input":
                  "Identity check needs more info",
                "identity.verification_session.canceled":
                  "Identity check cancelled",
                "identity.verification_session.processing":
                  "Identity check processing",
              };
              const bodyByEvent: Record<string, string> = {
                "identity.verification_session.verified":
                  "Your identity has been verified. Payouts and other gated features are now available.",
                "identity.verification_session.requires_input":
                  "Stripe needs another document or photo to complete your verification.",
                "identity.verification_session.canceled":
                  "Your identity verification was cancelled. You can restart any time.",
                "identity.verification_session.processing":
                  "We're reviewing your documents — usually takes a few minutes.",
              };
              await fetch(
                `${supabaseUrl}/functions/v1/send-push-notification`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${supabaseServiceKey}`,
                  },
                  body: JSON.stringify({
                    user_id: userId,
                    notification_type: "identity_verification_update",
                    title: titleByEvent[event.type] || "Identity update",
                    body: bodyByEvent[event.type] || "",
                    data: {
                      type: "identity_verification_update",
                      status: vs.status,
                      action_url: "/creator/setup?step=verify",
                    },
                  }),
                },
              );
            } catch (e) {
              console.warn("[Webhook] identity notify failed", e);
            }

            console.log("[Webhook] identity event handled", {
              type: event.type,
              user: userId,
              status: vs.status,
            });
            break;
          }

          case "account.updated": {
            // Stripe sends this whenever a connected Express/Standard/Custom
            // account's onboarding state changes — payouts enable, requirements
            // become due, capabilities flip, etc. We only act on accounts our
            // connect-onboard-stylist function created (metadata.source set).
            const account = event.data.object as Stripe.Account;
            const source =
              (account.metadata?.source as string | undefined) ?? "";
            const stylistId =
              (account.metadata?.stylist_id as string | undefined) ?? "";

            if (source !== "salon_stylist" || !stylistId) {
              // Other connect flows (creator wallets, owner accounts) update their
              // own state via stripe_connect_accounts elsewhere. This handler is
              // intentionally scoped to stylist accounts only.
              console.log(
                "[Webhook] account.updated — not a salon_stylist account",
                {
                  account: account.id,
                  source,
                },
              );
              break;
            }

            const detailsSubmitted = account.details_submitted ?? false;
            const chargesEnabled = account.charges_enabled ?? false;
            const payoutsEnabled = account.payouts_enabled ?? false;
            const disabledReason =
              account.requirements?.disabled_reason ?? null;

            // Status precedence:
            //   - disabled_reason set → restricted (Stripe blocked them)
            //   - payouts_enabled === true → active (good state)
            //   - details_submitted === false → pending (still onboarding)
            //   - otherwise → pending (submitted but Stripe still reviewing)
            let nextStatus: "pending" | "active" | "restricted" = "pending";
            if (disabledReason) {
              nextStatus = "restricted";
            } else if (payoutsEnabled) {
              nextStatus = "active";
            }

            const { error: upErr } = await supabase
              .from("salon_stylists")
              .update({
                stripe_connect_status: nextStatus,
                stripe_connect_charges_enabled: chargesEnabled,
                stripe_connect_payouts_enabled: payoutsEnabled,
                stripe_connect_details_submitted: detailsSubmitted,
                stripe_connect_updated_at: new Date().toISOString(),
              })
              .eq("id", stylistId)
              .eq("stripe_connect_account_id", account.id);

            if (upErr) {
              console.error(
                "[Webhook] account.updated — stylist update failed",
                upErr,
              );
            } else {
              console.log("[Webhook] stylist Stripe Connect updated", {
                stylist: stylistId,
                account: account.id,
                status: nextStatus,
                payouts: payoutsEnabled,
                disabled: disabledReason,
              });
            }
            break;
          }

          default:
            console.log("[Webhook] Unhandled event type:", event.type);
        }

        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      } catch (error: unknown) {
        console.error("[Webhook] Error:", error);
        const message =
          error instanceof Error ? error.message : "An error occurred";
        return new Response(JSON.stringify({ error: message }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }
    },
    {
      rateLimit: "payment",
      strictCors: true,
      allowedMethods: ["POST"],
      skipBotDetection: true,
      skipWaf: true,
      trackNetwork: "suspicious",
    },
  ),
);
