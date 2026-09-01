import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (file: string) =>
  readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

describe("Eats saved-order payment recovery", () => {
  it("serializes order creation and never gives the browser dispatch or notification authority", () => {
    const hook = source("src/hooks/useEatsOrder.ts");

    expect(hook).toContain("placingRef.current");
    expect(hook).toContain('outcome: "confirmation_pending"');
    expect(hook).toContain('rail: "wallet"');
    expect(hook).toContain('rail: "cash"');
    expect(hook).not.toContain("useEatsNotifications");
    expect(hook).not.toContain('invoke("dispatch-eats-order"');
    expect(hook).not.toContain('invoke("notify-eats-order-confirmed"');
    expect(hook).not.toContain('toast.success("Order placed successfully!")');
  });

  it("never retries an ambiguous wallet debit and preserves the existing order ID", () => {
    const hook = source("src/hooks/useEatsOrder.ts");
    const unknownStart = hook.indexOf(
      'if (walletResult.outcome === "unknown")',
    );
    const definitiveFailureStart = hook.indexOf(
      'await markPaymentFailed(orderId, "Wallet payment was not charged")',
      unknownStart,
    );
    const unknownBlock = hook.slice(unknownStart, definitiveFailureStart);

    expect(unknownStart).toBeGreaterThan(-1);
    expect(definitiveFailureStart).toBeGreaterThan(unknownStart);
    expect(unknownBlock).toContain("orderId,");
    expect(unknownBlock).toContain("trackingCode,");
    expect(unknownBlock).toContain('outcome: "confirmation_pending"');
    expect(unknownBlock).not.toContain("deductWalletBalance(");
    expect(unknownBlock).not.toContain('action: "payment_failed"');
  });

  it("verifies the saved order before an idempotent wallet debit and distinguishes ambiguity", () => {
    const walletFunction = source(
      "supabase/functions/wallet-payment-deduct/index.ts",
    );
    const walletHook = source("src/hooks/useWalletPayment.ts");

    expect(walletFunction).toContain('.from("food_orders")');
    expect(walletFunction).toContain(
      'select("id, customer_id, status, payment_type, payment_status, total_amount")',
    );
    expect(walletFunction).toContain("expectedAmountCents !== amountCents");
    expect(walletFunction).toContain(
      'rpc("process_customer_wallet_payment"',
    );
    expect(walletFunction).toContain("not_charged: true");
    expect(walletHook).toContain(
      'outcome: "charged" | "not_charged" | "unknown"',
    );
    expect(walletHook).toContain('outcome: "unknown"');
    expect(walletHook).toContain('outcome: "not_charged"');
  });

  it("clears every durable checkout result and uses the plain saved-order route", () => {
    const page = source("src/pages/EatsLanding.tsx");
    const resultStart = page.indexOf("const result = await placeOrder({");
    const cancellationStart = page.indexOf(
      "// ─── Cancel just-placed order",
      resultStart,
    );
    const resultBlock = page.slice(resultStart, cancellationStart);

    expect(resultStart).toBeGreaterThan(-1);
    expect(resultBlock).toContain("setCart([])");
    expect(resultBlock).toContain("localStorage.removeItem(CART_STORAGE_KEY)");
    expect(resultBlock).toContain('result.outcome === "confirmation_pending"');
    expect(resultBlock).toContain('result.outcome === "card_payment_required"');
    expect(resultBlock).toContain('result.outcome === "payment_failed"');
    expect(resultBlock).toContain("navigate(`/eats/track/${result.orderId}`");
    expect(resultBlock).not.toContain("wallet_payment_recovery");
    expect(resultBlock.indexOf("setCart([])")).toBeLessThan(
      resultBlock.indexOf('result.outcome === "confirmation_pending"'),
    );
  });

  it("derives retry from durable order state and requires the backend-confirmed order", () => {
    const tracking = source("src/pages/EatsTrackingPage.tsx");

    expect(tracking).toContain("function getRecoveryAction(");
    expect(tracking).toContain('order.payment_type === "wallet"');
    expect(tracking).toContain('order.payment_type === "cash"');
    expect(tracking).toContain(
      'order.last_payment_error === "delivery_dispatch_pending"',
    );
    expect(tracking).toContain('response.state === "confirmed"');
    expect(tracking).toContain("response.order?.id === orderId");
    expect(tracking).toContain("confirmationInFlightRef.current");
    expect(tracking).toContain("confirmationAttemptedRef.current");
    expect(tracking).toContain("catch (error)");
    expect(tracking).not.toContain("useSearchParams");
    expect(tracking).not.toContain("wallet_payment_recovery");
    expect(tracking).not.toContain("deductWalletBalance");
    expect(tracking).not.toContain('invoke("dispatch-eats-order"');
  });

  it("keeps authoritative cancellation available and validates its final response", () => {
    const tracking = source("src/pages/EatsTrackingPage.tsx");
    const cancelRender = tracking.slice(
      tracking.indexOf("{/* Cancellation stays visible during recovery"),
      tracking.indexOf("{/* Download receipt"),
    );

    expect(cancelRender).toContain("!isDelivered && !isCancelled");
    expect(cancelRender).not.toContain("!confirmationPending");
    expect(cancelRender).toContain("onCancelled={handleCancelled}");
    expect(tracking).toContain('(data as any)?.ok !== true');
    expect(tracking).toContain('(data as any)?.status !== "cancelled"');
    expect(tracking).toContain('status: "cancelled"');
  });
});
