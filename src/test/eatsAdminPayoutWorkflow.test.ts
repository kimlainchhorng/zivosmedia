import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (file: string) =>
  readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

const baseMigration = source(
  "supabase/migrations/20260830193000_eats_manual_payout_authority.sql",
);
const reviewMigration = source(
  "supabase/migrations/20260830193500_payout_method_verification_authority.sql",
);
const methodEndpoint = source(
  "supabase/functions/payout-method-verification/index.ts",
);
const payoutEndpoint = source("supabase/functions/eats-payout-admin/index.ts");
const methodWriter = source(
  "supabase/functions/customer-payout-method-record/index.ts",
);
const page = source("src/pages/admin/AdminEatsPayoutsPage.tsx");
const app = source("src/App.tsx");
const nav = source("src/components/admin/AdminLayout.tsx");
const guard = source("src/components/auth/ProtectedRoute.tsx");
const config = source("supabase/config.toml");

function functionBody(name: string, revokePrefix: string): string {
  const start = reviewMigration.indexOf(`create or replace function ${name}`);
  const end = reviewMigration.indexOf(revokePrefix, start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return reviewMigration.slice(start, end);
}

describe("Eats admin payout workflow", () => {
  it("provides an MFA-gated role-checked and idempotent destination review", () => {
    expect(methodEndpoint).toContain("enforceAal2(authorization");
    expect(methodEndpoint).toContain('["admin", "super_admin", "finance"]');
    expect(methodEndpoint).toContain('rpc("check_user_role"');
    expect(methodEndpoint).not.toContain('rpc("has_role"');
    expect(methodEndpoint).toContain('"review_customer_payout_method"');
    expect(methodEndpoint).toContain("p_reviewer_id: authData.user.id");
    expect(methodEndpoint).toContain("p_owner_status_note: ownerStatusNote");
    expect(methodEndpoint).toContain("p_internal_evidence: internalEvidence");
    expect(methodEndpoint).toContain("withIdempotency(");
    expect(methodEndpoint).toContain("{ required: true }");
    expect(config).toContain(
      "[functions.payout-method-verification]\n    verify_jwt = true",
    );
    expect(payoutEndpoint).toContain('rpc("check_user_role"');
    expect(payoutEndpoint).not.toContain('rpc("has_role"');
  });

  it("locks and validates the exact destination with truthful audit history", () => {
    const rpc = functionBody(
      "public.review_customer_payout_method(",
      "revoke all on function public.review_customer_payout_method(",
    );
    expect(rpc).toContain("from public.customer_payout_methods as method");
    expect(rpc).toContain("for update;");
    expect(rpc).toContain("review_payout_method_incomplete_aba");
    expect(rpc).toContain("review_payout_method_incomplete_bank");
    expect(rpc).toContain("v_expected_rail := case v_method_type");
    expect(rpc).toContain("review_payout_method_rail_mismatch");
    expect(rpc).toContain("when v_decision = 'verified' then v_expected_rail");
    expect(rpc).toContain("v_old_is_verified := v_method.is_verified");
    expect(rpc).toContain(
      "v_old_verification_status := v_method.verification_status",
    );
    expect(rpc).toContain("insert into public.admin_audit_logs");
    expect(rpc).toContain("'is_verified', v_old_is_verified");
    expect(rpc).toContain("'is_verified', v_method.is_verified");
    expect(rpc).toContain("verification_note = v_owner_status_note");
    expect(rpc).toContain("'internal_evidence', v_internal_evidence");
    expect(rpc).not.toContain("'review_note', v_owner_status_note");
    expect(page).toContain("Internal verification evidence");
    expect(page).toContain("owner_status_note: cleanNote");
    expect(page).toContain("internal_evidence: cleanInternalEvidence");
  });

  it("derives a canonical rail from the destination type", () => {
    expect(methodWriter).toContain("canonicalRailByMethod");
    expect(methodWriter).toContain('aba: "aba"');
    expect(methodWriter).toContain('bank_transfer: "bank_wire"');
    expect(methodWriter).toContain('paypal: "paypal"');
    expect(methodWriter).toContain(
      "const rail = canonicalRailByMethod[methodType]",
    );
    expect(methodWriter).toContain("rail,");
    expect(methodWriter).not.toContain("rail: rail || methodType");
  });

  it("prevents deletion or revocation while a request still depends on the method", () => {
    expect(reviewMigration).toContain(
      "create or replace function private.payout_method_active_request_gate()",
    );
    expect(reviewMigration).toContain("payout_method_has_active_requests");
    expect(reviewMigration).toContain(
      "not in ('paid', 'rejected', 'cancelled', 'failed')",
    );
    expect(reviewMigration).toContain(
      "'code', 'active_payout_requests_require_resolution'",
    );
    expect(reviewMigration).toContain("'code', 'payout_destination_revoked'");
  });

  it("claims with a current-balance check, then records irreversible transfer evidence", () => {
    const rpc = functionBody(
      "public.resolve_eats_manual_payout(",
      "revoke all on function public.resolve_eats_manual_payout(",
    );
    expect(rpc).toMatch(
      /from public\.restaurants as restaurant[\s\S]{0,180}for update;[\s\S]+from public\.eats_payout_requests as request[\s\S]{0,200}for update;/,
    );
    expect(rpc).toContain("if v_decision = 'processing' then");
    expect(rpc).toContain("private.current_eats_manual_payout_balance(");
    expect(rpc).toContain("'code', 'payout_balance_changed'");
    expect(rpc).toContain("resolve_eats_payout_paid_requires_exact_claim");
    expect(rpc).toContain("v_reference is null");
    expect(rpc).toContain("when v_decision = 'paid' then v_reference");
    expect(rpc).toContain("when v_decision = 'paid' then pg_catalog.now()");
    expect(rpc).not.toMatch(
      /if v_decision in \('processing', 'paid'\) then[\s\S]{0,120}current_eats_manual_payout_balance/,
    );
    expect(payoutEndpoint).toContain('"resolve_eats_manual_payout"');
    expect(payoutEndpoint).not.toContain("fetch(");
  });

  it("supports an audited owner release and only an admin stale-claim release", () => {
    const rpc = functionBody(
      "public.resolve_eats_manual_payout(",
      "revoke all on function public.resolve_eats_manual_payout(",
    );
    expect(rpc).toContain("v_decision = 'released'");
    expect(rpc).toContain(
      "reviewer_role.role::text in ('admin', 'super_admin')",
    );
    expect(rpc).toContain("interval '30 minutes'");
    expect(rpc).toContain(
      "resolve_eats_payout_release_requires_owner_or_stale_admin",
    );
    expect(rpc).toContain("when v_decision = 'released' then 'pending'");
    expect(page).toContain("Release stale claim after confirming no transfer");
    expect(page).toContain("Release unsent claim");
  });

  it("makes request history immutable and status changes RPC-only", () => {
    expect(baseMigration).toContain(
      "eats_payout_request_resolution_rpc_required",
    );
    expect(baseMigration).toContain("eats_payout_request_history_is_immutable");
    expect(baseMigration).toContain("zivo.eats_manual_payout_resolution_rpc");
    expect(reviewMigration).toContain(
      "perform pg_catalog.set_config(\n    'zivo.eats_manual_payout_resolution_rpc'",
    );
  });

  it("keeps bank snapshots scoped to their original requester", () => {
    expect(reviewMigration).toContain(
      'drop policy if exists "restaurant owner reads own eats payout requests"',
    );
    expect(reviewMigration).toContain(
      "create or replace function public.list_own_eats_payout_requests(",
    );
    expect(reviewMigration).toContain("request.requested_by = v_user_id");
    expect(reviewMigration).toContain(
      "create or replace function public.list_own_customer_payout_methods(",
    );
    expect(reviewMigration).toContain(
      "revoke select on table public.customer_payout_methods",
    );
    expect(reviewMigration).toContain("destination_last4 text");
    expect(reviewMigration).toContain(
      "create or replace function public.list_finance_customer_payout_methods(",
    );
    expect(reviewMigration).toMatch(
      /list_finance_customer_payout_methods\([\s\S]+\(auth\.jwt\(\) ->> 'aal'\) not in \('aal2', 'aal3'\)/,
    );
    expect(reviewMigration).toMatch(
      /create policy "Finance can view Eats payout requests"[\s\S]{0,350}\(auth\.jwt\(\) ->> 'aal'\) in \('aal2', 'aal3'\)/,
    );
  });

  it("exposes the complete fail-closed workflow through an exact protected route", () => {
    expect(app).toMatch(
      /const AdminEatsPayoutsPage = lazy\(\s*\(\) => import\("\.\/pages\/admin\/AdminEatsPayoutsPage"\),?\s*\);/,
    );
    expect(app).toContain('path="/admin/finance/eats-payouts"');
    expect(app).toContain("allowFinance={true}");
    expect(nav).toContain('path: "/admin/finance/eats-payouts"');
    expect(nav).toContain('"ZIVO Finance"');
    expect(guard).toContain(
      'location.pathname !== "/admin/finance/eats-payouts"',
    );
    expect(guard).toContain("allowFinance?: boolean");
    expect(guard).toContain('roles.includes("finance")');
    expect(page).toContain("PAGE_SIZE = 250");
    expect(page).toContain("MAX_PAGES = 100");
    expect(page).toContain('queryKey: ["admin-payout-method-reviews"]');
    expect(page).toContain("loadAllFinancePayoutMethods()");
    expect(page).toContain('enabled: sensitiveAccess === "granted"');
    expect(page).toContain("Complete two-factor verification");
    expect(page).toContain("staleClaim && isAdminReviewer");
    expect(page).toContain('"payout-method-verification"');
    expect(page).toContain('"eats-payout-admin"');
    expect(page).toContain("This screen never initiates a bank transfer.");
  });
});
