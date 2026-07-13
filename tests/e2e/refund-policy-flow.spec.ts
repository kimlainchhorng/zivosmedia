import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

function read(relativePath: string) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test.describe("refund and cancellation policy flow contracts", () => {
  test("public legal pages align merchant-of-record promises with canonical routes", async () => {
    const app = read("src/App.tsx");
    const refundPolicy = read("src/pages/legal/RefundPolicy.tsx");
    const cancellationPolicy = read("src/pages/legal/CancellationPolicy.tsx");

    expect(app).toContain('path="/legal/refunds"');
    expect(app).toContain('path="/legal/cancellation"');

    expect(refundPolicy).toContain('canonical="https://zivosmedia.com/legal/refunds"');
    expect(cancellationPolicy).toContain('canonical="https://zivosmedia.com/legal/cancellation"');

    for (const phrase of [
      "ZIVO is Merchant of Record",
      "Flights:",
      "airline partner",
      "3-10 business days",
    ]) {
      expect(refundPolicy).toContain(phrase);
    }

    for (const phrase of [
      "Hotels (ZIVO is Merchant of Record)",
      "Car Rentals (ZIVO is Merchant of Record)",
      "Flights (Partner Ticketing)",
      "support@zivosmedia.com",
    ]) {
      expect(cancellationPolicy).toContain(phrase);
    }
  });

  test("admin refund workflow preserves payment-provider state and audit evidence", async () => {
    const adminRefunds = read("src/pages/admin/AdminRefundsPage.tsx");
    const stripeRefund = read("supabase/functions/process-refund/index.ts");
    const bakongRefund = read("supabase/functions/resolve-bakong-ride-refund/index.ts");

    expect(adminRefunds).toContain('supabase.functions.invoke("process-refund"');
    expect(adminRefunds).toContain('supabase.functions.invoke("resolve-bakong-ride-refund"');
    expect(adminRefunds).toContain("Review Stripe refund requests and close manual Bakong KHQR refunds");
    expect(adminRefunds).toContain("Mark refunded");
    expect(adminRefunds).toContain("No refund due");

    expect(stripeRefund).toContain('withSecurity("process-refund"');
    expect(stripeRefund).toContain('rateLimit: "admin_action"');
    expect(stripeRefund).toContain('admin.rpc("has_role"');
    expect(stripeRefund).toContain("_role: \"admin\"");
    expect(stripeRefund).toContain("stripe.refunds.create");
    expect(stripeRefund).toContain("idempotencyKey");
    expect(stripeRefund).toContain('entry_type: "refund"');
    expect(stripeRefund).toContain('action_type: "refund_processed"');
    expect(stripeRefund).toContain("send-transactional-email");

    expect(bakongRefund).toContain('withSecurity("resolve-bakong-ride-refund"');
    expect(bakongRefund).toContain('rateLimit: "admin_action"');
    expect(bakongRefund).toContain('admin.rpc("has_role"');
    expect(bakongRefund).toContain("manual_refund_pending");
    expect(bakongRefund).toContain("manual_refunded");
    expect(bakongRefund).toContain("no_refund_due");
    expect(bakongRefund).toContain("appendAdminNote");
    expect(bakongRefund).toContain("admin_actions");
  });

  test("legal workflow plan tracks the refund policy e2e contract", async () => {
    const matrixScript = read("scripts/qa/platform-readiness-matrix.mjs");
    const legalWorkflow = read("src/test/workflows/legal-policy-workflow.test.ts");

    expect(matrixScript).toContain("tests/e2e/refund-policy-flow.spec.ts");
    expect(legalWorkflow).toContain('path="/legal/refunds"');
    expect(legalWorkflow).toContain('path="/legal/cancellation"');
    expect(legalWorkflow).toContain("booking policy consent");
  });
});
