import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = (file: string) => readFileSync(path.join(root, file), "utf8");

function expectAll(text: string, needles: readonly string[]) {
  for (const needle of needles) {
    expect(text).toContain(needle);
  }
}

test.describe("admin two-step required contract", () => {
  test("keeps admin routes behind role-aware ProtectedRoute gates", () => {
    const app = source("src/App.tsx");
    const protectedRoute = source("src/components/auth/ProtectedRoute.tsx");
    const userAccess = source("src/hooks/useUserAccess.ts");

    for (const route of [
      'path="/admin/analytics"',
      'path="/admin/security"',
      'path="/admin/support" element={<ProtectedRoute requireAdmin={true} allowSupport={true}>',
      'path="/admin/user-accounts" element={<ProtectedRoute requireAdmin={true} allowSupport={true}>',
      'path="/admin/moderation" element={<ProtectedRoute requireAdmin={true} allowSupport={true}>',
      'path="/admin/content-reports" element={<ProtectedRoute requireAdmin={true}>',
    ]) {
      expect(app).toContain(route);
    }

    expectAll(protectedRoute, [
      "requireAdmin && !isAdmin",
      "allowSupport",
      "supportAccessAllowed",
      "AccessDenied",
      "withRedirectParam",
    ]);
    expectAll(userAccess, [
      "get_my_user_access",
      "roles.includes(\"support\")",
      "roles.includes(\"moderator\")",
      "roles.includes(\"operations\")",
    ]);
  });

  test("keeps privileged admin Edge Functions requiring AAL2 step-up and admin rate limits", () => {
    const adminRoutes = [
      ["admin-create-user", "admin_action"],
      ["admin-delete-user", "admin_action"],
      ["admin-list-created-users", "admin_action"],
      ["admin-update-profile", "upload"],
      ["admin-delete-user-post", "admin_action"],
      ["admin-create-user-post", "upload"],
      ["admin-post-comment", "admin_action"],
      ["admin-moderate-message", "admin_action"],
      ["admin-moderation-review", "api_general"],
      ["admin-content-report-status", "api_general"],
    ] as const;

    for (const [route, rateLimit] of adminRoutes) {
      const text = source(`supabase/functions/${route}/index.ts`);
      expect(text).toContain(`withSecurity("${route}"`);
      expect(text).toContain("enforceAal2(authHeader, corsHeaders)");
      expect(text).toContain("strictCors: true");
      expect(text).toContain('allowedMethods: ["POST"]');
      expect(text).toContain(`rateLimit: "${rateLimit}"`);
      expect(text).toContain("blockNetworkRiskAt: 85");
      expect(text).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    const createUser = source("supabase/functions/admin-create-user/index.ts");
    const deleteUser = source("supabase/functions/admin-delete-user/index.ts");
    const moderation = source("supabase/functions/admin-moderation-review/index.ts");

    expectAll(createUser, [
      'const allowedRoles = ["admin", "super_admin", "support"]',
      '.from("user_roles")',
      "Admin access required",
      "adminClient.auth.admin.createUser",
    ]);
    expectAll(deleteUser, [
      'const allowedRoles = ["admin", "super_admin", "support"]',
      "userId === caller.id",
      "adminClient.auth.admin.deleteUser(userId)",
    ]);
    expectAll(moderation, [
      'admin.rpc("has_role", { _user_id: user.id, _role: "admin" })',
      '.from("content_moderation_queue")',
      '.from("moderation_actions").insert',
    ]);
  });

  test("keeps app MFA dialogs non-dismissible and sensitive client actions step-up aware", () => {
    const authContext = source("src/contexts/AuthContext.tsx");
    const mfaDialog = source("src/components/auth/MfaChallengeDialog.tsx");
    const stepUpHook = source("src/hooks/useStepUpMfa.tsx");
    const walletPage = source("src/pages/account/WalletPage.tsx");
    const securityStatus = source("src/pages/SecurityStatus.tsx");
    const aalCheck = source("supabase/functions/_shared/aalCheck.ts");

    expectAll(authContext, [
      "getMfaChallenge",
      "verifyMfaChallenge",
      "setMfaPending(challenge)",
    ]);
    expectAll(mfaDialog, [
      "Two-factor verification",
      "onInteractOutside={(e) => e.preventDefault()}",
      "await signOut()",
      "verifyMfa(code.trim())",
    ]);
    expectAll(stepUpHook, [
      "ensureAal2",
      "isAal2()",
      "startStepUpChallenge()",
      "verifyMfaChallenge",
      "onInteractOutside={(e) => e.preventDefault()}",
      "Two-factor authentication is not enabled",
    ]);
    expect(walletPage).toContain("useStepUpMfa");
    expect(walletPage).toContain("ensureAal2");
    expect(securityStatus).toContain("Step-up MFA hook for sensitive actions");
    expect(aalCheck).toContain("mfa_required");
  });

  test("keeps admin two-step coverage wired into SSO and readiness gates", () => {
    const matrix = source("scripts/qa/platform-readiness-matrix.mjs");
    const ssoContracts = source("scripts/qa/sso-auth-contracts.mjs");
    const authRoleMatrix = source("tests/e2e/auth-sso-role-matrix.spec.ts");
    const sessionRoles = source("tests/e2e/sso-session-roles.spec.ts");

    expect(matrix).toContain("tests/e2e/admin-two-step-required.spec.ts");
    expect(ssoContracts).toContain("tests/e2e/admin-two-step-required.spec.ts");
    expect(authRoleMatrix).toContain('path="/admin/security"');
    expect(sessionRoles).toContain("MfaChallengeDialog");
  });
});
