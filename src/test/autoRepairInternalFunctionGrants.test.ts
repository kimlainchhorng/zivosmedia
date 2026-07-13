import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260605030155_lockdown_auto_repair_internal_function_grants.sql",
  ),
  "utf8",
);

describe("auto-repair internal function grant lockdown", () => {
  it.each(["ar_invoices_enforce_fleet_rules", "ar_recalc_invoice_payment"])(
    "removes direct client execution from trigger function %s",
    (functionName) => {
      expect(migration).toContain(`revoke execute on function public.${functionName}() from public`);
      expect(migration).toContain(`revoke execute on function public.${functionName}() from anon`);
      expect(migration).toContain(
        `revoke execute on function public.${functionName}() from authenticated`,
      );
    },
  );

  it("keeps document-number allocation available only to signed-in/server roles", () => {
    expect(migration).toContain(
      "revoke execute on function public.ar_next_doc_number(uuid, text) from public",
    );
    expect(migration).toContain(
      "revoke execute on function public.ar_next_doc_number(uuid, text) from anon",
    );
    expect(migration).toContain(
      "grant execute on function public.ar_next_doc_number(uuid, text) to authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.ar_next_doc_number(uuid, text) to service_role",
    );
  });
});
