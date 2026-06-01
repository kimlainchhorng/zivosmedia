#!/usr/bin/env node
/**
 * Database, storage, and media readiness contract check.
 *
 * Verifies Supabase Data API grants, RLS/storage policy coverage, Postgres
 * upgrade checks, migration drift gates, and media/CDN performance hooks.
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

const contracts = [
  {
    id: "supabase-data-api-grants-and-rls",
    category: "database",
    check() {
      const readinessPath = "scripts/supabase/database-upgrade-readiness.mjs";
      const driftPath = "scripts/supabase/audit-migration-drift.mjs";
      const grantsPath = "supabase/migrations/20260531142721_data_api_grants_recent_public_tables.sql";
      const legalGrantsPath = "supabase/migrations/20260531183402_legal_policy_data_api_grants.sql";
      const roleGrantsPath = "supabase/migrations/20260531184042_role_workflow_data_api_grants.sql";
      const referralWebhookGrantsPath = "supabase/migrations/20260601154700_data_api_grants_referrals_and_webhook_events.sql";
      const readiness = source(readinessPath);
      const drift = source(driftPath);
      const grants = source(grantsPath);
      const legalGrants = source(legalGrantsPath);
      const roleGrants = source(roleGrantsPath);
      const referralWebhookGrants = source(referralWebhookGrantsPath);

      for (const needle of [
        'const dataApiGrantReviewVersion = "20260428000000"',
        "dataApiGrantReview",
        "Recent public tables needing Data API grant review",
        "information_schema.role_table_grants",
        "enable RLS and add explicit grants",
      ]) {
        requireContains(this.id, readiness, needle, readinessPath);
      }
      for (const needle of [
        "creates_table_without_rls",
        "creates_table_without_grant",
        "sequence_backed_id_without_sequence_grant",
        "Pending local creates tables without RLS",
      ]) {
        requireContains(this.id, drift, needle, driftPath);
      }
      for (const tableName of ["store_payment_settings", "store_promotions"]) {
        requireContains(this.id, grants, `public.${tableName}`, grantsPath);
      }
      requireContains(this.id, legalGrants, "grant usage on schema public to anon, authenticated", legalGrantsPath);
      requireContains(this.id, legalGrants, "grant select, insert on table public.user_consent_logs to authenticated;", legalGrantsPath);
      requireContains(this.id, roleGrants, "grant select on table public.store_profiles to anon, authenticated;", roleGrantsPath);
      requireContains(this.id, roleGrants, "grant select on table public.store_products to anon, authenticated;", roleGrantsPath);
      requireContains(this.id, roleGrants, "grant select, insert, update on table public.store_orders to authenticated;", roleGrantsPath);
      requireContains(this.id, roleGrants, "grant all privileges on table public.store_employee_invites to service_role;", roleGrantsPath);
      for (const tableName of [
        "user_referral_codes",
        "referral_shares",
        "referral_conversions",
        "eats_paypal_webhook_events",
        "eats_square_webhook_events",
        "tip_paypal_webhook_events",
        "tip_square_webhook_events",
      ]) {
        requireContains(this.id, referralWebhookGrants, `GRANT SELECT ON TABLE public.${tableName} TO authenticated;`, referralWebhookGrantsPath);
      }
    },
  },
  {
    id: "postgres-upgrade-and-graphql-readiness",
    category: "upgrade",
    check() {
      const readinessPath = "scripts/supabase/database-upgrade-readiness.mjs";
      const reportPath = "docs/database-upgrade-readiness-report.md";
      const packagePath = "package.json";
      const readiness = source(readinessPath);
      const report = source(reportPath);
      const packageJson = source(packagePath);

      for (const needle of [
        "pg17UnsupportedExtensions",
        "timescaledb",
        "plv8",
        "extractViewRisks",
        "security_invoker",
        "extractSecurityDefinerRisks",
        "set\\s+search_path",
        "Postgres 17 Extension Review",
      ]) {
        requireContains(this.id, readiness, needle, readinessPath);
      }
      for (const needle of [
        "Postgres 17 unsupported extensions found: 0",
        "Views needing security_invoker review: 0",
        "SECURITY DEFINER files needing search_path review: 0",
        "select version();",
        "select extname, extversion from pg_extension order by extname;",
      ]) {
        requireContains(this.id, report, needle, reportPath);
      }
      requireContains(this.id, packageJson, '"supabase:upgrade-readiness"', packagePath);
      requireContains(this.id, packageJson, '"supabase:upgrade-readiness:strict"', packagePath);
    },
  },
  {
    id: "migration-secret-and-runtime-settings",
    category: "migration-safety",
    check() {
      const readinessPath = "scripts/supabase/database-upgrade-readiness.mjs";
      const runtimePath = "scripts/supabase/runtime-settings-sql.mjs";
      const envPath = "scripts/deploy/env-preflight.mjs";
      const readiness = source(readinessPath);
      const runtime = source(runtimePath);
      const env = source(envPath);

      for (const needle of [
        "extractHardcodedSupabaseUrls",
        "extractHardcodedSupabaseAnonJwts",
        "Token values are intentionally not printed",
        "current_setting('app.settings.supabase_url', true)",
        "current_setting('app.settings.supabase_anon_key', true)",
        "hasCronUrlRemediation",
        "hasCronAnonKeyRemediation",
      ]) {
        requireContains(this.id, readiness, needle, readinessPath);
      }
      for (const needle of [
        "app.settings.supabase_url",
        "app.settings.supabase_anon_key",
        "--emit-secrets",
        "Refusing to use a Supabase secret/service_role key",
      ]) {
        requireContains(this.id, runtime, needle, runtimePath);
      }
      for (const envName of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ACCESS_TOKEN"]) {
        requireContains(this.id, env, envName, envPath);
      }
    },
  },
  {
    id: "storage-policy-and-signed-media",
    category: "storage",
    check() {
      const storageContractPath = "scripts/qa/storage-media-contracts.mjs";
      const bucketPolicyTestPath = "src/test/storageBucketPolicies.test.ts";
      const workflowPath = "src/test/workflows/storage-media-workflow.test.ts";
      const storageContract = source(storageContractPath);
      const bucketPolicyTest = source(bucketPolicyTestPath);
      const workflow = source(workflowPath);

      for (const contractId of [
        "public-owner-prefixed-post-media",
        "public-owner-prefixed-story-media",
        "protected-chat-and-ppv-media",
        "owner-admin-store-media",
        "client-staff-documents-and-cleanup",
        "receipts-and-share-links",
      ]) {
        requireContains(this.id, storageContract, contractId, storageContractPath);
      }
      for (const needle of [
        "auth.uid()::text = (storage.foldername(name))[1]",
        "set public = false",
        "ppv_media_owner_or_unlocker_read",
        "Owner A CANNOT upload to Store B's folder",
        "await sb.storage.from(bucket).remove(paths)",
      ]) {
        requireContains(this.id, bucketPolicyTest, needle, bucketPolicyTestPath);
      }
      requireContains(this.id, workflow, "signedUrlFor(CHAT_MEDIA_BUCKET", workflowPath);
      requireContains(this.id, workflow, "createSignedUrl(receipt.pdf_path, 3600)", workflowPath);
    },
  },
  {
    id: "media-performance-and-platform-gates",
    category: "performance",
    check() {
      const packagePath = "package.json";
      const matrixPath = "scripts/qa/platform-readiness-matrix.mjs";
      const coveragePath = "scripts/qa/workflow-coverage.mjs";
      const mediaCheckPath = "scripts/performance/media-readiness-check.mjs";
      const serviceWorkerPath = "src/sw.js";
      const packageJson = source(packagePath);
      const matrix = source(matrixPath);
      const coverage = source(coveragePath);
      const mediaCheck = source(mediaCheckPath);
      const serviceWorker = source(serviceWorkerPath);

      for (const scriptName of [
        "qa:database-storage-contracts",
        "qa:storage-media-contracts",
        "test:rls",
        "perf:media-report",
        "supabase:migrations:linked:strict",
      ]) {
        requireContains(this.id, packageJson, `"${scriptName}"`, packagePath);
      }
      requireContains(this.id, packageJson, "npm run qa:database-storage-contracts", packagePath);
      requireContains(this.id, matrix, "qa:database-storage-contracts", matrixPath);
      requireContains(this.id, coverage, "qa:database-storage-contracts", coveragePath);
      for (const needle of ["img missing loading", "video missing preload policy/LazyVideo", "SmartImage", "LazyVideo"]) {
        requireContains(this.id, mediaCheck, needle, mediaCheckPath);
      }
      requireContains(this.id, serviceWorker, "supabase-storage-cache", serviceWorkerPath);
      requireContains(this.id, serviceWorker, "/storage/v1/object/public/", serviceWorkerPath);
      requireContains(this.id, serviceWorker, "new workbox.strategies.StaleWhileRevalidate", serviceWorkerPath);
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
