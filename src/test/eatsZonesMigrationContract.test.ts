import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260808153652_ensure_eats_zones_public_read_contract.sql",
  ),
  "utf8",
).replace(/\r\n/g, "\n");

describe("main Eats zone migration contract", () => {
  it("repairs the table without requiring a clean migration history", () => {
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS public.eats_zones");
    expect(migration).toContain("ALTER TABLE public.eats_zones");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS city_id uuid");
    expect(migration).toContain("ADD COLUMN IF NOT EXISTS services_enabled jsonb");
    expect(migration).toContain("CREATE INDEX IF NOT EXISTS idx_eats_zones_code");
    expect(migration).toContain("CREATE INDEX IF NOT EXISTS idx_eats_zones_active_city");
  });

  it("keeps public city lookup read-only and RLS protected", () => {
    expect(migration).toContain("ALTER TABLE public.eats_zones ENABLE ROW LEVEL SECURITY");
    expect(migration).toContain("CREATE POLICY eats_zones_public_read");
    expect(migration).toContain("FOR SELECT");
    expect(migration).toContain("TO anon, authenticated");
    expect(migration).toContain("GRANT SELECT ON TABLE public.eats_zones TO anon, authenticated");
    expect(migration).not.toMatch(/GRANT\s+(?:ALL|INSERT|UPDATE|DELETE)/i);
  });

  it("seeds only a safe default row and never deletes existing zones", () => {
    expect(migration).toContain("VALUES ('Default', 'DEFAULT', 2.99, 15.00, 0.0825)");
    expect(migration).toContain("ON CONFLICT (zone_code) DO NOTHING");
    expect(migration).not.toMatch(/\b(?:DROP|TRUNCATE|DELETE\s+FROM)\b/i);
  });
});
