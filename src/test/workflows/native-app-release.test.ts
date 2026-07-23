import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("native app release workflow", () => {
  it("keeps Capacitor production config aligned with the native shells", () => {
    const config = read("capacitor.config.ts");
    const packageJson = read("package.json");
    const main = read("src/main.tsx");

    expect(config).toContain("appId: 'com.hizovo.app'");
    expect(config).toContain("appName: 'ZIVO'");
    expect(config).toContain("webDir: 'dist'");
    expect(config).toContain("process.env.NODE_ENV !== 'production'");
    expect(config).toContain("CAPACITOR_DEV_SERVER_URL");
    expect(config).toContain("allowMixedContent: false");
    expect(config).toContain("overlaysWebView: true");
    expect(config).toContain("launchAutoHide: false");
    expect(config).not.toContain("http://localhost");

    for (const dependency of ["@capacitor/core", "@capacitor/ios", "@capacitor/android", "@capgo/capacitor-updater"]) {
      expect(packageJson).toContain(dependency);
    }
    expect(main).toContain("SplashScreen.hide");
  });

  it("keeps iOS bundle, privacy, permissions, and App Store listing aligned", () => {
    const project = read("ios/App/App.xcodeproj/project.pbxproj");
    const info = read("ios/App/App/Info.plist");
    const privacy = read("ios/App/App/PrivacyInfo.xcprivacy");
    const entitlements = read("ios/App/App/App.entitlements");
    const listing = read("ios/store-listing/APP_STORE.md");

    expect(project).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.hizovo.app");
    expect(project).toContain("MARKETING_VERSION = 1.3.0");
    expect(info).toContain("NSCameraUsageDescription");
    expect(info).toContain("NSMicrophoneUsageDescription");
    expect(info).toContain("NSLocationWhenInUseUsageDescription");
    expect(info).toContain("NSUserTrackingUsageDescription");
    expect(info).toContain("NSPinnedDomains");
    expect(info).toContain("supabase.co");
    expect(info).toContain("stripe.com");

    expect(privacy).toContain("NSPrivacyTracking");
    expect(privacy).toContain("NSPrivacyCollectedDataTypes");
    expect(privacy).toContain("NSPrivacyAccessedAPITypes");

    expect(entitlements).toContain("aps-environment");
    expect(entitlements).toContain("com.apple.developer.applesignin");
    const legacyAssociatedDomain = "hizovo" + ".com";
    expect(entitlements).not.toContain(`applinks:${legacyAssociatedDomain}`);
    expect(entitlements).not.toContain(`webcredentials:${legacyAssociatedDomain}`);

    expect(listing).toContain("Bundle ID: `com.hizovo.app`");
    expect(listing).toContain("Privacy URL:");
    expect(listing).toContain("https://zivosmedia.com/legal/privacy");
    expect(listing).toContain("https://zivosmedia.com/legal/terms");
    expect(listing).toContain("What's New in This Version");
  });

  it("keeps Android package, versions, integrity, and Play Store listing aligned", () => {
    const build = read("android/app/build.gradle");
    const variables = read("android/variables.gradle");
    const listing = read("android/store-listing/PLAY_STORE.md");
    const setup = read("docs/native-android-setup.md");

    expect(build).toContain('namespace = "com.hizovo.app"');
    expect(build).toContain('applicationId "com.hizovo.app"');
    expect(build).toContain("versionCode 2026053101");
    expect(build).toContain('versionName "1.3.0"');
    expect(build).toContain("com.google.android.play:integrity");
    expect(build).toContain("keystore.properties");
    expect(build).toContain("google-services.json");

    expect(variables).toContain("minSdkVersion = 24");
    expect(variables).toContain("compileSdkVersion = 36");
    expect(variables).toContain("targetSdkVersion = 35");

    expect(listing).toContain("Package name: `com.hizovo.app`");
    expect(listing).toContain("Privacy Policy URL");
    expect(listing).toContain("Account Deletion URL");
    expect(listing).toContain("https://zivosmedia.com/legal/privacy");
    expect(listing).toContain("https://zivosmedia.com/legal/terms");
    expect(listing).toContain("https://zivosmedia.com/delete-account");
    expect(listing).not.toContain("https://www.zivosmedia.com");
    expect(setup).toContain("android/local.properties");
    expect(setup).toContain("npm run android:build:debug");
  });

  it("keeps OTA live updates safe for store-reviewed native binaries", () => {
    const hook = read("src/hooks/useOTAUpdate.ts");
    const docs = read("docs/OTA_LIVE_UPDATES.md");
    const deploy = read("scripts/deploy-update.mjs");
    const packageJson = read("package.json");
    const config = read("capacitor.config.ts");

    expect(hook).toContain("Capacitor.isNativePlatform()");
    expect(hook).toContain("latest.json");
    expect(hook).toContain("MANIFEST_FETCH_TIMEOUT_MS");
    expect(hook).toContain("new AbortController()");
    expect(hook).toContain("fetchController.abort()");
    expect(hook).toContain("signal: fetchController.signal");
    expect(hook).toContain("window.clearTimeout(fetchTimeout)");
    expect(hook).toContain('cache: "no-store"');
    expect(hook).toContain('Accept: "application/json"');
    expect(hook).toContain('headers.get("content-type")');
    expect(hook).toContain('includes("application/json")');
    expect(hook).toContain("isManifestRecord");
    expect(hook).toContain("!Array.isArray");
    expect(hook).toContain("manifestJson");
    expect(hook).toContain("isValidSemver");
    expect(hook).toContain("manifest.version");
    expect(hook).toContain("MAX_MANIFEST_FUTURE_SKEW_MS");
    expect(hook).toContain("MAX_MANIFEST_AGE_MS");
    expect(hook).toContain("MAX_RELEASE_MESSAGE_LENGTH");
    expect(hook).toContain("isValidOptionalMessage");
    expect(hook).toContain("message.trim() === message");
    expect(hook).toContain("message.length > 0");
    expect(hook).toContain("manifest.message");
    expect(hook).toContain("isValidManifestTimestamp");
    expect(hook).not.toContain("createdAt === undefined");
    expect(hook).toContain("manifest.createdAt");
    expect(hook).toContain("Date.parse(createdAt)");
    expect(hook).toContain("timestamp >= now - MAX_MANIFEST_AGE_MS");
    expect(hook).toContain("isAllowedBundleUrl");
    expect(hook).toContain("new URL(SUPABASE_URL)");
    expect(hook).toContain('bundleUrl.protocol === "https:"');
    expect(hook).toContain("bundleUrl.host === supabaseUrl.host");
    expect(hook).toContain('bundleUrl.search === ""');
    expect(hook).toContain('bundleUrl.hash === ""');
    expect(hook).toContain("expectedPath");
    expect(hook).toContain("decodeURIComponent(bundleUrl.pathname) === expectedPath");
    expect(hook).toContain("isAllowedBundleUrl(manifest.url, manifest.version)");
    expect(hook).toContain("decodeURIComponent");
    expect(hook).toContain("zivo-v${version}.zip");
    expect(hook).toContain("isValidSha256Checksum");
    expect(hook).toContain("/^[a-f0-9]{64}$/i");
    expect(hook).toContain("manifest.checksum");
    expect(hook).toContain("isValidActivation");
    expect(hook).toContain("manifest.activation");
    expect(hook).toContain('activation === "prompt"');
    expect(hook).toContain('activation === "next_launch"');
    expect(hook).toContain('activation === "immediate"');
    expect(hook).toContain("isValidBoolean");
    expect(hook).not.toContain("activation === undefined");
    expect(hook).not.toContain("value === undefined");
    expect(hook).toContain('typeof value === "boolean"');
    expect(hook).toContain("isValidMandatoryActivation");
    expect(hook).toContain("manifest.mandatory");
    expect(hook).toContain('!mandatory || activation === "next_launch" || activation === "immediate"');
    expect(hook).toContain('activation !== "immediate" || mandatory === true');
    expect(hook).toContain("MAX_BUNDLE_SIZE_BYTES");
    expect(hook).toContain("bundleSizeBytes");
    expect(hook).toContain("isAllowedBundleSize");
    expect(hook).not.toContain("bundleSizeBytes === undefined");
    expect(hook).toContain("manifest.bundleSizeBytes");
    expect(hook).toContain("isValidOptionalSemver");
    expect(hook).toContain("/^\\d+\\.\\d+\\.\\d+$/");
    expect(hook).toContain("manifest.minNativeVersion");
    expect(hook).toContain("minNativeVersion");
    expect(hook).toContain("CapacitorUpdater.download");
    expect(hook).toContain("newBundle.version !== manifest.version");
    expect(hook).toContain("CapacitorUpdater.delete");
    expect(hook).toContain("CapacitorUpdater.next");
    expect(hook).toContain("CapacitorUpdater.set");
    expect(hook).toContain('App.addListener("resume"');

    expect(docs).toContain("Do not use OTA updates for new native plugins");
    expect(docs).toContain("SHA-256 checksum");
    expect(docs).toContain("--min-native-version");
    expect(docs).toContain("app-updates");

    expect(deploy).toContain("sha256");
    expect(deploy).toContain("latest.json");
    expect(deploy).toContain('contentType: "application/zip"');
    expect(deploy).toContain('cacheControl: "31536000"');
    expect(deploy).toContain('contentType: "application/json"');
    expect(deploy).toContain('cacheControl: "0"');
    expect(deploy).toContain("app-updates");
    expect(deploy).toContain("minNativeVersion");
    expect(deploy).toContain("bundleSizeBytes");
    expect(deploy).toContain("Bundle size:");
    expect(deploy).toContain("DEFAULT_MAX_BUNDLE_SIZE_BYTES");
    expect(deploy).toContain("ZIVO_OTA_MAX_BUNDLE_SIZE_BYTES");
    expect(deploy).toContain("readMaxBundleSizeBytes");
    expect(deploy).toContain("maxBundleSizeBytes");
    expect(deploy).toContain("ZIVO_ALLOW_LARGE_OTA_BUNDLE");
    expect(deploy).toContain("I_UNDERSTAND_THE_OTA_SIZE_RISK");
    expect(deploy).toContain("assertBundleSize");
    expect(deploy).toContain("assertValidManifestVersion");
    expect(deploy).toContain("Invalid OTA version value");
    expect(deploy).toContain("assertValidManifestUrl");
    expect(deploy).toContain("Invalid OTA dry-run URL value");
    expect(deploy).toContain("decodeURIComponent");
    expect(deploy).toContain("assertValidBundleSizeBytes");
    expect(deploy).toContain("Invalid OTA bundleSizeBytes value");
    expect(deploy).toContain("assertValidManifestPayload");
    expect(deploy).toContain("assertValidOptionalMinNativeVersion");
    expect(deploy).toContain("Invalid OTA minNativeVersion value");
    expect(deploy).toContain("assertValidOptionalMessage");
    expect(deploy).toContain("Invalid OTA message value");
    expect(deploy).toContain("assertAllowedBundleUrl");
    expect(deploy).toContain("new URL(SUPABASE_URL)");
    expect(deploy).toContain('bundleUrl.search !== ""');
    expect(deploy).toContain('bundleUrl.hash !== ""');
    expect(deploy).toContain("expectedObjectPath");
    expect(deploy).toContain("decodeURIComponent(bundleUrl.pathname) !== expectedObjectPath");
    expect(deploy).toContain("Unexpected OTA bundle URL");
    expect(deploy).toContain("/storage/v1/object/public/${BUCKET}/${zipName}");
    expect(deploy).toContain("assertValidActivation");
    expect(deploy).toContain("Invalid OTA activation value");
    expect(deploy).toContain("assertValidCreatedAt");
    expect(deploy).toContain("Invalid OTA manifest createdAt timestamp");
    expect(deploy).toContain("Date.parse(value)");
    expect(deploy).toContain("assertValidMandatory");
    expect(deploy).toContain("Invalid OTA mandatory value");
    expect(deploy).toContain('typeof value !== "boolean"');
    expect(deploy).toContain("assertValidActivationConsistency");
    expect(deploy).toContain("immediate updates must be mandatory");
    expect(deploy).toContain("assertValidChecksum");
    expect(deploy).toContain("Invalid OTA checksum value");
    expect(deploy).toContain("MAX_RELEASE_MESSAGE_LENGTH");
    expect(deploy).toContain("OTA release message must be");
    expect(deploy).toContain("parseSemver");
    expect(deploy).toContain("package.json version");
    expect(deploy).toContain("--min-native-version");
    expect(deploy).toContain("valid semver version like 1.2.3");
    expect(deploy).toContain("activationModeFlags");
    expect(deploy).toContain("Choose only one OTA activation mode flag");
    expect(deploy).toContain("--mandatory requires an explicit OTA activation mode");
    expect(deploy).toContain("releaseMessage");
    expect(deploy).toContain("immediate or mandatory OTA updates require");
    expect(deploy).toContain("dryRun");
    expect(deploy).toContain("Running local dry-run preflight");
    expect(deploy).toContain("--skip-build --skip-type-check");
    expect(deploy).toContain("--strict --skip-build");
    expect(deploy).toContain("Manifest preview");
    expect(deploy).toContain("dry-run://");
    expect(deploy).toContain("No package.json changes were written");
    expect(deploy).toContain("ZIVO_ALLOW_OTA_SKIP_PREFLIGHT");
    expect(deploy).toContain("I_UNDERSTAND_THE_RELEASE_RISK");
    expect(deploy).toContain("originalPackageJson");
    expect(deploy).toContain("uploadedBundle");
    expect(deploy).toContain("remove([zipName])");
    expect(deploy).toContain("local zip cleanup failed");
    expect(deploy).toContain("Restored package.json version bump");
    for (const scriptName of ["deploy:update", "deploy:update:dry-run", "deploy:update:next", "deploy:update:immediate"]) {
      expect(packageJson).toContain(`"${scriptName}": "npm run security:scan && node scripts/deploy-update.mjs`);
    }
    expect(packageJson).toContain('"deploy:update:dry-run": "npm run security:scan && node scripts/deploy-update.mjs --dry-run"');
    expect(config).toContain("autoUpdate: false");
  });

  it("keeps native release checks wired into platform reports", () => {
    const packageJson = read("package.json");
    const nativeContract = read("scripts/qa/native-app-contracts.mjs");
    const storeListingUrlTest = read("src/test/nativeStoreListingCanonicalUrls.test.ts");
    const doctor = read("scripts/native/doctor.mjs");
    const matrix = read("scripts/qa/platform-readiness-matrix.mjs");
    const coverage = read("scripts/qa/workflow-coverage.mjs");
    const coverageCheck = read("scripts/qa/check-workflow-coverage.mjs");

    expect(packageJson).toContain('"qa:native-app-contracts"');
    expect(packageJson).toContain('"platform:audit": "npm run security:scan && npm run qa:platform-readiness');
    expect(packageJson).toContain("npm run qa:native-app-contracts");
    expect(packageJson).toContain("npm run qa:platform-readiness && npm run qa:platform-readiness:check");
    expect(packageJson).toContain("npm run qa:workflow-coverage && npm run qa:workflow-coverage:check");
    expect(packageJson).toContain("npm run qa:workflow-test-plan && npm run qa:workflow-test-plan:check");
    expect(nativeContract).toContain("capacitor-production-shell");
    expect(nativeContract).toContain("ios-store-privacy-entitlements");
    expect(nativeContract).toContain("android-store-build-readiness");
    expect(nativeContract).toContain("native-permissions-deeplinks-push");
    expect(nativeContract).toContain("ota-update-safety");
    expect(nativeContract).toContain("native-store-release-assets");
    expect(nativeContract).toContain("native-submission-command-alignment");
    expect(nativeContract).toContain("native-store-screenshot-specs");
    expect(nativeContract).toContain("native-version-release-alignment");
    expect(nativeContract).toContain("native-release-checklist");
    expect(storeListingUrlTest).toContain("native store listing canonical URLs");
    expect(read("src/test/nativeStoreAssets.test.ts")).toContain("native store release assets");
    expect(read("src/test/nativeSubmissionCommands.test.ts")).toContain("native submission commands");
    expect(read("src/test/nativeStoreScreenshotSpecs.test.ts")).toContain("native store screenshot specs");
    expect(read("src/test/nativeVersionReleaseAlignment.test.ts")).toContain("native version release alignment");
    expect(read("src/test/nativeReleaseChecklist.test.ts")).toContain("native release checklist");

    expect(doctor).toContain("Android SDK configured");
    expect(doctor).toContain("iOS marketing version aligned");
    expect(matrix).toContain("native-mobile-release");
    expect(matrix).toContain("qa:native-app-contracts");
    expect(matrix).toContain("src/test/nativeSafeAreaBridgeContracts.test.ts");
    expect(matrix).toContain("src/test/otaDeployBypass.test.ts");
    expect(matrix).toContain("npm run native:doctor");
    expect(matrix).toContain("npm run native:sync");
    expect(matrix).toContain("simulator/debug builds green");
    expect(coverage).toContain("native-mobile-release");
    expect(coverage).toContain("qa:native-app-contracts");
    expect(coverageCheck).toContain("native-mobile-release");
  });
});
