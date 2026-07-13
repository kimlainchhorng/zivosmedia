import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (relativePath: string) => fs.readFileSync(path.join(root, relativePath), "utf8");

function expectAll(text: string, needles: readonly string[]) {
  for (const needle of needles) {
    expect(text).toContain(needle);
  }
}

test.describe("checkout and refund state contracts", () => {
  test("keeps grocery checkout confirmation owned by the authenticated customer and provider status", () => {
    const checkout = read("src/components/grocery/GroceryCheckoutDrawer.tsx");
    const confirm = read("supabase/functions/confirm-grocery-payment/index.ts");
    const stripeWebhook = read("supabase/functions/stripe-webhook/index.ts");
    const paypalWebhook = read("supabase/functions/paypal-grocery-webhook/index.ts");
    const squareWebhook = read("supabase/functions/square-grocery-webhook/index.ts");

    expectAll(checkout, [
      'supabase.functions.invoke("create-grocery-payment-intent"',
      'supabase.functions.invoke("confirm-grocery-payment"',
      'returnUrl = `${window.location.origin}/grocery/orders?${returnParam}=${orderId}`',
      'cancelUrl = `${window.location.origin}/grocery/orders?grocery_paypal_cancel=${orderId}`',
    ]);

    expectAll(confirm, [
      'withSecurity("confirm-grocery-payment"',
      'allowedMethods: ["POST"]',
      "auth.getUser()",
      "paymentIntent.metadata?.order_id",
      "orderRecord.user_id !== user.id",
      'payment_status: "paid"',
      "notifyGroceryOrderConfirmed",
    ]);

    expectAll(stripeWebhook, [
      'withSecurity("stripe-webhook"',
      "Webhook safety net for grocery orders",
      '.eq("stripe_payment_intent_id", paymentIntent.id)',
      "notifyGroceryOrderConfirmed",
    ]);

    for (const webhook of [paypalWebhook, squareWebhook]) {
      expectAll(webhook, [
        "ignoreDuplicates: true",
        "processing_status",
        '.from("shopping_orders")',
        "payment_status",
        "refunded",
      ]);
    }
  });

  test("keeps admin refund processing idempotent, audited, and provider-scoped", () => {
    const adminRefunds = read("src/pages/admin/AdminRefundsPage.tsx");
    const processRefund = read("supabase/functions/process-refund/index.ts");
    const refundRequestMigration = read("supabase/migrations/20260421190154_a493c5f5-dc62-44c8-8b79-b5e5cd56670d.sql");

    expectAll(adminRefunds, [
      'supabase.functions.invoke("process-refund"',
      'supabase.functions.invoke("resolve-bakong-ride-refund"',
      "Review Stripe refund requests and close manual Bakong KHQR refunds",
      "Mark refunded",
      "No refund due",
    ]);

    expectAll(processRefund, [
      'withSecurity("process-refund"',
      'allowedMethods: ["POST"]',
      'rateLimit: "admin_action"',
      'admin.rpc("has_role"',
      "_role: \"admin\"",
      "scanContentForLinks(notes)",
      "const idempotencyKey = `ride_refund_",
      "stripe.refunds.create(",
      "{ idempotencyKey }",
      '.from("financial_ledger")',
      '.eq("stripe_reference", stripeRefundId)',
      'action_type: "refund_processed"',
      'action_type: "refund_denied"',
      "partial_refund",
      "refunded",
      "send-transactional-email",
    ]);

    expectAll(refundRequestMigration, [
      "CREATE TABLE IF NOT EXISTS public.ride_refund_requests",
      "ALTER TABLE public.ride_refund_requests ENABLE ROW LEVEL SECURITY",
      "Users create own ride refunds",
      "Users view own ride refunds",
      "Admins manage ride refunds",
      "CREATE TABLE IF NOT EXISTS public.financial_ledger",
    ]);
  });

  test("keeps car rental refund state mapped to cancel, pending, and refunded outcomes", () => {
    const carRefund = read("supabase/functions/refund-car-rental-deposit/index.ts");
    const carSecure = read("supabase/migrations/20260529170001_car_rental_secure_reservation_access.sql");
    const carStripe = read("supabase/migrations/20260526130000_car_rental_stripe.sql");

    expectAll(carRefund, [
      'withSecurity("refund-car-rental-deposit"',
      'allowedMethods: ["POST"]',
      'rateLimitDb(user.id, "payment")',
      "paymentIntents.cancel(",
      "stripe.refunds.create(",
      "idempotencyKey: `car_rental_dep_cancel_",
      "idempotencyKey: `car_rental_dep_refund_",
      'payment_status: "refunded"',
      'payment_status: refund.status === "succeeded" ? "refunded" : "refund_pending"',
    ]);

    expectAll(carSecure, [
      "get_car_rental_reservation_payment_status",
      "GRANT EXECUTE ON FUNCTION public.get_car_rental_reservation_payment_status(uuid) TO anon, authenticated, service_role",
    ]);
    expectAll(carStripe, [
      "car_rental_reservations_payment_status_check",
      "'refund_pending','refunded','failed'",
      "car_rental_reservations_payment_status_idx",
    ]);
  });

  test("keeps lodging cancellation and refund UI state live, auditable, and dispute-aware", () => {
    const cancelSheet = read("src/components/lodging/guest/CancelReservationSheet.tsx");
    const disputeCard = read("src/components/lodging/guest/RefundDisputeCard.tsx");
    const disputeSheet = read("src/components/lodging/guest/RefundDisputeSheet.tsx");
    const disputeHook = read("src/hooks/lodging/useLodgingRefundDisputes.ts");
    const liveHook = read("src/hooks/lodging/useReservationLive.ts");
    const tripToasts = read("src/hooks/lodging/useLodgingTripToasts.ts");
    const paymentBadge = read("src/components/lodging/LodgingPaymentBadge.tsx");
    const cancelFunction = read("supabase/functions/cancel-lodging-reservation/index.ts");
    const auditMigration = read("supabase/migrations/20260422050619_8f163271-e8eb-4475-b3da-298872286d4e.sql");
    const realtimeMigration = read("supabase/migrations/20260422170713_20446c7d-eb8c-434b-b7ad-52d20fe52cdf.sql");

    expectAll(cancelSheet, [
      'supabase.functions.invoke("cancel-lodging-reservation"',
      "preview: true",
      "payment_method_outcome",
      "Refundable",
      "Non-refundable",
      "requestCancel.mutateAsync",
    ]);
    expectAll(disputeCard, ['id="refund-disputes"', "Latest update", "Resolution amount"]);
    expect(disputeSheet).toContain("confirmContentSafe");
    expectAll(disputeHook, [
      '.from("lodge_refund_disputes"',
      'supabase.functions.invoke("submit-lodging-refund-dispute"',
      'queryKey: ["lodge-refund-disputes", reservationId]',
    ]);
    expectAll(liveHook, ["payment_status", "stripe_payment_intent_id", "lodge_reservation_audit"]);
    expectAll(tripToasts, ['status === "refund_pending"', 'status === "refunded"', "Refund request submitted"]);
    expectAll(paymentBadge, ["refund_pending", "refunded"]);
    expectAll(cancelFunction, [
      'withSecurity("cancel-lodging-reservation"',
      'allowedMethods: ["POST"]',
      'rateLimit: "payment"',
      'trackNetwork: "suspicious"',
    ]);
    expectAll(auditMigration, [
      "CREATE TABLE IF NOT EXISTS public.lodge_reservation_audit",
      "ALTER TABLE public.lodge_reservation_audit ENABLE ROW LEVEL SECURITY",
    ]);
    expect(realtimeMigration).toContain("lodge_reservation_audit in supabase_realtime");
  });

  test("keeps checkout/refund E2E coverage wired into the payments readiness lane", () => {
    const matrix = read("scripts/qa/platform-readiness-matrix.mjs");
    const paymentsContracts = read("scripts/qa/payments-refunds-contracts.mjs");
    const workflowCoverage = read("scripts/qa/workflow-coverage.mjs");

    expect(matrix).toContain("tests/e2e/checkout-refund-state.spec.ts");
    expect(matrix).toContain("npm run qa:payments-refunds-contracts");
    expect(matrix).toContain("npm run qa:payouts-earnings-contracts");
    expect(matrix).toContain("npm run test -- src/test/paymentWebhookIdempotency.test.ts src/test/payoutAuthorization.test.ts");
    expect(matrix).toContain("npx playwright test tests/e2e/checkout-refund-state.spec.ts");
    expect(matrix).toContain("Keep provider webhooks, checkout/refund state, payout auth, idempotency, and wallet ledgers green.");
    expect(paymentsContracts).toContain("tests/e2e/checkout-refund-state.spec.ts");
    expect(workflowCoverage).toContain("refund-state UI");
  });
});
