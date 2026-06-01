#!/usr/bin/env node
/**
 * Client, staff, and employee workflow contract check.
 *
 * Verifies invite acceptance, owner-only staff invites, staff schedule reads,
 * payroll/rule boundaries, workspace-scoped training, and salon client RLS.
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

function requireNotMatch(id, text, pattern, relativePath) {
  if (pattern.test(text)) {
    failures.push(`${id}: ${relativePath} must not match ${pattern}`);
  }
}

const contracts = [
  {
    id: "employee-invite-acceptance",
    category: "auth",
    check() {
      const appPath = "src/App.tsx";
      const acceptPath = "src/pages/auth/AcceptInvitePage.tsx";
      const inviteMigrationPath = "supabase/migrations/20260428032513_d1827e5d-276e-4738-bf5f-7cbfee35c8a4.sql";
      const app = source(appPath);
      const acceptInvite = source(acceptPath);
      const inviteMigration = source(inviteMigrationPath);

      for (const needle of ['path="/auth/accept-invite"', 'path="/personal-dashboard"']) {
        requireContains(this.id, app, needle, appPath);
      }
      for (const needle of [
        "claim_employee_invite",
        'from "@/lib/authRedirect"',
        'withRedirectParam("/login", inviteReturnPath)',
        'navigate("/personal-dashboard")',
      ]) {
        requireContains(this.id, acceptInvite, needle, acceptPath);
      }
      requireNotMatch(this.id, acceptInvite, /\/auth\?next=/, acceptPath);
      for (const needle of [
        "CREATE TABLE IF NOT EXISTS public.store_employee_invites",
        "token text NOT NULL UNIQUE",
        "SECURITY DEFINER",
        "v_uid uuid := auth.uid()",
        "SET user_id = v_uid",
        "accepted_by = v_uid",
        "GRANT EXECUTE ON FUNCTION public.claim_employee_invite(text) TO authenticated",
      ]) {
        requireContains(this.id, inviteMigration, needle, inviteMigrationPath);
      }
    },
  },
  {
    id: "owner-only-employee-invites",
    category: "authorization",
    check() {
      const employeeSectionPath = "src/components/admin/store/StoreEmployeesSection.tsx";
      const emailInvitePath = "supabase/functions/send-employee-email-invite/index.ts";
      const smsInvitePath = "supabase/functions/send-employee-sms-invite/index.ts";
      const employeeSection = source(employeeSectionPath);
      const emailInvite = source(emailInvitePath);
      const smsInvite = source(smsInvitePath);

      for (const needle of [
        "send-employee-email-invite",
        "send-employee-sms-invite",
        "store_employees",
        "invite_email",
        "invite_sms",
      ]) {
        requireContains(this.id, employeeSection, needle, employeeSectionPath);
      }

      for (const [relativePath, text] of [[emailInvitePath, emailInvite], [smsInvitePath, smsInvite]]) {
        for (const needle of [
          "withSecurity(",
          "strictCors: true",
          "authHeader",
          "unauthenticated",
          '.from("store_employees")',
          '.from("store_profiles")',
          "store.owner_id !== user.id",
          "not_store_owner",
          '.from("store_employee_invites")',
          "/auth/accept-invite?token=",
        ]) {
          requireContains(this.id, text, needle, relativePath);
        }
      }

      requireContains(this.id, smsInvite, "rate_limited", smsInvitePath);
      requireContains(this.id, emailInvite, "send-transactional-email", emailInvitePath);
    },
  },
  {
    id: "staff-schedule-read-owner-write",
    category: "schedule",
    check() {
      const schedulePath = "src/pages/app/shop/ShopEmployeeSchedulePage.tsx";
      const personalDashboardPath = "src/pages/app/PersonalDashboard.tsx";
      const workflowMigrationPath = "supabase/migrations/20260506220000_employee_workflow.sql";
      const schedulePage = source(schedulePath);
      const personalDashboard = source(personalDashboardPath);
      const workflowMigration = source(workflowMigrationPath);

      for (const needle of [
        '.from("store_profiles")',
        '.eq("owner_id", uid)',
        '.from("employee_shifts")',
        '.from("store_employees")',
      ]) {
        requireContains(this.id, schedulePage, needle, schedulePath);
      }

      for (const needle of [
        "personal-dashboard-schedule",
        "schedule_data_${empRecord!.store_id}",
        "app_settings",
        "store_employees",
      ]) {
        requireContains(this.id, personalDashboard, needle, personalDashboardPath);
      }

      for (const needle of [
        "ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY",
        "Store owners can view shifts",
        "store_profiles.owner_id = auth.uid()",
        "store_employees.user_id = auth.uid()",
        "Store owners can insert shifts",
        "Store owners can update shifts",
        "Store owners can delete shifts",
      ]) {
        requireContains(this.id, workflowMigration, needle, workflowMigrationPath);
      }
    },
  },
  {
    id: "payroll-rules-role-boundaries",
    category: "payroll",
    check() {
      const payrollPath = "src/pages/app/shop/ShopPayrollPage.tsx";
      const payrollUpdatePath = "supabase/functions/store-payroll-config-update/index.ts";
      const payrollGatePath = "supabase/migrations/20260601223000_store_payroll_configs_server_gate.sql";
      const rulesPath = "src/pages/app/shop/ShopEmployeeRulesPage.tsx";
      const hardeningPath = "supabase/migrations/20260522012300_database_security_forward_hardening.sql";
      const workflowMigrationPath = "supabase/migrations/20260506220000_employee_workflow.sql";
      const payrollPage = source(payrollPath);
      const payrollUpdate = source(payrollUpdatePath);
      const payrollGate = source(payrollGatePath);
      const rulesPage = source(rulesPath);
      const hardening = source(hardeningPath);
      const workflowMigration = source(workflowMigrationPath);

      for (const needle of [
        '.eq("owner_id", uid)',
        "store_payroll_configs",
        "get_employee_payroll_summary",
        "get_merchant_roi",
        'functions.invoke("store-payroll-config-update"',
      ]) {
        requireContains(this.id, payrollPage, needle, payrollPath);
      }
      requireContains(this.id, payrollUpdate, 'withSecurity("store-payroll-config-update"', payrollUpdatePath);
      requireContains(this.id, payrollUpdate, 'allowedMethods: ["POST"]', payrollUpdatePath);
      requireContains(this.id, payrollUpdate, "admin.auth.getUser(token)", payrollUpdatePath);
      requireContains(this.id, payrollUpdate, '.from("store_payroll_configs")', payrollUpdatePath);
      requireContains(this.id, payrollUpdate, '.from("store_profiles")', payrollUpdatePath);
      requireContains(this.id, payrollUpdate, 'rpc("has_role"', payrollUpdatePath);

      for (const needle of [
        "ALTER TABLE IF EXISTS public.store_payroll_configs ENABLE ROW LEVEL SECURITY",
        "Store owners can read payroll configs",
        "Store owners can upsert payroll configs",
        "Store owners can update payroll configs",
        "s.owner_id = auth.uid()",
      ]) {
        requireContains(this.id, hardening, needle, hardeningPath);
      }
      requireContains(this.id, payrollGate, "Store payroll config inserts require trusted server-side validation", payrollGatePath);
      requireContains(this.id, payrollGate, "Store payroll config updates require trusted server-side validation", payrollGatePath);
      requireContains(this.id, payrollGate, "REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_payroll_configs FROM authenticated", payrollGatePath);

      requireContains(this.id, rulesPage, "employee_rules", rulesPath);
      requireContains(this.id, rulesPage, "employee_rule_acknowledgements", rulesPath);
      for (const needle of ["Team can view rules", "Employees can ack their own rules", "Owner can clear acks"]) {
        requireContains(this.id, workflowMigration, needle, workflowMigrationPath);
      }
    },
  },
  {
    id: "training-rules-workspace-scoping",
    category: "training",
    check() {
      const programsPath = "src/hooks/store/useStoreTrainingPrograms.ts";
      const rulesPath = "src/hooks/store/useStoreEmployeeRules.ts";
      const assignmentsPath = "src/hooks/store/useStoreTrainingAssignments.ts";
      const trainingManagePath = "supabase/functions/store-training-program-manage/index.ts";
      const assignmentManagePath = "supabase/functions/store-training-assignment-manage/index.ts";
      const trainingMigrationPath = "supabase/migrations/20260427211111_41d7872d-ee9a-4b9f-a298-7e770cd3285c.sql";
      const trainingGatePath = "supabase/migrations/20260601220000_store_training_programs_server_gate.sql";
      const assignmentGatePath = "supabase/migrations/20260601221500_store_training_assignments_server_gate.sql";
      const rulesMigrationPath = "supabase/migrations/20260427210158_2cdfdd02-142b-473c-a4b7-ec66b3de24a9.sql";
      const grantsPath = "supabase/migrations/20260531203000_store_training_data_api_grants.sql";
      const programs = source(programsPath);
      const rules = source(rulesPath);
      const assignments = source(assignmentsPath);
      const trainingManage = source(trainingManagePath);
      const assignmentManage = source(assignmentManagePath);
      const ruleManage = source("supabase/functions/employee-rule-manage/index.ts");
      const trainingMigration = source(trainingMigrationPath);
      const trainingGate = source(trainingGatePath);
      const assignmentGate = source(assignmentGatePath);
      const ruleGate = source("supabase/migrations/20260601240000_store_employee_rules_server_gate.sql");
      const rulesMigration = source(rulesMigrationPath);
      const grants = source(grantsPath);

      requireContains(this.id, programs, 'functions.invoke("store-training-program-manage"', programsPath);
      requireContains(this.id, trainingManage, 'withSecurity("store-training-program-manage"', trainingManagePath);
      requireContains(this.id, trainingManage, 'allowedMethods: ["POST"]', trainingManagePath);
      requireContains(this.id, trainingManage, "admin.auth.getUser(token)", trainingManagePath);
      requireContains(this.id, trainingManage, '.from("store_training_programs")', trainingManagePath);
      requireContains(this.id, trainingManage, '.from("store_training_modules")', trainingManagePath);
      requireContains(this.id, trainingManage, '.from("store_profiles")', trainingManagePath);
      requireContains(this.id, trainingManage, 'rpc("has_role"', trainingManagePath);
      requireContains(this.id, rules, 'functions.invoke("employee-rule-manage"', rulesPath);
      requireContains(this.id, rules, 'rulebook: "store_employee_rules"', rulesPath);
      requireNotMatch(this.id, rules, /from\("store_employee_rules"\)[\s\S]{0,320}\.(insert|update|delete|upsert)/, rulesPath);
      requireContains(this.id, ruleManage, 'body.rulebook === "store_employee_rules"', "supabase/functions/employee-rule-manage/index.ts");
      requireContains(this.id, ruleManage, '.from("store_employee_rules")', "supabase/functions/employee-rule-manage/index.ts");
      requireContains(this.id, ruleManage, "cleanStoreEmployeeRules", "supabase/functions/employee-rule-manage/index.ts");
      requireContains(this.id, assignments, 'functions.invoke("store-training-assignment-manage"', assignmentsPath);
      requireContains(this.id, assignments, '.eq("program_id", programId!)', assignmentsPath);
      requireContains(this.id, assignmentManage, 'withSecurity("store-training-assignment-manage"', assignmentManagePath);
      requireContains(this.id, assignmentManage, 'allowedMethods: ["POST"]', assignmentManagePath);
      requireContains(this.id, assignmentManage, "admin.auth.getUser(token)", assignmentManagePath);
      requireContains(this.id, assignmentManage, '.from("store_training_assignments")', assignmentManagePath);
      requireContains(this.id, assignmentManage, '.from("store_training_programs")', assignmentManagePath);
      requireContains(this.id, assignmentManage, '.from("store_employees")', assignmentManagePath);
      requireContains(this.id, assignmentManage, '.from("store_profiles")', assignmentManagePath);
      requireContains(this.id, assignmentManage, 'rpc("has_role"', assignmentManagePath);

      for (const needle of [
        "ALTER TABLE public.store_training_programs ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE public.store_training_modules ENABLE ROW LEVEL SECURITY",
        "ALTER TABLE public.store_training_assignments ENABLE ROW LEVEL SECURITY",
        "Managers can manage training assignments",
      ]) {
        requireContains(this.id, trainingMigration, needle, trainingMigrationPath);
      }

      requireContains(this.id, rulesMigration, "ALTER TABLE public.store_employee_rules ENABLE ROW LEVEL SECURITY", rulesMigrationPath);
      requireContains(this.id, rulesMigration, "public.is_lodge_store_manager(store_id, auth.uid())", rulesMigrationPath);
      requireContains(this.id, ruleGate, "Store employee rules inserts require trusted server-side validation", "supabase/migrations/20260601240000_store_employee_rules_server_gate.sql");
      requireContains(this.id, ruleGate, "Store employee rules updates require trusted server-side validation", "supabase/migrations/20260601240000_store_employee_rules_server_gate.sql");
      requireContains(this.id, ruleGate, "Store employee rules deletes require trusted server-side validation", "supabase/migrations/20260601240000_store_employee_rules_server_gate.sql");
      requireContains(this.id, ruleGate, "REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_employee_rules FROM authenticated", "supabase/migrations/20260601240000_store_employee_rules_server_gate.sql");
      requireContains(this.id, trainingGate, "Store training program inserts require trusted server-side validation", trainingGatePath);
      requireContains(this.id, trainingGate, "Store training module inserts require trusted server-side validation", trainingGatePath);
      requireContains(this.id, trainingGate, "REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_training_programs FROM authenticated", trainingGatePath);
      requireContains(this.id, trainingGate, "REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_training_modules FROM authenticated", trainingGatePath);
      requireContains(this.id, assignmentGate, "Store training assignment inserts require trusted server-side validation", assignmentGatePath);
      requireContains(this.id, assignmentGate, "Store training assignment updates require trusted server-side validation", assignmentGatePath);
      requireContains(this.id, assignmentGate, "Store training assignment deletes require trusted server-side validation", assignmentGatePath);
      requireContains(this.id, assignmentGate, "REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_training_assignments FROM authenticated", assignmentGatePath);

      for (const tableName of [
        "store_training_programs",
        "store_training_modules",
        "store_training_assignments",
        "store_employee_rules",
      ]) {
        requireContains(
          this.id,
          grants,
          `grant select, insert, update, delete on table public.${tableName} to authenticated;`,
          grantsPath,
        );
      }
    },
  },
  {
    id: "salon-client-owner-user-scoping",
    category: "clients",
    check() {
      const salonClientsPath = "src/components/admin/store/salon/SalonClientsSection.tsx";
      const clientsHookPath = "src/hooks/salon/useSalonClients.ts";
      const salonClientsMigrationPath = "supabase/migrations/20260524040000_salon_clients.sql";
      const publicBookingSecurityPath = "supabase/migrations/20260524110000_salon_public_booking_security.sql";
      const salonClients = source(salonClientsPath);
      const clientsHook = source(clientsHookPath);
      const salonClientsMigration = source(salonClientsMigrationPath);
      const publicBookingSecurity = source(publicBookingSecurityPath);

      requireContains(this.id, salonClients, "useSalonClients", salonClientsPath);
      requireContains(this.id, salonClients, "storeId", salonClientsPath);
      for (const needle of ["salon_clients", "store_id", '.eq("store_id", storeId)']) {
        requireContains(this.id, clientsHook, needle, clientsHookPath);
      }

      for (const needle of [
        "ALTER TABLE public.salon_clients ENABLE ROW LEVEL SECURITY",
        "Owners manage their clients - select",
        "Owners manage their clients - insert",
        "Owners manage their clients - update",
        "Owners manage their clients - delete",
        "sp.owner_id = (SELECT auth.uid())",
        "Clients can view their own row",
      ]) {
        requireContains(this.id, salonClientsMigration, needle, salonClientsMigrationPath);
      }

      for (const needle of ["client_id", "created_by_user_id", "NEW.client_id := NULL", "NEW.created_by_user_id := NULL"]) {
        requireContains(this.id, publicBookingSecurity, needle, publicBookingSecurityPath);
      }
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
