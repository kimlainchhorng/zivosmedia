import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("ads marketing consent runtime", () => {
  it("keeps the runtime pixel loader separated between analytics and marketing consent", () => {
    const html = read("index.html");
    const main = read("src/main.tsx");
    const envExample = read(".env.example");
    const viteEnv = read("src/vite-env.d.ts");
    const viteConfig = read("vite.config.ts");
    const seoHead = read("src/components/SEOHead.tsx");

    expect(html).toContain("function readCookiePrefs()");
    expect(html).toContain("localStorage.getItem('zivo_cookie_consent')");
    expect(html).toContain("var analyticsAllowed=prefs.analytics===true");
    expect(html).toContain("var marketingAllowed=prefs.marketing===true");
    expect(html).toContain("if(!analyticsAllowed&&!marketingAllowed)return");
    expect(html).toContain("analyticsLoaded");
    expect(html).toContain("marketingLoaded");
    expect(html).toContain("gtagLoaded");
    expect(html).toContain("if(analyticsAllowed&&!analyticsLoaded)");
    expect(html).toContain("gtag('config','G-VVH8W5PW3E'");
    expect(html).toContain("if(marketingAllowed&&!marketingLoaded)");
    expect(html).toContain("gtag('config','AW-18077605056')");
    expect(html).toContain("https://connect.facebook.net/en_US/fbevents.js");
    expect(html).toContain("https://analytics.tiktok.com/i18n/pixel/events.js");
    expect(html).toContain('<meta name="zivo-meta-pixel" content="2304266847061310" />');
    expect(html).toContain('<meta name="facebook-domain-verification" content="__META_DOMAIN_VERIFICATION__" />');
    expect(html).toContain('<meta property="al:ios:app_store_id" content="6759480121" />');
    expect(html).toContain('<meta property="al:android:package" content="com.hizovo.app" />');
    expect(html).toContain('<meta property="al:ios:url" content="com.hizovo.app://" />');
    expect(html).toContain('<meta property="al:android:url" content="com.hizovo.app://" />');
    expect(html).not.toContain("%VITE_META_PIXEL_ID%");
    expect(html).not.toContain("facebook.com/tr?id=");
    expect(envExample).toContain("VITE_META_APP_ID=<meta-app-id>");
    expect(envExample).toContain("VITE_META_DOMAIN_VERIFICATION=<meta-domain-verification-token>");
    expect(viteEnv).toContain("VITE_META_APP_ID");
    expect(viteEnv).toContain("VITE_META_DOMAIN_VERIFICATION");
    expect(viteConfig).toContain("metaDomainVerificationPlugin");
    expect(viteConfig).toContain("loadEnv(mode");
    expect(viteConfig).toContain("__META_DOMAIN_VERIFICATION__");
    expect(seoHead).toContain("VITE_META_APP_ID");
    expect(seoHead).toContain("if (META_APP_ID) setMeta('property', 'fb:app_id', META_APP_ID)");
    expect(seoHead).toContain("setMeta('property', 'al:ios:url'");
    expect(seoHead).toContain("setMeta('property', 'al:android:package'");
    expect(seoHead).not.toContain("setMeta('property', 'fb:app_id', '2304266847061310'");
    expect(seoHead).not.toContain("setMeta('name', 'al:ios:url'");
    expect(main).toContain("import.meta.env.VITE_META_PIXEL_ID");
    expect(main).toContain('meta[name="zivo-meta-pixel"]');
  });

  it("keeps cookie consent UI, account controls, and policy page writing the same storage key", () => {
    const prefs = read("src/hooks/useCookiePrefs.ts");
    const helper = read("src/lib/privacy/cookieConsent.ts");
    const consent = read("src/components/common/CookieConsent.tsx");
    const cookiePolicy = read("src/pages/legal/CookiePolicy.tsx");
    const accountSettings = read("src/pages/account/AccountSettingsPage.tsx");

    expect(helper).toContain('COOKIE_CONSENT_STORAGE_KEY = "zivo_cookie_consent"');
    expect(prefs).toContain("COOKIE_CONSENT_STORAGE_KEY");
    expect(consent).toContain("COOKIE_CONSENT_STORAGE_KEY");
    expect(cookiePolicy).toContain("COOKIE_CONSENT_STORAGE_KEY");
    expect(consent).toContain("emitCookieConsentUpdated");
    expect(cookiePolicy).toContain("emitCookieConsentUpdated");
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

  it("keeps Google Ads click IDs gated behind marketing consent", () => {
    const helper = read("src/lib/privacy/cookieConsent.ts");
    const googleAds = read("src/lib/googleAdsConversion.ts");
    const main = read("src/main.tsx");

    expect(helper).toContain("isMarketingConsentGranted");
    expect(helper).toContain("COOKIE_CONSENT_UPDATED_EVENT");
    expect(googleAds).toContain("isMarketingConsentGranted");
    expect(googleAds).toContain("clearGoogleAdsClickIds");
    expect(googleAds).toContain("marketing_consent_required");
    expect(googleAds).toContain("missing_google_click_id");
    expect(googleAds).toContain('ad_user_data_consent: "GRANTED"');
    expect(main).toContain("COOKIE_CONSENT_UPDATED_EVENT");
    expect(main).toContain("captureGclidFromUrl");
  });

  it("keeps Meta click IDs, browser events, and SPA page views gated behind marketing consent", () => {
    const helper = read("src/lib/privacy/cookieConsent.ts");
    const meta = read("src/lib/metaAdsTracking.ts");
    const main = read("src/main.tsx");
    const pageViews = read("src/hooks/usePageViewTracker.ts");
    const conversions = read("src/services/metaConversion.ts");
    const signup = read("src/pages/Signup.tsx");

    expect(helper).toContain("isMarketingConsentGranted");
    expect(meta).toContain("captureMetaClickIdFromUrl");
    expect(meta).toContain("clearMetaClickIds");
    expect(meta).toContain("zivo_fbclid");
    expect(meta).toContain("getMetaBrowserIds");
    expect(meta).toContain("window.__zivoLoadAnalytics?.()");
    expect(meta).toContain("trackMetaPixelEvent");
    expect(meta).toContain("trackMetaPageView");
    expect(meta).toContain("trackMetaCompleteRegistration");
    expect(meta).toContain("trackMetaFromAnalyticsEvent");
    expect(meta).toContain("trackMetaAppInstallClick");
    expect(meta).toContain("app_install_store_click");
    expect(meta).toContain('trackMetaPixelEvent("Lead"');
    expect(meta).toContain('window.fbq(command, eventName, params, eventOptions)');
    expect(main).toContain("captureMetaClickIdFromUrl");
    expect(pageViews).toContain("trackMetaPageView(location.pathname)");
    expect(conversions).toContain("isMarketingConsentGranted");
    expect(conversions).toContain("getMetaBrowserIds");
    expect(conversions).toContain("trackMetaPixelEvent(input.eventName");
    expect(signup).toContain("trackMetaCompleteRegistration");
  });
});
