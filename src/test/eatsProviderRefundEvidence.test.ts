import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (file: string) =>
  readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

const capture = source("supabase/functions/capture-eats-paypal-order/index.ts");
const paypal = source("supabase/functions/paypal-eats-webhook/index.ts");
const square = source("supabase/functions/square-eats-webhook/index.ts");

function sliceBetween(code: string, start: string, end: string): string {
  const startIndex = code.indexOf(start);
  const endIndex = code.indexOf(end, startIndex + start.length);
  expect(startIndex).toBeGreaterThanOrEqual(0);
  expect(endIndex).toBeGreaterThan(startIndex);
  return code.slice(startIndex, endIndex);
}

function expectExactRefundRpc(code: string, provider: "paypal" | "square") {
  expect(
    code.match(/"finish_eats_provider_refund_with_evidence"/g),
  ).toHaveLength(1);
  expect(code.match(/"finish_eats_provider_refund"/g)).toHaveLength(1);

  const exact = sliceBetween(
    code,
    `async function persist${provider === "paypal" ? "PayPal" : "Square"}RefundEvidence(`,
    `async function preserve${provider === "paypal" ? "PayPal" : "Square"}RefundRetry(`,
  );
  expect(exact).toContain('p_provider: "' + provider + '"');
  expect(exact).toContain("p_refund_id: refund.id");
  expect(exact).toContain("p_refund_amount_cents: refund.amountCents");
  expect(exact).toContain("p_refund_currency: refund.currency");
  expect(exact).toContain("p_refund_status: refund.outcome");
  expect(exact).not.toContain("p_refund_succeeded");
  expect(exact).toContain("p_error: refund.error");

  const compatibility = sliceBetween(
    code,
    `async function preserve${provider === "paypal" ? "PayPal" : "Square"}RefundRetry(`,
    `async function reconcile${provider === "paypal" ? "PayPal" : "Square"}Refund(`,
  );
  expect(compatibility).toContain('"finish_eats_provider_refund"');
  expect(compatibility).toContain("p_refund_succeeded: false");

  const reconcile = sliceBetween(
    code,
    `async function reconcile${provider === "paypal" ? "PayPal" : "Square"}Refund(`,
    provider === "paypal" && code === capture
      ? "Deno.serve("
      : provider === "paypal"
        ? "async function verify("
        : "async function dispatchPaidEatsOrder(",
  );
  expect(reconcile).toContain("error.compatibilityFinishAllowed");
  expect(reconcile).toContain(
    `await preserve${provider === "paypal" ? "PayPal" : "Square"}RefundRetry(`,
  );
  expect(reconcile).toContain(
    `await persist${provider === "paypal" ? "PayPal" : "Square"}RefundEvidence(`,
  );
}

