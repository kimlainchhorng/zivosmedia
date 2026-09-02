import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

// The Capacitor-generated Xcode project is machine-local (never committed);
// iOS release-contract tests run on machines that have it.
const hasIosProject = existsSync(
  path.join(root, "ios/App/App.xcodeproj/project.pbxproj"),
);

describe("native app release workflow", () => {
  it("keeps Capacitor production config aligned with the native shells", () => {
    const config = read("capacitor.config.ts");
    const index = read("index.html");
    const packageJson = read("package.json");
    const main = read("src/main.tsx");

    expect(config).toContain("appId: 'com.hizovo.app'");
    expect(config).toContain("appName: 'ZIVO'");
    expect(config).toContain("webDir: 'dist'");
    expect(config).toContain("process.env.NODE_ENV !== 'production'");
    expect(config).toContain("CAPACITOR_DEV_SERVER_URL");
    expect(config).toContain("allowMixedContent: false");
    expect(config).toContain("overlaysWebView: true");
    // Was `toContain("launchAutoHide: false")` until 2026-08-11, which pinned
    // the defect instead of the requirement. With autoHide off, the splash is
    // only ever hidden by an explicit JS hide() call, so a boot that throws
    // before that call leaves it up forever — the Broken Functionality removal
    // of com.hizovo.app on 2026-07-29. Behaviour, not the old literal, is what
    // this release workflow should hold.
    expect(config).toContain("launchAutoHide: true");
    expect(config).toContain("launchShowDuration: 0");
    expect(config).not.toContain("http://localhost");
    const bootShellIndex = index.indexOf("<div data-zivo-boot-shell");
    const reactRootIndex = index.indexOf('<div id="root"></div>');
    expect(bootShellIndex).toBeGreaterThanOrEqual(0);
    expect(reactRootIndex).toBeGreaterThan(bootShellIndex);
    expect(index).toContain("កំពុងបើកកម្មវិធីរបស់អ្នក");
    expect(index).toContain('aria-atomic="true"');
    expect(main).toContain("removeBootShellAfterFirstAppPaint(root)");
    expect(main).toContain("new MutationObserver");
    expect(main).toContain("root.childElementCount");
    expect(main).toContain("function finishBoot()");
    expect(main).toContain("NATIVE_BOOT_SHELL_HANDOFF_MS = 350");
    expect(main).toContain(
      "window.setTimeout(removeBootShell, NATIVE_BOOT_SHELL_HANDOFF_MS)",
    );
    expect(main).toContain("notifyNativeAppReady();");
    expect(main).toContain("onUncaughtError: paintBootError");
    expect(main).not.toContain("root.replaceChildren");

    for (const dependency of ["@capacitor/core", "@capacitor/ios", "@capacitor/android", "@capgo/capacitor-updater"]) {
      expect(packageJson).toContain(dependency);
    }
    expect(packageJson).not.toContain("capacitor-plugin-app-tracking-transparency");
    expect(main).toContain("SplashScreen.hide");
  });

  it.skipIf(!hasIosProject)("keeps iOS bundle, privacy, permissions, and App Store listing aligned", () => {
    const project = read("ios/App/App.xcodeproj/project.pbxproj");
    const info = read("ios/App/App/Info.plist");
    const privacy = read("ios/App/App/PrivacyInfo.xcprivacy");
    const entitlements = read("ios/App/App/App.entitlements");
    const capacitorPackage = read("ios/App/CapApp-SPM/Package.swift");
    const listing = read("ios/store-listing/APP_STORE.md");
    const archiveRunner = read("scripts/native/run-ios-store.mjs");
    const appStoreUpload = read("scripts/upload-to-app-store.mjs");

    expect(project).toContain("PRODUCT_BUNDLE_IDENTIFIER = com.hizovo.app");
    expect(project).toContain("MARKETING_VERSION = 1.3.0");
    expect(project.match(/PrivacyInfo\.xcprivacy in Resources/g)).toHaveLength(2);
    expect(info).toContain("NSCameraUsageDescription");
    expect(info).toContain("NSMicrophoneUsageDescription");
    expect(info).toContain("NSLocationWhenInUseUsageDescription");
    expect(info).toContain("QR codes you choose to scan");
    expect(info).toContain("voice messages you choose to share");
    expect(info).toContain("photos and videos you choose");
    expect(info).not.toContain("NSUserTrackingUsageDescription");
    expect(info).not.toContain("NSPinnedDomains");
    expect(info).not.toContain("<key>stripe.com</key>");

    expect(privacy).toContain("NSPrivacyTracking");
    expect(privacy).toContain("<key>NSPrivacyTracking</key>\n\t<false/>");
    expect(privacy).toContain("<key>NSPrivacyTrackingDomains</key>\n\t<array/>");
    expect(privacy).not.toContain("NSPrivacyCollectedDataTypePurposeThirdPartyAdvertising");
    expect(capacitorPackage).not.toContain("AppTrackingTransparency");
    expect(privacy).toContain("NSPrivacyCollectedDataTypes");
    expect(privacy).toContain("NSPrivacyAccessedAPITypes");
    for (const dataType of [
      "NSPrivacyCollectedDataTypeEmailsOrTextMessages",
      "NSPrivacyCollectedDataTypePhotosorVideos",
      "NSPrivacyCollectedDataTypeAudioData",
      "NSPrivacyCollectedDataTypeOtherUserContent",
    ]) {
      expect(privacy).toContain(dataType);
    }

    expect(archiveRunner).toContain("validateIosNativeSourcePayload");
    expect(archiveRunner).toContain("validateIosArchive");
    expect(archiveRunner).toContain("validateIosIpa");
    expect(appStoreUpload).toContain(
      "app bundle root is missing PrivacyInfo.xcprivacy",
    );
    expect(appStoreUpload).toContain("CFBundleVersion mismatch");
    expect(appStoreUpload).toContain(
      'webPayloadFinding("app bundle public payload", webCheck)',
    );
    expect(appStoreUpload).toContain("does not match current dist");

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
    expect(build).toContain("versionCode 2026083001");
    expect(build).toContain('versionName "1.3.0"');
    expect(build).toContain("com.google.android.play:integrity");
    expect(build).toContain("keystore.properties");
    expect(build).toContain("google-services.json");

    expect(variables).toContain("minSdkVersion = 24");
    expect(variables).toContain("compileSdkVersion = 36");
    expect(variables).toContain("targetSdkVersion = 36");

    expect(listing).toContain("Package name: `com.hizovo.app`");
    expect(listing).toContain("Target SDK: 36 (Android 16)");
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

  it("fails mobile CI closed on stale native payloads and obsolete Apple toolchains", () => {
    const mobileCi = read(".github/workflows/mobile-ci.yml");
    const mobileBuild = read(".github/workflows/mobile-build.yml");
    const webSyncCheck = read("scripts/native/check-web-sync.mjs");
    const releaseSecretsGuide = read("scripts/native/release-secrets-guide.mjs");

    for (const workflow of [mobileCi, mobileBuild]) {
      expect(workflow).toContain("runs-on: macos-26");
      expect(workflow).not.toContain("runs-on: macos-14");
      expect(workflow).toContain("Require Xcode 26 and iOS 26 SDK");
      expect(workflow).toContain("xcodebuild -version");
      expect(workflow).toContain("xcrun --sdk iphoneos --show-sdk-version");
      expect(workflow).toContain('xcode_major" -lt 26');
      expect(workflow).toContain('ios_sdk_major" -lt 26');
      expect(workflow).toContain(
        "node scripts/native/check-web-sync.mjs --platform ios",
      );
      expect(workflow).toContain(
        "node scripts/native/check-web-sync.mjs --platform android",
      );
    }

    const ciAndroidSync = mobileCi.indexOf("npx cap sync android");
    const ciAndroidGradle = mobileCi.indexOf("./gradlew assembleDebug");
    expect(ciAndroidSync).toBeGreaterThan(-1);
    expect(ciAndroidGradle).toBeGreaterThan(ciAndroidSync);

    const releaseAndroidSync = mobileBuild.indexOf("npx cap sync android");
    const releaseAndroidGradle = mobileBuild.indexOf(
      "./gradlew bundleRelease packageReleaseUniversalApk",
    );
    expect(releaseAndroidSync).toBeGreaterThan(-1);
    expect(releaseAndroidGradle).toBeGreaterThan(releaseAndroidSync);
    expect(mobileBuild).toContain("npm run android:optimization:check");
    expect(mobileBuild).toContain("npm run android:installability:check");
    expect(mobileBuild).toContain("include-hidden-files: true");
    expect(mobileBuild).toContain("`dist/.well-known`");

    expect(mobileBuild).toContain(
      "IOS_NOTIFICATION_SERVICE_PROVISIONING_PROFILE_B64",
    );
    expect(mobileBuild).toContain(
      'install_profile "$APP_PROFILE_B64" "com.hizovo.app"',
    );
    expect(mobileBuild).toContain(
      'install_profile "$EXTENSION_PROFILE_B64" "com.hizovo.app.NotificationServiceExtension"',
    );
    expect(mobileBuild).toContain(
      "$HOME/Library/Developer/Xcode/UserData/Provisioning Profiles",
    );
    expect(mobileBuild).toContain("Entitlements:get-task-allow");
    expect(mobileBuild).toContain("ProvisionedDevices");
    expect(mobileBuild).toContain("ProvisionsAllDevices");
    expect(mobileBuild).toContain("Verify archived iOS payload and extension");
    expect(mobileBuild).toContain(
      "ZIVO_NATIVE_WEB_ROOT_IOS: ${{ runner.temp }}/App.xcarchive/Products/Applications/App.app/public",
    );
    expect(mobileBuild).toContain(
      'codesign --verify --strict "$extension_path"',
    );

    expect(webSyncCheck).toContain("compareWebPayloads");
    expect(webSyncCheck).toContain("ZIVO_NATIVE_WEB_ROOT_IOS");
    expect(webSyncCheck).toContain("cordova_plugins.js");
    expect(releaseSecretsGuide).toContain(
      "IOS_NOTIFICATION_SERVICE_PROVISIONING_PROFILE_PATH",
    );
    expect(releaseSecretsGuide).toContain(
      "IOS_NOTIFICATION_SERVICE_PROVISIONING_PROFILE_B64",
    );
  });
});
