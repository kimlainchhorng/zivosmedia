import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("shop owner dashboard permissions", () => {
  it("keeps dashboard entry limited to owner/store identity signals", () => {
    const appMore = source("src/pages/app/AppMore.tsx");
    const ownerStoreHook = source("src/hooks/useOwnerStoreProfile.ts");
    const appRoutes = source("src/App.tsx");

    expect(appMore).toContain("useOwnerStores");
    expect(appMore).toContain("Boolean(access?.isStoreOwner) || ownerStores.length > 0 || hasBrandShopIdentity");
    expect(appMore).not.toContain("Boolean(user) || Boolean(access?.isStoreOwner)");
    expect(appMore).toContain("resolveBusinessDashboardRoute(primaryOwnerStore.category, primaryOwnerStore.id).path");
    expect(appMore).toContain('label: "Shop Dashboard"');
    expect(appMore).toContain("href: shopDashboardPath");

    expect(ownerStoreHook).toContain('.from("store_profiles")');
    expect(ownerStoreHook).toContain('.eq("owner_id", user.id)');
    expect(ownerStoreHook).toContain("useOwnerStores");

    for (const route of [
      'path="/shop-dashboard"',
      'path="/shop-dashboard/products"',
      'path="/shop-dashboard/orders"',
      'path="/shop-dashboard/employees"',
      'path="/shop-dashboard/payroll"',
      'path="/shop-dashboard/employee-schedule"',
    ]) {
      expect(appRoutes).toContain(route);
    }
  });

  it("keeps the dashboard data scoped to the signed-in owner's store", () => {
    const dashboard = source("src/pages/app/ShopDashboard.tsx");
    const products = source("src/pages/app/shop/ShopProductsPage.tsx");
    const orders = source("src/pages/app/shop/ShopOrdersPage.tsx");
    const employees = source("src/pages/app/shop/ShopEmployeesPage.tsx");

    expect(dashboard).toContain('queryKey: ["my-store", user?.id]');
    expect(dashboard).toContain('.from("store_profiles")');
    expect(dashboard).toContain('.eq("owner_id", user!.id)');
    expect(dashboard).toContain('.from("store_orders")');
    expect(dashboard).toContain('.eq("store_id", store!.id)');
    expect(dashboard).toContain("resolveBusinessDashboardRoute(store.category, store.id)");

    for (const page of [products, orders, employees]) {
      expect(page).toContain('.from("store_profiles")');
      expect(page).toMatch(/\.eq\("owner_id",\s*(user!?\.id|uid)\)/);
    }

    expect(products).toContain('.from("store_products")');
    expect(products).toMatch(/\.eq\("store_id",\s*store!?\.(id)\)/);
    expect(products).toContain('functions.invoke("store-product-manage"');
    expect(products).not.toMatch(/from\("store_products"\)[\s\S]{0,320}\.(insert|update|delete)\(/);
    expect(orders).toContain('.from("store_orders")');
    expect(orders).toMatch(/\.eq\("store_id",\s*store!?\.(id)\)/);
    expect(employees).toContain('.from("store_employees")');
    expect(employees).toContain('.eq("store_id", effectiveStoreId)');
    expect(employees).toContain('functions.invoke("store-employee-manage"');
  });

  it("keeps owner/customer order RLS and employee RLS in the database", () => {
    const orderBase = source("supabase/migrations/20260327230214_7be63394-a4c6-483f-a918-1c5abdaf6a3e.sql");
    const orderHardening = source("supabase/migrations/20260406093000_launch_security_deeplink_pulse.sql");
    const employeeWorkflow = source("supabase/migrations/20260404231528_4aae40a5-6228-4f6b-b334-430bc3ddda58.sql");
    const employeeGate = source("supabase/migrations/20260601141500_store_employees_server_gate.sql");
    const shiftGate = source("supabase/migrations/20260601143000_employee_shifts_server_gate.sql");
    const ruleGate = source("supabase/migrations/20260601144500_employee_rules_server_gate.sql");
    const inviteWorkflow = source("supabase/migrations/20260428032513_d1827e5d-276e-4738-bf5f-7cbfee35c8a4.sql");

    expect(orderBase).toMatch(/ALTER TABLE public\.store_orders ENABLE ROW LEVEL SECURITY/i);
    expect(orderBase).toContain("Customers can view own orders");
    expect(orderBase).toContain("Customers can create orders");
    expect(orderBase).toContain("customer_id = auth.uid()");

    expect(orderHardening).toContain("Store owners can view store orders");
    expect(orderHardening).toContain("Store owners can update store orders");
    expect(orderHardening).toContain("sp.id = store_orders.store_id");
    expect(orderHardening).toContain("sp.owner_id = auth.uid()");

    expect(employeeWorkflow).toMatch(/ALTER TABLE public\.store_employees ENABLE ROW LEVEL SECURITY/i);
    expect(employeeWorkflow).toContain("Store owners can view their employees");
    expect(employeeGate).toContain("Store employees inserts require trusted server-side validation");
    expect(employeeGate).toContain("Store employees updates require trusted server-side validation");
    expect(employeeGate).toContain("Store employees deletes require trusted server-side validation");
    expect(shiftGate).toContain("Employee shifts inserts require trusted server-side validation");
    expect(shiftGate).toContain("Employee shifts deletes require trusted server-side validation");
    expect(ruleGate).toContain("Employee rules inserts require trusted server-side validation");
    expect(ruleGate).toContain("Employee rules deletes require trusted server-side validation");
    expect(employeeWorkflow).toContain("OR user_id = auth.uid()");

    expect(inviteWorkflow).toContain("CREATE TABLE IF NOT EXISTS public.store_employee_invites");
    expect(inviteWorkflow).toContain("CREATE OR REPLACE FUNCTION public.claim_employee_invite");
    expect(inviteWorkflow).toContain("GRANT EXECUTE ON FUNCTION public.claim_employee_invite(text) TO authenticated");
  });

  it("keeps Data API grants explicit for owner, staff, and order workflows", () => {
    const grants = source("supabase/migrations/20260531184042_role_workflow_data_api_grants.sql");
    const employeeGate = source("supabase/migrations/20260601141500_store_employees_server_gate.sql");
    const shiftGate = source("supabase/migrations/20260601143000_employee_shifts_server_gate.sql");
    const ruleGate = source("supabase/migrations/20260601144500_employee_rules_server_gate.sql");

    expect(grants).toContain("grant usage on schema public to anon, authenticated");
    expect(grants).toContain("grant select on table public.store_profiles to anon, authenticated;");
    expect(grants).toContain("grant select on table public.store_products to anon, authenticated;");
    expect(grants).toContain("grant select, insert, update on table public.store_orders to authenticated;");
    expect(employeeGate).toContain("GRANT SELECT ON TABLE public.store_employees TO authenticated");
    expect(grants).toContain("grant select, insert, update on table public.store_employee_invites to authenticated;");
    expect(shiftGate).toContain("GRANT SELECT ON TABLE public.employee_shifts TO authenticated");
    expect(ruleGate).toContain("GRANT SELECT ON TABLE public.employee_rules TO authenticated");
    expect(grants).toContain(
      "grant select, insert, update, delete on table public.employee_rule_acknowledgements to authenticated;",
    );

    for (const tableName of [
      "store_profiles",
      "store_products",
      "store_orders",
      "store_employees",
      "store_employee_invites",
      "employee_shifts",
      "employee_rules",
      "employee_rule_acknowledgements",
    ]) {
      expect(grants).toContain(`grant all privileges on table public.${tableName} to service_role;`);
    }
  });
});
