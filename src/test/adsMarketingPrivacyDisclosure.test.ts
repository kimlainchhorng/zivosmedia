import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("ads marketing privacy disclosure", () => {
  it("keeps cookie policy aligned with consent-based ads partners", () => {
    const cookiePolicy = read("src/pages/legal/CookiePolicy.tsx");

    expect(cookiePolicy).toContain("Marketing & Advertising Cookies");
    expect(cookiePolicy).toContain("Meta pixel");
    expect(cookiePolicy).toContain("Google Ads");
    expect(cookiePolicy).toContain("TikTok pixel");
    expect(cookiePolicy).toContain("Consent-based advertising");
    expect(cookiePolicy).toContain("only when you allow marketing cookies");
    expect(cookiePolicy).toContain("reject optional cookies");
    expect(cookiePolicy).not.toContain("No tracking or advertising cookies");
    expect(cookiePolicy).not.toContain("does not use cookies for advertising or ad targeting purposes");
  });

  it("keeps privacy policy disclosure aligned with optional targeted advertising sharing", () => {
    const privacyPolicy = read("src/pages/legal/PrivacyPolicy.tsx");

    expect(privacyPolicy).toContain("Meta, Google Ads, and TikTok");
    expect(privacyPolicy).toContain("only when you consent to marketing cookies");
    expect(privacyPolicy).toContain("limited audience or conversion signals");
    expect(privacyPolicy).toContain("Do Not Sell or Share");
    expect(privacyPolicy).toContain("Marketing & Advertising Cookies");
    expect(privacyPolicy).toContain("targeted advertising");
    expect(privacyPolicy).not.toContain("ZIVO does not use advertising or tracking cookies");
  });

  it("keeps CCPA/CPRA opt-out page tied to ad sharing and account controls", () => {
    const doNotSell = read("src/pages/legal/DoNotSell.tsx");

    expect(doNotSell).toContain("Does ZIVO Sell or Share Personal Information?");
    expect(doNotSell).toContain("Meta, Google Ads, and TikTok");
    expect(doNotSell).toContain("Advertising signals");
    expect(doNotSell).toContain("campaign attribution");
    expect(doNotSell).toContain("Reject marketing cookies");
    expect(doNotSell).toContain("/account/privacy");
  });

  it("keeps cookie consent and account controls exposing marketing as a separate optional category", () => {
    const consent = read("src/components/common/CookieConsent.tsx");
    const controls = read("src/pages/account/PrivacyControls.tsx");
    const prefs = read("src/hooks/useCookiePrefs.ts");

    expect(consent).toContain("marketing: boolean");
    expect(consent).toContain("Marketing & Advertising Cookies");
    expect(consent).toContain("Measure campaigns and show relevant offers");
    expect(consent).toContain("marketing: true");
    expect(consent).toContain("marketing: false");

    expect(controls).toContain('title: "Marketing"');
    expect(controls).toContain("Show relevant offers and measure the effectiveness of campaigns across services");
    expect(prefs).toContain("marketing: false");
    expect(prefs).toContain("marketing: true");
  });
});
