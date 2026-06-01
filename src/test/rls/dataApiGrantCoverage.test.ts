import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("Data API grant coverage guard", () => {
  it("keeps upgrade readiness checking explicit grants for anon and authenticated roles", () => {
    const readiness = read("scripts/supabase/database-upgrade-readiness.mjs");
    const report = read("docs/database-upgrade-readiness-report.md");
    const matrix = read("scripts/qa/platform-readiness-matrix.mjs");

    expect(readiness).toContain("dataApiGrantReview");
    expect(readiness).toContain("Recent public tables needing Data API grant review");
    expect(readiness).toContain("information_schema.role_table_grants");
    expect(readiness).toContain("grantee in ('anon', 'authenticated')");
    expect(readiness).toContain("enable RLS and add explicit grants");

    expect(report).toMatch(/- Recent public tables needing Data API grant review: \d+/);
    expect(report).toContain("## Data API Grant Review Candidates");
    expect(report).toContain("where table_schema = 'public' and grantee in ('anon', 'authenticated')");

    expect(matrix).toContain("src/test/rls/dataApiGrantCoverage.test.ts");
  });

  it("keeps legal and policy tables grantable only through explicit Data API grants", () => {
    const grants = read("supabase/migrations/20260531183402_legal_policy_data_api_grants.sql");
    const legalRls = read("supabase/migrations/20260203154129_83f7dd56-1556-4b57-a38f-812225923eb0.sql");
    const policyVersions = read("supabase/migrations/20260203151534_5523d0a6-049c-4116-b10f-b4aa49688c97.sql");
    const userConsents = read("supabase/migrations/20260425214912_ee44c2d6-1039-43b3-9982-c515012cb92c.sql");

    expect(grants).toContain("grant usage on schema public to anon, authenticated");
    for (const publicTable of ["legal_policies", "role_terms", "seller_of_travel_status", "policy_versions"]) {
      expect(grants).toContain(`grant select on table public.${publicTable} to anon, authenticated;`);
    }

    for (const userOwnedTable of ["user_consent_logs", "role_terms_acceptance"]) {
      expect(grants).toContain(`grant select, insert on table public.${userOwnedTable} to authenticated;`);
      expect(legalRls).toMatch(new RegExp(`ALTER TABLE public\\.${userOwnedTable} ENABLE ROW LEVEL SECURITY`, "i"));
    }

    expect(grants).toContain("grant select, insert, update on table public.policy_consents to authenticated;");
    expect(grants).toContain("grant select, insert, update on table public.user_consents to authenticated;");
    expect(policyVersions).toMatch(/ALTER TABLE public\.policy_consents ENABLE ROW LEVEL SECURITY/i);
    expect(userConsents).toMatch(/ALTER TABLE public\.user_consents ENABLE ROW LEVEL SECURITY/i);
  });

  it("keeps role workflow and training tables explicit for authenticated app access", () => {
    const roleGrants = read("supabase/migrations/20260531184042_role_workflow_data_api_grants.sql");
    const trainingGrants = read("supabase/migrations/20260531203000_store_training_data_api_grants.sql");
    const storeProfilesGate = read("supabase/migrations/20260601140000_store_profiles_server_gate.sql");
    const storeEmployeesGate = read("supabase/migrations/20260601141500_store_employees_server_gate.sql");
    const employeeShiftsGate = read("supabase/migrations/20260601143000_employee_shifts_server_gate.sql");
    const employeeRulesGate = read("supabase/migrations/20260601144500_employee_rules_server_gate.sql");
    const employeeWorkflow = read("supabase/migrations/20260506220000_employee_workflow.sql");

    expect(roleGrants).toContain("grant usage on schema public to anon, authenticated");
    expect(roleGrants).toContain("grant select on table public.store_profiles to anon, authenticated;");
    expect(roleGrants).toContain("grant select on table public.store_products to anon, authenticated;");
    expect(roleGrants).toContain("grant select, insert, update on table public.store_orders to authenticated;");

    for (const teamTable of [
      "store_employees",
      "store_employee_invites",
      "employee_shifts",
      "employee_rules",
      "employee_rule_acknowledgements",
    ]) {
      expect(roleGrants).toContain(`public.${teamTable}`);
      expect(roleGrants).toContain("to authenticated;");
      expect(roleGrants).toContain(`grant all privileges on table public.${teamTable} to service_role;`);
    }

    expect(storeProfilesGate).toContain("Store profile inserts require trusted server-side validation");
    expect(storeProfilesGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_profiles FROM authenticated");
    expect(storeProfilesGate).toContain("GRANT SELECT ON TABLE public.store_profiles TO anon, authenticated");
    expect(storeEmployeesGate).toContain("Store employees inserts require trusted server-side validation");
    expect(storeEmployeesGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_employees FROM authenticated");
    expect(employeeShiftsGate).toContain("Employee shifts inserts require trusted server-side validation");
    expect(employeeShiftsGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.employee_shifts FROM authenticated");
    expect(employeeRulesGate).toContain("Employee rules inserts require trusted server-side validation");
    expect(employeeRulesGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.employee_rules FROM authenticated");
    expect(employeeWorkflow).toContain("ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY");
    expect(employeeWorkflow).toContain("ALTER TABLE public.employee_rules ENABLE ROW LEVEL SECURITY");
    expect(employeeWorkflow).toContain("ALTER TABLE public.employee_rule_acknowledgements ENABLE ROW LEVEL SECURITY");

    expect(trainingGrants).toContain("grant usage on schema public to authenticated");
    for (const trainingTable of [
      "store_training_programs",
      "store_training_modules",
      "store_training_assignments",
      "store_employee_rules",
    ]) {
      expect(trainingGrants).toContain(`grant select, insert, update, delete on table public.${trainingTable} to authenticated;`);
      expect(trainingGrants).toContain(`grant all privileges on table public.${trainingTable} to service_role;`);
    }
  });

  it("keeps referral and provider webhook event tables explicitly grantable", () => {
    const grants = read("supabase/migrations/20260601154700_data_api_grants_referrals_and_webhook_events.sql");
    const referrals = read("supabase/migrations/20260601114500_share_to_earn_server_gate.sql");
    const webhooks = read("supabase/migrations/20260601154600_payment_provider_webhook_event_logs.sql");

    for (const tableName of [
      "user_referral_codes",
      "referral_shares",
      "referral_conversions",
      "eats_paypal_webhook_events",
      "eats_square_webhook_events",
      "tip_paypal_webhook_events",
      "tip_square_webhook_events",
    ]) {
      expect(grants).toContain(`GRANT SELECT ON TABLE public.${tableName} TO authenticated;`);
    }

    for (const tableName of [
      "user_referral_codes",
      "referral_shares",
      "referral_conversions",
    ]) {
      expect(referrals).toContain(`ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY`);
    }

    for (const tableName of [
      "eats_paypal_webhook_events",
      "eats_square_webhook_events",
      "tip_paypal_webhook_events",
      "tip_square_webhook_events",
    ]) {
      expect(webhooks).toContain(`ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY`);
      expect(webhooks).toContain(`ON public.${tableName} FOR SELECT TO authenticated`);
    }
  });

  it("keeps public catalog grants broad but PII grants narrowed by column", () => {
    const recentGrants = read("supabase/migrations/20260531142721_data_api_grants_recent_public_tables.sql");
    const carRentalPii = read("supabase/migrations/20260529170500_car_rental_pii_column_grants.sql");
    const secureReservation = read("supabase/migrations/20260529170001_car_rental_secure_reservation_access.sql");

    for (const publicCatalogTable of [
      "salon_services",
      "salon_stylists",
      "cafe_menu_items",
      "cafe_categories",
      "car_rental_locations",
      "car_rental_vehicles",
      "car_dealership_vehicles",
    ]) {
      expect(recentGrants).toContain(`grant select on table public.${publicCatalogTable} to anon;`);
    }

    expect(recentGrants).toContain("grant insert on table public.car_rental_customers to anon;");
    expect(recentGrants).toContain("grant update on table public.car_rental_reservations to anon;");

    expect(carRentalPii).toContain("revoke select on public.car_rental_reservations from anon;");
    expect(carRentalPii).toContain("grant select (");
    for (const allowedColumn of [
      "id",
      "store_id",
      "vehicle_id",
      "pickup_at",
      "dropoff_at",
      "status",
      "confirmation_code",
      "payment_status",
    ]) {
      expect(carRentalPii).toContain(allowedColumn);
    }
    expect(carRentalPii).not.toContain("stripe");
    expect(carRentalPii).not.toContain("email");
    expect(carRentalPii).not.toContain("phone");

    expect(secureReservation).toContain("remove the broad anon row policies entirely");
    expect(secureReservation).toContain("SECURITY DEFINER RPCs");
    expect(secureReservation).toContain("get_car_rental_reservation_by_code");
  });

  it("keeps pending migration drift gates checking RLS and grants together", () => {
    const driftAudit = read("scripts/supabase/audit-migration-drift.mjs");
    const pendingReview = read("docs/supabase-migration-pending-local-review.csv");
    const apiReadiness = read("scripts/security/api-readiness-check.mjs");

    expect(driftAudit).toContain("creates_table_without_rls");
    expect(driftAudit).toContain("creates_table_without_grant");
    expect(driftAudit).toContain("sequence_backed_id_without_sequence_grant");
    expect(driftAudit).toContain("Pending local creates tables without RLS");

    expect(pendingReview).toContain("creates_table_without_rls");
    expect(pendingReview).toContain("creates_table_without_grant");
    expect(pendingReview).toContain("sequence_backed_id_without_sequence_grant");

    expect(apiReadiness).toContain("pending-local-table-without-rls");
    expect(apiReadiness).toContain("pendingCreatesTablesWithoutGrants");
  });
});
