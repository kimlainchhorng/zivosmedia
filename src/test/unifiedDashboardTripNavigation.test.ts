import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("Unified Dashboard trip navigation", () => {
  it("turns cards with a detail path into full-card accessible links", () => {
    const dashboard = source("src/pages/app/UnifiedDashboard.tsx");

    expect(dashboard).toContain("const detailPath = trip.detailPath;");
    expect(dashboard).toContain("return detailPath ? (");
    expect(dashboard).toContain("<Link to={detailPath}");
    expect(dashboard).toContain("focus-visible:ring-2 focus-visible:ring-ring");
  });

  it("does not show a navigation chevron when no destination exists", () => {
    const dashboard = source("src/pages/app/UnifiedDashboard.tsx");

    expect(dashboard).toMatch(
      /\{detailPath && <ChevronRight className="w-4 h-4 [^"]+" \/>\}/,
    );
    expect(dashboard).not.toContain('to={trip.detailPath || "/my-trips"}');
  });

  it("keeps the live Ride detail path connected to a registered route", () => {
    const trips = source("src/hooks/useUnifiedTrips.ts");
    const app = source("src/App.tsx");

    expect(trips).toContain("detailPath: `/trip-status/${t.id}`");
    expect(app).toMatch(
      /<Route\s+path="\/trip-status\/:id"\s+element=\{\s*<ProtectedRoute>\s*<PhoneRequiredGate>\s*<CambodiaOnlyGate>\s*<TripStatusPage\s*\/>\s*<\/CambodiaOnlyGate>\s*<\/PhoneRequiredGate>\s*<\/ProtectedRoute>\s*\}\s*\/>/,
    );
  });
});
