import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { serverGatedInvoke } from "./serverGatedInvoke";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("admin support account role access", () => {
  it("keeps support staff routes scoped and account operations behind privileged functions", () => {
    const app = source("src/App.tsx");
    const supportDashboard = source(
      "src/pages/admin/AdminSupportDashboard.tsx",
    );
    const userAccounts = source("src/pages/admin/AdminUserAccounts.tsx");
    const createUser = source("supabase/functions/admin-create-user/index.ts");
    const updateProfile = source(
      "supabase/functions/admin-update-profile/index.ts",
    );
    const deleteUser = source("supabase/functions/admin-delete-user/index.ts");
    const listUsers = source(
      "supabase/functions/admin-list-created-users/index.ts",
    );

    for (const [routePath, page] of [
      ["/admin/support", "AdminSupportDashboard"],
      ["/admin/user-accounts", "AdminUserAccounts"],
      ["/admin/employees", "AdminEmployeesPage"],
      ["/admin/god-view", "AdminGodView"],
    ]) {
      expect(app).toMatch(
        new RegExp(
          `<Route\\s+path="${routePath}"\\s+element=\\{\\s*<ProtectedRoute(?=[^>]*requireAdmin=\\{true\\})(?=[^>]*allowSupport=\\{true\\})[^>]*>\\s*<${page}\\s*\\/>\\s*<\\/ProtectedRoute>\\s*\\}\\s*\\/>`,
        ),
      );
    }

    expect(supportDashboard).toContain("useUserAccess(user?.id)");
    expect(supportDashboard).toContain("access?.isSupport || access?.isAdmin");
    expect(supportDashboard).toContain("enabled: isAuthorized");
    expect(supportDashboard).toContain('.from("ai_conversations")');
    expect(supportDashboard).toContain('.from("admin_security_alerts")');
    expect(supportDashboard).toContain('.from("account_activity_log")');

    for (const fn of [
      "admin-list-created-users",
      "admin-create-user",
      "admin-update-profile",
      "admin-delete-user",
      "admin-delete-user-post",
      "admin-create-user-post",
      "admin-post-comment",
    ]) {
      expect(userAccounts).toMatch(serverGatedInvoke(fn));
    }

    for (const fnSource of [createUser, updateProfile, deleteUser, listUsers]) {
      expect(fnSource).toContain("enforceAal2(authHeader, corsHeaders)");
      expect(fnSource).toContain('withSecurity("admin-');
      expect(fnSource).toContain(
        'const allowedRoles = ["admin", "super_admin", "support"]',
      );
      expect(fnSource).toContain('.from("user_roles")');
      expect(fnSource).toContain('.eq("user_id", caller.id)');
      expect(fnSource).toContain("Admin access required");
      expect(fnSource).toContain("blockNetworkRiskAt: 85");
    }

    for (const fnSource of [createUser, deleteUser, listUsers]) {
      expect(fnSource).toContain('rateLimit: "admin_action"');
    }
    expect(updateProfile).toContain('rateLimit: "upload"');

    expect(createUser).toContain("adminClient.auth.admin.createUser");
    expect(createUser).toContain('created_via: "admin_user_accounts"');
    expect(updateProfile).toContain("scanContentForLinks(bio)");
    expect(updateProfile).toContain("isLikelyMaliciousBot(req.headers)");
    expect(deleteUser).toContain("userId === caller.id");
    expect(deleteUser).toContain("adminClient.auth.admin.deleteUser(userId)");
    expect(listUsers).toContain("adminClient.auth.admin.listUsers");
  });
});
