import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { serverGatedInvoke } from "./serverGatedInvoke";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("merchant payout owner ops access", () => {
  it("keeps merchant payout requests owner-scoped, MFA-gated, and idempotent", () => {
    const walletPage = source("src/pages/app/shop/MerchantWalletPage.tsx");
    const payoutFunction = source("supabase/functions/merchant-payout-request/index.ts");

    expect(walletPage).toContain('.eq("owner_id", user.id)');
    expect(walletPage).toContain('.eq("store_id", store.id)');
    expect(walletPage).toMatch(serverGatedInvoke("merchant-payout-request"));
    expect(walletPage).toContain('"Idempotency-Key"');
    expect(walletPage).not.toContain('.from("merchant_payouts").insert');

    expect(payoutFunction).toContain('withSecurity("merchant-payout-request"');
    expect(payoutFunction).toContain("enforceAal2(authHeader, corsHeaders)");
    expect(payoutFunction).toContain('withIdempotency(req, "merchant-payout-request", userId');
    expect(payoutFunction).toContain('.from("store_profiles")');
    expect(payoutFunction).toContain('.select("id, owner_id, name")');
    expect(payoutFunction).toContain("owner_id !== userId");
    expect(payoutFunction).toContain("Not authorized for this store");
    expect(payoutFunction).toContain('.from("store_orders")');
    expect(payoutFunction).toContain('.eq("store_id", storeId)');
    expect(payoutFunction).toContain('.from("merchant_payouts")');
    expect(payoutFunction).toContain('status: "pending"');
    expect(payoutFunction).toContain('rateLimit: "admin_action"');
    expect(payoutFunction).toContain("blockNetworkRiskAt: 85");
  });

  it("routes owner payment settings through the server-side payment gate", () => {
    const paymentsPage = source("src/pages/app/shop/ShopPaymentsPage.tsx");
    const paymentSection = source("src/components/admin/StorePaymentSection.tsx");
    const paymentFunction = source("supabase/functions/store-payment-methods-update/index.ts");
    const paymentMigration = source("supabase/migrations/20260601133000_store_payment_methods_server_gate.sql");

    expect(paymentsPage).toContain('.from("store_profiles")');
    expect(paymentsPage).toContain('.eq("owner_id", user!.id)');
    expect(paymentSection).toContain('supabase.functions.invoke("store-payment-methods-update"');
    expect(paymentSection).not.toContain('.from("store_payment_methods")\n        .upsert');

    expect(paymentFunction).toContain('withSecurity("store-payment-methods-update"');
    expect(paymentFunction).toContain('rateLimit: "payment"');
    expect(paymentFunction).toContain("blockNetworkRiskAt: 80");
    expect(paymentFunction).toContain(".eq(\"owner_id\", userId)");
    expect(paymentFunction).toContain('admin.rpc("has_role"');
    expect(paymentFunction).toContain('_role: "admin"');
    for (const provider of [
      '"aba"',
      '"wing"',
      '"acleda"',
      '"card"',
      '"confirmed_order"',
      '"bank_transfer"',
      '"stripe_connect"',
      '"square"',
      '"invoice"',
    ]) {
      expect(paymentFunction).toContain(provider);
    }

    expect(paymentMigration).toContain("Store owners and admins can read store payment methods");
    expect(paymentMigration).toContain("Store payment methods updates require trusted server-side validation");
    expect(paymentMigration).toContain("REVOKE INSERT, UPDATE, DELETE ON TABLE public.store_payment_methods FROM authenticated");
  });

  it("keeps shop ops metadata writes behind the trusted server function", () => {
    const documentsPage = source("src/pages/app/shop/ShopDocumentsPage.tsx");
    const trainingPage = source("src/pages/app/shop/ShopTrainingPage.tsx");
    const digitalProductsPage = source("src/pages/DigitalProductsPage.tsx");
    const opsFunction = source("supabase/functions/shop-ops-record-submit/index.ts");
    const opsMigration = source("supabase/migrations/20260601044500_shop_ops_records_server_gate.sql");

    for (const ui of [documentsPage, trainingPage, digitalProductsPage]) {
      expect(ui).toContain('shop-ops-record-submit');
      expect(ui).not.toContain('.from("feedback_submissions").insert');
    }

    expect(opsFunction).toContain('withSecurity(\n    "shop-ops-record-submit"');
    expect(opsFunction).toContain("requireUser(req)");
    expect(opsFunction).toContain("requireUserNotBlocked(userId)");
    expect(opsFunction).toContain("getServiceRoleClient()");
    expect(opsFunction).toContain('.from("feedback_submissions")');
    expect(opsFunction).toContain('new Set(["shop_document", "shop_training", "digital_product"])');
    expect(opsFunction).toContain("cleanPayload(body.payload)");
    expect(opsFunction).toContain("blockNetworkRiskAt: 80");

    expect(opsMigration).toContain("shop ops");
    expect(opsMigration).toContain("trusted server-side ingestion");
    expect(opsMigration).toContain("AS RESTRICTIVE");
  });
});
