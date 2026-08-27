import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("age eligibility safety disclosure", () => {
  it("keeps full Terms aligned with teen personal accounts and adult marketplace features", () => {
    const terms = read("src/pages/legal/TermsOfService.tsx");

    expect(terms).toContain("at least 13 years old to create a limited personal account");
    expect(terms).toContain("at least 16 where local law requires a higher digital consent age");
    expect(terms).toContain("at least 18 years old");
    expect(terms).toContain("book travel");
    expect(terms).toContain("request rides");
    expect(terms).toContain("make payments");
    expect(terms).toContain("receive marketplace payouts");
    expect(terms).toContain("business/partner tools");
    expect(terms).toContain("Provide accurate age or date-of-birth information when requested");
    expect(terms).not.toContain("send or receive gifts");
    expect(terms).not.toContain("unlock paid content");
  });

  it("keeps privacy policy aligned with under-13/under-16 child safety and 18+ data use", () => {
    const privacy = read("src/pages/legal/PrivacyPolicy.tsx");

    expect(privacy).toContain("not intended for children under 13 years of age");
    expect(privacy).toContain("under 16 where local law requires");
    expect(privacy).toContain("travel booking, rides, delivery ordering, car rental");
    expect(privacy).toContain("payments, business");
    expect(privacy).toContain("business tools");
    expect(privacy).toContain("marketplace payout features");
    expect(privacy).toContain("privacy@zivosmedia.com");
    expect(privacy).not.toContain("privacy@zivo.com");
    expect(privacy).not.toContain("payments, gifts");
    expect(privacy).not.toContain("paid content");
  });

  it("keeps quick legal preview consistent with age and prohibited-content rules", () => {
    const preview = read("src/components/legal/LegalPreviewSheet.tsx");

    expect(preview).toContain("You must be at least 13 to create a personal account");
    expect(preview).toContain("to book travel, make payments, receive marketplace payouts");
    expect(preview).toContain("Pornography, sexually explicit content, sexual services");
    expect(preview).not.toContain("send/receive gifts");
    expect(preview).not.toContain("Live streaming has additional safety");
  });
});
