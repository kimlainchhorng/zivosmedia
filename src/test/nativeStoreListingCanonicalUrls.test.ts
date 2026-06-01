import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildStoreUrlWithAttribution } from "@/lib/deepLinks";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("native store listing canonical URLs", () => {
  it("keeps iOS and Android store metadata on the canonical public domain and legal routes", () => {
    const appStore = read("ios/store-listing/APP_STORE.md");
    const playStore = read("android/store-listing/PLAY_STORE.md");
    const combined = `${appStore}\n${playStore}`;

    for (const canonicalUrl of [
      "https://zivollc.com",
      "https://zivollc.com/support",
      "https://zivollc.com/legal/privacy",
      "https://zivollc.com/legal/terms",
      "https://zivollc.com/delete-account",
    ]) {
      expect(combined).toContain(canonicalUrl);
    }

    for (const legacyUrl of [
      "https://zivollc.com/privacy",
      "https://zivollc.com/terms",
      "https://www.zivollc.com",
      "https://www.zivollc.com/privacy-policy",
      "https://www.zivollc.com/terms-of-service",
      "https://www.zivollc.com/account-deletion",
    ]) {
      expect(combined).not.toContain(legacyUrl);
    }
  });

  it("keeps native listing URLs backed by app routes", () => {
    const app = read("src/App.tsx");

    for (const route of [
      'path="/legal/privacy"',
      'path="/legal/terms"',
      'path="/delete-account"',
      'path="/support"',
    ]) {
      expect(app).toContain(route);
    }
  });

  it("keeps app install store clicks attributed without changing canonical URLs", () => {
    const deepLinks = read("src/lib/deepLinks.ts");
    const envExample = read(".env.example");
    const manifest = read("public/manifest.webmanifest");
    const index = read("index.html");
    const vite = read("vite.config.ts");
    const website = read("website/WEBSITE.md");
    const notifyAppUpdate = read("supabase/functions/notify-app-update/index.ts");
    const driverDownload = read("src/components/partner/DriverAppDownloadSheet.tsx");
    const search =
      "?utm_source=facebook&utm_medium=paid_social&utm_campaign=ZIVO%20App%20Install&utm_content=video_a&fbclid=fb-click-123";
    const appStoreUrl = "https://apps.apple.com/us/app/zivos/id6759480121";

    const ios = new URL(
      buildStoreUrlWithAttribution(
        appStoreUrl,
        "ios",
        { search },
      ),
    );
    expect(`${ios.origin}${ios.pathname}`).toBe(appStoreUrl);
    expect(ios.searchParams.get("utm_source")).toBe("facebook");
    expect(ios.searchParams.get("utm_medium")).toBe("paid_social");
    expect(ios.searchParams.get("utm_campaign")).toBe("ZIVO App Install");
    expect(ios.searchParams.get("utm_content")).toBe("video_a");
    expect(ios.searchParams.get("ct")).toBe("zivo-app-install");
    expect(ios.searchParams.has("fbclid")).toBe(false);

    const android = new URL(
      buildStoreUrlWithAttribution(
        "https://play.google.com/store/apps/details?id=com.hizovo.app",
        "android",
        { search },
      ),
    );
    const referrer = new URLSearchParams(android.searchParams.get("referrer") || "");
    expect(android.searchParams.get("id")).toBe("com.hizovo.app");
    expect(android.searchParams.get("utm_source")).toBeNull();
    expect(referrer.get("utm_source")).toBe("facebook");
    expect(referrer.get("utm_medium")).toBe("paid_social");
    expect(referrer.get("utm_campaign")).toBe("ZIVO App Install");
    expect(referrer.get("utm_content")).toBe("video_a");
    expect(referrer.get("fbclid")).toBe("fb-click-123");

    expect(deepLinks).toContain("https://apps.apple.com/us/app/zivos/id${IOS_APP_STORE_ID}");
    expect(deepLinks).not.toContain("apps.apple.com/us/app/zivo-customer");
    for (const source of [envExample, manifest, index, vite, website, notifyAppUpdate]) {
      expect(source).toContain(appStoreUrl);
      expect(source).not.toContain("apps.apple.com/us/app/zivo-customer");
    }
    expect(driverDownload).toContain("https://apps.apple.com/us/app/zivodrivers/id6759507131");
    expect(driverDownload).not.toContain("apps.apple.com/us/app/zivo-customer");
  });
});
