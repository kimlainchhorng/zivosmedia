import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260605040037_lockdown_bot_invite_creation_function_anon_grants.sql",
  ),
  "utf8",
);

describe("bot creation and invite RPC anonymous grant lockdown", () => {
  it.each([
    "create_bot(text, text, text)",
    "claim_employee_invite(text)",
  ])("keeps %s signed-in only", (signature) => {
    expect(migration).toContain(`revoke execute on function public.${signature} from public`);
    expect(migration).toContain(`revoke execute on function public.${signature} from anon`);
    expect(migration).toContain(`grant execute on function public.${signature} to authenticated`);
    expect(migration).toContain(`grant execute on function public.${signature} to service_role`);
  });

  it("keeps create_bot_row service-role only", () => {
    const signature = "create_bot_row(uuid, uuid, text, text, text)";
    expect(migration).toContain(`revoke execute on function public.${signature} from public`);
    expect(migration).toContain(`revoke execute on function public.${signature} from anon`);
    expect(migration).toContain(`revoke execute on function public.${signature} from authenticated`);
    expect(migration).toContain(`grant execute on function public.${signature} to service_role`);
  });
});
