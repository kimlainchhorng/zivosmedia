import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("ads marketing consent runtime", () => {
  it("keeps the runtime pixel loader separated between analytics and marketing consent", () => {
    const html = read("index.html");
    const bootstrap = read("public/analytics-bootstrap.js");
    const runtimeConfig = read("src/config/marketingRuntimeConfig.ts");
    const main = read("src/main.tsx");

    expect(html).toContain('<script defer src="/analytics-bootstrap.js"></script>');
    expect(html).toContain("data-zivo-font");
    expect(html).not.toContain('onload="this.media=\'all\'"');
    expect(bootstrap).toContain("function readCookiePrefs()");
    expect(bootstrap).toContain('localStorage.getItem("zivo_cookie_consent")');
    expect(bootstrap).toContain("var analyticsAllowed = prefs.analytics === true");
    expect(bootstrap).toContain("var marketingAllowed = prefs.marketing === true");
    expect(bootstrap).toContain("if (!analyticsAllowed && !marketingAllowed) return");
    expect(bootstrap).toContain("if (analyticsAllowed && gaId)");
    expect(html).toContain('name="zivo-google-analytics-id"');
    expect(html).toContain('name="zivo-google-ads-id"');
    expect(bootstrap).toContain('gtag("config", gaId');
    expect(bootstrap).toContain("if (!marketingAllowed) return");
    expect(bootstrap).toContain('gtag("config", googleAdsId');
    expect(html).toContain('name="zivo-meta-pixel"');
    expect(bootstrap).toContain("https://connect.facebook.net/en_US/fbevents.js");
    expect(bootstrap).toContain("https://analytics.tiktok.com/i18n/pixel/events.js");
    expect(bootstrap).toContain("https://static.ads-twitter.com/uwt.js");
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

  it("keeps the installed app ad-free and blocks Android advertising ID access", () => {
    const adUnit = read("src/components/ads/AdSenseUnit.tsx");
    const manifest = read("android/app/src/main/AndroidManifest.xml");
    const playListing = read("android/store-listing/PLAY_STORE.md");

    expect(adUnit).toContain("function isNativeApp(): boolean");
    expect(adUnit).toContain("!isNativeApp()");
    expect(manifest).toContain(
      '<uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove" />',
    );
    expect(manifest).not.toContain(
      '<uses-permission android:name="com.google.android.gms.permission.AD_ID" />',
    );
    expect(playListing).toContain(
      "Contains ads:    Yes (sponsored posts may appear in Reels)",
    );
  });
});
