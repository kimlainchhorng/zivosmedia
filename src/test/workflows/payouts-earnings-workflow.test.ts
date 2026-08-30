import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { serverGatedInvoke } from "../serverGatedInvoke";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("payouts, earnings, and balances workflow", () => {
  it("keeps the standalone payouts earnings contract gate wired into platform audit", () => {
    const contractScript = read("scripts/qa/payouts-earnings-contracts.mjs");
    const coverageScript = read("scripts/qa/workflow-coverage.mjs");
    const packageJson = read("package.json");

    for (const contractId of [
      "authenticated-payout-mutations",
      "server-gated-payout-methods-and-vertical-payouts",
      "connect-payout-ui-states",
      "idempotent-payout-retries",
      "auditable-balance-ledgers",
    ]) {
      expect(contractScript).toContain(contractId);
    }

    expect(coverageScript).toContain("qa:payouts-earnings-contracts");
    expect(packageJson).toContain('"qa:payouts-earnings-contracts"');
    expect(packageJson).toContain("npm run qa:payouts-earnings-contracts");
  });

  it("requires authenticated owners, drivers, creators, or admins before payout changes", () => {
    const instant = read("supabase/functions/connect-instant-payout/index.ts");
    const creator = read("supabase/functions/creator-payout-request/index.ts");
    const driverPayout = read("supabase/functions/driver-payout/index.ts");
    const driverResolve = read("supabase/functions/resolve-driver-earning-payout/index.ts");
    const lodging = read("supabase/functions/lodge-payout-request/index.ts");
    const eats = read("supabase/functions/eats-payout-request/index.ts");
    const merchant = read("supabase/functions/merchant-payout-request/index.ts");
    const merchantWallet = read("src/pages/app/shop/MerchantWalletPage.tsx");
    const merchantPayoutGate = read("supabase/migrations/20260531210000_merchant_payout_requests_server_gate.sql");
    const arPayout = read("supabase/functions/ar-payout-record/index.ts");
    const arFinance = read("src/components/admin/store/autorepair/finance/FinanceTaxPayoutsSection.tsx");
    const arPayoutGate = read("supabase/migrations/20260531211500_ar_payout_records_server_gate.sql");
    const cafeTipPayout = read("supabase/functions/cafe-tip-payout-record/index.ts");
    const cafeTips = read("src/hooks/cafe/useCafeTips.ts");
    const cafeTipGate = read("supabase/migrations/20260531213000_cafe_tip_payouts_server_gate.sql");
    const salonPayout = read("supabase/functions/salon-commission-payout-record/index.ts");
    const salonCommissions = read("src/components/admin/store/salon/SalonCommissionsSection.tsx");
    const salonPayoutGate = read("supabase/migrations/20260531214500_salon_commission_payouts_server_gate.sql");
    const payoutMethod = read("supabase/functions/customer-payout-method-record/index.ts");
    const payoutMethodGate = read("supabase/migrations/20260531220000_customer_payout_methods_server_gate.sql");
    const creatorPayoutMethod = read("supabase/functions/creator-payout-method-record/index.ts");
    const creatorPayoutMethodGate = read("supabase/migrations/20260531221500_creator_payout_methods_server_gate.sql");
    const creatorProfileProtectedGate = read("supabase/migrations/20260531234500_creator_profile_protected_fields_server_gate.sql");
    const refundRequest = read("supabase/functions/refund-request-submit/index.ts");
    const refundRequestGate = read("supabase/migrations/20260601031500_refund_requests_server_gate.sql");
    const paypalHook = read("src/hooks/usePayPalPayout.ts");
    const walletPage = read("src/pages/account/WalletPage.tsx");
    const driverPayouts = read("src/pages/driver/DriverPayoutsPage.tsx");
    const lodgePayoutAccount = read("src/components/admin/store/lodging/LodgingPayoutAccountCard.tsx");
    const methodsMigration = read(
      "supabase/migrations/20260410010755_35ddd526-027f-4087-9002-466fc2f1cd01.sql",
    );

    expect(instant).toContain("enforceAal2(authHeader, corsHeaders)");
    expect(instant).toContain("supabase.auth.getUser");
    expect(instant).toContain(".eq(\"payee_id\", user.id)");
    expect(instant).toContain(".eq(\"user_id\", user.id)");

    expect(creator).toContain("if (!auth) return json({ error: \"Not authenticated\" }, 401)");
    expect(creator).toContain("enforceAal2(auth, corsHeaders)");
    expect(creator).toContain("withIdempotency(req, \"creator-payout-request\", user.id");
    expect(creator).toContain("userClient.rpc(");
    expect(creator).toContain("\"request_live_earnings_payout\"");
    expect(creator).toContain('"X-Idempotency-Cache"');

    expect(driverPayout).toContain("enforceAal2(authHeader, cors)");
    expect(driverPayout).toContain("userClient.auth.getUser");
    expect(driverPayout).toContain("has_role");
    expect(driverPayout).toContain("_role: \"admin\"");
    expect(driverPayout).toContain("admin_driver_actions");

    expect(driverResolve).toContain("has_role");
    expect(driverResolve).toContain("_role: \"admin\"");
    expect(driverResolve).toContain("admin_driver_actions");

    expect(lodging).toContain("enforceAal2(auth, corsHeaders)");
    expect(lodging).toContain("if (store.owner_id !== user.id) throw new Error(\"Not authorized for this store\")");
    expect(lodging).toContain("method.user_id !== user.id || method.store_id !== store_id");

    expect(eats).toContain("enforceAal2(auth, corsHeaders)");
    expect(eats).toContain("owner_id");
    expect(eats).toContain("Payout method does not belong to this user");

    expect(merchant).toContain('withSecurity("merchant-payout-request"');
    expect(merchant).toContain("enforceAal2(authHeader, corsHeaders)");
    expect(merchant).toContain("withIdempotency(req, \"merchant-payout-request\", userId");
    expect(merchant).toContain('.from("store_profiles")');
    expect(merchant).toContain('.eq("id", storeId)');
    expect(merchant).toContain("owner_id");
    expect(merchant).toContain('.from("store_orders")');
    expect(merchant).toContain('.from("merchant_payouts")');
    expect(merchant).toContain("availableCents");
    expect(merchant).toContain('"X-Idempotency-Cache"');
    expect(merchantWallet).toMatch(serverGatedInvoke("merchant-payout-request"));
    expect(merchantWallet).toContain('"Idempotency-Key": `merchant-payout-');
    expect(merchantWallet).not.toContain('.from("merchant_payouts").insert');
    expect(merchantPayoutGate).toContain('DROP POLICY IF EXISTS "Merchants can request payouts"');
    expect(merchantPayoutGate).toContain("server-side owner and balance checks");

    expect(refundRequest).toContain('withSecurity(\n    "refund-request-submit"');
    expect(refundRequest).toContain("requireUser(req)");
    expect(refundRequest).toContain("requireUserNotBlocked(userId)");
    expect(refundRequest).toContain('rateLimit: "payment"');
    expect(refundRequest).toContain("blockNetworkRiskAt: 90");
    expect(refundRequest).toContain('.from("feedback_submissions")');
    expect(refundRequest).toContain('category: "refund_request"');
    expect(refundRequest).toContain('action: "refund_request_submitted"');
    expect(refundRequestGate).toContain('AS RESTRICTIVE');
    expect(refundRequestGate).toContain("COALESCE(category, 'general') <> 'refund_request'");
    expect(walletPage).toContain('functions.invoke("refund-request-submit"');
    expect(walletPage).not.toMatch(/from\("feedback_submissions"\)\.insert/);

    expect(arPayout).toContain('withSecurity("ar-payout-record"');
    expect(arPayout).toContain("enforceAal2(authHeader, corsHeaders)");
    expect(arPayout).toContain("withIdempotency(req, \"ar-payout-record\", userId");
    expect(arPayout).toContain('action === "delete"');
    expect(arPayout).toContain("assertCanManageStore");
    expect(arPayout).toContain('rpc("has_role"');
    expect(arPayout).toContain('.from("restaurants")');
    expect(arPayout).toContain('.from("store_profiles")');
    expect(arPayout).toContain('"X-Idempotency-Cache"');
    expect(arFinance).toMatch(serverGatedInvoke("ar-payout-record"));
    expect(arFinance).toContain('"Idempotency-Key": `ar-payout-');
    expect(arFinance).not.toContain('.from("ar_payouts" as any).insert');
    expect(arFinance).not.toContain('.from("ar_payouts" as any).delete');
    expect(arPayoutGate).toContain('DROP POLICY IF EXISTS "Owners manage their ar_payouts"');
    expect(arPayoutGate).toContain("Auto-repair payout records are written by ar-payout-record");

    expect(cafeTipPayout).toContain('withSecurity("cafe-tip-payout-record"');
    expect(cafeTipPayout).toContain("enforceAal2(authHeader, corsHeaders)");
    expect(cafeTipPayout).toContain("withIdempotency(req, \"cafe-tip-payout-record\", userId");
    expect(cafeTipPayout).toContain("assertCanManageStore");
    expect(cafeTipPayout).toContain('rpc("has_role"');
    expect(cafeTipPayout).toContain('.from("cafe_baristas")');
    expect(cafeTipPayout).toContain("lineTotal !== totalCents");
    expect(cafeTipPayout).toContain('.from("cafe_tip_payouts")');
    expect(cafeTipPayout).toContain('.from("cafe_tip_payout_lines")');
    expect(cafeTipPayout).toContain('"X-Idempotency-Cache"');
    expect(cafeTips).toMatch(serverGatedInvoke("cafe-tip-payout-record"));
    expect(cafeTips).toContain('"Idempotency-Key": `cafe-tip-payout-');
    expect(cafeTips).not.toContain('.from("cafe_tip_payouts" as never)\\n      .insert');
    expect(cafeTips).not.toContain('.from("cafe_tip_payout_lines" as never)\\n      .insert');
    expect(cafeTipGate).toContain("DROP POLICY IF EXISTS cafe_tip_payouts_owner_manage");
    expect(cafeTipGate).toContain("DROP POLICY IF EXISTS cafe_tip_payout_lines_owner_manage");
    expect(cafeTipGate).toContain("Cafe tip payout headers are written by cafe-tip-payout-record");

    expect(salonPayout).toContain('withSecurity("salon-commission-payout-record"');
    expect(salonPayout).toContain("enforceAal2(authHeader, corsHeaders)");
    expect(salonPayout).toContain("withIdempotency(req, \"salon-commission-payout-record\", userId");
    expect(salonPayout).toContain("assertCanManageStore");
    expect(salonPayout).toContain('rpc("has_role"');
    expect(salonPayout).toContain('.from("salon_stylists")');
    expect(salonPayout).toContain('.from("salon_bookings")');
    expect(salonPayout).toContain("requestedTotal !== totalPaidCents");
    expect(salonPayout).toContain('.from("salon_commission_payouts")');
    expect(salonPayout).toContain('"X-Idempotency-Cache"');
    expect(salonCommissions).toMatch(serverGatedInvoke("salon-commission-payout-record"));
    expect(salonCommissions).toContain('"Idempotency-Key": `salon-commission-payout-');
    expect(salonCommissions).not.toContain('.from("salon_commission_payouts")\\n      .insert');
    expect(salonCommissions).not.toContain('.from("salon_commission_payouts").delete');
    expect(salonPayoutGate).toContain('DROP POLICY IF EXISTS "Owners manage commission payouts - all"');
    expect(salonPayoutGate).toContain("Salon commission payouts are written by salon-commission-payout-record");

    expect(payoutMethod).toContain('withSecurity("customer-payout-method-record"');
    expect(payoutMethod).toContain("enforceAal2(authHeader, corsHeaders)");
    expect(payoutMethod).toContain("withIdempotency(req, \"customer-payout-method-record\", userId");
    expect(payoutMethod).toContain('action === "delete"');
    expect(payoutMethod).toContain('action === "set_default"');
    expect(payoutMethod).toContain("assertCanManageStore");
    expect(payoutMethod).toContain("clearDefaultMethods");
    expect(payoutMethod).toContain('"X-Idempotency-Cache"');
    for (const source of [walletPage, driverPayouts, lodgePayoutAccount]) {
      expect(source).toMatch(serverGatedInvoke("customer-payout-method-record"));
      expect(source).not.toMatch(/from\\("customer_payout_methods"\\)[\\s\\S]{0,80}\\.(insert|update|delete)/);
      expect(source).not.toMatch(/from\\('customer_payout_methods'\\)[\\s\\S]{0,80}\\.(insert|update|delete)/);
    }
    expect(payoutMethodGate).toContain('DROP POLICY IF EXISTS "Users can insert own payout methods"');
    expect(payoutMethodGate).toContain('DROP POLICY IF EXISTS "Users can update own payout methods"');
    expect(payoutMethodGate).toContain('DROP POLICY IF EXISTS "Users can delete own payout methods"');
    expect(payoutMethodGate).toContain('DROP POLICY IF EXISTS "Store owners manage their store payout methods"');
    expect(payoutMethodGate).toContain("method_type IN ('bank_transfer', 'aba', 'paypal')");
    expect(payoutMethodGate).toContain("Payout methods are written by customer-payout-method-record");

    expect(creatorPayoutMethod).toContain('withSecurity("creator-payout-method-record"');
    expect(creatorPayoutMethod).toContain("enforceAal2(authHeader, corsHeaders)");
    expect(creatorPayoutMethod).toContain("withIdempotency(req, \"creator-payout-method-record\", userId");
    expect(creatorPayoutMethod).toContain('.from("creator_profiles")');
    expect(creatorPayoutMethod).toContain("payout_method: \"paypal\"");
    expect(creatorPayoutMethod).toContain("payout_details: payoutDetails");
    expect(creatorPayoutMethod).toContain("paypal_email");
    expect(creatorPayoutMethod).toContain('"X-Idempotency-Cache"');
    expect(paypalHook).toMatch(serverGatedInvoke("creator-payout-method-record"));
    expect(paypalHook).toContain('"Idempotency-Key": idempotencyKey');
    expect(paypalHook).not.toMatch(/from\("creator_profiles"\)[\s\S]{0,240}\.(insert|update)/);
    expect(paypalHook).not.toContain('insert({ user_id: params.userId, payout_method: "paypal"');
    expect(creatorPayoutMethodGate).toContain("prevent_direct_creator_payout_profile_writes");
    expect(creatorPayoutMethodGate).toContain("creator_payout_profile_server_gate_required");
    expect(creatorPayoutMethodGate).toContain("request_role <> 'service_role'");
    expect(creatorPayoutMethodGate).toContain("NEW.payout_method IS DISTINCT FROM OLD.payout_method");
    expect(creatorPayoutMethodGate).toContain("NEW.payout_details IS DISTINCT FROM OLD.payout_details");
    expect(creatorProfileProtectedGate).toContain("creator_profile_protected_fields_server_gate_required");
    expect(creatorProfileProtectedGate).toContain("NEW.total_earnings_cents IS DISTINCT FROM OLD.total_earnings_cents");
    expect(creatorProfileProtectedGate).toContain("NEW.subscriber_count IS DISTINCT FROM OLD.subscriber_count");
    expect(creatorProfileProtectedGate).toContain("NEW.follower_count IS DISTINCT FROM OLD.follower_count");
    expect(creatorProfileProtectedGate).toContain("NEW.is_verified IS DISTINCT FROM OLD.is_verified");
    expect(creatorProfileProtectedGate).toContain("NEW.is_active IS DISTINCT FROM OLD.is_active");
    expect(creatorProfileProtectedGate).toContain("allowing normal profile edits");

    expect(methodsMigration).toContain("ALTER TABLE public.customer_payout_methods ENABLE ROW LEVEL SECURITY");
    expect(methodsMigration).toContain("USING (auth.uid() = user_id)");
    expect(methodsMigration).toContain("WITH CHECK (auth.uid() = user_id)");
  });

  it("renders Connect, payout, and earnings states for pending, active, restricted, and failed paths", () => {
    const stripeCard = read("src/components/wallet/StripeConnectPayoutCard.tsx");
    const unifiedCard = read("src/components/wallet/UnifiedPayoutCard.tsx");
    const creatorPayouts = read("src/pages/CreatorPayoutsPage.tsx");
    const driverPayouts = read("src/pages/driver/DriverPayoutsPage.tsx");

    expect(stripeCard).toContain("requirements");
    expect(stripeCard).toContain("details_submitted");
    expect(stripeCard).toContain("payouts_enabled");
    expect(stripeCard).toContain("instant_eligible");
    expect(stripeCard).toContain("Continue setup");
    expect(stripeCard).toContain("Standard payouts ready");

    expect(unifiedCard).toContain("STRIPE_UNSUPPORTED");
    expect(unifiedCard).toContain("Stripe Connect doesn't support your country");
    expect(unifiedCard).toContain("PayPal");

    expect(creatorPayouts).toContain("Pending");
    expect(creatorPayouts).toContain("processing");
    expect(creatorPayouts).toContain("failed");
    expect(creatorPayouts).toContain("reversed");
    expect(creatorPayouts).toContain("Paid");

    expect(driverPayouts).toContain("Details");
    expect(driverPayouts).toContain("Payouts");
    expect(driverPayouts).toContain("Charges");
    expect(driverPayouts).toContain("verification_status");
    expect(driverPayouts).toContain("Continue onboarding");
  });

  it("keeps customer Stripe Connect onboarding and status behind strict wrapper security", () => {
    const onboard = read("supabase/functions/connect-onboard/index.ts");
    const status = read("supabase/functions/connect-status/index.ts");

    for (const fn of [onboard, status]) {
      expect(fn).toContain('withSecurity("connect-');
      expect(fn).toContain("const corsHeaders = ctx.corsHeaders");
      expect(fn).toContain("supabase.auth.getUser");
      expect(fn).toContain("strictCors: true");
      expect(fn).toContain('allowedMethods: ["POST"]');
      expect(fn).toContain('trackNetwork: "suspicious"');
      expect(fn).toContain("blockNetworkRiskAt: 80");
      expect(fn).not.toContain('"Access-Control-Allow-Origin": "*"');
    }

    expect(onboard).toContain("stripe.accounts.create");
    expect(onboard).toContain("stripe.accountLinks.create");
    expect(onboard).toContain("stripe_unsupported_country");
    expect(status).toContain("stripe.accounts.retrieve");
    expect(status).toContain("stripe.accounts.listExternalAccounts");
    expect(status).toContain("instant_eligible");
  });

  it("keeps payout retries idempotent across frontend, Edge Function, Stripe, and notification paths", () => {
    const hook = read("src/hooks/useStripeConnect.ts");
    const instant = read("supabase/functions/connect-instant-payout/index.ts");
    const paypal = read("supabase/functions/paypal-payout/index.ts");
    const withdrawal = read("supabase/functions/process-withdrawal/index.ts");
    const liveEarnings = read("src/hooks/useLiveEarnings.ts");
    const creatorPayout = read("supabase/functions/creator-payout-request/index.ts");
    const atomicWithdrawal = read("supabase/migrations/20260531204500_atomic_customer_wallet_withdrawal.sql");
    const idempotencyMigration = read(
      "supabase/migrations/20260425214912_ee44c2d6-1039-43b3-9982-c515012cb92c.sql",
    );
    const payoutNotifications = read("supabase/migrations/20260509170000_live_and_payout_notifications.sql");
    const driverPayout = read("supabase/functions/driver-payout/index.ts");

    expect(hook).toContain("\"Idempotency-Key\": `instant-payout-${idempotencyKey}`");
    expect(hook).toMatch(serverGatedInvoke("connect-instant-payout"));

    expect(instant).toContain("getIdempotencyKey(req)");
    expect(instant).toContain("withIdempotency(req, \"connect-instant-payout\", user.id");
    expect(instant).toContain("idempotencyKey: `${idempotencyKey}:transfer`");
    expect(instant).toContain("idempotencyKey: `${idempotencyKey}:payout:${method}`");
    expect(instant).toContain("idempotencyKey: `${idempotencyKey}:payout:standard-fallback`");

    expect(paypal).toContain("withIdempotency(req, \"paypal-payout\", user.id");
    expect(paypal).toContain("getIdempotencyKey(req) ?? crypto.randomUUID()");
    expect(paypal).toContain("sender_batch_id: senderBatchId");
    expect(paypal).toContain("sender_item_id: senderItemId");
    expect(paypal).toContain("\"X-Idempotency-Cache\": result.cached ? \"HIT\" : \"MISS\"");

    expect(withdrawal).toContain("withIdempotency(req, \"process-withdrawal\", userId");
    expect(withdrawal).toContain("process_customer_wallet_withdrawal");
    expect(withdrawal).toContain("\"X-Idempotency-Cache\": result.cached ? \"HIT\" : \"MISS\"");
    expect(withdrawal).toContain("withSecurity(\"process-withdrawal\"");
    expect(withdrawal).toContain("strictCors: true");
    expect(withdrawal).toContain('allowedMethods: ["POST"]');
    expect(withdrawal).toContain("trackNetwork: \"suspicious\"");

    expect(liveEarnings).toContain("\"Idempotency-Key\": idempotencyKey");
    expect(liveEarnings).toMatch(serverGatedInvoke("creator-payout-request"));
    expect(creatorPayout).toContain("withIdempotency(req, \"creator-payout-request\", user.id");
    expect(creatorPayout).toContain("\"X-Idempotency-Cache\": result.cached ? \"HIT\" : \"MISS\"");
    expect(creatorPayout).toContain("enforceAal2(auth, corsHeaders)");
    expect(creatorPayout).toContain('allowedMethods: ["POST"]');

    expect(atomicWithdrawal).toContain("CREATE OR REPLACE FUNCTION public.process_customer_wallet_withdrawal");
    expect(atomicWithdrawal).toContain("FOR UPDATE");
    expect(atomicWithdrawal).toContain("balance_cents = balance_cents - p_amount_cents");
    expect(atomicWithdrawal).toContain("INSERT INTO public.customer_wallet_transactions");
    expect(atomicWithdrawal).toContain("SECURITY DEFINER");
    expect(atomicWithdrawal).toContain("SET search_path = public");
    expect(atomicWithdrawal).toContain("GRANT EXECUTE ON FUNCTION public.process_customer_wallet_withdrawal(uuid, integer, text, uuid) TO service_role");

    expect(idempotencyMigration).toContain("CREATE TABLE IF NOT EXISTS public.idempotency_records");
    expect(idempotencyMigration).toContain("PRIMARY KEY (key, route)");
    expect(idempotencyMigration).toContain("idempotency service only");

    expect(payoutNotifications).toContain("tg_notify_payout_status");
    expect(payoutNotifications).toContain("p_idempotency_key => 'payout:' || NEW.id || ':' || NEW.status");

    expect(driverPayout).toContain("payout_status === \"stripe_paid\"");
    expect(driverPayout).toContain("idempotent: true");
    expect(driverPayout).toContain("payout_reference");
    expect(driverPayout).toContain("const idempotencyKey = `driver-payout:${ride_request_id}`");
    expect(driverPayout).toContain('allowedMethods: ["POST"]');
    expect(driverPayout).toContain("idempotencyKey");
    expect(driverPayout).toContain("transfer_group: `ride_${ride_request_id}`");
  });

  it("records balance movement, payout resolution, and admin decisions in auditable ledgers", () => {
    const instant = read("supabase/functions/connect-instant-payout/index.ts");
    const paypal = read("supabase/functions/paypal-payout/index.ts");
    const withdrawal = read("supabase/functions/process-withdrawal/index.ts");
    const atomicWithdrawal = read("supabase/migrations/20260531204500_atomic_customer_wallet_withdrawal.sql");
    const driverResolve = read("supabase/functions/resolve-driver-earning-payout/index.ts");
    const walletMigration = read("supabase/migrations/20260505200000_user_wallet_loyalty_partner.sql");
    const walletHardening = read("supabase/migrations/20260313174623_6c192c8d-1329-4545-b7be-195a812076a3.sql");
    const adminLedger = read("supabase/migrations/20260406094500_admin_wallet_ledger.sql");
    const creatorMigration = read("supabase/migrations/20260403142647_c6037f54-60d7-4ab8-ba14-a542b5ee0233.sql");
    const driverMigration = read("supabase/migrations/20260127233015_5ca2a59c-f6eb-4fca-9560-ba33232020d3.sql");

    expect(instant).toContain("customer_wallet_transactions");
    expect(instant).toContain("balance_after_cents: newBalance");
    expect(instant).toContain("type: \"withdrawal\"");
    expect(instant).toContain("balance_cents: newBalance");

    expect(paypal).toContain("customer_wallet_transactions");
    expect(paypal).toContain("balance_after_cents: newBalance");
    expect(paypal).toContain("type: \"withdrawal\"");
    expect(withdrawal).toContain("process_customer_wallet_withdrawal");
    expect(atomicWithdrawal).toContain("RETURNS TABLE(transaction_id uuid, new_balance_cents integer)");
    expect(atomicWithdrawal).toContain("balance_after_cents");
    expect(atomicWithdrawal).toContain("'withdrawal'");

    expect(driverResolve).toContain("appendDescription");
    expect(driverResolve).toContain("admin_driver_actions");
    expect(driverResolve).toContain("driver_manual_payout_marked_paid");
    expect(driverResolve).toContain("driver_stripe_payout_marked_paid");
    expect(driverResolve).toContain("driver_payout_waived");

    expect(walletMigration).toContain("CREATE TABLE IF NOT EXISTS public.user_wallet_transactions");
    expect(walletMigration).toContain("balance_after_cents BIGINT NOT NULL");
    expect(walletMigration).toContain("Users read own transactions");

    expect(walletHardening).toContain("cwt_insert_auth");
    expect(walletHardening).toContain("wallet_tx_read_auth");

    expect(adminLedger).toContain("CREATE TABLE IF NOT EXISTS public.admin_wallet_ledger");
    expect(adminLedger).toContain("admin_wallet_ledger_tx_source_uidx");
    expect(adminLedger).toContain("Admins can read admin wallet ledger");

    expect(creatorMigration).toContain("CREATE TABLE IF NOT EXISTS public.creator_earnings");
    expect(creatorMigration).toContain("CREATE TABLE IF NOT EXISTS public.creator_payouts");
    expect(creatorMigration).toContain("CREATE POLICY \"ce_sel\"");
    expect(creatorMigration).toContain("CREATE POLICY \"cpay_sel\"");

    expect(driverMigration).toContain("CREATE TABLE IF NOT EXISTS public.driver_earnings");
    expect(driverMigration).toContain("driver_earnings");
    expect(driverMigration).toContain("admin_driver_actions");
  });

  it("keeps share-to-earn wallet and loyalty rewards behind server-side intake", () => {
    const shareFunction = read("supabase/functions/share-to-earn-manage/index.ts");
    const shareGate = read("supabase/migrations/20260601114500_share_to_earn_server_gate.sql");
    const dataApiGrants = read("supabase/migrations/20260601154700_data_api_grants_referrals_and_webhook_events.sql");
    const shareHook = read("src/hooks/useShareToEarn.ts");

    expect(shareFunction).toContain('withSecurity("share-to-earn-manage"');
    expect(shareFunction).toContain("strictCors: true");
    expect(shareFunction).toContain('allowedMethods: ["POST"]');
    expect(shareFunction).toContain('rateLimit: "payment"');
    expect(shareFunction).toContain('trackNetwork: "suspicious"');
    expect(shareFunction).toContain("blockNetworkRiskAt: 80");
    expect(shareFunction).toContain("admin.auth.getUser(token)");
    expect(shareFunction).toContain('.from("user_referral_codes")');
    expect(shareFunction).toContain('.from("referral_shares")');
    expect(shareFunction).toContain('.from("referral_conversions")');
    expect(shareFunction).toContain('.from("customer_wallet_transactions")');
    expect(shareFunction).toContain('.from("loyalty_points")');
    expect(shareFunction).toContain("balance_after_cents: newBalance");
    expect(shareFunction).toContain("buyerUserId && buyerUserId !== user.id");

    expect(shareGate).toContain("ALTER TABLE public.user_referral_codes ENABLE ROW LEVEL SECURITY");
    expect(shareGate).toContain("ALTER TABLE public.referral_shares ENABLE ROW LEVEL SECURITY");
    expect(shareGate).toContain("ALTER TABLE public.referral_conversions ENABLE ROW LEVEL SECURITY");
    expect(shareGate).toContain("user_referral_codes_block_direct_insert");
    expect(shareGate).toContain("referral_shares_block_direct_insert");
    expect(shareGate).toContain("referral_conversions_block_direct_update");
    expect(shareGate).toContain("trusted server-side reward validation");
    expect(dataApiGrants).toContain("GRANT SELECT ON TABLE public.user_referral_codes TO authenticated;");
    expect(dataApiGrants).toContain("GRANT SELECT ON TABLE public.referral_shares TO authenticated;");
    expect(dataApiGrants).toContain("GRANT SELECT ON TABLE public.referral_conversions TO authenticated;");

    expect(shareHook).toMatch(serverGatedInvoke("share-to-earn-manage"));
    expect(shareHook).not.toMatch(/from\("user_referral_codes"\)[\s\S]{0,180}\.(insert|update|delete|upsert)/);
    expect(shareHook).not.toMatch(/from\("referral_shares"\)[\s\S]{0,180}\.(insert|update|delete|upsert)/);
    expect(shareHook).not.toMatch(/from\("referral_conversions"\)[\s\S]{0,180}\.(insert|update|delete|upsert)/);
    expect(shareHook).not.toMatch(/from\("customer_wallet_transactions"\)[\s\S]{0,180}\.(insert|update|delete|upsert)/);
    expect(shareHook).not.toMatch(/from\("loyalty_points"\)[\s\S]{0,180}\.(insert|update|delete|upsert)/);
  });

  it("keeps loyalty balance mutations behind server-side point accounting", () => {
    const loyaltyFunction = read("supabase/functions/loyalty-points-manage/index.ts");
    const loyaltyGate = read("supabase/migrations/20260601120000_loyalty_points_server_gate.sql");
    const loyaltyHook = read("src/hooks/useLoyaltyPoints.ts");

    expect(loyaltyFunction).toContain('withSecurity("loyalty-points-manage"');
    expect(loyaltyFunction).toContain("strictCors: true");
    expect(loyaltyFunction).toContain('allowedMethods: ["POST"]');
    expect(loyaltyFunction).toContain('rateLimit: "payment"');
    expect(loyaltyFunction).toContain('trackNetwork: "suspicious"');
    expect(loyaltyFunction).toContain("blockNetworkRiskAt: 80");
    expect(loyaltyFunction).toContain("admin.auth.getUser(token)");
    expect(loyaltyFunction).toContain('.from("loyalty_points")');
    expect(loyaltyFunction).toContain('.from("customer_wallet_transactions")');
    expect(loyaltyFunction).toContain('type: "loyalty_earn"');
    expect(loyaltyFunction).toContain('type: "loyalty_redeem"');
    expect(loyaltyFunction).toContain("MIN_REDEMPTION_POINTS");

    expect(loyaltyGate).toContain('DROP POLICY IF EXISTS "Users can insert own loyalty points"');
    expect(loyaltyGate).toContain('DROP POLICY IF EXISTS "Users can update own loyalty points"');
    expect(loyaltyGate).toContain("loyalty_points_block_direct_insert");
    expect(loyaltyGate).toContain("loyalty_points_block_direct_update");
    expect(loyaltyGate).toContain("trusted server-side point accounting");

    expect(loyaltyHook).toMatch(serverGatedInvoke("loyalty-points-manage"));
    expect(loyaltyHook).not.toMatch(/from\("loyalty_points"\)[\s\S]{0,240}\.(insert|update|delete|upsert)/);
  });

  it("keeps wallet checkout debits behind atomic server-side balance checks", () => {
    const walletFunction = read("supabase/functions/wallet-payment-deduct/index.ts");
    const walletGate = read("supabase/migrations/20260601121500_customer_wallet_payment_server_gate.sql");
    const walletHook = read("src/hooks/useWalletPayment.ts");

    expect(walletFunction).toContain('withSecurity("wallet-payment-deduct"');
    expect(walletFunction).toContain("strictCors: true");
    expect(walletFunction).toContain('rateLimit: "payment"');
    expect(walletFunction).toContain('trackNetwork: "suspicious"');
    expect(walletFunction).toContain("blockNetworkRiskAt: 80");
    expect(walletFunction).toContain("admin.auth.getUser(token)");
    expect(walletFunction).toContain('rpc("process_customer_wallet_payment"');
    expect(walletFunction).toContain("requestedUserId !== user.id");
    expect(walletFunction).toContain("insufficient_funds");

    expect(walletGate).toContain("CREATE OR REPLACE FUNCTION public.process_customer_wallet_payment");
    expect(walletGate).toContain("FOR UPDATE");
    expect(walletGate).toContain("balance_cents = balance_cents - p_amount_cents");
    expect(walletGate).toContain("INSERT INTO public.customer_wallet_transactions");
    expect(walletGate).toContain("'payment'");
    expect(walletGate).toContain("GRANT EXECUTE ON FUNCTION public.process_customer_wallet_payment(uuid, integer, text, uuid) TO service_role");
    expect(walletGate).toContain('DROP POLICY IF EXISTS "cw_update_own"');
    expect(walletGate).toContain("customer_wallets_block_direct_update");
    expect(walletGate).toContain("trusted server-side balance checks");

    expect(walletHook).toMatch(serverGatedInvoke("wallet-payment-deduct"));
    expect(walletHook).not.toMatch(/from\("customer_wallets"\)[\s\S]{0,240}\.(insert|update|delete|upsert)/);
    expect(walletHook).not.toMatch(/from\("customer_wallet_transactions"\)[\s\S]{0,240}\.(insert|update|delete|upsert)/);
  });
});
