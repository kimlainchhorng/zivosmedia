import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const exportTables = [
  "profiles",
  "direct_messages",
  "group_messages",
  "chat_media",
  "chat_files",
  "call_recordings",
  "stories",
  "posts",
  "comments",
  "saved_locations",
  "trips",
  "bookings",
  "wallet_transactions",
  "customer_payout_methods",
  "user_devices",
  "trusted_devices",
  "user_consent_logs",
  "policy_consents",
  "role_terms_acceptance",
  "user_consents",
  "legal_disputes",
  "legal_audit_log",
];

describe("account export manifest", () => {
  it("keeps the server-side export manifest complete and audited", () => {
    const accountExport = read("supabase/functions/account-export/index.ts");

    expect(exportTables).toHaveLength(22);
    expect(accountExport).toContain("const USER_TABLES");
    expect(accountExport).toContain('format_version: "1.0"');
    expect(accountExport).toContain('exportData["auth_user"]');
    expect(accountExport).toContain("sb.auth.admin.getUserById(userId)");
    expect(accountExport).toContain('action:     "data_export"');
    expect(accountExport).toContain("requireAal2(claims)");
    expect(accountExport).toContain("strictCors: true");
    expect(accountExport).toContain('allowedMethods: ["POST"]');

    for (const table of exportTables) {
      expect(accountExport).toContain(`table: "${table}"`);
    }
  });

  it("keeps export UI and status copy aligned with the server manifest", () => {
    const exportPage = read("src/pages/account/AccountExportPage.tsx");
    const securityStatus = read("src/pages/SecurityStatus.tsx");

    expect(exportPage).toContain('functions.invoke("account-export")');
    expect(exportPage).toContain("Authoritative export (server-side)");
    expect(exportPage).toContain("Rights under GDPR & CCPA");
    expect(exportPage).toContain("compliance audit log");
    expect(exportPage).toContain("Re-authenticate with TOTP");
    expect(exportPage).toContain("zivo-account-export-");
    expect(securityStatus).toContain("22 user-owned tables plus auth user");
    expect(securityStatus).not.toContain("16 user-owned tables");
  });
});
