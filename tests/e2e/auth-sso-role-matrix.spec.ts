import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

const ROLE_MATRIX = [
  {
    role: "customer",
    routes: ['path="/app"', 'path="/account/security"', 'path="/account/sessions"'],
    guards: ["withRedirectParam", "supabase.auth.getSession()", "supabase.auth.onAuthStateChange"],
  },
  {
    role: "shop-owner",
    routes: ['path="/shop-dashboard"', 'path="/shop-dashboard/orders"', 'path="/admin/stores/:storeId"'],
    guards: ["allowStoreOwner", 'queryKey: ["protected-route-store-owner"', '.eq("owner_id", user!.id)'],
  },
  {
    role: "staff",
    routes: ['path="/personal-dashboard"', 'path="/shop-dashboard/employees"', 'path="/shop-dashboard/employee-schedule"'],
    guards: ["store-employee-manage", "store_employees", "store_employee_invites"],
  },
  {
    role: "driver",
    routes: ['path="/eats/driver-deliveries"', 'path="/driver/payouts"'],
    guards: ['.from("drivers")', "driverId", "customer-payout-method-record"],
  },
  {
    role: "admin",
    routes: ['path="/admin/analytics"', 'path="/admin/security"', 'path="/admin/support"'],
    guards: ["requireAdmin", "allowSupport", "<AccessDenied"],
  },
] as const;

test.describe("auth SSO role matrix", () => {
  test("keeps every major role mapped to protected routes and authorization signals", () => {
    const app = source("src/App.tsx");
    const authContext = source("src/contexts/AuthContext.tsx");
    const protectedRoute = source("src/components/auth/ProtectedRoute.tsx");
    const userAccess = source("src/hooks/useUserAccess.ts");
    const roleWorkflow = source("src/test/roleWorkflowMatrix.test.ts");
    const staffDriverCreator = source("src/test/staffDriverCreatorRoleAccess.test.ts");
    const roleGrants = source("supabase/migrations/20260531184042_role_workflow_data_api_grants.sql");

    const combined = [
      app,
      authContext,
      protectedRoute,
      userAccess,
      roleWorkflow,
      staffDriverCreator,
      roleGrants,
    ].join("\n");

    for (const { role, routes, guards } of ROLE_MATRIX) {
      for (const route of routes) {
        expect.soft(app, `${role} route ${route}`).toContain(route);
      }
      for (const guard of guards) {
        expect.soft(combined, `${role} guard ${guard}`).toContain(guard);
      }
    }

    expect(protectedRoute).toContain("requireAdmin && !isAdmin");
    expect(protectedRoute).toContain("supportAccessAllowed");
    expect(protectedRoute).toContain("ownerAccessAllowed");
    expect(userAccess).toContain('roles.includes("support")');
    expect(userAccess).toContain('roles.includes("moderator")');
    expect(userAccess).toContain('roles.includes("operations")');
    expect(app).not.toContain('path="/creator-dashboard"');
    expect(app).not.toContain('path="/creator-payouts"');
  });

  test("keeps SSO callback, saved-session restore, and role redirect logic aligned", () => {
    const login = source("src/pages/Login.tsx");
    const callback = source("src/pages/AuthCallback.tsx");
    const authContext = source("src/contexts/AuthContext.tsx");
    const serviceWorker = source("src/sw.js");

    for (const needle of [
      "signIn(trimmedEmail, password)",
      "signInWithOtp",
      "refreshSession({",
      "saveAccount",
    ]) {
      expect(login).toContain(needle);
    }

    for (const needle of [
      "exchangeCodeForSession(code)",
      "user.app_metadata?.provider",
      "isOAuthUser",
      "checkSetupAndNavigate(session.user)",
    ]) {
      expect(callback).toContain(needle);
    }

    expect(authContext).toContain("checkAdminRole(userId)");
    expect(authContext).toContain("resolveAdminRole(nextSession.user.id, revision)");
    expect(authContext).toContain("resolveAdminRole(restoredSession.user.id, revision)");
    expect(authContext).toContain('event === "SIGNED_IN"');
    expect(authContext).toContain("TOKEN_REFRESHED");
    expect(serviceWorker).toContain("Skip OAuth callback routes");
    expect(serviceWorker).toContain("url.pathname.startsWith('/~oauth')");
  });

  test("keeps role matrix coverage wired into the SSO and workflow readiness gates", () => {
    const ssoContracts = source("scripts/qa/sso-auth-contracts.mjs");
    const workflowPlan = source("scripts/qa/workflow-test-plan.mjs");
    const roleWorkflow = source("src/test/roleWorkflowMatrix.test.ts");

    expect(ssoContracts).toContain("auth-sso-role-matrix.spec.ts");
    expect(workflowPlan).toContain("tests/e2e/auth-sso-role-matrix.spec.ts");
    expect(roleWorkflow).toContain("tests/e2e/auth-sso-role-matrix.spec.ts");
  });
});
