import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("checkout legal canonical links", () => {
  it("keeps partner consent legal links on canonical legal routes", () => {
    const modal = read("src/components/checkout/PartnerConsentModal.tsx");

    expect(modal).toContain('to="/legal/privacy"');
    expect(modal).toContain('to="/legal/partner-disclosure"');
    expect(modal).not.toContain('to="/privacy"');
    expect(modal).not.toContain('to="/partner-disclosure"');
  });

  it("keeps quick legal previews and cookie consent pointing to canonical pages", () => {
    const previewSheet = read("src/components/legal/LegalPreviewSheet.tsx");
    const cookieConsent = read("src/components/common/CookieConsent.tsx");

    expect(previewSheet).toContain('isTerms ? "/legal/terms" : "/legal/privacy"');
    expect(previewSheet).not.toContain('isTerms ? "/terms" : "/privacy"');
    expect(cookieConsent).toContain('to="/legal/privacy"');
    expect(cookieConsent).not.toContain('to="/privacy-policy"');
  });

  it("keeps the public terms related links canonical", () => {
    const terms = read("src/pages/Terms.tsx");

    expect(terms).toContain('to="/legal/privacy"');
    expect(terms).toContain('to="/legal/refunds"');
    expect(terms).toContain('to="/legal/partner-disclosure"');
    expect(terms).not.toContain('to="/privacy"');
    expect(terms).not.toContain('to="/refund-policy"');
    expect(terms).not.toContain('to="/partner-disclosure"');
  });
});
