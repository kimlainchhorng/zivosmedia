import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("data rights legal policy hub", () => {
  it("keeps data rights legal hub links resolvable through the legal route surface", () => {
    const app = read("src/App.tsx");
    const legalHub = read("src/pages/account/LegalPoliciesPage.tsx");

    expect(app).toContain('path="/legal/*"');
    expect(legalHub).toContain('label: "Data Portability & Export", href: "/legal/data-portability"');
    expect(legalHub).toContain('label: "Right to Be Forgotten", href: "/legal/right-to-be-forgotten"');
    expect(legalHub).toContain('label: "Data Subject Access Request (DSAR)", href: "/legal/dsar"');
  });

  it("keeps data portability policy tied to authoritative account export", () => {
    const genericLegal = read("src/pages/legal/GenericLegalPage.tsx");
    const accountExport = read("src/pages/account/AccountExportPage.tsx");
    const exportFunction = read("supabase/functions/account-export/index.ts");

    expect(genericLegal).toContain('"/legal/data-portability"');
    expect(genericLegal).toContain("Portable Export Scope");
    expect(genericLegal).toContain("profile data, messages, media metadata");
    expect(genericLegal).toContain("wallet transactions, devices, consent records");
    expect(genericLegal).toContain("legal acceptance records");
    expect(genericLegal).toContain("account-export Edge Function");
    expect(genericLegal).toContain("requires re-authentication with TOTP");
    expect(genericLegal).toContain("GDPR Article 15 and CCPA portability evidence");
    expect(accountExport).toContain('functions.invoke("account-export")');
    expect(accountExport).toContain("Authoritative export (server-side)");
    expect(exportFunction).toContain("GDPR Article 15");
    expect(exportFunction).toContain('action:     "data_export"');
  });

  it("keeps right-to-be-forgotten policy tied to deletion lifecycle and retention limits", () => {
    const genericLegal = read("src/pages/legal/GenericLegalPage.tsx");
    const deletionInfo = read("src/pages/AccountDeletionInfo.tsx");
    const deleteFunction = read("supabase/functions/account-delete-self/index.ts");
    const retention = read("src/pages/legal/DataRetentionPolicy.tsx");

    expect(genericLegal).toContain('"/legal/right-to-be-forgotten"');
    expect(genericLegal).toContain("30-day grace period");
    expect(genericLegal).toContain("account-delete-self Edge Function");
    expect(genericLegal).toContain("confirmation phrase DELETE MY ACCOUNT");
    expect(genericLegal).toContain("deletes user-owned records where permitted");
    expect(genericLegal).toContain("legal, tax, fraud prevention, payment, dispute");
    expect(genericLegal).toContain("privacy@zivosmedia.com or support@zivosmedia.com");
    expect(deletionInfo).toContain("30-day grace period");
    expect(deletionInfo).toContain("/legal/data-retention");
    expect(deleteFunction).toContain("GDPR Article 17");
    expect(deleteFunction).toContain("requireAal2(claims)");
    expect(deleteFunction).toContain('body.confirm !== "DELETE MY ACCOUNT"');
    expect(retention).toContain("Data Deletion & Your Rights");
  });

  it("keeps DSAR policy tied to privacy request server gate and account controls", () => {
    const genericLegal = read("src/pages/legal/GenericLegalPage.tsx");
    const privacyControls = read("src/pages/account/PrivacyControls.tsx");
    const accountSecurity = read("src/pages/account/AccountSecurity.tsx");
    const privacySubmit = read("supabase/functions/privacy-request-submit/index.ts");
    const privacyGate = read("supabase/migrations/20260601024500_privacy_requests_server_gate.sql");

    expect(genericLegal).toContain('"/legal/dsar"');
    expect(genericLegal).toContain("access, download, correction, deletion");
    expect(genericLegal).toContain("opt-out of sale or sharing");
    expect(genericLegal).toContain("information about automated decisions affecting you");
    expect(genericLegal).toContain("privacy-request-submit Edge Function");
    expect(genericLegal).toContain("categorized as dsar_request or consent_change");
    expect(genericLegal).toContain("GDPR requests are generally handled within 30 days");
    expect(genericLegal).toContain("CCPA requests follow applicable legal timeframes");
    expect(genericLegal).toContain("privacy@zivosmedia.com");

    expect(privacyControls).toContain('functions.invoke("privacy-request-submit"');
    expect(privacyControls).toContain('kind: "dsar_request"');
    expect(privacyControls).toContain('kind: "consent_change"');
    expect(accountSecurity).toContain('functions.invoke("privacy-request-submit"');
    expect(privacySubmit).toContain('withSecurity(\n    "privacy-request-submit"');
    expect(privacySubmit).toContain('category: "dsar_request"');
    expect(privacySubmit).toContain('category: "consent_change"');
    expect(privacyGate).toContain("trusted server-side ingestion");
  });
});
