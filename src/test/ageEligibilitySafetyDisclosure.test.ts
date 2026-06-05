import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("age eligibility safety disclosure", () => {
  it("keeps full Terms aligned with teen personal accounts and 18+ restricted features", () => {
    const terms = read("src/pages/legal/TermsOfService.tsx");

    expect(terms).toContain("at least 13 years old to create a limited personal account");
    expect(terms).toContain("at least 16 where local law requires a higher digital consent age");
    expect(terms).toContain("at least 18 years old");
    expect(terms).toContain("book travel");
    expect(terms).toContain("request rides");
    expect(terms).toContain("make payments");
    expect(terms).toContain("send or receive gifts");
    expect(terms).toContain("go live");
    expect(terms).toContain("unlock paid content");
    expect(terms).toContain("receive payouts");
    expect(terms).toContain("business/partner tools");
    expect(terms).toContain("Provide accurate age or date-of-birth information when requested");
  });

  it("keeps privacy policy aligned with under-13/under-16 child safety and 18+ data use", () => {
    const privacy = read("src/pages/legal/PrivacyPolicy.tsx");

    expect(privacy).toContain("not intended for children under 13 years of age");
    expect(privacy).toContain("under 16 where local law requires");
    expect(privacy).toContain("travel booking, rides, delivery ordering, car rental");
    expect(privacy).toContain("payments, gifts");
    expect(privacy).toContain("live streaming");
    expect(privacy).toContain("paid content");
    expect(privacy).toContain("business tools");
    expect(privacy).toContain("payout features");
    expect(privacy).toContain("privacy@zivosmedia.com");
    expect(privacy).not.toContain("privacy@zivo.com");
  });

  it("keeps quick legal preview and creator academy consistent with age and minor safety rules", () => {
    const preview = read("src/components/legal/LegalPreviewSheet.tsx");
    const academy = read("src/pages/MonetizationArticlesPage.tsx");

    expect(preview).toContain("You must be at least 13 to create a personal account");
    expect(preview).toContain("18 to book travel, make payments, send/receive gifts, go live, or access age-restricted content");
    expect(preview).toContain("Sexually explicit content is not permitted on ZIVO");
    expect(preview).toContain("hidden from minors");
    expect(preview).toContain("Live streaming has additional safety");
    expect(academy).toContain("Child safety and minor protection");
    expect(academy).toContain("COPPA compliance and kids' content");
  });
});
