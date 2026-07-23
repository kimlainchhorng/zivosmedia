import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("native submission commands", () => {
  it("keeps package scripts for native sync, simulator build, and Android bundles", () => {
    const packageJson = read("package.json");

    for (const script of [
      '"native:sync": "npm run build && npx cap sync ios && npx cap sync android"',
      '"ios:sync": "npm run build && npx cap sync ios"',
      '"ios:build:sim": "npm run native:doctor -- --ios-only && xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination',
      '"ios:archive:store": "npm run native:doctor -- --ios-only && node scripts/native/run-ios-store.mjs archive"',
      '"ios:export:store": "node scripts/native/run-ios-store.mjs export"',
      '"ios:upload:app-store": "node scripts/upload-to-app-store.mjs"',
      '"android:sync": "npm run build && npx cap sync android"',
      '"android:build:debug": "npm run native:doctor -- --android-only && node scripts/native/run-android-gradle.mjs assembleDebug"',
      '"android:build:release": "npm run native:doctor -- --android-only && node scripts/native/run-android-gradle.mjs bundleRelease"',
      '"android:upload:play:draft": "node scripts/upload-to-play.mjs"',
    ]) {
      expect(packageJson).toContain(script);
    }
  });

  it("keeps App Store and Play Store publishing steps aligned with repo scripts", () => {
    const appStore = read("ios/store-listing/APP_STORE.md");
    const playStore = read("android/store-listing/PLAY_STORE.md");

    expect(appStore).toContain("Open Xcode");
    expect(appStore).toContain("Upload build via Xcode");
    expect(appStore).toContain("App Store Connect");

    expect(playStore).toContain("npm run android:sync");
    expect(playStore).toContain("Generate Signed App Bundle");
    expect(playStore).toContain("Play Console");
    expect(playStore).toContain("upload `.aab`");
    expect(playStore).not.toContain("bun run build");
  });

  it("keeps native doctor and platform matrix pointing at the same build commands", () => {
    const doctor = read("scripts/native/doctor.mjs");
    const matrix = read("scripts/qa/platform-readiness-matrix.mjs");
    const nativeContracts = read("scripts/qa/native-app-contracts.mjs");

    for (const command of [
      "npm run native:sync",
      "npm run ios:build:sim",
      "npm run android:build:debug",
    ]) {
      expect(matrix).toContain(command);
    }

    expect(doctor).toContain("Android Gradle wrapper found");
    expect(doctor).toContain("Xcode available");
    expect(doctor).toContain("iOS simulator build preflights Xcode");
    expect(nativeContracts).toContain("native-submission-command-alignment");
  });
});
