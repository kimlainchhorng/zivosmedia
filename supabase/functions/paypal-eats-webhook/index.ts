/**
 * paypal-eats-webhook
 * --------------------
 * Idempotent receiver for PayPal Webhooks targeting Eats orders. Verifies the
 * signature via PayPal's verify-webhook-signature endpoint, persists every
 * event to eats_paypal_webhook_events (UNIQUE on paypal_event_id), and updates
 * food_orders.payment_status on the events we care about.
 */
import { createClient } from "../_shared/deps.ts";
import { notifyEatsOrderConfirmed } from "../_shared/eats-notifications.ts";
import { cascadeCancellationToDriver } from "../_shared/cancellation-cascade.ts";
import { requireExplicitProviderMode } from "../_shared/providerMode.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const paypalBase = () =>
  requireExplicitProviderMode("PAYPAL_MODE") === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
const EATS_DISPATCH_PENDING_ERROR = "delivery_dispatch_pending";

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
      console.error("[paypal-eats-webhook] dispatch remains pending", {
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
      console.error("[paypal-eats-webhook] could not clear dispatch marker", {
        order_id: orderId,
        error: clearError?.message ?? "order_state_changed",
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error("[paypal-eats-webhook] dispatch remains pending", {
      order_id: orderId,
      error: error instanceof Error ? error.name : "unknown",
    });
    return false;
  }
}

async function token() {
  const id = Deno.env.get("PAYPAL_CLIENT_ID");
  const secret = Deno.env.get("PAYPAL_CLIENT_SECRET");
  if (!id || !secret) throw new Error("PayPal credentials not configured");
  const res = await fetch(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal auth failed: ${await res.text()}`);
  return (await res.json()).access_token as string;
}

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

function dollarsToCents(value: unknown): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return Math.round(amount * 100);
}

function completedCapture(resource: any, eventType: string): any | null {
  if (eventType === "PAYMENT.CAPTURE.COMPLETED") return resource;
  return resource?.purchase_units?.[0]?.payments?.captures?.[0] ?? null;
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

function paypalRefundIdempotencyKey(
  captureId: string,
  amountCents: number,
  attemptGeneration = 0,
): string {
  const paymentSuffix = captureId.slice(attemptGeneration > 0 ? -14 : -20);
  const base = `eats-${paymentSuffix}-${amountCents}`;
  return attemptGeneration > 0 ? `${base}-r${attemptGeneration}` : base;
}

async function refundCapturedPayment(
  accessToken: string,
  captureId: string,
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
      "PayPal refund attempt generation is invalid",
      false,
    );
  }
  const expectedKey = paypalRefundIdempotencyKey(
    captureId,
    amountCents,
    attemptGeneration,
  );
  if (idempotencyKey !== expectedKey) {
    throw new ProviderRefundRequestError(
      "PayPal refund idempotency evidence does not match the payment",
      false,
    );
  }

  let response: Response;
  try {
    response = await fetch(
      `${paypalBase()}/v2/payments/captures/${captureId}/refund`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "PayPal-Request-Id": idempotencyKey,
        },
        body: JSON.stringify({
          amount: {
            value: (amountCents / 100).toFixed(2),
            currency_code: currency,
          },
          invoice_id: orderId,
          note_to_payer: "ZIVO Eats payment reconciliation refund",
        }),
      },
    );
  } catch (error) {
    throw new ProviderRefundRequestError(
      error instanceof Error ? error.message : "PayPal refund request failed",
      true,
    );
  }
  const payload = await response.json().catch(() => ({}));
  const refundId =
    typeof payload?.id === "string" && payload.id.trim()
      ? payload.id.trim()
      : null;
  const refundAmountCents = dollarsToCents(payload?.amount?.value);
  const refundCurrency = String(
    payload?.amount?.currency_code ?? "",
  ).toUpperCase();
  const status = String(payload?.status ?? "PENDING").toUpperCase();
  const providerError =
    payload?.details?.[0]?.description ||
    payload?.message ||
    (response.ok ? null : `PayPal refund failed (${response.status})`);
  const outcome =
    status === "COMPLETED"
      ? "succeeded"
      : ["PENDING", "PROCESSING"].includes(status)
        ? "pending"
        : ["FAILED", "DENIED", "CANCELED", "CANCELLED"].includes(status)
          ? "failed"
          : null;
  if (
    !refundId ||
    refundAmountCents == null ||
    !/^[A-Z]{3}$/.test(refundCurrency) ||
    !outcome
  ) {
    throw new ProviderRefundRequestError(
      providerError || "PayPal refund evidence is incomplete",
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
      outcome === "failed" ? providerError || `PayPal refund ${status}` : null,
  };
}

async function persistPayPalRefundEvidence(
  admin: any,
  orderId: string,
  captureId: string,
  refund: ProviderRefundEvidence,
): Promise<Record<string, any>> {
  const { data, error } = await admin.rpc(
    "finish_eats_provider_refund_with_evidence",
    {
      p_order_id: orderId,
      p_provider: "paypal",
      p_payment_id: captureId,
      p_refund_id: refund.id,
      p_refund_amount_cents: refund.amountCents,
      p_refund_currency: refund.currency,
      p_refund_status: refund.outcome,
      p_error: refund.error,
    },
  );
  const finish = rpcObject(data);
  if (error || !finish?.ok) {
    throw error || new Error(finish?.code ?? "Could not persist PayPal refund");
  }
  return finish;
}

async function preservePayPalRefundRetry(
  admin: any,
  orderId: string,
  captureId: string,
  message: string,
): Promise<void> {
  const { data, error } = await admin.rpc("finish_eats_provider_refund", {
    p_order_id: orderId,
    p_provider: "paypal",
    p_payment_id: captureId,
    p_refund_succeeded: false,
    p_error: message,
  });
  const finish = rpcObject(data);
  if (error || !finish?.ok) {
    throw (
      error ||
      new Error(finish?.code ?? "Could not preserve PayPal refund retry")
    );
  }
}

async function reconcilePayPalRefund(
  admin: any,
  accessToken: string,
  captureId: string,
  orderId: string,
  amountCents: number,
  currency: string,
  idempotencyKey = paypalRefundIdempotencyKey(captureId, amountCents),
  attemptGeneration = 0,
): Promise<{
  refund: ProviderRefundEvidence;
  finish: Record<string, any>;
}> {
  let refund: ProviderRefundEvidence;
  try {
    refund = await refundCapturedPayment(
      accessToken,
      captureId,
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
      await preservePayPalRefundRetry(admin, orderId, captureId, error.message);
    }
    throw error;
  }

  const finish = await persistPayPalRefundEvidence(
    admin,
    orderId,
    captureId,
    refund,
  );
  return { refund, finish };
}

async function verify(req: Request, raw: string): Promise<boolean> {
  const webhookId =
    Deno.env.get("PAYPAL_EATS_WEBHOOK_ID") ?? Deno.env.get("PAYPAL_WEBHOOK_ID");
  if (!webhookId) return false;
  const transmissionId = req.headers.get("paypal-transmission-id") ?? "";
  if (!transmissionId) return false;
  const accessToken = await token();
  const res = await fetch(
    `${paypalBase()}/v1/notifications/verify-webhook-signature`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        auth_algo: req.headers.get("paypal-auth-algo") ?? "",
        cert_url: req.headers.get("paypal-cert-url") ?? "",
        transmission_id: transmissionId,
        transmission_sig: req.headers.get("paypal-transmission-sig") ?? "",
        transmission_time: req.headers.get("paypal-transmission-time") ?? "",
        webhook_id: webhookId,
        webhook_event: JSON.parse(raw),
      }),
    },
  );
  if (!res.ok) return false;
  return (await res.json()).verification_status === "SUCCESS";
}

Deno.serve(
  withSecurity(
    "paypal-eats-webhook",
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
        console.error("[paypal-eats-webhook] verify err", e);
      }
      if (!verified) {
        return new Response(JSON.stringify({ error: "signature_invalid" }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const eventId = event.id as string;
      const eventType = event.event_type as string;
      const resource = event.resource ?? {};
      const orderId =
        resource?.id && resource?.intent
          ? resource.id
          : (resource?.supplementary_data?.related_ids?.order_id ?? null);
      const paidCapture = completedCapture(resource, eventType);
      const relatedCaptureId =
        resource?.supplementary_data?.related_ids?.capture_id ?? null;
      const captureId =
        eventType === "PAYMENT.REFUND.PENDING" ||
        eventType === "PAYMENT.REFUND.FAILED"
          ? relatedCaptureId
          : eventType.startsWith("PAYMENT.CAPTURE")
            ? (resource?.id ?? relatedCaptureId)
            : (paidCapture?.id ?? relatedCaptureId);

      let resolvedOrderId: string | null = null;
      let resolvedPaypalOrderId: string | null = null;
      let resolvedCustomerId: string | null = null;
      let resolvedPaymentStatus: string | null = null;
      let resolvedRefundStatus: string | null = null;
      const rememberResolvedOrder = (data: any) => {
        resolvedOrderId = data?.id ?? null;
        resolvedPaypalOrderId = data?.paypal_order_id ?? null;
        resolvedCustomerId = data?.customer_id ?? null;
        resolvedPaymentStatus = data?.payment_status ?? null;
        resolvedRefundStatus = data?.refund_status ?? null;
      };
      if (orderId) {
        const { data, error: orderLookupError } = await admin
          .from("food_orders")
          .select(
            "id, customer_id, paypal_order_id, payment_status, refund_status",
          )
          .eq("paypal_order_id", orderId)
          .maybeSingle();
        if (orderLookupError) {
          console.error(
            "[paypal-eats-webhook] PayPal order lookup failed",
            orderLookupError,
          );
          return new Response(
            JSON.stringify({ error: "order_lookup_failed" }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        rememberResolvedOrder(data);
      }
      if (!resolvedOrderId && captureId) {
        const { data, error: captureLookupError } = await admin
          .from("food_orders")
          .select(
            "id, customer_id, paypal_order_id, payment_status, refund_status",
          )
          .eq("paypal_capture_id", captureId)
          .maybeSingle();
        if (captureLookupError) {
          console.error(
            "[paypal-eats-webhook] PayPal capture lookup failed",
            captureLookupError,
          );
          return new Response(
            JSON.stringify({ error: "order_lookup_failed" }),
            {
              status: 503,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        rememberResolvedOrder(data);
      }
      if (!resolvedOrderId) {
        const customId =
          resource?.purchase_units?.[0]?.custom_id ??
          resource?.custom_id ??
          null;
        if (customId) {
          const { data, error: customIdLookupError } = await admin
            .from("food_orders")
            .select(
              "id, customer_id, paypal_order_id, payment_status, refund_status",
            )
            .eq("id", customId)
            .maybeSingle();
          if (customIdLookupError) {
            console.error(
              "[paypal-eats-webhook] PayPal custom order lookup failed",
              customIdLookupError,
            );
            return new Response(
              JSON.stringify({ error: "order_lookup_failed" }),
              {
                status: 503,
                headers: { "Content-Type": "application/json" },
              },
            );
          }
          rememberResolvedOrder(data);
        }
      }

      const processingLeaseToken = crypto.randomUUID();
      const { data: inserted, error: insertError } = await admin
        .from("eats_paypal_webhook_events")
        .upsert(
          {
            paypal_event_id: eventId,
            event_type: eventType,
            event_created_at: event.create_time ?? null,
            order_id: resolvedOrderId,
            paypal_order_id: orderId,
            paypal_capture_id: captureId,
            processing_status: "received",
            processing_started_at: new Date().toISOString(),
            processing_lease_token: processingLeaseToken,
            processing_attempts: 1,
            payload: event,
          },
          { onConflict: "paypal_event_id", ignoreDuplicates: true },
        )
        .select("id")
        .maybeSingle();
      if (insertError) {
        console.error("[paypal-eats-webhook] event log failed", insertError);
        return new Response(JSON.stringify({ error: "event_log_failed" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        });
      }
      let logRowId = (inserted as any)?.id as string | undefined;
      if (!logRowId) {
        const { data: claimData, error: claimError } = await admin.rpc(
          "claim_eats_paypal_webhook_event",
          {
            p_event_id: eventId,
            p_lease_token: processingLeaseToken,
            p_lease_seconds: 300,
          },
        );
        const claim = rpcObject(claimData);
        if (claimError) {
          console.error(
            "[paypal-eats-webhook] event retry claim failed",
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
      const requiresResolvedOrder = [
        "PAYMENT.CAPTURE.COMPLETED",
        "CHECKOUT.ORDER.COMPLETED",
        "PAYMENT.REFUND.PENDING",
        "PAYMENT.REFUND.FAILED",
        "PAYMENT.CAPTURE.REFUNDED",
        "PAYMENT.CAPTURE.REVERSED",
      ].includes(eventType);

      try {
        if (!resolvedOrderId && requiresResolvedOrder) {
          throw new Error("PayPal money event could not resolve a local order");
        }
        if (resolvedOrderId) {
          if (
            eventType === "PAYMENT.CAPTURE.COMPLETED" ||
            eventType === "CHECKOUT.ORDER.COMPLETED"
          ) {
            const providerCapture = completedCapture(resource, eventType);
            const providerCaptureId = providerCapture?.id ?? captureId;
            const amountCents = dollarsToCents(providerCapture?.amount?.value);
            const currency = String(
              providerCapture?.amount?.currency_code ?? "",
            ).toUpperCase();
            if (!providerCaptureId || amountCents == null || !currency) {
              throw new Error("PayPal settlement evidence is incomplete");
            }
            const { data: settlementData, error: settlementError } =
              await admin.rpc("record_eats_provider_settlement", {
                p_order_id: resolvedOrderId,
                p_provider: "paypal",
                p_payment_id: providerCaptureId,
                p_amount_cents: amountCents,
                p_currency: currency,
              });
            const settlement = rpcObject(settlementData);
            if (settlementError || !settlement?.ok) {
              throw (
                settlementError ||
                new Error(
                  settlement?.code ?? "Could not persist PayPal settlement",
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
              const exactRefundEvidenceAvailable =
                String(settlement.provider_payment_id ?? "").trim() ===
                  providerCaptureId &&
                Number.isSafeInteger(refundAmountCents) &&
                refundAmountCents > 0 &&
                refundCurrency === currency &&
                Number.isSafeInteger(refundAttemptGeneration) &&
                refundAttemptGeneration >= 0 &&
                refundAttemptGeneration <= 999999 &&
                refundEvidenceId.length > 0 &&
                refundIdempotencyKey ===
                  paypalRefundIdempotencyKey(
                    providerCaptureId,
                    refundAmountCents,
                    refundAttemptGeneration,
                  );
              if (!exactRefundEvidenceAvailable) {
                throw new Error(
                  "PayPal settlement refund evidence is incomplete",
                );
              }
              const accessToken = await token();
              const { refund, finish } = await reconcilePayPalRefund(
                admin,
                accessToken,
                providerCaptureId,
                resolvedOrderId,
                refundAmountCents,
                refundCurrency,
                refundIdempotencyKey,
                refundAttemptGeneration,
              );
              const refundResolved =
                refund.completed && finish.refund_complete === true;
              if (refundResolved && finish.payment_status === "refunded") {
                await cascadeRefundCancellation(admin, resolvedOrderId);
              }
              processingStatus = refundResolved ? "applied" : "error";
              processingError = refundResolved
                ? null
                : refund.error || "Additional PayPal refund remains pending";
            } else if (settlement.reconciliation_required === true) {
              throw new Error("PayPal payment reconciliation remains pending");
            } else {
              if (settlement.transitioned_to_paid === true) {
                try {
                  await notifyEatsOrderConfirmed(
                    admin,
                    resolvedOrderId,
                    "PayPal",
                  );
                } catch (e) {
                  console.warn(
                    "[paypal-eats-webhook] confirmation email skipped",
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
              processingError = dispatched ? null : EATS_DISPATCH_PENDING_ERROR;
            }
          } else if (eventType === "PAYMENT.CAPTURE.DENIED") {
            const reason =
              resource?.status_details?.reason ?? "PayPal denied the capture";
            const { data: transitionData, error: transitionError } =
              await admin.rpc("transition_eats_payment_status", {
                p_order_id: resolvedOrderId,
                p_provider: "paypal",
                p_payment_id: captureId,
                p_next_status: "failed",
                p_error: reason,
              });
            if (transitionError) throw transitionError;
            processingStatus = rpcObject(transitionData)?.ok
              ? "applied"
              : "skipped";
          } else if (
            eventType === "PAYMENT.REFUND.PENDING" ||
            eventType === "PAYMENT.REFUND.FAILED"
          ) {
            const refundId = String(resource?.id ?? "").trim();
            const refundAmountCents = dollarsToCents(resource?.amount?.value);
            const refundCurrency = String(
              resource?.amount?.currency_code ?? "",
            ).toUpperCase();
            const refundStatus = String(
              resource?.status ??
                (eventType === "PAYMENT.REFUND.PENDING" ? "PENDING" : "FAILED"),
            ).toUpperCase();
            const refundPending = ["PENDING", "PROCESSING"].includes(
              refundStatus,
            );
            const refundFailed = ["FAILED", "DENIED", "CANCELED"].includes(
              refundStatus,
            );
            if (
              !captureId ||
              !refundId ||
              refundAmountCents == null ||
              !/^[A-Z]{3}$/.test(refundCurrency) ||
              (!refundPending && !refundFailed)
            ) {
              throw new Error("PayPal refund evidence is incomplete");
            }

            const finish = await persistPayPalRefundEvidence(
              admin,
              resolvedOrderId,
              captureId,
              {
                completed: false,
                id: refundId,
                amountCents: refundAmountCents,
                currency: refundCurrency,
                status: refundStatus,
                outcome: refundFailed ? "failed" : "pending",
                error: refundFailed ? `PayPal refund ${refundStatus}` : null,
              },
            );
            const refundComplete = finish.refund_complete === true;
            if (refundComplete && finish.payment_status === "refunded") {
              await cascadeRefundCancellation(admin, resolvedOrderId);
            }
            processingStatus = "applied";
            processingError = null;
          } else if (
            eventType === "PAYMENT.CAPTURE.REFUNDED" ||
            eventType === "PAYMENT.CAPTURE.REVERSED"
          ) {
            if (!captureId) {
              throw new Error("PayPal capture refund evidence is incomplete");
            }

            const refundAlreadyReconciled =
              resolvedPaymentStatus === "refunded" ||
              resolvedRefundStatus === "conflict_refunded";
            if (refundAlreadyReconciled) {
              if (resolvedPaymentStatus === "refunded") {
                await cascadeRefundCancellation(admin, resolvedOrderId);
              }
              processingStatus = "applied";
              processingError = null;
            } else {
              if (!resolvedPaypalOrderId || !resolvedCustomerId) {
                throw new Error(
                  "PayPal capture refund requires exact transaction reconciliation",
                );
              }
              const { data: claimData, error: claimError } = await admin.rpc(
                "claim_eats_paypal_capture",
                {
                  p_paypal_order_id: resolvedPaypalOrderId,
                  p_customer_id: resolvedCustomerId,
                },
              );
              const claim = rpcObject(claimData);
              if (claimError || !claim) {
                throw (
                  claimError ||
                  new Error("PayPal refund reconciliation claim failed")
                );
              }

              if (claim.code === "already_refunded") {
                if (claim.payment_status === "refunded") {
                  await cascadeRefundCancellation(admin, resolvedOrderId);
                }
                processingStatus = "applied";
                processingError = null;
              } else if (
                claim.code === "capture_requires_reconciliation" &&
                claim.refund_required === true &&
                claim.reconciliation_required === true
              ) {
                const evidencePaymentId = String(claim.payment_id ?? "").trim();
                const evidenceCaptureId = String(claim.capture_id ?? "").trim();
                const evidenceAmountCents = Number(claim.refund_amount_cents);
                const evidenceCurrency = String(
                  claim.refund_currency ?? "",
                ).toUpperCase();
                const evidenceId = String(
                  claim.refund_evidence_id ?? "",
                ).trim();
                const idempotencyKey = String(
                  claim.refund_idempotency_key ?? "",
                ).trim();
                const attemptGeneration = Number(
                  claim.refund_attempt_generation,
                );
                const exactEvidenceAvailable =
                  claim.payment_provider === "paypal" &&
                  evidencePaymentId === captureId &&
                  evidenceCaptureId === captureId &&
                  Number.isSafeInteger(evidenceAmountCents) &&
                  evidenceAmountCents > 0 &&
                  Number.isSafeInteger(attemptGeneration) &&
                  attemptGeneration >= 0 &&
                  attemptGeneration <= 999999 &&
                  /^[A-Z]{3}$/.test(evidenceCurrency) &&
                  evidenceId.length > 0 &&
                  idempotencyKey ===
                    paypalRefundIdempotencyKey(
                      evidencePaymentId,
                      evidenceAmountCents,
                      attemptGeneration,
                    );
                if (!exactEvidenceAvailable) {
                  throw new Error(
                    "PayPal refund reconciliation evidence is incomplete",
                  );
                }

                const accessToken = await token();
                const { refund, finish } = await reconcilePayPalRefund(
                  admin,
                  accessToken,
                  evidencePaymentId,
                  resolvedOrderId,
                  evidenceAmountCents,
                  evidenceCurrency,
                  idempotencyKey,
                  attemptGeneration,
                );
                const refundResolved =
                  refund.completed && finish.refund_complete === true;
                if (!refundResolved) {
                  throw new Error(
                    "PayPal refund reconciliation remains pending",
                  );
                }
                if (finish.payment_status === "refunded") {
                  await cascadeRefundCancellation(admin, resolvedOrderId);
                }
                processingStatus = "applied";
                processingError = null;
              } else {
                throw new Error(
                  "PayPal capture refund requires exact transaction reconciliation",
                );
              }
            }
          } else if (eventType === "CHECKOUT.ORDER.APPROVED") {
            const { data: transitionData, error: transitionError } =
              await admin.rpc("transition_eats_payment_status", {
                p_order_id: resolvedOrderId,
                p_provider: "paypal",
                p_payment_id: null,
                p_next_status: "processing",
                p_error: null,
              });
            if (transitionError) throw transitionError;
            processingStatus = rpcObject(transitionData)?.ok
              ? "applied"
              : "skipped";
          }
        }
      } catch (e: any) {
        processingStatus = "error";
        processingError = String(e?.message || e);
        console.error("[paypal-eats-webhook] handler error", e);
      }

      const { data: updatedLog, error: logUpdateError } = await admin
        .from("eats_paypal_webhook_events")
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
          "[paypal-eats-webhook] event status update failed",
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
