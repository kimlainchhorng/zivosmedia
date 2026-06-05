import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("account deletion lifecycle", () => {
  it("keeps the in-app deletion request on a 30-day cancellable schedule", () => {
    const hook = read("src/hooks/useAccountDeletion.ts");
    const page = read("src/pages/profile/DeleteAccountPage.tsx");
    const tableMigration = read("supabase/migrations/20260203192852_f503ea1a-971b-4f8f-8ebf-861f14c05f84.sql");
    const rlsMigration = read("supabase/migrations/20260204143017_1e6880e3-e6f5-4416-b252-a17d588f896f.sql");

    expect(tableMigration).toContain("CREATE TABLE public.account_deletion_requests");
    expect(tableMigration).toContain("scheduled_for TIMESTAMPTZ NOT NULL");
    expect(tableMigration).toContain("CHECK (status IN ('pending', 'processing', 'completed', 'cancelled'))");
    expect(tableMigration).toContain("CREATE INDEX idx_deletion_requests_scheduled");
    expect(rlsMigration).toContain("ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY");
    expect(rlsMigration).toContain("Users can create their own deletion requests");
    expect(rlsMigration).toContain("Users can update their own deletion requests");

    expect(hook).toContain("addDays(new Date(), 30)");
    expect(hook).toContain(".from('account_deletion_requests')");
    expect(hook).toContain("status: 'pending'");
    expect(hook).toContain("status: 'cancelled'");
    expect(hook).toContain("cancelled_at: new Date().toISOString()");
    expect(page).toContain("30-day grace period");
    expect(page).toContain("Keep My Account");
    expect(page).toContain("past transactions are final");
  });

  it("keeps immediate hard deletion protected by AAL2 and explicit confirmation", () => {
    const deleteFunction = read("supabase/functions/account-delete-self/index.ts");
    const deletionInfo = read("src/pages/AccountDeletionInfo.tsx");

    expect(deleteFunction).toContain("GDPR Article 17");
    expect(deleteFunction).toContain("requireAal2(claims)");
    expect(deleteFunction).toContain('allowedMethods: ["POST"]');
    expect(deleteFunction).toContain('body.confirm !== "DELETE MY ACCOUNT"');
    expect(deleteFunction).toContain("const STORAGE_BUCKETS");
    expect(deleteFunction).toContain("const USER_OWNED_TABLES");
    expect(deleteFunction).toContain("cleanupErrors");
    expect(deleteFunction).toContain("sb.auth.admin.deleteUser(userId)");
    expect(deleteFunction).toContain('eventType:  "account.self_deleted"');
    expect(deleteFunction).toContain('action:     "account_deleted"');

    expect(deletionInfo).toContain("Delete from inside the app");
    expect(deletionInfo).toContain("Request deletion from the web");
    expect(deletionInfo).toContain("30-day grace period");
    expect(deletionInfo).toContain("privacy@zivosmedia.com");
    expect(deletionInfo).toContain("/legal/data-retention");
  });
});
