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

  /**
   * The checkout sheet renders policy COMPONENTS by path, so a short path
   * mapped to a stale duplicate showed a buyer different terms from the ones
   * the same checkout links to — two divergent contracts in one flow.
   *
   * Every short path must resolve to the same canonical component its /legal
   * twin does. This replaces an assertion against the duplicate Terms page,
   * which has since been deleted in favour of a redirect.
   */
  it("resolves every short legal path to the canonical policy component", () => {
    const sheet = read("src/components/checkout/InlineLegalSheet.tsx");

    for (const [shortPath, canonicalModule] of [
      ["/terms", "@/pages/legal/TermsOfService"],
      ["/refunds", "@/pages/legal/RefundPolicy"],
      ["/privacy", "@/pages/legal/PrivacyPolicy"],
      ["/cookies", "@/pages/legal/CookiePolicy"],
    ] as const) {
      expect(sheet).toContain(`"${shortPath}": lazy(() => import("${canonicalModule}"))`);
    }

    // The deleted duplicates must never be wired back in here.
    expect(sheet).not.toContain('import("@/pages/Terms")');
    expect(sheet).not.toContain('import("@/pages/Refunds")');
    expect(sheet).not.toContain('import("@/pages/Privacy")');
  });
});
