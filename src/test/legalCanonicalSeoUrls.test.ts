import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("legal canonical SEO URLs", () => {
  it("keeps public policy canonicals on canonical /legal URLs", () => {
    const terms = read("src/pages/Terms.tsx");
    const privacy = read("src/pages/Privacy.tsx");
    const refunds = read("src/pages/Refunds.tsx");
    const cookies = read("src/pages/legal/CookiePolicy.tsx");

    expect(terms).toContain('canonical="https://zivollc.com/legal/terms"');
    expect(privacy).toContain('canonical="https://zivollc.com/legal/privacy"');
    expect(refunds).toContain('canonical="https://zivollc.com/legal/refunds"');
    expect(cookies).toContain('canonical="https://zivollc.com/legal/cookies"');

    for (const source of [terms, privacy, refunds, cookies]) {
      expect(source).not.toContain("https://zivollc.com/terms");
      expect(source).not.toContain("https://zivollc.com/privacy");
      expect(source).not.toContain("https://zivollc.com/refunds");
      expect(source).not.toContain("https://zivollc.com/cookies");
    }
  });

  it("keeps marketing share URLs on zivollc.com and legal links canonical", () => {
    const storeMarketing = read("src/components/admin/StoreMarketingSection.tsx");
    const damagePolicy = read("src/pages/legal/DamagePolicy.tsx");

    expect(storeMarketing).toContain("https://zivollc.com/store/");
    expect(storeMarketing).toContain("https://zivollc.com/book/");
    expect(storeMarketing).not.toContain("https://www.zivollc.com");
    expect(damagePolicy).toContain('to="/legal/cancellation"');
    expect(damagePolicy).not.toContain('to="/cancellation-policy"');
  });
});
