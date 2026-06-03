import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("ads marketing consent runtime", () => {
  it("keeps the runtime pixel loader separated between analytics and marketing consent", () => {
    const html = read("index.html");
    const runtimeConfig = read("src/config/marketingRuntimeConfig.ts");
    const main = read("src/main.tsx");

    expect(html).toContain("function readCookiePrefs()");
    expect(html).toContain("localStorage.getItem('zivo_cookie_consent')");
    expect(html).toContain("var analyticsAllowed=prefs.analytics===true");
    expect(html).toContain("var marketingAllowed=prefs.marketing===true");
    expect(html).toContain("if(!analyticsAllowed&&!marketingAllowed)return");
    expect(html).toContain("if(analyticsAllowed&&gaId)");
    expect(html).toContain('name="zivo-google-analytics-id"');
    expect(html).toContain('name="zivo-google-ads-id"');
    expect(html).toContain("gtag('config',gaId");
    expect(html).toContain("if(marketingAllowed)");
    expect(html).toContain("gtag('config',googleAdsId");
    expect(html).toContain('name="zivo-meta-pixel"');
    expect(html).toContain("https://connect.facebook.net/en_US/fbevents.js");
    expect(html).toContain("https://analytics.tiktok.com/i18n/pixel/events.js");
    expect(html).toContain("https://static.ads-twitter.com/uwt.js");
    expect(html).not.toContain("2304266847061310");
    expect(html).not.toContain("G-VVH8W5PW3E");
    expect(html).not.toContain("AW-18077605056");
    expect(html).not.toContain("%VITE_GOOGLE_ANALYTICS_ID%");
    expect(runtimeConfig).toContain("VITE_GOOGLE_ANALYTICS_ID");
    expect(runtimeConfig).toContain("VITE_GOOGLE_ADS_ID");
    expect(runtimeConfig).toContain("VITE_META_PIXEL_ID");
    expect(runtimeConfig).toContain("VITE_TIKTOK_PIXEL_ID");
    expect(runtimeConfig).toContain("VITE_X_PIXEL_ID");
    expect(runtimeConfig).toContain("VITE_GOOGLE_ADSENSE_CLIENT");
    expect(main).toContain("installMarketingRuntimeConfig()");
  });

  it("keeps cookie consent UI, account controls, and policy page writing the same storage key", () => {
    const prefs = read("src/hooks/useCookiePrefs.ts");
    const consent = read("src/components/common/CookieConsent.tsx");
    const cookiePolicy = read("src/pages/legal/CookiePolicy.tsx");
    const accountSettings = read("src/pages/account/AccountSettingsPage.tsx");

    expect(prefs).toContain('COOKIE_CONSENT_STORAGE_KEY = "zivo_cookie_consent"');
    expect(consent).toContain("COOKIE_CONSENT_STORAGE_KEY");
    expect(consent).toContain("zivo:cookie-consent-updated");
    expect(cookiePolicy).toContain("COOKIE_CONSENT_STORAGE_KEY");
    expect(cookiePolicy).toContain("zivo:cookie-consent-updated");
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

  it("keeps AdSense placement slots configurable by deployment environment", () => {
    const env = read(".env.example");
    const viteEnv = read("src/vite-env.d.ts");
    const adSlots = read("src/config/adSlots.ts");

    expect(env).toContain("VITE_ADSENSE_SLOT_HOME_FEED");
    expect(env).toContain("VITE_ADSENSE_SLOT_SEARCH_RESULTS");
    expect(env).toContain("VITE_ADSENSE_SLOT_ARTICLE_INLINE");
    expect(viteEnv).toContain("VITE_ADSENSE_SLOT_HOME_FEED");
    expect(viteEnv).toContain("VITE_ADSENSE_SLOT_SEARCH_RESULTS");
    expect(viteEnv).toContain("VITE_ADSENSE_SLOT_ARTICLE_INLINE");
    expect(adSlots).toContain("envSlot(import.meta.env.VITE_ADSENSE_SLOT_HOME_FEED)");
    expect(adSlots).toContain(
      "envSlot(import.meta.env.VITE_ADSENSE_SLOT_SEARCH_RESULTS)",
    );
    expect(adSlots).toContain(
      "envSlot(import.meta.env.VITE_ADSENSE_SLOT_ARTICLE_INLINE)",
    );
    expect(adSlots).toContain("/^\\d{5,}$/.test(slot)");
  });
});
