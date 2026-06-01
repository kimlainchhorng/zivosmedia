import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("legal trust intake contracts", () => {
  it("keeps privacy DSAR and consent-change requests server-gated", () => {
    const privacyControls = source("src/pages/account/PrivacyControls.tsx");
    const privacySubmit = source("supabase/functions/privacy-request-submit/index.ts");
    const privacyGate = source("supabase/migrations/20260601024500_privacy_requests_server_gate.sql");
    const legalContracts = source("scripts/qa/legal-policy-contracts.mjs");

    expect(privacyControls).toContain('functions.invoke("privacy-request-submit"');
    expect(privacyControls).toContain('kind: "dsar_request"');
    expect(privacyControls).toContain('kind: "consent_change"');
    expect(privacyControls).not.toMatch(/from\("feedback_submissions"\)\.insert/);

    for (const needle of [
      'withSecurity(\n    "privacy-request-submit"',
      "requireUser(req)",
      "requireUserNotBlocked(userId)",
      "getServiceRoleClient()",
      '.from("feedback_submissions")',
      'category: "dsar_request"',
      'category: "consent_change"',
      'action: "privacy_request_submitted"',
      'action: "consent_change_requested"',
      "REQUEST_TYPES",
      "CONSENT_TYPES",
      "blockNetworkRiskAt: 90",
    ]) {
      expect(privacySubmit).toContain(needle);
    }

    expect(privacyGate).toContain("AS RESTRICTIVE");
    expect(privacyGate).toContain("COALESCE(category, 'general') NOT IN ('dsar_request', 'consent_change')");
    expect(privacyGate).toContain("trusted server-side ingestion");
    expect(legalContracts).toContain("privacy-request-intake-server-gate");
  });

  it("keeps legal dispute filing bound to authenticated users and audit logs", () => {
    const legalHook = source("src/hooks/useLegalCompliance.ts");
    const disputeFunction = source("supabase/functions/legal-dispute-file/index.ts");
    const disputeGate = source("supabase/migrations/20260601020000_legal_disputes_server_gate.sql");

    expect(legalHook).toContain('functions.invoke("legal-dispute-file"');
    expect(legalHook).not.toMatch(/from\("legal_disputes"\)[\s\S]{0,160}\.insert/);

    for (const needle of [
      'withSecurity("legal-dispute-file"',
      "getAuthenticatedUser(req",
      "Authentication required",
      '.from("legal_disputes")',
      '.from("legal_audit_log")',
      'status: "open"',
      'action_type: "legal_dispute_filed"',
      "DISPUTE_TYPES",
      "SERVICE_TYPES",
      "PARTY_TYPES",
      "blockNetworkRiskAt: 80",
    ]) {
      expect(disputeFunction).toContain(needle);
    }

    expect(disputeGate).toContain("trusted server-side ingestion");
    expect(disputeGate).toContain("legal-dispute-file");
  });

  it("keeps vulnerability disclosure reports server-side and unspoofable", () => {
    const securityReportPage = source("src/pages/security/SecurityReport.tsx");
    const securityReportFunction = source("supabase/functions/security-report-submit/index.ts");
    const securityGate = source("supabase/migrations/20260601023000_security_reports_server_gate.sql");
    const vdpPage = source("src/pages/legal/VulnerabilityDisclosure.tsx");
    const securityPolicy = source("src/pages/legal/SecurityPolicy.tsx");

    expect(securityReportPage).toContain('functions.invoke("security-report-submit"');
    expect(securityReportPage).not.toMatch(/from\("feedback_submissions"\)\.insert/);

    for (const needle of [
      'withSecurity("security-report-submit"',
      '.from("feedback_submissions")',
      'category: "security_report"',
      "SEVERITIES",
      "blockNetworkRiskAt: 90",
    ]) {
      expect(securityReportFunction).toContain(needle);
    }

    expect(securityGate).toContain("trusted server-side ingestion");
    expect(securityGate).toContain("security-report-submit");
    expect(vdpPage).toContain('canonical" href="https://zivollc.com/legal/vdp"');
    expect(securityPolicy).toContain("security@hizivo.com");
    expect(securityPolicy).toContain("/legal/vdp");
  });
});
