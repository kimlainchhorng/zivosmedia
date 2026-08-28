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
      '"android:icons:generate": "node scripts/generate-launcher-icons.mjs"',
      '"android:icons:check": "node scripts/native/check-android-launcher-identity.mjs"',
      '"android:build:debug": "npm run native:doctor -- --android-only && node scripts/native/run-android-gradle.mjs assembleDebug"',
      '"android:build:release": "npm run android:icons:check && npm run native:doctor -- --android-only && node scripts/native/run-android-gradle.mjs bundleRelease packageReleaseUniversalApk && npm run android:optimization:check && npm run android:installability:check && npm run android:restore-credentials:check"',
      '"android:optimization:check": "node scripts/native/check-android-release-optimization.mjs"',
      '"android:optimization:test": "node --test scripts/native/check-android-release-optimization.test.mjs"',
      '"android:installability:check": "node scripts/native/check-android-installability.mjs"',
      '"android:installability:test": "node --test scripts/native/check-android-installability.test.mjs"',
      '"android:policy-pages:check": "node scripts/native/check-play-public-policy-pages.mjs"',
      '"android:policy-pages:test": "node --test scripts/native/check-play-public-policy-pages.test.mjs"',
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
    expect(playStore).toContain("npm run android:icons:generate");
    expect(playStore).toContain("npm run android:icons:check");
    expect(playStore).toContain("npm run android:optimization:check");
    expect(playStore).toContain("npm run android:installability:check");
    expect(playStore).toContain("npm run android:policy-pages:check");
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

  it("fails Play draft uploads closed when public policy pages are not ready", () => {
    const uploadHelper = read("scripts/upload-to-play.mjs");
    const policyCheck = read(
      "scripts/native/check-play-public-policy-pages.mjs",
    );

    expect(uploadHelper).toContain(
      'import { checkPlayPublicPolicyPages } from "./native/check-play-public-policy-pages.mjs"',
    );
    expect(uploadHelper).toContain("await checkPlayPublicPolicyPages();");
    expect(policyCheck).toContain("https://zivosmedia.com/legal/privacy");
    expect(policyCheck).toContain("https://zivosmedia.com/delete-account");
    expect(policyCheck).toContain("Delete Your ZIVO Account");
    expect(policyCheck).toContain("What may be retained");
  });

  it("fails Android releases and Play uploads closed without R8 evidence", () => {
    const buildGradle = read("android/app/build.gradle");
    const optimizationCheck = read(
      "scripts/native/check-android-release-optimization.mjs",
    );
    const uploadHelper = read("scripts/upload-to-play.mjs");

    expect(buildGradle).toContain("minifyEnabled true");
    expect(buildGradle).toContain("shrinkResources true");
    expect(buildGradle).toContain("proguard-android-optimize.txt");
    expect(optimizationCheck).toContain("mapping.txt");
    expect(optimizationCheck).toContain("usage.txt");
    expect(optimizationCheck).toContain("configuration.txt");
    expect(optimizationCheck).toContain("seeds.txt");
    expect(optimizationCheck).toContain(
      "BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map",
    );
    expect(uploadHelper).toContain(
      'import { checkAndroidReleaseOptimization } from "./native/check-android-release-optimization.mjs"',
    );
    expect(uploadHelper).toContain(
      "checkAndroidReleaseOptimization({ rootDir: root });",
    );
  });

  it("fails Play draft uploads closed without a matching installable artifact", () => {
    const uploadHelper = read("scripts/upload-to-play.mjs");
    const installabilityCheck = read(
      "scripts/native/check-android-installability.mjs",
    );

    expect(uploadHelper).toContain(
      'import { checkAndroidInstallability } from "./native/check-android-installability.mjs"',
    );
    expect(uploadHelper).toContain(
      "checkAndroidInstallability({ rootDir: root });",
    );
    expect(installabilityCheck).toContain("packageReleaseUniversalApk");
    expect(installabilityCheck).toContain("app-release-universal.apk");
    expect(installabilityCheck).toContain("com.hizovo.app.MainActivity");
    expect(installabilityCheck).toContain("apksigner");
    expect(installabilityCheck).toContain("No device was changed");
  });
});
