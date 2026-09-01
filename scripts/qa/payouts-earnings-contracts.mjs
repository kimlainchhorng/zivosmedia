#!/usr/bin/env node
/**
 * Payouts, earnings, and balances contract check.
 *
 * Verifies payout mutation auth, server-only payout method writes,
 * Connect/payout UI states, idempotent payout retries, and auditable ledgers.
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
  // Normalize CRLF -> LF so multiline assertions are line-ending agnostic
  // (Windows/OneDrive checkouts with core.autocrlf=true yield CRLF files).
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function requireContains(id, text, needle, relativePath) {
  if (!text.includes(needle)) {
    failures.push(`${id}: ${relativePath} missing ${JSON.stringify(needle)}`);
  }
}

function requireMatch(id, text, pattern, relativePath) {
  if (!pattern.test(text)) {
    failures.push(`${id}: ${relativePath} missing pattern ${pattern}`);
  }
}

function requirePostMutationRoute(id, text, relativePath) {
  requireContains(id, text, "strictCors: true", relativePath);
  requireContains(id, text, 'allowedMethods: ["POST"]', relativePath);
  requireContains(id, text, 'trackNetwork: "suspicious"', relativePath);
}

const walletCashoutTombstones = [
  "process-withdrawal",
  "connect-instant-payout",
  "paypal-payout",
  "wallet-instant-payout",
  "stripe-instant-payout",
];

function requireWalletCashoutTombstones(id) {
  for (const route of walletCashoutTombstones) {
    const relativePath = `supabase/functions/${route}/index.ts`;
    const text = source(relativePath);
    requirePostMutationRoute(id, text, relativePath);
    requireContains(id, text, `"${route}"`, relativePath);
    requireContains(
      id,
      text,
      'code: "wallet_cashout_authority_unavailable"',
      relativePath,
    );
    requireContains(id, text, "retryable: false", relativePath);
    requireContains(id, text, "status: 503", relativePath);

    for (const forbidden of [
      "withIdempotency(",
      "process_customer_wallet_withdrawal",
      "customer_wallet_transactions",
      "stripe.transfers.create",
      "stripe.payouts.create",
      "sender_batch_id",
    ]) {
      if (text.includes(forbidden)) {
        failures.push(
          `${id}: ${relativePath} must remain a non-mutating tombstone; found ${JSON.stringify(forbidden)}`,
        );
      }
    }
  }
}

const contracts = [
  {
    id: "authenticated-payout-mutations",
    category: "backend",
    check() {
      const paths = {
        creator: "supabase/functions/creator-payout-request/index.ts",
        driverPayout: "supabase/functions/driver-payout/index.ts",
        driverResolve:
          "supabase/functions/resolve-driver-earning-payout/index.ts",
        lodging: "supabase/functions/lodge-payout-request/index.ts",
        eats: "supabase/functions/eats-payout-request/index.ts",
        merchant: "supabase/functions/merchant-payout-request/index.ts",
        arPayout: "supabase/functions/ar-payout-record/index.ts",
        cafeTipPayout: "supabase/functions/cafe-tip-payout-record/index.ts",
        salonPayout:
          "supabase/functions/salon-commission-payout-record/index.ts",
      };
      const files = Object.fromEntries(
        Object.entries(paths).map(([key, relativePath]) => [
          key,
          source(relativePath),
        ]),
      );

      for (const [key, relativePath] of Object.entries(paths)) {
        requirePostMutationRoute(this.id, files[key], relativePath);
      }
      requireWalletCashoutTombstones(this.id);
      for (const needle of [
        'if (!auth) return json({ error: "Not authenticated" }, 401)',
        "enforceAal2(auth, corsHeaders)",
        'withIdempotency(req, "creator-payout-request", user.id',
        '"request_live_earnings_payout"',
        '"X-Idempotency-Cache"',
      ]) {
        requireContains(this.id, files.creator, needle, paths.creator);
      }
      for (const [key, relativePath] of [
        ["driverPayout", paths.driverPayout],
        ["driverResolve", paths.driverResolve],
      ]) {
        requireContains(this.id, files[key], "has_role", relativePath);
        requireContains(this.id, files[key], '_role: "admin"', relativePath);
        requireContains(
          this.id,
          files[key],
          "admin_driver_actions",
          relativePath,
        );
      }
      for (const needle of [
        "enforceAal2(auth, corsHeaders)",
        'if (store.owner_id !== user.id) throw new Error("Not authorized for this store")',
        "method.user_id !== user.id || method.store_id !== store_id",
      ]) {
        requireContains(this.id, files.lodging, needle, paths.lodging);
      }
      for (const needle of [
        "enforceAal2(auth, corsHeaders)",
        "owner_id",
        "Payout method does not belong to this restaurant",
      ]) {
        requireContains(this.id, files.eats, needle, paths.eats);
      }
      for (const [key, route] of [
        ["merchant", "merchant-payout-request"],
        ["arPayout", "ar-payout-record"],
        ["cafeTipPayout", "cafe-tip-payout-record"],
        ["salonPayout", "salon-commission-payout-record"],
      ]) {
        requireContains(
          this.id,
          files[key],
          `withSecurity("${route}"`,
          paths[key],
        );
        requireContains(
          this.id,
          files[key],
          "enforceAal2(authHeader, corsHeaders)",
          paths[key],
        );
        requireContains(
          this.id,
          files[key],
          "withIdempotency(req,",
          paths[key],
        );
        requireContains(
          this.id,
          files[key],
          '"X-Idempotency-Cache"',
          paths[key],
        );
      }
      for (const needle of [
        '.from("store_profiles")',
        '.from("store_orders")',
        '.from("merchant_payouts")',
        "availableCents",
      ]) {
        requireContains(this.id, files.merchant, needle, paths.merchant);
      }
      for (const needle of [
        "assertCanManageStore",
        'rpc("has_role"',
        '.from("restaurants")',
        '.from("store_profiles")',
      ]) {
        requireContains(this.id, files.arPayout, needle, paths.arPayout);
      }
      for (const needle of [
        "assertCanManageStore",
        'rpc("has_role"',
        '.from("cafe_baristas")',
        "lineTotal !== totalCents",
        '.from("cafe_tip_payouts")',
      ]) {
        requireContains(
          this.id,
          files.cafeTipPayout,
          needle,
          paths.cafeTipPayout,
        );
      }
      for (const needle of [
        "assertCanManageStore",
        'rpc("has_role"',
        '.from("salon_stylists")',
        '.from("salon_bookings")',
        "requestedTotal !== totalPaidCents",
      ]) {
        requireContains(this.id, files.salonPayout, needle, paths.salonPayout);
      }
    },
  },
  {
    id: "server-gated-payout-methods-and-vertical-payouts",
    category: "rls",
    check() {
      const checks = [
        [
          "src/pages/app/shop/MerchantWalletPage.tsx",
          /invokeSensitive(?:<[^>]+>)?\(\s*["']merchant-payout-request["']/,
          /from\("merchant_payouts"\)\.insert/,
        ],
        [
          "src/components/admin/store/autorepair/finance/FinanceTaxPayoutsSection.tsx",
          /invokeSensitive(?:<[^>]+>)?\(\s*["']ar-payout-record["']/,
          /from\("ar_payouts" as any\)\.(insert|delete)/,
        ],
        [
          "src/hooks/cafe/useCafeTips.ts",
          /supabase\.functions\.invoke\(\s*["']cafe-tip-payout-record["']/,
          /from\("cafe_tip_payouts" as never\)[\s\S]{0,120}\.insert/,
        ],
        [
          "src/components/admin/store/salon/SalonCommissionsSection.tsx",
          /invokeSensitive(?:<[^>]+>)?\(\s*["']salon-commission-payout-record["']/,
          /from\("salon_commission_payouts"\)[\s\S]{0,120}\.(insert|delete)/,
        ],
      ];
      for (const [
        relativePath,
        expectedInvokePattern,
        forbiddenPattern,
      ] of checks) {
        const text = source(relativePath);
        requireMatch(this.id, text, expectedInvokePattern, relativePath);
        requireContains(this.id, text, '"Idempotency-Key"', relativePath);
        if (forbiddenPattern.test(text))
          failures.push(
            `${this.id}: ${relativePath} must not write payout tables directly`,
          );
      }

      const gates = {
        "supabase/migrations/20260531210000_merchant_payout_requests_server_gate.sql":
          ["server-side owner and balance checks"],
        "supabase/migrations/20260531211500_ar_payout_records_server_gate.sql":
          ["Auto-repair payout records are written by ar-payout-record"],
        "supabase/migrations/20260531213000_cafe_tip_payouts_server_gate.sql": [
          "Cafe tip payout headers are written by cafe-tip-payout-record",
        ],
        "supabase/migrations/20260531214500_salon_commission_payouts_server_gate.sql":
          [
            "Salon commission payouts are written by salon-commission-payout-record",
          ],
        "supabase/migrations/20260531220000_customer_payout_methods_server_gate.sql":
          [
            "Payout methods are written by customer-payout-method-record",
            "method_type IN ('bank_transfer', 'aba', 'paypal')",
          ],
        "supabase/migrations/20260531221500_creator_payout_methods_server_gate.sql":
          [
            "prevent_direct_creator_payout_profile_writes",
            "creator_payout_profile_server_gate_required",
            "request_role <> 'service_role'",
          ],
      };
      for (const [relativePath, needles] of Object.entries(gates)) {
        const text = source(relativePath);
        for (const needle of needles)
          requireContains(this.id, text, needle, relativePath);
      }

      const customerMethodPath =
        "supabase/functions/customer-payout-method-record/index.ts";
      const creatorMethodPath =
        "supabase/functions/creator-payout-method-record/index.ts";
      const customerMethod = source(customerMethodPath);
      const creatorMethod = source(creatorMethodPath);
      requirePostMutationRoute(this.id, customerMethod, customerMethodPath);
      requirePostMutationRoute(this.id, creatorMethod, creatorMethodPath);
      requireMatch(
        this.id,
        customerMethod,
        /withSecurity\(\s*"customer-payout-method-record"/,
        customerMethodPath,
      );
      for (const needle of [
        "enforceAal2(authHeader, corsHeaders)",
        'action === "delete"',
        'action === "set_default"',
        "clearDefaultMethods",
      ]) {
        requireContains(this.id, customerMethod, needle, customerMethodPath);
      }
      for (const needle of [
        'withSecurity("creator-payout-method-record"',
        "enforceAal2(authHeader, corsHeaders)",
        '.from("creator_profiles")',
        'payout_method: "paypal"',
        "paypal_email",
      ]) {
        requireContains(this.id, creatorMethod, needle, creatorMethodPath);
      }
      for (const relativePath of [
        "src/pages/account/WalletPage.tsx",
        "src/pages/driver/DriverPayoutsPage.tsx",
        "src/components/admin/store/lodging/LodgingPayoutAccountCard.tsx",
      ]) {
        const text = source(relativePath);
        requireMatch(
          this.id,
          text,
          /invokeSensitive(?:<[^>]+>)?\(\s*["']customer-payout-method-record["']/,
          relativePath,
        );
        if (
          /from\(["']customer_payout_methods["']\)[\s\S]{0,80}\.(insert|update|delete)/.test(
            text,
          )
        ) {
          failures.push(
            `${this.id}: ${relativePath} must not write customer_payout_methods directly`,
          );
        }
      }
      const paypalHookPath = "src/hooks/usePayPalPayout.ts";
      const paypalHook = source(paypalHookPath);
      requireMatch(
        this.id,
        paypalHook,
        /invokeMaybeSensitive\(\s*["']creator-payout-method-record["']/,
        paypalHookPath,
      );
      requireContains(
        this.id,
        paypalHook,
        '"Idempotency-Key": idempotencyKey',
        paypalHookPath,
      );
      if (
        /from\("creator_profiles"\)[\s\S]{0,240}\.(insert|update)/.test(
          paypalHook,
        )
      ) {
        failures.push(
          `${this.id}: ${paypalHookPath} must not write creator_profiles payout fields directly`,
        );
      }
    },
  },
  {
    id: "connect-payout-ui-states",
    category: "frontend",
    check() {
      const stripeCardPath =
        "src/components/wallet/StripeConnectPayoutCard.tsx";
      const unifiedCardPath = "src/components/wallet/UnifiedPayoutCard.tsx";
      const creatorPayoutsPath = "src/pages/CreatorPayoutsPage.tsx";
      const driverPayoutsPath = "src/pages/driver/DriverPayoutsPage.tsx";
      const stripeCard = source(stripeCardPath);
      const unifiedCard = source(unifiedCardPath);
      const creatorPayouts = source(creatorPayoutsPath);
      const driverPayouts = source(driverPayoutsPath);

      for (const needle of [
        "requirements",
        "details_submitted",
        "payouts_enabled",
        "instant_eligible",
        "Continue setup",
        "Standard payouts ready",
      ]) {
        requireContains(this.id, stripeCard, needle, stripeCardPath);
      }
      for (const needle of [
        "Wallet payouts are paused",
        "Stripe and PayPal cash out are temporarily unavailable",
        "Your wallet balance is unchanged",
      ]) {
        requireContains(this.id, unifiedCard, needle, unifiedCardPath);
      }
      for (const needle of [
        "Pending",
        "processing",
        "failed",
        "reversed",
        "Paid",
      ]) {
        requireContains(this.id, creatorPayouts, needle, creatorPayoutsPath);
      }
      for (const needle of [
        "Details",
        "Payouts",
        "Charges",
        "verification_status",
        "Continue onboarding",
      ]) {
        requireContains(this.id, driverPayouts, needle, driverPayoutsPath);
      }

      for (const [route, relativePath] of [
        ["connect-onboard", "supabase/functions/connect-onboard/index.ts"],
        ["connect-status", "supabase/functions/connect-status/index.ts"],
      ]) {
        const text = source(relativePath);
        requireContains(this.id, text, `withSecurity("${route}"`, relativePath);
        requireContains(this.id, text, "supabase.auth.getUser", relativePath);
        requireContains(this.id, text, "strictCors: true", relativePath);
        requireContains(
          this.id,
          text,
          'trackNetwork: "suspicious"',
          relativePath,
        );
        requireContains(this.id, text, "blockNetworkRiskAt: 80", relativePath);
      }
    },
  },
  {
    id: "idempotent-payout-retries",
    category: "idempotency",
    check() {
      const liveEarningsPath = "src/hooks/useLiveEarnings.ts";
      const creatorPayoutPath =
        "supabase/functions/creator-payout-request/index.ts";
      const idempotencyPath =
        "supabase/migrations/20260425214912_ee44c2d6-1039-43b3-9982-c515012cb92c.sql";
      const notificationsPath =
        "supabase/migrations/20260509170000_live_and_payout_notifications.sql";
      const driverPayoutPath = "supabase/functions/driver-payout/index.ts";

      requireWalletCashoutTombstones(this.id);
      requireContains(
        this.id,
        source(liveEarningsPath),
        '"Idempotency-Key": idempotencyKey',
        liveEarningsPath,
      );
      const creatorPayout = source(creatorPayoutPath);
      requirePostMutationRoute(this.id, creatorPayout, creatorPayoutPath);
      requireContains(
        this.id,
        creatorPayout,
        'withIdempotency(req, "creator-payout-request", user.id',
        creatorPayoutPath,
      );
      requireContains(
        this.id,
        source(idempotencyPath),
        "CREATE TABLE IF NOT EXISTS public.idempotency_records",
        idempotencyPath,
      );
      requireContains(
        this.id,
        source(notificationsPath),
        "tg_notify_payout_status",
        notificationsPath,
      );
      const driverPayout = source(driverPayoutPath);
      requirePostMutationRoute(this.id, driverPayout, driverPayoutPath);
      for (const needle of [
        'payout_status === "stripe_paid"',
        "idempotent: true",
        "payout_reference",
        "const idempotencyKey = `driver-payout:${ride_request_id}`",
        "transfer_group: `ride_${ride_request_id}`",
      ]) {
        requireContains(this.id, driverPayout, needle, driverPayoutPath);
      }
    },
  },
  {
    id: "auditable-balance-ledgers",
    category: "ledger",
    check() {
      const driverResolvePath =
        "supabase/functions/resolve-driver-earning-payout/index.ts";
      const walletMigrationPath =
        "supabase/migrations/20260505200000_user_wallet_loyalty_partner.sql";
      const walletHardeningPath =
        "supabase/migrations/20260313174623_6c192c8d-1329-4545-b7be-195a812076a3.sql";
      const adminLedgerPath =
        "supabase/migrations/20260406094500_admin_wallet_ledger.sql";
      const creatorMigrationPath =
        "supabase/migrations/20260403142647_c6037f54-60d7-4ab8-ba14-a542b5ee0233.sql";
      const driverMigrationPath =
        "supabase/migrations/20260127233015_5ca2a59c-f6eb-4fca-9560-ba33232020d3.sql";

      requireWalletCashoutTombstones(this.id);
      const driverResolve = source(driverResolvePath);
      for (const needle of [
        "appendDescription",
        "admin_driver_actions",
        "driver_manual_payout_marked_paid",
        "driver_stripe_payout_marked_paid",
        "driver_payout_waived",
      ]) {
        requireContains(this.id, driverResolve, needle, driverResolvePath);
      }
      const walletMigration = source(walletMigrationPath);
      requireContains(
        this.id,
        walletMigration,
        "CREATE TABLE IF NOT EXISTS public.user_wallet_transactions",
        walletMigrationPath,
      );
      requireContains(
        this.id,
        walletMigration,
        "balance_after_cents BIGINT NOT NULL",
        walletMigrationPath,
      );
      requireContains(
        this.id,
        walletMigration,
        "Users read own transactions",
        walletMigrationPath,
      );
      requireContains(
        this.id,
        source(walletHardeningPath),
        "cwt_insert_auth",
        walletHardeningPath,
      );
      const adminLedger = source(adminLedgerPath);
      requireContains(
        this.id,
        adminLedger,
        "CREATE TABLE IF NOT EXISTS public.admin_wallet_ledger",
        adminLedgerPath,
      );
      requireContains(
        this.id,
        adminLedger,
        "admin_wallet_ledger_tx_source_uidx",
        adminLedgerPath,
      );
      requireContains(
        this.id,
        adminLedger,
        "Admins can read admin wallet ledger",
        adminLedgerPath,
      );
      const creatorMigration = source(creatorMigrationPath);
      requireContains(
        this.id,
        creatorMigration,
        "CREATE TABLE IF NOT EXISTS public.creator_earnings",
        creatorMigrationPath,
      );
      requireContains(
        this.id,
        creatorMigration,
        "CREATE TABLE IF NOT EXISTS public.creator_payouts",
        creatorMigrationPath,
      );
      const driverMigration = source(driverMigrationPath);
      requireContains(
        this.id,
        driverMigration,
        "CREATE TABLE IF NOT EXISTS public.driver_earnings",
        driverMigrationPath,
      );
      requireContains(
        this.id,
        driverMigration,
        "admin_driver_actions",
        driverMigrationPath,
      );
    },
  },
];

for (const contract of contracts) contract.check();

console.log(
  JSON.stringify(
    {
      generated: new Date().toISOString(),
      counts: {
        contracts: contracts.length,
        failures: failures.length,
      },
      contracts: contracts.map(({ id, category }) => ({ id, category })),
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) {
  process.exitCode = 1;
}
