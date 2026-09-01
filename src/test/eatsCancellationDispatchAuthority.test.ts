import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (file: string) =>
  readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

const payments = read(
  "supabase/migrations/20260830190000_eats_payment_cancellation_state_machine.sql",
);
const dispatch = read(
  "supabase/migrations/20260830190500_eats_dispatch_idempotency.sql",
);
const customerCancel = read("supabase/functions/cancel-eats-order/index.ts");
const restaurantCancel = read(
  "supabase/functions/restaurant-cancel-order/index.ts",
);
const dispatchOrder = read("supabase/functions/dispatch-eats-order/index.ts");
const dispatchStart = read("supabase/functions/dispatch-start/index.ts");
const stateUpdate = read("supabase/functions/eats-order-state-update/index.ts");
const driverPage = read("src/pages/EatsDriverDeliveryPage.tsx");

describe("Eats cancellation and dispatch authority", () => {
  it("keeps exact settlement and refund evidence private and service-role-only", () => {
    expect(payments).toContain("create schema if not exists private");
    expect(payments).toContain("private.eats_payment_evidence");
    expect(payments).toContain("private.eats_provider_refund_evidence");
    expect(payments).toContain("unique (provider, payment_id)");
    expect(payments).toContain("unique (provider, provider_refund_id)");
    expect(payments).toContain(
      "revoke all on schema private from public, anon, authenticated",
    );
    expect(dispatch).toContain(
      "finish_eats_provider_refund_with_evidence(uuid, text, text, text, integer, text, boolean, text)",
    );
    const evidenceAcl = dispatch.slice(
      dispatch.indexOf(
        "revoke all on function public.finish_eats_provider_refund_with_evidence",
      ),
      dispatch.indexOf(
        "create or replace function public.claim_eats_restaurant_cancellation",
      ),
    );
    expect(evidenceAcl).toContain("from public, anon, authenticated;");
    expect(evidenceAcl).toContain("to service_role;");
    expect(evidenceAcl).not.toMatch(/to (?:anon|authenticated);/);
  });

  it("preserves a canonical paid order while compensating exact conflicting evidence", () => {
    expect(payments).toContain("v_order.payment_status = 'refunded'");
    expect(payments).toContain("and not v_preserve_order_payment_state");
    expect(payments).toContain(
      "when v_preserve_order_payment_state then payment_status",
    );
    expect(payments).not.toContain(
      "or v_order.payment_status = 'refund_pending'\n  );",
    );
    expect(payments).toContain("'refund_evidence_rpc_required'");
    expect(dispatch).toContain(
      "v_effective_succeeded := v_refund.status = 'succeeded'",
    );
    expect(dispatch).toContain("provider_over_refund_conflict");
    expect(dispatch).toContain("partial_provider_refund_pending");
    expect(dispatch).toContain("when v_evidence.preserve_order_payment_state");
    expect(dispatch).toContain("refund_amount = (");
    expect(dispatch).toContain("refunded_at = coalesce(refunded_at");

    const transition = payments.slice(
      payments.indexOf(
        "create or replace function public.transition_eats_payment_status",
      ),
      payments.indexOf(
        "revoke all on function public.claim_eats_paypal_capture",
      ),
    );
    expect(transition).toContain("'wrong_payment_type'");
    expect(transition).toContain("'refund_evidence_rpc_required'");
    expect(transition.indexOf("update public.food_orders")).toBeGreaterThan(
      transition.indexOf("if not v_allowed then"),
    );
  });

  it("claims every unresolved exact payment and returns provider-stable refund keys", () => {
    for (const migration of [payments, dispatch]) {
      expect(migration).toContain("refund_state <> 'refunded'");
      expect(migration).toContain(
        "evidence.refund_state in ('required', 'pending')",
      );
      expect(migration).toContain("'refund-eats-' || v_evidence.payment_id");
      expect(migration).toContain(
        "case when v_evidence.refund_attempt_generation > 0 then 14 else 20 end",
      );
      expect(migration).toContain(
        "case when v_evidence.refund_attempt_generation > 0 then 20 else 24 end",
      );
    }
    expect(payments).toContain("v_evidence.amount_cents");
    expect(payments).toContain("v_evidence.currency");
    expect(payments).not.toContain(
      "'total_cents', v_total_cents,\n    'refund_currency'",
    );
  });

  it("rotates provider keys only after durable definitive refund failure", () => {
    expect(payments).toContain("refund_attempt_generation integer");
    expect(dispatch).toContain("attempt_generation integer");
    expect(dispatch).toContain("retry_generation_advanced boolean");
    expect(dispatch).toContain(
      "v_refund_status not in ('succeeded', 'pending', 'failed')",
    );
    expect(dispatch).toContain(
      "when status = 'succeeded' or v_refund_status = 'succeeded' then 'succeeded'",
    );
    expect(dispatch).toContain(
      "when status = 'failed' or v_refund_status = 'failed' then 'failed'",
    );
    expect(dispatch).toContain("when status = 'failed' then error_message");
    expect(dispatch).toContain("and retry_generation_advanced = false");
    expect(dispatch).toContain("v_refund.attempt_generation + 1");
    expect(dispatch).toContain("'provider_refund_failed_retryable'");
    expect(dispatch).toContain("'-r' || v_evidence.refund_attempt_generation");
    for (const migration of [payments, dispatch]) {
      expect(migration).toContain("refund.status = 'succeeded'");
      expect(migration).toContain("v_evidence.amount_cents - v_refunded_cents");
    }

    const evidenceFinish = dispatch.slice(
      dispatch.indexOf(
        "create or replace function public.finish_eats_provider_refund_with_evidence",
      ),
      dispatch.indexOf(
        "create or replace function public.claim_eats_restaurant_cancellation",
      ),
    );
    expect(evidenceFinish).toContain(
      "if v_effective_failed and v_refunded_cents < v_evidence.amount_cents then",
    );
    expect(evidenceFinish).toContain(
      "if v_refunded_cents < v_evidence.amount_cents then",
    );
    expect(evidenceFinish).not.toContain(
      "if not v_effective_succeeded or v_refunded_cents <",
    );
    expect(evidenceFinish.indexOf("v_refunded_cents <")).toBeLessThan(
      evidenceFinish.indexOf("set refund_state = 'refunded'"),
    );
  });

  it("keeps a terminal no-refund cancellation paid when only conflict evidence is refunded", () => {
    const settlement = payments.slice(
      payments.indexOf(
        "create or replace function public.record_eats_provider_settlement",
      ),
      payments.indexOf(
        "create or replace function public.claim_eats_provider_refund",
      ),
    );
    expect(settlement).toContain(
      "v_order.last_payment_error = 'cancelled_no_refund'",
    );
    expect(settlement).toContain("v_order.payment_status = 'paid'");
    expect(settlement).toContain("'payment_status', v_order.payment_status");
    expect(settlement).toContain("'refund_status', v_order.refund_status");
    expect(settlement).toContain(
      "when v_preserve_order_payment_state\n               and v_order.last_payment_error = 'cancelled_no_refund'",
    );

    const compatibilityFinish = payments.slice(
      payments.indexOf(
        "create or replace function public.finish_eats_provider_refund",
      ),
      payments.indexOf(
        "create or replace function public.transition_eats_payment_status",
      ),
    );
    const exactFinish = dispatch.slice(
      dispatch.indexOf(
        "create or replace function public.finish_eats_provider_refund_with_evidence",
      ),
      dispatch.indexOf(
        "create or replace function public.claim_eats_restaurant_cancellation",
      ),
    );
    for (const finish of [compatibilityFinish, exactFinish]) {
      expect(finish).toContain("v_order.payment_status = 'paid'");
      expect(finish).toContain(
        "v_order.last_payment_error = 'cancelled_no_refund'",
      );
      expect(finish).toContain("then 'cancelled_no_refund'");
      expect(finish).toContain(
        "coalesce(nullif(v_evidence.prior_payment_status, 'refund_pending'), 'paid')",
      );
    }
    expect(exactFinish.match(/then 'cancelled_no_refund'/g)).toHaveLength(4);

    expect(payments).toContain("preserve_order_payment_state = false");
    expect(dispatch).toContain("preserve_order_payment_state = false");
  });

  it("records exact PayPal and Square non-2xx evidence before using transport fallback", () => {
    for (const endpoint of [customerCancel, restaurantCancel]) {
      expect(endpoint).toContain('status: "succeeded" | "pending" | "failed"');
      expect(endpoint).toContain("normalizeRefundStatus(payload.status)");
      expect(endpoint).toContain("normalizeRefundStatus(refund.status)");
      expect(endpoint).toContain("payment_intent_id: paymentId");
      expect(endpoint).toContain('type: "eats"');
      expect(endpoint).toContain("const evidenceIncomplete =");
      expect(endpoint).toContain("p_refund_status: evidence.status");
      expect(endpoint).toContain('evidence.status !== "succeeded" ||');
      expect(endpoint).toContain('"finish_eats_provider_refund"');
      const paypalSection = endpoint.slice(
        endpoint.indexOf('if (provider === "paypal")'),
        endpoint.indexOf('if (provider === "square")'),
      );
      const squareSection = endpoint.slice(
        endpoint.indexOf('if (provider === "square")'),
        endpoint.indexOf('throw new Error("Unsupported payment provider")'),
      );
      expect(paypalSection.indexOf("return {")).toBeGreaterThan(
        paypalSection.indexOf("if (evidenceIncomplete)"),
      );
      expect(squareSection.indexOf("return {")).toBeGreaterThan(
        squareSection.indexOf("if (evidenceIncomplete)"),
      );
    }
  });

  it("makes PayPal ambiguous retries recover from exact captured evidence", () => {
    expect(payments).toContain("'capture_requires_reconciliation'");
    expect(payments).toContain("'refund_required', v_evidence.id is not null");
    expect(payments).toContain("'refund_amount_cents'");
    expect(payments).toContain("'refund_currency'");
    expect(payments).toContain("'refund_evidence_id'");
    expect(payments).toContain("'refund_idempotency_key'");
    expect(payments).toContain(
      "'eats-' || pg_catalog.right(v_evidence.payment_id, 20)",
    );
  });

  it("fails closed when a paid wallet order has no durable debit", () => {
    expect(dispatch).toContain("customer_wallet_evidence_missing");
    expect(dispatch).toContain("restaurant_wallet_evidence_missing");
    expect(dispatch).toContain("tx.type in ('purchase', 'payment')");
    expect(dispatch).toContain("tx.amount_cents < 0");
    expect(customerCancel).toContain(
      'error: "wallet_evidence_reconciliation_pending"',
    );
    expect(restaurantCancel).toContain(
      "claim.reconciliation_required === true",
    );
    for (const endpoint of [customerCancel, restaurantCancel]) {
      expect(endpoint).toContain('"process_eats_wallet_refund"');
      expect(endpoint).toContain('error: "wallet_refund_pending"');
      expect(endpoint).toContain("503");
    }
  });

  it("recovers and reverses Connect transfers independently with stable evidence", () => {
    expect(dispatch).toContain("transfer_recovery_required");
    expect(dispatch).toContain("'eats-transfer-' || p_order_id::text");
    expect(dispatch).toContain("bind_eats_payout_transfer");
    expect(dispatch).toContain("finish_eats_payout_reversal");
    expect(dispatch).toContain("'eats-reversal-' || p_order_id::text");
    expect(dispatch).toContain(
      "last_payment_error = 'payout_reversal_pending'",
    );
    expect(dispatch).toContain(
      "last_payment_error = 'payout_reversal_pending';",
    );
    expect(dispatch).toContain("v_order.payment_status::text <> 'refunded'");
    expect(dispatch).toContain("'customer_refund_not_complete'");
    for (const endpoint of [customerCancel, restaurantCancel]) {
      expect(endpoint).toContain('"claim_eats_payout_reversal"');
      expect(endpoint).toContain('"bind_eats_payout_transfer"');
      expect(endpoint).toContain('"finish_eats_payout_reversal"');
      expect(endpoint).toContain('error: "payout_reversal_pending"');
      const providerBranchStart = endpoint.indexOf(
        "claim.refund_required === true",
      );
      const payoutBranchStart = endpoint.indexOf(
        "if (shouldReversePayout)",
        providerBranchStart,
      );
      const providerBranch = endpoint.slice(
        providerBranchStart,
        payoutBranchStart,
      );
      const authorizeReversalAt = providerBranch.lastIndexOf(
        "shouldReversePayout = true;",
      );
      expect(providerBranch).toContain('paymentStatus !== "refunded"');
      expect(authorizeReversalAt).toBeGreaterThan(
        providerBranch.lastIndexOf('error: "provider_refund_pending"'),
      );
      expect(providerBranch.slice(0, authorizeReversalAt)).not.toContain(
        "reversePayoutIfNeeded",
      );
    }
  });

  it("serializes dispatch, offers, acceptance, progress, and cancellation", () => {
    expect(dispatch).toContain("jobs_external_food_order_unique");
    expect(dispatch).toContain("service_orders_external_food_order_unique");
    expect(dispatch).toContain("pg_catalog.substring(\n         notes,");
    expect(dispatch).not.toContain("notes from '^Food order:");
    expect(dispatch).toContain(
      "create or replace function public.claim_eats_dispatch",
    );
    expect(dispatch).toContain(
      "create or replace function public.finish_eats_dispatch",
    );
    expect(dispatch).toContain(
      "create or replace function public.claim_eats_job_offer",
    );
    expect(dispatch).toContain(
      "create or replace function public.accept_eats_job_offer",
    );
    expect(dispatch).toContain(
      "create or replace function public.advance_eats_delivery_job",
    );
    expect(dispatch).toContain(
      "create or replace function public.cascade_eats_cancellation",
    );
    expect(dispatch).toContain("service_order_accept_cas_failed");
    expect(dispatch).toContain("service_order_transition_cas_failed");
    expect(dispatch).toContain("accepted_offer_required");
    expect(dispatch).toContain("guard_eats_job_mutation");
    expect(dispatch).toContain("guard_eats_job_offer_mutation");
    expect(dispatch).toContain("guard_eats_service_order_mutation");
    expect(dispatch).toContain("guard_eats_service_offer_mutation");
    expect(dispatch).toContain("cascade_eats_fulfillment_on_terminal");
    expect(dispatch).toContain(
      "after update of status, payment_status on public.food_orders",
    );
    expect(dispatch).toContain("restaurant_origin_unavailable");
  });

  it("routes all authority callers through RPCs and never trusts implicit sandbox rails", () => {
    for (const endpoint of [customerCancel, restaurantCancel]) {
      expect(endpoint).toContain("requireExplicitProviderMode");
      expect(endpoint).not.toMatch(/MODE"\)\s*\?\?\s*"sandbox"/);
      expect(endpoint).toContain('"finish_eats_provider_refund_with_evidence"');
      expect(endpoint).toContain("String(claim.refund_idempotency_key)");
      expect(endpoint).toContain("provider_refund_pending");
      expect(endpoint).toContain('status: "cancelled"');
      expect(endpoint).toContain("order_status:");
    }
    expect(dispatchOrder).toContain('"claim_eats_dispatch"');
    expect(dispatchOrder).toContain('"finish_eats_dispatch"');
    expect(dispatchOrder).not.toContain('.from("jobs")');
    expect(dispatchOrder).not.toContain('.from("service_orders")');
    expect(dispatchStart).toContain('"claim_eats_job_offer"');
    expect(dispatchStart).toContain("livePendingOffer");
    expect(dispatchStart).toContain("already_offered: true");
    expect(stateUpdate).toContain('"advance_eats_delivery_job"');
  });

  it("keeps the driver UI on canonical authenticated offer and state authorities", () => {
    expect(driverPage).toContain('"accept_eats_job_offer"');
    expect(driverPage).toContain('"eats-order-state-update"');
    expect(driverPage).toContain('.eq("driver_id", user.id)');
    expect(driverPage).toContain('.eq("assigned_driver_id", user.id)');
    expect(driverPage).toContain('.eq("job_type", "food_delivery" as any)');
    expect(driverPage).toContain('"enroute_pickup"');
    expect(driverPage).toContain('"enroute_dropoff"');
    expect(driverPage).toContain('"canceled"');
    expect(driverPage).not.toContain(
      '.update({ status: "assigned", assigned_driver_id:',
    );
  });
});
