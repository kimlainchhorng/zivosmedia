import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8");
}

describe("auto repair labor guide vehicle workflow", () => {
  it("does not ask for customer name when adding a guide vehicle", () => {
    const section = source("src/components/admin/store/autorepair/AutoRepairLaborTimeSection.tsx");

    expect(section).not.toContain("Enter customer name");
    expect(section).not.toContain("<Label className=\"text-xs\">Customer *</Label>");
    expect(section).not.toContain('placeholder="Customer name"');
    expect(section).toContain('const ownerName = vehicleDraft.owner_name.trim() || "Labor guide vehicle";');
    expect(section).toContain("owner_name: ownerName");
  });

  it("does not ask for phone when adding a guide vehicle", () => {
    const section = source("src/components/admin/store/autorepair/AutoRepairLaborTimeSection.tsx");

    expect(section).not.toContain("<Label className=\"text-xs\">Phone</Label>");
    expect(section).not.toContain('placeholder="(555) 123-4567"');
    expect(section).toContain("owner_phone: vehicleDraft.owner_phone.trim() || null");
  });

  it("lets USA state and license plate fill a saved VIN from the shop vehicle list", () => {
    const section = source("src/components/admin/store/autorepair/AutoRepairLaborTimeSection.tsx");
    const migration = source("supabase/migrations/20260601273500_ar_customer_vehicle_plate_state.sql");

    expect(section).toContain("const US_STATES = [");
    expect(section).toContain("grid gap-2 md:grid-cols-2");
    expect(section).toContain("<Label className=\"text-xs\">License plate</Label>");
    expect(section).toContain("focus-within:ring-2");
    expect(section).toContain("<SelectValue placeholder=\"State\" />");
    expect(section).toContain("rounded-none border-0 border-r");
    expect(section).toContain("rounded-none border-0 font-mono");
    expect(section).toContain("plate_state: v === \"none\" ? \"\" : v");
    expect(section).toContain("const lookupGuidePlate = () =>");
    expect(section).toContain("Choose a USA state");
    expect(section).toContain("Plate matched a saved vehicle and filled the VIN");
    expect(section).toContain("if (e.key === \"Enter\") { e.preventDefault(); lookupGuidePlate(); }");
    expect(migration).toContain("add column if not exists plate_state text");
    expect(migration).toContain("idx_ar_cust_vehicles_plate_state");
  });

  it("uses a year picker for guide vehicles", () => {
    const section = source("src/components/admin/store/autorepair/AutoRepairLaborTimeSection.tsx");

    expect(section).toContain("const VEHICLE_YEAR_OPTIONS = Array.from");
    expect(section).toContain("<Label className=\"text-xs\">Year *</Label>");
    expect(section).toContain("<SelectValue placeholder=\"Choose year\" />");
    expect(section).toContain("<SelectItem value=\"none\">Choose year</SelectItem>");
    expect(section).toContain("VEHICLE_YEAR_OPTIONS.map");
  });
});
