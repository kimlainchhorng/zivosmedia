import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

describe("customer booking and order workflow", () => {
  it("keeps the standalone customer booking contract gate wired into platform audit", () => {
    const contractScript = source("scripts/qa/customer-booking-contracts.mjs");
    const coverageScript = source("scripts/qa/workflow-coverage.mjs");
    const packageJson = source("package.json");

    for (const contractId of [
      "grocery-customer-route-surface",
      "authenticated-grocery-checkout-confirmation",
      "customer-driver-order-scoping",
      "lodging-change-addon-security",
      "shopping-orders-rls-and-grants",
    ]) {
      expect(contractScript).toContain(contractId);
    }

    expect(coverageScript).toContain("qa:customer-booking-contracts");
    expect(packageJson).toContain('"qa:customer-booking-contracts"');
    expect(packageJson).toContain("npm run qa:customer-booking-contracts");
  });

  it("keeps grocery browse, checkout, confirmation, history, and tracking routes wired", () => {
    const app = source("src/App.tsx");
    const storePage = source("src/pages/GroceryStorePage.tsx");
    const checkout = source("src/components/grocery/GroceryCheckoutDrawer.tsx");
    const confirmed = source("src/pages/grocery/GroceryOrderConfirmed.tsx");
    const history = source("src/pages/GroceryOrderHistory.tsx");
    const tracking = source("src/pages/grocery/GroceryOrderTracking.tsx");

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
    expect(checkout).toContain('<Link to="/grocery/returns"');
    expect(checkout).toContain('<Link to="/grocery/fees"');
    expect(checkout).toContain('<Link to="/grocery/terms"');

    expect(confirmed).toContain('params.get("order_id")');
    expect(confirmed).toContain('.eq("user_id", user.id)');
    expect(confirmed).toContain('navigate(`/grocery/track/${orderId}`)');

    expect(history).toContain('.from("shopping_orders")');
    expect(history).toContain('.eq("user_id", user.id)');
    expect(history).toContain('.eq("order_type", "shopping_delivery")');
    expect(history).toContain('navigate(`/grocery/track/${orderId}`)');

    expect(tracking).toContain('useParams<{ orderId: string }>()');
    expect(tracking).toContain('.from("shopping_orders")');
    expect(tracking).toContain('.eq("id", orderId)');
  });

  it("keeps travel search and redirect telemetry behind server-side tracking gates", () => {
    const travelTracking = source("supabase/functions/travel-tracking-log/index.ts");
    const travelGate = source("supabase/migrations/20260601011500_travel_tracking_server_gate.sql");
    const partnerRedirect = source("src/lib/partnerRedirectLog.ts");
    const recordSearchAttempt = source("src/lib/recordSearchAttempt.ts");

    expect(travelTracking).toContain('withSecurity("travel-tracking-log"');
    expect(travelTracking).toContain('from("partner_redirect_logs")');
    expect(travelTracking).toContain('from("search_sessions")');
    expect(travelTracking).toContain('from("abandoned_searches")');
    expect(travelTracking).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(travelTracking).toContain("safeUrl(body.redirect_url)");
    expect(travelTracking).toContain("authUser?.email");
    expect(travelTracking).toContain("strictCors: true");
    expect(travelTracking).toContain('trackNetwork: "suspicious"');

    expect(travelGate).toContain('DROP POLICY IF EXISTS "Anyone can create search sessions"');
    expect(travelGate).toContain('DROP POLICY IF EXISTS "Authenticated can insert redirect logs"');
    expect(travelGate).toContain('DROP POLICY IF EXISTS "abandoned_insert_own_email"');
    expect(travelGate).toContain("trusted server-side ingestion");

    expect(partnerRedirect).toContain("travel-tracking-log");
    expect(partnerRedirect).not.toMatch(/from\('partner_redirect_logs'\)[\s\S]{0,160}\.(insert|upsert)/);
    expect(partnerRedirect).not.toMatch(/from\('search_sessions'\)[\s\S]{0,160}\.(insert|upsert)/);
    expect(recordSearchAttempt).toContain("travel-tracking-log");
    expect(recordSearchAttempt).not.toMatch(/from\("abandoned_searches"\)[\s\S]{0,160}\.insert/);
  });

  it("keeps flight companion registrations behind server-side travel support intake", () => {
    const travelSupport = source("supabase/functions/travel-support-submit/index.ts");
    const travelGate = source("supabase/migrations/20260601050000_travel_support_server_gate.sql");
    const companionFinder = source("src/components/flight/TravelCompanionFinder.tsx");

    expect(travelSupport).toContain('withSecurity("travel-support-submit"');
    expect(travelSupport).toContain("strictCors: true");
    expect(travelSupport).toContain('rateLimit: "api_general"');
    expect(travelSupport).toContain('trackNetwork: "suspicious"');
    expect(travelSupport).toContain("blockNetworkRiskAt: 80");
    expect(travelSupport).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(travelSupport).toContain("flight_companion");
    expect(travelSupport).toContain('.from("feedback_submissions")');
    expect(travelGate).toContain("flight_companion");
    expect(travelGate).toContain("trusted server-side ingestion");

    expect(companionFinder).toContain('functions.invoke("travel-support-submit"');
    expect(companionFinder).not.toMatch(/from\("feedback_submissions" as any\)\.insert/);
  });

  it("keeps ride ratings, lost items, and transfer requests server-gated", () => {
    const rideSupport = source("supabase/functions/ride-support-submit/index.ts");
    const rideGate = source("supabase/migrations/20260601043000_ride_support_server_gate.sql");
    const rideHub = source("src/pages/app/RideHubPage.tsx");
    const transferBridge = source("src/components/shared/AirportTransferBridge.tsx");

    expect(rideSupport).toContain('withSecurity("ride-support-submit"');
    expect(rideSupport).toContain("strictCors: true");
    expect(rideSupport).toContain('rateLimit: "api_general"');
    expect(rideSupport).toContain('trackNetwork: "suspicious"');
    expect(rideSupport).toContain("blockNetworkRiskAt: 80");
    expect(rideSupport).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(rideSupport).toContain("CATEGORIES");
    expect(rideSupport).toContain('.from("feedback_submissions")');

    for (const category of ["ride_rating", "lost_item_report", "transfer_request"]) {
      expect(rideSupport).toContain(category);
      expect(rideGate).toContain(category);
    }
    expect(rideGate).toContain("AS RESTRICTIVE");
    expect(rideGate).toContain("trusted server-side ingestion");

    for (const client of [rideHub, transferBridge]) {
      expect(client).toContain('functions.invoke("ride-support-submit"');
      expect(client).not.toMatch(/from\("feedback_submissions"\)\.insert/);
    }
  });

  it("keeps marketplace seller reviews behind authenticated server-side submission", () => {
    const sheet = source("src/components/marketplace/MarketplaceReviewSheet.tsx");
    const submit = source("supabase/functions/marketplace-review-submit/index.ts");
    const gate = source("supabase/migrations/20260601174500_marketplace_reviews_server_gate.sql");

    expect(sheet).toContain('functions.invoke("marketplace-review-submit"');
    expect(sheet).not.toMatch(/from\("marketplace_reviews"\)[\s\S]{0,320}\.(insert|update|delete|upsert)/);
    expect(submit).toContain('withSecurity("marketplace-review-submit"');
    expect(submit).toContain("strictCors: true");
    expect(submit).toContain("admin.auth.getUser(token)");
    expect(submit).toContain('.from("marketplace_orders")');
    expect(submit).toContain('.from("marketplace_listings")');
    expect(submit).toContain('.from("marketplace_reviews")');
    expect(submit).toContain("sellerId === user.id");
    expect(gate).toContain("Marketplace review inserts require trusted server-side validation");
    expect(gate).toContain("Marketplace review updates require trusted server-side validation");
    expect(gate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.marketplace_reviews FROM anon, authenticated");
    expect(gate).toContain("GRANT SELECT ON TABLE public.marketplace_reviews TO anon, authenticated");
  });

  it("keeps generic customer reviews behind authenticated server-side submission", () => {
    const hook = source("src/hooks/useReviews.ts");
    const sheet = source("src/components/reviews/ReviewSubmissionSheet.tsx");
    const manage = source("supabase/functions/review-manage/index.ts");
    const gate = source("supabase/migrations/20260601180000_reviews_server_gate.sql");

    for (const client of [hook, sheet]) {
      expect(client).toContain('functions.invoke("review-manage"');
      expect(client).not.toMatch(/from\("reviews"\)[\s\S]{0,320}\.(insert|update|delete|upsert)/);
      expect(client).not.toMatch(/from\("reviews"\) as any\)[\s\S]{0,320}\.(insert|update|delete|upsert)/);
    }
    expect(manage).toContain('withSecurity("review-manage"');
    expect(manage).toContain("strictCors: true");
    expect(manage).toContain("admin.auth.getUser(token)");
    expect(manage).toContain('.from("reviews")');
    expect(manage).toContain("reviewer_user_id: user.id");
    expect(gate).toContain("Generic review inserts require trusted server-side validation");
    expect(gate).toContain("Generic review updates require trusted server-side validation");
    expect(gate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.reviews FROM anon, authenticated");
    expect(gate).toContain("GRANT SELECT ON TABLE public.reviews TO anon, authenticated");
  });

  it("keeps public car-rental checkout extras behind server-side validation", () => {
    const bookingPage = source("src/pages/car-rental/PublicCarRentalBookingPage.tsx");
    const submit = source("supabase/functions/car-rental-booking-extras-submit/index.ts");
    const gate = source("supabase/migrations/20260601203000_car_rental_booking_extras_server_gate.sql");

    expect(bookingPage).toContain('functions.invoke("car-rental-booking-extras-submit"');
    expect(bookingPage).not.toMatch(/from\("car_rental_promo_redemptions"\)[\s\S]{0,420}\.(insert|update|delete|upsert)/);
    expect(bookingPage).not.toMatch(/from\("car_rental_reservation_addons"\)[\s\S]{0,420}\.(insert|update|delete|upsert)/);

    expect(submit).toContain('withSecurity("car-rental-booking-extras-submit"');
    expect(submit).toContain('allowedMethods: ["POST"]');
    expect(submit).toContain("strictCors: true");
    expect(submit).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(submit).toContain("confirmation_code");
    expect(submit).toContain('.from("car_rental_reservations")');
    expect(submit).toContain('.from("car_rental_addons")');
    expect(submit).toContain('.from("car_rental_reservation_addons")');
    expect(submit).toContain('.from("car_rental_promotions")');
    expect(submit).toContain('.from("car_rental_promo_redemptions")');

    expect(gate).toContain("Car rental reservation add-on inserts require trusted server-side validation");
    expect(gate).toContain("Car rental promo redemption inserts require trusted server-side validation");
    expect(gate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_rental_reservation_addons FROM anon, authenticated");
    expect(gate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.car_rental_promo_redemptions FROM anon, authenticated");
    expect(gate).toContain("GRANT SELECT ON TABLE public.car_rental_reservation_addons TO authenticated");
    expect(gate).toContain("GRANT SELECT ON TABLE public.car_rental_promo_redemptions TO authenticated");
  });

  it("gates public booking submit server-side and scopes owner management to RLS", () => {
    const bookingPage = source("src/pages/store/ServiceBookingPage.tsx");
    const adminBookings = source("src/components/admin/store/AdminBookingsTab.tsx");
    const submit = source("supabase/functions/service-booking-submit/index.ts");
    const gate = source("supabase/migrations/20260601224500_service_bookings_public_submit_gate.sql");

    // Public, unauthenticated submissions stay behind the trusted edge function.
    expect(bookingPage).toContain('functions.invoke("service-booking-submit"');
    expect(bookingPage).not.toMatch(/from\("service_bookings"\)[\s\S]{0,420}\.(insert|upsert)/);

    // Owner-side management writes directly to the table; RLS owner-scopes every
    // row (store_profiles.owner_id = auth.uid() OR admin), so no edge function is
    // required and the never-deployed service-booking-manage path is not used.
    expect(adminBookings).not.toContain('functions.invoke("service-booking-manage"');
    expect(adminBookings).toContain('.from("service_bookings")');
    expect(adminBookings).toMatch(/from\("service_bookings"\)[\s\S]{0,200}\.insert\(/);
    expect(adminBookings).toMatch(/from\("service_bookings"\)[\s\S]{0,200}\.update\(/);
    expect(adminBookings).toMatch(/from\("service_bookings"\)[\s\S]{0,200}\.delete\(/);

    expect(submit).toContain('withSecurity("service-booking-submit"');
    expect(submit).toContain('allowedMethods: ["POST"]');
    expect(submit).toContain("strictCors: true");
    expect(submit).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(submit).toContain('.from("store_profiles")');
    expect(submit).toContain('.from("store_products")');
    expect(submit).toContain('.from("service_bookings")');
    expect(submit).toContain('status: "pending"');

    expect(gate).toContain("Service booking public inserts require trusted server-side validation");
    expect(gate).toContain("REVOKE INSERT ON TABLE public.service_bookings FROM anon");
  });

  it("requires authenticated checkout and confirms only the caller's order", () => {
    const createIntent = source("supabase/functions/create-grocery-payment-intent/index.ts");
    const createEatsPayment = source("supabase/functions/create-eats-payment/index.ts");
    const confirmPayment = source("supabase/functions/confirm-grocery-payment/index.ts");
    const legacyCheckout = source("supabase/functions/create-grocery-checkout/index.ts");
    const stripeWebhook = source("supabase/functions/stripe-webhook/index.ts");

    for (const fn of [createIntent, confirmPayment, legacyCheckout]) {
      expect(fn).toContain('withSecurity("');
      expect(fn).toContain("auth.getUser()");
      expect(fn).toContain("rateLimit");
      expect(fn).toContain("strictCors: true");
    }
    expect(createIntent).toContain("Unauthorized");
    expect(legacyCheckout).toContain("Unauthorized");
    expect(confirmPayment).toContain("Authentication required");

    expect(createIntent).toContain('.from("shopping_orders")');
    expect(createIntent).toContain("user_id: user?.id || null");
    expect(createIntent).toContain('status: "pending_payment"');
    expect(createIntent).toContain("order_id: order.id");
    expect(createIntent).toContain("stripe_payment_intent_id: paymentIntent.id");
    expect(createIntent).toContain('payment_provider: "stripe"');
    expect(createIntent).toContain("payment_status: paymentIntent.status === \"succeeded\" ? \"paid\" : \"pending\"");
    expect(createEatsPayment).toContain('withSecurity("create-eats-payment"');
    expect(createEatsPayment).toContain('allowedMethods: ["POST"]');
    expect(createEatsPayment).toContain('rateLimit: "payment"');
    expect(createEatsPayment).toContain("Order not found or access denied");

    expect(confirmPayment).toContain("paymentIntent.metadata?.order_id");
    expect(confirmPayment).toContain('.select("user_id")');
    expect(confirmPayment).toContain("orderRecord.user_id !== user.id");
    expect(confirmPayment).toContain("Order not found or access denied");
    expect(confirmPayment).toContain('status: "pending"');
    expect(confirmPayment).toContain('payment_status: "paid"');
    expect(confirmPayment).toContain('stripe_payment_intent_id: payment_intent_id');
    expect(confirmPayment).toContain("notifyGroceryOrderConfirmed");

    expect(stripeWebhook).toContain("Webhook safety net for grocery orders");
    expect(stripeWebhook).toContain('.from("shopping_orders")');
    expect(stripeWebhook).toContain('.eq("stripe_payment_intent_id", paymentIntent.id)');
    expect(stripeWebhook).toContain("notifyGroceryOrderConfirmed");
  });

  it("scopes customer cancellation, stale auto-cancel, rating, and driver status updates", () => {
    const orderActions = source("src/hooks/useOrderActions.ts");
    const history = source("src/pages/GroceryOrderHistory.tsx");
    const driverOrders = source("src/hooks/useDriverShoppingOrders.ts");
    const driverOrdersPage = source("src/pages/DriverOrdersPage.tsx");
    const stateFunction = source("supabase/functions/shopping-order-state-update/index.ts");
    const stateGate = source("supabase/migrations/20260601130000_shopping_order_state_server_gate.sql");
    const paymentReturn = source("src/components/lodging/PaymentReturnHandler.tsx");

    expect(orderActions).toContain("useAuth");
    expect(orderActions).toContain('.eq("customer_id", user.id)');
    expect(orderActions).toContain('body: { order_id: orderId, customer_id: user.id }');

    expect(history).toContain("setCurrentUserId(user.id)");
    expect(history).toContain('functions.invoke("shopping-order-state-update"');
    expect(history).not.toMatch(/from\("shopping_orders"\)[\s\S]{0,220}\.update\(/);

    expect(driverOrders).toContain('.eq("driver_id", driver.id)');
    expect(driverOrders).toContain('functions.invoke("shopping-order-state-update"');
    expect(driverOrders).not.toMatch(/from\("shopping_orders"\)[\s\S]{0,260}\.update\(/);
    expect(driverOrdersPage).toContain("updateStatus(orderId, next)");
    expect(driverOrdersPage).not.toMatch(/from\("shopping_orders"\)[\s\S]{0,220}\.update\(/);

    expect(stateFunction).toContain('withSecurity("shopping-order-state-update"');
    expect(stateFunction).toContain("strictCors: true");
    expect(stateFunction).toContain('rateLimit: "api_general"');
    expect(stateFunction).toContain("admin.auth.getUser(token)");
    expect(stateFunction).toContain('.from("drivers")');
    expect(stateFunction).toContain('.from("shopping_orders")');
    expect(stateFunction).toContain('action === "driver_accept"');
    expect(stateFunction).toContain('action === "driver_status"');
    expect(stateFunction).toContain('action === "rate_order"');
    expect(stateFunction).toContain('action === "cancel_stale_pending_payment"');

    expect(stateGate).toContain("shopping_order_state_server_gate");
    expect(stateGate).toContain("auth.role() = 'service_role'");
    expect(stateGate).toContain("NEW.status IS DISTINCT FROM OLD.status");
    expect(stateGate).toContain("NEW.driver_id IS DISTINCT FROM OLD.driver_id");
    expect(stateGate).toContain("NEW.rating IS DISTINCT FROM OLD.rating");
    expect(stateGate).toContain("trusted server-side validation");

    expect(paymentReturn).toContain("grocery_paypal_return");
    expect(paymentReturn).toContain("grocery_paypal_cancel");
    expect(paymentReturn).toContain("grocery_square_return");
    expect(paymentReturn).toContain('supabase.functions.invoke("capture-grocery-paypal-order"');

    for (const route of ["capture-grocery-paypal-order", "capture-eats-paypal-order"]) {
      const fn = source(`supabase/functions/${route}/index.ts`);
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain('allowedMethods: ["POST"]');
      expect(fn).toContain('rateLimit: "payment"');
    }
  });

  it("keeps lodging change and add-on operations behind strict wrapper security", () => {
    const routes = [
      "approve-lodging-change",
      "request-lodging-change",
      "purchase-lodging-addons",
      "lodging-addon-eligibility",
    ];

    for (const route of routes) {
      const fn = source(`supabase/functions/${route}/index.ts`);
      expect(fn).toContain(`withSecurity("${route}"`);
      expect(fn).toContain("const corsHeaders = ctx.corsHeaders");
      expect(fn).toContain("auth.getUser()");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    const requestChange = source("supabase/functions/request-lodging-change/index.ts");
    expect(requestChange).toContain("isLikelyMaliciousBot(req.headers)");
    expect(requestChange).toContain("isIpAbuseThresholdExceeded(admin, ipHash)");
    expect(requestChange).toContain("scanContentForLinks(reason)");
    expect(requestChange).toContain("reservation.guest_id !== user.id");

    const approveChange = source("supabase/functions/approve-lodging-change/index.ts");
    expect(approveChange).toContain("store?.owner_id !== user.id");
    expect(approveChange).toContain('r.role === "admin"');
    expect(approveChange).toContain("paymentIntents.create");

    const purchaseAddons = source("supabase/functions/purchase-lodging-addons/index.ts");
    expect(purchaseAddons).toContain("r.guest_id !== user.id");
    expect(purchaseAddons).toContain("recordFailed(admin, r, user.id");
    expect(purchaseAddons).toContain("paymentIntents.create");

    const eligibility = source("supabase/functions/lodging-addon-eligibility/index.ts");
    expect(eligibility).toContain("r.guest_id !== user.id");
    expect(eligibility).toContain("catalog.map((addon) => evaluate(addon, ctx))");
  });

  it("keeps RLS and Data API grants aligned for customers, drivers, and grocery order updates", () => {
    const shoppingBase = source("supabase/migrations/20260312153908_64f6cd7e-6497-481d-b74a-3cbe36705b7f.sql");
    const driverClaim = source("supabase/migrations/20260312154330_9b8149e4-0f6f-4115-828d-607b319bd493.sql");
    const policyFix = source("supabase/migrations/20260531194500_shopping_orders_customer_driver_policy.sql");

    expect(shoppingBase).toContain("ALTER TABLE public.shopping_orders ENABLE ROW LEVEL SECURITY");
    expect(shoppingBase).toContain("Users can view own shopping orders");
    expect(shoppingBase).toContain("Users can create shopping orders");
    expect(shoppingBase).toContain("WITH CHECK (auth.uid() = user_id)");
    expect(shoppingBase).toContain("GRANT SELECT, INSERT ON public.shopping_orders TO authenticated");

    expect(driverClaim).toContain("Drivers can view pending unassigned shopping orders");
    expect(driverClaim).toContain("status = 'pending' AND driver_id IS NULL");
    expect(driverClaim).toContain("Drivers can claim pending shopping orders");
    expect(driverClaim).toContain("driver_id = (SELECT id FROM public.drivers WHERE user_id = auth.uid() LIMIT 1)");

    expect(policyFix).toContain("Users can update own shopping orders");
    expect(policyFix).toContain("user_id = (SELECT auth.uid())");
    expect(policyFix).toContain("status IN ('pending_payment', 'pending', 'confirmed', 'cancelled')");
    expect(policyFix).toContain("Drivers can view assigned shopping orders");
    expect(policyFix).toContain("Drivers can update assigned shopping orders");
    expect(policyFix).toContain("WHERE d.user_id = (SELECT auth.uid())");
    expect(policyFix).toContain("GRANT UPDATE (");
    expect(policyFix).toContain("rating");
  });
});
