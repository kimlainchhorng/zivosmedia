import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const absolute = (relativePath: string) => path.join(root, relativePath);
const read = (relativePath: string) => readFileSync(absolute(relativePath), "utf8");

const metadata = (relativePath: string) => sharp(absolute(relativePath)).metadata();

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
  });
});
