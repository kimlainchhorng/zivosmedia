import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test.describe("staff, driver, admin, and retired creator access contracts", () => {
  test("supported role dashboards stay mounted while creator routes stay retired", async () => {
    const app = read("src/App.tsx");
    const guard = read("src/components/auth/ProtectedRoute.tsx");
    const access = read("src/hooks/useUserAccess.ts");

    for (const route of [
      'path="/personal-dashboard"',
      'path="/shop-dashboard"',
      'path="/shop-dashboard/employees"',
      'path="/shop-dashboard/payroll"',
      'path="/shop-dashboard/employee-schedule"',
      'path="/shop-dashboard/training"',
      'path="/shop-dashboard/documents"',
      'path="/eats/driver-deliveries"',
      'path="/driver/payouts"',
      'path="/admin/support"',
      'path="/admin/stores/:storeId"',
      'path="/admin/user-accounts"',
    ]) {
      expect(app).toContain(route);
    }

    expect(app).not.toContain('path="/creator-dashboard"');
    expect(app).not.toContain('path="/creator-payouts"');

    expect(app).toContain('path="/admin/support" element={<ProtectedRoute requireAdmin={true} allowSupport={true}>');
    expect(app).toContain('path="/admin/stores/:storeId" element={<ProtectedRoute requireAdmin={true} allowStoreOwner={true}>');
    expect(app).toContain('path="/admin/user-accounts" element={<ProtectedRoute requireAdmin={true} allowSupport={true}>');

    for (const needle of [
      "requireAdmin && !isAdmin",
      "allowStoreOwner",
      "allowSupport",
      "useUserAccess(user?.id)",
      "AccessDenied",
      "withRedirectParam",
      'queryKey: ["protected-route-store-owner", user?.id, storeId]',
      '.from("store_profiles")',
      '.eq("owner_id", user!.id)',
    ]) {
      expect(guard).toContain(needle);
    }

    for (const role of [
      "isAdmin",
      "isDriver",
      "isStoreOwner",
      "isSupport",
      "isModerator",
      "isOperations",
      "driverId",
      "storeId",
    ]) {
      expect(access).toContain(role);
    }
    expect(access).toContain('rpc("get_my_user_access")');
    expect(access).toContain('.from("user_roles")');
    expect(access).toContain('.from("drivers")');
    expect(access).toContain('.from("store_profiles")');
  });

  test("staff tools are scoped to store ownership, invites, schedules, payroll, rules, and training", async () => {
    const staffContracts = read("scripts/qa/client-staff-contracts.mjs");
    const appMore = read("src/pages/app/AppMore.tsx");
    const shopDashboard = read("src/pages/app/ShopDashboard.tsx");
    const employeeSection = read("src/components/admin/store/StoreEmployeesSection.tsx");

    for (const contractId of [
      "employee-invite-acceptance",
      "owner-only-employee-invites",
      "staff-schedule-read-owner-write",
      "payroll-rules-role-boundaries",
      "training-rules-workspace-scoping",
      "salon-client-owner-user-scoping",
    ]) {
      expect(staffContracts).toContain(contractId);
    }

    for (const href of [
      "/shop-dashboard/employees",
      "/shop-dashboard/payroll",
      "/shop-dashboard/employee-schedule",
      "/shop-dashboard/time-clock",
      "/shop-dashboard/employee-rules",
      "/shop-dashboard/training",
      "/shop-dashboard/documents",
    ]) {
      expect(appMore + shopDashboard).toContain(href);
    }

    expect(employeeSection).toContain("send-employee-email-invite");
    expect(employeeSection).toContain("send-employee-sms-invite");
    expect(employeeSection).toContain("store_employees");
  });

  test("driver payouts stay server-gated and creator payout creation fails closed", async () => {
    const driverPayouts = read("src/pages/driver/DriverPayoutsPage.tsx");
    const app = read("src/App.tsx");
    const creatorPayout = read("supabase/functions/creator-payout-request/index.ts");
    const driverResolve = read("supabase/functions/resolve-driver-earning-payout/index.ts");
    const morePage = read("src/pages/MorePage.tsx");

    for (const fn of ["driver-connect-status", "driver-connect-onboard"]) {
      expect(driverPayouts).toContain(`supabase.functions.invoke("${fn}"`);
    }
    expect(driverPayouts).toMatch(
      /invokeSensitive(?:<[^>]+>)?\(\s*"customer-payout-method-record"/,
    );
    expect(driverPayouts).not.toMatch(/from\("driver_earnings"\)[\s\S]{0,200}\.(insert|update|delete)/);

    expect(app).not.toContain('path="/creator-dashboard"');
    expect(app).not.toContain('path="/creator-payouts"');
    expect(creatorPayout).toContain('withSecurity("creator-payout-request"');
    expect(creatorPayout).toContain("isCreatorMonetizationDisabled()");
    expect(creatorPayout).toContain("creatorMonetizationBlockedResponse(corsHeaders)");
    expect(driverResolve).toContain('withSecurity("resolve-driver-earning-payout"');
    expect(driverResolve).toContain('admin.rpc("has_role"');
    expect(driverResolve).toContain('admin.from("admin_driver_actions").insert');

    expect(morePage).not.toContain('href: "/creator-dashboard"');
    expect(morePage).toContain('label: "Driver Payouts", href: "/driver/payouts"');
    expect(morePage).toContain('label: "Eats Driver", href: "/eats/driver-deliveries"');
  });

  test("role workflow audit points to concrete contract files", async () => {
    const matrix = read("scripts/qa/platform-readiness-matrix.mjs");
    const workflowCoverage = read("scripts/qa/workflow-coverage.mjs");
    const roleMatrix = read("src/test/roleWorkflowMatrix.test.ts");

    for (const target of [
      "src/test/roleWorkflowMatrix.test.ts",
      "tests/e2e/staff-driver-creator-role-access.spec.ts",
      "tests/e2e/customer-booking-payment.spec.ts",
      "tests/e2e/shop-owner-dashboard-permissions.spec.ts",
    ]) {
      expect(matrix).toContain(target);
    }

    for (const command of [
      "qa:customer-booking-contracts",
      "qa:shop-owner-contracts",
      "qa:client-staff-contracts",
      "qa:payouts-earnings-contracts",
    ]) {
      expect(workflowCoverage + roleMatrix).toContain(command);
    }
  });
});
