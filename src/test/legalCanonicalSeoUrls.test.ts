import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
const legacyLegalOrigin = "https://hizivo" + ".com";

describe("legal canonical SEO URLs", () => {
  it("keeps public policy canonicals on canonical /legal URLs", () => {
    const terms = read("src/pages/Terms.tsx");
    const privacy = read("src/pages/Privacy.tsx");
    const refunds = read("src/pages/Refunds.tsx");
    const cookies = read("src/pages/legal/CookiePolicy.tsx");

    expect(terms).toContain('canonical="https://zivosmedia.com/legal/terms"');
    expect(privacy).toContain('canonical="https://zivosmedia.com/legal/privacy"');
    expect(refunds).toContain('canonical="https://zivosmedia.com/legal/refunds"');
    expect(cookies).toContain('canonical="https://zivosmedia.com/legal/cookies"');

    for (const source of [terms, privacy, refunds, cookies]) {
      expect(source).not.toContain(`${legacyLegalOrigin}/terms`);
      expect(source).not.toContain(`${legacyLegalOrigin}/privacy`);
      expect(source).not.toContain(`${legacyLegalOrigin}/refunds`);
      expect(source).not.toContain(`${legacyLegalOrigin}/cookies`);
    }
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
