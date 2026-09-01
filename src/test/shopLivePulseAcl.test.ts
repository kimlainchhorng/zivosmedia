import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260830161008_release_backend_security_reconciliation.sql",
  ),
  "utf8",
);

describe("public shop live-pulse privileges", () => {
  it("removes inherited table privileges from browser roles", () => {
    expect(migration).toContain(
      "revoke all on table public.shop_live_pulse from public, anon, authenticated;",
    );
  });

  it("exposes only the storefront-safe pulse columns", () => {
    expect(migration).toContain(
      "grant select (store_id, last_purchase_at) on table public.shop_live_pulse\n  to anon, authenticated;",
    );
    expect(migration).not.toContain(
      "grant select on table public.shop_live_pulse to anon, authenticated;",
    );
  });
});
