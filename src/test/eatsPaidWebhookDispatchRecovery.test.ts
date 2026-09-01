import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) =>
  readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

const stripe = read("supabase/functions/stripe-webhook/index.ts");
const createEatsPayment = read(
  "supabase/functions/create-eats-payment/index.ts",
);
const createGroceryCheckout = read(
  "supabase/functions/create-grocery-checkout/index.ts",
);
const paypal = read("supabase/functions/paypal-eats-webhook/index.ts");
const square = read("supabase/functions/square-eats-webhook/index.ts");
const dispatchMigration = read(
  "supabase/migrations/20260830190500_eats_dispatch_idempotency.sql",
);

function sliceBetween(source: string, start: string, end: string): string {
  const startIndex = source.indexOf(start);
  const endIndex = source.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThan(-1);
  expect(endIndex).toBeGreaterThan(startIndex);
  return source.slice(startIndex, endIndex);
}

describe("Eats paid webhook dispatch recovery", () => {
  it.each([
    ["Stripe", stripe, "// Audit logging helper"],
    ["PayPal", paypal, "async function token"],
    ["Square", square, "async function hmacSha256Base64"],
  ])(
    "%s requires an exact service-role dispatch response before clearing the marker",
    (_provider, source, helperEnd) => {
      const helper = sliceBetween(
        source,
        "async function dispatchPaidEatsOrder(",
        helperEnd,
      );
      const exactResponseIndex = helper.indexOf(
        "if (!response.ok || payload?.ok !== true)",
      );
      const clearIndex = helper.indexOf("last_payment_error: null");

      expect(source).toContain(
        'const EATS_DISPATCH_PENDING_ERROR = "delivery_dispatch_pending"',
      );
      expect(source.match(/functions\/v1\/dispatch-eats-order/g)).toHaveLength(
        1,
      );
      expect(helper).toContain("Authorization: `Bearer ${serviceKey}`");
      expect(helper).toContain("apikey: serviceKey");
      expect(exactResponseIndex).toBeGreaterThan(-1);
      expect(clearIndex).toBeGreaterThan(exactResponseIndex);
      expect(helper).toContain(
        '.eq("last_payment_error", EATS_DISPATCH_PENDING_ERROR)',
      );
      expect(helper).toContain("if (clearError || !clearedOrder)");
      expect(helper).toContain("return false");
    },
  );

  it("settles both Stripe Eats paid paths, dispatches, then reconciles payout", () => {
    const checkout = sliceBetween(
      stripe,
      '} else if (metadata.type === "eats") {',
      '} else if (metadata.type === "p2p") {',
    );
    const paymentIntent = sliceBetween(
      stripe,
      'case "payment_intent.succeeded": {',
      "// Webhook safety net for grocery orders",
    );

    for (const branch of [checkout, paymentIntent]) {
      expect(branch).toContain("settleStripeEatsPayment(");
      expect(branch).toContain("settlement.refund_required === true");
      expect(branch).toContain("settlement.dispatch_required === true");
      expect(branch).toContain(
        "const dispatched = await dispatchPaidEatsOrder(",
      );
      expect(branch).toContain("if (!dispatched) {");
      expect(branch).toContain("Eats dispatch remains pending for order");
      expect(branch).toContain("await reconcileStripeEatsPayout(row.id)");
      expect(branch.indexOf("settleStripeEatsPayment(")).toBeLessThan(
        branch.indexOf("dispatchPaidEatsOrder("),
      );
      expect(branch.indexOf("dispatchPaidEatsOrder(")).toBeLessThan(
        branch.indexOf("reconcileStripeEatsPayout(row.id)"),
      );
    }

    const settlementHelper = sliceBetween(
      stripe,
      "const settleStripeEatsPayment = async (",
      "const reconcileStripeEatsPayout = async (",
    );
    const settlementEvidenceHelper = sliceBetween(
      stripe,
      "const recordStripeEatsSettlementEvidence = async (",
      "const settleStripeEatsPayment = async (",
    );
    expect(settlementEvidenceHelper).toContain(
      '"record_eats_provider_settlement"',
    );
    expect(settlementHelper).toContain(
      "await recordStripeEatsSettlementEvidence(",
    );
    expect(settlementHelper).toContain('"finish_eats_provider_refund"');
    expect(settlementHelper).toContain("stripe.refunds.create(");
    expect(settlementHelper).toContain("settlement.refund_idempotency_key");
    expect(settlementHelper).toContain(
      "{ idempotencyKey: refundIdempotencyKey }",
    );
    expect(settlementHelper).not.toContain("queueEatsAutoTransfer(orderId)");
    const payoutHelper = sliceBetween(
      stripe,
      "const reconcileStripeEatsPayout = async (",
      "const body = await req.text();",
    );
    expect(payoutHelper).toContain("await queueEatsAutoTransfer(orderId)");
  });

  it("retries signed Stripe Eats events when order evidence or refund reconciliation is uncertain", () => {
    const checkout = sliceBetween(
      stripe,
      '} else if (metadata.type === "eats") {',
      '} else if (metadata.type === "p2p") {',
    );
    const paymentIntent = sliceBetween(
      stripe,
      'case "payment_intent.succeeded": {',
      "// Webhook safety net for grocery orders",
    );
    const refund = sliceBetween(
      stripe,
      'case "charge.refunded": {',
      "// Update P2P bookings",
    );

    expect(checkout).toContain("if (error) {");
    expect(checkout).toContain("Could not resolve Stripe Eats checkout order");
    expect(checkout).toContain("(foodOrders ?? []).length === 0");
    expect(checkout).toContain("is not mapped to an order");

    expect(paymentIntent).toContain("if (foodOrdersError) {");
    expect(paymentIntent).toContain(
      "Could not resolve Stripe Eats payment orders",
    );
    expect(paymentIntent).toContain('paymentIntent.metadata?.type === "eats"');
    expect(paymentIntent).not.toContain(
      "Boolean(paymentIntent.metadata?.order_id)",
    );
    expect(paymentIntent).toContain("resolvedFoodOrders.length === 0");
    expect(paymentIntent).toContain(
      '.eq("id", paymentIntent.metadata.order_id)',
    );
    expect(paymentIntent).toContain(
      "Could not resolve Stripe Eats metadata order",
    );

    expect(refund).toContain("if (eatsOrdersError) {");
    expect(refund).toContain("Could not resolve refunded Stripe Eats orders");
    expect(refund).toContain("resolvedEatsOrders.length === 0");
    expect(refund).toContain('.eq("id", charge.metadata.order_id)');
    expect(refund).toContain(
      "Could not resolve refunded Stripe Eats metadata order",
    );
    expect(refund).toContain("await listSucceededStripeRefunds(charge.id)");
    expect(refund).toContain("await finishStripeEatsRefundEvidence({");
    expect(refund).toContain("if (refundStateError || !refundedOrder) {");
    expect(refund).not.toContain("Eats refund finalization skipped");
    expect(refund).not.toContain('"transition_eats_payment_status"');
  });

  it("retries failed Eats intents when lookup or authoritative transition is uncertain", () => {
    const failed = sliceBetween(
      stripe,
      'case "payment_intent.payment_failed": {',
      "// Notify user: payment failed",
    );

    expect(failed).toContain("if (failedFoodOrdersError) {");
    expect(failed).toContain("Could not resolve failed Stripe Eats orders");
    expect(failed).toContain('paymentIntent.metadata?.type === "eats"');
    expect(failed).toContain('.eq("id", paymentIntent.metadata.order_id)');
    expect(failed).toContain(
      "Could not resolve failed Stripe Eats metadata order",
    );
    expect(failed).toContain("resolvedFailedFoodOrders.length === 0");
    expect(failed).toContain('"transition_eats_payment_status"');
    expect(failed).toContain("if (transitionError || !transition?.ok)");
    expect(failed).toContain("Could not persist failed Stripe Eats payment");
    expect(failed).not.toContain("Eats failure transition skipped");
    expect(failed).not.toContain("Boolean(paymentIntent.metadata?.order_id)");
  });

  it("tags new Eats intents exactly without treating Grocery order IDs as Eats", () => {
    expect(createEatsPayment).toContain(
      'metadata: { type: "eats", order_id, user_id: user.id }',
    );
    expect(createGroceryCheckout).toContain("order_id: order.id");
    expect(createGroceryCheckout).not.toContain('type: "eats"');

    const paymentIntent = sliceBetween(
      stripe,
      'case "payment_intent.succeeded": {',
      "// Webhook safety net for grocery orders",
    );
    expect(
      paymentIntent.indexOf('.eq("stripe_payment_id", paymentIntent.id)'),
    ).toBeLessThan(paymentIntent.indexOf("const isEatsPaymentIntent"));
    expect(paymentIntent).toContain(
      'const isEatsPaymentIntent = paymentIntent.metadata?.type === "eats"',
    );
    expect(paymentIntent).not.toContain(
      "Boolean(paymentIntent.metadata?.order_id)",
    );
    expect(paymentIntent).toContain(
      "isEatsPaymentIntent &&\n              resolvedFoodOrders.length === 0 &&\n              paymentIntent.metadata?.order_id",
    );
  });

  it("binds one deterministic Stripe customer before creating the Eats intent", () => {
    const customerBindingIndex = createEatsPayment.indexOf(
      '.from("payment_customers")',
    );
    const customerCreateIndex = createEatsPayment.indexOf(
      "stripe.customers.create(",
    );
    const customerInsertIndex = createEatsPayment.indexOf(
      '.from("payment_customers")',
      customerBindingIndex + 1,
    );
    const paymentIntentIndex = createEatsPayment.indexOf(
      "stripe.paymentIntents.create(",
    );

    expect(customerBindingIndex).toBeGreaterThan(-1);
    expect(customerCreateIndex).toBeGreaterThan(customerBindingIndex);
    expect(customerInsertIndex).toBeGreaterThan(customerCreateIndex);
    expect(paymentIntentIndex).toBeGreaterThan(customerInsertIndex);
    expect(createEatsPayment).toContain(
      "{ idempotencyKey: `eats-customer-${user.id}` }",
    );
    expect(createEatsPayment).toContain("provider_customer_id: customerId");
    expect(createEatsPayment).toContain('customerBindError.code !== "23505"');
    expect(createEatsPayment).toContain(
      "Could not recover Stripe customer binding",
    );
  });

  it("routes exact orphan Eats evidence through settlement conflict handling", () => {
    const paymentIntent = sliceBetween(
      stripe,
      'case "payment_intent.succeeded": {',
      "// Webhook safety net for grocery orders",
    );
    const refund = sliceBetween(
      stripe,
      'case "charge.refunded": {',
      "// Update P2P bookings",
    );

    expect(paymentIntent.indexOf("const isEatsPaymentIntent")).toBeLessThan(
      paymentIntent.indexOf('.eq("id", paymentIntent.metadata.order_id)'),
    );
    expect(
      paymentIntent.indexOf('.eq("id", paymentIntent.metadata.order_id)'),
    ).toBeLessThan(paymentIntent.indexOf("settleStripeEatsPayment("));
    expect(refund.indexOf("const isEatsCharge")).toBeLessThan(
      refund.indexOf('.eq("id", charge.metadata.order_id)'),
    );
    expect(refund).not.toContain("Boolean(charge.metadata?.order_id)");
  });

  it("reconciles charge refunds by each provider refund record, not a cumulative order total", () => {
    const evidenceHelper = sliceBetween(
      stripe,
      "const finishStripeEatsRefundEvidence = async (",
      "const listSucceededStripeRefunds = async (",
    );
    const listHelper = sliceBetween(
      stripe,
      "const listSucceededStripeRefunds = async (",
      "const recordStripeEatsSettlementEvidence = async (",
    );
    const settlementEvidenceHelper = sliceBetween(
      stripe,
      "const recordStripeEatsSettlementEvidence = async (",
      "const settleStripeEatsPayment = async (",
    );
    const refund = sliceBetween(
      stripe,
      'case "charge.refunded": {',
      "// Update P2P bookings",
    );

    expect(evidenceHelper).toContain(
      '"finish_eats_provider_refund_with_evidence"',
    );
    expect(evidenceHelper).toContain("p_refund_id: input.refundId");
    expect(evidenceHelper).toContain(
      "p_refund_amount_cents: input.amountCents",
    );
    expect(evidenceHelper).toContain(
      "p_refund_currency: input.currency.toUpperCase()",
    );
    expect(evidenceHelper).toContain("p_refund_status: input.status");
    expect(listHelper).toContain("stripe.refunds.list({");
    expect(listHelper).toContain("starting_after: startingAfter");
    expect(listHelper).toContain('refund.status !== "succeeded"');
    expect(settlementEvidenceHelper).toContain(
      '"record_eats_provider_settlement"',
    );
    expect(settlementEvidenceHelper).toContain("p_amount_cents: amountCents");
    expect(settlementEvidenceHelper).toContain(
      "p_currency: currency.toUpperCase()",
    );
    expect(refund).toContain("await recordStripeEatsSettlementEvidence(");
    expect(refund).toContain("charge.amount");
    expect(refund).toContain("charge.currency");
    expect(refund).not.toContain("await settleStripeEatsPayment(");
    expect(refund).toContain("for (const refund of succeededRefunds)");
    expect(refund).toContain("refundId: refund.id");
    expect(refund).toContain("amountCents: refund.amount");
    expect(refund).toContain('finish?.payment_status !== "refunded"');
    expect(refund).not.toContain("row.total_amount");
    expect(refund).not.toContain("charge.amount_refunded === expectedCents");
    expect(refund).not.toContain('supabase.rpc("finish_eats_provider_refund",');
  });

  it("keeps compensating Stripe settlements retryable until the refund succeeds", () => {
    const settlement = sliceBetween(
      stripe,
      "const settleStripeEatsPayment = async (",
      "const reconcileStripeEatsPayout = async (",
    );

    expect(settlement).toContain("normalizeStripeRefundOutcome(refund.status)");
    expect(settlement).toContain('supabase.rpc("finish_eats_provider_refund",');
    expect(settlement).toContain(
      "throw new Error(`Stripe refund ${refundOutcome}`)",
    );
    expect(
      settlement.indexOf("await finishStripeEatsRefundEvidence({"),
    ).toBeLessThan(
      settlement.indexOf("throw new Error(`Stripe refund ${refundOutcome}`)"),
    );
  });

  it("rotates the Stripe refund generation only after exact failed evidence", () => {
    const settlement = sliceBetween(
      stripe,
      "const settleStripeEatsPayment = async (",
      "const reconcileStripeEatsPayout = async (",
    );

    expect(settlement).toContain("settlement.refund_attempt_generation");
    expect(settlement).toContain("settlement.refund_idempotency_key");
    expect(settlement).toContain(
      "refundIdempotencyKey === expectedRefundIdempotencyKey",
    );
    expect(settlement).toContain("status: refundOutcome");
    expect(settlement).toContain('refundOutcome !== "succeeded"');
    expect(stripe).toContain(
      'status === "failed" || String(status) === "canceled"',
    );
    expect(settlement).not.toContain(
      "idempotencyKey: `refund-eats-${paymentIntentId}-${amountCents}`",
    );
  });

  it("retains the authority key for pending or transport-uncertain Stripe refunds", () => {
    const settlement = sliceBetween(
      stripe,
      "const settleStripeEatsPayment = async (",
      "const reconcileStripeEatsPayout = async (",
    );

    expect(settlement).toContain("{ idempotencyKey: refundIdempotencyKey }");
    expect(stripe).toContain('return "pending"');
    expect(settlement).toContain('supabase.rpc("finish_eats_provider_refund",');
    expect(settlement).toContain("p_refund_succeeded: false");
    expect(settlement.indexOf("stripe.refunds.create(")).toBeLessThan(
      settlement.indexOf('supabase.rpc("finish_eats_provider_refund",'),
    );
  });

  it("records asynchronous Stripe refund updates with exact Eats evidence", () => {
    const settlement = sliceBetween(
      stripe,
      "const settleStripeEatsPayment = async (",
      "const reconcileStripeEatsPayout = async (",
    );
    const refundEvents = sliceBetween(
      stripe,
      'case "refund.updated":',
      'case "charge.refunded": {',
    );

    expect(settlement).toContain('type: "eats"');
    expect(settlement).toContain("payment_intent_id: paymentIntentId");
    expect(refundEvents).toContain('case "refund.failed": {');
    expect(refundEvents).toContain(
      'const isExactEatsRefund = refund.metadata?.type === "eats"',
    );
    expect(refundEvents).toContain("refund.payment_intent");
    expect(refundEvents).toContain("refund.metadata?.payment_intent_id");
    expect(refundEvents).toContain('.eq("stripe_payment_id", paymentIntentId)');
    expect(refundEvents).toContain('.eq("id", metadataOrderId)');
    expect(refundEvents).not.toContain("Boolean(refund.metadata?.order_id)");
    expect(refundEvents).toContain("if (eatsOrdersError) {");
    expect(refundEvents).toContain("conflicting PaymentIntent evidence");
    expect(refundEvents).toContain("conflicting order evidence");
    expect(refundEvents).toContain("invalid provider evidence");
    expect(refundEvents).toContain(
      'event.type === "refund.failed" && refundOutcome !== "failed"',
    );
    expect(refundEvents).toContain("await finishStripeEatsRefundEvidence({");
    expect(refundEvents).toContain("refundId: refund.id");
    expect(refundEvents).toContain("amountCents: refund.amount");
    expect(refundEvents).toContain("currency: refund.currency");
    expect(refundEvents).toContain("status: refundOutcome");
  });

  it("uses monotonic aggregate refund authority for stale Stripe events", () => {
    const refundEvents = sliceBetween(
      stripe,
      'case "refund.updated":',
      'case "charge.refunded": {',
    );
    const evidenceIndex = refundEvents.indexOf(
      "await finishStripeEatsRefundEvidence({",
    );
    const aggregateIndex = refundEvents.indexOf(
      "finish.refund_complete !== true ||",
    );
    const cascadeIndex = refundEvents.indexOf(
      "await cascadeCancellationToDriver(",
    );
    const reversalIndex = refundEvents.indexOf("await queueEatsAutoReversal(");

    expect(evidenceIndex).toBeGreaterThan(-1);
    expect(aggregateIndex).toBeGreaterThan(evidenceIndex);
    expect(cascadeIndex).toBeGreaterThan(aggregateIndex);
    expect(reversalIndex).toBeGreaterThan(cascadeIndex);
    expect(refundEvents).toContain('finish.payment_status !== "refunded"');
    expect(refundEvents).not.toContain('refundOutcome !== "succeeded"');
  });

  it("routes conflict-PaymentIntent refund events through exact Eats metadata", () => {
    const settlement = sliceBetween(
      stripe,
      "const settleStripeEatsPayment = async (",
      "const reconcileStripeEatsPayout = async (",
    );
    const refundEvents = sliceBetween(
      stripe,
      'case "refund.updated":',
      'case "charge.refunded": {',
    );
    const paymentLookupIndex = refundEvents.indexOf(
      '.eq("stripe_payment_id", paymentIntentId)',
    );
    const metadataFallbackIndex = refundEvents.indexOf(
      "resolvedEatsOrders.length === 0 && metadataOrderId",
    );
    const evidenceIndex = refundEvents.indexOf(
      "await finishStripeEatsRefundEvidence({",
    );

    expect(settlement).toContain('type: "eats"');
    expect(settlement).toContain("payment_intent_id: paymentIntentId");
    expect(paymentLookupIndex).toBeGreaterThan(-1);
    expect(metadataFallbackIndex).toBeGreaterThan(paymentLookupIndex);
    expect(evidenceIndex).toBeGreaterThan(metadataFallbackIndex);
    expect(refundEvents).toContain("paymentIntentId,");
  });

  it("does not treat generic refund order metadata as Eats", () => {
    const refundEvents = sliceBetween(
      stripe,
      'case "refund.updated":',
      'case "charge.refunded": {',
    );

    expect(refundEvents).toContain(
      'const isExactEatsRefund = refund.metadata?.type === "eats"',
    );
    expect(refundEvents).toContain("const metadataOrderId = isExactEatsRefund");
    expect(refundEvents).toContain(
      "const metadataPaymentIntentId = isExactEatsRefund",
    );
    expect(refundEvents).not.toContain("Boolean(refund.metadata?.order_id)");
  });

  it("recovers paid restaurant payout after delivery or completion", () => {
    const transfer = sliceBetween(
      stripe,
      "const queueEatsAutoTransfer = async (",
      "/**\n         * Reverse the auto-transfer",
    );
    const payout = sliceBetween(
      stripe,
      "const reconcileStripeEatsPayout = async (",
      "const body = await req.text();",
    );

    const transferClaim = sliceBetween(
      dispatchMigration,
      "create or replace function public.claim_eats_payout_transfer(",
      "create or replace function public.claim_eats_payout_reversal(",
    );

    expect(transfer).toContain('supabase.rpc("claim_eats_payout_transfer"');
    expect(transferClaim).toContain("v_order.payment_status = 'paid'");
    expect(transferClaim).toContain(
      "v_order.status::text not in ('cancelled', 'refunded')",
    );
    expect(transferClaim).toContain(
      "v_order.last_payment_error = 'cancelled_no_refund'",
    );
    for (const helper of [transfer, payout]) {
      expect(helper).not.toContain('"delivered"');
      expect(helper).not.toContain('"completed"');
    }
    expect(transferClaim).not.toContain("'delivered'");
    expect(transferClaim).not.toContain("'completed'");
  });

  it("atomically reserves Stripe payouts from immutable order economics", () => {
    const transfer = sliceBetween(
      stripe,
      "const queueEatsAutoTransfer = async (",
      "/**\n         * Reverse the auto-transfer",
    );
    const transferClaim = sliceBetween(
      dispatchMigration,
      "create or replace function public.claim_eats_payout_transfer(",
      "create or replace function public.claim_eats_payout_reversal(",
    );
    const reversalClaim = sliceBetween(
      dispatchMigration,
      "create or replace function public.claim_eats_payout_reversal(",
      "create or replace function public.bind_eats_payout_transfer(",
    );
    const orderLockIndex = transferClaim.indexOf(
      "from public.food_orders as food",
    );
    const reservationIndex = transferClaim.indexOf(
      "insert into public.eats_payout_ledger",
    );

    expect(orderLockIndex).toBeGreaterThan(-1);
    expect(transferClaim.indexOf("for update;", orderLockIndex)).toBeLessThan(
      reservationIndex,
    );
    expect(transferClaim).toContain("v_order.commission_percent");
    expect(transferClaim).toContain("v_order.commission_amount_cents");
    expect(transferClaim).toContain("v_order.restaurant_payout_cents");
    expect(transferClaim).toContain(
      "select pg_catalog.btrim(restaurant.stripe_account_id),",
    );
    expect(transferClaim).toContain("restaurant.auto_payout_enabled");
    expect(transferClaim).not.toContain("restaurant.commission");
    expect(transferClaim).toContain(
      "on conflict (order_id, direction) do nothing",
    );
    expect(transferClaim).toContain("'transfer_snapshot_conflict'");
    expect(transferClaim).toContain("'transfer_evidence_conflict'");
    expect(transferClaim).toContain(
      "'idempotency_key', 'eats-transfer-' || v_order.id::text",
    );
    expect(transferClaim).toContain(
      "revoke all on function public.claim_eats_payout_transfer(uuid)",
    );
    expect(transferClaim).toContain("to service_role;");

    expect(transfer).toContain('supabase.rpc("claim_eats_payout_transfer"');
    expect(transfer).not.toContain('.from("food_orders")');
    expect(transfer).not.toContain('.from("restaurants")');
    expect(transfer).not.toContain(".insert(");
    expect(transfer).toContain("payoutClaim.idempotency_key");
    expect(transfer).toContain("{ idempotencyKey: payoutIdempotencyKey }");
    expect(transfer.indexOf("stripe.transfers.create(")).toBeLessThan(
      transfer.indexOf(
        'supabase.rpc(\n              "bind_eats_payout_transfer"',
      ),
    );
    expect(reversalClaim.indexOf("from public.food_orders")).toBeLessThan(
      reversalClaim.indexOf("from public.eats_payout_ledger"),
    );
  });

  it("serializes Eats offer acceptance on the driver's shared availability row", () => {
    const acceptance = sliceBetween(
      dispatchMigration,
      "create or replace function public.accept_eats_job_offer(",
      "create or replace function public.advance_eats_delivery_job(",
    );
    const orderLock = acceptance.indexOf("from public.food_orders");
    const jobLock = acceptance.indexOf("from public.jobs", orderLock);
    const offerLock = acceptance.indexOf("from public.job_offers", jobLock);
    const driverLock = acceptance.indexOf(
      "from public.drivers_status as status",
      offerLock,
    );
    const driverCas = acceptance.indexOf(
      "update public.drivers_status",
      driverLock,
    );
    const assignment = acceptance.indexOf("update public.jobs", driverCas);

    expect(orderLock).toBeGreaterThan(-1);
    expect(jobLock).toBeGreaterThan(orderLock);
    expect(offerLock).toBeGreaterThan(jobLock);
    expect(driverLock).toBeGreaterThan(offerLock);
    expect(driverCas).toBeGreaterThan(driverLock);
    expect(assignment).toBeGreaterThan(driverCas);
    expect(acceptance).toContain("status.driver_id = v_driver_user_id");
    expect(acceptance).toContain("v_driver_status.is_online is not true");
    expect(acceptance).toContain("coalesce(v_driver_status.is_busy, false)");
    expect(acceptance).toContain("v_driver_status.current_job_id is not null");
    expect(acceptance).toContain("driver_state = 'online_busy'");
    expect(acceptance).toContain("current_job_id = v_job.id");
    expect(acceptance).toContain("'driver_status_missing'");
    expect(acceptance).toContain("'driver_not_available'");
    expect(acceptance).toContain("'driver_availability_cas_failed'");
    expect(acceptance).toContain(
      "raise exception using errcode = '40001', message = 'accept_cas_failed'",
    );
  });

  it("releases only the exact terminal Eats job when no other live job remains", () => {
    const release = sliceBetween(
      dispatchMigration,
      "create or replace function public.release_eats_driver_if_idle(",
      "create or replace function public.cascade_eats_cancellation(",
    );
    const cancellation = sliceBetween(
      dispatchMigration,
      "create or replace function public.cascade_eats_cancellation(",
      "create or replace function public.claim_eats_dispatch(",
    );
    const advance = sliceBetween(
      dispatchMigration,
      "create or replace function public.advance_eats_delivery_job(",
      "create or replace function public.guard_eats_job_mutation(",
    );
    const terminalTrigger = sliceBetween(
      dispatchMigration,
      "create or replace function public.cascade_eats_fulfillment_on_terminal(",
      "drop trigger if exists guard_eats_job_mutation",
    );
    const driverLock = release.indexOf("from public.drivers_status as status");
    const liveJobScan = release.indexOf("from public.jobs as job", driverLock);
    const clear = release.indexOf("update public.drivers_status", liveJobScan);

    expect(driverLock).toBeGreaterThan(-1);
    expect(release.indexOf("for update;", driverLock)).toBeLessThan(
      liveJobScan,
    );
    expect(liveJobScan).toBeLessThan(clear);
    expect(release).toContain(
      "v_driver_status.current_job_id is distinct from p_terminal_job_id",
    );
    expect(release).toContain("job.id <> p_terminal_job_id");
    expect(release).toContain("job.status not in ('completed', 'canceled')");
    expect(release).not.toContain("external_kind = 'food_order'");
    expect(release).toContain(
      "current_job_id is null or current_job_id = p_terminal_job_id",
    );
    expect(release).toContain("driver_state = case when is_online then");

    expect(cancellation).toContain("select job.id, job.assigned_driver_id");
    expect(cancellation).toContain(
      "public.release_eats_driver_if_idle(\n      v_driver_user_id,\n      v_job_id",
    );
    expect(advance).toContain("if v_requested = 'completed' then");
    expect(advance).toContain(
      "public.release_eats_driver_if_idle(\n      p_driver_user_id,\n      v_job.id",
    );
    expect(terminalTrigger).toContain("select job.id, job.assigned_driver_id");
    expect(terminalTrigger).toContain(
      "public.release_eats_driver_if_idle(v_driver_user_id, v_job_id)",
    );
  });

  it("reverses merchant transfers only with authoritative refund state", () => {
    const reversal = sliceBetween(
      stripe,
      "const queueEatsAutoReversal = async (",
      "const finishStripeEatsRefundEvidence = async (",
    );
    const payout = sliceBetween(
      stripe,
      "const reconcileStripeEatsPayout = async (",
      "const body = await req.text();",
    );

    for (const helper of [reversal, payout]) {
      expect(helper).toContain("last_payment_error");
      expect(helper).toContain('"cancelled_no_refund"');
      expect(helper).toContain('payment_status === "refunded"');
      expect(helper).toContain('refund_status === "refunded"');
      expect(helper).toContain("paidWithoutRefund");
      expect(helper).toContain("refundAuthorizesReversal");
      expect(helper).not.toContain('["refund_pending", "refunded"].includes(');
    }
    expect(reversal).toContain(
      "if (paidWithoutRefund || !refundAuthorizesReversal) return",
    );
    expect(payout).not.toContain('["cancelled", "refunded"].includes(');
  });

  it("keeps the payout-reversal marker until exact completion is proven", () => {
    const reversal = sliceBetween(
      stripe,
      "const queueEatsAutoReversal = async (",
      "const finishStripeEatsRefundEvidence = async (",
    );
    const markerIndex = reversal.indexOf(
      'const payoutReversalMarker = "payout_reversal_pending"',
    );
    const ledgerLookupIndex = reversal.indexOf('.eq("direction", "transfer")');
    const clearCalls = reversal.match(
      /await clearEatsPayoutReversalMarker\(\)/g,
    );

    expect(markerIndex).toBeGreaterThan(-1);
    expect(ledgerLookupIndex).toBeGreaterThan(markerIndex);
    expect(reversal).toContain("last_payment_error: payoutReversalMarker");
    expect(reversal).toContain("last_payment_error: null");
    expect(reversal).toContain(
      '.eq("last_payment_error", payoutReversalMarker)',
    );
    expect(reversal).toContain("if (markerError || !markedOrder)");
    expect(reversal).toContain("if (!ledger) {");
    expect(reversal).toContain('reversalLedger.status === "created" &&');
    expect(reversal).toContain("if (createdError) {");
    expect(clearCalls).toHaveLength(3);
    expect(
      reversal.indexOf("await clearEatsPayoutReversalMarker();", markerIndex),
    ).toBeGreaterThan(ledgerLookupIndex);
    expect(reversal).not.toContain(
      'last_payment_error: null,\n                status: "failed"',
    );
  });

  it("settles PayPal before dispatch and compensates a cancelled race", () => {
    const paidBranch = sliceBetween(
      paypal,
      'eventType === "PAYMENT.CAPTURE.COMPLETED"',
      'eventType === "PAYMENT.CAPTURE.DENIED"',
    );

    expect(paidBranch).toContain('"record_eats_provider_settlement"');
    expect(paidBranch).toContain("settlement.refund_required === true");
    expect(paidBranch).toContain("refundCapturedPayment(");
    expect(paidBranch).toContain('"finish_eats_provider_refund"');
    expect(paidBranch.indexOf("record_eats_provider_settlement")).toBeLessThan(
      paidBranch.indexOf("dispatchPaidEatsOrder("),
    );
    expect(paidBranch).toMatch(
      /processingError\s*=\s*dispatched\s*\?\s*null\s*:\s*EATS_DISPATCH_PENDING_ERROR/,
    );
  });

  it("settles Square completed payments before dispatch and retains failure state", () => {
    const paymentBranch = sliceBetween(
      square,
      "const status: string | undefined = payment?.status;",
      "const status: string | undefined = refund?.status;",
    );

    expect(paymentBranch).toContain('"record_eats_provider_settlement"');
    expect(paymentBranch).toContain("settlement.refund_required === true");
    expect(paymentBranch).toContain("await reconcileSquareRefund(");
    expect(paymentBranch).toContain("finish.refund_complete === true");
    expect(square).toContain("async function persistSquareRefundEvidence(");
    expect(square).toContain('"finish_eats_provider_refund_with_evidence"');
    expect(square).toContain("p_refund_status: refund.outcome");
    expect(square).toContain("await persistSquareRefundEvidence(");
    expect(
      paymentBranch.indexOf("record_eats_provider_settlement"),
    ).toBeLessThan(paymentBranch.indexOf("dispatchPaidEatsOrder("));
    expect(paymentBranch).toMatch(
      /processingError\s*=\s*dispatched\s*\?\s*null\s*:\s*EATS_DISPATCH_PENDING_ERROR/,
    );
  });
});
