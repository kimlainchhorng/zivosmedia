import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationPath =
  "supabase/migrations/20260830164600_harden_anonymous_security_definer_mutations.sql";

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8")
    .replace(/\r\n/g, "\n")
    .toLowerCase();

describe("anonymous SECURITY DEFINER mutation hardening", () => {
  const migration = read(migrationPath);

  it("removes every browser grant from the unowned BBQ promo counter", () => {
    expect(migration).toContain(
      "revoke execute on function public.bbq_bump_promo(uuid) from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.bbq_bump_promo(uuid) to service_role",
    );
    expect(migration).toContain(
      "bbq_bump_promo(uuid) effective acl is not service-role-only",
    );
  });

  it("makes the arbitrary generic counter service-role-only", () => {
    expect(migration).toContain(
      "revoke execute on function public.increment_counter(text,text,uuid,integer) from public, anon, authenticated",
    );
    expect(migration).toContain(
      "grant execute on function public.increment_counter(text,text,uuid,integer) to service_role",
    );
    expect(migration).toContain(
      "increment_counter(text,text,uuid,integer) effective acl is not service-role-only",
    );
    expect(
      migration.match(/has_function_privilege\('authenticated'/g),
    ).toHaveLength(2);
    expect(
      migration.match(/has_function_privilege\('service_role'/g),
    ).toHaveLength(2);
  });

  it("does not revoke the intentional public booking and bearer-link functions", () => {
    for (const publicFlow of [
      "create_car_rental_app_reservation",
      "salon_public_cancel_booking",
      "salon_public_submit_review",
    ]) {
      expect(migration).not.toMatch(
        new RegExp(`revoke execute on function public\\.${publicFlow}`),
      );
    }
  });
});
