import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("retired creator monetization legal disclosure", () => {
  it("describes only approved business and service-partner settlements", () => {
    const terms = read("src/pages/legal/TermsOfService.tsx");

    expect(terms).toContain("Business and Service-Partner Settlements");
    expect(terms).toContain("drivers, restaurants, merchants");
    expect(terms).toContain("completed rides, deliveries, orders");
    expect(terms).toContain("platform fees");
    expect(terms).toContain("identity and tax verification");
    expect(terms).toContain("minimum thresholds");
    expect(terms).toContain("refund adjustments");
    expect(terms).toContain("chargebacks");
    expect(terms).toContain("payment reversals");
    expect(terms).toContain("Fraudulent, artificial, self-funded");
    expect(terms).not.toContain("Creator Monetization & Payouts");
    expect(terms).not.toContain("tips, gifts, locked media, subscriptions, ad revenue");
  });

  it("keeps the in-app legal preview aligned with the retired product", () => {
    const preview = read("src/components/legal/LegalPreviewSheet.tsx");

    expect(preview).toContain("Business and Service-Partner Settlements");
    expect(preview).toContain("completed rides, deliveries, orders");
    expect(preview).toContain("Pornography, sexually explicit content, sexual services");
    expect(preview).not.toContain("Monetization & Creator Earnings");
    expect(preview).not.toContain("gifts (Z Coins), tips, locked media");
  });

  it("does not mount creator checkout or monetization routes", () => {
    const app = read("src/App.tsx");

    expect(app).not.toContain("CreatorSubscribeSheet");
    expect(app).not.toContain("MonetizationPage");
    expect(app).not.toContain('path="/monetization"');
  });
});
