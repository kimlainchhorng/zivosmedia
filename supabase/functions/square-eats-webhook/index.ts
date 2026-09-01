/**
 * square-eats-webhook
 * --------------------
 * Idempotent receiver for Square Webhooks targeting Eats orders. Verifies the
 * HMAC-SHA256 signature against the registered notification URL, persists every
 * event to eats_square_webhook_events (UNIQUE on square_event_id), and updates
 * food_orders.payment_status on the events we care about.
 */
import { createClient } from "../_shared/deps.ts";
import { notifyEatsOrderConfirmed } from "../_shared/eats-notifications.ts";
import { cascadeCancellationToDriver } from "../_shared/cancellation-cascade.ts";
import { requireExplicitProviderMode } from "../_shared/providerMode.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const EATS_DISPATCH_PENDING_ERROR = "delivery_dispatch_pending";
const squareBase = () =>
  requireExplicitProviderMode("SQUARE_MODE") === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

function rpcObject(value: unknown): Record<string, any> | null {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && typeof candidate === "object"
    ? (candidate as Record<string, any>)
    : null;
}

async function cascadeRefundCancellation(
  admin: any,
  orderId: string,
): Promise<void> {
  const { data, error } = await admin.rpc("cascade_eats_cancellation", {
    p_order_id: orderId,
    p_cancel_source: "provider_refund",
  });
  const result = rpcObject(data);
  if (error || !result?.ok) {
    throw new Error(
      error?.message || result?.code || "cancellation_cascade_pending",
    );
  }
  await cascadeCancellationToDriver(admin, orderId, "delivery");
}

type ProviderRefundEvidence = {
  completed: boolean;
  id: string;
  amountCents: number;
  currency: string;
  status: string;
  outcome: "succeeded" | "pending" | "failed";
  error: string | null;
};

class ProviderRefundRequestError extends Error {
  constructor(
    message: string,
    readonly compatibilityFinishAllowed: boolean,
  ) {
    super(message);
    this.name = "ProviderRefundRequestError";
  }
}

function squareRefundIdempotencyKey(
  paymentId: string,
  amountCents: number,
  attemptGeneration = 0,
): string {
  const paymentSuffix = paymentId.slice(attemptGeneration > 0 ? -20 : -24);
  const base = `eats-${paymentSuffix}-${amountCents}`;
  return attemptGeneration > 0 ? `${base}-r${attemptGeneration}` : base;
}

async function refundCompletedPayment(
  paymentId: string,
  orderId: string,
  amountCents: number,
  currency: string,
  idempotencyKey: string,
  attemptGeneration: number,
): Promise<ProviderRefundEvidence> {
  if (
    !Number.isSafeInteger(attemptGeneration) ||
    attemptGeneration < 0 ||
    attemptGeneration > 999999
  ) {
    throw new ProviderRefundRequestError(
      "Square refund attempt generation is invalid",
      false,
    );
  }
  const expectedKey = squareRefundIdempotencyKey(
    paymentId,
    amountCents,
    attemptGeneration,
  );
  if (idempotencyKey !== expectedKey) {
    throw new ProviderRefundRequestError(
      "Square refund idempotency evidence does not match the payment",
      false,
    );
  }
  const accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
  if (!accessToken) throw new Error("Square access token not configured");
  let response: Response;
  try {
    response = await fetch(`${squareBase()}/v2/refunds`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2025-01-22",
      },
      body: JSON.stringify({
        idempotency_key: idempotencyKey,
        payment_id: paymentId,
        amount_money: { amount: amountCents, currency },
        reason: `ZIVO Eats payment reconciliation ${orderId}`,
      }),
    });
  } catch (error) {
    throw new ProviderRefundRequestError(
      error instanceof Error ? error.message : "Square refund request failed",
      true,
    );
  }
  const payload = await response.json().catch(() => ({}));
  const providerRefund = payload?.refund ?? null;
  const refundId =
    typeof providerRefund?.id === "string" && providerRefund.id.trim()
      ? providerRefund.id.trim()
      : null;
  const providerPaymentId = String(providerRefund?.payment_id ?? "").trim();
  const refundAmountCents = Number(providerRefund?.amount_money?.amount);
  const refundCurrency = String(
    providerRefund?.amount_money?.currency ?? "",
  ).toUpperCase();
  const status = String(providerRefund?.status ?? "PENDING").toUpperCase();
  const providerError =
    payload?.errors?.[0]?.detail ||
    (response.ok ? null : `Square refund failed (${response.status})`);
  const outcome =
    status === "COMPLETED"
      ? "succeeded"
      : ["PENDING", "PROCESSING"].includes(status)
        ? "pending"
        : ["REJECTED", "FAILED", "CANCELED", "CANCELLED"].includes(status)
          ? "failed"
          : null;
  if (
    !refundId ||
    providerPaymentId !== paymentId ||
    !Number.isSafeInteger(refundAmountCents) ||
    refundAmountCents <= 0 ||
    !/^[A-Z]{3}$/.test(refundCurrency) ||
    !outcome
  ) {
    throw new ProviderRefundRequestError(
      providerError || "Square refund evidence is incomplete",
      !response.ok && !refundId,
    );
  }

  const completed = outcome === "succeeded";
  return {
    completed,
    id: refundId,
    amountCents: refundAmountCents,
    currency: refundCurrency,
    status,
    outcome,
    error:
      outcome === "failed" ? providerError || `Square refund ${status}` : null,
  };
}

