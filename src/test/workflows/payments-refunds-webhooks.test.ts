import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

describe("payments, refunds, and webhook workflow", () => {
  it("keeps the connected payment workflow landing route available", () => {
    const app = source("src/App.tsx");

    expect(app).toContain('path="/payments"');
    expect(app).toContain('PreserveQueryRedirect to="/wallet"');
    expect(app).toContain('path="/wallet"');
    expect(app).toContain("AccountWalletPage");
  });

  it("keeps the standalone payments refunds contract gate wired into platform audit", () => {
    const contractScript = source("scripts/qa/payments-refunds-contracts.mjs");
    const coverageScript = source("scripts/qa/workflow-coverage.mjs");
    const packageJson = source("package.json");

    for (const contractId of [
      "provider-authoritative-webhooks",
      "idempotent-scoped-refunds",
      "subscription-portal-strict-security",
      "refund-state-ui-and-realtime",
      "payment-rls-audit-ledgers",
    ]) {
      expect(contractScript).toContain(contractId);
    }

    expect(coverageScript).toContain("qa:payments-refunds-contracts");
    expect(packageJson).toContain('"qa:payments-refunds-contracts"');
    expect(packageJson).toContain("npm run qa:payments-refunds-contracts");
  });

  it("keeps provider webhooks idempotent and provider-authoritative", () => {
    const stripe = source("supabase/functions/stripe-webhook/index.ts");
    const paypalGrocery = source("supabase/functions/paypal-grocery-webhook/index.ts");
    const squareGrocery = source("supabase/functions/square-grocery-webhook/index.ts");
    const groceryConfirm = source("supabase/functions/confirm-grocery-payment/index.ts");
    const groceryCreate = source("supabase/functions/create-grocery-payment-intent/index.ts");

    expect(stripe).toContain('withSecurity("stripe-webhook"');
    expect(stripe).toContain('allowedMethods: ["POST"]');
    expect(stripe).toContain("constructEvent");
    expect(stripe).toContain("upsert(payload, { onConflict: 'transaction_id' })");
    expect(stripe).toContain("Webhook safety net for grocery orders");
    expect(stripe).toContain('.eq("stripe_payment_intent_id", paymentIntent.id)');
    expect(stripe).toContain("notifyGroceryOrderConfirmed");

    for (const webhook of [paypalGrocery, squareGrocery]) {
      expect(webhook).toContain("withSecurity");
      expect(webhook).toContain("signature_invalid");
      expect(webhook).toContain("ignoreDuplicates: true");
      expect(webhook).toContain("processing_status");
      expect(webhook).toContain('.from("shopping_orders")');
      expect(webhook).toContain("payment_status");
      expect(webhook).toContain("refunded");
    }
    expect(paypalGrocery).toContain("grocery_paypal_webhook_events");
    expect(squareGrocery).toContain("grocery_square_webhook_events");

    expect(groceryCreate).toContain("stripe_payment_intent_id: paymentIntent.id");
    expect(groceryCreate).toContain('payment_provider: "stripe"');
    expect(groceryConfirm).toContain("paymentIntent.metadata?.order_id");
    expect(groceryConfirm).toContain("orderRecord.user_id !== user.id");
    expect(groceryConfirm).toContain('payment_status: "paid"');
  });

  it("keeps Stripe provider webhooks POST-gated without browser-only defenses", () => {
    for (const route of [
      "stripe-webhook",
      "stripe-ride-webhook",
      "stripe-lodging-webhook",
      "stripe-car-rental-webhook",
    ]) {
      const fn = source(`supabase/functions/${route}/index.ts`);
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('allowedMethods: ["POST"]');
      expect(fn).toContain("skipBotDetection: true");
      expect(fn).toContain("skipWaf: true");
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }
  });

  it("keeps refund execution idempotent, scoped, and audited", () => {
    const processRefund = source("supabase/functions/process-refund/index.ts");
    const carRefund = source("supabase/functions/refund-car-rental-deposit/index.ts");
    const paymentWebhookIdempotency = source("src/test/paymentWebhookIdempotency.test.ts");

    expect(processRefund).toContain('withSecurity("process-refund"');
    expect(processRefund).toContain('rateLimit: "admin_action"');
    expect(processRefund).toContain('admin role required');
    expect(processRefund).toContain('scanContentForLinks(notes)');
    expect(processRefund).toContain('const idempotencyKey = `ride_refund_');
    expect(processRefund).toContain("stripe.refunds.create(");
    expect(processRefund).toContain("{ idempotencyKey }");
    expect(processRefund).toContain('.from("financial_ledger")');
    expect(processRefund).toContain('.eq("stripe_reference", stripeRefundId)');
    expect(processRefund).toContain("if (!existingLedger)");
    expect(processRefund).toContain('action_type: "refund_processed"');
    expect(processRefund).toContain('action_type: "refund_denied"');
    expect(processRefund).toContain("partial_refund");
    expect(processRefund).toContain("refunded");

    expect(carRefund).toContain('withSecurity("refund-car-rental-deposit"');
    expect(carRefund).toContain("const cors = ctx.corsHeaders");
    expect(carRefund).not.toContain('getCorsHeaders(req)');
    expect(carRefund).toContain('rateLimitDb(user.id, "payment")');
    expect(carRefund).toContain("paymentIntents.cancel(");
    expect(carRefund).toContain("stripe.refunds.create(");
    expect(carRefund).toContain("idempotencyKey: `car_rental_dep_cancel_");
    expect(carRefund).toContain("idempotencyKey: `car_rental_dep_refund_");
    expect(carRefund).toContain('payment_status: "refunded"');
    expect(carRefund).toContain('payment_status: refund.status === "succeeded" ? "refunded" : "refund_pending"');

    const carCapture = source("supabase/functions/capture-car-rental-balance/index.ts");
    expect(carCapture).toContain('withSecurity("capture-car-rental-balance"');
    expect(carCapture).toContain("const cors = ctx.corsHeaders");
    expect(carCapture).not.toContain('getCorsHeaders(req)');

    expect(paymentWebhookIdempotency).toContain("payment webhook and payout idempotency contracts");
  });

  it("keeps ZIVO Plus subscription status and portal routes behind strict wrapper security", () => {
    const checkPlus = source("supabase/functions/check-zivo-plus/index.ts");
    const portal = source("supabase/functions/zivo-plus-portal/index.ts");

    for (const fn of [checkPlus, portal]) {
      expect(fn).toContain('withSecurity("');
      expect(fn).toContain("const corsHeaders = ctx.corsHeaders");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    expect(checkPlus).toContain("zivo_subscriptions");
    expect(checkPlus).toContain("subscriptions.list");
    expect(checkPlus).toContain("return notSubscribed()");
    expect(portal).toContain('rateLimitDb(user.id, "payment")');
    expect(portal).toContain("billingPortal.sessions.create");
  });

  it("keeps saved payment method metadata mutations behind server-side ownership checks", () => {
    const stripeManage = source("supabase/functions/manage-payment-methods/index.ts");
    const manage = source("supabase/functions/zivo-payment-method-manage/index.ts");
    const gate = source("supabase/migrations/20260601113000_zivo_payment_methods_server_gate.sql");
    const localMethods = source("src/hooks/useLocalPaymentMethods.ts");
    const walletMethods = source("src/hooks/useZivoWallet.ts");

    expect(stripeManage).toContain('withSecurity("manage-payment-methods"');
    expect(stripeManage).toContain("strictCors: true");
    expect(stripeManage).toContain('allowedMethods: ["POST"]');
    expect(stripeManage).toContain('rateLimit: "payment"');
    expect(stripeManage).toContain('trackNetwork: "suspicious"');
    expect(stripeManage).toContain("paymentMethods.detach");
    expect(stripeManage).not.toContain('"Access-Control-Allow-Origin": "*"');

    expect(manage).toContain('withSecurity("zivo-payment-method-manage"');
    expect(manage).toContain("strictCors: true");
    expect(manage).toContain('allowedMethods: ["POST"]');
    expect(manage).toContain('rateLimit: "payment"');
    expect(manage).toContain('trackNetwork: "suspicious"');
    expect(manage).toContain("blockNetworkRiskAt: 80");
    expect(manage).toContain("auth.getUser(token)");
    expect(manage).toContain('from("zivo_payment_methods")');
    expect(manage).toContain('.eq("user_id", user.id)');
    expect(manage).toContain("cleanUuid");
    expect(manage).not.toContain('"Access-Control-Allow-Origin": "*"');

    for (const policy of [
      "zivo_payment_methods_block_direct_insert",
      "zivo_payment_methods_block_direct_update",
      "zivo_payment_methods_block_direct_delete",
    ]) {
      expect(gate).toContain(policy);
    }
    expect(gate).toContain("AS RESTRICTIVE");
    expect(gate).toContain("trusted server-side ownership validation");

    for (const hook of [localMethods, walletMethods]) {
      expect(hook).toContain('functions.invoke("zivo-payment-method-manage"');
      expect(hook).not.toMatch(/from\("zivo_payment_methods"\)[\s\S]{0,220}\.(insert|update|delete|upsert)/);
      expect(hook).not.toMatch(/from\("zivo_payment_methods" as any\)[\s\S]{0,220}\.(insert|update|delete|upsert)/);
    }
  });

  it("keeps ABA and Bakong payment entry points POST-gated and payment-rate-limited", () => {
    const aba = source("supabase/functions/aba-payway-checkout/index.ts");
    const bakong = source("supabase/functions/bakong-verify/index.ts");
    const abaHook = source("src/hooks/useAbaPayway.ts");
    const khqrModal = source("src/components/shop/KHQRPaymentModal.tsx");
    const canonicalRideFrame = source("src/pages/app/CanonicalRidePage.tsx");

    for (const [route, fn] of Object.entries({
      "aba-payway-checkout": aba,
      "bakong-verify": bakong,
    })) {
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('allowedMethods: ["POST"]');
      expect(fn).toContain('rateLimit: "payment"');
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    expect(aba).toContain("safeReturnUrl");
    expect(aba).toContain("generateHash");
    expect(bakong).toContain("validateKhqrPayload");
    expect(bakong).toContain("validateSinceSec");
    expect(abaHook).toContain('supabase.functions.invoke("aba-payway-checkout"');
    expect(khqrModal).toContain('supabase.functions.invoke("aba-payway-checkout"');
    expect(canonicalRideFrame).not.toContain("bakong-verify");
    expect(existsSync(path.join(root, "src/components/rides/AbaPaymentModal.tsx"))).toBe(false);
  });

  it("requires an explicit server-owned merchant QR for legacy Bakong verification", () => {
    for (const fn of [
      source("supabase/functions/bakong-verify/index.ts"),
      source("supabase/functions/create-bakong-ride/index.ts"),
    ]) {
      expect(fn).toContain('Deno.env.get("KHQR_STATIC_MERCHANT_QR")');
      expect(fn).toContain("KHQR payment verification is not configured");
      expect(fn).not.toContain("DEFAULT_STATIC_KHQR");
      expect(fn).not.toContain('Deno.env.get("VITE_KHQR_STATIC_MERCHANT_QR")');
    }
  });

  it("retires legacy Bakong ride creation by default at the server boundary", () => {
    const legacyRide = source("supabase/functions/create-bakong-ride/index.ts");
    const gate = legacyRide.indexOf('Deno.env.get("ENABLE_LEGACY_BAKONG_RIDE") !== "true"');
    const auth = legacyRide.indexOf('const authHeader = req.headers.get("Authorization")');

    expect(gate).toBeGreaterThan(-1);
    expect(legacyRide).toContain('code: "legacy_ride_checkout_retired"');
    expect(legacyRide).toMatch(/legacy_ride_checkout_retired[\s\S]{0,160}410/);
    expect(gate).toBeLessThan(auth);
    expect(legacyRide).not.toContain("VITE_ENABLE_LEGACY_BAKONG_RIDE");
  });

  it("retires direct legacy Media Ride payment endpoints by default", () => {
    for (const relativePath of [
      "supabase/functions/create-ride-payment-intent/index.ts",
      "supabase/functions/capture-ride-payment/index.ts",
      "supabase/functions/complete-ride-request/index.ts",
    ]) {
      const legacyRoute = source(relativePath);
      const gate = legacyRoute.indexOf('Deno.env.get("ENABLE_LEGACY_MEDIA_RIDE_PAYMENTS") !== "true"');
      const auth = legacyRoute.indexOf("Authorization");

      expect(gate).toBeGreaterThan(-1);
      expect(legacyRoute).toContain('code: "legacy_media_ride_payments_retired"');
      expect(legacyRoute).toMatch(/legacy_media_ride_payments_retired[\s\S]{0,180}410/);
      expect(gate).toBeLessThan(auth);
      expect(legacyRoute).not.toContain("VITE_ENABLE_LEGACY_MEDIA_RIDE_PAYMENTS");
    }
  });

  it("keeps KHQR customer confirmation provider-authoritative", () => {
    const khqrModal = source("src/components/shop/KHQRPaymentModal.tsx");

    // A usable QR must come from the checkout provider; a deep link or a
    // locally invented reference is not a KHQR payment payload.
    expect(khqrModal).toContain('const providerQr = typeof data?.qr_string === "string" ? data.qr_string.trim() : "";');
    expect(khqrModal).toContain("if (!providerQr) {");
    expect(khqrModal).toContain("setQrData(providerQr);");

    // A customer acknowledgement must never mark a payment paid, emit a purchase,
    // or invoke a completion callback. Those actions need a verified server result.
    expect(khqrModal).not.toContain("I've Completed Payment");
    expect(khqrModal).not.toContain("handleConfirmPayment");
    expect(khqrModal).not.toContain('setStatus("confirmed")');
    expect(khqrModal).not.toContain("onSuccess?.(");
    expect(khqrModal).not.toContain("trackPurchase");
    expect(khqrModal).not.toContain("crypto.randomUUID()");
    expect(khqrModal).not.toContain("data?.abapay_deeplink || `KHQR:");

    // The actual provider deep link remains available alongside a real QR.
    expect(khqrModal).toContain('window.open(deepLink, "_blank", "noopener,noreferrer")');
    expect(khqrModal).toContain("Payment will be confirmed only after ABA verifies it.");
  });

  it("keeps customer payment capture routes POST-gated and payment-rate-limited", () => {
    const paymentReturn = source("src/components/lodging/PaymentReturnHandler.tsx");
    const canonicalRideFrame = source("src/pages/app/CanonicalRidePage.tsx");
    const carCheckout = source("src/components/admin/store/car-rental/CarRentalCheckoutSection.tsx");

    for (const route of [
      "capture-eats-paypal-order",
      "capture-grocery-paypal-order",
      "capture-lodging-paypal-order",
      "capture-tip-paypal-order",
      "capture-ride-tip",
      "capture-car-rental-balance",
    ]) {
      const fn = source(`supabase/functions/${route}/index.ts`);
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('allowedMethods: ["POST"]');
      expect(fn).toContain('rateLimit: "payment"');
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    for (const route of [
      "capture-eats-paypal-order",
      "capture-grocery-paypal-order",
      "capture-lodging-paypal-order",
      "capture-tip-paypal-order",
    ]) {
      expect(paymentReturn).toContain(`supabase.functions.invoke("${route}"`);
    }
    expect(canonicalRideFrame).toContain("resolveRideAppBaseUrl");
    expect(canonicalRideFrame).not.toContain("capture-ride-tip");
    expect(existsSync(path.join(root, "src/pages/app/RideHubPage.tsx"))).toBe(false);
    expect(carCheckout).toContain('"capture-car-rental-balance"');
  });

  it("keeps payout onboarding and subscription payment routes POST-gated", () => {
    for (const route of [
      "complete-ride-request",
      "driver-connect-onboard",
      "driver-connect-status",
      "connect-onboard-stylist",
      "subscribe-salon-membership",
      "sync-salon-membership-tier",
      "create-reel-boost",
    ]) {
      const fn = source(`supabase/functions/${route}/index.ts`);
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('allowedMethods: ["POST"]');
      expect(fn).toContain('rateLimit: "payment"');
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt:");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }
  });

  it("keeps customer PayPal and Square payment creation routes POST-gated", () => {
    const routes = [
      "create-eats-paypal-order",
      "create-grocery-paypal-order",
      "create-lodging-paypal-order",
      "create-tip-paypal-order",
      "create-eats-square-checkout",
      "create-grocery-square-checkout",
      "create-lodging-square-checkout",
      "create-tip-square-checkout",
    ];

    for (const route of routes) {
      const fn = source(`supabase/functions/${route}/index.ts`);
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('allowedMethods: ["POST"]');
      expect(fn).toContain('rateLimit: "payment"');
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }
  });

  it("keeps Stripe wallet, coin, tip, membership, and Eats payment creation routes POST-gated", () => {
    const routes = [
      "create-coin-checkout",
      "create-coin-payment-intent",
      "create-tip-checkout",
      "create-tip-payment-intent",
      "create-zivo-plus-checkout",
      "create-ads-wallet-topup",
      "create-eats-payment",
    ];

    for (const route of routes) {
      const fn = source(`supabase/functions/${route}/index.ts`);
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('allowedMethods: ["POST"]');
      expect(fn).toContain('rateLimit: "payment"');
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    expect(source("src/components/live/CoinRechargeSheet.tsx")).toContain('supabase.functions.invoke("create-coin-payment-intent"');
    expect(source("src/components/social/TipSheet.tsx")).toContain('supabase.functions.invoke("create-tip-payment-intent"');
    expect(source("src/pages/ZivoPlusPage.tsx")).toContain('supabase.functions.invoke("create-zivo-plus-checkout"');
    expect(source("src/components/admin/AdsStudioWalletGuard.tsx")).toContain('supabase.functions.invoke("create-ads-wallet-topup"');
    expect(source("src/hooks/useEatsOrder.ts")).toContain('supabase.functions.invoke("create-eats-payment"');
  });

  it("keeps payment verification and wallet/media verification routes POST-gated", () => {
    const routes = [
      { route: "payment-verification", rateLimit: "auth_otp" },
      { route: "verify-coin-purchase", rateLimit: "payment" },
      { route: "verify-ads-wallet-topup", rateLimit: "payment" },
      { route: "verify-media-unlock", rateLimit: "payment" },
    ];

    for (const { route, rateLimit } of routes) {
      const fn = source(`supabase/functions/${route}/index.ts`);
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('allowedMethods: ["POST"]');
      expect(fn).toContain(`rateLimit: "${rateLimit}"`);
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    expect(source("src/components/admin/PaymentVerificationDialog.tsx")).toContain('supabase.functions.invoke("payment-verification"');
    expect(source("src/components/live/CoinRechargeSheet.tsx")).toContain('supabase.functions.invoke("verify-coin-purchase"');
    expect(source("src/components/admin/AdsStudioWalletGuard.tsx")).toContain('supabase.functions.invoke("verify-ads-wallet-topup"');
    expect(source("src/components/chat/ChatMessageBubble.tsx")).toContain('supabase.functions.invoke("verify-media-unlock"');
  });

  it("keeps chat coin, gift, premium gift, and group media unlock mutations POST-gated", () => {
    for (const route of [
      "chat-transfer-coins",
      "chat-send-gift",
      "chat-send-premium-gift",
      "chat-unlock-group-media",
    ]) {
      const fn = source(`supabase/functions/${route}/index.ts`);
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('allowedMethods: ["POST"]');
      expect(fn).toContain('rateLimit: "payment"');
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    expect(source("src/hooks/useCoinTransfer.ts")).toContain('supabase.functions.invoke("chat-transfer-coins"');
    expect(source("src/hooks/useChatGifts.ts")).toContain('supabase.functions.invoke("chat-send-gift"');
    expect(source("src/components/chat/ChatGiftPanel.tsx")).toContain('supabase.functions.invoke("chat-send-premium-gift"');
    expect(source("src/components/chat/GroupChat.tsx")).toContain('supabase.functions.invoke("chat-unlock-group-media"');
  });

  it("keeps salon payment settings writes behind server-side ownership checks", () => {
    const manage = source("supabase/functions/store-payment-settings-update/index.ts");
    const gate = source("supabase/migrations/20260601150000_store_payment_settings_server_gate.sql");
    const hook = source("src/hooks/salon/useSalonPaymentSettings.ts");

    expect(manage).toContain('withSecurity("store-payment-settings-update"');
    expect(manage).toContain("strictCors: true");
    expect(manage).toContain('allowedMethods: ["POST"]');
    expect(manage).toContain('rateLimit: "payment"');
    expect(manage).toContain('trackNetwork: "suspicious"');
    expect(manage).toContain("blockNetworkRiskAt: 80");
    expect(manage).toContain("admin.auth.getUser(token)");
    expect(manage).toContain('.from("store_payment_settings")');
    expect(manage).toContain('.from("store_profiles")');
    expect(manage).toContain('rpc("has_role"');
    expect(manage).toContain("stripe_account_id");
    expect(manage).toContain("Stripe Connect fields stay");
    expect(manage).not.toMatch(/stripe_account_id:\s*input/);
    expect(manage).not.toMatch(/stripe_status:\s*input/);

    expect(gate).toContain("Store payment settings inserts require trusted server-side validation");
    expect(gate).toContain("Store payment settings updates require trusted server-side validation");
    expect(gate).toContain("Store payment settings deletes require trusted server-side validation");
    expect(gate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_payment_settings FROM authenticated");
    expect(gate).toContain("GRANT SELECT ON TABLE public.store_payment_settings TO authenticated");

    expect(hook).toContain('functions.invoke("store-payment-settings-update"');
    expect(hook).not.toMatch(/from\("store_payment_settings"\)[\s\S]{0,320}\.(insert|update|delete|upsert)/);
    expect(hook).not.toContain("stripe_account_id: merged.stripe_account_id");
    expect(hook).not.toContain("stripe_status: merged.stripe_status");
  });

  it("keeps Eats payment status transitions behind trusted server-side checks", () => {
    const statusFunction = source("supabase/functions/eats-payment-status-update/index.ts");
    const statusGate = source("supabase/migrations/20260601123000_food_order_payment_status_server_gate.sql");
    const eatsOrder = source("src/hooks/useEatsOrder.ts");

    expect(statusFunction).toContain('withSecurity("eats-payment-status-update"');
    expect(statusFunction).toContain("strictCors: true");
    expect(statusFunction).toContain('rateLimit: "payment"');
    expect(statusFunction).toContain('trackNetwork: "suspicious"');
    expect(statusFunction).toContain("blockNetworkRiskAt: 80");
    expect(statusFunction).toContain("admin.auth.getUser(token)");
    expect(statusFunction).toContain('.from("food_orders")');
    expect(statusFunction).toContain('.from("customer_wallet_transactions")');
    expect(statusFunction).toContain("order.customer_id !== user.id && order.user_id !== user.id");
    expect(statusFunction).toContain("Wallet payment ledger not found");

    expect(statusGate).toContain("food_order_payment_status_server_gate");
    expect(statusGate).toContain("auth.role() = 'service_role'");
    expect(statusGate).toContain("NEW.payment_status IS DISTINCT FROM OLD.payment_status");
    expect(statusGate).toContain("NEW.payment_provider IS DISTINCT FROM OLD.payment_provider");
    expect(statusGate).toContain("food_order_payment_status_server_gate_required");
    expect(statusGate).toContain("trusted server-side validation");

    expect(eatsOrder).toContain('supabase.functions.invoke("eats-payment-status-update"');
    expect(eatsOrder).not.toMatch(/from\("food_orders"\)[\s\S]{0,220}\.update\(\{[^}]*payment_status/);
  });

  it("keeps Eats delivery lifecycle and ratings behind trusted server-side checks", () => {
    const stateFunction = source("supabase/functions/eats-order-state-update/index.ts");
    const stateGate = source("supabase/migrations/20260601124500_food_order_state_server_gate.sql");
    const driverPage = source("src/pages/EatsDriverDeliveryPage.tsx");
    const ordersPage = source("src/pages/EatsOrdersPage.tsx");
    const trackingPage = source("src/pages/EatsTrackingPage.tsx");

    expect(stateFunction).toContain('withSecurity("eats-order-state-update"');
    expect(stateFunction).toContain("strictCors: true");
    expect(stateFunction).toContain('rateLimit: "api_general"');
    expect(stateFunction).toContain('trackNetwork: "suspicious"');
    expect(stateFunction).toContain("blockNetworkRiskAt: 80");
    expect(stateFunction).toContain("admin.auth.getUser(token)");
    expect(stateFunction).toContain('.from("drivers")');
    expect(stateFunction).toContain('.from("food_orders")');
    expect(stateFunction).toContain('action === "driver_status"');
    expect(stateFunction).toContain('action === "rate_order"');
    expect(stateFunction).toContain('.eq("status", "delivered")');

    expect(stateGate).toContain("food_order_state_server_gate");
    expect(stateGate).toContain("auth.role() = 'service_role'");
    expect(stateGate).toContain("NEW.status IS DISTINCT FROM OLD.status");
    expect(stateGate).toContain("NEW.driver_id IS DISTINCT FROM OLD.driver_id");
    expect(stateGate).toContain("NEW.rating IS DISTINCT FROM OLD.rating");
    expect(stateGate).toContain("trusted server-side validation");

    for (const sourceText of [driverPage, ordersPage, trackingPage]) {
      expect(sourceText).toContain('supabase.functions.invoke("eats-order-state-update"');
      expect(sourceText).not.toMatch(/from\("food_orders"\)[\s\S]{0,240}\.update\(/);
    }
  });

  it("keeps Eats and Grocery cancellation refund routes POST-gated", () => {
    const eatsCancel = source("supabase/functions/cancel-eats-order/index.ts");
    const groceryCancel = source("supabase/functions/cancel-grocery-order/index.ts");
    const eatsTracking = source("src/pages/EatsTrackingPage.tsx");
    const groceryTracking = source("src/pages/grocery/GroceryOrderTracking.tsx");

    for (const [route, fn] of Object.entries({
      "cancel-eats-order": eatsCancel,
      "cancel-grocery-order": groceryCancel,
    })) {
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('allowedMethods: ["POST"]');
      expect(fn).toContain('rateLimit: "payment"');
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
      expect(fn).toContain("stripe.refunds.create");
      expect(fn).toContain("cascadeCancellationToDriver");
    }

    expect(eatsTracking).toContain('supabase.functions.invoke("cancel-eats-order"');
    expect(groceryTracking).toContain('supabase.functions.invoke("cancel-grocery-order"');
  });

  it("keeps lodging and ride cancellation refund routes POST-gated", () => {
    const lodgingCancel = source("supabase/functions/cancel-lodging-reservation/index.ts");
    const rideCancel = source("supabase/functions/cancel-ride-request/index.ts");
    const cancelSheet = source("src/components/lodging/guest/CancelReservationSheet.tsx");
    const canonicalRideFrame = source("src/pages/app/CanonicalRidePage.tsx");

    for (const [route, fn] of Object.entries({
      "cancel-lodging-reservation": lodgingCancel,
      "cancel-ride-request": rideCancel,
    })) {
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('allowedMethods: ["POST"]');
      expect(fn).toContain('rateLimit: "payment"');
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    expect(cancelSheet).toContain('supabase.functions.invoke("cancel-lodging-reservation"');
    expect(canonicalRideFrame).not.toContain("cancel-ride-request");
    expect(existsSync(path.join(root, "src/components/rides/RideBookingHome.tsx"))).toBe(false);
  });

  it("renders cancel, refund, dispute, and live payment states for customers and hosts", () => {
    const cancelSheet = source("src/components/lodging/guest/CancelReservationSheet.tsx");
    const disputeCard = source("src/components/lodging/guest/RefundDisputeCard.tsx");
    const disputeSheet = source("src/components/lodging/guest/RefundDisputeSheet.tsx");
    const disputeHook = source("src/hooks/lodging/useLodgingRefundDisputes.ts");
    const liveHook = source("src/hooks/lodging/useReservationLive.ts");
    const tripToasts = source("src/hooks/lodging/useLodgingTripToasts.ts");
    const hostToasts = source("src/hooks/lodging/useHostLodgingOpsToasts.ts");
    const paymentBadge = source("src/components/lodging/LodgingPaymentBadge.tsx");
    const opsSummary = source("src/components/lodging/host/HostReservationOpsSummary.tsx");

    expect(cancelSheet).toContain('supabase.functions.invoke("cancel-lodging-reservation"');
    expect(cancelSheet).toContain("preview: true");
    expect(cancelSheet).toContain("payment_method_outcome");
    expect(cancelSheet).toContain("Refundable");
    expect(cancelSheet).toContain("Non-refundable");
    expect(cancelSheet).toContain("requestCancel.mutateAsync");

    expect(disputeCard).toContain('id="refund-disputes"');
    expect(disputeCard).toContain("Latest update");
    expect(disputeCard).toContain("Resolution amount");
    expect(disputeSheet).toContain("confirmContentSafe");
    expect(disputeHook).toContain('.from("lodge_refund_disputes"');
    expect(disputeHook).toContain('supabase.functions.invoke("submit-lodging-refund-dispute"');
    expect(disputeHook).toContain('queryKey: ["lodge-refund-disputes", reservationId]');

    expect(liveHook).toContain("payment_status");
    expect(liveHook).toContain("stripe_payment_intent_id");
    expect(liveHook).toContain("lodge_reservation_audit");
    expect(tripToasts).toContain('status === "refund_pending"');
    expect(tripToasts).toContain('status === "refunded"');
    expect(tripToasts).toContain("Refund request submitted");
    expect(hostToasts).toContain("New refund dispute");
    expect(paymentBadge).toContain("refund_pending");
    expect(paymentBadge).toContain("refunded");
    expect(opsSummary).toContain("Cancelled/refund");
  });

  it("keeps RLS, audit tables, and webhook event ledgers available through migrations", () => {
    const rideRefunds = source("supabase/migrations/20260421190154_a493c5f5-dc62-44c8-8b79-b5e5cd56670d.sql");
    const lodgeAudit = source("supabase/migrations/20260422050619_8f163271-e8eb-4475-b3da-298872286d4e.sql");
    const lodgeAuditFix = source("supabase/migrations/20260422164931_4a75586f-2751-4663-bbc2-98c075d7e297.sql");
    const lodgeRealtimeCheck = source("supabase/migrations/20260422170713_20446c7d-eb8c-434b-b7ad-52d20fe52cdf.sql");
    const carSecureAccess = source("supabase/migrations/20260529170001_car_rental_secure_reservation_access.sql");
    const grants = source("supabase/migrations/20260531142721_data_api_grants_recent_public_tables.sql");

    expect(rideRefunds).toContain("CREATE TABLE IF NOT EXISTS public.ride_refund_requests");
    expect(rideRefunds).toContain("ALTER TABLE public.ride_refund_requests ENABLE ROW LEVEL SECURITY");
    expect(rideRefunds).toContain("Users create own ride refunds");
    expect(rideRefunds).toContain("Users view own ride refunds");
    expect(rideRefunds).toContain("Admins manage ride refunds");
    expect(rideRefunds).toContain("CREATE TABLE IF NOT EXISTS public.financial_ledger");
    expect(rideRefunds).toContain("Users view own ledger");

    expect(lodgeAudit).toContain("CREATE TABLE IF NOT EXISTS public.lodge_reservation_audit");
    expect(lodgeAudit).toContain("ALTER TABLE public.lodge_reservation_audit ENABLE ROW LEVEL SECURITY");
    expect(lodgeAuditFix).toContain("lodge_reservation_audit_reservation_id_fkey");
    expect(lodgeRealtimeCheck).toContain("lodge_reservation_audit in supabase_realtime");

    expect(carSecureAccess).toContain("get_car_rental_reservation_payment_status");
    expect(carSecureAccess).toContain("GRANT EXECUTE ON FUNCTION public.get_car_rental_reservation_payment_status(uuid) TO anon, authenticated, service_role");

    const paymentSettingsGate = source("supabase/migrations/20260601150000_store_payment_settings_server_gate.sql");

    expect(paymentSettingsGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_payment_settings FROM authenticated");
    expect(paymentSettingsGate).toContain("GRANT SELECT ON TABLE public.store_payment_settings TO authenticated");
    const storePromotionsGate = source("supabase/migrations/20260601161500_store_promotions_server_gate.sql");
    expect(storePromotionsGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_promotions FROM authenticated");
    expect(storePromotionsGate).toContain("GRANT SELECT ON TABLE public.store_promotions TO authenticated");
  });
});
