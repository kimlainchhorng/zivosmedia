import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
const exists = (relativePath: string) => existsSync(path.join(root, relativePath));
const legacyLegalOrigin = "https://hizivo" + ".com";

describe("legal canonical SEO URLs", () => {
  it("keeps public policy canonicals on canonical /legal URLs", () => {
    const terms = read("src/pages/legal/TermsOfService.tsx");
    const privacy = read("src/pages/legal/PrivacyPolicy.tsx");
    const refunds = read("src/pages/legal/RefundPolicy.tsx");
    const cookies = read("src/pages/legal/CookiePolicy.tsx");

    expect(refunds).toContain('canonical="https://zivosmedia.com/legal/refunds"');
    expect(cookies).toContain('canonical="https://zivosmedia.com/legal/cookies"');

    for (const source of [terms, privacy, refunds, cookies]) {
      expect(source).not.toContain(`${legacyLegalOrigin}/terms`);
      expect(source).not.toContain(`${legacyLegalOrigin}/privacy`);
      expect(source).not.toContain(`${legacyLegalOrigin}/refunds`);
      expect(source).not.toContain(`${legacyLegalOrigin}/cookies`);
    }
  });

  /**
   * There must be exactly ONE page per policy.
   *
   * `/terms` and `/refunds` used to serve separate Terms and Refund pages that
   * had drifted from the `/legal` ones — while those duplicates themselves
   * declared `canonical` pointing AT `/legal`, i.e. they already agreed they
   * were not authoritative. A customer in a billing dispute, or anyone
   * reviewing the site, could land on either and cite it.
   *
   * A canonical tag is an SEO hint, not a guarantee: it does not stop a human
   * reading the stale copy. So this asserts the duplicate FILES are gone rather
   * than that they carry the right tag — the version of this test that checked
   * the tag could only ever confirm the stale page pointed elsewhere while
   * still happily serving itself.
   */
  it("keeps exactly one page per policy, with no stale duplicates", () => {
    for (const duplicate of [
      "src/pages/Terms.tsx",
      "src/pages/Refunds.tsx",
      "src/pages/Privacy.tsx",
    ]) {
      expect(exists(duplicate), `${duplicate} is a stale duplicate policy page`).toBe(false);
    }
  });

  it("redirects the guessable short policy paths to the canonical pages", () => {
    // /refunds and /terms are the URLs a customer or reviewer types by hand,
    // so they must land on the maintained policy rather than 404 or on a copy.
    const app = read("src/App.tsx");
    expect(app).toContain('<Route path="/terms" element={<Navigate to="/legal/terms" replace />} />');
    expect(app).toContain('<Route path="/refunds" element={<Navigate to="/legal/refunds" replace />} />');
  });

  it("keeps marketing share URLs on zivosmedia.com and legal links canonical", () => {
    const storeMarketing = read("src/components/admin/StoreMarketingSection.tsx");
    const damagePolicy = read("src/pages/legal/DamagePolicy.tsx");

    expect(storeMarketing).toContain("ZIVO_MEDIA_ORIGIN");
    expect(storeMarketing).toContain("/store/");
    expect(storeMarketing).toContain("/book/");
    expect(storeMarketing).not.toContain("https://www.zivosmedia.com");
    expect(damagePolicy).toContain('to="/legal/cancellation"');
    expect(damagePolicy).not.toContain('to="/cancellation-policy"');
  });
});
