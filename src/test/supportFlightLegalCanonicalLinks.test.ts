import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

const files = [
  "src/pages/FAQPage.tsx",
  "src/pages/Help.tsx",
  "src/pages/FlightReview.tsx",
  "src/pages/FlightTravelerInfo.tsx",
  "src/pages/FlightResults.tsx",
  "src/components/flight/FlightResultsSection.tsx",
  "src/components/flight/DuffelFlightCard.tsx",
];

describe("support and flight legal canonical links", () => {
  it("keeps flight and support disclosure links on canonical legal routes", () => {
    const combined = files.map((file) => read(file)).join("\n");

    for (const canonical of [
      'to="/legal/terms"',
      'to="/legal/privacy"',
      'to="/legal/partner-disclosure"',
    ]) {
      expect(combined).toContain(canonical);
    }

    for (const legacy of [
      'to="/terms"',
      'to="/privacy"',
      'to="/partner-disclosure"',
      'to="/privacy-policy"',
      'to="/terms-of-service"',
    ]) {
      expect(combined).not.toContain(legacy);
    }
  });

  it("keeps support and flight disclosure copy near the canonical links", () => {
    const faq = read("src/pages/FAQPage.tsx");
    const traveler = read("src/pages/FlightTravelerInfo.tsx");
    const review = read("src/pages/FlightReview.tsx");

    expect(faq).toContain("Partner Disclosure");
    expect(traveler).toContain("View full Partner Disclosure");
    expect(traveler).toContain("By continuing, you agree");
    expect(review).toContain("Final price and terms are confirmed at checkout");
  });
});
