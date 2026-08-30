import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { serverGatedInvoke } from "./serverGatedInvoke";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function expectAll(text: string, needles: readonly string[]) {
  for (const needle of needles) {
    expect(text).toContain(needle);
  }
}

function expectPostMutationRoute(text: string) {
  expectAll(text, ["strictCors: true", 'allowedMethods: ["POST"]', 'trackNetwork: "suspicious"']);
}

describe("payout authorization and ledger contracts", () => {
  it("keeps payout mutations protected by MFA, idempotency, rate limits, and owner/admin checks", () => {
    const instant = source("supabase/functions/connect-instant-payout/index.ts");
    const creator = source("supabase/functions/creator-payout-request/index.ts");
    const merchant = source("supabase/functions/merchant-payout-request/index.ts");
    const lodging = source("supabase/functions/lodge-payout-request/index.ts");
    const eats = source("supabase/functions/eats-payout-request/index.ts");
    const driverPayout = source("supabase/functions/driver-payout/index.ts");
    const driverResolve = source("supabase/functions/resolve-driver-earning-payout/index.ts");

    for (const text of [instant, creator, merchant, lodging, eats, driverPayout, driverResolve]) {
      expectPostMutationRoute(text);
    }

    expectAll(instant, [
      "enforceAal2(authHeader, corsHeaders)",
      "supabase.auth.getUser",
      "withIdempotency(req, \"connect-instant-payout\", user.id",
      ".eq(\"payee_id\", user.id)",
      ".eq(\"user_id\", user.id)",
      "idempotencyKey: `${idempotencyKey}:transfer`",
      "idempotencyKey: `${idempotencyKey}:payout:${method}`",
    ]);

    expectAll(creator, [
      "enforceAal2(auth, corsHeaders)",
      "withIdempotency(req, \"creator-payout-request\", user.id",
      "\"request_live_earnings_payout\"",
      "\"X-Idempotency-Cache\"",
    ]);

    expectAll(merchant, [
      "withSecurity(\"merchant-payout-request\"",
      "enforceAal2(authHeader, corsHeaders)",
      "withIdempotency(req,",
      "\"X-Idempotency-Cache\"",
      ".from(\"store_profiles\")",
      ".from(\"store_orders\")",
      ".from(\"merchant_payouts\")",
      "availableCents",
    ]);

    expectAll(lodging, [
      "enforceAal2(auth, corsHeaders)",
      "if (store.owner_id !== user.id) throw new Error(\"Not authorized for this store\")",
      "method.user_id !== user.id || method.store_id !== store_id",
    ]);

    expectAll(eats, [
      "enforceAal2(auth, corsHeaders)",
      "owner_id",
      "Payout method does not belong to this user",
    ]);

    for (const text of [driverPayout, driverResolve]) {
      expectAll(text, ["has_role", "_role: \"admin\"", "admin_driver_actions"]);
    }
  });

  it("keeps payout method and vertical payout writes server-gated", () => {
    const serverGates = [
      [
        "supabase/migrations/20260531210000_merchant_payout_requests_server_gate.sql",
        ["server-side owner and balance checks"],
      ],
      [
        "supabase/migrations/20260531211500_ar_payout_records_server_gate.sql",
        ["Auto-repair payout records are written by ar-payout-record"],
      ],
      [
        "supabase/migrations/20260531213000_cafe_tip_payouts_server_gate.sql",
        ["Cafe tip payout headers are written by cafe-tip-payout-record"],
      ],
      [
        "supabase/migrations/20260531214500_salon_commission_payouts_server_gate.sql",
        ["Salon commission payouts are written by salon-commission-payout-record"],
      ],
      [
        "supabase/migrations/20260531220000_customer_payout_methods_server_gate.sql",
        ["Payout methods are written by customer-payout-method-record", "method_type IN ('bank_transfer', 'aba', 'paypal')"],
      ],
      [
        "supabase/migrations/20260531221500_creator_payout_methods_server_gate.sql",
        ["prevent_direct_creator_payout_profile_writes", "creator_payout_profile_server_gate_required", "request_role <> 'service_role'"],
      ],
    ] as const;

    for (const [relativePath, needles] of serverGates) {
      expectAll(source(relativePath), needles);
    }

    const customerMethod = source("supabase/functions/customer-payout-method-record/index.ts");
    const creatorMethod = source("supabase/functions/creator-payout-method-record/index.ts");
    expectPostMutationRoute(customerMethod);
    expectPostMutationRoute(creatorMethod);

    expectAll(customerMethod, [
      "withSecurity(\"customer-payout-method-record\"",
      "enforceAal2(authHeader, corsHeaders)",
      "withIdempotency(req, \"customer-payout-method-record\"",
      "\"X-Idempotency-Cache\"",
      "clearDefaultMethods",
    ]);
    expectAll(creatorMethod, [
      "withSecurity(\"creator-payout-method-record\"",
      "enforceAal2(authHeader, corsHeaders)",
      ".from(\"creator_profiles\")",
      "payout_method: \"paypal\"",
      "paypal_email",
    ]);

    for (const relativePath of [
      "src/pages/account/WalletPage.tsx",
      "src/pages/driver/DriverPayoutsPage.tsx",
      "src/components/admin/store/lodging/LodgingPayoutAccountCard.tsx",
    ]) {
      const text = source(relativePath);
      expect(text).toMatch(serverGatedInvoke("customer-payout-method-record"));
      expect(text).not.toMatch(/from\(["']customer_payout_methods["']\)[\s\S]{0,80}\.(insert|update|delete)/);
    }

    const paypalHook = source("src/hooks/usePayPalPayout.ts");
    expect(paypalHook).toMatch(serverGatedInvoke("creator-payout-method-record"));
    expect(paypalHook).toContain("\"Idempotency-Key\": idempotencyKey");
    expect(paypalHook).not.toMatch(/from\("creator_profiles"\)[\s\S]{0,240}\.(insert|update)/);
  });

  it("keeps payout retries idempotent and auditable in wallet ledgers", () => {
    const paypal = source("supabase/functions/paypal-payout/index.ts");
    const withdrawal = source("supabase/functions/process-withdrawal/index.ts");
    const atomicWithdrawal = source("supabase/migrations/20260531204500_atomic_customer_wallet_withdrawal.sql");
    const idempotency = source("supabase/migrations/20260425214912_ee44c2d6-1039-43b3-9982-c515012cb92c.sql");
    const payoutNotifications = source("supabase/migrations/20260509170000_live_and_payout_notifications.sql");
    const transactions = source("src/pages/TransactionsPage.tsx");
    const customerWallet = source("src/hooks/useCustomerWallet.ts");

    expectPostMutationRoute(paypal);
    expectPostMutationRoute(withdrawal);

    expectAll(paypal, [
      "withIdempotency(req, \"paypal-payout\", user.id",
      "sender_batch_id: senderBatchId",
      "sender_item_id: senderItemId",
      "customer_wallet_transactions",
      "balance_after_cents: newBalance",
      "type: \"withdrawal\"",
      "\"X-Idempotency-Cache\": result.cached ? \"HIT\" : \"MISS\"",
    ]);

    expectAll(withdrawal, [
      "withSecurity(\"process-withdrawal\"",
      "strictCors: true",
      "withIdempotency(req, \"process-withdrawal\", userId",
      "process_customer_wallet_withdrawal",
      "\"X-Idempotency-Cache\": result.cached ? \"HIT\" : \"MISS\"",
    ]);

    expectAll(atomicWithdrawal, [
      "CREATE OR REPLACE FUNCTION public.process_customer_wallet_withdrawal",
      "FOR UPDATE",
      "balance_cents = balance_cents - p_amount_cents",
      "INSERT INTO public.customer_wallet_transactions",
      "RETURNS TABLE(transaction_id uuid, new_balance_cents integer)",
      "balance_after_cents",
      "SECURITY DEFINER",
      "SET search_path = public",
    ]);

    expect(idempotency).toContain("CREATE TABLE IF NOT EXISTS public.idempotency_records");
    expect(payoutNotifications).toContain("tg_notify_payout_status");
    expect(transactions).toContain(".from(\"transactions\")");
    expect(customerWallet).toContain("customer_wallet_transactions");
  });

  it("keeps payout UI states and QA wiring visible to the release gate", () => {
    const stripeCard = source("src/components/wallet/StripeConnectPayoutCard.tsx");
    const unifiedCard = source("src/components/wallet/UnifiedPayoutCard.tsx");
    const creatorPayouts = source("src/pages/CreatorPayoutsPage.tsx");
    const driverPayouts = source("src/pages/driver/DriverPayoutsPage.tsx");
    const matrix = source("scripts/qa/platform-readiness-matrix.mjs");
    const packageJson = source("package.json");
    const workflow = source("scripts/qa/workflow-coverage.mjs");

    expectAll(stripeCard, [
      "requirements",
      "details_submitted",
      "payouts_enabled",
      "instant_eligible",
      "Continue setup",
      "Standard payouts ready",
    ]);
    expectAll(unifiedCard, ["STRIPE_UNSUPPORTED", "Stripe Connect doesn't support your country", "PayPal"]);
    expectAll(creatorPayouts, ["Pending", "processing", "failed", "reversed", "Paid"]);
    expectAll(driverPayouts, ["Details", "Payouts", "Charges", "verification_status", "Continue onboarding"]);

    expectAll(matrix, ["payments-payouts", "src/test/paymentWebhookIdempotency.test.ts", "src/test/payoutAuthorization.test.ts"]);
    expectAll(packageJson, ["qa:payouts-earnings-contracts", "qa:payments-refunds-contracts"]);
    expectAll(workflow, ["payments-refunds", "payouts-earnings"]);
  });
});
