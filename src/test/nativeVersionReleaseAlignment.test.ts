import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const capture = (source: string, pattern: RegExp, label: string) => {
  const match = source.match(pattern);
  expect(match?.[1], `${label} should be present`).toBeTruthy();
  return match?.[1] ?? "";
};

describe("native version release alignment", () => {
  it("keeps package, iOS, Android, and store listing release versions aligned", () => {
    const packageJson = JSON.parse(read("package.json")) as { version: string };
    const iosProject = read("ios/App/App.xcodeproj/project.pbxproj");
    const androidBuild = read("android/app/build.gradle");
    const appStoreListing = read("ios/store-listing/APP_STORE.md");
    const playStoreListing = read("android/store-listing/PLAY_STORE.md");

    const iosMarketingVersions = [...iosProject.matchAll(/MARKETING_VERSION = ([0-9.]+);/g)].map((match) => match[1]);
    const iosBuildNumbers = [...iosProject.matchAll(/CURRENT_PROJECT_VERSION = ([0-9]+);/g)].map((match) => match[1]);
    const androidVersionName = capture(androidBuild, /versionName "([^"]+)"/, "Android versionName");
    const androidVersionCode = capture(androidBuild, /versionCode ([0-9]+)/, "Android versionCode");

    expect(new Set(iosMarketingVersions)).toEqual(new Set([packageJson.version]));
    expect(new Set(iosBuildNumbers)).toEqual(new Set(["5"]));
    expect(androidVersionName).toBe(packageJson.version);
    expect(Number(androidVersionCode)).toBeGreaterThan(2026053100);

    for (const listing of [appStoreListing, playStoreListing]) {
      expect(listing).toContain("Release Metadata");
      expect(listing).toContain(`Version: ${packageJson.version}`);
    }
    expect(appStoreListing).toContain("Build: 5");
    expect(playStoreListing).toContain(`Version code: ${androidVersionCode}`);
  });
});
