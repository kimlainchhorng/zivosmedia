import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (file: string) =>
  readFileSync(path.join(root, file), "utf8").replace(/\r\n/g, "\n");

const migration = source(
  "supabase/migrations/20260830193500_payout_method_verification_authority.sql",
);
const wallet = source("src/pages/account/WalletPage.tsx");
const adminWallet = source("src/pages/admin/AdminWalletPage.tsx");
const adminDriverPayouts = source("src/pages/admin/AdminDriverPayoutsPage.tsx");
const driver = source("src/pages/driver/DriverPayoutsPage.tsx");
const eatsRequest = source(
  "src/components/admin/store/restaurant/EatsRequestPayoutSheet.tsx",
);
const lodgingAccount = source(
  "src/components/admin/store/lodging/LodgingPayoutAccountCard.tsx",
);
const lodgingRequest = source(
  "src/components/admin/store/lodging/LodgingRequestPayoutSheet.tsx",
);
const lodgingHistory = source(
  "src/components/admin/store/lodging/LodgingPayoutHistoryTable.tsx",
);

function functionBody(startMarker: string, endMarker: string): string {
  const start = migration.indexOf(startMarker);
  const end = migration.indexOf(endMarker, start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(file);
    if (!/\.(ts|tsx|js|jsx)$/.test(entry.name)) return [];
    if (/\.(test|spec)\.[^.]+$/.test(entry.name)) return [];
    if (file.endsWith(path.join("integrations", "supabase", "types.ts"))) {
      return [];
    }
    return [file];
  });
}

describe("Payout destination privacy and account isolation", () => {
  it("revokes browser base-table reads and exposes only masked owner fields", () => {
    const ownerRpc = functionBody(
      "create or replace function public.list_own_customer_payout_methods(",
      "revoke all on function public.list_own_customer_payout_methods(",
    );

    expect(migration).toContain(
      "revoke select on table public.customer_payout_methods\n  from public, anon, authenticated",
    );
    expect(ownerRpc).toContain("destination_last4 text");
    expect(ownerRpc).toContain("method.user_id = v_user_id");
    expect(ownerRpc).toContain("pg_catalog.right(");
    expect(ownerRpc).not.toContain("account_number text");
    expect(ownerRpc).not.toContain("aba_account_id text");
  });

  it("keeps complete destinations behind an MFA and finance-role RPC", () => {
    const financeRpc = functionBody(
      "create or replace function public.list_finance_customer_payout_methods(",
      "revoke all on function public.list_finance_customer_payout_methods(",
    );

    expect(financeRpc).toContain("account_number text");
    expect(financeRpc).toContain("aba_account_id text");
    expect(financeRpc).toContain(
      "(auth.jwt() ->> 'aal') not in ('aal2', 'aal3')",
    );
    expect(financeRpc).toContain("public.has_role(v_user_id, 'finance')");
    expect(financeRpc).toContain("public.has_role(v_user_id, 'admin')");
  });

  it("has no browser-side direct payout-destination table reads", () => {
    const unsafe = sourceFiles(path.join(root, "src")).filter((file) =>
      /\.from\(\s*["']customer_payout_methods["']\s*\)/.test(
        readFileSync(file, "utf8"),
      ),
    );

    expect(unsafe).toEqual([]);
    expect(wallet).toContain('queryKey: ["payout-methods", user?.id]');
    expect(eatsRequest).toContain(
      'queryKey: ["eats-payout-methods", user?.id, restaurantId]',
    );
    expect(lodgingAccount).toContain(
      'queryKey: ["lodge-payout-methods", user?.id, storeId]',
    );
    expect(lodgingRequest).toContain(
      'queryKey: ["lodge-payout-methods", user?.id, storeId]',
    );
  });

  it("clears and guards the non-query Driver reader on every identity revision", () => {
    expect(driver).toContain("const { user } = useAuth()");
    expect(driver).toContain("activeUserIdRef.current = expectedUserId");
    expect(driver).toContain("setStatus(null)");
    expect(driver).toContain("setAbaMethods([])");
    expect(driver).toContain(
      "if (activeUserIdRef.current !== expectedUserId) return",
    );
    expect(driver).toContain("}, [refresh, user?.id])");
  });

  it("keeps lodging history user-keyed and omits internal admin notes", () => {
    expect(lodgingHistory).toContain(
      'queryKey: ["lodge-payout-history", user?.id, storeId]',
    );
    expect(lodgingHistory).toContain("enabled: !!user?.id && !!storeId");
    expect(lodgingHistory).not.toContain("admin_note");
    expect(lodgingHistory).toContain("Status unavailable");
    expect(lodgingRequest).toContain(
      'invalidateQueries({ queryKey: ["lodge-payout-history"] })',
    );
    expect(lodgingAccount.match(/\["lodge-payout-methods"\]/g)?.length).toBe(2);
  });

  it("removes direct legacy cash-out mutations from the admin wallet", () => {
    expect(adminWallet).not.toContain('from("customer_payout_methods")');
    expect(adminWallet).not.toMatch(
      /from\("customer_wallet_transactions"\)[\s\S]{0,160}\.update\(/,
    );
    expect(adminWallet).toContain("Cash-out rail");
    expect(adminWallet).toContain("Paused");
  });

  it("keeps the finance Driver queue bound to the account that loaded it", () => {
    expect(adminDriverPayouts).toContain("activeUserIdRef");
    expect(adminDriverPayouts).toContain("loadedForUserId");
    expect(adminDriverPayouts).toContain(
      "if (activeUserIdRef.current !== expectedUserId) return",
    );
    expect(adminDriverPayouts).toContain("loadedForUserId !== user.id");
    expect(adminDriverPayouts).toContain("setPayoutMethodsByUser({})");
    expect(adminDriverPayouts).toContain("setSelected(null)");
  });

  it("starts a fresh seven-day hold and blocks cross-owner financial history", () => {
    const eligibility = functionBody(
      "create or replace function private.eats_payout_eligibility_window()",
      "revoke all on function private.eats_payout_eligibility_window()",
    );
    const ownerGate = functionBody(
      "create or replace function private.eats_restaurant_financial_owner_gate()",
      "revoke all on function private.eats_restaurant_financial_owner_gate()",
    );

    expect(eligibility).toContain("new.payout_eligible_at := null");
    expect(eligibility).toContain("or not v_old_entitled");
    expect(eligibility).toContain(
      "new.payout_eligible_at := pg_catalog.now() + interval '7 days'",
    );
    expect(ownerGate).toContain("new.owner_id is distinct from old.owner_id");
    expect(ownerGate).toContain("from public.food_orders as food");
    expect(ownerGate).toContain("from public.eats_payout_requests as request");
    expect(ownerGate).toContain("from public.eats_payout_ledger as ledger");
    expect(ownerGate).not.toContain("service_role");
  });
});
