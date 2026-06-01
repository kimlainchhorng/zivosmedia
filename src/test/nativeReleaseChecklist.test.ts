import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

describe("native release checklist", () => {
  it("documents the complete iOS and Android release path", () => {
    const checklist = read("docs/native-release-checklist.md");

    for (const command of [
      "npm run qa:native-app-contracts",
      "npm run native:doctor",
      "npm run native:sync",
      "npm run ios:sync",
      "npm run android:sync",
      "npm run ios:build:sim",
      "npm run android:build:debug",
      "npm run android:build:release",
      "npm run deploy:update:dry-run",
    ]) {
      expect(checklist).toContain(command);
    }

    for (const releaseValue of [
      "App version: 1.3.0",
      "iOS build: 3",
      "iOS bundle ID: com.hizovo.app",
      "Android versionCode: 2026053101",
      "Android package: com.hizovo.app",
    ]) {
      expect(checklist).toContain(releaseValue);
    }
  });

  it("links store metadata, assets, and OTA safety back to the release checklist", () => {
    const checklist = read("docs/native-release-checklist.md");
    const nativeContracts = read("scripts/qa/native-app-contracts.mjs");
    const matrix = read("scripts/qa/platform-readiness-matrix.mjs");

    for (const assetPath of [
      "ios/store-listing/APP_STORE.md",
      "android/store-listing/PLAY_STORE.md",
      "android/store-listing/icon-512.png",
      "android/store-listing/feature-graphic.jpg",
      "ios/store-listing/sim-home-now.png",
      "ios/store-listing/sim-profile-now.png",
    ]) {
      expect(checklist).toContain(assetPath);
    }

    expect(checklist).toContain("OTA updates must not add native plugins");
    expect(nativeContracts).toContain("native-release-checklist");
    expect(matrix).toContain("src/test/nativeReleaseChecklist.test.ts");
  });
});
