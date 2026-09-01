import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (file: string) =>
  readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

const migration = source(
  "supabase/migrations/20260830190000_eats_payment_cancellation_state_machine.sql",
);
const dispatchMigration = source(
  "supabase/migrations/20260830190500_eats_dispatch_idempotency.sql",
);
const cancel = source("supabase/functions/cancel-eats-order/index.ts");
const capture = source("supabase/functions/capture-eats-paypal-order/index.ts");
const statusUpdate = source(
  "supabase/functions/eats-payment-status-update/index.ts",
);
const stripeCreate = source("supabase/functions/create-eats-payment/index.ts");
const paypalCreate = source(
  "supabase/functions/create-eats-paypal-order/index.ts",
);
const squareCreate = source(
  "supabase/functions/create-eats-square-checkout/index.ts",
);
const stripeWebhook = source("supabase/functions/stripe-webhook/index.ts");
const paypalWebhook = source("supabase/functions/paypal-eats-webhook/index.ts");
const squareWebhook = source("supabase/functions/square-eats-webhook/index.ts");

describe("Eats provider settlement and cancellation state machine", () => {
  it("serializes every authoritative transition and restricts RPC execution", () => {
    expect(migration).toContain("claim_eats_paypal_capture");
    expect(migration).toContain("claim_eats_order_cancellation");
    expect(migration).toContain("record_eats_provider_settlement");
    expect(migration).toContain("finish_eats_provider_refund");
    expect(migration).toContain("transition_eats_payment_status");
    expect(migration.match(/for update;/g)?.length).toBeGreaterThanOrEqual(5);
    expect(migration.match(/security invoker/g)?.length).toBe(7);
    expect(migration.match(/set search_path = ''/g)?.length).toBe(7);
    expect(migration.match(/grant execute on function/g)?.length).toBe(7);
    expect(migration).toContain("to service_role;");
    expect(migration).not.toMatch(
      /grant execute on function[\s\S]*to (anon|authenticated);/,
    );
  });

  it("preserves refund eligibility while making late settlement compensating", () => {
    expect(migration).toContain("cancelled_refund_eligible_unsettled");
    expect(migration).toContain("cancellation_refund_pending");
    expect(migration).toContain("cancelled_no_refund");
    expect(migration).toContain("late_payment_refund_pending");
    expect(migration).toContain("provider_amount_mismatch_refund_pending");
    expect(migration).toContain("p_amount_cents = v_expected_cents");
    expect(migration).toContain("v_currency = 'USD'");
    expect(migration).toContain("v_order.payment_status = 'refunded'");
    expect(migration).toContain("'refund_evidence_rpc_required'");
    expect(migration).toContain("'transitioned_to_paid', false");
    expect(migration).toContain("'dispatch_required', false");
    expect(migration).toContain(
      "v_order.last_payment_error is distinct from 'cancelled_no_refund'",
    );
  });

  it("does not announce pending inserts as paid orders", () => {
    expect(migration).toContain(
      "drop trigger if exists trigger_notify_order_status on public.food_orders",
    );
    expect(migration).toContain(
      "after update of status, driver_id on public.food_orders",
    );
    expect(migration).toContain(
      "execute function public.notify_on_order_status_change()",
    );
    expect(migration).not.toContain(
      "after insert or update on public.food_orders",
    );
  });

  it("cancels failed unprepared pending orders so resource-release triggers run", () => {
    expect(migration).toContain("when v_next = 'failed'");
    expect(migration).toContain("v_order.status::text = 'pending'");
    expect(migration).toContain("v_order.driver_id is null");
    expect(migration).toContain("v_order.prepared_at is null");
    expect(migration).toContain("v_order.picked_up_at is null");
    expect(migration).toContain("v_order.delivered_at is null");
    expect(migration).toContain("then 'cancelled'");
  });

  it("claims cancellation before refund and never reports an unissued refund", () => {
    const claimIndex = cancel.indexOf('"claim_eats_order_cancellation"');
    const providerRefundIndex = cancel.indexOf(
      "evidence = await issueProviderRefund(",
      claimIndex,
    );
    expect(claimIndex).toBeGreaterThan(-1);
    expect(providerRefundIndex).toBeGreaterThan(claimIndex);
    expect(cancel).toContain("let actualRefundCents = 0");
    expect(cancel).toContain("if (actualRefundCents > 0)");
    expect(cancel).toContain('"finish_eats_provider_refund_with_evidence"');
    expect(cancel).toContain("String(claim.refund_idempotency_key)");
  });

  it("allows cancelled orders with a pending provider refund to retry the idempotent claim", () => {
    expect(cancel).not.toContain(
      '["cancelled", "delivered", "completed"].includes(status)',
    );
    expect(cancel).toContain('["delivered", "completed"].includes(status)');
    expect(cancel).toContain(
      'status === "refunded" || paymentStatus === "refunded"',
    );
    expect(migration).toContain("v_order.status::text = 'cancelled'");
    expect(migration).toContain("'already_cancelled'");
    expect(migration).toContain(
      "evidence.refund_state in ('required', 'pending')",
    );
  });

  it("claims PayPal capture and reconciles exact provider evidence before dispatch", () => {
    const claimIndex = capture.indexOf('"claim_eats_paypal_capture"');
    const providerCaptureIndex = capture.indexOf("/capture`");
    const settlementIndex = capture.indexOf(
      '"record_eats_provider_settlement"',
    );
    const dispatchIndex = capture.indexOf("dispatchOrder(", settlementIndex);
    expect(claimIndex).toBeGreaterThan(-1);
    expect(providerCaptureIndex).toBeGreaterThan(claimIndex);
    expect(settlementIndex).toBeGreaterThan(providerCaptureIndex);
    expect(dispatchIndex).toBeGreaterThan(settlementIndex);
    expect(capture).toContain("capturedCents");
    expect(capture).toContain("currency");
    expect(capture).toContain("settlement.refund_required === true");
    expect(capture).toContain('"finish_eats_provider_refund"');
    expect(capture).toContain(
      "captureId.slice(attemptGeneration > 0 ? -14 : -20)",
    );
    expect(capture).toContain("attemptGeneration > 999999");
  });

  it("uses monotonic DB transitions for browser-reported payment states", () => {
    expect(statusUpdate).toContain('"transition_eats_payment_status"');
    expect(statusUpdate).toContain(
      '["paid", "refund_pending", "refunded"].includes',
    );
    expect(statusUpdate).not.toContain(".update(update)");
    expect(statusUpdate).toContain('transition?.code ?? "stale_transition"');
  });

  it("treats refunds as terminal while leaving fulfilled Stripe payouts recoverable", () => {
    const transferClaim = dispatchMigration.slice(
      dispatchMigration.indexOf(
        "create or replace function public.claim_eats_payout_transfer(",
      ),
      dispatchMigration.indexOf(
        "create or replace function public.claim_eats_payout_reversal(",
      ),
    );

    expect(migration).toContain(
      "('cancelled', 'refunded', 'delivered', 'completed')",
    );
    expect(migration).toContain(
      "v_order.status::text not in ('cancelled', 'refunded')",
    );
    expect(cancel).toContain(
      'status === "refunded" || paymentStatus === "refunded"',
    );
    expect(transferClaim).toContain(
      "v_order.status::text not in ('cancelled', 'refunded')",
    );
    expect(transferClaim).toContain(
      "v_order.last_payment_error = 'cancelled_no_refund'",
    );
    expect(transferClaim).not.toContain("'delivered'");
    expect(transferClaim).not.toContain("'completed'");
  });

  it("leases PayPal and Square webhook logs so stale received events can be reclaimed", () => {
    expect(migration).toContain("processing_started_at timestamptz");
    expect(migration).toContain("claim_eats_paypal_webhook_event(");
    expect(migration).toContain("claim_eats_square_webhook_event(");
    expect(migration).toContain("for update;");
    expect(migration).toContain(
      "processing_started_at > pg_catalog.now() - pg_catalog.make_interval",
    );
    expect(paypalWebhook).toContain('"claim_eats_paypal_webhook_event"');
    expect(squareWebhook).toContain('"claim_eats_square_webhook_event"');
    for (const webhook of [paypalWebhook, squareWebhook]) {
      expect(webhook).toContain(
        "processing_started_at: new Date().toISOString()",
      );
      expect(webhook).toContain("processing_attempts: 1");
      expect(webhook).not.toContain('processing_status !== "error"');
    }
  });

  it("attaches provider sessions only while the saved order remains payable", () => {
    for (const provider of [stripeCreate, paypalCreate, squareCreate]) {
      expect(provider).toContain('.neq("status", "cancelled")');
      expect(provider).toContain('.in("payment_status", [');
      expect(provider).toContain('.select("id")');
      expect(provider).toContain("!savedOrder");
    }
    expect(stripeCreate).toContain("stripe.paymentIntents.cancel(");
    expect(paypalCreate).toContain("status: 409");
  });

  it("does not cancel a deterministic Stripe intent after an uncertain database response", () => {
    const updateErrorIndex = stripeCreate.indexOf("if (updateError) {");
    const definiteNoRowIndex = stripeCreate.indexOf(
      "if (!savedOrder) {",
      updateErrorIndex,
    );
    const cancelIndex = stripeCreate.indexOf(
      "stripe.paymentIntents.cancel(",
      updateErrorIndex,
    );
    expect(updateErrorIndex).toBeGreaterThan(-1);
    expect(definiteNoRowIndex).toBeGreaterThan(updateErrorIndex);
    expect(cancelIndex).toBeGreaterThan(definiteNoRowIndex);
    expect(stripeCreate.slice(updateErrorIndex, definiteNoRowIndex)).toContain(
      "status: 503",
    );
    expect(stripeCreate.slice(updateErrorIndex, definiteNoRowIndex)).toContain(
      "retryable: true",
    );
    expect(
      stripeCreate.slice(updateErrorIndex, definiteNoRowIndex),
    ).not.toContain("stripe.paymentIntents.cancel(");
  });

  it("uses immutable order commission economics and restaurant Connect routing only", () => {
    const transferClaim = dispatchMigration.slice(
      dispatchMigration.indexOf(
        "create or replace function public.claim_eats_payout_transfer(",
      ),
      dispatchMigration.indexOf(
        "create or replace function public.claim_eats_payout_reversal(",
      ),
    );

    expect(transferClaim).toContain("v_order.commission_percent");
    expect(transferClaim).toContain("v_order.commission_amount_cents");
    expect(transferClaim).toContain("v_order.restaurant_payout_cents");
    expect(transferClaim).toContain("v_commission_percent is null");
    expect(transferClaim).toContain("v_commission_cents is null");
    expect(transferClaim).toContain("v_transfer_cents is null");
    expect(transferClaim).toContain(
      "select pg_catalog.btrim(restaurant.stripe_account_id),",
    );
    expect(transferClaim).toContain("restaurant.auto_payout_enabled");
    expect(transferClaim).toContain("'transfer_snapshot_conflict'");
    expect(stripeWebhook).toContain(
      'supabase.rpc("claim_eats_payout_transfer"',
    );
    expect(stripeWebhook).toContain("payoutClaim.amount_cents");
    expect(stripeWebhook).toContain("payoutClaim.commission_cents");
    expect(stripeWebhook).toContain("payoutClaim.commission_rate");
    expect(stripeWebhook).not.toContain("restaurants.commission_rate");
    expect(transferClaim).not.toContain(
      "settledCents * (commissionPercent / 100)",
    );
  });

  it("recovers queued or failed Stripe transfers and reversals with stable idempotency keys", () => {
    expect(stripeWebhook).toContain("eats-reversal-");
    expect(stripeWebhook).toContain('"queued", "failed", "created"');
    expect(dispatchMigration).toContain("'eats-reversal-' || p_order_id::text");
    expect(dispatchMigration).toContain(
      "v_transfer.status not in ('queued', 'failed', 'created')",
    );
    expect(stripeWebhook).toContain("eats-transfer-${orderId}");
    expect(dispatchMigration).toContain("'eats-transfer-' || p_order_id::text");
    expect(stripeWebhook).toContain('.eq("direction", "transfer")');
    expect(stripeWebhook).toContain('.eq("direction", "reversal")');
    expect(stripeWebhook).toContain('.neq("status", "created")');
    expect(stripeWebhook).toContain("throw e;");
    expect(cancel).toContain('"bind_eats_payout_transfer"');
    expect(cancel).toContain('"finish_eats_payout_reversal"');
  });

  it.each([
    ["Stripe", stripeWebhook, "settleStripeEatsPayment("],
    ["PayPal", paypalWebhook, '"record_eats_provider_settlement"'],
    ["Square", squareWebhook, '"record_eats_provider_settlement"'],
  ])(
    "%s settles through the atomic RPC and suppresses cancelled fulfillment",
    (_provider, webhook, settlementCall) => {
      expect(webhook).toContain(settlementCall);
      expect(webhook).toContain("refund_required === true");
      expect(webhook).toContain('"finish_eats_provider_refund"');
      expect(webhook).toContain("dispatch_required === true");
      expect(webhook).toContain("transitioned_to_paid === true");
    },
  );

  it("keeps provider refund keys stable, evidence-bound, and within provider limits", () => {
    expect(stripeWebhook).toContain("settlement.refund_idempotency_key");
    expect(stripeWebhook).toContain("{ idempotencyKey: refundIdempotencyKey }");
    expect(paypalWebhook).toContain(
      "captureId.slice(attemptGeneration > 0 ? -14 : -20)",
    );
    expect(squareWebhook).toContain(
      "paymentId.slice(attemptGeneration > 0 ? -20 : -24)",
    );
    expect(paypalWebhook).toContain("attemptGeneration > 999999");
    expect(squareWebhook).toContain("attemptGeneration > 999999");
    expect(paypalWebhook).not.toContain("late-refund-eats");
    expect(squareWebhook).not.toContain("late-refund-eats");
    expect(paypalCreate).toContain('.replaceAll("-", "")');
    expect(paypalCreate).toContain(".slice(-20)");
    expect(squareCreate).toContain('.replaceAll("-", "")');
    expect(squareCreate).toContain(".slice(-24)");
    expect(capture).toContain("String(order_id).slice(-24)");
  });

  it("finalizes only exact full provider refunds and cancels active fulfillment", () => {
    expect(dispatchMigration).toContain(
      "finish_eats_provider_refund_with_evidence(",
    );
    expect(dispatchMigration).toContain("v_refund.status = 'succeeded'");
    expect(migration).toContain(
      "status::text not in ('cancelled', 'refunded', 'delivered', 'completed')",
    );
    expect(stripeWebhook).toContain(
      '"finish_eats_provider_refund_with_evidence"',
    );
    expect(stripeWebhook).toContain(
      "await listSucceededStripeRefunds(charge.id)",
    );
    expect(stripeWebhook).not.toContain(
      "charge.amount_refunded === expectedCents",
    );
    expect(paypalWebhook).toContain(
      '"finish_eats_provider_refund_with_evidence"',
    );
    expect(paypalWebhook).toContain(
      "p_refund_amount_cents: refund.amountCents",
    );
    expect(paypalWebhook).toContain("p_refund_currency: refund.currency");
    expect(paypalWebhook).not.toContain("resolvedOrderTotalCents");
    expect(paypalWebhook).toContain('eventType === "PAYMENT.CAPTURE.REFUNDED"');
    expect(paypalWebhook).toContain("relatedCaptureId");
    expect(squareWebhook).toContain(
      '"finish_eats_provider_refund_with_evidence"',
    );
    expect(squareWebhook).toContain(
      "p_refund_amount_cents: refund.amountCents",
    );
    expect(squareWebhook).toContain("p_refund_currency: refund.currency");
    expect(squareWebhook).not.toContain("resolvedOrderTotalCents");
    for (const webhook of [stripeWebhook, paypalWebhook, squareWebhook]) {
      expect(webhook).toContain("cascadeCancellationToDriver(");
    }
  });

  it("retries durable PayPal and Square processing errors without replaying successes", () => {
    for (const webhook of [paypalWebhook, squareWebhook]) {
      expect(webhook).toContain("processingLeaseToken = crypto.randomUUID()");
      expect(webhook).toContain("p_lease_token: processingLeaseToken");
      expect(webhook).toContain(
        '.eq("processing_lease_token", processingLeaseToken)',
      );
      expect(webhook).toContain('.select("id")');
      expect(webhook).toContain('processingStatus === "error" ? 503 : 200');
      expect(webhook).toContain('error: "event_retry_pending"');
    }
    expect(migration).toContain(
      "v_event.processing_status in ('applied', 'skipped')",
    );
  });

  it("does not return a PayPal capture success from a cancelled final state", () => {
    expect(capture).toContain('claim.order_status === "cancelled"');
    expect(capture).toContain(
      '.select("status, payment_status, last_payment_error")',
    );
    expect(capture).toContain('["refund_pending", "refunded"].includes');
  });

  it("does not downgrade terminal provider states on failure/refund events", () => {
    const stripeFailureEvent = stripeWebhook.slice(
      stripeWebhook.indexOf('case "payment_intent.payment_failed"'),
      stripeWebhook.indexOf('case "charge.refunded"'),
    );
    const stripeFailureBranch = stripeFailureEvent.slice(
      stripeFailureEvent.indexOf('from("food_orders")'),
      stripeFailureEvent.indexOf("// Notify user: payment failed"),
    );
    expect(stripeFailureBranch).not.toContain(
      '.update({ payment_status: "failed", status: "cancelled" })',
    );
    expect(stripeFailureBranch).toContain('"transition_eats_payment_status"');
    expect(paypalWebhook).toContain('"transition_eats_payment_status"');
    expect(squareWebhook).toContain('"transition_eats_payment_status"');
    expect(squareWebhook).not.toContain(
      'status === "REJECTED" || status === "FAILED") next = "paid"',
    );
  });
});
