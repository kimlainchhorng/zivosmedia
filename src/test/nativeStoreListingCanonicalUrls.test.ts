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
});
