import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("database, storage, and media readiness workflow", () => {
  it("wires the database-storage contract into platform audit and generated readiness reports", () => {
    const packageJson = read("package.json");
    const matrix = read("scripts/qa/platform-readiness-matrix.mjs");
    const coverage = read("scripts/qa/workflow-coverage.mjs");
    const contract = read("scripts/qa/database-storage-contracts.mjs");

    expect(packageJson).toContain('"qa:database-storage-contracts"');
    expect(packageJson).toContain("npm run qa:database-storage-contracts");
    expect(matrix).toContain("npm run qa:database-storage-contracts");
    expect(coverage).toContain("qa:database-storage-contracts");

    for (const contractId of [
      "supabase-data-api-grants-and-rls",
      "postgres-upgrade-and-graphql-readiness",
      "migration-secret-and-runtime-settings",
      "storage-policy-and-signed-media",
      "media-performance-and-platform-gates",
    ]) {
      expect(contract).toContain(contractId);
    }
  });

  it("keeps Supabase Data API exposure checks paired with RLS and grant coverage", () => {
    const readiness = read("scripts/supabase/database-upgrade-readiness.mjs");
    const driftAudit = read("scripts/supabase/audit-migration-drift.mjs");
    const grantTest = read("src/test/rls/dataApiGrantCoverage.test.ts");

    expect(readiness).toContain('const dataApiGrantReviewVersion = "20260428000000"');
    expect(readiness).toContain("Recent public tables needing Data API grant review");
    expect(readiness).toContain("where table_schema = 'public' and grantee in ('anon', 'authenticated')");
    expect(readiness).toContain("enable RLS and add explicit grants");

    expect(driftAudit).toContain("creates_table_without_rls");
    expect(driftAudit).toContain("creates_table_without_grant");
    expect(driftAudit).toContain("sequence_backed_id_without_sequence_grant");

    expect(grantTest).toContain("keeps legal and policy tables grantable only through explicit Data API grants");
    expect(grantTest).toContain("keeps pending migration drift gates checking RLS and grants together");
  });

  it("keeps Postgres upgrade, view security, and privileged function checks visible", () => {
    const readiness = read("scripts/supabase/database-upgrade-readiness.mjs");
    const report = read("docs/database-upgrade-readiness-report.md");

    expect(readiness).toContain("pg17UnsupportedExtensions");
    expect(readiness).toContain("extractViewRisks");
    expect(readiness).toContain("security_invoker");
    expect(readiness).toContain("extractSecurityDefinerRisks");
    expect(readiness).toContain("set\\s+search_path");

    expect(report).toContain("Postgres 17 unsupported extensions found: 0");
    expect(report).toContain("Views needing security_invoker review: 0");
    expect(report).toContain("SECURITY DEFINER files needing search_path review: 0");
    expect(report).toContain("select extname, extversion from pg_extension order by extname;");
  });

  it("keeps migration runtime settings and secret-token scanners protecting cron/function SQL", () => {
    const readiness = read("scripts/supabase/database-upgrade-readiness.mjs");
    const runtime = read("scripts/supabase/runtime-settings-sql.mjs");
    const envPreflight = read("scripts/deploy/env-preflight.mjs");

    expect(readiness).toContain("extractHardcodedSupabaseUrls");
    expect(readiness).toContain("extractHardcodedSupabaseAnonJwts");
    expect(readiness).toContain("Token values are intentionally not printed");
    expect(readiness).toContain("current_setting('app.settings.supabase_url', true)");
    expect(readiness).toContain("current_setting('app.settings.supabase_anon_key', true)");

    expect(runtime).toContain("app.settings.supabase_url");
    expect(runtime).toContain("app.settings.supabase_anon_key");
    expect(runtime).toContain("Refusing to use a Supabase secret/service_role key");

    for (const envName of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_ACCESS_TOKEN"]) {
      expect(envPreflight).toContain(envName);
    }
  });

  it("keeps storage policies, signed media, and CDN/media performance gates together", () => {
    const storageContracts = read("scripts/qa/storage-media-contracts.mjs");
    const storagePolicyTest = read("src/test/storageBucketPolicies.test.ts");
    const workflow = read("src/test/workflows/storage-media-workflow.test.ts");
    const mediaCheck = read("scripts/performance/media-readiness-check.mjs");
    const serviceWorker = read("src/sw.js");

    expect(storageContracts).toContain("public-owner-prefixed-post-media");
    expect(storageContracts).toContain("protected-chat-and-ppv-media");
    expect(storageContracts).toContain("owner-admin-store-media");
    expect(storageContracts).toContain("receipts-and-share-links");

    expect(storagePolicyTest).toContain("Owner A CANNOT upload to Store B's folder");
    expect(storagePolicyTest).toContain("await sb.storage.from(bucket).remove(paths)");
    expect(workflow).toContain("chat_media_insert_authenticated");
    expect(workflow).toContain("createSignedUrl(receipt.pdf_path, 3600)");

    expect(mediaCheck).toContain("img missing loading");
    expect(mediaCheck).toContain("video missing preload policy/LazyVideo");
    expect(serviceWorker).toContain("supabase-storage-cache");
    expect(serviceWorker).toContain("/storage/v1/object/public/");
  });
});
