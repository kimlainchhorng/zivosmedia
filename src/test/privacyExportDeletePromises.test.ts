import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

describe("privacy export and account deletion promises", () => {
  it("keeps the server-side account export protected, audited, and legally complete", () => {
    const accountExport = source("supabase/functions/account-export/index.ts");

    expect(accountExport).toContain("GDPR Article 15");
    expect(accountExport).toContain("requireAal2(claims)");
    expect(accountExport).toContain('withSecurity(\n    "account-export"');
    expect(accountExport).toContain('strictCors: true');
    expect(accountExport).toContain('allowedMethods: ["POST"]');
    expect(accountExport).toContain('recordAudit({');
    expect(accountExport).toContain('action:     "data_export"');
    expect(accountExport).toContain('exportData["auth_user"]');

    for (const tableName of [
      "profiles",
      "direct_messages",
      "wallet_transactions",
      "user_devices",
      "trusted_devices",
      "user_consent_logs",
      "policy_consents",
      "role_terms_acceptance",
      "user_consents",
      "legal_disputes",
      "legal_audit_log",
    ]) {
      expect(accountExport).toContain(`table: "${tableName}"`);
    }
  });

  it("keeps self-service deletion protected and explicit for non-cascading privacy tables", () => {
    const accountDelete = source("supabase/functions/account-delete-self/index.ts");

    expect(accountDelete).toContain("GDPR Article 17");
    expect(accountDelete).toContain("requireAal2(claims)");
    expect(accountDelete).toContain('withSecurity(\n    "account-delete-self"');
    expect(accountDelete).toContain('strictCors: true');
    expect(accountDelete).toContain('allowedMethods: ["POST"]');
    expect(accountDelete).toContain('body.confirm !== "DELETE MY ACCOUNT"');
    expect(accountDelete).toContain("const USER_OWNED_TABLES");
    expect(accountDelete).toContain("cleanupErrors");
    expect(accountDelete).toContain("Account deletion cleanup failed");
    expect(accountDelete).toContain("sb.auth.admin.deleteUser(userId)");
    expect(accountDelete).toContain('eventType:  "account.self_deleted"');
    expect(accountDelete).toContain('action:     "account_deleted"');

    for (const tableName of [
      "user_consent_logs",
      "policy_consents",
      "role_terms_acceptance",
      "user_consents",
      "user_devices",
      "trusted_devices",
      "customer_payout_methods",
    ]) {
      expect(accountDelete).toContain(`table: "${tableName}"`);
    }
  });

  it("keeps privacy request and consent-change intake server-side", () => {
    const accountSecurity = source("src/pages/account/AccountSecurity.tsx");
    const privacyControls = source("src/pages/account/PrivacyControls.tsx");
    const privacySubmit = source("supabase/functions/privacy-request-submit/index.ts");
    const privacyGate = source("supabase/migrations/20260601024500_privacy_requests_server_gate.sql");
    const exportGate = source("supabase/migrations/20260601030000_data_export_request_server_gate.sql");

    expect(privacyControls).toContain('functions.invoke("privacy-request-submit"');
    expect(privacyControls).toContain('kind: "dsar_request"');
    expect(privacyControls).toContain('kind: "consent_change"');
    expect(privacyControls).not.toMatch(/from\("feedback_submissions"\)\.insert/);
    expect(accountSecurity).toContain('functions.invoke("privacy-request-submit"');
    expect(accountSecurity).toContain('request_type: "download"');
    expect(accountSecurity).not.toMatch(/from\("feedback_submissions"\)\.insert/);

    expect(privacySubmit).toContain('withSecurity(\n    "privacy-request-submit"');
    expect(privacySubmit).toContain("requireUser(req)");
    expect(privacySubmit).toContain("requireUserNotBlocked(userId)");
    expect(privacySubmit).toContain("getServiceRoleClient()");
    expect(privacySubmit).toContain('.from("feedback_submissions")');
    expect(privacySubmit).toContain('category: "dsar_request"');
    expect(privacySubmit).toContain('category: "consent_change"');
    expect(privacySubmit).toContain('recordAudit({');
    expect(privacySubmit).toContain('action: "privacy_request_submitted"');
    expect(privacySubmit).toContain('action: "consent_change_requested"');
    expect(privacySubmit).toContain("blockNetworkRiskAt: 90");

    expect(privacyGate).toContain('AS RESTRICTIVE');
    expect(privacyGate).toContain("COALESCE(category, 'general') NOT IN ('dsar_request', 'consent_change')");
    expect(privacyGate).toContain("trusted server-side ingestion");

    expect(exportGate).toContain('AS RESTRICTIVE');
    expect(exportGate).toContain("COALESCE(category, 'general') <> 'data_export_request'");
    expect(exportGate).toContain("trusted server-side ingestion");
  });

  it("keeps account UI surfaces connected to export, deletion, and retention disclosures", () => {
    const accountSettings = source("src/pages/account/AccountSettingsPage.tsx");
    const privacySettings = source("src/pages/account/PrivacySettingsPage.tsx");
    const accountExportPage = source("src/pages/account/AccountExportPage.tsx");
    const accountDeletionInfo = source("src/pages/AccountDeletionInfo.tsx");
    const dataRetention = source("src/pages/legal/DataRetentionPolicy.tsx");

    expect(accountSettings).toContain("/account/data-rights");
    expect(accountSettings).toContain("/account/legal");
    expect(privacySettings).toContain("/account/data-rights");

    expect(accountExportPage).toContain('functions.invoke("account-export")');
    expect(accountExportPage).toContain("Authoritative export (server-side)");
    expect(accountExportPage).toContain("GDPR & CCPA");
    expect(accountExportPage).toContain("compliance audit log");
    expect(accountExportPage).toContain("Re-authenticate with TOTP");

    expect(accountDeletionInfo).toContain("Delete Your ZIVO Account");
    expect(accountDeletionInfo).toContain("privacy@zivosmedia.com");
    expect(accountDeletionInfo).toContain("30-day grace period");
    expect(accountDeletionInfo).toMatch(/legal, tax, fraud prevention, payment, dispute, or\s+regulatory obligations/);
    expect(accountDeletionInfo).toContain("/legal/data-retention");

    expect(dataRetention).toContain("Consent & acceptance records");
    expect(dataRetention).toContain("7 years");
  });

  it("keeps legal consent tables grantable and protected by RLS", () => {
    const grants = source("supabase/migrations/20260531183402_legal_policy_data_api_grants.sql");
    const legalRls = source("supabase/migrations/20260203154129_83f7dd56-1556-4b57-a38f-812225923eb0.sql");
    const policyVersionMigration = source("supabase/migrations/20260203151534_5523d0a6-049c-4116-b10f-b4aa49688c97.sql");
    const userConsentsMigration = source("supabase/migrations/20260425214912_ee44c2d6-1039-43b3-9982-c515012cb92c.sql");

    expect(grants).toContain("grant select, insert on table public.user_consent_logs to authenticated;");
    expect(grants).toContain("grant select, insert on table public.role_terms_acceptance to authenticated;");
    expect(grants).toContain("grant select, insert, update on table public.policy_consents to authenticated;");
    expect(grants).toContain("grant all privileges on table public.user_consents to service_role;");

    expect(legalRls).toMatch(/ALTER TABLE public\.user_consent_logs ENABLE ROW LEVEL SECURITY/i);
    expect(legalRls).toMatch(/ALTER TABLE public\.role_terms_acceptance ENABLE ROW LEVEL SECURITY/i);
    expect(policyVersionMigration).toMatch(/ALTER TABLE public\.policy_consents ENABLE ROW LEVEL SECURITY/i);
    expect(userConsentsMigration).toMatch(/ALTER TABLE public\.user_consents ENABLE ROW LEVEL SECURITY/i);
  });
});