describe("Eats provider refund evidence", () => {
  it("persists exact PayPal and Square refund IDs, amounts, currencies, outcomes, and errors", () => {
    expectExactRefundRpc(capture, "paypal");
    expectExactRefundRpc(paypal, "paypal");
    expectExactRefundRpc(square, "square");

    for (const code of [capture, paypal, square]) {
      expect(code).not.toContain("total_amount");
      expect(code).not.toContain('refundCurrency === "USD"');
    }

    expect(capture).toContain("payload?.amount?.value");
    expect(capture).toContain("payload?.amount?.currency_code");
    expect(paypal).toContain("payload?.amount?.value");
    expect(paypal).toContain("payload?.amount?.currency_code");
    expect(square).toContain("providerRefund?.id");
    expect(square).toContain("providerRefund?.amount_money?.amount");
    expect(square).toContain("providerRefund?.amount_money?.currency");
    expect(square).toContain("providerPaymentId !== paymentId");
  });

  it("uses provider-aligned deterministic refund keys and retries unresolved PayPal captures from durable evidence", () => {
    for (const code of [capture, paypal]) {
      expect(code).toContain(
        "captureId.slice(attemptGeneration > 0 ? -14 : -20)",
      );
    }
    expect(square).toContain(
      "paymentId.slice(attemptGeneration > 0 ? -20 : -24)",
    );

    const recovery = sliceBetween(
      capture,
      'if (claim.code === "capture_requires_reconciliation")',
      'if (claim.code === "already_captured")',
    );
    expect(recovery).toContain("claim.refund_required === true");
    expect(recovery).toContain("claim.reconciliation_required === true");
    expect(recovery).toContain("claim.payment_id");
    expect(recovery).toContain("claim.refund_amount_cents");
    expect(recovery).toContain("claim.refund_currency");
    expect(recovery).toContain("claim.refund_evidence_id");
    expect(recovery).toContain("claim.refund_idempotency_key");
    expect(recovery).toContain("claim.refund_attempt_generation");
    expect(recovery).toContain("attemptGeneration >= 0");
    expect(recovery).toContain("attemptGeneration <= 999999");
    expect(recovery).toContain("idempotencyKey === expectedIdempotencyKey");
    expect(recovery).toContain("await reconcilePayPalRefund(");
    expect(recovery).toContain(
      "refund.completed && finish.refund_complete === true",
    );
    expect(recovery).toContain("status: 503");

    expect(paypal).toContain('eventType === "PAYMENT.REFUND.PENDING"');
    expect(paypal).toContain('eventType === "PAYMENT.REFUND.FAILED"');
    expect(paypal).toContain('outcome: refundFailed ? "failed" : "pending"');
    expect(square).toContain("p_refund_status: refund.outcome");
    expect(paypal).toContain(
      "refund.completed && finish.refund_complete === true",
    );
    expect(square).toContain(
      "refundResult.completed && finish.refund_complete === true",
    );
    for (const code of [paypal, square]) {
      expect(code).toContain('finish.payment_status === "refunded"');
      expect(code).toContain('settlement.payment_status === "refunded"');
      expect(code).not.toContain(
        'finish.refund_complete === true ||\n              finish.payment_status === "refunded"',
      );
    }

    const alreadyRefunded = sliceBetween(
      capture,
      'if (claim.code === "already_refunded")',
      'if (claim.code === "capture_requires_reconciliation")',
    );
    expect(alreadyRefunded).toContain(
      "await cascadeRefundCancellation(admin, refundedOrderId)",
    );
    expect(alreadyRefunded).toContain("status: 503");

    const paypalRefundResource = sliceBetween(
      paypal,
      'eventType === "PAYMENT.REFUND.PENDING" ||',
      '} else if (\n            eventType === "PAYMENT.CAPTURE.REFUNDED"',
    );
    expect(paypalRefundResource).toContain(
      'const refundId = String(resource?.id ?? "").trim()',
    );
    expect(paypalRefundResource).toContain(
      "await persistPayPalRefundEvidence(",
    );
    expect(paypalRefundResource).toContain(
      'finish.payment_status === "refunded"',
    );
    expect(paypalRefundResource).toContain(
      "await cascadeRefundCancellation(admin, resolvedOrderId)",
    );
    expect(paypalRefundResource).toContain('processingStatus = "applied"');
    expect(paypalRefundResource).not.toContain(
      'processingStatus = refundFailed ? "error" : "applied"',
    );

    const squareRefundResource = sliceBetween(
      square,
      'eventType === "refund.updated" ||',
      "      } catch (e: any) {",
    );
    expect(squareRefundResource).toContain(
      'finish.payment_status === "refunded"',
    );
    expect(squareRefundResource).toContain(
      "await cascadeRefundCancellation(admin, resolvedOrderId)",
    );
    expect(squareRefundResource).toContain(
      'refundSucceeded && !refundComplete ? "error" : "applied"',
    );
    expect(squareRefundResource).not.toContain(
      "refundFailed || (refundSucceeded && !refundResolved)",
    );

    const paypalCaptureState = sliceBetween(
      paypal,
      'eventType === "PAYMENT.CAPTURE.REFUNDED" ||',
      '} else if (eventType === "CHECKOUT.ORDER.APPROVED")',
    );
    expect(paypalCaptureState).not.toContain(
      'const refundId = String(resource?.id ?? "").trim()',
    );
    expect(paypalCaptureState).toContain('"claim_eats_paypal_capture"');
    expect(paypalCaptureState).toContain("claim.refund_idempotency_key");
    expect(paypalCaptureState).toContain("claim.refund_attempt_generation");
    expect(paypalCaptureState).toContain("attemptGeneration >= 0");
    expect(paypalCaptureState).toContain("attemptGeneration <= 999999");
    expect(paypalCaptureState).toContain("await reconcilePayPalRefund(");
    expect(paypalCaptureState).toContain(
      'if (claim.payment_status === "refunded")',
    );
    expect(paypalCaptureState).toContain(
      'if (finish.payment_status === "refunded")',
    );
    expect(paypalCaptureState).toContain(
      'if (resolvedPaymentStatus === "refunded")',
    );
    expect(paypalCaptureState).toContain(
      "PayPal capture refund requires exact transaction reconciliation",
    );

    for (const code of [capture, paypal]) {
      expect(code).toContain(
        "return attemptGeneration > 0 ? `${base}-r${attemptGeneration}` : base",
      );
    }
    expect(square).toContain(
      "return attemptGeneration > 0 ? `${base}-r${attemptGeneration}` : base",
    );

    for (const code of [capture, paypal, square]) {
      expect(code).toContain("settlement.refund_amount_cents");
      expect(code).toContain("settlement.refund_attempt_generation");
      expect(code).toContain("settlement.refund_idempotency_key");
      expect(code).toContain("settlement.provider_payment_id");
      expect(code).toContain("settlement.provider_currency");
      expect(code).toContain("settlement.refund_evidence_id");
      expect(code).toContain("settlement.reconciliation_required === true");
      expect(code).toContain('settlement.code === "already_refunded"');
    }
  });

  it("durably cancels fulfillment before best-effort driver notification and retries integrity errors", () => {
    for (const code of [capture, paypal, square]) {
      const cascade = sliceBetween(
        code,
        "async function cascadeRefundCancellation(",
        "type ProviderRefundEvidence",
      );
      expect(cascade).toContain('admin.rpc("cascade_eats_cancellation"');
      expect(cascade).toContain('p_cancel_source: "provider_refund"');
      expect(cascade).toContain("if (error || !result?.ok)");
      expect(
        cascade.indexOf('admin.rpc("cascade_eats_cancellation"'),
      ).toBeLessThan(cascade.indexOf("cascadeCancellationToDriver("));
    }

    expect(paypal).toContain(
      'status: processingStatus === "error" ? 503 : 200',
    );
    expect(paypal).toContain(
      'throw new Error("PayPal money event could not resolve a local order")',
    );
    expect(square).toContain(
      'status: processingStatus === "error" ? 503 : 200',
    );
    expect(square).toContain(
      'throw new Error("Square money event could not resolve a local order")',
    );
    expect(capture).toContain('requireExplicitProviderMode("PAYPAL_MODE")');
    expect(capture).toContain('requireEatsProviderCheckoutEnabled("paypal")');

    const capturePreflight = sliceBetween(
      capture,
      "const { data: capturePreflight, error: capturePreflightError } =",
      "const { data: claimData, error: claimError } =",
    );
    expect(capturePreflight).toContain('.select("paypal_capture_id")');
    expect(capturePreflight).toContain(
      "if (!(capturePreflight as any)?.paypal_capture_id)",
    );
    expect(capturePreflight).toContain(
      'requireEatsProviderCheckoutEnabled("paypal")',
    );
    expect(
      capture.indexOf('requireEatsProviderCheckoutEnabled("paypal")'),
    ).toBeLessThan(capture.indexOf('"claim_eats_paypal_capture"'));
    expect(capture.indexOf('"claim_eats_paypal_capture"')).toBeLessThan(
      capture.indexOf('if (claim.code === "capture_requires_reconciliation")'),
    );
    expect(paypal).toContain('requireExplicitProviderMode("PAYPAL_MODE")');
    expect(paypal).not.toContain("requireEatsProviderCheckoutEnabled");
    expect(square).toContain('requireExplicitProviderMode("SQUARE_MODE")');
  });
});
