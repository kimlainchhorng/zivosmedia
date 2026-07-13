import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260605031308_lockdown_account_wallet_function_anon_grants.sql",
  ),
  "utf8",
);

const accountWalletFunctions = [
  "get_my_user_access",
  "get_my_bus_bookings",
  "get_daily_reward_status",
  "claim_daily_coin_reward",
  "register_trusted_device",
  "unlock_dm_with_wallet",
  "unlock_ppv_with_wallet",
];

describe("account and wallet RPC anonymous grant lockdown", () => {
  it.each(accountWalletFunctions)("includes %s in the signed-in-only allowlist", (functionName) => {
    expect(migration).toContain(`'${functionName}'`);
  });

  it("removes anonymous execution while preserving signed-in and service-role access", () => {
    expect(migration).toContain("revoke execute on function %s from public");
    expect(migration).toContain("revoke execute on function %s from anon");
    expect(migration).toContain("grant execute on function %s to authenticated");
    expect(migration).toContain("grant execute on function %s to service_role");
  });
});
