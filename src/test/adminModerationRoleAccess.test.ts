import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("admin moderation role access", () => {
  it("keeps moderation review routes role-scoped and review actions server-gated", () => {
    const app = source("src/App.tsx");
    const moderationPage = source("src/pages/AdminModerationPage.tsx");
    const contentReportsPage = source("src/pages/AdminContentReportsPage.tsx");
    const moderationFunction = source("supabase/functions/admin-moderation-review/index.ts");
    const reportsFunction = source("supabase/functions/admin-content-report-status/index.ts");
    const moderationGate = source("supabase/migrations/20260601063000_admin_moderation_review_server_gate.sql");
    const reportsGate = source("supabase/migrations/20260601064500_admin_content_reports_status_server_gate.sql");

    expect(app).toContain('path="/admin/moderation" element={<ProtectedRoute requireAdmin={true} allowSupport={true}>');
    expect(app).toContain('path="/admin/moderation/messages" element={<ProtectedRoute requireAdmin={true} allowSupport={true}>');
    expect(app).toContain('path="/admin/content-reports" element={<ProtectedRoute requireAdmin={true}>');

    expect(moderationPage).toContain('.from("content_moderation_queue")');
    expect(moderationPage).toContain('supabase.functions.invoke("admin-moderation-review"');
    expect(moderationPage).not.toContain('.from("content_moderation_queue")\n    .update');
    expect(contentReportsPage).toContain('.from("content_reports")');
    expect(contentReportsPage).toContain('supabase.functions.invoke("admin-content-report-status"');

    expect(moderationFunction).toContain('withSecurity("admin-moderation-review"');
    expect(moderationFunction).toContain('allowedMethods: ["POST"]');
    expect(moderationFunction).toContain("enforceAal2(authHeader, corsHeaders)");
    expect(moderationFunction).toContain('admin.rpc("has_role", { _user_id: user.id, _role: "admin" })');
    expect(moderationFunction).toContain('.from("content_moderation_queue")');
    expect(moderationFunction).toContain('.from("moderation_actions").insert');
    expect(moderationFunction).toContain("applyTargetVisibility");
    expect(moderationFunction).toContain('rateLimit: "api_general"');
    expect(moderationFunction).toContain("blockNetworkRiskAt: 85");

    expect(reportsFunction).toContain('withSecurity("admin-content-report-status"');
    expect(reportsFunction).toContain('allowedMethods: ["POST"]');
    expect(reportsFunction).toContain("enforceAal2(authHeader, corsHeaders)");
    expect(reportsFunction).toContain('admin.rpc("has_role", { _user_id: user.id, _role: "admin" })');
    expect(reportsFunction).toContain('.from("content_reports")');
    expect(reportsFunction).toContain(".update(patch)");
    expect(reportsFunction).toContain("reviewed_by: user.id");

    expect(moderationGate).toContain("content_moderation_queue_block_direct_update");
    expect(moderationGate).toContain("moderation_actions_block_direct_insert");
    expect(moderationGate).toContain("AS RESTRICTIVE");
    expect(moderationGate).toContain("trusted server-side ingestion");
    expect(reportsGate).toContain("content_reports_block_direct_update");
    expect(reportsGate).toContain("AS RESTRICTIVE");
    expect(reportsGate).toContain("trusted server-side ingestion");
  });
});
