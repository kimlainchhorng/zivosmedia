import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("native store listing canonical URLs", () => {
  it("keeps the installed Android identity aligned with the ZIVO app and Play listing", () => {
    const androidStrings = read("android/app/src/main/res/values/strings.xml");
    const capacitorConfig = read("capacitor.config.ts");
    const playStore = read("android/store-listing/PLAY_STORE.md");

    expect(androidStrings).toContain('<string name="app_name">ZIVO</string>');
    expect(androidStrings).toContain(
      '<string name="title_activity_main">ZIVO</string>',
    );
    expect(androidStrings).not.toMatch(
      /<string name="(?:app_name|title_activity_main)">Zivo<\/string>/,
    );
    expect(capacitorConfig).toContain("appId: 'com.hizovo.app'");
    expect(capacitorConfig).toContain("appName: 'ZIVO'");
    expect(playStore).toContain("Package name: `com.hizovo.app`");
    expect(playStore).toMatch(/## 1\. App Name[\s\S]*?```\nZIVO\n```/);
    expect(playStore).not.toContain("ZIVO – Travel, Social & Shop");
  });

  it("keeps iOS and Android store metadata on the canonical public domain and legal routes", () => {
    const appStore = read("ios/store-listing/APP_STORE.md");
    const playStore = read("android/store-listing/PLAY_STORE.md");
    const combined = `${appStore}\n${playStore}`;

    for (const canonicalUrl of [
      "https://zivosmedia.com",
      "https://zivosmedia.com/support",
      "https://zivosmedia.com/legal/privacy",
      "https://zivosmedia.com/legal/terms",
      "https://zivosmedia.com/delete-account",
    ]) {
      expect(combined).toContain(canonicalUrl);
    }

    for (const legacyUrl of [
      "https://zivosmedia.com/privacy",
      "https://zivosmedia.com/terms",
      "https://www.zivosmedia.com",
      "https://www.zivosmedia.com/privacy-policy",
      "https://www.zivosmedia.com/terms-of-service",
      "https://www.zivosmedia.com/account-deletion",
      // The exact URL Google Play rejected on 2026-05-22: it does not resolve.
      "https://hizivo.com/privacy-policy",
    ]) {
      expect(combined).not.toContain(legacyUrl);
    }

    // Neither confusable ZIVO domain may ever be used as a public policy or
    // deletion URL in store metadata; hizivo.com does not resolve and
    // hizovo.com is only a bundle-id namespace, not a served web domain.
    expect(combined).not.toMatch(/https:\/\/(?:www\.)?hiz[io]vo\.com/);
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

  it("keeps the Android listing limited to device-verifiable product claims", () => {
    const playStore = read("android/store-listing/PLAY_STORE.md");

    expect(playStore).toContain(
      "Social, messaging, and travel search in one ZIVO account.",
    );
    expect(playStore).toContain(
      "Feature availability varies by location, provider, account, and internet connection.",
    );

    for (const unverifiedClaim of [
      "500+ partners",
      "Book rides and order food or groceries in seconds",
      "AI trip planner creates your full itinerary instantly",
      "Stripe payouts",
      "Free HD voice and video calls",
      "No booking fees on travel",
      "offline-friendly",
    ]) {
      expect(playStore).not.toContain(unverifiedClaim);
    }
  });

  it("keeps the iOS draft conservative and exposes unresolved console decisions", () => {
    const appStore = read("ios/store-listing/APP_STORE.md");

    expect(appStore).toMatch(/## 1\. App Name[\s\S]*?```text\nZIVO\n```/);
    expect(appStore).toContain(
      "ZIVO brings social discovery, messaging, and travel search into one app.",
    );
    expect(appStore).toContain(
      "Feature availability varies by location, provider, account, and internet connection.",
    );
    expect(appStore).toContain("Identity preflight — resolve before submission");
    expect(appStore).toContain(
      "Info.plist, and iOS\nDebug/Release build settings now use `ZIVO`",
    );
    expect(appStore).toContain(
      "Use the rating calculated by App Store Connect",
    );
    expect(appStore).toContain("Do not paste the obsolete `12+` note");
    expect(appStore).toContain(
      "App Store Connect already processed build 4",
    );
    expect(appStore).toContain(
      "Their presence is not upload readiness.",
    );

    for (const unverifiedClaim of [
      "500+ trusted partners",
      "AI trip planner builds your itinerary in seconds",
      "Built-in POS, orders, and payouts via Stripe",
      "End-to-end messaging",
      "Free voice and HD video calls",
      "No booking fees on travel searches",
      "Works everywhere",
    ]) {
      expect(appStore).not.toContain(unverifiedClaim);
    }
  });
});