async function persistSquareRefundEvidence(
  admin: any,
  orderId: string,
  paymentId: string,
  refund: ProviderRefundEvidence,
): Promise<Record<string, any>> {
  const { data, error } = await admin.rpc(
    "finish_eats_provider_refund_with_evidence",
    {
      p_order_id: orderId,
      p_provider: "square",
      p_payment_id: paymentId,
      p_refund_id: refund.id,
      p_refund_amount_cents: refund.amountCents,
      p_refund_currency: refund.currency,
      p_refund_status: refund.outcome,
      p_error: refund.error,
    },
  );
  const finish = rpcObject(data);
  if (error || !finish?.ok) {
    throw error || new Error(finish?.code ?? "Could not persist Square refund");
  }
  return finish;
}

async function preserveSquareRefundRetry(
  admin: any,
  orderId: string,
  paymentId: string,
  message: string,
): Promise<void> {
  const { data, error } = await admin.rpc("finish_eats_provider_refund", {
    p_order_id: orderId,
    p_provider: "square",
    p_payment_id: paymentId,
    p_refund_succeeded: false,
    p_error: message,
  });
  const finish = rpcObject(data);
  if (error || !finish?.ok) {
    throw (
      error ||
      new Error(finish?.code ?? "Could not preserve Square refund retry")
    );
  }
}

async function reconcileSquareRefund(
  admin: any,
  paymentId: string,
  orderId: string,
  amountCents: number,
  currency: string,
  idempotencyKey = squareRefundIdempotencyKey(paymentId, amountCents),
  attemptGeneration = 0,
): Promise<{
  refund: ProviderRefundEvidence;
  finish: Record<string, any>;
}> {
  let refund: ProviderRefundEvidence;
  try {
    refund = await refundCompletedPayment(
      paymentId,
      orderId,
      amountCents,
      currency,
      idempotencyKey,
      attemptGeneration,
    );
  } catch (error) {
    if (
      error instanceof ProviderRefundRequestError &&
      error.compatibilityFinishAllowed
    ) {
      await preserveSquareRefundRetry(admin, orderId, paymentId, error.message);
    }
    throw error;
  }

  const finish = await persistSquareRefundEvidence(
    admin,
    orderId,
    paymentId,
    refund,
  );
  return { refund, finish };
}

