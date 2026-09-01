import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (file: string) =>
  readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

describe("Eats checkout and dispatch authority", () => {
  it("charges every external rail from the exact saved order total", () => {
    const stripe = source("supabase/functions/create-eats-payment/index.ts");
    const square = source(
      "supabase/functions/create-eats-square-checkout/index.ts",
    );
    const paypal = source(
      "supabase/functions/create-eats-paypal-order/index.ts",
    );

    expect(stripe).toContain("amount_cents !== expectedAmount");
    expect(stripe).toContain("amount: expectedAmount");
    expect(stripe).toContain(
      "idempotencyKey: `eats-payment-${order_id}-${expectedAmount}`",
    );
    expect(stripe).not.toContain(
      "Math.abs(Number(amount_cents) - expectedAmount) > 100",
    );

    expect(square).toContain("total_amount");
    expect(square).toContain("amount_cents !== expectedAmountCents");
    expect(square).toContain("amount: expectedAmountCents");
    expect(square).not.toContain("price_money: { amount: amount_cents");

    expect(paypal).toContain("const payableCents = dollarsToCents");
    expect(paypal).toContain("value: (payableCents / 100).toFixed(2)");
  });

  it("sends the explicit fulfillment mode to the authoritative order endpoint", () => {
    const hook = source("src/hooks/useEatsOrder.ts");
    const landing = source("src/pages/EatsLanding.tsx");

    expect(hook).toContain('orderMode: "delivery" | "pickup"');
    expect(hook).toContain("orderMode: params.orderMode");
    expect(landing).toContain("orderMode,");
  });

  it("returns external checkouts to their one saved tracking route", () => {
    const hook = source("src/hooks/useEatsOrder.ts");
    const returns = source("src/components/lodging/PaymentReturnHandler.tsx");

    expect(hook).toContain(
      "/eats/track/${orderId}?eats_paypal_return=${orderId}",
    );
    expect(hook).toContain(
      "/eats/track/${orderId}?eats_paypal_cancel=${orderId}",
    );
    expect(hook).toContain(
      "/eats/track/${orderId}?eats_square_return=${orderId}",
    );
    expect(hook).not.toContain("/orders?eats_");

    expect(returns).toContain("(data as any)?.ok !== true");
    expect(returns).toContain('(data as any)?.payment_status !== "paid"');
    expect(returns).toContain("(data as any)?.order_id !== eatsPaypalRes");
    expect(returns).toContain(
      "pathname: `/eats/track/${encodeURIComponent(eatsPaypalRes)}`",
    );
    expect(returns).toContain('action: "payment_failed"');
  });

  it("recovers paid provider dispatch without creating another charge", () => {
    const status = source(
      "supabase/functions/eats-payment-status-update/index.ts",
    );
    const tracking = source("src/pages/EatsTrackingPage.tsx");

    expect(status).toContain('| "retry_dispatch"');
    expect(status).toContain('action === "retry_dispatch"');
    expect(status).toContain(
      "order.last_payment_error !== DISPATCH_PENDING_ERROR",
    );
    expect(status).toContain(
      '["paid", "cash_on_delivery"].includes(order.payment_status ?? "")',
    );
    expect(tracking).toContain('| "retry_dispatch"');
    expect(tracking).toContain('return "retry_dispatch"');
    expect(tracking).toContain(
      "Payment is already confirmed. Retry only dispatches this saved order and never creates another charge.",
    );
  });

  it("keeps cancellation exact and mutually exclusive with recovery", () => {
    const landing = source("src/pages/EatsLanding.tsx");
    const tracking = source("src/pages/EatsTrackingPage.tsx");

    expect(landing).toContain("(data as any)?.ok !== true");
    expect(landing).toContain('(data as any)?.status !== "cancelled"');
    expect(tracking).toContain(
      "if (disabled || submitting || !preview) return;",
    );
    expect(tracking).toContain("disabled={disabled || submitting || !preview}");
  });

  it("lets Stripe expose only wallets that are actually eligible", () => {
    const landing = source("src/pages/EatsLanding.tsx");
    const form = source("src/components/eats/EatsInlinePaymentForm.tsx");

    expect(landing).not.toContain('id: "applepay"');
    expect(landing).not.toContain('id: "googlepay"');
    expect(landing).toContain(
      "Stripe will show card and any eligible Apple Pay or Google",
    );
    expect(form).toContain(
      'paymentMethodOrder={["card", "apple_pay", "google_pay"]}',
    );
    expect(form).toContain("(when available)");
  });

  it("claims PayPal capture atomically and refuses inactive dispatch", () => {
    const capture = source(
      "supabase/functions/capture-eats-paypal-order/index.ts",
    );
    const dispatch = source("supabase/functions/dispatch-eats-order/index.ts");

    expect(capture).toContain('"claim_eats_paypal_capture"');
    expect(capture).toContain('"record_eats_provider_settlement"');
    expect(capture).toContain("settlement.refund_required === true");
    expect(capture).toContain('"finish_eats_provider_refund"');
    expect(capture).toContain("settlement.dispatch_required === true");
    expect(capture).toContain("payload?.ok !== true");
    expect(capture).toContain("order_id: foodOrderId");

    expect(dispatch).toContain('"claim_eats_dispatch"');
    expect(dispatch).toContain('"finish_eats_dispatch"');
    expect(dispatch).toContain('error: "delivery_dispatch_pending"');
    expect(dispatch).not.toContain('.from("jobs")');
    expect(dispatch).not.toContain('.from("service_orders")');
    expect(dispatch).toContain("dispatchPayload?.ok === true");
    expect(dispatch).toContain("claim.dispatch_required !== true");
    expect(dispatch).toContain("dispatch_required: false");
  });

  it("enforces one durable delivery reference for each Eats order", () => {
    const migration = source(
      "supabase/migrations/20260830190500_eats_dispatch_idempotency.sql",
    );

    expect(migration).toContain("jobs_external_food_order_unique");
    expect(migration).toContain("service_orders_external_food_order_unique");
    expect(migration).toContain("external_kind, external_order_id");
  });
});
