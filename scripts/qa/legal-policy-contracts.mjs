#!/usr/bin/env node
/**
 * Legal/policy contract check.
 *
 * Verifies that public legal promises are connected to enforceable app/backend
 * surfaces: legal pages, consent/version tables, RLS/grants, export/delete
 * functions, and account privacy controls.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function source(relativePath) {
  const file = path.join(root, relativePath);
  if (!existsSync(file)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  return readFileSync(file, "utf8");
}

function requireContains(id, text, needle, relativePath) {
  if (!text.includes(needle)) {
    failures.push(`${id}: ${relativePath} missing ${JSON.stringify(needle)}`);
  }
}

function requireMatch(id, text, pattern, relativePath) {
  if (!pattern.test(text)) {
    failures.push(`${id}: ${relativePath} missing pattern ${pattern}`);
  }
}

function requireNotMatch(id, text, pattern, relativePath) {
  if (pattern.test(text)) {
    failures.push(`${id}: ${relativePath} must not match pattern ${pattern}`);
  }
}

const contracts = [
  {
    id: "public-legal-route-surface",
    category: "frontend",
    check() {
      const appPath = "src/App.tsx";
      const app = source(appPath);
      for (const route of [
        'path="/legal/terms"',
        'path="/legal/privacy"',
        'path="/legal/refunds"',
        'path="/legal/cancellation"',
        'path="/legal/do-not-sell"',
        'path="/legal/data-retention"',
        'path="/legal/security"',
        'path="/legal/vdp"',
      ]) {
        requireContains(this.id, app, route, appPath);
      }
      for (const page of [
        "src/pages/legal/TermsOfService.tsx",
        "src/pages/legal/PrivacyPolicy.tsx",
        "src/pages/legal/RefundPolicy.tsx",
        "src/pages/legal/CancellationPolicy.tsx",
        "src/pages/legal/DoNotSell.tsx",
        "src/pages/legal/DataRetentionPolicy.tsx",
        "src/pages/legal/SecurityPolicy.tsx",
        "src/pages/legal/VulnerabilityDisclosure.tsx",
      ]) {
        source(page);
      }
    },
  },
  {
    id: "policy-version-and-acceptance-evidence",
    category: "database",
    check() {
      const schemaPath = "supabase/migrations/20260203154042_08b8cf48-d541-4233-947f-fb572fdbce07.sql";
      const policyVersionPath = "supabase/migrations/20260203151534_5523d0a6-049c-4116-b10f-b4aa49688c97.sql";
      const legalHookPath = "src/hooks/useLegalCompliance.ts";
      const policyHookPath = "src/hooks/usePolicyConsent.ts";
      const acceptanceFunctionPath = "supabase/functions/legal-acceptance-record/index.ts";
      const schema = source(schemaPath);
      const policyVersion = source(policyVersionPath);
      const legalHook = source(legalHookPath);
      const policyHook = source(policyHookPath);
      const acceptanceFunction = source(acceptanceFunctionPath);
      for (const tableName of [
        "legal_policies",
        "user_consent_logs",
        "role_terms",
        "role_terms_acceptance",
        "legal_audit_log",
      ]) {
        requireContains(this.id, schema, `CREATE TABLE IF NOT EXISTS public.${tableName}`, schemaPath);
      }
      requireContains(this.id, schema, "UNIQUE(policy_type, version)", schemaPath);
      requireContains(this.id, schema, "policy_version TEXT NOT NULL", schemaPath);
      requireContains(this.id, policyVersion, "CREATE TABLE IF NOT EXISTS public.policy_versions", policyVersionPath);
      requireContains(this.id, policyVersion, "CREATE TABLE IF NOT EXISTS public.policy_consents", policyVersionPath);
      requireContains(this.id, policyVersion, "UNIQUE(user_id, policy_type, policy_version)", policyVersionPath);
      for (const policyType of ["terms", "privacy", "cookies", "seller_of_travel", "marketing", "data_sharing"]) {
        requireContains(this.id, policyVersion, `'${policyType}'`, policyVersionPath);
      }
      requireContains(this.id, legalHook, 'functions.invoke("legal-acceptance-record"', legalHookPath);
      requireContains(this.id, legalHook, "policy_version: request.policyVersion", legalHookPath);
      requireContains(this.id, legalHook, "consent_method: \"checkbox\"", legalHookPath);
      requireContains(this.id, acceptanceFunction, 'withSecurity("legal-acceptance-record"', acceptanceFunctionPath);
      requireContains(this.id, acceptanceFunction, 'from("user_consent_logs")', acceptanceFunctionPath);
      requireContains(this.id, acceptanceFunction, 'from("role_terms_acceptance")', acceptanceFunctionPath);
      requireContains(this.id, acceptanceFunction, 'from("legal_audit_log")', acceptanceFunctionPath);
      requireContains(this.id, policyHook, "useAcceptPolicy", policyHookPath);
      requireContains(this.id, policyHook, "useRevokeConsent", policyHookPath);
    },
  },
  {
    id: "legal-acceptance-edge-allowlists",
    category: "frontend-backend",
    check() {
      const edgePath = "supabase/functions/legal-acceptance-record/index.ts";
      const typePath = "src/types/legal.ts";
      const hookPath = "src/hooks/useLegalCompliance.ts";
      const testPath = "src/test/legalAcceptanceEdgeAllowlists.test.ts";
      const edge = source(edgePath);
      const types = source(typePath);
      const hook = source(hookPath);
      const test = source(testPath);

      for (const policyType of [
        "terms",
        "privacy",
        "refunds",
        "cancellation",
        "seller_of_travel",
        "transportation",
        "car_rental",
        "insurance",
        "cookies",
        "marketing",
      ]) {
        requireContains(this.id, edge, `"${policyType}"`, edgePath);
        requireContains(this.id, types, `| '${policyType}'`, typePath);
      }
      for (const roleType of [
        "customer",
        "driver",
        "car_owner",
        "fleet_owner",
        "restaurant_partner",
        "shop_owner",
        "creator",
        "merchant",
        "admin",
      ]) {
        requireContains(this.id, edge, `"${roleType}"`, edgePath);
        requireContains(this.id, types, `| '${roleType}'`, typePath);
      }

      requireContains(this.id, edge, "Authentication required", edgePath);
      requireContains(this.id, edge, "getAuthenticatedUser(req", edgePath);
      requireContains(this.id, edge, "cleanEnum(body.policy_type, POLICY_TYPES)", edgePath);
      requireContains(this.id, edge, "cleanEnum(body.role_type, ROLE_TYPES)", edgePath);
      requireContains(this.id, edge, "cleanText(body.page_url, MAX_URL)", edgePath);
      requireContains(this.id, edge, "cleanUuid(body.role_terms_id)", edgePath);
      requireContains(this.id, edge, "policy_consent_recorded", edgePath);
      requireContains(this.id, edge, "role_terms_accepted", edgePath);
      requireContains(this.id, edge, "strictCors: true", edgePath);
      requireContains(this.id, hook, 'functions.invoke("legal-acceptance-record"', hookPath);
      requireNotMatch(this.id, hook, /from\("user_consent_logs"\)[\s\S]{0,160}\.insert/, hookPath);
      requireNotMatch(this.id, hook, /from\("role_terms_acceptance"\)[\s\S]{0,160}\.insert/, hookPath);
      requireContains(this.id, test, "legal acceptance edge allowlists", testPath);
    },
  },
  {
    id: "legal-rls-and-data-api-grants",
    category: "database",
    check() {
      const rlsPath = "supabase/migrations/20260203154129_83f7dd56-1556-4b57-a38f-812225923eb0.sql";
      const grantsPath = "supabase/migrations/20260531183402_legal_policy_data_api_grants.sql";
      const policyVersionPath = "supabase/migrations/20260203151534_5523d0a6-049c-4116-b10f-b4aa49688c97.sql";
      const userConsentsPath = "supabase/migrations/20260425214912_ee44c2d6-1039-43b3-9982-c515012cb92c.sql";
      const rls = source(rlsPath);
      const grants = source(grantsPath);
      const policyVersion = source(policyVersionPath);
      const userConsents = source(userConsentsPath);
      for (const tableName of [
        "legal_policies",
        "user_consent_logs",
        "role_terms",
        "role_terms_acceptance",
        "legal_audit_log",
      ]) {
        requireMatch(this.id, rls, new RegExp(`ALTER TABLE public\\.${tableName} ENABLE ROW LEVEL SECURITY`, "i"), rlsPath);
      }
      requireMatch(this.id, policyVersion, /ALTER TABLE public\.policy_consents ENABLE ROW LEVEL SECURITY/i, policyVersionPath);
      requireMatch(this.id, userConsents, /ALTER TABLE public\.user_consents ENABLE ROW LEVEL SECURITY/i, userConsentsPath);
      requireContains(this.id, grants, "grant usage on schema public to anon, authenticated", grantsPath);
      requireContains(this.id, grants, "grant select, insert on table public.user_consent_logs to authenticated;", grantsPath);
      requireContains(this.id, grants, "grant select, insert on table public.role_terms_acceptance to authenticated;", grantsPath);
      requireContains(this.id, grants, "grant select, insert, update on table public.policy_consents to authenticated;", grantsPath);
      requireContains(this.id, grants, "grant all privileges on table public.legal_audit_log to service_role;", grantsPath);
    },
  },
  {
    id: "privacy-export-and-delete-enforcement",
    category: "backend",
    check() {
      const exportPath = "supabase/functions/account-export/index.ts";
      const deletePath = "supabase/functions/account-delete-self/index.ts";
      const accountExport = source(exportPath);
      const accountDelete = source(deletePath);
      requireContains(this.id, accountExport, "GDPR Article 15", exportPath);
      requireContains(this.id, accountExport, "requireAal2(claims)", exportPath);
      requireContains(this.id, accountExport, 'allowedMethods: ["POST"]', exportPath);
      requireContains(this.id, accountExport, "recordAudit({", exportPath);
      requireContains(this.id, accountExport, 'action:     "data_export"', exportPath);
      for (const tableName of ["user_consent_logs", "policy_consents", "role_terms_acceptance", "user_consents", "legal_disputes", "legal_audit_log"]) {
        requireContains(this.id, accountExport, `table: "${tableName}"`, exportPath);
      }
      requireContains(this.id, accountDelete, "GDPR Article 17", deletePath);
      requireContains(this.id, accountDelete, "requireAal2(claims)", deletePath);
      requireContains(this.id, accountDelete, 'allowedMethods: ["POST"]', deletePath);
      requireContains(this.id, accountDelete, 'body.confirm !== "DELETE MY ACCOUNT"', deletePath);
      requireContains(this.id, accountDelete, "sb.auth.admin.deleteUser(userId)", deletePath);
      requireContains(this.id, accountDelete, 'eventType:  "account.self_deleted"', deletePath);
      requireContains(this.id, accountDelete, 'action:     "account_deleted"', deletePath);
    },
  },
  {
    id: "account-export-manifest",
    category: "frontend-backend",
    check() {
      const exportPath = "supabase/functions/account-export/index.ts";
      const exportPagePath = "src/pages/account/AccountExportPage.tsx";
      const securityStatusPath = "src/pages/SecurityStatus.tsx";
      const testPath = "src/test/accountExportManifest.test.ts";
      const accountExport = source(exportPath);
      const exportPage = source(exportPagePath);
      const securityStatus = source(securityStatusPath);
      const test = source(testPath);

      for (const tableName of [
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
      ]) {
        requireContains(this.id, accountExport, `table: "${tableName}"`, exportPath);
      }

      requireContains(this.id, accountExport, 'format_version: "1.0"', exportPath);
      requireContains(this.id, accountExport, 'exportData["auth_user"]', exportPath);
      requireContains(this.id, accountExport, "sb.auth.admin.getUserById(userId)", exportPath);
      requireContains(this.id, accountExport, 'action:     "data_export"', exportPath);
      requireContains(this.id, accountExport, "requireAal2(claims)", exportPath);
      requireContains(this.id, accountExport, 'allowedMethods: ["POST"]', exportPath);
      requireContains(this.id, exportPage, 'functions.invoke("account-export")', exportPagePath);
      requireContains(this.id, exportPage, "Rights under GDPR & CCPA", exportPagePath);
      requireContains(this.id, exportPage, "Re-authenticate with TOTP", exportPagePath);
      requireContains(this.id, exportPage, "zivo-account-export-", exportPagePath);
      requireContains(this.id, securityStatus, "22 user-owned tables plus auth user", securityStatusPath);
      requireNotMatch(this.id, securityStatus, /16 user-owned tables/, securityStatusPath);
      requireContains(this.id, test, "account export manifest", testPath);
    },
  },
  {
    id: "account-deletion-lifecycle",
    category: "frontend-backend",
    check() {
      const hookPath = "src/hooks/useAccountDeletion.ts";
      const pagePath = "src/pages/profile/DeleteAccountPage.tsx";
      const infoPath = "src/pages/AccountDeletionInfo.tsx";
      const tableMigrationPath = "supabase/migrations/20260203192852_f503ea1a-971b-4f8f-8ebf-861f14c05f84.sql";
      const rlsMigrationPath = "supabase/migrations/20260204143017_1e6880e3-e6f5-4416-b252-a17d588f896f.sql";
      const deleteFunctionPath = "supabase/functions/account-delete-self/index.ts";
      const testPath = "src/test/accountDeletionLifecycle.test.ts";
      const hook = source(hookPath);
      const page = source(pagePath);
      const info = source(infoPath);
      const tableMigration = source(tableMigrationPath);
      const rlsMigration = source(rlsMigrationPath);
      const deleteFunction = source(deleteFunctionPath);
      const test = source(testPath);

      requireContains(this.id, tableMigration, "CREATE TABLE public.account_deletion_requests", tableMigrationPath);
      requireContains(this.id, tableMigration, "scheduled_for TIMESTAMPTZ NOT NULL", tableMigrationPath);
      requireContains(this.id, tableMigration, "CHECK (status IN ('pending', 'processing', 'completed', 'cancelled'))", tableMigrationPath);
      requireContains(this.id, tableMigration, "CREATE INDEX idx_deletion_requests_scheduled", tableMigrationPath);
      requireContains(this.id, rlsMigration, "ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY", rlsMigrationPath);
      requireContains(this.id, rlsMigration, "Users can create their own deletion requests", rlsMigrationPath);
      requireContains(this.id, rlsMigration, "Users can update their own deletion requests", rlsMigrationPath);
      requireContains(this.id, hook, "addDays(new Date(), 30)", hookPath);
      requireContains(this.id, hook, ".from('account_deletion_requests')", hookPath);
      requireContains(this.id, hook, "status: 'pending'", hookPath);
      requireContains(this.id, hook, "status: 'cancelled'", hookPath);
      requireContains(this.id, hook, "cancelled_at: new Date().toISOString()", hookPath);
      requireContains(this.id, page, "30-day grace period", pagePath);
      requireContains(this.id, page, "Keep My Account", pagePath);
      requireContains(this.id, page, "past transactions are final", pagePath);
      requireContains(this.id, deleteFunction, "requireAal2(claims)", deleteFunctionPath);
      requireContains(this.id, deleteFunction, 'allowedMethods: ["POST"]', deleteFunctionPath);
      requireContains(this.id, deleteFunction, 'body.confirm !== "DELETE MY ACCOUNT"', deleteFunctionPath);
      requireContains(this.id, deleteFunction, "sb.auth.admin.deleteUser(userId)", deleteFunctionPath);
      requireContains(this.id, deleteFunction, 'eventType:  "account.self_deleted"', deleteFunctionPath);
      requireContains(this.id, info, "Request deletion from the web", infoPath);
      requireContains(this.id, info, "/legal/data-retention", infoPath);
      requireContains(this.id, test, "account deletion lifecycle", testPath);
    },
  },
  {
    id: "account-privacy-controls",
    category: "frontend",
    check() {
      const settingsPath = "src/pages/account/AccountSettingsPage.tsx";
      const privacyPath = "src/pages/account/PrivacySettingsPage.tsx";
      const controlsPath = "src/pages/account/PrivacyControls.tsx";
      const exportPagePath = "src/pages/account/AccountExportPage.tsx";
      const deletionInfoPath = "src/pages/AccountDeletionInfo.tsx";
      const retentionPath = "src/pages/legal/DataRetentionPolicy.tsx";
      const settings = source(settingsPath);
      const privacy = source(privacyPath);
      const controls = source(controlsPath);
      const exportPage = source(exportPagePath);
      const deletionInfo = source(deletionInfoPath);
      const retention = source(retentionPath);
      requireContains(this.id, settings, "/account/data-rights", settingsPath);
      requireContains(this.id, settings, "/account/legal", settingsPath);
      requireContains(this.id, privacy, "/account/data-rights", privacyPath);
      requireContains(this.id, controls, "useRecordConsent", controlsPath);
      requireContains(this.id, controls, "useUserConsents", controlsPath);
      requireContains(this.id, exportPage, 'functions.invoke("account-export")', exportPagePath);
      requireContains(this.id, exportPage, "Re-authenticate with TOTP", exportPagePath);
      requireContains(this.id, deletionInfo, "30-day grace period", deletionInfoPath);
      requireContains(this.id, deletionInfo, "/legal/data-retention", deletionInfoPath);
      requireContains(this.id, retention, "Consent & acceptance records", retentionPath);
      requireContains(this.id, retention, "7 years", retentionPath);
    },
  },
  {
    id: "legal-hub-canonical-links",
    category: "frontend",
    check() {
      const hubPath = "src/pages/account/LegalPoliciesPage.tsx";
      const routeTestPath = "src/test/legalHubCanonicalLinks.test.ts";
      const appPath = "src/App.tsx";
      const hub = source(hubPath);
      const routeTest = source(routeTestPath);
      const app = source(appPath);

      for (const needle of [
        'label: "Terms & Conditions", href: "/legal/terms"',
        'label: "Privacy Policy", href: "/legal/privacy"',
        'label: "Cookie Policy", href: "/legal/cookies"',
        'label: "Refund Policy", href: "/legal/refunds"',
        'label: "Cancellation Policy", href: "/legal/cancellation"',
        'label: "Seller of Travel", href: "/legal/seller-of-travel"',
        'label: "DMCA / Copyright", href: "/legal/dmca"',
        'label: "Dispute Resolution", href: "/legal/dispute-resolution"',
        'label: "Accessibility", href: "/legal/accessibility"',
      ]) {
        requireContains(this.id, hub, needle, hubPath);
      }

      for (const legacyPattern of [
        /label: "Terms & Conditions", href: "\/terms"/,
        /label: "Privacy Policy", href: "\/privacy"/,
        /label: "Cookie Policy", href: "\/cookies"/,
        /label: "Refund Policy", href: "\/refunds"/,
      ]) {
        requireNotMatch(this.id, hub, legacyPattern, hubPath);
      }

      for (const route of [
        'path="/legal/terms"',
        'path="/legal/privacy"',
        'path="/legal/cookies"',
        'path="/legal/refunds"',
        'path="/legal/cancellation"',
        'path="/legal/seller-of-travel"',
        'path="/legal/dmca"',
        'path="/legal/dispute-resolution"',
        'path="/legal/accessibility"',
      ]) {
        requireContains(this.id, app, route, appPath);
      }

      requireContains(this.id, routeTest, "legal hub canonical links", routeTestPath);
    },
  },
  {
    id: "public-legal-navigation-canonical-links",
    category: "frontend",
    check() {
      const files = [
        "src/components/Footer.tsx",
        "src/components/home/NavBar.tsx",
        "src/pages/ComplianceCenter.tsx",
        "src/pages/MorePage.tsx",
      ];
      const routeTestPath = "src/test/publicLegalNavigationCanonical.test.ts";
      const appPath = "src/App.tsx";
      const combined = files.map((file) => source(file)).join("\n");
      const routeTest = source(routeTestPath);
      const app = source(appPath);

      for (const canonical of [
        "/legal/terms",
        "/legal/privacy",
        "/legal/cookies",
        "/legal/refunds",
        "/legal/cancellation",
        "/legal/partner-disclosure",
        "/legal/accessibility",
        "/legal/do-not-sell",
      ]) {
        requireContains(this.id, combined, canonical, files.join(", "));
      }

      for (const legacyPattern of [
        /href: "\/terms"/,
        /href: "\/privacy"/,
        /href: "\/cookies"/,
        /href: "\/refunds"/,
        /href: "\/partner-disclosure"/,
        /href: "\/accessibility"/,
        /href: "\/do-not-sell"/,
        /href: "\/legal\/cancellation-policy"/,
      ]) {
        requireNotMatch(this.id, combined, legacyPattern, files.join(", "));
      }

      for (const route of [
        'path="/legal/terms"',
        'path="/legal/privacy"',
        'path="/legal/cookies"',
        'path="/legal/refunds"',
        'path="/legal/cancellation"',
        'path="/legal/partner-disclosure"',
        'path="/legal/accessibility"',
        'path="/legal/do-not-sell"',
      ]) {
        requireContains(this.id, app, route, appPath);
      }

      requireContains(this.id, routeTest, "public legal navigation canonical routes", routeTestPath);
    },
  },
  {
    id: "checkout-legal-canonical-links",
    category: "frontend",
    check() {
      const files = [
        "src/components/checkout/PartnerConsentModal.tsx",
        "src/components/legal/LegalPreviewSheet.tsx",
        "src/components/common/CookieConsent.tsx",
        "src/pages/Terms.tsx",
      ];
      const testPath = "src/test/checkoutLegalCanonicalLinks.test.ts";
      const combined = files.map((file) => source(file)).join("\n");
      const test = source(testPath);

      for (const canonical of [
        "/legal/terms",
        "/legal/privacy",
        "/legal/refunds",
        "/legal/partner-disclosure",
      ]) {
        requireContains(this.id, combined, canonical, files.join(", "));
      }

      for (const legacyPattern of [
        /to="\/privacy"/,
        /to="\/terms"/,
        /to="\/privacy-policy"/,
        /to="\/refund-policy"/,
        /to="\/partner-disclosure"/,
        /isTerms \? "\/terms" : "\/privacy"/,
      ]) {
        requireNotMatch(this.id, combined, legacyPattern, files.join(", "));
      }

      requireContains(this.id, test, "checkout legal canonical links", testPath);
    },
  },
  {
    id: "account-deletion-data-rights-links",
    category: "frontend",
    check() {
      const appPath = "src/App.tsx";
      const deletionPath = "src/pages/AccountDeletionInfo.tsx";
      const cookiePath = "src/pages/legal/CookiePolicy.tsx";
      const compliancePath = "src/pages/ComplianceCenter.tsx";
      const testPath = "src/test/accountDeletionDataRightsLinks.test.ts";
      const app = source(appPath);
      const deletion = source(deletionPath);
      const cookie = source(cookiePath);
      const compliance = source(compliancePath);
      const test = source(testPath);

      requireContains(this.id, app, 'path="/delete-account"', appPath);
      requireContains(this.id, app, 'path="/account-deletion"', appPath);
      requireContains(this.id, deletion, 'canonical="https://zivollc.com/delete-account"', deletionPath);
      requireContains(this.id, deletion, 'to="/legal/privacy"', deletionPath);
      requireContains(this.id, deletion, 'to="/legal/data-retention"', deletionPath);
      requireContains(this.id, deletion, "privacy@hizivo.com?subject=Delete%20my%20ZIVO%20account", deletionPath);
      requireContains(this.id, cookie, 'to="/legal/privacy"', cookiePath);
      requireContains(this.id, cookie, 'to="/account/data-rights#cookies"', cookiePath);
      requireContains(this.id, cookie, 'to="/legal/terms"', cookiePath);
      requireContains(this.id, compliance, '{ name: "Privacy Controls", href: "/account/data-rights"', compliancePath);
      requireContains(this.id, compliance, 'to="/account/data-rights"', compliancePath);

      for (const legacyPattern of [
        /www\.zivollc\.com\/account-deletion/,
        /to="\/privacy-policy"/,
        /to="\/privacy"/,
        /to="\/account\/privacy"/,
        /to="\/terms"/,
        /\{ name: "Privacy Controls", href: "\/account\/privacy"/,
      ]) {
        requireNotMatch(this.id, `${deletion}\n${cookie}\n${compliance}`, legacyPattern, `${deletionPath}, ${cookiePath}, ${compliancePath}`);
      }

      requireContains(this.id, test, "account deletion and data rights links", testPath);
    },
  },
  {
    id: "travel-legal-canonical-links",
    category: "frontend",
    check() {
      const files = [
        "src/components/hotel/HotelComplianceFooter.tsx",
        "src/components/car/CarComplianceFooter.tsx",
        "src/components/flight/FlightConsentCheckbox.tsx",
        "src/components/shared/TravelFAQ.tsx",
        "src/components/booking/TravelerInfoForm.tsx",
      ];
      const testPath = "src/test/travelLegalCanonicalLinks.test.ts";
      const combined = files.map((file) => source(file)).join("\n");
      const test = source(testPath);

      for (const canonical of [
        'to="/legal/terms"',
        'to="/legal/privacy"',
        'to="/legal/partner-disclosure"',
      ]) {
        requireContains(this.id, combined, canonical, files.join(", "));
      }
      for (const legacyPattern of [
        /to="\/terms"/,
        /to="\/privacy"/,
        /to="\/partner-disclosure"/,
        /to="\/privacy-policy"/,
      ]) {
        requireNotMatch(this.id, combined, legacyPattern, files.join(", "));
      }

      requireContains(this.id, combined, "FLIGHT_CONSENT.checkboxLabel", files.join(", "));
      requireContains(this.id, combined, "FLIGHT_DISCLAIMERS.ticketing", files.join(", "));
      requireContains(this.id, combined, "licensed accommodation partners", files.join(", "));
      requireContains(this.id, combined, "licensed rental partners", files.join(", "));
      requireContains(this.id, combined, "FLIGHT_DISCLAIMERS.checkout", files.join(", "));
      requireContains(this.id, test, "travel legal canonical links", testPath);
    },
  },
  {
    id: "grocery-business-legal-canonical-links",
    category: "frontend",
    check() {
      const files = [
        "src/components/grocery/GroceryPolicyFooter.tsx",
        "src/components/grocery/GroceryCheckoutDrawer.tsx",
        "src/pages/grocery/GroceryTerms.tsx",
        "src/pages/business/BusinessLandingPage.tsx",
        "src/pages/business/PartnerWithZivo.tsx",
      ];
      const testPath = "src/test/groceryBusinessLegalCanonicalLinks.test.ts";
      const combined = files.map((file) => source(file)).join("\n");
      const test = source(testPath);

      for (const canonical of [
        'to="/legal/terms"',
        'to="/legal/privacy"',
        'to="/legal/cookies"',
        'to="/legal/partner-disclosure"',
        'to="/grocery/terms"',
      ]) {
        requireContains(this.id, combined, canonical, files.join(", "));
      }
      for (const legacyPattern of [
        /to="\/terms"/,
        /to="\/privacy"/,
        /to="\/cookies"/,
        /to="\/partner-disclosure"/,
        /to="\/privacy-policy"/,
      ]) {
        requireNotMatch(this.id, combined, legacyPattern, files.join(", "));
      }

      requireContains(this.id, combined, 'to="/grocery/fees"', files.join(", "));
      requireContains(this.id, combined, 'to="/grocery/returns"', files.join(", "));
      requireContains(this.id, combined, "Partner Disclosure", files.join(", "));
      requireContains(this.id, test, "grocery and business legal canonical links", testPath);
    },
  },
  {
    id: "legal-policy-page-related-links",
    category: "frontend",
    check() {
      const files = [
        "src/pages/legal/TermsOfService.tsx",
        "src/pages/legal/PrivacyPolicy.tsx",
        "src/pages/legal/RefundPolicy.tsx",
        "src/pages/legal/CancellationPolicy.tsx",
        "src/pages/legal/PartnerDisclosure.tsx",
        "src/pages/legal/DoNotSell.tsx",
        "src/pages/legal/FlightTerms.tsx",
        "src/pages/legal/MetaPrivacyDisclosure.tsx",
        "src/pages/legal/OwnerTerms.tsx",
        "src/pages/legal/RenterTerms.tsx",
        "src/pages/legal/PartnerAgreement.tsx",
      ];
      const testPath = "src/test/legalPolicyPageRelatedLinks.test.ts";
      const combined = files.map((file) => source(file)).join("\n");
      const test = source(testPath);

      for (const canonical of [
        'to="/legal/terms"',
        'to="/legal/privacy"',
        'to="/legal/cookies"',
        'to="/legal/refunds"',
        'to="/legal/cancellation"',
        'to="/legal/partner-disclosure"',
      ]) {
        requireContains(this.id, combined, canonical, files.join(", "));
      }
      for (const legacyPattern of [
        /to="\/terms"/,
        /to="\/privacy"/,
        /to="\/cookies"/,
        /to="\/privacy-policy"/,
        /to="\/refund-policy"/,
        /to="\/terms-of-service"/,
        /to="\/cancellation-policy"/,
        /to="\/partner-disclosure"/,
      ]) {
        requireNotMatch(this.id, combined, legacyPattern, files.join(", "));
      }

      requireContains(this.id, combined, "support@hizivo.com", files.join(", "));
      requireContains(this.id, test, "legal policy page related links", testPath);
    },
  },
  {
    id: "support-flight-legal-canonical-links",
    category: "frontend",
    check() {
      const files = [
        "src/pages/FAQPage.tsx",
        "src/pages/Help.tsx",
        "src/pages/FlightReview.tsx",
        "src/pages/FlightTravelerInfo.tsx",
        "src/pages/FlightResults.tsx",
        "src/components/flight/FlightResultsSection.tsx",
        "src/components/flight/DuffelFlightCard.tsx",
      ];
      const testPath = "src/test/supportFlightLegalCanonicalLinks.test.ts";
      const combined = files.map((file) => source(file)).join("\n");
      const test = source(testPath);

      for (const canonical of [
        'to="/legal/terms"',
        'to="/legal/privacy"',
        'to="/legal/partner-disclosure"',
      ]) {
        requireContains(this.id, combined, canonical, files.join(", "));
      }
      for (const legacyPattern of [
        /to="\/terms"/,
        /to="\/privacy"/,
        /to="\/partner-disclosure"/,
        /to="\/privacy-policy"/,
        /to="\/terms-of-service"/,
      ]) {
        requireNotMatch(this.id, combined, legacyPattern, files.join(", "));
      }

      requireContains(this.id, combined, "Partner Disclosure", files.join(", "));
      requireContains(this.id, combined, "By continuing, you agree", files.join(", "));
      requireContains(this.id, combined, "Final price and terms are confirmed at checkout", files.join(", "));
      requireContains(this.id, test, "support and flight legal canonical links", testPath);
    },
  },
  {
    id: "residual-public-legal-canonical-links",
    category: "frontend",
    check() {
      const files = [
        "src/pages/security/PrivacyCompliance.tsx",
        "src/pages/Refunds.tsx",
        "src/pages/TravelCheckoutPage.tsx",
        "src/pages/Privacy.tsx",
        "src/pages/account/PrivacyControls.tsx",
        "src/components/home/NewsletterSection.tsx",
        "src/pages/legal/InsurancePolicy.tsx",
        "src/pages/legal/AccessibilityStatement.tsx",
      ];
      const testPath = "src/test/residualPublicLegalCanonicalLinks.test.ts";
      const combined = files.map((file) => source(file)).join("\n");
      const test = source(testPath);

      for (const canonical of [
        'to="/legal/terms"',
        'to="/legal/privacy"',
        'to="/legal/cookies"',
        'to="/legal/partner-disclosure"',
      ]) {
        requireContains(this.id, combined, canonical, files.join(", "));
      }
      for (const legacyPattern of [
        /to="\/terms"/,
        /to="\/privacy"/,
        /to="\/cookies"/,
        /to="\/partner-disclosure"/,
        /to="\/privacy-policy"/,
        /to="\/terms-of-service"/,
      ]) {
        requireNotMatch(this.id, combined, legacyPattern, files.join(", "));
      }

      requireContains(this.id, combined, "No spam, unsubscribe anytime", files.join(", "));
      requireContains(this.id, combined, "cancellation policies apply", files.join(", "));
      requireContains(this.id, test, "residual public legal canonical links", testPath);
    },
  },
  {
    id: "legal-canonical-seo-urls",
    category: "frontend",
    check() {
      const termsPath = "src/pages/Terms.tsx";
      const privacyPath = "src/pages/Privacy.tsx";
      const refundsPath = "src/pages/Refunds.tsx";
      const cookiesPath = "src/pages/legal/CookiePolicy.tsx";
      const damagePath = "src/pages/legal/DamagePolicy.tsx";
      const storeMarketingPath = "src/components/admin/StoreMarketingSection.tsx";
      const testPath = "src/test/legalCanonicalSeoUrls.test.ts";
      const terms = source(termsPath);
      const privacy = source(privacyPath);
      const refunds = source(refundsPath);
      const cookies = source(cookiesPath);
      const damage = source(damagePath);
      const storeMarketing = source(storeMarketingPath);
      const combined = [terms, privacy, refunds, cookies, damage, storeMarketing].join("\n");
      const test = source(testPath);

      requireContains(this.id, terms, 'canonical="https://zivollc.com/legal/terms"', termsPath);
      requireContains(this.id, privacy, 'canonical="https://zivollc.com/legal/privacy"', privacyPath);
      requireContains(this.id, refunds, 'canonical="https://zivollc.com/legal/refunds"', refundsPath);
      requireContains(this.id, cookies, 'canonical="https://zivollc.com/legal/cookies"', cookiesPath);
      requireContains(this.id, damage, 'to="/legal/cancellation"', damagePath);
      requireContains(this.id, storeMarketing, "https://zivollc.com/store/", storeMarketingPath);
      requireContains(this.id, storeMarketing, "https://zivollc.com/book/", storeMarketingPath);

      for (const legacyPattern of [
        /canonical="https:\/\/hizivo\.com\/terms"/,
        /canonical="https:\/\/hizivo\.com\/privacy"/,
        /canonical="https:\/\/hizivo\.com\/refunds"/,
        /canonical="https:\/\/hizivo\.com\/cookies"/,
        /https:\/\/www\.zivollc\.com/,
        /to="\/cancellation-policy"/,
      ]) {
        requireNotMatch(this.id, combined, legacyPattern, [
          termsPath,
          privacyPath,
          refundsPath,
          cookiesPath,
          damagePath,
          storeMarketingPath,
        ].join(", "));
      }

      requireContains(this.id, test, "legal canonical SEO URLs", testPath);
    },
  },
  {
    id: "privacy-request-intake-server-gate",
    category: "frontend-backend",
    check() {
      const controlsPath = "src/pages/account/PrivacyControls.tsx";
      const submitPath = "supabase/functions/privacy-request-submit/index.ts";
      const gatePath = "supabase/migrations/20260601024500_privacy_requests_server_gate.sql";
      const controls = source(controlsPath);
      const submit = source(submitPath);
      const gate = source(gatePath);

      requireContains(this.id, controls, 'functions.invoke("privacy-request-submit"', controlsPath);
      requireContains(this.id, controls, 'kind: "dsar_request"', controlsPath);
      requireContains(this.id, controls, 'kind: "consent_change"', controlsPath);
      if (/from\("feedback_submissions"\)\.insert/.test(controls)) {
        failures.push(`${this.id}: ${controlsPath} directly inserts privacy records into feedback_submissions`);
      }

      requireMatch(this.id, submit, /withSecurity\(\s*"privacy-request-submit"/, submitPath);
      requireContains(this.id, submit, "requireUser(req)", submitPath);
      requireContains(this.id, submit, "requireUserNotBlocked(userId)", submitPath);
      requireContains(this.id, submit, "getServiceRoleClient()", submitPath);
      requireContains(this.id, submit, '.from("feedback_submissions")', submitPath);
      requireContains(this.id, submit, 'category: "dsar_request"', submitPath);
      requireContains(this.id, submit, 'category: "consent_change"', submitPath);
      requireContains(this.id, submit, 'action: "privacy_request_submitted"', submitPath);
      requireContains(this.id, submit, 'action: "consent_change_requested"', submitPath);
      requireContains(this.id, submit, "REQUEST_TYPES", submitPath);
      requireContains(this.id, submit, "CONSENT_TYPES", submitPath);
      requireContains(this.id, submit, "blockNetworkRiskAt: 90", submitPath);

      requireContains(this.id, gate, "AS RESTRICTIVE", gatePath);
      requireContains(this.id, gate, "COALESCE(category, 'general') NOT IN ('dsar_request', 'consent_change')", gatePath);
      requireContains(this.id, gate, "trusted server-side ingestion", gatePath);
    },
  },
  {
    id: "refund-support-trust-intake",
    category: "frontend-backend",
    check() {
      const walletPath = "src/pages/account/WalletPage.tsx";
      const helpPath = "src/pages/app/personal/PersonalHelpPage.tsx";
      const refundPath = "supabase/functions/refund-request-submit/index.ts";
      const supportPath = "supabase/functions/support-ticket-submit/index.ts";
      const testPath = "src/test/refundSupportTrustIntake.test.ts";
      const wallet = source(walletPath);
      const help = source(helpPath);
      const refund = source(refundPath);
      const support = source(supportPath);
      const test = source(testPath);

      requireContains(this.id, wallet, 'functions.invoke("refund-request-submit"', walletPath);
      requireContains(this.id, wallet, "transaction_id: refundTx.id", walletPath);
      requireContains(this.id, wallet, "amount: Math.abs(Number(refundTx.amount))", walletPath);
      requireNotMatch(this.id, wallet, /from\("feedback_submissions"\)[\s\S]{0,160}\.insert/, walletPath);

      requireContains(this.id, help, 'functions.invoke("support-ticket-submit"', helpPath);
      requireContains(this.id, help, 'source: "personal_help"', helpPath);
      requireNotMatch(this.id, help, /from\("feedback_submissions"\)[\s\S]{0,160}\.insert/, helpPath);

      requireMatch(this.id, refund, /withSecurity\(\s*"refund-request-submit"/, refundPath);
      requireContains(this.id, refund, "requireUser(req)", refundPath);
      requireContains(this.id, refund, "requireUserNotBlocked(userId)", refundPath);
      requireContains(this.id, refund, "getServiceRoleClient()", refundPath);
      requireContains(this.id, refund, "REASONS", refundPath);
      for (const reason of ["wrong_charge", "duplicate", "service_not_received", "unauthorized", "other"]) {
        requireContains(this.id, refund, `"${reason}"`, refundPath);
      }
      requireContains(this.id, refund, "cleanAmount(body.amount)", refundPath);
      requireContains(this.id, refund, '.from("feedback_submissions")', refundPath);
      requireContains(this.id, refund, 'category: "refund_request"', refundPath);
      requireContains(this.id, refund, 'action: "refund_request_submitted"', refundPath);
      requireContains(this.id, refund, 'rateLimit: "payment"', refundPath);
      requireContains(this.id, refund, "blockNetworkRiskAt: 90", refundPath);

      requireMatch(this.id, support, /withSecurity\(\s*"support-ticket-submit"/, supportPath);
      requireContains(this.id, support, "requireUser(req)", supportPath);
      requireContains(this.id, support, "requireUserNotBlocked(userId)", supportPath);
      requireContains(this.id, support, "getServiceRoleClient()", supportPath);
      requireContains(this.id, support, "cleanEmail(body.email) ?? cleanEmail(claims.email)", supportPath);
      requireContains(this.id, support, "source = cleanText(body.source, MAX_TEXT)", supportPath);
      requireContains(this.id, support, '.from("feedback_submissions")', supportPath);
      requireContains(this.id, support, 'category: "support_ticket"', supportPath);
      requireContains(this.id, support, 'action: "support_ticket_submitted"', supportPath);
      requireContains(this.id, support, 'rateLimit: "api_general"', supportPath);
      requireContains(this.id, support, "blockNetworkRiskAt: 80", supportPath);

      requireContains(this.id, test, "refund and support trust intake", testPath);
    },
  },
  {
    id: "creator-monetization-legal-disclosure",
    category: "frontend",
    check() {
      const termsPath = "src/pages/legal/TermsOfService.tsx";
      const previewPath = "src/components/legal/LegalPreviewSheet.tsx";
      const subscribePath = "src/components/creator/CreatorSubscribeSheet.tsx";
      const academyPath = "src/pages/MonetizationArticlesPage.tsx";
      const testPath = "src/test/creatorMonetizationLegalDisclosure.test.ts";
      const terms = source(termsPath);
      const preview = source(previewPath);
      const subscribe = source(subscribePath);
      const academy = source(academyPath);
      const test = source(testPath);

      for (const needle of [
        "Creator Monetization & Payouts",
        "tips, gifts, locked media, subscriptions, ad revenue",
        "identity and tax verification",
        "minimum payout thresholds",
        "refund clawbacks",
        "chargebacks",
        "payment reversals",
        "Fraudulent, artificial, self-funded",
        "sponsored-content compliance",
      ]) {
        requireContains(this.id, terms, needle, termsPath);
      }

      requireContains(this.id, preview, "Monetization & Creator Earnings", previewPath);
      requireContains(this.id, preview, "refund clawbacks", previewPath);
      requireContains(this.id, preview, "chargeback liability", previewPath);
      requireContains(this.id, subscribe, 'href="/legal/terms"', subscribePath);
      requireContains(this.id, subscribe, 'href="/legal/refunds"', subscribePath);
      requireContains(this.id, subscribe, "payout, tax, chargeback, and refund rules", subscribePath);

      for (const topic of [
        "Tax information for ZIVO creators",
        "FTC disclosure requirements for creators",
        "GDPR and data privacy for creators",
        "Creator legal essentials",
        "How to verify your identity for payouts",
      ]) {
        requireContains(this.id, academy, topic, academyPath);
      }

      requireContains(this.id, test, "creator monetization legal disclosure", testPath);
    },
  },
  {
    id: "ads-marketing-privacy-disclosure",
    category: "frontend",
    check() {
      const cookiePath = "src/pages/legal/CookiePolicy.tsx";
      const privacyPath = "src/pages/legal/PrivacyPolicy.tsx";
      const doNotSellPath = "src/pages/legal/DoNotSell.tsx";
      const consentPath = "src/components/common/CookieConsent.tsx";
      const controlsPath = "src/pages/account/PrivacyControls.tsx";
      const prefsPath = "src/hooks/useCookiePrefs.ts";
      const testPath = "src/test/adsMarketingPrivacyDisclosure.test.ts";
      const cookie = source(cookiePath);
      const privacy = source(privacyPath);
      const doNotSell = source(doNotSellPath);
      const consent = source(consentPath);
      const controls = source(controlsPath);
      const prefs = source(prefsPath);
      const test = source(testPath);

      for (const needle of [
        "Marketing & Advertising Cookies",
        "Meta pixel",
        "Google Ads",
        "TikTok pixel",
        "Consent-based advertising",
        "only when you allow marketing cookies",
      ]) {
        requireContains(this.id, cookie, needle, cookiePath);
      }
      requireNotMatch(this.id, cookie, /No tracking or advertising cookies/, cookiePath);
      requireNotMatch(this.id, cookie, /does not use cookies for advertising or ad targeting purposes/, cookiePath);

      for (const needle of [
        "Meta, Google Ads, and TikTok",
        "only when you consent to marketing cookies",
        "limited audience or conversion signals",
        "Do Not Sell or Share",
        "targeted advertising",
      ]) {
        requireContains(this.id, privacy, needle, privacyPath);
      }
      requireNotMatch(this.id, privacy, /ZIVO does not use advertising or tracking cookies/, privacyPath);

      requireContains(this.id, doNotSell, "Does ZIVO Sell or Share Personal Information?", doNotSellPath);
      requireContains(this.id, doNotSell, "Advertising signals", doNotSellPath);
      requireContains(this.id, doNotSell, "Reject marketing cookies", doNotSellPath);
      requireContains(this.id, consent, "Marketing & Advertising Cookies", consentPath);
      requireContains(this.id, controls, 'title: "Marketing"', controlsPath);
      requireContains(this.id, prefs, "marketing: false", prefsPath);
      requireContains(this.id, prefs, "marketing: true", prefsPath);
      requireContains(this.id, test, "ads marketing privacy disclosure", testPath);
    },
  },
  {
    id: "ads-marketing-consent-runtime",
    category: "frontend",
    check() {
      const htmlPath = "index.html";
      const prefsPath = "src/hooks/useCookiePrefs.ts";
      const consentPath = "src/components/common/CookieConsent.tsx";
      const cookiePolicyPath = "src/pages/legal/CookiePolicy.tsx";
      const settingsPath = "src/pages/account/AccountSettingsPage.tsx";
      const helperPath = "src/lib/privacy/cookieConsent.ts";
      const vitePath = "vite.config.ts";
      const testPath = "src/test/adsMarketingConsentRuntime.test.ts";
      const html = source(htmlPath);
      const prefs = source(prefsPath);
      const consent = source(consentPath);
      const cookiePolicy = source(cookiePolicyPath);
      const settings = source(settingsPath);
      const helper = source(helperPath);
      const vite = source(vitePath);
      const test = source(testPath);

      requireContains(this.id, html, "function readCookiePrefs()", htmlPath);
      requireContains(this.id, html, "var analyticsAllowed=prefs.analytics===true", htmlPath);
      requireContains(this.id, html, "var marketingAllowed=prefs.marketing===true", htmlPath);
      requireContains(this.id, html, "if(analyticsAllowed&&!analyticsLoaded)", htmlPath);
      requireContains(this.id, html, "if(marketingAllowed&&!marketingLoaded)", htmlPath);
      requireContains(this.id, html, "gtagLoaded", htmlPath);
      requireContains(this.id, html, "gtag('config','G-VVH8W5PW3E'", htmlPath);
      requireContains(this.id, html, "gtag('config','AW-18077605056')", htmlPath);
      requireContains(this.id, html, "https://connect.facebook.net/en_US/fbevents.js", htmlPath);
      requireContains(this.id, html, "https://analytics.tiktok.com/i18n/pixel/events.js", htmlPath);
      requireContains(this.id, html, 'meta name="facebook-domain-verification"', htmlPath);
      requireContains(this.id, vite, "metaDomainVerificationPlugin", vitePath);
      requireContains(this.id, vite, "loadEnv(mode", vitePath);

      requireContains(this.id, helper, 'COOKIE_CONSENT_STORAGE_KEY = "zivo_cookie_consent"', helperPath);
      requireContains(this.id, helper, "COOKIE_CONSENT_UPDATED_EVENT", helperPath);
      requireContains(this.id, prefs, "COOKIE_CONSENT_STORAGE_KEY", prefsPath);
      requireContains(this.id, prefs, "if (next.analytics || next.marketing)", prefsPath);
      requireContains(this.id, consent, "COOKIE_CONSENT_STORAGE_KEY", consentPath);
      requireContains(this.id, consent, "emitCookieConsentUpdated", consentPath);
      requireContains(this.id, consent, "if (preferences.analytics || preferences.marketing)", consentPath);
      requireContains(this.id, cookiePolicy, "COOKIE_CONSENT_STORAGE_KEY", cookiePolicyPath);
      requireContains(this.id, cookiePolicy, "emitCookieConsentUpdated", cookiePolicyPath);
      requireContains(this.id, cookiePolicy, "if (preferences.analytics || preferences.marketing)", cookiePolicyPath);
      requireContains(this.id, settings, '"zivo_cookie_consent"', settingsPath);
      requireNotMatch(this.id, consent, /"zivo-cookie-consent"/, consentPath);
      requireNotMatch(this.id, cookiePolicy, /"cookie_preferences"/, cookiePolicyPath);
      requireContains(this.id, test, "ads marketing consent runtime", testPath);
    },
  },
  {
    id: "marketing-lead-privacy-intake",
    category: "frontend-backend",
    check() {
      const submitPath = "supabase/functions/marketing-interest-submit/index.ts";
      const gatePath = "supabase/migrations/20260601041500_marketing_interest_server_gate.sql";
      const pagePaths = [
        "src/pages/Deals.tsx",
        "src/pages/Vision.tsx",
        "src/pages/business/APIPartners.tsx",
        "src/pages/business/CorporateTravel.tsx",
        "src/pages/business/BusinessLandingPage.tsx",
      ];
      const testPath = "src/test/marketingLeadPrivacyIntake.test.ts";
      const submit = source(submitPath);
      const gate = source(gatePath);
      const test = source(testPath);

      for (const pagePath of pagePaths) {
        const page = source(pagePath);
        requireContains(this.id, page, 'functions.invoke("marketing-interest-submit"', pagePath);
        requireContains(this.id, page, 'to="/legal/privacy"', pagePath);
        requireContains(this.id, page, 'to="/legal/terms"', pagePath);
        requireNotMatch(this.id, page, /from\("feedback_submissions"\)[\s\S]{0,160}\.insert/, pagePath);
        requireNotMatch(this.id, page, /to="\/privacy"/, pagePath);
        requireNotMatch(this.id, page, /to="\/terms"/, pagePath);
      }

      requireContains(this.id, submit, 'withSecurity("marketing-interest-submit"', submitPath);
      requireContains(this.id, submit, "SUPABASE_SERVICE_ROLE_KEY", submitPath);
      requireContains(this.id, submit, "cleanEmail(body.email)", submitPath);
      requireContains(this.id, submit, "cleanText(body.company, MAX_TEXT)", submitPath);
      requireContains(this.id, submit, "cleanText(body.message, MAX_MESSAGE)", submitPath);
      requireContains(this.id, submit, '.from("feedback_submissions")', submitPath);
      for (const category of ["newsletter_signup", "deals_alert_signup", "api_waitlist", "corporate_lead", "business_inquiry"]) {
        requireContains(this.id, submit, category, submitPath);
        requireContains(this.id, gate, category, gatePath);
      }
      requireContains(this.id, gate, "AS RESTRICTIVE", gatePath);
      requireContains(this.id, gate, "trusted server-side ingestion", gatePath);
      requireContains(this.id, test, "marketing lead privacy intake", testPath);
    },
  },
  {
    id: "age-eligibility-safety-disclosure",
    category: "frontend",
    check() {
      const termsPath = "src/pages/legal/TermsOfService.tsx";
      const privacyPath = "src/pages/legal/PrivacyPolicy.tsx";
      const previewPath = "src/components/legal/LegalPreviewSheet.tsx";
      const academyPath = "src/pages/MonetizationArticlesPage.tsx";
      const testPath = "src/test/ageEligibilitySafetyDisclosure.test.ts";
      const terms = source(termsPath);
      const privacy = source(privacyPath);
      const preview = source(previewPath);
      const academy = source(academyPath);
      const test = source(testPath);

      for (const needle of [
        "at least 13 years old to create a limited personal account",
        "at least 16 where local law requires a higher digital consent age",
        "at least 18 years old",
        "book travel",
        "send or receive gifts",
        "go live",
        "unlock paid content",
        "receive payouts",
        "business/partner tools",
        "Provide accurate age or date-of-birth information when requested",
      ]) {
        requireContains(this.id, terms, needle, termsPath);
      }

      requireContains(this.id, privacy, "not intended for children under 13 years of age", privacyPath);
      requireContains(this.id, privacy, "under 16 where local law requires", privacyPath);
      requireContains(this.id, privacy, "travel booking, rides, delivery ordering, car rental", privacyPath);
      requireContains(this.id, privacy, "payments, gifts", privacyPath);
      requireContains(this.id, privacy, "live streaming", privacyPath);
      requireContains(this.id, privacy, "payout features", privacyPath);
      requireContains(this.id, privacy, "privacy@hizivo.com", privacyPath);
      requireNotMatch(this.id, privacy, /privacy@zivo\.com/, privacyPath);

      requireContains(this.id, preview, "You must be at least 13 to create a personal account", previewPath);
      requireContains(this.id, preview, "18 to book travel, make payments, send/receive gifts, go live", previewPath);
      requireContains(this.id, preview, "hidden from minors", previewPath);
      requireContains(this.id, academy, "Child safety and minor protection", academyPath);
      requireContains(this.id, academy, "COPPA compliance and kids' content", academyPath);
      requireContains(this.id, test, "age eligibility safety disclosure", testPath);
    },
  },
  {
    id: "ai-automated-decision-disclosure",
    category: "frontend-backend",
    check() {
      const termsPath = "src/pages/legal/TermsOfService.tsx";
      const privacyPath = "src/pages/legal/PrivacyPolicy.tsx";
      const previewPath = "src/components/legal/LegalPreviewSheet.tsx";
      const academyPath = "src/pages/MonetizationArticlesPage.tsx";
      const appealPagePath = "src/pages/ModerationAppealsPage.tsx";
      const appealEdgePath = "supabase/functions/moderation-appeal-submit/index.ts";
      const appealGatePath = "supabase/migrations/20260601061500_moderation_appeals_server_gate.sql";
      const testPath = "src/test/aiAutomatedDecisionDisclosure.test.ts";
      const terms = source(termsPath);
      const privacy = source(privacyPath);
      const preview = source(previewPath);
      const academy = source(academyPath);
      const appealPage = source(appealPagePath);
      const appealEdge = source(appealEdgePath);
      const appealGate = source(appealGatePath);
      const test = source(testPath);

      for (const needle of [
        "AI, Ranking & Automated Decisions",
        "search ranking",
        "recommendations",
        "fraud detection",
        "pricing estimates",
        "moderation",
        "safety review",
        "AI output may be inaccurate or incomplete",
        "account suspension",
        "payout holds",
        "content removal",
        "booking risk review",
        "payment risk review",
        "human review or appeal where available",
        "ranking, recommendation, fraud, safety, moderation",
      ]) {
        requireContains(this.id, terms, needle, termsPath);
      }

      for (const needle of [
        "AI & Automated Decisions",
        "rank feed, reels, and search results",
        "personalize recommendations",
        "detect fraud, spam, abuse, and security threats",
        "moderate content",
        "calculate pricing estimates",
        "route support requests",
        "measure ad relevance",
        "de-identified or aggregated data",
        "request information about automated decisions affecting you",
        "request human review or submit an appeal where available",
      ]) {
        requireContains(this.id, privacy, needle, privacyPath);
      }

      requireContains(this.id, preview, "ZIVO uses AI for search ranking", previewPath);
      requireContains(this.id, preview, "AI helps rank content, detect fraud, moderate, and price rides", previewPath);
      requireContains(this.id, academy, "Understanding the ZIVO algorithm", academyPath);
      requireContains(this.id, academy, "AI-generated content label", academyPath);
      requireContains(this.id, academy, "Appealing a content decision", academyPath);

      requireContains(this.id, appealPage, 'supabase.functions.invoke("moderation-appeal-submit"', appealPagePath);
      requireNotMatch(this.id, appealPage, /from\("appeal_requests"\)[\s\S]{0,180}\.insert/, appealPagePath);
      requireContains(this.id, appealEdge, 'withSecurity("moderation-appeal-submit"', appealEdgePath);
      requireContains(this.id, appealEdge, "strictCors: true", appealEdgePath);
      requireContains(this.id, appealEdge, 'trackNetwork: "suspicious"', appealEdgePath);
      requireContains(this.id, appealEdge, "blockNetworkRiskAt: 80", appealEdgePath);
      requireContains(this.id, appealEdge, "auth.getUser(token)", appealEdgePath);
      requireContains(this.id, appealEdge, '.from("moderation_actions")', appealEdgePath);
      requireContains(this.id, appealEdge, '.eq("target_user_id", user.id)', appealEdgePath);
      requireContains(this.id, appealEdge, '.from("appeal_requests")', appealEdgePath);
      requireContains(this.id, appealEdge, "alreadySubmitted: true", appealEdgePath);
      requireContains(this.id, appealGate, "ON public.appeal_requests", appealGatePath);
      requireContains(this.id, appealGate, "AS RESTRICTIVE", appealGatePath);
      requireContains(this.id, appealGate, "WITH CHECK (false)", appealGatePath);
      requireContains(this.id, appealGate, "trusted server-side ingestion", appealGatePath);
      requireContains(this.id, test, "AI automated decision disclosure", testPath);
    },
  },
  {
    id: "automated-legal-policy-hub",
    category: "frontend",
    check() {
      const appPath = "src/App.tsx";
      const legalHubPath = "src/pages/account/LegalPoliciesPage.tsx";
      const genericLegalPath = "src/pages/legal/GenericLegalPage.tsx";
      const termsPath = "src/pages/legal/TermsOfService.tsx";
      const privacyPath = "src/pages/legal/PrivacyPolicy.tsx";
      const retentionPath = "src/pages/legal/DataRetentionPolicy.tsx";
      const gdprPath = "src/pages/legal/GDPRCompliance.tsx";
      const testPath = "src/test/automatedLegalPolicyHub.test.ts";
      const app = source(appPath);
      const legalHub = source(legalHubPath);
      const genericLegal = source(genericLegalPath);
      const terms = source(termsPath);
      const privacy = source(privacyPath);
      const retention = source(retentionPath);
      const gdpr = source(gdprPath);
      const test = source(testPath);

      requireContains(this.id, app, 'path="/legal/*"', appPath);
      requireContains(this.id, legalHub, 'href: "/legal/automated-data-collection"', legalHubPath);
      requireContains(this.id, legalHub, 'href: "/legal/automated-decisions"', legalHubPath);

      for (const needle of [
        '"/legal/automated-decisions"',
        "AI Governance",
        "search ranking, feed and reels recommendations",
        "fraud detection, spam and abuse prevention",
        "content moderation, safety review",
        "account suspension, payout holds, content removal",
        "booking risk review, payment risk review",
        "request information about automated decisions affecting you",
        "request human review or submit an appeal where available",
        "ZIVO appeal flow",
        "ranking, recommendation, fraud, safety, moderation",
      ]) {
        requireContains(this.id, genericLegal, needle, genericLegalPath);
      }

      for (const needle of [
        '"/legal/automated-data-collection"',
        "device identifiers, IP address",
        "app events, page views, search queries",
        "booking activity, payment and payout events",
        "cookie choices, and ad attribution signals where you consent",
        "Essential collection is required for security and service delivery",
        "Optional analytics and marketing collection",
        "Do Not Sell or Share controls",
        "aggregated, anonymized, or de-identified",
        "privacy@hizivo.com",
      ]) {
        requireContains(this.id, genericLegal, needle, genericLegalPath);
      }

      requireContains(this.id, terms, "AI, Ranking & Automated Decisions", termsPath);
      requireContains(this.id, terms, "human review or appeal where available", termsPath);
      requireContains(this.id, privacy, "AI & Automated Decisions", privacyPath);
      requireContains(this.id, privacy, "request information about automated decisions affecting you", privacyPath);
      requireContains(this.id, retention, "Automated Decision Making & Profiling", retentionPath);
      requireContains(this.id, retention, "request human review of automated decisions that significantly affect you", retentionPath);
      requireContains(this.id, gdpr, "AUTOMATED DECISION-MAKING", gdprPath);
      requireContains(this.id, gdpr, "not be subject to decisions based solely on automated processing", gdprPath);
      requireContains(this.id, test, "automated legal policy hub", testPath);
    },
  },
  {
    id: "data-rights-legal-policy-hub",
    category: "frontend-backend",
    check() {
      const appPath = "src/App.tsx";
      const legalHubPath = "src/pages/account/LegalPoliciesPage.tsx";
      const genericLegalPath = "src/pages/legal/GenericLegalPage.tsx";
      const accountExportPath = "src/pages/account/AccountExportPage.tsx";
      const accountSecurityPath = "src/pages/account/AccountSecurity.tsx";
      const deletionInfoPath = "src/pages/AccountDeletionInfo.tsx";
      const privacyControlsPath = "src/pages/account/PrivacyControls.tsx";
      const exportFunctionPath = "supabase/functions/account-export/index.ts";
      const deleteFunctionPath = "supabase/functions/account-delete-self/index.ts";
      const privacySubmitPath = "supabase/functions/privacy-request-submit/index.ts";
      const privacyGatePath = "supabase/migrations/20260601024500_privacy_requests_server_gate.sql";
      const retentionPath = "src/pages/legal/DataRetentionPolicy.tsx";
      const testPath = "src/test/dataRightsLegalPolicyHub.test.ts";
      const app = source(appPath);
      const legalHub = source(legalHubPath);
      const genericLegal = source(genericLegalPath);
      const accountExport = source(accountExportPath);
      const accountSecurity = source(accountSecurityPath);
      const deletionInfo = source(deletionInfoPath);
      const privacyControls = source(privacyControlsPath);
      const exportFunction = source(exportFunctionPath);
      const deleteFunction = source(deleteFunctionPath);
      const privacySubmit = source(privacySubmitPath);
      const privacyGate = source(privacyGatePath);
      const retention = source(retentionPath);
      const test = source(testPath);

      requireContains(this.id, app, 'path="/legal/*"', appPath);
      requireContains(this.id, legalHub, 'label: "Data Portability & Export", href: "/legal/data-portability"', legalHubPath);
      requireContains(this.id, legalHub, 'label: "Right to Be Forgotten", href: "/legal/right-to-be-forgotten"', legalHubPath);
      requireContains(this.id, legalHub, 'label: "Data Subject Access Request (DSAR)", href: "/legal/dsar"', legalHubPath);

      for (const needle of [
        '"/legal/data-portability"',
        "Portable Export Scope",
        "profile data, messages, media metadata",
        "wallet transactions, devices, consent records",
        "legal acceptance records",
        "account-export Edge Function",
        "requires re-authentication with TOTP",
        "GDPR Article 15 and CCPA portability evidence",
      ]) {
        requireContains(this.id, genericLegal, needle, genericLegalPath);
      }

      for (const needle of [
        '"/legal/right-to-be-forgotten"',
        "30-day grace period",
        "account-delete-self Edge Function",
        "confirmation phrase DELETE MY ACCOUNT",
        "deletes user-owned records where permitted",
        "legal, tax, fraud prevention, payment, dispute",
        "privacy@hizivo.com or support@hizivo.com",
      ]) {
        requireContains(this.id, genericLegal, needle, genericLegalPath);
      }

      for (const needle of [
        '"/legal/dsar"',
        "access, download, correction, deletion",
        "opt-out of sale or sharing",
        "information about automated decisions affecting you",
        "privacy-request-submit Edge Function",
        "categorized as dsar_request or consent_change",
        "GDPR requests are generally handled within 30 days",
        "CCPA requests follow applicable legal timeframes",
        "privacy@hizivo.com",
      ]) {
        requireContains(this.id, genericLegal, needle, genericLegalPath);
      }

      requireContains(this.id, accountExport, 'functions.invoke("account-export")', accountExportPath);
      requireContains(this.id, accountExport, "Authoritative export (server-side)", accountExportPath);
      requireContains(this.id, exportFunction, "GDPR Article 15", exportFunctionPath);
      requireContains(this.id, exportFunction, 'action:     "data_export"', exportFunctionPath);
      requireContains(this.id, deletionInfo, "30-day grace period", deletionInfoPath);
      requireContains(this.id, deletionInfo, "/legal/data-retention", deletionInfoPath);
      requireContains(this.id, deleteFunction, "GDPR Article 17", deleteFunctionPath);
      requireContains(this.id, deleteFunction, "requireAal2(claims)", deleteFunctionPath);
      requireContains(this.id, deleteFunction, 'body.confirm !== "DELETE MY ACCOUNT"', deleteFunctionPath);
      requireContains(this.id, retention, "Data Deletion & Your Rights", retentionPath);
      requireContains(this.id, privacyControls, 'functions.invoke("privacy-request-submit"', privacyControlsPath);
      requireContains(this.id, privacyControls, 'kind: "dsar_request"', privacyControlsPath);
      requireContains(this.id, privacyControls, 'kind: "consent_change"', privacyControlsPath);
      requireContains(this.id, accountSecurity, 'functions.invoke("privacy-request-submit"', accountSecurityPath);
      requireMatch(this.id, privacySubmit, /withSecurity\(\s*"privacy-request-submit"/, privacySubmitPath);
      requireContains(this.id, privacySubmit, 'category: "dsar_request"', privacySubmitPath);
      requireContains(this.id, privacySubmit, 'category: "consent_change"', privacySubmitPath);
      requireContains(this.id, privacyGate, "trusted server-side ingestion", privacyGatePath);
      requireContains(this.id, test, "data rights legal policy hub", testPath);
    },
  },
  {
    id: "sensitive-data-legal-policy-hub",
    category: "frontend",
    check() {
      const appPath = "src/App.tsx";
      const legalHubPath = "src/pages/account/LegalPoliciesPage.tsx";
      const genericLegalPath = "src/pages/legal/GenericLegalPage.tsx";
      const privacyPath = "src/pages/legal/PrivacyPolicy.tsx";
      const retentionPath = "src/pages/legal/DataRetentionPolicy.tsx";
      const goLivePath = "src/pages/GoLivePage.tsx";
      const testPath = "src/test/sensitiveDataLegalPolicyHub.test.ts";
      const app = source(appPath);
      const legalHub = source(legalHubPath);
      const genericLegal = source(genericLegalPath);
      const privacy = source(privacyPath);
      const retention = source(retentionPath);
      const goLive = source(goLivePath);
      const test = source(testPath);

      requireContains(this.id, app, 'path="/legal/*"', appPath);
      requireContains(this.id, legalHub, 'label: "Biometric Data Policy", href: "/legal/biometric-data"', legalHubPath);
      requireContains(this.id, legalHub, 'label: "Location Data Policy", href: "/legal/location-data"', legalHubPath);
      requireContains(this.id, legalHub, 'label: "Facial Recognition Policy", href: "/legal/facial-recognition"', legalHubPath);

      for (const needle of [
        '"/legal/location-data"',
        "precise GPS location during active rides",
        "nearby discovery, live sharing, check-ins",
        "Precise location is collected only when you grant device permission",
        "disable location access in iOS or Android settings",
        "pickup and drop-off locations with drivers",
        "delivery addresses with merchants and couriers",
        "Data Retention Policy",
        "privacy@hizivo.com",
      ]) {
        requireContains(this.id, genericLegal, needle, genericLegalPath);
      }

      for (const needle of [
        '"/legal/biometric-data"',
        "biometric identifiers and biometric information",
        "face geometry, liveness checks, voiceprints",
        "identity verification, liveness detection",
        "We do not sell biometric identifiers or biometric information",
        "obtains consent before collecting or processing biometric identifiers",
        "alternative verification path",
        "encryption, access controls, audit logging",
        "deleted or de-identified according to the Data Retention Policy",
      ]) {
        requireContains(this.id, genericLegal, needle, genericLegalPath);
      }

      for (const needle of [
        '"/legal/facial-recognition"',
        "Face Detection vs. Recognition",
        "detect a face on-device",
        "without identifying you",
        "face geometry used for identity verification",
        "liveness detection for driver, merchant, creator",
        "underage-access prevention",
        "does not use facial recognition to identify people in public posts",
        "sell face geometry",
        "disable camera permissions in device settings",
        "privacy@hizivo.com",
      ]) {
        requireContains(this.id, genericLegal, needle, genericLegalPath);
      }

      requireContains(this.id, privacy, "Precise GPS location during trips/deliveries", privacyPath);
      requireContains(this.id, retention, "location data", retentionPath);
      requireContains(this.id, goLive, "Allow camera access and try again.", goLivePath);
      requireContains(this.id, test, "sensitive data legal policy hub", testPath);
    },
  },
  {
    id: "booking-policy-consent-recording",
    category: "frontend-backend",
    check() {
      const bookingDrawerPath = "src/components/lodging/LodgingBookingDrawer.tsx";
      const lodgeRpcPath = "supabase/migrations/20260526184329_lodge_guest_booking_rpc.sql";
      const noShowPath = "supabase/migrations/20260524420000_salon_no_show_fees.sql";
      const bookingDrawer = source(bookingDrawerPath);
      const lodgeRpc = source(lodgeRpcPath);
      const noShow = source(noShowPath);
      requireContains(this.id, bookingDrawer, "policy_consent: policyConsent", bookingDrawerPath);
      requireContains(this.id, bookingDrawer, "policy_consent_version: policyConsentVersion", bookingDrawerPath);
      requireContains(this.id, lodgeRpc, "p_payload -> 'policy_consent'", lodgeRpcPath);
      requireContains(this.id, lodgeRpc, "p_payload ->> 'policy_consent_version'", lodgeRpcPath);
      requireContains(this.id, noShow, "no_show_fee_consent_at", noShowPath);
      requireMatch(this.id, noShow, /audit trail/i, noShowPath);
    },
  },
];

for (const contract of contracts) contract.check();

console.log(JSON.stringify({
  generated: new Date().toISOString(),
  counts: {
    contracts: contracts.length,
    failures: failures.length,
  },
  contracts: contracts.map(({ id, category }) => ({ id, category })),
  failures,
}, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
