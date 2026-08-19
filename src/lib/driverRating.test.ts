import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { displayableDriverRating } from "./driverRating";

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

/**
 * Source with comments removed.
 *
 * The first version of the "no invented fallback" assertion below matched its
 * own explanatory comment — a docblock in DriverEnRouteTracker that names the
 * `rating ?? 4.8` it warns against. A test that greps prose reports the defect
 * it is describing, so strip comments and assert on code.
 */
const readCode = (rel: string) =>
  read(rel)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * `drivers.rating` carries a column default of 5 beside `rating_count = 0`, so
 * every check on the value alone — `!= null`, truthiness, `Number.isFinite` —
 * is satisfied by a driver nobody has ever rated. This app had six such sites,
 * two of which invented a score outright (`?? 5.0`, `?? 4.8`).
 *
 * Measured on the shared driver project 2026-08-19: of 116 drivers, none has
 * `rating_count > 0`. No ride has ever completed, so no rating can exist yet.
 */
describe("a rating needs someone who gave it", () => {
  it("does not render the column default", () => {
    expect(displayableDriverRating(5, 0)).toBeNull();
    expect(displayableDriverRating(5, null)).toBeNull();
    expect(displayableDriverRating(5, undefined)).toBeNull();
  });

  it("does not render a plausible score nobody produced", () => {
    expect(displayableDriverRating(4.8, 0)).toBeNull();
  });

  it("keeps a rating that was actually given", () => {
    // The control. Without it, returning null unconditionally would pass.
    expect(displayableDriverRating(4.8, 12)).toBe("4.8");
    expect(displayableDriverRating(5, 1)).toBe("5.0");
  });

  it("rejects values that are not ratings even when a count exists", () => {
    expect(displayableDriverRating(0, 3)).toBeNull();
    expect(displayableDriverRating(7, 3)).toBeNull();
    expect(displayableDriverRating("nonsense", 3)).toBeNull();
  });
});

describe("the queries feed the guard the column it depends on", () => {
  // A guard reading a column nobody selected is always false, which hides every
  // REAL rating instead of every invented one. That failure is silent and looks
  // exactly like success here, so pin the selects.
  it.each([
    ["src/hooks/useDriverDashboardData.ts", "drivers profile"],
    ["src/pages/grocery/GroceryOrderTracking.tsx", "grocery driver"],
    ["supabase/functions/get-shared-trip/index.ts", "public shared trip"],
  ])("%s selects rating_count", (rel) => {
    expect(read(rel)).toContain("rating_count");
  });
});

describe("no screen invents a driver statistic any more", () => {
  it.each([
    "src/hooks/useDriverDashboardData.ts",
    "src/pages/TripStatusPage.tsx",
    "src/components/rides/DriverEnRouteTracker.tsx",
    "src/pages/grocery/GroceryOrderTracking.tsx",
    "src/pages/public/SharedTripPage.tsx",
  ])("%s has no hardcoded rating fallback", (rel) => {
    const source = readCode(rel);
    expect(source).not.toMatch(/rating\s*\?\?\s*[0-9]/);
    expect(source).not.toMatch(/acceptance_rate\s*\?\?\s*[0-9]/);
  });
});
