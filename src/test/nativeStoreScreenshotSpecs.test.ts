import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const absolute = (relativePath: string) => path.join(root, relativePath);
const read = (relativePath: string) =>
  readFileSync(absolute(relativePath), "utf8");

const metadata = (relativePath: string) =>
  sharp(absolute(relativePath)).metadata();

describe("native store screenshot specs", () => {
  it("keeps Play Store graphic dimensions within Google submission requirements", async () => {
    const icon = await metadata("android/store-listing/icon-512.png");
    const feature = await metadata("android/store-listing/feature-graphic.jpg");

    expect(icon.width).toBe(512);
    expect(icon.height).toBe(512);
    expect(icon.format).toBe("png");

    expect(feature.width).toBe(1024);
    expect(feature.height).toBe(500);
    expect(["jpeg", "png"]).toContain(feature.format);
  });

  it("keeps the canonical ZIVO icon embedded in the Play feature graphic", async () => {
    const featureIcon = await sharp(
      absolute("android/store-listing/feature-graphic.jpg"),
    )
      .extract({ left: 175, top: 188, width: 125, height: 125 })
      .removeAlpha()
      .raw()
      .toBuffer();
    const canonicalIcon = await sharp(
      absolute("android/store-listing/icon-512.png"),
    )
      .resize(165, 165)
      .extract({ left: 20, top: 20, width: 125, height: 125 })
      .removeAlpha()
      .raw()
      .toBuffer();

    expect(featureIcon.length).toBe(canonicalIcon.length);

    let totalDelta = 0;
    for (let index = 0; index < featureIcon.length; index += 1) {
      totalDelta += Math.abs(featureIcon[index] - canonicalIcon[index]);
    }

    const meanAbsoluteDelta = totalDelta / featureIcon.length;
    expect(meanAbsoluteDelta).toBeLessThan(2);
  });

  it("keeps Android phone screenshots either truthfully pending or upload-complete", async () => {
    const screenshotDirectory = "android/store-listing/phone-screenshots";
    const screenshotGuide = read(`${screenshotDirectory}/README.md`);
    const screenshots = readdirSync(absolute(screenshotDirectory))
      .filter((name) => /\.(?:jpe?g|png)$/i.test(name))
      .sort();

    expect(screenshotGuide).toContain("exact signed ZIVO Play-track build");
    expect(screenshotGuide).toContain("Browser, iOS Simulator");
    expect(
      screenshots.length === 0 ||
        (screenshots.length >= 2 && screenshots.length <= 8),
      "Android screenshots must remain explicitly pending or contain one complete 2-to-8 image set",
    ).toBe(true);

    for (const screenshot of screenshots) {
      const image = await metadata(`${screenshotDirectory}/${screenshot}`);
      const width = image.width ?? 0;
      const height = image.height ?? 0;

      expect(["jpeg", "png"]).toContain(image.format);
      expect(Math.min(width, height)).toBeGreaterThanOrEqual(1080);
      expect(height).toBeGreaterThan(width);
    }
  });

  it("keeps enough iPhone screenshots with App Store sized image dimensions", async () => {
    const screenshots = readdirSync(absolute("ios/store-listing"))
      .filter((name) => /^sim.*\.png$/i.test(name))
      .sort();

    expect(screenshots.length).toBeGreaterThanOrEqual(6);

    for (const screenshot of screenshots.slice(0, 6)) {
      const image = await metadata(`ios/store-listing/${screenshot}`);
      expect(image.format).toBe("png");
      expect(image.width).toBeGreaterThanOrEqual(1200);
      expect(image.height).toBeGreaterThanOrEqual(2600);
      expect(image.height).toBeGreaterThan(image.width ?? 0);
    }
  });

  it("documents the screenshot upload expectations in both store listings", () => {
    const appStoreListing = read("ios/store-listing/APP_STORE.md");
    const playStoreListing = read("android/store-listing/PLAY_STORE.md");

    expect(appStoreListing).toContain("Screenshot Assets");
    expect(appStoreListing).toContain("at least 6 iPhone screenshots");
    expect(appStoreListing).toContain("ios/store-listing/sim-home-now.png");
    expect(appStoreListing).toContain("ios/store-listing/sim-profile-now.png");
    expect(playStoreListing).toContain("Phone screenshots:  min 2, max 8");
    expect(playStoreListing).toContain("Icon:               512");
    expect(playStoreListing).toContain("Feature graphic:    1024");
    expect(playStoreListing).toContain(
      "Do not relabel iOS Simulator or browser screenshots as Android evidence.",
    );
    expect(playStoreListing).toContain(
      "android/store-listing/phone-screenshots/",
    );
  });
});
