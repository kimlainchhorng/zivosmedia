import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("role workflow matrix", () => {
  it("keeps every major role reachable from protected app routes and hub links", () => {
    const app = source("src/App.tsx");
    const morePage = source("src/pages/MorePage.tsx");
    const appMore = source("src/pages/app/AppMore.tsx");
    const access = source("src/hooks/useUserAccess.ts");

    for (const route of [
      'path="/app"',
      'path="/personal-dashboard"',
      'path="/shop-dashboard"',
      'path="/shop-dashboard/orders"',
      'path="/shop-dashboard/employees"',
      'path="/creator-dashboard"',
      'path="/eats/driver-deliveries"',
      'path="/driver/payouts"',
      'path="/admin/analytics"',
      'path="/admin/stores/:storeId"',
      'path="/admin/support"',
    ]) {
      expect(app).toContain(route);
    }

    for (const link of [
      'label: "Creator Dashboard", href: "/creator-dashboard"',
      'label: "Eats Driver", href: "/eats/driver-deliveries"',
      'label: "Workplace", href: "/personal-dashboard"',
      'label: "Shop Dashboard"',
      'label: "Admin dashboard"',
    ]) {
      expect(morePage + appMore).toContain(link);
    }

    for (const roleFlag of [
      "isAdmin",
      "isDriver",
      "isStoreOwner",
      "isSupport",
      "isModerator",
      "isOperations",
      "driverId",
      "storeId",
    ]) {
      expect(access).toContain(roleFlag);
    }
    expect(access).toContain('.from("user_roles")');
    expect(access).toContain('.from("drivers")');
    expect(access).toContain('.from("store_profiles")');
    expect(access).toContain('roles.includes("support")');
  });

  it("keeps customer, owner, and staff workflow contract gates in platform audit", () => {
    const packageJson = source("package.json");
    const workflowCoverage = source("scripts/qa/workflow-coverage.mjs");
    const customer = source("scripts/qa/customer-booking-contracts.mjs");
    const owner = source("scripts/qa/shop-owner-contracts.mjs");
    const staff = source("scripts/qa/client-staff-contracts.mjs");

    for (const command of [
      "qa:customer-booking-contracts",
      "qa:shop-owner-contracts",
      "qa:client-staff-contracts",
    ]) {
      expect(packageJson).toContain(command);
      expect(workflowCoverage).toContain(command);
    }

    for (const contractId of [
      "grocery-customer-route-surface",
      "authenticated-grocery-checkout-confirmation",
      "customer-driver-order-scoping",
      "owner-self-service-setup-route",
      "owner-dashboard-routes-and-tabs",
      "owner-scoped-operations",
      "employee-invite-acceptance",
      "owner-only-employee-invites",
      "staff-schedule-read-owner-write",
    ]) {
      expect(customer + owner + staff).toContain(contractId);
    }
  });

  it("keeps creator and driver money workflows server-gated by role and identity", () => {
    const creatorDashboard = source("src/pages/CreatorDashboardPage.tsx");
    const liveEarnings = source("src/hooks/useLiveEarnings.ts");
    const creatorPayout = source("supabase/functions/creator-payout-request/index.ts");
    const driverPayouts = source("src/pages/driver/DriverPayoutsPage.tsx");
    const adminDriverPayouts = source("src/pages/admin/AdminDriverPayoutsPage.tsx");
    const resolveDriverPayout = source("supabase/functions/resolve-driver-earning-payout/index.ts");

    for (const table of [
      "creator_profiles",
      "creator_tips",
      "creator_subscriptions",
      "ppv_posts",
      "direct_message_unlocks",
    ]) {
      expect(creatorDashboard).toContain(`from("${table}")`);
    }
    expect(liveEarnings).toContain('supabase.functions.invoke("creator-payout-request"');
    expect(creatorPayout).toContain('withSecurity("creator-payout-request"');
    expect(creatorPayout).toContain("enforceAal2(auth, corsHeaders)");
    expect(creatorPayout).toContain("request_live_earnings_payout");
    expect(creatorPayout).toContain("withIdempotency(req, \"creator-payout-request\", user.id");

    for (const fn of [
      "driver-connect-status",
      "driver-connect-onboard",
      "customer-payout-method-record",
    ]) {
      expect(driverPayouts).toContain(`supabase.functions.invoke("${fn}"`);
    }
    expect(adminDriverPayouts).toContain('supabase.functions.invoke("resolve-driver-earning-payout"');
    expect(resolveDriverPayout).toContain('withSecurity("resolve-driver-earning-payout"');
    expect(resolveDriverPayout).toContain('admin.rpc("has_role", { _user_id: user.id, _role: "admin" }');
    expect(resolveDriverPayout).toContain('.from("driver_earnings")');
    expect(resolveDriverPayout).toContain('admin.from("admin_driver_actions").insert');
  });

  it("keeps protected-route exceptions and database policies aligned with role boundaries", () => {
    const app = source("src/App.tsx");
    const guard = source("src/components/auth/ProtectedRoute.tsx");
    const roleGrants = source("supabase/migrations/20260531184042_role_workflow_data_api_grants.sql");
    const employeeGate = source("supabase/migrations/20260601141500_store_employees_server_gate.sql");
    const shiftGate = source("supabase/migrations/20260601143000_employee_shifts_server_gate.sql");
    const ruleGate = source("supabase/migrations/20260601144500_employee_rules_server_gate.sql");
    const shoppingPolicy = source("supabase/migrations/20260531194500_shopping_orders_customer_driver_policy.sql");
    const driverRls = source("supabase/migrations/20260131202033_2a6cde74-5ca5-4f55-9675-9580420c3829.sql");

    expect(guard).toContain("requireAdmin && !isAdmin");
    expect(guard).toContain("allowStoreOwner");
    expect(guard).toContain("allowSupport");
    expect(guard).toContain("useUserAccess(user?.id)");
    expect(guard).toContain("<AccessDenied");
    expect(guard).toContain('location.pathname.startsWith("/admin/stores/")');
    expect(guard).toContain("return <Navigate to={loginUrl} state={{ from: location }} replace />;");
    expect(guard).not.toContain("return <Navigate to={`/hotel/${storeId}`} replace />;");

    expect(app).toContain('path="/admin/stores/:storeId" element={<ProtectedRoute requireAdmin={true} allowStoreOwner={true}>');
    expect(app).toContain('path="/admin/support" element={<ProtectedRoute requireAdmin={true} allowSupport={true}>');
    expect(app).toContain('path="/admin/user-accounts" element={<ProtectedRoute requireAdmin={true} allowSupport={true}>');

    for (const grant of [
      "grant select on table public.store_profiles to anon, authenticated;",
      "grant select, insert, update on table public.store_orders to authenticated;",
      "grant all privileges on table public.store_orders to service_role;",
    ]) {
      expect(roleGrants).toContain(grant);
    }
    expect(employeeGate).toContain("GRANT SELECT ON TABLE public.store_employees TO authenticated");
    expect(shiftGate).toContain("GRANT SELECT ON TABLE public.employee_shifts TO authenticated");
    expect(ruleGate).toContain("GRANT SELECT ON TABLE public.employee_rules TO authenticated");

    expect(shoppingPolicy).toContain("Users can update own shopping orders");
    expect(shoppingPolicy).toContain("Drivers can view assigned shopping orders");
    expect(shoppingPolicy).toContain("Drivers can update assigned shopping orders");
    expect(driverRls).toContain("drivers_select_own_or_admin");
    expect(driverRls).toContain("driver_earnings_select");
    expect(driverRls).toContain("driver_id IN (SELECT id FROM public.drivers WHERE user_id = auth.uid())");
  });

  it("tracks cross-vertical route coverage in role readiness", () => {
    const matrix = source("scripts/qa/platform-readiness-matrix.mjs");
    const staffDriverCreator = source("src/test/staffDriverCreatorRoleAccess.test.ts");
    const merchantPayoutOwnerOps = source("src/test/merchantPayoutOwnerOpsAccess.test.ts");
    const adminModeration = source("src/test/adminModerationRoleAccess.test.ts");
    const adminSupportAccounts = source("src/test/adminSupportAccountRoleAccess.test.ts");

    expect(matrix).toContain("src/test/crossVerticalRoleNavigation.test.ts");
    expect(matrix).toContain("src/test/staffDriverCreatorRoleAccess.test.ts");
    expect(matrix).toContain("src/test/merchantPayoutOwnerOpsAccess.test.ts");
    expect(matrix).toContain("src/test/adminModerationRoleAccess.test.ts");
    expect(matrix).toContain("src/test/adminSupportAccountRoleAccess.test.ts");
    expect(matrix).toContain("tests/e2e/customer-booking-payment.spec.ts");
    expect(matrix).toContain("tests/e2e/shop-owner-dashboard-permissions.spec.ts");
    expect(matrix).toContain("tests/e2e/auth-sso-role-matrix.spec.ts");
    expect(matrix).toContain("npm run qa:customer-booking-contracts");
    expect(matrix).toContain("npm run qa:shop-owner-contracts");
    expect(matrix).toContain("npm run qa:client-staff-contracts");
    expect(matrix).toContain("npm run test -- src/test/roleWorkflowMatrix.test.ts src/test/crossVerticalRoleNavigation.test.ts src/test/staffDriverCreatorRoleAccess.test.ts src/test/merchantPayoutOwnerOpsAccess.test.ts src/test/adminModerationRoleAccess.test.ts src/test/adminSupportAccountRoleAccess.test.ts");
    expect(matrix).toContain("npx playwright test tests/e2e/customer-booking-payment.spec.ts tests/e2e/shop-owner-dashboard-permissions.spec.ts tests/e2e/staff-driver-creator-role-access.spec.ts");
    expect(matrix).toContain("Keep customer booking, shop owner, staff, driver, creator, support, and admin role workflows green.");
    expect(staffDriverCreator).toContain("staff driver creator role access");
    expect(merchantPayoutOwnerOps).toContain("merchant payout owner ops access");
    expect(adminModeration).toContain("admin moderation role access");
    expect(adminSupportAccounts).toContain("admin support account role access");
  });
});
