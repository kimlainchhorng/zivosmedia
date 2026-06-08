import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const legalPages = [
  "src/pages/legal/TermsOfService.tsx",
  "src/pages/legal/PrivacyPolicy.tsx",
  "src/pages/legal/RefundPolicy.tsx",
  "src/pages/legal/CancellationPolicy.tsx",
  "src/pages/legal/PartnerDisclosure.tsx",
  "src/pages/legal/DoNotSell.tsx",
  "src/pages/legal/FlightTerms.tsx",
  "src/pages/legal/MetaPrivacyDisclosure.tsx",
  "src/pages/legal/OwnerTerms.tsx",
  "src/pages/legal/RenterTerms.tsx",
  "src/pages/legal/PartnerAgreement.tsx",
];

describe("legal policy page related links", () => {
  it("keeps related policy links inside legal pages canonical", () => {
    const combined = legalPages.map((file) => read(file)).join("\n");

    for (const canonical of [
      'to="/legal/terms"',
      'to="/legal/privacy"',
      'to="/legal/cookies"',
      'to="/legal/refunds"',
      'to="/legal/cancellation"',
      'to="/legal/partner-disclosure"',
    ]) {
      expect(combined).toContain(canonical);
    }

    for (const legacy of [
      'to="/terms"',
      'to="/privacy"',
      'to="/cookies"',
      'to="/privacy-policy"',
      'to="/refund-policy"',
      'to="/terms-of-service"',
      'to="/cancellation-policy"',
      'to="/partner-disclosure"',
    ]) {
      expect(combined).not.toContain(legacy);
    }
  });

  it("keeps legal pages linked to core policy and support surfaces", () => {
    const terms = read("src/pages/legal/TermsOfService.tsx");
    const partnerDisclosure = read("src/pages/legal/PartnerDisclosure.tsx");
    const flightTerms = read("src/pages/legal/FlightTerms.tsx");

    expect(terms).toContain("Privacy Policy");
    expect(terms).toContain("Refund Policy");
    expect(partnerDisclosure).toContain("Partner Disclosure");
    expect(partnerDisclosure).toContain('to="/legal/refunds"');
    expect(flightTerms).toContain('to="/legal/partner-disclosure"');
    expect(flightTerms).toContain("support@zivosmedia.com");
  });
});
