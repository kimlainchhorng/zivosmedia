#!/usr/bin/env node
/**
 * Customer booking, order, and trip contract check.
 *
 * Verifies customer grocery routes, authenticated checkout confirmation,
 * customer/driver order scoping, lodging change/add-on security, and
 * shopping order RLS/Data API grants.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function source(relativePath) {
  const file = path.join(root, relativePath);
  if (!existsSync(file)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  // Normalize CRLF -> LF so multiline assertions are line-ending agnostic
  // (Windows/OneDrive checkouts with core.autocrlf=true yield CRLF files).
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function requireContains(id, text, needle, relativePath) {
  if (!text.includes(needle)) {
    failures.push(`${id}: ${relativePath} missing ${JSON.stringify(needle)}`);
  }
}

const contracts = [
  {
    id: "grocery-customer-route-surface",
    category: "frontend",
    check() {
      const appPath = "src/App.tsx";
      const storePath = "src/pages/GroceryStorePage.tsx";
      const checkoutPath = "src/components/grocery/GroceryCheckoutDrawer.tsx";
      const confirmedPath = "src/pages/grocery/GroceryOrderConfirmed.tsx";
      const historyPath = "src/pages/GroceryOrderHistory.tsx";
      const trackingPath = "src/pages/grocery/GroceryOrderTracking.tsx";
      const app = source(appPath);
      const checkout = source(checkoutPath);
      const confirmed = source(confirmedPath);
      const history = source(historyPath);
      const tracking = source(trackingPath);

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
        requireContains(this.id, app, route, appPath);
      }
      requireContains(this.id, source(storePath), "GroceryCheckoutDrawer", storePath);
      for (const needle of [
        'supabase.functions.invoke("create-grocery-payment-intent"',
        'supabase.functions.invoke("confirm-grocery-payment"',
        'returnUrl = `${window.location.origin}/grocery/orders?${returnParam}=${orderId}`',
        'cancelUrl = `${window.location.origin}/grocery/orders?grocery_paypal_cancel=${orderId}`',
        '<Link to="/grocery/returns"',
        '<Link to="/grocery/fees"',
        '<Link to="/grocery/terms"',
      ]) {
        requireContains(this.id, checkout, needle, checkoutPath);
      }
      for (const needle of ['params.get("order_id")', '.eq("user_id", user.id)', 'navigate(`/grocery/track/${orderId}`)']) {
        requireContains(this.id, confirmed, needle, confirmedPath);
      }
      for (const needle of ['.from("shopping_orders")', '.eq("user_id", user.id)', '.eq("order_type", "shopping_delivery")', 'navigate(`/grocery/track/${orderId}`)']) {
        requireContains(this.id, history, needle, historyPath);
      }
      for (const needle of ['useParams<{ orderId: string }>()', '.from("shopping_orders")', '.eq("id", orderId)']) {
        requireContains(this.id, tracking, needle, trackingPath);
      }
    },
  },
  {
    id: "public-service-booking-submit",
    category: "backend",
    check() {
      const bookingPath = "src/pages/store/ServiceBookingPage.tsx";
      const adminBookingsPath = "src/components/admin/store/AdminBookingsTab.tsx";
      const submitPath = "supabase/functions/service-booking-submit/index.ts";
      const managePath = "supabase/functions/service-booking-manage/index.ts";
      const gatePath = "supabase/migrations/20260601224500_service_bookings_public_submit_gate.sql";
      const ownerGatePath = "supabase/migrations/20260601230000_service_bookings_owner_manage_gate.sql";
      const booking = source(bookingPath);
      const adminBookings = source(adminBookingsPath);
      const submit = source(submitPath);
      const manage = source(managePath);
      const gate = source(gatePath);
      const ownerGate = source(ownerGatePath);

      requireContains(this.id, booking, 'functions.invoke("service-booking-submit"', bookingPath);
      requireContains(this.id, adminBookings, 'functions.invoke("service-booking-manage"', adminBookingsPath);
      requireContains(this.id, submit, 'withSecurity("service-booking-submit"', submitPath);
      requireContains(this.id, submit, 'allowedMethods: ["POST"]', submitPath);
      requireContains(this.id, submit, "strictCors: true", submitPath);
      requireContains(this.id, submit, "SUPABASE_SERVICE_ROLE_KEY", submitPath);
      requireContains(this.id, submit, '.from("store_profiles")', submitPath);
      requireContains(this.id, submit, '.from("store_products")', submitPath);
      requireContains(this.id, submit, '.from("service_bookings")', submitPath);
      requireContains(this.id, manage, 'withSecurity("service-booking-manage"', managePath);
      requireContains(this.id, manage, 'allowedMethods: ["POST"]', managePath);
      requireContains(this.id, manage, "admin.auth.getUser(token)", managePath);
      requireContains(this.id, manage, '.from("service_bookings")', managePath);
      requireContains(this.id, manage, '.from("store_profiles")', managePath);
      requireContains(this.id, manage, '.from("ar_work_orders")', managePath);
      requireContains(this.id, manage, 'rpc("has_role"', managePath);
      requireContains(this.id, gate, "Service booking public inserts require trusted server-side validation", gatePath);
      requireContains(this.id, gate, "REVOKE INSERT ON TABLE public.service_bookings FROM anon", gatePath);
      requireContains(this.id, ownerGate, "Service booking owner inserts require trusted server-side validation", ownerGatePath);
      requireContains(this.id, ownerGate, "Service booking owner updates require trusted server-side validation", ownerGatePath);
      requireContains(this.id, ownerGate, "Service booking owner deletes require trusted server-side validation", ownerGatePath);
      requireContains(this.id, ownerGate, "REVOKE INSERT, UPDATE, DELETE ON TABLE public.service_bookings FROM authenticated", ownerGatePath);
    },
  },
  {
    id: "authenticated-grocery-checkout-confirmation",
    category: "backend",
    check() {
      const createPath = "supabase/functions/create-grocery-payment-intent/index.ts";
      const confirmPath = "supabase/functions/confirm-grocery-payment/index.ts";
      const legacyPath = "supabase/functions/create-grocery-checkout/index.ts";
      const webhookPath = "supabase/functions/stripe-webhook/index.ts";
      const create = source(createPath);
      const confirm = source(confirmPath);
      const legacy = source(legacyPath);
      const webhook = source(webhookPath);

      for (const [relativePath, text] of [[createPath, create], [confirmPath, confirm], [legacyPath, legacy]]) {
        requireContains(this.id, text, 'withSecurity("', relativePath);
        requireContains(this.id, text, "auth.getUser()", relativePath);
        requireContains(this.id, text, "rateLimit", relativePath);
        requireContains(this.id, text, "strictCors: true", relativePath);
      }
      requireContains(this.id, create, "Unauthorized", createPath);
      requireContains(this.id, legacy, "Unauthorized", legacyPath);
      requireContains(this.id, confirm, "Authentication required", confirmPath);
      for (const needle of [
        '.from("shopping_orders")',
        "user_id: user?.id || null",
        'status: "pending_payment"',
        "order_id: order.id",
        "stripe_payment_intent_id: paymentIntent.id",
        'payment_provider: "stripe"',
        'payment_status: paymentIntent.status === "succeeded" ? "paid" : "pending"',
      ]) {
        requireContains(this.id, create, needle, createPath);
      }
      for (const needle of [
        "paymentIntent.metadata?.order_id",
        '.select("user_id")',
        "orderRecord.user_id !== user.id",
        "Order not found or access denied",
        'status: "pending"',
        'payment_status: "paid"',
        'stripe_payment_intent_id: payment_intent_id',
        "notifyGroceryOrderConfirmed",
      ]) {
        requireContains(this.id, confirm, needle, confirmPath);
      }
      for (const needle of [
        "Webhook safety net for grocery orders",
        '.from("shopping_orders")',
        '.eq("stripe_payment_intent_id", paymentIntent.id)',
        "notifyGroceryOrderConfirmed",
      ]) {
        requireContains(this.id, webhook, needle, webhookPath);
      }
    },
  },
  {
    id: "customer-driver-order-scoping",
    category: "authorization",
    check() {
      const orderActionsPath = "src/hooks/useOrderActions.ts";
      const historyPath = "src/pages/GroceryOrderHistory.tsx";
      const driverOrdersPath = "src/hooks/useDriverShoppingOrders.ts";
      const paymentReturnPath = "src/components/lodging/PaymentReturnHandler.tsx";
      const orderActions = source(orderActionsPath);
      const history = source(historyPath);
      const driverOrders = source(driverOrdersPath);
      const paymentReturn = source(paymentReturnPath);

      for (const needle of ["useAuth", '.eq("customer_id", user.id)', 'body: { order_id: orderId, customer_id: user.id }']) {
        requireContains(this.id, orderActions, needle, orderActionsPath);
      }
      for (const needle of [
        "setCurrentUserId(user.id)",
        'supabase.functions.invoke("shopping-order-state-update"',
        'action: "cancel_stale_pending_payment"',
        'action: "rate_order"',
        "rating: stars",
      ]) {
        requireContains(this.id, history, needle, historyPath);
      }
      for (const needle of [
        '.eq("driver_id", driver.id)',
        '.eq("status", "pending")',
        '.is("driver_id", null)',
        'supabase.functions.invoke("shopping-order-state-update"',
        'action: "driver_accept"',
        'action: "driver_status"',
      ]) {
        requireContains(this.id, driverOrders, needle, driverOrdersPath);
      }
      for (const needle of ["grocery_paypal_return", "grocery_paypal_cancel", "grocery_square_return"]) {
        requireContains(this.id, paymentReturn, needle, paymentReturnPath);
      }
    },
  },
  {
    id: "lodging-change-addon-security",
    category: "lodging",
    check() {
      const routes = [
        "approve-lodging-change",
        "request-lodging-change",
        "purchase-lodging-addons",
        "lodging-addon-eligibility",
      ];
      for (const route of routes) {
        const relativePath = `supabase/functions/${route}/index.ts`;
        const text = source(relativePath);
        for (const needle of [
          `withSecurity("${route}"`,
          "const corsHeaders = ctx.corsHeaders",
          "auth.getUser()",
          "strictCors: true",
          'trackNetwork: "suspicious"',
          "blockNetworkRiskAt: 80",
        ]) {
          requireContains(this.id, text, needle, relativePath);
        }
        if (text.includes('"Access-Control-Allow-Origin": "*"')) {
          failures.push(`${this.id}: ${relativePath} must not use wildcard CORS`);
        }
      }
      const requestPath = "supabase/functions/request-lodging-change/index.ts";
      const approvePath = "supabase/functions/approve-lodging-change/index.ts";
      const addonsPath = "supabase/functions/purchase-lodging-addons/index.ts";
      const eligibilityPath = "supabase/functions/lodging-addon-eligibility/index.ts";
      const requestChange = source(requestPath);
      for (const needle of ["isLikelyMaliciousBot(req.headers)", "isIpAbuseThresholdExceeded(admin, ipHash)", "scanContentForLinks(reason)", "reservation.guest_id !== user.id"]) {
        requireContains(this.id, requestChange, needle, requestPath);
      }
      const approveChange = source(approvePath);
      for (const needle of ["store?.owner_id !== user.id", 'r.role === "admin"', "paymentIntents.create"]) {
        requireContains(this.id, approveChange, needle, approvePath);
      }
      const purchaseAddons = source(addonsPath);
      for (const needle of ["r.guest_id !== user.id", "recordFailed(admin, r, user.id", "paymentIntents.create"]) {
        requireContains(this.id, purchaseAddons, needle, addonsPath);
      }
      const eligibility = source(eligibilityPath);
      requireContains(this.id, eligibility, "r.guest_id !== user.id", eligibilityPath);
      requireContains(this.id, eligibility, "catalog.map((addon) => evaluate(addon, ctx))", eligibilityPath);
    },
  },
  {
    id: "shopping-orders-rls-and-grants",
    category: "database",
    check() {
      const basePath = "supabase/migrations/20260312153908_64f6cd7e-6497-481d-b74a-3cbe36705b7f.sql";
      const driverPath = "supabase/migrations/20260312154330_9b8149e4-0f6f-4115-828d-607b319bd493.sql";
      const fixPath = "supabase/migrations/20260531194500_shopping_orders_customer_driver_policy.sql";
      const base = source(basePath);
      const driver = source(driverPath);
      const fix = source(fixPath);

      for (const needle of [
        "ALTER TABLE public.shopping_orders ENABLE ROW LEVEL SECURITY",
        "Users can view own shopping orders",
        "Users can create shopping orders",
        "WITH CHECK (auth.uid() = user_id)",
        "GRANT SELECT, INSERT ON public.shopping_orders TO authenticated",
      ]) {
        requireContains(this.id, base, needle, basePath);
      }
      for (const needle of [
        "Drivers can view pending unassigned shopping orders",
        "status = 'pending' AND driver_id IS NULL",
        "Drivers can claim pending shopping orders",
        "driver_id = (SELECT id FROM public.drivers WHERE user_id = auth.uid() LIMIT 1)",
      ]) {
        requireContains(this.id, driver, needle, driverPath);
      }
      for (const needle of [
        "Users can update own shopping orders",
        "user_id = (SELECT auth.uid())",
        "status IN ('pending_payment', 'pending', 'confirmed', 'cancelled')",
        "Drivers can view assigned shopping orders",
        "Drivers can update assigned shopping orders",
        "WHERE d.user_id = (SELECT auth.uid())",
        "GRANT UPDATE (",
        "rating",
      ]) {
        requireContains(this.id, fix, needle, fixPath);
      }
    },
  },
];

for (const contract of contracts) contract.check();

console.log(JSON.stringify({
  generated: new Date().toISOString(),
  counts: {
    contracts: contracts.length,
    failures: failures.length,
  },
  contracts: contracts.map(({ id, category }) => ({ id, category })),
  failures,
}, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
