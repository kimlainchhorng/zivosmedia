import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("native store listing canonical URLs", () => {
  it("keeps iOS and Android store metadata on the canonical public domain and legal routes", () => {
    const appStore = read("ios/store-listing/APP_STORE.md");
    const playStore = read("android/store-listing/PLAY_STORE.md");
    const combined = `${appStore}\n${playStore}`;

    for (const canonicalUrl of [
      "https://hizivo.com",
      "https://hizivo.com/support",
      "https://hizivo.com/legal/privacy",
      "https://hizivo.com/legal/terms",
      "https://hizivo.com/delete-account",
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
