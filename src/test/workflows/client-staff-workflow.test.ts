import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("client, staff, and employee workflow", () => {
  it("wires the client/staff contract gate into platform audit", () => {
    const contract = read("scripts/qa/client-staff-contracts.mjs");
    const workflowCoverage = read("scripts/qa/workflow-coverage.mjs");
    const packageJson = read("package.json");

    for (const contractId of [
      "employee-invite-acceptance",
      "owner-only-employee-invites",
      "staff-schedule-read-owner-write",
      "payroll-rules-role-boundaries",
      "training-rules-workspace-scoping",
      "salon-client-owner-user-scoping",
    ]) {
      expect(contract).toContain(contractId);
    }

    expect(workflowCoverage).toContain("qa:client-staff-contracts");
    expect(packageJson).toContain('"qa:client-staff-contracts": "node scripts/qa/client-staff-contracts.mjs"');
    expect(packageJson).toContain("npm run qa:client-staff-contracts");
  });

  it("keeps invite acceptance authenticated and routed to the workplace", () => {
    const app = read("src/App.tsx");
    const acceptInvite = read("src/pages/auth/AcceptInvitePage.tsx");
    const employeeInviteTemplate = read("supabase/functions/_shared/transactional-email-templates/employee-invite.tsx");
    const adminEmployees = read("src/pages/admin/AdminEmployeesPage.tsx");
    const contract = read("scripts/qa/client-staff-contracts.mjs");
    const inviteMigration = read(
      "supabase/migrations/20260428032513_d1827e5d-276e-4738-bf5f-7cbfee35c8a4.sql",
    );

    expect(app).toContain('path="/auth/accept-invite"');
    expect(app).toContain('path="/personal-dashboard"');
    expect(acceptInvite).toContain("claim_employee_invite");
    expect(acceptInvite).toContain('from "@/lib/authRedirect"');
    expect(acceptInvite).toContain('withRedirectParam("/login", inviteReturnPath)');
    expect(acceptInvite).not.toContain("/auth?next=");
    expect(acceptInvite).toContain("navigate(\"/personal-dashboard\")");
    expect(contract).toContain('withRedirectParam("/login", inviteReturnPath)');
    expect(contract).not.toContain('"/auth?next="');
    expect(employeeInviteTemplate).toContain("https://zivollc.com/login?redirect=%2Fpersonal-dashboard");
    expect(employeeInviteTemplate).not.toContain("https://zivollc.com/auth");
    expect(adminEmployees).toContain('const ADMIN_EMPLOYEE_LOGIN_URL = "https://zivollc.com/login?redirect=%2Fpersonal-dashboard";');
    expect(adminEmployees).not.toContain("https://zivollc.com/auth");

    expect(inviteMigration).toContain("CREATE TABLE IF NOT EXISTS public.store_employee_invites");
    expect(inviteMigration).toContain("token text NOT NULL UNIQUE");
    expect(inviteMigration).toContain("SECURITY DEFINER");
    expect(inviteMigration).toContain("v_uid uuid := auth.uid()");
    expect(inviteMigration).toContain("SET user_id = v_uid");
    expect(inviteMigration).toContain("accepted_by = v_uid");
    expect(inviteMigration).toContain("GRANT EXECUTE ON FUNCTION public.claim_employee_invite(text) TO authenticated");
  });

  it("requires store ownership before sending employee invites", () => {
    const employeeSection = read("src/components/admin/store/StoreEmployeesSection.tsx");
    const employeeManage = read("supabase/functions/store-employee-manage/index.ts");
    const employeeGate = read("supabase/migrations/20260601141500_store_employees_server_gate.sql");
    const emailInvite = read("supabase/functions/send-employee-email-invite/index.ts");
    const smsInvite = read("supabase/functions/send-employee-sms-invite/index.ts");

    expect(employeeSection).toContain("send-employee-email-invite");
    expect(employeeSection).toContain("send-employee-sms-invite");
    expect(employeeSection).toContain("store_employees");
    expect(employeeSection).toContain('functions.invoke("store-employee-manage"');
    expect(employeeSection).not.toContain('from("store_employees").update');
    expect(employeeSection).not.toContain('from("store_employees").insert');
    expect(employeeSection).not.toContain('from("store_employees").delete');
    expect(employeeSection).toContain("invite_email");
    expect(employeeSection).toContain("invite_sms");
    expect(employeeManage).toContain('withSecurity("store-employee-manage"');
    expect(employeeManage).toContain("strictCors: true");
    expect(employeeManage).toContain("admin.auth.getUser(token)");
    expect(employeeManage).toContain('.from("store_employees")');
    expect(employeeManage).toContain('.from("store_profiles")');
    expect(employeeManage).toContain('rpc("has_role"');
    expect(employeeGate).toContain("Store employees updates require trusted server-side validation");
    expect(employeeGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_employees FROM authenticated");

    for (const source of [emailInvite, smsInvite]) {
      expect(source).toContain('allowedMethods: ["POST"]');
      expect(source).toContain("authHeader");
      expect(source).toContain("unauthenticated");
      expect(source).toContain(".from(\"store_employees\")");
      expect(source).toContain(".from(\"store_profiles\")");
      expect(source).toContain("store.owner_id !== user.id");
      expect(source).toContain("not_store_owner");
      expect(source).toContain(".from(\"store_employee_invites\")");
      expect(source).toContain("/auth/accept-invite?token=");
    }

    expect(smsInvite).toContain("rate_limited");
    expect(emailInvite).toContain("send-transactional-email");
  });

  it("keeps staff schedule reads separate from owner schedule writes", () => {
    const schedulePage = read("src/pages/app/shop/ShopEmployeeSchedulePage.tsx");
    const personalSchedule = read("src/pages/app/personal/PersonalSchedulePage.tsx");
    const shiftManage = read("supabase/functions/employee-shift-manage/index.ts");
    const shiftGate = read("supabase/migrations/20260601143000_employee_shifts_server_gate.sql");
    const travelSupport = read("supabase/functions/travel-support-submit/index.ts");
    const travelGate = read("supabase/migrations/20260601050000_travel_support_server_gate.sql");
    const personalDashboard = read("src/pages/app/PersonalDashboard.tsx");
    const workflowMigration = read("supabase/migrations/20260506220000_employee_workflow.sql");

    expect(schedulePage).toContain(".from(\"store_profiles\")");
    expect(schedulePage).toContain(".eq(\"owner_id\", uid)");
    expect(schedulePage).toContain(".from(\"employee_shifts\")");
    expect(schedulePage).toContain(".from(\"store_employees\")");
    expect(schedulePage).toContain('functions.invoke("employee-shift-manage"');
    expect(schedulePage).not.toContain('from("employee_shifts").insert');
    expect(schedulePage).not.toContain('from("employee_shifts").delete');
    expect(shiftManage).toContain('withSecurity("employee-shift-manage"');
    expect(shiftManage).toContain("strictCors: true");
    expect(shiftManage).toContain("admin.auth.getUser(token)");
    expect(shiftManage).toContain('.from("employee_shifts")');
    expect(shiftManage).toContain('.from("store_profiles")');
    expect(shiftManage).toContain('.from("store_employees")');
    expect(shiftManage).toContain('rpc("has_role"');
    expect(shiftGate).toContain("Employee shifts inserts require trusted server-side validation");
    expect(shiftGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.employee_shifts FROM authenticated");

    expect(personalDashboard).toContain("personal-dashboard-schedule");
    expect(personalDashboard).toContain("schedule_data_${empRecord!.store_id}");
    expect(personalDashboard).toContain("app_settings");
    expect(personalDashboard).toContain("store_employees");
    expect(personalDashboard).toContain('functions.invoke("store-employee-manage"');
    expect(personalDashboard).not.toContain('from("store_employees").update');
    expect(personalSchedule).toContain('functions.invoke("store-employee-manage"');
    expect(personalSchedule).not.toContain('from("store_employees").update');
    expect(personalSchedule).toContain('functions.invoke("travel-support-submit"');
    expect(personalSchedule).not.toMatch(/from\("feedback_submissions"\)\.insert/);

    expect(travelSupport).toContain('withSecurity("travel-support-submit"');
    expect(travelSupport).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(travelSupport).toContain("time_off_request");
    expect(travelSupport).toContain("shift_swap_request");
    expect(travelGate).toContain("time_off_request");
    expect(travelGate).toContain("shift_swap_request");
    expect(travelGate).toContain("AS RESTRICTIVE");

    expect(workflowMigration).toContain("ALTER TABLE public.employee_shifts ENABLE ROW LEVEL SECURITY");
    expect(workflowMigration).toContain("Store owners can view shifts");
    expect(workflowMigration).toContain("store_profiles.owner_id = auth.uid()");
    expect(workflowMigration).toContain("store_employees.user_id = auth.uid()");
    expect(shiftGate).toContain("Employee shifts inserts require trusted server-side validation");
    expect(shiftGate).toContain("Employee shifts updates require trusted server-side validation");
    expect(shiftGate).toContain("Employee shifts deletes require trusted server-side validation");
  });

  it("keeps payroll configuration owner/admin-only while employees can view their own rules", () => {
    const payrollPage = read("src/pages/app/shop/ShopPayrollPage.tsx");
    const payrollUpdate = read("supabase/functions/store-payroll-config-update/index.ts");
    const payrollGate = read("supabase/migrations/20260601223000_store_payroll_configs_server_gate.sql");
    const rulesPage = read("src/pages/app/shop/ShopEmployeeRulesPage.tsx");
    const ruleManage = read("supabase/functions/employee-rule-manage/index.ts");
    const ruleGate = read("supabase/migrations/20260601144500_employee_rules_server_gate.sql");
    const hardeningMigration = read(
      "supabase/migrations/20260522012300_database_security_forward_hardening.sql",
    );
    const workflowMigration = read("supabase/migrations/20260506220000_employee_workflow.sql");

    expect(payrollPage).toContain(".eq(\"owner_id\", uid)");
    expect(payrollPage).toContain("store_payroll_configs");
    expect(payrollPage).toContain("get_employee_payroll_summary");
    expect(payrollPage).toContain("get_merchant_roi");
    expect(payrollPage).toContain('functions.invoke("store-payroll-config-update"');
    expect(payrollPage).not.toMatch(/from\("store_payroll_configs"\)[\s\S]{0,320}\.(insert|update|delete|upsert)/);
    expect(payrollUpdate).toContain('withSecurity("store-payroll-config-update"');
    expect(payrollUpdate).toContain('allowedMethods: ["POST"]');
    expect(payrollUpdate).toContain("admin.auth.getUser(token)");
    expect(payrollUpdate).toContain('.from("store_payroll_configs")');
    expect(payrollUpdate).toContain('.from("store_profiles")');
    expect(payrollUpdate).toContain('rpc("has_role"');

    expect(hardeningMigration).toContain("ALTER TABLE IF EXISTS public.store_payroll_configs ENABLE ROW LEVEL SECURITY");
    expect(hardeningMigration).toContain("Store owners can read payroll configs");
    expect(hardeningMigration).toContain("Store owners can upsert payroll configs");
    expect(hardeningMigration).toContain("Store owners can update payroll configs");
    expect(hardeningMigration).toContain("s.owner_id = auth.uid()");
    expect(payrollGate).toContain("Store payroll config inserts require trusted server-side validation");
    expect(payrollGate).toContain("Store payroll config updates require trusted server-side validation");
    expect(payrollGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_payroll_configs FROM authenticated");

    expect(rulesPage).toContain("employee_rules");
    expect(rulesPage).toContain("employee_rule_acknowledgements");
    expect(rulesPage).toContain('functions.invoke("employee-rule-manage"');
    expect(rulesPage).not.toContain('from("employee_rules").insert');
    expect(rulesPage).not.toContain('from("employee_rules").update');
    expect(rulesPage).not.toContain('from("employee_rules").delete');
    expect(ruleManage).toContain('withSecurity("employee-rule-manage"');
    expect(ruleManage).toContain("strictCors: true");
    expect(ruleManage).toContain("admin.auth.getUser(token)");
    expect(ruleManage).toContain('.from("employee_rules")');
    expect(ruleManage).toContain('.from("store_profiles")');
    expect(ruleManage).toContain('rpc("has_role"');
    expect(ruleGate).toContain("Employee rules inserts require trusted server-side validation");
    expect(ruleGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.employee_rules FROM authenticated");
    expect(workflowMigration).toContain("Team can view rules");
    expect(workflowMigration).toContain("Employees can ack their own rules");
    expect(workflowMigration).toContain("Owner can clear acks");
  });

  it("keeps store training and rule mutations scoped to the active workspace", () => {
    const trainingPrograms = read("src/hooks/store/useStoreTrainingPrograms.ts");
    const employeeRules = read("src/hooks/store/useStoreEmployeeRules.ts");
    const assignments = read("src/hooks/store/useStoreTrainingAssignments.ts");
    const trainingManage = read("supabase/functions/store-training-program-manage/index.ts");
    const assignmentManage = read("supabase/functions/store-training-assignment-manage/index.ts");
    const ruleManage = read("supabase/functions/employee-rule-manage/index.ts");
    const trainingMigration = read("supabase/migrations/20260427211111_41d7872d-ee9a-4b9f-a298-7e770cd3285c.sql");
    const trainingGate = read("supabase/migrations/20260601220000_store_training_programs_server_gate.sql");
    const assignmentGate = read("supabase/migrations/20260601221500_store_training_assignments_server_gate.sql");
    const ruleGate = read("supabase/migrations/20260601240000_store_employee_rules_server_gate.sql");
    const rulesMigration = read("supabase/migrations/20260427210158_2cdfdd02-142b-473c-a4b7-ec66b3de24a9.sql");
    const grants = read("supabase/migrations/20260531203000_store_training_data_api_grants.sql");

    expect(trainingPrograms).toContain('functions.invoke("store-training-program-manage"');
    expect(trainingPrograms).not.toMatch(/from\("store_training_(programs|modules)"\)[\s\S]{0,320}\.(insert|update|delete|upsert)/);
    expect(trainingManage).toContain('withSecurity("store-training-program-manage"');
    expect(trainingManage).toContain('allowedMethods: ["POST"]');
    expect(trainingManage).toContain("admin.auth.getUser(token)");
    expect(trainingManage).toContain('.from("store_training_programs")');
    expect(trainingManage).toContain('.from("store_training_modules")');
    expect(trainingManage).toContain('.from("store_profiles")');
    expect(trainingManage).toContain('rpc("has_role"');

    expect(employeeRules).toContain('functions.invoke("employee-rule-manage"');
    expect(employeeRules).toContain('rulebook: "store_employee_rules"');
    expect(employeeRules).not.toMatch(/from\("store_employee_rules"\)[\s\S]{0,320}\.(insert|update|delete|upsert)/);
    expect(ruleManage).toContain('body.rulebook === "store_employee_rules"');
    expect(ruleManage).toContain('.from("store_employee_rules")');
    expect(ruleManage).toContain("cleanStoreEmployeeRules");

    expect(assignments).toContain('functions.invoke("store-training-assignment-manage"');
    expect(assignments).not.toMatch(/from\("store_training_assignments"\)[\s\S]{0,320}\.(insert|update|delete|upsert)/);
    expect(assignments).toContain('.eq("program_id", programId!)');
    expect(assignmentManage).toContain('withSecurity("store-training-assignment-manage"');
    expect(assignmentManage).toContain('allowedMethods: ["POST"]');
    expect(assignmentManage).toContain("admin.auth.getUser(token)");
    expect(assignmentManage).toContain('.from("store_training_assignments")');
    expect(assignmentManage).toContain('.from("store_training_programs")');
    expect(assignmentManage).toContain('.from("store_employees")');
    expect(assignmentManage).toContain('.from("store_profiles")');
    expect(assignmentManage).toContain('rpc("has_role"');

    expect(trainingMigration).toContain("ALTER TABLE public.store_training_programs ENABLE ROW LEVEL SECURITY");
    expect(trainingMigration).toContain("ALTER TABLE public.store_training_modules ENABLE ROW LEVEL SECURITY");
    expect(trainingMigration).toContain("ALTER TABLE public.store_training_assignments ENABLE ROW LEVEL SECURITY");
    expect(trainingMigration).toContain("Managers can manage training assignments");
    expect(trainingGate).toContain("Store training program inserts require trusted server-side validation");
    expect(trainingGate).toContain("Store training module inserts require trusted server-side validation");
    expect(trainingGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_training_programs FROM authenticated");
    expect(trainingGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_training_modules FROM authenticated");
    expect(assignmentGate).toContain("Store training assignment inserts require trusted server-side validation");
    expect(assignmentGate).toContain("Store training assignment updates require trusted server-side validation");
    expect(assignmentGate).toContain("Store training assignment deletes require trusted server-side validation");
    expect(assignmentGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_training_assignments FROM authenticated");

    expect(rulesMigration).toContain("ALTER TABLE public.store_employee_rules ENABLE ROW LEVEL SECURITY");
    expect(rulesMigration).toContain("public.is_lodge_store_manager(store_id, auth.uid())");
    expect(ruleGate).toContain("Store employee rules inserts require trusted server-side validation");
    expect(ruleGate).toContain("Store employee rules updates require trusted server-side validation");
    expect(ruleGate).toContain("Store employee rules deletes require trusted server-side validation");
    expect(ruleGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_employee_rules FROM authenticated");
    expect(grants).toContain("grant select, insert, update, delete on table public.store_training_programs to authenticated;");
    expect(grants).toContain("grant select, insert, update, delete on table public.store_training_modules to authenticated;");
    expect(grants).toContain("grant select, insert, update, delete on table public.store_training_assignments to authenticated;");
    expect(grants).toContain("grant select, insert, update, delete on table public.store_employee_rules to authenticated;");
  });

  it("keeps client data scoped to owner/admin salon client surfaces", () => {
    const salonClients = read("src/components/admin/store/salon/SalonClientsSection.tsx");
    const clientsHook = read("src/hooks/salon/useSalonClients.ts");
    const myAreaPage = read("src/pages/salon/SalonMyAreaPage.tsx");
    const clientManage = read("supabase/functions/salon-client-manage/index.ts");
    const salonClientsMigration = read("supabase/migrations/20260524040000_salon_clients.sql");
    const salonClientsGate = read("supabase/migrations/20260601281500_salon_clients_server_gate.sql");
    const publicBookingSecurity = read(
      "supabase/migrations/20260524110000_salon_public_booking_security.sql",
    );

    expect(salonClients).toContain("useSalonClients");
    expect(salonClients).toContain("storeId");
    expect(clientsHook).toContain("salon_clients");
    expect(clientsHook).toContain("store_id");
    expect(clientsHook).toContain(".eq(\"store_id\", storeId)");
    expect(clientsHook).toContain('functions.invoke("salon-client-manage"');
    expect(myAreaPage).toContain('functions.invoke("salon-client-manage"');
    expect(clientsHook).not.toMatch(/from\("salon_clients"\)[\s\S]{0,360}\.(insert|update|delete|upsert)/);
    expect(myAreaPage).not.toMatch(/from\("salon_clients"\)[\s\S]{0,360}\.(insert|update|delete|upsert)/);
    expect(clientManage).toContain('withSecurity("salon-client-manage"');
    expect(clientManage).toContain("self_update_preferences");
    expect(clientManage).toContain("cleanPreferences");

    expect(salonClientsMigration).toContain("ALTER TABLE public.salon_clients ENABLE ROW LEVEL SECURITY");
    expect(salonClientsMigration).toContain("Owners manage their clients - select");
    expect(salonClientsMigration).toContain("Owners manage their clients - insert");
    expect(salonClientsMigration).toContain("Owners manage their clients - update");
    expect(salonClientsMigration).toContain("Owners manage their clients - delete");
    expect(salonClientsMigration).toContain("sp.owner_id = (SELECT auth.uid())");
    expect(salonClientsMigration).toContain("Clients can view their own row");
    expect(salonClientsGate).toContain("Salon client inserts require trusted server-side validation");
    expect(salonClientsGate).toContain("Salon client updates require trusted server-side validation");
    expect(salonClientsGate).toContain("Salon client deletes require trusted server-side validation");
    expect(salonClientsGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_clients FROM anon, authenticated");

    expect(publicBookingSecurity).toContain("client_id");
    expect(publicBookingSecurity).toContain("created_by_user_id");
    expect(publicBookingSecurity).toContain("NEW.client_id := NULL");
    expect(publicBookingSecurity).toContain("NEW.created_by_user_id := NULL");
  });
});
