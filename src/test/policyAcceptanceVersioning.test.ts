import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

const legalSchemaMigration = "supabase/migrations/20260203154042_08b8cf48-d541-4233-947f-fb572fdbce07.sql";
const legalRlsMigration = "supabase/migrations/20260203154129_83f7dd56-1556-4b57-a38f-812225923eb0.sql";
const policyVersionMigration = "supabase/migrations/20260203151534_5523d0a6-049c-4116-b10f-b4aa49688c97.sql";
const legalGrantMigration = "supabase/migrations/20260531183402_legal_policy_data_api_grants.sql";

describe("policy acceptance and versioning contracts", () => {
  it("keeps legal policy records versioned with user and role acceptance proof", () => {
    const schema = source(legalSchemaMigration);

    for (const tableName of [
      "legal_policies",
      "user_consent_logs",
      "role_terms",
      "role_terms_acceptance",
      "legal_audit_log",
    ]) {
      expect(schema).toContain(`CREATE TABLE IF NOT EXISTS public.${tableName}`);
    }

    expect(schema).toContain("UNIQUE(policy_type, version)");
    expect(schema).toContain("policy_version TEXT NOT NULL");
    expect(schema).toContain("consent_given BOOLEAN NOT NULL DEFAULT true");
    expect(schema).toContain("consent_method TEXT NOT NULL DEFAULT 'checkbox'");
    expect(schema).toContain("page_url TEXT");
    expect(schema).toContain("UNIQUE(user_id, role_type, terms_version)");
    expect(schema).toContain("metadata JSONB DEFAULT '{}'");
  });

  it("keeps RLS and helper functions tied to active policy versions", () => {
    const rls = source(legalRlsMigration);

    for (const tableName of [
      "legal_policies",
      "user_consent_logs",
      "role_terms",
      "role_terms_acceptance",
      "legal_audit_log",
    ]) {
      expect(rls).toMatch(new RegExp(`ALTER TABLE public\\.${tableName} ENABLE ROW LEVEL SECURITY`, "i"));
    }

    expect(rls).toContain('CREATE POLICY "ucl_user_read"');
    expect(rls).toContain('CREATE POLICY "ucl_user_insert"');
    expect(rls).toContain('CREATE POLICY "rta_user_read"');
    expect(rls).toContain('CREATE POLICY "rta_user_insert"');
    expect(rls).toContain('CREATE POLICY "lal_admin_read"');
    expect(rls).toContain("CREATE OR REPLACE FUNCTION public.has_accepted_policy");
    expect(rls).toContain("JOIN public.legal_policies lp");
    expect(rls).toContain("lp.is_active = true");
    expect(rls).toContain("CREATE OR REPLACE FUNCTION public.get_current_policy_version");
  });

  it("keeps current policy versions and revocable consents queryable by the app", () => {
    const migration = source(policyVersionMigration);
    const hook = source("src/hooks/usePolicyConsent.ts");
    const types = source("src/types/security.ts");

    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.policy_versions");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.policy_consents");
    expect(migration).toContain("UNIQUE(user_id, policy_type, policy_version)");
    expect(migration).toContain("revoked_at TIMESTAMPTZ");
    expect(migration).toContain("revoked_reason TEXT");
    expect(migration).toContain("CREATE OR REPLACE FUNCTION public.has_policy_consent");

    for (const policyType of ["terms", "privacy", "cookies", "seller_of_travel", "marketing", "data_sharing"]) {
      expect(migration).toContain(`'${policyType}'`);
      expect(types).toContain(`| '${policyType}'`);
    }

    expect(hook).toContain('queryKey: ["policy-versions"]');
    expect(hook).toContain('.from("policy_versions")');
    expect(hook).toContain('.from("policy_consents")');
    expect(hook).toContain(".is(\"revoked_at\", null)");
    expect(hook).toContain("usePendingConsents");
    expect(hook).toContain("useAcceptPolicy");
    expect(hook).toContain("useAcceptMultiplePolicies");
    expect(hook).toContain("useRevokeConsent");
  });

  it("keeps Data API grants explicit for legal and consent tables", () => {
    const grants = source(legalGrantMigration);

    expect(grants).toContain("grant usage on schema public to anon, authenticated");

    for (const tableName of ["legal_policies", "role_terms", "seller_of_travel_status", "policy_versions"]) {
      expect(grants).toContain(`grant select on table public.${tableName} to anon, authenticated;`);
    }

    for (const tableName of ["user_consent_logs", "role_terms_acceptance"]) {
      expect(grants).toContain(`grant select, insert on table public.${tableName} to authenticated;`);
    }

    expect(grants).toContain("grant select, insert, update on table public.policy_consents to authenticated;");
    expect(grants).toContain("grant select, insert, update on table public.user_consents to authenticated;");
    expect(grants).toContain("grant select, insert on table public.legal_disputes to authenticated;");
    expect(grants).toContain("grant insert on table public.legal_audit_log to authenticated;");

    for (const tableName of [
      "legal_policies",
      "user_consent_logs",
      "role_terms",
      "role_terms_acceptance",
      "seller_of_travel_status",
      "legal_disputes",
      "legal_audit_log",
      "policy_versions",
      "policy_consents",
      "user_consents",
    ]) {
      expect(grants).toContain(`grant all privileges on table public.${tableName} to service_role;`);
    }
  });

  it("keeps frontend legal controls writing acceptance evidence", () => {
    const legalCompliance = source("src/hooks/useLegalCompliance.ts");
    const acceptanceFn = source("supabase/functions/legal-acceptance-record/index.ts");
    const acceptanceGate = source("supabase/migrations/20260601014500_legal_acceptance_server_gate.sql");
    const disputeFn = source("supabase/functions/legal-dispute-file/index.ts");
    const disputeGate = source("supabase/migrations/20260601020000_legal_disputes_server_gate.sql");
    const privacyControls = source("src/pages/account/PrivacyControls.tsx");
    const consentLog = source("src/pages/ConsentLogPage.tsx");
    const legalAcknowledgment = source("src/components/legal/LegalAcknowledgment.tsx");

    expect(legalCompliance).toContain("useRecordConsent");
    expect(legalCompliance).toContain('functions.invoke("legal-acceptance-record"');
    expect(legalCompliance).toContain("policy_version: request.policyVersion");
    expect(legalCompliance).toContain("consent_method: \"checkbox\"");
    expect(legalCompliance).toContain("page_url: request.pageUrl || window.location.href");
    expect(legalCompliance).toContain("useAcceptRoleTerms");
    expect(legalCompliance).not.toMatch(/from\("user_consent_logs"\)[\s\S]{0,160}\.insert/);
    expect(legalCompliance).not.toMatch(/from\("role_terms_acceptance"\)[\s\S]{0,160}\.insert/);
    expect(acceptanceFn).toContain('withSecurity("legal-acceptance-record"');
    expect(acceptanceFn).toContain('from("user_consent_logs")');
    expect(acceptanceFn).toContain('from("role_terms_acceptance")');
    expect(acceptanceFn).toContain('from("legal_audit_log")');
    expect(acceptanceFn).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(acceptanceFn).toContain("strictCors: true");
    expect(acceptanceGate).toContain('DROP POLICY IF EXISTS "ucl_user_insert"');
    expect(acceptanceGate).toContain('DROP POLICY IF EXISTS "rta_user_insert"');
    expect(acceptanceGate).toContain("trusted server-side ingestion");
    expect(legalCompliance).toContain('functions.invoke("legal-dispute-file"');
    expect(legalCompliance).not.toMatch(/from\("legal_disputes"\)[\s\S]{0,160}\.insert/);
    expect(disputeFn).toContain('withSecurity("legal-dispute-file"');
    expect(disputeFn).toContain('from("legal_disputes")');
    expect(disputeFn).toContain('from("legal_audit_log")');
    expect(disputeFn).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(disputeFn).toContain('status: "open"');
    expect(disputeGate).toContain('DROP POLICY IF EXISTS "ld_user_insert"');
    expect(disputeGate).toContain("trusted server-side ingestion");

    expect(privacyControls).toContain("useRecordConsent");
    expect(privacyControls).toContain("useUserConsents");
    expect(consentLog).toContain("user_consent_logs");
    expect(consentLog).toContain("policy_version");
    expect(legalAcknowledgment).toContain("localStorage");
    expect(legalAcknowledgment).toContain("version");
    expect(legalAcknowledgment).toContain("accepted_at");
  });
});
