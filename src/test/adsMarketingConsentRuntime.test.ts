import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("ads marketing consent runtime", () => {
  it("keeps the runtime pixel loader separated between analytics and marketing consent", () => {
    const html = read("index.html");

    expect(html).toContain("function readCookiePrefs()");
    expect(html).toContain("localStorage.getItem('zivo_cookie_consent')");
    expect(html).toContain("var analyticsAllowed=prefs.analytics===true");
    expect(html).toContain("var marketingAllowed=prefs.marketing===true");
    expect(html).toContain("if(!analyticsAllowed&&!marketingAllowed)return");
    expect(html).toContain("if(analyticsAllowed)");
    expect(html).toContain("gtag('config','G-VVH8W5PW3E'");
    expect(html).toContain("if(marketingAllowed)");
    expect(html).toContain("gtag('config','AW-18077605056')");
    expect(html).toContain("https://connect.facebook.net/en_US/fbevents.js");
    expect(html).toContain("https://analytics.tiktok.com/i18n/pixel/events.js");
  });

  it("keeps cookie consent UI, account controls, and policy page writing the same storage key", () => {
    const prefs = read("src/hooks/useCookiePrefs.ts");
    const consent = read("src/components/common/CookieConsent.tsx");
    const cookiePolicy = read("src/pages/legal/CookiePolicy.tsx");
    const accountSettings = read("src/pages/account/AccountSettingsPage.tsx");

    expect(prefs).toContain('COOKIE_CONSENT_STORAGE_KEY = "zivo_cookie_consent"');
    expect(consent).toContain("COOKIE_CONSENT_STORAGE_KEY");
    expect(cookiePolicy).toContain("COOKIE_CONSENT_STORAGE_KEY");
    expect(accountSettings).toContain('"zivo_cookie_consent"');
    expect(consent).not.toContain('"zivo-cookie-consent"');
    expect(cookiePolicy).not.toContain('"cookie_preferences"');
  });

  it("loads consent pixels only after analytics or marketing is enabled", () => {
    const prefs = read("src/hooks/useCookiePrefs.ts");
    const consent = read("src/components/common/CookieConsent.tsx");
    const cookiePolicy = read("src/pages/legal/CookiePolicy.tsx");

    expect(prefs).toContain("if (next.analytics || next.marketing)");
    expect(consent).toContain("if (preferences.analytics || preferences.marketing)");
    expect(cookiePolicy).toContain("if (preferences.analytics || preferences.marketing)");
    expect(consent).toContain("window.__zivoLoadAnalytics?.()");
    expect(cookiePolicy).toContain("window.__zivoLoadAnalytics?.()");
  });
});
