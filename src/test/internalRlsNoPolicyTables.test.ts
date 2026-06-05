import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260605030003_lockdown_internal_rls_no_policy_tables.sql",
  ),
  "utf8",
);

describe("internal RLS tables lockdown migration", () => {
  it.each(["ar_doc_counters", "bot_updates", "bot_user_state"])(
    "revokes browser roles and creates an explicit deny policy for %s",
    (tableName) => {
      expect(migration).toContain(`revoke all on table public.${tableName} from public`);
      expect(migration).toContain(`revoke all on table public.${tableName} from anon`);
      expect(migration).toContain(`revoke all on table public.${tableName} from authenticated`);
    },
  );

  it("keeps the policies closed for reads and writes", () => {
    expect(migration.match(/using \(false\)/g)).toHaveLength(3);
    expect(migration.match(/with check \(false\)/g)).toHaveLength(3);
  });
});
