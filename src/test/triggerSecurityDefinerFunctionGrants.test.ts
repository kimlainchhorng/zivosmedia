import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260605030511_lockdown_trigger_security_definer_function_grants.sql",
  ),
  "utf8",
);

describe("trigger security definer function grants", () => {
  it("targets only public security-definer functions attached to non-internal triggers", () => {
    expect(migration).toContain("join pg_trigger t on t.tgfoid = p.oid");
    expect(migration).toContain("where n.nspname = 'public'");
    expect(migration).toContain("and p.prosecdef");
    expect(migration).toContain("and not t.tgisinternal");
  });

  it("revokes browser-facing execution while keeping service-role execution", () => {
    expect(migration).toContain("revoke execute on function %s from public");
    expect(migration).toContain("revoke execute on function %s from anon");
    expect(migration).toContain("revoke execute on function %s from authenticated");
    expect(migration).toContain("grant execute on function %s to service_role");
  });
});
