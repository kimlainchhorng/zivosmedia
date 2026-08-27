import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("staff and driver role access with retired creator monetization", () => {
  it("keeps staff, driver, and support routes protected while creator routes stay retired", () => {
    const app = read("src/App.tsx");
    const morePage = read("src/pages/MorePage.tsx");
    const appMore = read("src/pages/app/AppMore.tsx");
    const protectedRoute = read("src/components/auth/ProtectedRoute.tsx");

    for (const route of [
      'path="/shop-dashboard/employees" element={<ProtectedRoute><ShopEmployeesPage /></ProtectedRoute>}',
      'path="/shop-dashboard/employee-schedule" element={<ProtectedRoute><ShopEmployeeSchedulePage /></ProtectedRoute>}',
      'path="/shop-dashboard/employee-rules" element={<ProtectedRoute><ShopEmployeeRulesPage /></ProtectedRoute>}',
      'path="/eats/driver-deliveries" element={<ProtectedRoute><EatsDriverDeliveryPage /></ProtectedRoute>}',
      'path="/driver/payouts" element={<ProtectedRoute><DriverPayoutsPage /></ProtectedRoute>}',
      'path="/admin/employees" element={<ProtectedRoute requireAdmin={true} allowSupport={true}>',
      'path="/admin/support" element={<ProtectedRoute requireAdmin={true} allowSupport={true}>',
    ]) {
      expect(app).toContain(route);
    }

    for (const shortcut of [
      'label: "Employees", href: "/shop-dashboard/employees"',
      'label: "Employee Schedule", href: "/shop-dashboard/employee-schedule"',
      'label: "Employee Rules", href: "/shop-dashboard/employee-rules"',
      'label: "Driver Payouts", href: "/driver/payouts"',
      'label: "Eats Driver", href: "/eats/driver-deliveries"',
    ]) {
      expect(morePage + appMore).toContain(shortcut);
    }

    expect(protectedRoute).toContain("allowSupport");
    expect(protectedRoute).toContain("supportAccessAllowed");
    expect(protectedRoute).toContain("<AccessDenied");
    expect(app).not.toContain('path="/creator-dashboard"');
    expect(app).not.toContain('path="/creator-payouts"');
    expect(morePage + appMore).not.toContain('href: "/creator-dashboard"');
  });

  it("keeps role discovery deriving support, moderator, operations, driver, and store ownership", () => {
    const access = read("src/hooks/useUserAccess.ts");

    for (const flag of [
      "isDriver",
      "isStoreOwner",
      "isSupport",
      "isModerator",
      "isOperations",
      "driverId",
      "storeId",
    ]) {
      expect(access).toContain(flag);
    }

    expect(access).toContain('roles.includes("support")');
    expect(access).toContain('roles.includes("moderator")');
    expect(access).toContain('roles.includes("operations")');
    expect(access).toContain('.from("user_roles")');
    expect(access).toContain('.from("drivers")');
    expect(access).toContain('.from("store_profiles")');
    expect(access).toContain('.eq("owner_id", userId)');
  });

  it("keeps shop staff mutations behind owner/admin server authorization", () => {
    const employeesPage = read("src/pages/app/shop/ShopEmployeesPage.tsx");
    const employeeFunction = read("supabase/functions/store-employee-manage/index.ts");
    const employeeGate = read("supabase/migrations/20260601141500_store_employees_server_gate.sql");

    expect(employeesPage).toContain('supabase.functions.invoke("store-employee-manage"');
    expect(employeesPage).not.toMatch(/from\("store_employees"\)[\s\S]{0,220}\.(insert|update|delete|upsert)/);

    for (const needle of [
      'withSecurity("store-employee-manage"',
      'const ACTIONS = new Set(["save", "toggle_status", "delete", "link_self_by_email"])',
      'const ROLES = new Set(["owner", "manager", "supervisor", "cashier", "staff", "intern"])',
      "auth.getUser(token)",
      "canManageStore(admin, user.id, targetStoreId)",
      "Not authorized for this store",
      'admin.rpc("has_role"',
      '_role: "admin"',
      'trackNetwork: "suspicious"',
      "blockNetworkRiskAt: 80",
    ]) {
      expect(employeeFunction).toContain(needle);
    }

    expect(employeeGate).toContain("store_employees");
    expect(employeeGate).toContain("trusted server-side validation");
    expect(employeeGate).toContain("store-employee-manage");
  });

  it("keeps driver payouts protected and creator payout creation fail-closed", () => {
    const driverPayouts = read("src/pages/driver/DriverPayoutsPage.tsx");
    const customerPayoutMethod = read("supabase/functions/customer-payout-method-record/index.ts");
    const creatorPayout = read("supabase/functions/creator-payout-request/index.ts");

    for (const fn of [
      "driver-connect-status",
      "driver-connect-onboard",
      "customer-payout-method-record",
    ]) {
      expect(driverPayouts).toContain(`supabase.functions.invoke("${fn}"`);
    }

    for (const needle of [
      'withSecurity("customer-payout-method-record"',
      "enforceAal2(authHeader, corsHeaders)",
      'withIdempotency(req, "customer-payout-method-record", userId, execute)',
      "assertMethodOwner(supabase, userId, methodId)",
      "assertCanManageStore(supabase, userId, storeId)",
      'rateLimit: "admin_action"',
      "blockNetworkRiskAt: 85",
    ]) {
      expect(customerPayoutMethod).toContain(needle);
    }

    for (const needle of [
      'withSecurity("creator-payout-request"',
      "isCreatorMonetizationDisabled()",
      "creatorMonetizationBlockedResponse(corsHeaders)",
      'trackNetwork: "suspicious"',
      "blockNetworkRiskAt: 85",
    ]) {
      expect(creatorPayout).toContain(needle);
    }
  });
});
