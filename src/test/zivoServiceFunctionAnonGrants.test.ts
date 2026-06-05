import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260605033931_lockdown_zivo_service_function_anon_grants.sql",
  ),
  "utf8",
);

const serviceFunctions = [
  "zivo_accept_offer",
  "zivo_driver_heartbeat",
  "zivo_mark_messages_read",
  "zivo_redeem_service_promo",
  "zivo_send_service_message",
  "zivo_transition_status",
];

describe("zivo service RPC anonymous grant lockdown", () => {
  it.each(serviceFunctions)("includes %s in the signed-in-only allowlist", (functionName) => {
    expect(migration).toContain(`'${functionName}'`);
  });

  it("removes anonymous execution while preserving signed-in and service-role access", () => {
    expect(migration).toContain("revoke execute on function %s from public");
    expect(migration).toContain("revoke execute on function %s from anon");
    expect(migration).toContain("grant execute on function %s to authenticated");
    expect(migration).toContain("grant execute on function %s to service_role");
  });
});
