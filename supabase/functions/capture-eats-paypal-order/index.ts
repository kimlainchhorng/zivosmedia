/**
 * capture-eats-paypal-order
 * --------------------------
 * Called from the SPA after the buyer returns from PayPal approval. Idempotent —
 * skips if paypal_capture_id is already stamped on the order.
 */
import { createClient } from "../_shared/deps.ts";
import { cascadeCancellationToDriver } from "../_shared/cancellation-cascade.ts";
import {
  requireEatsProviderCheckoutEnabled,
  requireExplicitProviderMode,
} from "../_shared/providerMode.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const paypalBase = () =>
  requireExplicitProviderMode("PAYPAL_MODE") === "sandbox"
    ? "https://api-m.sandbox.paypal.com"
    : "https://api-m.paypal.com";
const DISPATCH_PENDING_ERROR = "delivery_dispatch_pending";

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

function dollarsToCents(value: unknown): number | null {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
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
    refundAmountCents <= 0 ||
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
  idempotencyKey: string,
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

Deno.serve(
  withSecurity(
    "capture-eats-paypal-order",
    async (req, ctx) => {
      const cors = ctx.corsHeaders;
      if (req.method !== "POST") {
        return new Response(JSON.stringify({ error: "Method not allowed" }), {
          status: 405,
          headers: {
            ...cors,
            "Content-Type": "application/json",
            Allow: "POST, OPTIONS",
          },
        });
      }
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const userClient = createClient(supabaseUrl, anonKey, {
          global: {
            headers: { Authorization: req.headers.get("authorization") ?? "" },
          },
        });
        const {
          data: { user },
        } = await userClient.auth.getUser();
        if (!user)
          return new Response(
            JSON.stringify({ error: "Authentication required" }),
            {
              status: 401,
              headers: { ...cors, "Content-Type": "application/json" },
            },
          );

        const { order_id } = await req.json();
        if (!order_id)
          return new Response(JSON.stringify({ error: "Missing order_id" }), {
            status: 400,
            headers: { ...cors, "Content-Type": "application/json" },
          });

        const admin = createClient(supabaseUrl, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });
        const { data: capturePreflight, error: capturePreflightError } =
          await admin
            .from("food_orders")
            .select("paypal_capture_id")
            .eq("paypal_order_id", order_id)
            .maybeSingle();
        if (capturePreflightError) {
          console.error(
            "[capture-eats-paypal-order:capability-preflight]",
            capturePreflightError.message,
          );
          return new Response(
            JSON.stringify({ error: "PayPal payment state is unavailable" }),
            {
              status: 503,
              headers: { ...cors, "Content-Type": "application/json" },
            },
          );
        }
        if (!(capturePreflight as any)?.paypal_capture_id) {
          try {
            requireEatsProviderCheckoutEnabled("paypal");
          } catch (error) {
            console.error(
              "[capture-eats-paypal-order:capability]",
              error instanceof Error ? error.message : "unavailable",
            );
            return new Response(
              JSON.stringify({ error: "PayPal Eats payments are unavailable" }),
              {
                status: 503,
                headers: { ...cors, "Content-Type": "application/json" },
              },
            );
          }
        }
        const { data: claimData, error: claimError } = await admin.rpc(
          "claim_eats_paypal_capture",
          { p_paypal_order_id: order_id, p_customer_id: user.id },
        );
        if (claimError) {
          console.error(
            "[capture-eats-paypal-order:claim]",
            claimError.message,
          );
          return new Response(
            JSON.stringify({ error: "Could not claim PayPal capture" }),
            {
              status: 503,
              headers: { ...cors, "Content-Type": "application/json" },
            },
          );
        }
        const claim = rpcObject(claimData);
        if (!claim) {
          return new Response(
            JSON.stringify({ error: "Could not claim PayPal capture" }),
            {
              status: 503,
              headers: { ...cors, "Content-Type": "application/json" },
            },
          );
        }
        if (claim.code === "not_found")
          return new Response(JSON.stringify({ error: "Order not found" }), {
            status: 404,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        if (claim.code === "forbidden")
          return new Response(JSON.stringify({ error: "Forbidden" }), {
            status: 403,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        if (claim.code === "wrong_payment_type")
          return new Response(
            JSON.stringify({ error: "Order is not a PayPal payment" }),
            {
              status: 400,
              headers: { ...cors, "Content-Type": "application/json" },
            },
          );
        if (claim.code === "already_refunded") {
          const refundedOrderId = String(claim.order_id ?? "").trim();
          if (!refundedOrderId) {
            return new Response(
              JSON.stringify({ error: "Refunded order state is unavailable" }),
              {
                status: 503,
                headers: { ...cors, "Content-Type": "application/json" },
              },
            );
          }
          try {
            await cascadeRefundCancellation(admin, refundedOrderId);
          } catch (error) {
            console.error(
              "[capture-eats-paypal-order:already-refunded-cascade]",
              error instanceof Error ? error.message : "unknown",
            );
            return new Response(
              JSON.stringify({ error: "Refund cancellation is pending" }),
              {
                status: 503,
                headers: { ...cors, "Content-Type": "application/json" },
              },
            );
          }
          return new Response(
            JSON.stringify({
              ok: false,
              status: "already_refunded",
              order_id: claim.order_id,
              capture_id: claim.capture_id,
              payment_status: claim.payment_status,
            }),
            {
              status: 409,
              headers: { ...cors, "Content-Type": "application/json" },
            },
          );
        }
        if (claim.code === "capture_requires_reconciliation") {
          const foodOrderId = String(claim.order_id ?? "").trim();
          const captureId = String(claim.payment_id ?? "").trim();
          const claimedCaptureId = String(claim.capture_id ?? "").trim();
          const amountCents = Number(claim.refund_amount_cents);
          const currency = String(claim.refund_currency ?? "").toUpperCase();
          const refundEvidenceId = String(
            claim.refund_evidence_id ?? "",
          ).trim();
          const idempotencyKey = String(
            claim.refund_idempotency_key ?? "",
          ).trim();
          const attemptGeneration = Number(claim.refund_attempt_generation);
          const expectedIdempotencyKey = paypalRefundIdempotencyKey(
            captureId,
            amountCents,
            attemptGeneration,
          );
          const exactEvidenceAvailable =
            claim.refund_required === true &&
            claim.reconciliation_required === true &&
            claim.payment_provider === "paypal" &&
            foodOrderId.length > 0 &&
            captureId.length > 0 &&
            claimedCaptureId === captureId &&
            Number.isSafeInteger(amountCents) &&
            amountCents > 0 &&
            Number.isSafeInteger(attemptGeneration) &&
            attemptGeneration >= 0 &&
            attemptGeneration <= 999999 &&
            /^[A-Z]{3}$/.test(currency) &&
            refundEvidenceId.length > 0 &&
            idempotencyKey === expectedIdempotencyKey;

          if (!exactEvidenceAvailable) {
            console.error(
              "[capture-eats-paypal-order:reconciliation] exact refund evidence is unavailable",
            );
            return new Response(
              JSON.stringify({
                error: "Payment reconciliation is unavailable",
              }),
              {
                status: 503,
                headers: { ...cors, "Content-Type": "application/json" },
              },
            );
          }

          try {
            const accessToken = await token();
            const { refund, finish } = await reconcilePayPalRefund(
              admin,
              accessToken,
              captureId,
              foodOrderId,
              amountCents,
              currency,
              idempotencyKey,
              attemptGeneration,
            );
            const refundResolved =
              refund.completed && finish.refund_complete === true;
            if (refundResolved) {
              await cascadeRefundCancellation(admin, foodOrderId);
            }
            return new Response(
              JSON.stringify({
                ok: false,
                status: refundResolved ? "refund_reconciled" : "refund_pending",
                order_id: foodOrderId,
                capture_id: captureId,
                refund_id: refund.id,
                refund_evidence_id: refundEvidenceId,
                payment_status: finish.payment_status,
              }),
              {
                status: refundResolved ? 409 : 503,
                headers: { ...cors, "Content-Type": "application/json" },
              },
            );
          } catch (error) {
            console.error(
              "[capture-eats-paypal-order:reconciliation]",
              error instanceof Error ? error.message : "unknown",
            );
            return new Response(
              JSON.stringify({ error: "Payment reconciliation is pending" }),
              {
                status: 503,
                headers: { ...cors, "Content-Type": "application/json" },
              },
            );
          }
        }
        if (claim.code === "already_captured") {
          const orderCancelled = claim.order_status === "cancelled";
          return new Response(
            JSON.stringify({
              ok: !orderCancelled,
              status: orderCancelled ? "cancelled" : "already_captured",
              order_id: claim.order_id,
              capture_id: claim.capture_id,
              payment_status: "paid",
              dispatch_pending: claim.dispatch_pending === true,
            }),
            {
              status: orderCancelled ? 409 : 200,
              headers: { ...cors, "Content-Type": "application/json" },
            },
          );
        }
        if (claim.ok !== true || claim.code !== "claimed") {
          return new Response(
            JSON.stringify({
              error: "Order is no longer payable",
              code: claim.code,
            }),
            {
              status: 409,
              headers: { ...cors, "Content-Type": "application/json" },
            },
          );
        }
        const foodOrderId = String(claim.order_id);

        const accessToken = await token();
        const capRes = await fetch(
          `${paypalBase()}/v2/checkout/orders/${order_id}/capture`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
              "PayPal-Request-Id": `cap-eats-${String(order_id).slice(-24)}`,
            },
          },
        );
        const capJson = await capRes.json();
        if (!capRes.ok) {
          const msg = capJson?.message || "Capture failed";
          await admin.rpc("transition_eats_payment_status", {
            p_order_id: foodOrderId,
            p_provider: "paypal",
            p_payment_id: null,
            p_next_status: "failed",
            p_error: msg,
          });
          return new Response(JSON.stringify({ error: msg }), {
            status: 502,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        const cap = capJson.purchase_units?.[0]?.payments?.captures?.[0];
        const captureId = cap?.id ?? null;
        const capturedCents = dollarsToCents(cap?.amount?.value);
        const currency = String(cap?.amount?.currency_code ?? "").toUpperCase();
        if (
          !captureId ||
          capturedCents == null ||
          capturedCents <= 0 ||
          !currency
        ) {
          await admin.rpc("transition_eats_payment_status", {
            p_order_id: foodOrderId,
            p_provider: "paypal",
            p_payment_id: captureId,
            p_next_status: "failed",
            p_error:
              "PayPal capture evidence is incomplete; payment requires review",
          });
          return new Response(
            JSON.stringify({ error: "PayPal payment amount requires review" }),
            {
              status: 409,
              headers: { ...cors, "Content-Type": "application/json" },
            },
          );
        }
        const { data: settlementData, error: settlementError } =
          await admin.rpc("record_eats_provider_settlement", {
            p_order_id: foodOrderId,
            p_provider: "paypal",
            p_payment_id: captureId,
            p_amount_cents: capturedCents,
            p_currency: currency,
          });
        const settlement = rpcObject(settlementData);
        if (settlementError || !settlement?.ok) {
          if (settlementError) {
            console.error(
              "[capture-eats-paypal-order:settlement]",
              settlementError.message,
            );
          }
          return new Response(
            JSON.stringify({
              error: "Captured payment requires reconciliation",
            }),
            {
              status: 503,
              headers: { ...cors, "Content-Type": "application/json" },
            },
          );
        }

        if (settlement.code === "already_refunded") {
          try {
            await cascadeRefundCancellation(admin, foodOrderId);
          } catch (error) {
            console.error(
              "[capture-eats-paypal-order:settlement-cascade]",
              error instanceof Error ? error.message : "unknown",
            );
            return new Response(
              JSON.stringify({ error: "Refund cancellation is pending" }),
              {
                status: 503,
                headers: { ...cors, "Content-Type": "application/json" },
              },
            );
          }
          return new Response(
            JSON.stringify({
              ok: false,
              status: "already_refunded",
              order_id: foodOrderId,
              capture_id: captureId,
            }),
            {
              status: 409,
              headers: { ...cors, "Content-Type": "application/json" },
            },
          );
        }

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
          const exactRefundEvidenceAvailable =
            String(settlement.provider_payment_id ?? "").trim() === captureId &&
            Number.isSafeInteger(refundAmountCents) &&
            refundAmountCents > 0 &&
            refundCurrency === currency &&
            Number.isSafeInteger(refundAttemptGeneration) &&
            refundAttemptGeneration >= 0 &&
            refundAttemptGeneration <= 999999 &&
            refundEvidenceId.length > 0 &&
            refundIdempotencyKey ===
              paypalRefundIdempotencyKey(
                captureId,
                refundAmountCents,
                refundAttemptGeneration,
              );
          if (!exactRefundEvidenceAvailable) {
            return new Response(
              JSON.stringify({
                error: "Captured payment refund evidence is unavailable",
              }),
              {
                status: 503,
                headers: { ...cors, "Content-Type": "application/json" },
              },
            );
          }
          try {
            const { refund, finish } = await reconcilePayPalRefund(
              admin,
              accessToken,
              captureId,
              foodOrderId,
              refundAmountCents,
              refundCurrency,
              refundIdempotencyKey,
              refundAttemptGeneration,
            );
            const refundResolved =
              refund.completed && finish.refund_complete === true;
            if (refundResolved) {
              await cascadeRefundCancellation(admin, foodOrderId);
            }
            return new Response(
              JSON.stringify({
                ok: false,
                status: refundResolved
                  ? "refunded_after_cancellation"
                  : "refund_pending",
                order_id: foodOrderId,
                capture_id: captureId,
                refund_id: refund.id,
              }),
              {
                status: refundResolved ? 409 : 503,
                headers: { ...cors, "Content-Type": "application/json" },
              },
            );
          } catch (refundError) {
            console.error(
              "[capture-eats-paypal-order:refund]",
              refundError instanceof Error ? refundError.message : "unknown",
            );
            return new Response(
              JSON.stringify({ error: "Captured payment refund is pending" }),
              {
                status: 503,
                headers: { ...cors, "Content-Type": "application/json" },
              },
            );
          }
        }

        if (settlement.reconciliation_required === true) {
          return new Response(
            JSON.stringify({ error: "Payment reconciliation is pending" }),
            {
              status: 503,
              headers: { ...cors, "Content-Type": "application/json" },
            },
          );
        }

        const dispatched =
          settlement.dispatch_required === true
            ? await dispatchOrder(supabaseUrl, serviceKey, foodOrderId)
            : true;
        if (dispatched) {
          const { error: clearError } = await admin
            .from("food_orders")
            .update({ last_payment_error: null } as any)
            .eq("id", foodOrderId)
            .eq("payment_status", "paid")
            .eq("last_payment_error", DISPATCH_PENDING_ERROR)
            .neq("status", "cancelled")
            .neq("status", "refunded");
          if (clearError) {
            console.error(
              "[capture-eats-paypal-order:clear-dispatch-marker]",
              clearError.message,
            );
          }
        }

        const { data: finalOrder, error: finalOrderError } = await admin
          .from("food_orders")
          .select("status, payment_status, last_payment_error")
          .eq("id", foodOrderId)
          .maybeSingle();
        if (finalOrderError || !finalOrder) {
          return new Response(
            JSON.stringify({ error: "Payment state requires reconciliation" }),
            {
              status: 503,
              headers: { ...cors, "Content-Type": "application/json" },
            },
          );
        }
        if (
          (finalOrder as any).status === "cancelled" ||
          ["refund_pending", "refunded"].includes(
            String((finalOrder as any).payment_status),
          )
        ) {
          return new Response(
            JSON.stringify({
              ok: false,
              status: (finalOrder as any).status,
              payment_status: (finalOrder as any).payment_status,
              order_id: foodOrderId,
              capture_id: captureId,
            }),
            {
              status:
                (finalOrder as any).payment_status === "refund_pending"
                  ? 503
                  : 409,
              headers: { ...cors, "Content-Type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({
            ok: true,
            order_id: foodOrderId,
            capture_id: captureId,
            payment_status: "paid",
            dispatch_pending:
              !dispatched ||
              (finalOrder as any).last_payment_error === DISPATCH_PENDING_ERROR,
          }),
          { headers: { ...cors, "Content-Type": "application/json" } },
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error";
        console.error("[capture-eats-paypal-order]", msg);
        return new Response(JSON.stringify({ error: msg }), {
          status: 500,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
    },
    {
      rateLimit: "payment",
      strictCors: true,
      allowedMethods: ["POST"],
      trackNetwork: "suspicious",
      blockNetworkRiskAt: 80,
    },
  ),
);

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
      console.error("[capture-eats-paypal-order:dispatch]", {
        status: response.status,
        accepted: payload?.ok === true,
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error("[capture-eats-paypal-order:dispatch]", {
      error: error instanceof Error ? error.name : "unknown",
    });
    return false;
  }
}
