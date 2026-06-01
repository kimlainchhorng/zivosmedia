#!/usr/bin/env node
/**
 * Shop owner setup and operations contract check.
 *
 * Verifies owner onboarding routes, dashboard navigation, scoped store
 * operations, server-gated payout requests, and RLS/Data API grants.
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

function requireNotContains(id, text, needle, relativePath) {
  if (text.includes(needle)) {
    failures.push(`${id}: ${relativePath} must not contain ${JSON.stringify(needle)}`);
  }
}

const contracts = [
  {
    id: "owner-self-service-setup-route",
    category: "frontend",
    check() {
      const setupPath = "src/pages/store/StoreSetup.tsx";
      const setup = source(setupPath);

      for (const needle of [
        'queryKey: ["my-store", user?.id]',
        '.from("store_profiles")',
        '.eq("owner_id", user!.id)',
        "owner_id: user.id",
        "setup_complete: true",
        "is_active: true",
        'navigate("/shop-dashboard", { replace: true })',
      ]) {
        requireContains(this.id, setup, needle, setupPath);
      }

      requireNotContains(this.id, setup, "navigate(`/admin/stores/${storeId}`", setupPath);
      requireNotContains(this.id, setup, "navigate(`/admin/stores/${myStore.id}`", setupPath);
    },
  },
  {
    id: "owner-dashboard-routes-and-tabs",
    category: "frontend",
    check() {
      const appPath = "src/App.tsx";
      const dashboardPath = "src/pages/app/ShopDashboard.tsx";
      const layoutPath = "src/components/admin/StoreOwnerLayout.tsx";
      const app = source(appPath);
      const dashboard = source(dashboardPath);
      const layout = source(layoutPath);

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
        requireContains(this.id, app, route, appPath);
      }

      for (const action of ["Edit shop", "Products", "Orders", "Analytics", "Payments"]) {
        requireContains(this.id, dashboard, `label: "${action}"`, dashboardPath);
      }

      for (const tab of [
        "Payment & Payouts",
        "Employees",
        "Payroll",
        "Schedule",
        "Products",
        "Orders",
        "Profile",
      ]) {
        requireContains(this.id, layout, tab, layoutPath);
      }
    },
  },
  {
    id: "owner-scoped-operations",
    category: "authorization",
    check() {
      const settingsPath = "src/pages/app/shop/ShopSettingsPage.tsx";
      const productsPath = "src/pages/app/shop/ShopProductsPage.tsx";
      const ordersPath = "src/pages/app/shop/ShopOrdersPage.tsx";
      const promotionsPath = "src/pages/app/shop/ShopPromotionsPage.tsx";
      const marketingPath = "src/components/admin/StoreMarketingSection.tsx";
      const paymentsPath = "src/pages/app/shop/ShopPaymentsPage.tsx";
      const paymentSectionPath = "src/components/admin/StorePaymentSection.tsx";
      const walletPath = "src/pages/app/shop/MerchantWalletPage.tsx";
      const settings = source(settingsPath);
      const products = source(productsPath);
      const orders = source(ordersPath);
      const promotions = source(promotionsPath);
      const marketing = source(marketingPath);
      const payments = source(paymentsPath);
      const paymentSection = source(paymentSectionPath);
      const wallet = source(walletPath);

      for (const needle of ['.eq("owner_id", user!.id)', '.eq("id", store.id)', '.eq("owner_id", user.id)']) {
        requireContains(this.id, settings, needle, settingsPath);
      }

      for (const needle of [
        '.from("store_products")',
        '.eq("store_id", store!.id)',
        'supabase.functions.invoke("store-product-manage"',
        "store_id: store.id",
      ]) {
        requireContains(this.id, products, needle, productsPath);
      }

      for (const needle of [
        '.from("store_orders")',
        '.eq("store_id", store!.id)',
        'supabase.functions.invoke("store-order-state-update"',
        "store_id: store.id",
      ]) {
        requireContains(this.id, orders, needle, ordersPath);
      }

      for (const needle of ['.eq("owner_id", user.id)', "setStoreId(sid)", '.eq("merchant_id", sid)', "merchant_id: sid", 'supabase.functions.invoke("promotion-manage"']) {
        requireContains(this.id, promotions, needle, promotionsPath);
      }

      for (const needle of [
        'queryKey: ["store-promotions", storeId]',
        '.eq("merchant_id", storeId)',
        'queryKey: ["store-posts", storeId]',
        '.eq("store_id", storeId)',
      ]) {
        requireContains(this.id, marketing, needle, marketingPath);
      }

      requireContains(this.id, payments, '.eq("owner_id", user!.id)', paymentsPath);
      requireContains(this.id, payments, "<StorePaymentSection storeId={store.id}", paymentsPath);

      for (const needle of [
        'queryKey: ["store-payment-methods", storeId]',
        '.from("store_payment_methods")',
        '.eq("store_id", storeId)',
        "store_id: storeId",
      ]) {
        requireContains(this.id, paymentSection, needle, paymentSectionPath);
      }

      for (const needle of [
        '.eq("owner_id", user.id)',
        '.eq("store_id", store.id)',
        'supabase.functions.invoke("merchant-payout-request"',
      ]) {
        requireContains(this.id, wallet, needle, walletPath);
      }
      requireNotContains(this.id, wallet, '.from("merchant_payouts").insert', walletPath);
    },
  },
  {
    id: "owner-rls-and-data-api-grants",
    category: "database",
    check() {
      const ownerInsertPath = "supabase/migrations/20260524000000_store_profiles_owner_insert_policy.sql";
      const productDeletePath = "supabase/migrations/20260522130000_store_products_delete_policy.sql";
      const ordersPath = "supabase/migrations/20260406093000_launch_security_deeplink_pulse.sql";
      const employeesPath = "supabase/migrations/20260404231528_4aae40a5-6228-4f6b-b334-430bc3ddda58.sql";
      const invitesPath = "supabase/migrations/20260428032513_d1827e5d-276e-4738-bf5f-7cbfee35c8a4.sql";
      const paymentSettingsPath = "supabase/migrations/20260524010000_store_payment_settings.sql";
      const paymentMethodsPath = "supabase/migrations/20260531193000_store_payment_methods_owner_policy.sql";
      const promoPath = "supabase/migrations/20260207203234_cc9a3dcc-d44f-42c3-92d2-d27719d0371b.sql";
      const grantsPath = "supabase/migrations/20260531142721_data_api_grants_recent_public_tables.sql";
      const ownerInsert = source(ownerInsertPath);
      const productDelete = source(productDeletePath);
      const orders = source(ordersPath);
      const employees = source(employeesPath);
      const invites = source(invitesPath);
      const paymentSettings = source(paymentSettingsPath);
      const paymentMethods = source(paymentMethodsPath);
      const promo = source(promoPath);
      const grants = source(grantsPath);

      for (const needle of [
        "Owners can insert their own store_profile",
        "WITH CHECK (owner_id = (SELECT auth.uid()))",
      ]) {
        requireContains(this.id, ownerInsert, needle, ownerInsertPath);
      }

      for (const needle of [
        "Store owners can delete their products",
        "WHERE s.id = store_id AND s.owner_id = auth.uid()",
      ]) {
        requireContains(this.id, productDelete, needle, productDeletePath);
      }

      for (const needle of [
        "Store owners can view store orders",
        "Store owners can update store orders",
        "sp.owner_id = auth.uid()",
      ]) {
        requireContains(this.id, orders, needle, ordersPath);
      }

      for (const needle of [
        "Store owners can view their employees",
        "Store owners can insert employees",
        "Store owners can update employees",
        "Store owners can delete employees",
      ]) {
        requireContains(this.id, employees, needle, employeesPath);
      }
      requireContains(this.id, invites, "CREATE OR REPLACE FUNCTION public.claim_employee_invite", invitesPath);

      for (const needle of [
        "ALTER TABLE public.store_payment_settings ENABLE ROW LEVEL SECURITY",
        "Owners can read their payment settings",
        "Owners can insert their payment settings",
        "Owners can update their payment settings",
      ]) {
        requireContains(this.id, paymentSettings, needle, paymentSettingsPath);
      }

      for (const needle of [
        "Store owners and admins can manage store payment methods",
        "sp.id = store_payment_methods.store_id",
        "sp.owner_id = (SELECT auth.uid())",
        "GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.store_payment_methods TO authenticated",
      ]) {
        requireContains(this.id, paymentMethods, needle, paymentMethodsPath);
      }

      requireContains(this.id, promo, "Merchants can manage own promotions", promoPath);
      requireContains(this.id, promo, "merchant_id IN", promoPath);

      for (const tableName of [
        "store_payment_settings",
        "store_promotions",
        "cafe_promotions",
        "car_rental_promotions",
        "car_dealership_promotions",
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
];

for (const contract of contracts) {
  contract.check();
}

if (failures.length > 0) {
  console.error("Shop owner contracts failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Shop owner contracts passed: ${contracts.length} checked`);
