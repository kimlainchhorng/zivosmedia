import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test.describe("customer booking and payment contracts", () => {
  test("grocery customer routes connect browse, checkout, confirmation, history, and tracking", async () => {
    const app = read("src/App.tsx");
    const storePage = read("src/pages/GroceryStorePage.tsx");
    const checkout = read("src/components/grocery/GroceryCheckoutDrawer.tsx");
    const confirmed = read("src/pages/grocery/GroceryOrderConfirmed.tsx");
    const history = read("src/pages/GroceryOrderHistory.tsx");
    const tracking = read("src/pages/grocery/GroceryOrderTracking.tsx");

    for (const route of [
      'path="/grocery"',
      'path="/grocery/store/:slug"',
      'path="/grocery/order-confirmed"',
      'path="/grocery/orders"',
      'path="/grocery/track/:orderId"',
      'path="/grocery/returns"',
      'path="/grocery/fees"',
      'path="/grocery/terms"',
    ]) {
      expect(app).toContain(route);
    }

    expect(storePage).toContain("GroceryCheckoutDrawer");
    expect(checkout).toContain('supabase.functions.invoke("create-grocery-payment-intent"');
    expect(checkout).toContain('supabase.functions.invoke("confirm-grocery-payment"');
    expect(checkout).toContain('returnUrl = `${window.location.origin}/grocery/orders?${returnParam}=${orderId}`');
    expect(checkout).toContain('cancelUrl = `${window.location.origin}/grocery/orders?grocery_paypal_cancel=${orderId}`');

    expect(confirmed).toContain('params.get("order_id")');
    expect(confirmed).toContain('.eq("user_id", user.id)');
    expect(confirmed).toContain("navigate(`/grocery/track/${orderId}`)");

    expect(history).toContain('.from("shopping_orders")');
    expect(history).toContain('.eq("user_id", user.id)');
    expect(history).toContain('.eq("order_type", "shopping_delivery")');

    expect(tracking).toContain('useParams<{ orderId: string }>()');
    expect(tracking).toContain('.from("shopping_orders")');
    expect(tracking).toContain('.eq("id", orderId)');
  });

  test("payment creation and confirmation require authenticated ownership and provider reconciliation", async () => {
    const createIntent = read("supabase/functions/create-grocery-payment-intent/index.ts");
    const confirmPayment = read("supabase/functions/confirm-grocery-payment/index.ts");
    const stripeWebhook = read("supabase/functions/stripe-webhook/index.ts");
    const shoppingPolicy = read("supabase/migrations/20260531194500_shopping_orders_customer_driver_policy.sql");

    for (const [name, source] of [
      ["create", createIntent],
      ["confirm", confirmPayment],
    ] as const) {
      expect(source, name).toContain('withSecurity("');
      expect(source, name).toContain("strictCors: true");
      expect(source, name).toContain("rateLimit");
      expect(source, name).toContain("auth.getUser()");
    }

    expect(createIntent).toContain("Unauthorized");
    expect(createIntent).toContain('status: "pending_payment"');
    expect(createIntent).toContain("stripe_payment_intent_id: paymentIntent.id");
    expect(createIntent).toContain('payment_provider: "stripe"');

    expect(confirmPayment).toContain("Authentication required");
    expect(confirmPayment).toContain("paymentIntent.metadata?.order_id");
    expect(confirmPayment).toContain("orderRecord.user_id !== user.id");
    expect(confirmPayment).toContain("Order not found or access denied");
    expect(confirmPayment).toContain('payment_status: "paid"');
    expect(confirmPayment).toContain("notifyGroceryOrderConfirmed");

    expect(stripeWebhook).toContain("Webhook safety net for grocery orders");
    expect(stripeWebhook).toContain('.eq("stripe_payment_intent_id", paymentIntent.id)');
    expect(stripeWebhook).toContain("notifyGroceryOrderConfirmed");

    expect(shoppingPolicy).toContain("Users can update own shopping orders");
    expect(shoppingPolicy).toContain("Drivers can view assigned shopping orders");
    expect(shoppingPolicy).toContain("Drivers can update assigned shopping orders");
  });

  test("platform readiness tracks this customer booking E2E contract", async () => {
    const matrix = read("scripts/qa/platform-readiness-matrix.mjs");
    const workflow = read("scripts/qa/workflow-test-plan.mjs");
    const roleMatrix = read("src/test/roleWorkflowMatrix.test.ts");

    expect(matrix).toContain("tests/e2e/customer-booking-payment.spec.ts");
    expect(workflow).toContain("customer-booking-order");
    expect(roleMatrix).toContain("tests/e2e/customer-booking-payment.spec.ts");
  });
});
