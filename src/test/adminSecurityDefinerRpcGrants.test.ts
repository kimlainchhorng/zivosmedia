import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve("supabase/migrations/20260605025409_lockdown_admin_security_definer_rpc_grants.sql"),
  "utf8",
);

describe("admin security definer RPC grants", () => {
  it("revokes anonymous execution from admin RPCs and keeps authenticated admin checks reachable", () => {
    expect(migration).toContain("p.prosecdef");
    expect(migration).toContain("p.proname like 'admin\\_%'");
    expect(migration).toContain("revoke execute on function %s from public");
    expect(migration).toContain("revoke execute on function %s from anon");
    expect(migration).toContain("grant execute on function %s to authenticated");
    expect(migration).toContain("grant execute on function %s to service_role");
  });
});
