import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const dashboard = readFileSync(
  resolve(process.cwd(), "src/pages/app/UnifiedDashboard.tsx"),
  "utf8",
);

describe("Unified Dashboard intelligence truthfulness", () => {
  it("does not present unsupported safety or carbon claims as account data", () => {
    for (const unsupportedClaim of [
      "Paris",
      "Tokyo",
      "Cancún",
      "Protests planned Mar 8",
      "Weather advisory",
      "1.2 tons",
      "Top 20%",
      "greenTrips",
      "carbonData",
      "safetyAlerts",
    ]) {
      expect(dashboard).not.toContain(unsupportedClaim);
    }
  });

  it("labels both unsupported intelligence panels as unavailable", () => {
    expect(dashboard).toContain("Live safety alerts unavailable");
    expect(dashboard).toContain("Carbon estimate unavailable");
    expect(dashboard.match(/>Unavailable<\/Badge>/g)).toHaveLength(2);
    expect(dashboard.match(/role="status"/g)).toHaveLength(2);
    expect(dashboard).toContain("verified travel-advisory provider");
    expect(dashboard).toContain("verified trip distance and transport data");
  });

  it("preserves live wallet and recent-activity derivations", () => {
    expect(dashboard).toContain(
      "const byService = walletSummary?.spentByService ?? {};",
    );
    expect(dashboard).toContain("const trips = recentActivity ?? [];");
    expect(dashboard).toContain("walletSummary?.totalSpent ?? 0");
    expect(dashboard).toContain("aria-expanded={showSafetyAlerts}");
    expect(dashboard).toContain("aria-expanded={showCarbonTracker}");
  });
});
