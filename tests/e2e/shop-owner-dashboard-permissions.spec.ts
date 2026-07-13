import { expect, test } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const read = (relativePath: string) =>
  fs.readFileSync(path.join(root, relativePath), "utf8");

test.describe("shop owner dashboard permission contracts", () => {
  test("owner onboarding and dashboard routes stay registered behind authenticated routes", async () => {
    const app = read("src/App.tsx");
    const setup = read("src/pages/store/StoreSetup.tsx");
    const dashboard = read("src/pages/app/ShopDashboard.tsx");
    const layout = read("src/components/admin/StoreOwnerLayout.tsx");

    for (const route of [
      'path="/shop-dashboard"',
      'path="/shop-dashboard/products"',
      'path="/shop-dashboard/orders"',
      'path="/shop-dashboard/settings"',
      'path="/shop-dashboard/promotions"',
      'path="/shop-dashboard/analytics"',
      'path="/shop-dashboard/payments"',
      'path="/shop-dashboard/employees"',
      'path="/shop-dashboard/payroll"',
      'path="/shop-dashboard/employee-schedule"',
    ]) {
      expect(app).toContain(route);
    }

    expect(setup).toContain('queryKey: ["my-store", user?.id]');
    expect(setup).toContain('.from("store_profiles")');
    expect(setup).toContain('.eq("owner_id", user!.id)');
    expect(setup).toContain("owner_id: user.id");
    expect(setup).toContain('navigate("/shop-dashboard", { replace: true })');
    expect(setup).not.toContain("navigate(`/admin/stores/");

    for (const label of ["Edit shop", "Products", "Orders", "Analytics", "Payments"]) {
      expect(dashboard).toContain(`label: "${label}"`);
    }

    for (const tab of ["Payment & Payouts", "Employees", "Payroll", "Schedule", "Products", "Orders", "Profile"]) {
      expect(layout).toContain(tab);
    }
  });

  test("owner mutations are scoped to owned store records or trusted server functions", async () => {
    const settings = read("src/pages/app/shop/ShopSettingsPage.tsx");
    const products = read("src/pages/app/shop/ShopProductsPage.tsx");
    const orders = read("src/pages/app/shop/ShopOrdersPage.tsx");
    const promotions = read("src/pages/app/shop/ShopPromotionsPage.tsx");
    const paymentSection = read("src/components/admin/StorePaymentSection.tsx");
    const wallet = read("src/pages/app/shop/MerchantWalletPage.tsx");
    const employeeSection = read("src/components/admin/store/StoreEmployeesSection.tsx");

    expect(settings).toContain('.eq("owner_id", user!.id)');
    expect(settings).toContain('.eq("id", store.id)');

    expect(products).toContain('.from("store_products")');
    expect(products).toContain('.eq("store_id", store!.id)');
    expect(products).toContain("store_id: store.id");

    expect(orders).toContain('.from("store_orders")');
    expect(orders).toContain('.eq("store_id", store!.id)');

    expect(promotions).toContain('.eq("merchant_id", sid)');
    expect(promotions).toContain("merchant_id: sid");

    expect(paymentSection).toContain('.from("store_payment_methods")');
    expect(paymentSection).toContain('.eq("store_id", storeId)');
    expect(paymentSection).toContain("store_id: storeId");

    expect(wallet).toContain('.eq("owner_id", user.id)');
    expect(wallet).toContain('.eq("store_id", store.id)');
    expect(wallet).toContain('supabase.functions.invoke("merchant-payout-request"');
    expect(wallet).not.toContain('.from("merchant_payouts").insert');

    expect(employeeSection).toContain("send-employee-email-invite");
    expect(employeeSection).toContain("send-employee-sms-invite");
    expect(employeeSection).toContain('functions.invoke("store-employee-manage"');
    expect(employeeSection).not.toContain('from("store_employees").insert');
    expect(employeeSection).not.toContain('from("store_employees").update');
    expect(employeeSection).not.toContain('from("store_employees").delete');
  });

  test("database policies keep owner access explicit for store, payment, promo, and employee records", async () => {
    const ownerInsert = read("supabase/migrations/20260524000000_store_profiles_owner_insert_policy.sql");
    const productDelete = read("supabase/migrations/20260522130000_store_products_delete_policy.sql");
    const orders = read("supabase/migrations/20260406093000_launch_security_deeplink_pulse.sql");
    const employees = read("supabase/migrations/20260404231528_4aae40a5-6228-4f6b-b334-430bc3ddda58.sql");
    const paymentSettings = read("supabase/migrations/20260524010000_store_payment_settings.sql");
    const paymentMethods = read("supabase/migrations/20260531193000_store_payment_methods_owner_policy.sql");
    const promo = read("supabase/migrations/20260207203234_cc9a3dcc-d44f-42c3-92d2-d27719d0371b.sql");
    const employeeGate = read("supabase/migrations/20260601141500_store_employees_server_gate.sql");

    expect(ownerInsert).toContain("Owners can insert their own store_profile");
    expect(ownerInsert).toContain("WITH CHECK (owner_id = (SELECT auth.uid()))");

    expect(productDelete).toContain("Store owners can delete their products");
    expect(productDelete).toContain("WHERE s.id = store_id AND s.owner_id = auth.uid()");

    expect(orders).toContain("Store owners can view store orders");
    expect(orders).toContain("Store owners can update store orders");
    expect(orders).toContain("sp.owner_id = auth.uid()");

    for (const phrase of [
      "Store owners can view their employees",
      "Store owners can insert employees",
      "Store owners can update employees",
      "Store owners can delete employees",
    ]) {
      expect(employees).toContain(phrase);
    }

    expect(paymentSettings).toContain("ALTER TABLE public.store_payment_settings ENABLE ROW LEVEL SECURITY");
    expect(paymentSettings).toContain("Owners can read their payment settings");
    expect(paymentSettings).toContain("Owners can insert their payment settings");
    expect(paymentSettings).toContain("Owners can update their payment settings");

    expect(paymentMethods).toContain("Store owners and admins can manage store payment methods");
    expect(paymentMethods).toContain("sp.owner_id = (SELECT auth.uid())");

    expect(promo).toContain("Merchants can manage own promotions");
    expect(employeeGate).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_employees FROM authenticated");
  });

  test("platform readiness tracks this shop owner permission E2E contract", async () => {
    const matrix = read("scripts/qa/platform-readiness-matrix.mjs");
    const ownerWorkflow = read("src/test/workflows/shop-owner-workflow.test.ts");
    const roleMatrix = read("src/test/roleWorkflowMatrix.test.ts");

    expect(matrix).toContain("tests/e2e/shop-owner-dashboard-permissions.spec.ts");
    expect(ownerWorkflow).toContain("owner-scoped-operations");
    expect(roleMatrix).toContain("tests/e2e/shop-owner-dashboard-permissions.spec.ts");
  });
});
