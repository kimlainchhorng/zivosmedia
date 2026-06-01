import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("creator monetization legal disclosure", () => {
  it("keeps full Terms coverage for creator earnings, payouts, tax, refunds, and chargebacks", () => {
    const terms = read("src/pages/legal/TermsOfService.tsx");

    expect(terms).toContain("Creator Monetization & Payouts");
    expect(terms).toContain("tips, gifts, locked media, subscriptions, ad revenue");
    expect(terms).toContain("platform fees");
    expect(terms).toContain("identity and tax verification");
    expect(terms).toContain("minimum payout thresholds");
    expect(terms).toContain("refund clawbacks");
    expect(terms).toContain("chargebacks");
    expect(terms).toContain("payment reversals");
    expect(terms).toContain("Fraudulent, artificial, self-funded");
    expect(terms).toContain("sponsored-content compliance");
  });

  it("keeps creator subscription checkout copy linked to canonical legal pages", () => {
    const subscribeSheet = read("src/components/creator/CreatorSubscribeSheet.tsx");

    expect(subscribeSheet).toContain("Monthly subscription · cancel anytime.");
    expect(subscribeSheet).toContain('href="/legal/terms"');
    expect(subscribeSheet).toContain('href="/legal/refunds"');
    expect(subscribeSheet).toContain("payout, tax, chargeback, and refund rules");
  });

  it("keeps the in-app legal preview aligned with monetization risk language", () => {
    const preview = read("src/components/legal/LegalPreviewSheet.tsx");

    expect(preview).toContain("Monetization & Creator Earnings");
    expect(preview).toContain("gifts (Z Coins), tips, locked media, and ZIVO+ revenue share");
    expect(preview).toContain("identity and tax verification");
    expect(preview).toContain("minimum payout thresholds");
    expect(preview).toContain("refund clawbacks");
    expect(preview).toContain("chargeback liability");
  });

  it("keeps the creator academy aware of legal, privacy, tax, and advertising disclosure topics", () => {
    const academy = read("src/pages/MonetizationArticlesPage.tsx");

    for (const topic of [
      "Tax information for ZIVO creators",
      "FTC disclosure requirements for creators",
      "GDPR and data privacy for creators",
      "Creator legal essentials",
      "How to verify your identity for payouts",
    ]) {
      expect(academy).toContain(topic);
    }
  });
});
