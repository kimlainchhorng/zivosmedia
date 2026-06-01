import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

const fileExists = (relativePath: string) =>
  existsSync(path.join(root, relativePath));

const migrationText = () => {
  const migrationsDir = path.join(root, "supabase/migrations");

  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort()
    .map((name) => readFileSync(path.join(migrationsDir, name), "utf8"))
    .join("\n");
};

describe("legal, policy, compliance, and trust workflow", () => {
  it("keeps required legal routes mapped to policy pages", () => {
    const app = read("src/App.tsx");

    const requiredRoutes = [
      'path="/legal/terms"',
      'path="/legal/privacy"',
      'path="/legal/refunds"',
      'path="/legal/cancellation"',
      'path="/legal/do-not-sell"',
      'path="/legal/data-retention"',
      'path="/legal/security"',
      'path="/legal/vdp"',
      'path="/legal/*"',
    ];

    for (const route of requiredRoutes) {
      expect(app).toContain(route);
    }

    const requiredPages = [
      "src/pages/legal/TermsOfService.tsx",
      "src/pages/legal/PrivacyPolicy.tsx",
      "src/pages/legal/RefundPolicy.tsx",
      "src/pages/legal/CancellationPolicy.tsx",
      "src/pages/legal/DoNotSell.tsx",
      "src/pages/legal/DataRetentionPolicy.tsx",
      "src/pages/legal/SecurityPolicy.tsx",
      "src/pages/legal/VulnerabilityDisclosure.tsx",
      "src/pages/legal/GenericLegalPage.tsx",
    ];

    for (const page of requiredPages) {
      expect(fileExists(page), `${page} should exist`).toBe(true);
    }
  });

  it("links account data rights, legal, export, and deletion surfaces", () => {
    const accountSettings = read("src/pages/account/AccountSettingsPage.tsx");
    const privacySettings = read("src/pages/account/PrivacySettingsPage.tsx");
    const privacyControls = read("src/pages/account/PrivacyControls.tsx");
    const accountExport = read("src/pages/account/AccountExportPage.tsx");
    const deletionInfo = read("src/pages/AccountDeletionInfo.tsx");

    expect(accountSettings).toContain("/account/data-rights");
    expect(accountSettings).toContain("/account/legal");
    expect(accountSettings).toContain("/account/data-rights#cookies");

    expect(privacySettings).toContain("/account/data-rights");
    expect(privacySettings).toContain("/account/data-rights#cookies");

    expect(privacyControls).toContain("useRecordConsent");
    expect(privacyControls).toContain("useUserConsents");
    expect(privacyControls).toMatch(/access|download|delete/);

    expect(accountExport).toContain("GDPR");
    expect(accountExport).toContain("CCPA");
    expect(accountExport).toMatch(/json|csv|pdf/i);

    expect(deletionInfo).toMatch(/delete|deletion|account-delete-self/i);
  });

  it("has database-backed consent, policy acceptance, and audit evidence", () => {
    const migrations = migrationText();

    const requiredDatabaseEvidence = [
      "legal_policies",
      "user_consent_logs",
      "role_terms_acceptance",
      "user_consents",
      "policy_consents",
      "email_consents",
      "policy_consent",
      "policy_consent_version",
      "no_show_fee_consent_at",
    ];

    for (const evidence of requiredDatabaseEvidence) {
      expect(migrations).toContain(evidence);
    }

    expect(migrations).toMatch(
      /ALTER TABLE public\.user_consents ENABLE ROW LEVEL SECURITY/i,
    );
    expect(migrations).toMatch(
      /ALTER TABLE public\.policy_consents ENABLE ROW LEVEL SECURITY/i,
    );
  });

  it("passes booking policy consent from frontend payloads into backend records", () => {
    const bookingDrawer = read("src/components/lodging/LodgingBookingDrawer.tsx");
    const lodgeBookingRpc = read(
      "supabase/migrations/20260526184329_lodge_guest_booking_rpc.sql",
    );
    const noShowFeeMigration = read(
      "supabase/migrations/20260524420000_salon_no_show_fees.sql",
    );

    expect(bookingDrawer).toContain("policy_consent: policyConsent");
    expect(bookingDrawer).toContain(
      "policy_consent_version: policyConsentVersion",
    );

    expect(lodgeBookingRpc).toContain("p_payload -> 'policy_consent'");
    expect(lodgeBookingRpc).toContain(
      "p_payload ->> 'policy_consent_version'",
    );
    expect(lodgeBookingRpc).toMatch(/policy_consent,\s+policy_consent_version/i);

    expect(noShowFeeMigration).toContain("no_show_fee_consent_at");
    expect(noShowFeeMigration).toMatch(/audit trail/i);
  });

  it("keeps the standalone legal policy contract gate wired into platform audit", () => {
    const contractScript = read("scripts/qa/legal-policy-contracts.mjs");
    const coverageScript = read("scripts/qa/workflow-coverage.mjs");
    const matrixScript = read("scripts/qa/platform-readiness-matrix.mjs");
    const packageJson = read("package.json");

    for (const contractId of [
      "public-legal-route-surface",
      "policy-version-and-acceptance-evidence",
      "legal-acceptance-edge-allowlists",
      "legal-rls-and-data-api-grants",
      "privacy-export-and-delete-enforcement",
      "account-export-manifest",
      "account-deletion-lifecycle",
      "account-privacy-controls",
      "legal-hub-canonical-links",
      "public-legal-navigation-canonical-links",
      "checkout-legal-canonical-links",
      "account-deletion-data-rights-links",
      "travel-legal-canonical-links",
      "grocery-business-legal-canonical-links",
      "legal-policy-page-related-links",
      "support-flight-legal-canonical-links",
      "residual-public-legal-canonical-links",
      "legal-canonical-seo-urls",
      "privacy-request-intake-server-gate",
      "refund-support-trust-intake",
      "creator-monetization-legal-disclosure",
      "ads-marketing-privacy-disclosure",
      "ads-marketing-consent-runtime",
      "marketing-lead-privacy-intake",
      "age-eligibility-safety-disclosure",
      "ai-automated-decision-disclosure",
      "automated-legal-policy-hub",
      "data-rights-legal-policy-hub",
      "sensitive-data-legal-policy-hub",
      "booking-policy-consent-recording",
    ]) {
      expect(contractScript).toContain(contractId);
    }

    expect(coverageScript).toContain("qa:legal-policy-contracts");
    expect(matrixScript).toContain("npm run qa:legal-policy-contracts");
    expect(matrixScript).toContain("src/test/workflows/legal-policy-workflow.test.ts");
    expect(matrixScript).toContain("npx playwright test tests/e2e/refund-policy-flow.spec.ts");
    expect(matrixScript).toContain("export/delete rights, privacy intake");
    expect(packageJson).toContain('"qa:legal-policy-contracts"');
    expect(packageJson).toContain("npm run qa:legal-policy-contracts");
    expect(read("src/test/legalAcceptanceEdgeAllowlists.test.ts")).toContain("legal acceptance edge allowlists");
    expect(read("src/test/accountExportManifest.test.ts")).toContain("account export manifest");
    expect(read("src/test/accountDeletionLifecycle.test.ts")).toContain("account deletion lifecycle");
    expect(read("src/test/checkoutLegalCanonicalLinks.test.ts")).toContain("checkout legal canonical links");
    expect(read("src/test/accountDeletionDataRightsLinks.test.ts")).toContain("account deletion and data rights links");
    expect(read("src/test/travelLegalCanonicalLinks.test.ts")).toContain("travel legal canonical links");
    expect(read("src/test/groceryBusinessLegalCanonicalLinks.test.ts")).toContain("grocery and business legal canonical links");
    expect(read("src/test/legalPolicyPageRelatedLinks.test.ts")).toContain("legal policy page related links");
    expect(read("src/test/supportFlightLegalCanonicalLinks.test.ts")).toContain("support and flight legal canonical links");
    expect(read("src/test/residualPublicLegalCanonicalLinks.test.ts")).toContain("residual public legal canonical links");
    expect(read("src/test/legalCanonicalSeoUrls.test.ts")).toContain("legal canonical SEO URLs");
    expect(read("src/test/refundSupportTrustIntake.test.ts")).toContain("refund and support trust intake");
    expect(read("src/test/creatorMonetizationLegalDisclosure.test.ts")).toContain("creator monetization legal disclosure");
    expect(read("src/test/adsMarketingPrivacyDisclosure.test.ts")).toContain("ads marketing privacy disclosure");
    expect(read("src/test/adsMarketingConsentRuntime.test.ts")).toContain("ads marketing consent runtime");
    expect(read("src/test/marketingLeadPrivacyIntake.test.ts")).toContain("marketing lead privacy intake");
    expect(read("src/test/ageEligibilitySafetyDisclosure.test.ts")).toContain("age eligibility safety disclosure");
    expect(read("src/test/aiAutomatedDecisionDisclosure.test.ts")).toContain("AI automated decision disclosure");
    expect(read("src/test/automatedLegalPolicyHub.test.ts")).toContain("automated legal policy hub");
    expect(read("src/test/dataRightsLegalPolicyHub.test.ts")).toContain("data rights legal policy hub");
    expect(read("src/test/sensitiveDataLegalPolicyHub.test.ts")).toContain("sensitive data legal policy hub");
  });

  it("keeps privacy and legal intake routes POST-gated", () => {
    for (const route of [
      "privacy-request-submit",
      "legal-acceptance-record",
      "legal-dispute-file",
    ]) {
      const fn = read(`supabase/functions/${route}/index.ts`);
      expect(fn).toContain("withSecurity");
      expect(fn).toContain(`"${route}"`);
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('allowedMethods: ["POST"]');
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }
  });
});
