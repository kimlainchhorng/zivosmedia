import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const absolute = (relativePath: string) => path.join(root, relativePath);

const expectAsset = (relativePath: string, minBytes: number) => {
  const file = absolute(relativePath);
  expect(existsSync(file), `${relativePath} should exist`).toBe(true);
  expect(statSync(file).size, `${relativePath} should not be empty`).toBeGreaterThanOrEqual(minBytes);
};

const androidLauncherSizes = {
  mdpi: 48,
  hdpi: 72,
  xhdpi: 96,
  xxhdpi: 144,
  xxxhdpi: 192,
} as const;

const androidLauncherFiles = [
  "ic_launcher.png",
  "ic_launcher_round.png",
  "ic_launcher_foreground.png",
] as const;

describe("native store release assets", () => {
  it("keeps iOS app icon and launch splash assets present", () => {
    for (const asset of [
      "ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json",
      "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
      "ios/App/App/Assets.xcassets/SplashV2.imageset/Contents.json",
      "ios/App/App/Assets.xcassets/SplashV2.imageset/zivo-splash.png",
      "ios/App/App/Assets.xcassets/SplashV2.imageset/zivo-splash@2x.png",
      "ios/App/App/Assets.xcassets/SplashV2.imageset/zivo-splash@3x.png",
    ]) {
      expectAsset(asset, asset.endsWith(".json") ? 40 : 1_000);
    }
  });

  it("keeps Android launcher icons and splash assets present across density buckets", () => {
    for (const density of Object.keys(androidLauncherSizes)) {
      for (const fileName of androidLauncherFiles) {
        expectAsset(`android/app/src/main/res/mipmap-${density}/${fileName}`, 500);
      }
      expectAsset(`android/app/src/main/res/drawable-port-${density}/splash.png`, 500);
      expectAsset(`android/app/src/main/res/drawable-land-${density}/splash.png`, 500);
    }

    expectAsset("android/app/src/main/res/drawable/splash.png", 500);
    expectAsset("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml", 40);
    expectAsset("android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_round.xml", 40);
  });

  it("keeps every installed Android launcher pixel-aligned with the canonical Play icon", async () => {
    const canonicalIcon = absolute("android/store-listing/icon-512.png");

    for (const [density, size] of Object.entries(androidLauncherSizes)) {
      const expected = await sharp(canonicalIcon)
        .resize(size, size)
        .ensureAlpha()
        .raw()
        .toBuffer();

      for (const fileName of androidLauncherFiles) {
        const relativePath = `android/app/src/main/res/mipmap-${density}/${fileName}`;
        const actual = await sharp(absolute(relativePath))
          .ensureAlpha()
          .raw()
          .toBuffer();

        expect(
          actual.equals(expected),
          `${relativePath} should be regenerated from android/store-listing/icon-512.png`,
        ).toBe(true);
      }
    }
  });

  it("keeps App Store and Play Store marketing graphics ready for upload", () => {
    expectAsset("android/store-listing/icon-512.png", 10_000);
    expectAsset("android/store-listing/feature-graphic.jpg", 50_000);
    expectAsset("android/store-listing/from-zip/zivo-icon-512.png", 10_000);

    const iosScreenshots = readdirSync(absolute("ios/store-listing"))
      .filter((name) => /^sim.*\.png$/i.test(name));
    expect(iosScreenshots.length).toBeGreaterThanOrEqual(6);
    for (const screenshot of iosScreenshots.slice(0, 6)) {
      expectAsset(`ios/store-listing/${screenshot}`, 250_000);
    }
  });
});
