import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(/\r\n/g, "\n");

const resultsSource = read("src/pages/FlightResults.tsx");
const quickStatsSource = read("src/components/flight/QuickStatsBar.tsx");
const combinedSource = `${resultsSource}\n${quickStatsSource}`;

describe("flight results fare disclosure", () => {
  it("does not promise a timed fare lock, final displayed price, or instant ticketing", () => {
    expect(combinedSource).not.toContain("Book within 24h");
    expect(combinedSource).not.toContain("lock in the best fare");
    expect(combinedSource).not.toContain("Final prices shown");
    expect(combinedSource).not.toContain("tickets issued instantly");
    expect(combinedSource).not.toContain("Live Best Price");
  });

  it("uses one truthful confirmation boundary across desktop and mobile", () => {
    expect(resultsSource).toContain("Fares can change until booking is confirmed");
    expect(resultsSource).toContain("Displayed fares come from live provider searches");
    expect(resultsSource).toContain("Final price and availability are confirmed before payment");
    expect(quickStatsSource).toContain("Current fares shown");
    expect(quickStatsSource).toContain("final price and availability confirmed before payment");
  });

  it("keeps price comparisons scoped and preserves the legal disclosure", () => {
    expect(resultsSource).toContain("Lowest shown");
    expect(resultsSource).toContain("Current ZIVO fare");
    expect(resultsSource).toContain('to="/legal/partner-disclosure"');
    expect(resultsSource).not.toContain("Trusted by 50K+ travelers");
  });
});
