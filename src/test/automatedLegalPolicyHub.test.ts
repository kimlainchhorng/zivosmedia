import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("automated legal policy hub", () => {
  it("keeps account legal hub links resolving through the legal route surface", () => {
    const app = read("src/App.tsx");
    const legalHub = read("src/pages/account/LegalPoliciesPage.tsx");

    expect(app).toContain('path="/legal/*"');
    expect(legalHub).toContain('href: "/legal/automated-data-collection"');
    expect(legalHub).toContain('label: "Automated Data Collection Disclosure"');
    expect(legalHub).toContain('href: "/legal/automated-decisions"');
    expect(legalHub).toContain('label: "Automated Decision-Making"');
  });

  it("keeps automated decision policy content specific to AI, risk, review, and appeals", () => {
    const genericLegal = read("src/pages/legal/GenericLegalPage.tsx");

    expect(genericLegal).toContain('"/legal/automated-decisions"');
    expect(genericLegal).toContain("AI Governance");
    expect(genericLegal).toContain("search ranking, feed and reels recommendations");
    expect(genericLegal).toContain("fraud detection, spam and abuse prevention");
    expect(genericLegal).toContain("content moderation, safety review");
    expect(genericLegal).toContain("account suspension, payout holds, content removal");
    expect(genericLegal).toContain("booking risk review, payment risk review");
    expect(genericLegal).toContain("request information about automated decisions affecting you");
    expect(genericLegal).toContain("request human review or submit an appeal where available");
    expect(genericLegal).toContain("ZIVO appeal flow");
    expect(genericLegal).toContain("ranking, recommendation, fraud, safety, moderation");
  });

  it("keeps automated data collection policy content specific to collection, consent, and rights", () => {
    const genericLegal = read("src/pages/legal/GenericLegalPage.tsx");

    expect(genericLegal).toContain('"/legal/automated-data-collection"');
    expect(genericLegal).toContain("device identifiers, IP address");
    expect(genericLegal).toContain("app events, page views, search queries");
    expect(genericLegal).toContain("booking activity, payment and payout events");
    expect(genericLegal).toContain("cookie choices, and ad attribution signals where you consent");
    expect(genericLegal).toContain("Essential collection is required for security and service delivery");
    expect(genericLegal).toContain("Optional analytics and marketing collection");
    expect(genericLegal).toContain("Do Not Sell or Share controls");
    expect(genericLegal).toContain("aggregated, anonymized, or de-identified");
    expect(genericLegal).toContain("privacy@hizivo.com");
  });

  it("keeps specialized automated policies aligned with full legal disclosures", () => {
    const terms = read("src/pages/legal/TermsOfService.tsx");
    const privacy = read("src/pages/legal/PrivacyPolicy.tsx");
    const retention = read("src/pages/legal/DataRetentionPolicy.tsx");
    const gdpr = read("src/pages/legal/GDPRCompliance.tsx");

    expect(terms).toContain("AI, Ranking & Automated Decisions");
    expect(terms).toContain("human review or appeal where available");
    expect(privacy).toContain("AI & Automated Decisions");
    expect(privacy).toContain("request information about automated decisions affecting you");
    expect(retention).toContain("Automated Decision Making & Profiling");
    expect(retention).toContain("request human review of automated decisions that significantly affect you");
    expect(gdpr).toContain("AUTOMATED DECISION-MAKING");
    expect(gdpr).toContain("not be subject to decisions based solely on automated processing");
  });
});