async function dispatchPaidEatsOrder(
  admin: any,
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
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({ order_id: orderId }),
      },
    );
    const payload = await response.json().catch(() => null);
    if (!response.ok || payload?.ok !== true) {
      console.error("[square-eats-webhook] dispatch remains pending", {
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
      console.error("[square-eats-webhook] could not clear dispatch marker", {
        order_id: orderId,
        error: clearError?.message ?? "order_state_changed",
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error("[square-eats-webhook] dispatch remains pending", {
      order_id: orderId,
      error: error instanceof Error ? error.name : "unknown",
    });
    return false;
  }
}

async function hmacSha256Base64(key: string, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(message),
  );
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verify(req: Request, raw: string): Promise<boolean> {
  const key =
    Deno.env.get("SQUARE_EATS_WEBHOOK_SIGNATURE_KEY") ??
    Deno.env.get("SQUARE_WEBHOOK_SIGNATURE_KEY");
  const url =
    Deno.env.get("SQUARE_EATS_WEBHOOK_NOTIFICATION_URL") ??
    Deno.env.get("SQUARE_WEBHOOK_NOTIFICATION_URL");
  if (!key || !url) return false;
  const provided = req.headers.get("x-square-hmacsha256-signature");
  if (!provided) return false;
  const expected = await hmacSha256Base64(key, url + raw);
  if (expected.length !== provided.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++)
    diff |= expected.charCodeAt(i) ^ provided.charCodeAt(i);
  return diff === 0;
}

const ORDER_RE = /Eats order\s+([0-9a-f-]{36})/i;

Deno.serve(
  withSecurity(
    "square-eats-webhook",
    async (req) => {
      if (req.method !== "POST")
        return new Response("method not allowed", { status: 405 });

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const raw = await req.text();
      let event: any;
      try {
        event = JSON.parse(raw);
      } catch {
        return new Response("invalid json", { status: 400 });
      }

      let verified = false;
      try {
        verified = await verify(req, raw);
      } catch (e) {
        console.error("[square-eats-webhook] verify err", e);
      }
      if (!verified) {
        return new Response(JSON.stringify({ error: "signature_invalid" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const eventId = event.event_id as string;
      const eventType = event.type as string;
      const data = event.data?.object ?? {};
      const payment = data.payment ?? null;
      const refund = data.refund ?? null;
      const paymentId: string | null =
        payment?.id ?? refund?.payment_id ?? null;
      const checkoutId: string | null = payment?.order_id ?? null;
      const note: string | null = payment?.note ?? refund?.reason ?? null;

      let resolvedOrderId: string | null = null;
      if (paymentId) {
        const { data: o, error: paymentLookupError } = await admin
          .from("food_orders")
          .select("id")
          .eq("square_payment_id", paymentId)
          .maybeSingle();
        if (paymentLookupError) {
          console.error(
            "[square-eats-webhook] Square payment lookup failed",
            paymentLookupError,
          );
          return new Response(
            JSON.stringify({ error: "order_lookup_failed" }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        resolvedOrderId = (o as any)?.id ?? null;
      }
      if (!resolvedOrderId && note) {
        const m = note.match(ORDER_RE);
        if (m) {
          const { data: o, error: noteLookupError } = await admin
            .from("food_orders")
            .select("id")
            .eq("id", m[1])
            .maybeSingle();
          if (noteLookupError) {
            console.error(
              "[square-eats-webhook] Square order note lookup failed",
              noteLookupError,
            );
            return new Response(
              JSON.stringify({ error: "order_lookup_failed" }),
              {
                status: 503,
                headers: { "Content-Type": "application/json" },
              },
            );
          }
          resolvedOrderId = (o as any)?.id ?? null;
        }
      }

      const processingLeaseToken = crypto.randomUUID();
      const { data: inserted, error: insertError } = await admin
        .from("eats_square_webhook_events")
        .upsert(
          {
            square_event_id: eventId,
            event_type: eventType,
            event_created_at: event.created_at ?? null,
            order_id: resolvedOrderId,
            square_payment_id: paymentId,
            square_checkout_id: checkoutId,
            processing_status: "received",
            processing_started_at: new Date().toISOString(),
            processing_lease_token: processingLeaseToken,
            processing_attempts: 1,
            payload: event,
          },
          { onConflict: "square_event_id", ignoreDuplicates: true },
        )
        .select("id")
        .maybeSingle();
      if (insertError) {
        console.error("[square-eats-webhook] event log failed", insertError);
        return new Response(JSON.stringify({ error: "event_log_failed" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      let logRowId = (inserted as any)?.id as string | undefined;
      if (!logRowId) {
        const { data: claimData, error: claimError } = await admin.rpc(
          "claim_eats_square_webhook_event",
          {
            p_event_id: eventId,
            p_lease_token: processingLeaseToken,
            p_lease_seconds: 300,
          },
        );
        const claim = rpcObject(claimData);
        if (claimError) {
          console.error(
            "[square-eats-webhook] event retry claim failed",
            claimError.message,
          );
          return new Response(
            JSON.stringify({ error: "event_retry_pending" }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        if (claim?.code === "complete") {
          return new Response(JSON.stringify({ received: true, dedup: true }), {
            headers: { "Content-Type": "application/json" },
          });
        }
        if (claim?.ok !== true || claim?.code !== "claimed" || !claim?.id) {
          return new Response(
            JSON.stringify({ error: "event_retry_pending" }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        logRowId = String(claim.id);
      }

      let processingStatus: "applied" | "skipped" | "error" = "skipped";
      let processingError: string | null = null;
      const requiresResolvedOrder =
        ((eventType === "payment.created" || eventType === "payment.updated") &&
          payment?.status === "COMPLETED") ||
        eventType === "refund.updated" ||
        eventType === "refund.created";

      try {
        if (!resolvedOrderId && requiresResolvedOrder) {
          throw new Error("Square money event could not resolve a local order");
        }
        if (resolvedOrderId) {
          if (
            eventType === "payment.created" ||
            eventType === "payment.updated"
          ) {
            const status: string | undefined = payment?.status;
            if (status === "COMPLETED") {
              const amountCents = Number(payment?.amount_money?.amount);
              const currency = String(
                payment?.amount_money?.currency ?? "",
              ).toUpperCase();
              if (
                !paymentId ||
                !Number.isSafeInteger(amountCents) ||
                amountCents <= 0 ||
                !currency
              ) {
                throw new Error("Square settlement evidence is incomplete");
              }
              const { data: settlementData, error: settlementError } =
                await admin.rpc("record_eats_provider_settlement", {
                  p_order_id: resolvedOrderId,
                  p_provider: "square",
                  p_payment_id: paymentId,
                  p_amount_cents: amountCents,
                  p_currency: currency,
                });
              const settlement = rpcObject(settlementData);
              if (settlementError || !settlement?.ok) {
                throw (
                  settlementError ||
                  new Error(
                    settlement?.code ?? "Could not persist Square settlement",
                  )
                );
              }
              if (settlement.code === "already_refunded") {
                if (settlement.payment_status === "refunded") {
                  await cascadeRefundCancellation(admin, resolvedOrderId);
                }
                processingStatus = "applied";
                processingError = null;
              } else if (settlement.refund_required === true) {
                const refundAmountCents = Number(
                  settlement.refund_amount_cents,
                );
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
                const exactRefundEvidenceAvailable =
                  String(settlement.provider_payment_id ?? "").trim() ===
                    paymentId &&
                  Number.isSafeInteger(refundAmountCents) &&
                  refundAmountCents > 0 &&
                  refundCurrency === currency &&
                  Number.isSafeInteger(refundAttemptGeneration) &&
                  refundAttemptGeneration >= 0 &&
                  refundAttemptGeneration <= 999999 &&
                  refundEvidenceId.length > 0 &&
                  refundIdempotencyKey ===
                    squareRefundIdempotencyKey(
                      paymentId,
                      refundAmountCents,
                      refundAttemptGeneration,
                    );
                if (!exactRefundEvidenceAvailable) {
                  throw new Error(
                    "Square settlement refund evidence is incomplete",
                  );
                }
                const { refund: refundResult, finish } =
                  await reconcileSquareRefund(
                    admin,
                    paymentId,
                    resolvedOrderId,
                    refundAmountCents,
                    refundCurrency,
                    refundIdempotencyKey,
                    refundAttemptGeneration,
                  );
                const refundResolved =
                  refundResult.completed && finish.refund_complete === true;
                if (refundResolved && finish.payment_status === "refunded") {
                  await cascadeRefundCancellation(admin, resolvedOrderId);
                }
                processingStatus = refundResolved ? "applied" : "error";
                processingError = refundResolved
                  ? null
                  : refundResult.error ||
                    "Additional Square refund remains pending";
              } else if (settlement.reconciliation_required === true) {
                throw new Error(
                  "Square payment reconciliation remains pending",
                );
              } else {
                if (settlement.transitioned_to_paid === true) {
                  try {
                    await notifyEatsOrderConfirmed(
                      admin,
                      resolvedOrderId,
                      "Square",
                    );
                  } catch (e) {
                    console.warn(
                      "[square-eats-webhook] confirmation email skipped",
                      e,
                    );
                  }
                }
                const dispatched =
                  settlement.dispatch_required === true
                    ? await dispatchPaidEatsOrder(
                        admin,
                        supabaseUrl,
                        serviceKey,
                        resolvedOrderId,
                      )
                    : true;
                processingStatus = dispatched ? "applied" : "error";
                processingError = dispatched
                  ? null
                  : EATS_DISPATCH_PENDING_ERROR;
              }
            } else {
              let next: string | null = null;
              let paymentError: string | null = null;
              if (status === "APPROVED") next = "authorized";
              else if (status === "PENDING") next = "processing";
              else if (status === "CANCELED") next = "unpaid";
              else if (status === "FAILED") {
                next = "failed";
                paymentError =
                  payment?.failure_reason ?? "Square reported a failure";
              }
              if (next) {
                const { data: transitionData, error: transitionError } =
                  await admin.rpc("transition_eats_payment_status", {
                    p_order_id: resolvedOrderId,
                    p_provider: "square",
                    p_payment_id: paymentId,
                    p_next_status: next,
                    p_error: paymentError,
                  });
                if (transitionError) throw transitionError;
                processingStatus = rpcObject(transitionData)?.ok
                  ? "applied"
                  : "skipped";
              }
            }
          } else if (
            eventType === "refund.updated" ||
            eventType === "refund.created"
          ) {
            const status: string | undefined = refund?.status;
            const refundAmountCents = Number(refund?.amount_money?.amount);
            const refundCurrency = String(
              refund?.amount_money?.currency ?? "",
            ).toUpperCase();
            const refundId = String(refund?.id ?? "").trim();
            const refundStatus = String(status ?? "").toUpperCase();
            const refundSucceeded = refundStatus === "COMPLETED";
            const refundPending = ["PENDING", "PROCESSING"].includes(
              refundStatus,
            );
            const refundFailed = ["REJECTED", "FAILED", "CANCELED"].includes(
              refundStatus,
            );
            if (
              !paymentId ||
              !refundId ||
              !Number.isSafeInteger(refundAmountCents) ||
              refundAmountCents <= 0 ||
              !/^[A-Z]{3}$/.test(refundCurrency) ||
              (!refundSucceeded && !refundPending && !refundFailed)
            ) {
              throw new Error("Square refund evidence is incomplete");
            }

            const finish = await persistSquareRefundEvidence(
              admin,
              resolvedOrderId,
              paymentId,
              {
                completed: refundSucceeded,
                id: refundId,
                amountCents: refundAmountCents,
                currency: refundCurrency,
                status: refundStatus,
                outcome: refundSucceeded
                  ? "succeeded"
                  : refundFailed
                    ? "failed"
                    : "pending",
                error: refundFailed ? `Square refund ${refundStatus}` : null,
              },
            );
            const refundComplete = finish.refund_complete === true;
            if (refundComplete && finish.payment_status === "refunded") {
              await cascadeRefundCancellation(admin, resolvedOrderId);
            }
            processingStatus =
              refundSucceeded && !refundComplete ? "error" : "applied";
            processingError =
              refundSucceeded && !refundComplete
                ? "Additional Square refund remains pending"
                : null;
          }
        }
      } catch (e: any) {
        processingStatus = "error";
        processingError = String(e?.message || e);
        console.error("[square-eats-webhook] handler error", e);
      }

      const { data: updatedLog, error: logUpdateError } = await admin
        .from("eats_square_webhook_events")
        .update({
          processing_status: processingStatus,
          error_message: processingError,
          order_id: resolvedOrderId,
        })
        .eq("id", logRowId)
        .eq("processing_lease_token", processingLeaseToken)
        .select("id")
        .maybeSingle();
      if (logUpdateError || !updatedLog) {
        console.error(
          "[square-eats-webhook] event status update failed",
          logUpdateError,
        );
        return new Response(JSON.stringify({ error: "event_status_pending" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ received: true, status: processingStatus }),
        {
          status: processingStatus === "error" ? 503 : 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    },
    {
      allowedMethods: ["POST"],
      rateLimit: "payment",
      strictCors: true,
      skipBotDetection: true,
      skipWaf: true,
      trackNetwork: "suspicious",
    },
  ),
);
