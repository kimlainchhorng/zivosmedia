#!/usr/bin/env node
/**
 * Native app release readiness contract check.
 *
 * Verifies Capacitor, iOS, Android, OTA, store listing, and native QA wiring
 * without requiring local Android/iOS toolchains to be installed.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function source(relativePath) {
  const file = path.join(root, relativePath);
  if (!existsSync(file)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  // Normalize CRLF -> LF so multiline assertions are line-ending agnostic
  // (Windows/OneDrive checkouts with core.autocrlf=true yield CRLF files).
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function requireContains(id, text, needle, relativePath) {
  if (!text.includes(needle)) {
    failures.push(`${id}: ${relativePath} missing ${JSON.stringify(needle)}`);
  }
}

function requireExactTrimmedLine(id, text, needle, relativePath) {
  const hasLine = text.split("\n").some((line) => line.trim() === needle);
  if (!hasLine) {
    failures.push(`${id}: ${relativePath} missing exact line ${JSON.stringify(needle)}`);
  }
}

function requireNotContains(id, text, needle, relativePath) {
  if (text.includes(needle)) {
    failures.push(`${id}: ${relativePath} must not contain ${JSON.stringify(needle)}`);
  }
}

function requireNoExactTrimmedLine(id, text, needle, relativePath) {
  const hasLine = text.split("\n").some((line) => line.trim() === needle);
  if (hasLine) {
    failures.push(`${id}: ${relativePath} must not contain exact line ${JSON.stringify(needle)}`);
  }
}

function requireFile(id, relativePath) {
  if (!existsSync(path.join(root, relativePath))) {
    failures.push(`${id}: missing file: ${relativePath}`);
  }
}

const contracts = [
  {
    id: "capacitor-production-shell",
    category: "capacitor",
    check() {
      const configPath = "capacitor.config.ts";
      const indexPath = "index.html";
      const packagePath = "package.json";
      const mainPath = "src/main.tsx";
      const config = source(configPath);
      const index = source(indexPath);
      const packageJson = source(packagePath);
      const main = source(mainPath);

      for (const needle of [
        "appId: 'com.hizovo.app'",
        "appName: 'ZIVO'",
        "webDir: 'dist'",
        "process.env.NODE_ENV !== 'production'",
        "CAPACITOR_DEV_SERVER_URL",
        "allowMixedContent: false",
        "overlaysWebView: true",
        "resize: \"native\"",
        "launchAutoHide: true",
        "launchShowDuration: 0",
      ]) {
        requireContains(this.id, config, needle, configPath);
      }
      requireNotContains(this.id, config, "http://localhost", configPath);
      for (const dep of ["@capacitor/core", "@capacitor/ios", "@capacitor/android", "@capgo/capacitor-updater"]) {
        requireContains(this.id, packageJson, dep, packagePath);
      }
      requireContains(this.id, main, "SplashScreen.hide", mainPath);
      requireContains(this.id, index, "<div data-zivo-boot-shell", indexPath);
      requireContains(this.id, index, '<div id="root"></div>', indexPath);
      requireContains(this.id, index, "កំពុងបើកកម្មវិធីរបស់អ្នក", indexPath);
      requireContains(this.id, index, 'aria-atomic="true"', indexPath);
      requireContains(this.id, main, "removeBootShellAfterFirstAppPaint(root)", mainPath);
      requireContains(this.id, main, "new MutationObserver", mainPath);
      requireContains(this.id, main, "root.childElementCount", mainPath);
      requireContains(this.id, main, "function finishBoot()", mainPath);
      requireContains(this.id, main, "NATIVE_BOOT_SHELL_HANDOFF_MS = 350", mainPath);
      requireContains(this.id, main, "window.setTimeout(removeBootShell, NATIVE_BOOT_SHELL_HANDOFF_MS)", mainPath);
      requireContains(this.id, main, "notifyNativeAppReady();", mainPath);
      requireContains(this.id, main, "onUncaughtError: paintBootError", mainPath);
      requireNotContains(this.id, main, "root.replaceChildren", mainPath);
    },
  },
  {
    id: "ios-store-privacy-entitlements",
    category: "ios",
    check() {
      const projectPath = "ios/App/App.xcodeproj/project.pbxproj";
      const infoPath = "ios/App/App/Info.plist";
      const privacyPath = "ios/App/App/PrivacyInfo.xcprivacy";
      const entitlementsPath = "ios/App/App/App.entitlements";
      const listingPath = "ios/store-listing/APP_STORE.md";
      const project = source(projectPath);
      const info = source(infoPath);
      const privacy = source(privacyPath);
      const entitlements = source(entitlementsPath);
      const listing = source(listingPath);

      for (const needle of [
        "PRODUCT_BUNDLE_IDENTIFIER = com.hizovo.app",
        "MARKETING_VERSION = 1.3.0",
        "CURRENT_PROJECT_VERSION",
      ]) {
        requireContains(this.id, project, needle, projectPath);
      }
      for (const needle of [
        "NSCameraUsageDescription",
        "NSMicrophoneUsageDescription",
        "NSLocationWhenInUseUsageDescription",
        "NSUserTrackingUsageDescription",
        "NSAppTransportSecurity",
        "NSPinnedDomains",
        "supabase.co",
        "stripe.com",
      ]) {
        requireContains(this.id, info, needle, infoPath);
      }
      for (const needle of [
        "NSPrivacyTracking",
        "NSPrivacyCollectedDataTypes",
        "NSPrivacyCollectedDataTypeEmailAddress",
        "NSPrivacyCollectedDataTypePurchaseHistory",
        "NSPrivacyAccessedAPITypes",
      ]) {
        requireContains(this.id, privacy, needle, privacyPath);
      }
      for (const needle of [
        "aps-environment",
        "com.apple.developer.applesignin",
        "com.apple.developer.associated-domains",
        "applinks:zivosmedia.com",
        "webcredentials:zivosmedia.com",
      ]) {
        requireContains(this.id, entitlements, needle, entitlementsPath);
      }
      for (const legacyDomain of ["hizovo.com", "www.hizovo.com"]) {
        requireNotContains(this.id, entitlements, `applinks:${legacyDomain}`, entitlementsPath);
        requireNotContains(this.id, entitlements, `webcredentials:${legacyDomain}`, entitlementsPath);
      }
      requireContains(this.id, listing, "Bundle ID: `com.hizovo.app`", listingPath);
      requireContains(this.id, listing, "Privacy URL:", listingPath);
      requireContains(this.id, listing, "https://zivosmedia.com/legal/privacy", listingPath);
      requireContains(this.id, listing, "https://zivosmedia.com/legal/terms", listingPath);
      requireContains(this.id, listing, "What's New in This Version", listingPath);
    },
  },
  {
    id: "android-store-build-readiness",
    category: "android",
    check() {
      const buildPath = "android/app/build.gradle";
      const variablesPath = "android/variables.gradle";
      const listingPath = "android/store-listing/PLAY_STORE.md";
      const setupPath = "docs/native-android-setup.md";
      const androidGitignorePath = "android/.gitignore";
      const localPropertiesExamplePath = "android/local.properties.example";
      const build = source(buildPath);
      const variables = source(variablesPath);
      const listing = source(listingPath);
      const setup = source(setupPath);
      const androidGitignore = source(androidGitignorePath);
      const localPropertiesExample = source(localPropertiesExamplePath);

      for (const needle of [
        'namespace = "com.hizovo.app"',
        'applicationId "com.hizovo.app"',
        "versionCode 2026082601",
        'versionName "1.3.0"',
        "com.google.android.play:integrity",
        "keystore.properties",
        "ZIVO_KEYSTORE_FILE",
        "ZIVO_KEYSTORE_PASSWORD",
        "ZIVO_KEY_ALIAS",
        "ZIVO_KEY_PASSWORD",
        "hasReleaseSigning",
        "signingConfig signingConfigs.release",
        "google-services.json",
      ]) {
        requireContains(this.id, build, needle, buildPath);
      }
      for (const needle of [
        "minSdkVersion = 24",
        "compileSdkVersion = 36",
        "targetSdkVersion = 36",
      ]) {
        requireContains(this.id, variables, needle, variablesPath);
      }
      requireContains(this.id, listing, "Package name: `com.hizovo.app`", listingPath);
      requireContains(this.id, listing, "Target SDK: 36 (Android 16)", listingPath);
      requireContains(this.id, listing, "Privacy Policy URL", listingPath);
      requireContains(this.id, listing, "Account Deletion URL", listingPath);
      requireContains(this.id, listing, "https://zivosmedia.com/legal/privacy", listingPath);
      requireContains(this.id, listing, "https://zivosmedia.com/legal/terms", listingPath);
      requireContains(this.id, listing, "https://zivosmedia.com/delete-account", listingPath);
      requireNotContains(this.id, listing, "https://www.zivollc.com", listingPath);
      requireContains(this.id, setup, "android/local.properties", setupPath);
      requireContains(this.id, setup, "android/local.properties.example", setupPath);
      requireContains(this.id, setup, "cp android/local.properties.example android/local.properties", setupPath);
      requireContains(this.id, androidGitignore, "Local configuration file (sdk path, etc)", androidGitignorePath);
      requireExactTrimmedLine(this.id, androidGitignore, "local.properties", androidGitignorePath);
      requireExactTrimmedLine(this.id, androidGitignore, "google-services.json", androidGitignorePath);
      requireNoExactTrimmedLine(this.id, androidGitignore, "local.properties.example", androidGitignorePath);
      requireContains(this.id, localPropertiesExample, "sdk.dir=/Users/kimlain/Library/Android/sdk", localPropertiesExamplePath);
      requireContains(this.id, localPropertiesExample, "android/local.properties", localPropertiesExamplePath);
      requireContains(this.id, setup, "npm run native:doctor -- --android-only", setupPath);
      requireContains(this.id, setup, "npm run android:build:debug", setupPath);
      requireContains(this.id, setup, "GOOGLE_SERVICES_JSON_BASE64", setupPath);
      requireContains(this.id, setup, "same Firebase project", setupPath);
      requireContains(this.id, setup, "com.hizovo.app", setupPath);
    },
  },
  {
    id: "native-permissions-deeplinks-push",
    category: "permissions",
    check() {
      const androidManifestPath = "android/app/src/main/AndroidManifest.xml";
      const androidNetworkPath = "android/app/src/main/res/xml/network_security_config.xml";
      const iosInfoPath = "ios/App/App/Info.plist";
      const iosEntitlementsPath = "ios/App/App/App.entitlements";
      const iosAppDelegatePath = "ios/App/App/AppDelegate.swift";
      const iosExtensionInfoPath = "ios/App/NotificationServiceExtension/Info.plist";
      const iosExtensionSwiftPath = "ios/App/NotificationServiceExtension/NotificationService.swift";
      const iosProjectPath = "ios/App/App.xcodeproj/project.pbxproj";
      const androidManifest = source(androidManifestPath);
      const androidNetwork = source(androidNetworkPath);
      const iosInfo = source(iosInfoPath);
      const iosEntitlements = source(iosEntitlementsPath);
      const iosAppDelegate = source(iosAppDelegatePath);
      const iosExtensionInfo = source(iosExtensionInfoPath);
      const iosExtensionSwift = source(iosExtensionSwiftPath);
      const iosProject = source(iosProjectPath);

      for (const permission of [
        "android.permission.INTERNET",
        "android.permission.POST_NOTIFICATIONS",
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
      ]) {
        requireContains(this.id, androidManifest, permission, androidManifestPath);
      }
      requireContains(
        this.id,
        androidManifest,
        '<uses-permission android:name="com.google.android.gms.permission.AD_ID" tools:node="remove" />',
        androidManifestPath,
      );
      requireNotContains(
        this.id,
        androidManifest,
        '<uses-permission android:name="com.google.android.gms.permission.AD_ID" />',
        androidManifestPath,
      );
      for (const needle of [
        '<uses-feature android:name="android.hardware.camera" android:required="false" />',
        '<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />',
        'android:allowBackup="false"',
        'android:fullBackupContent="false"',
        'android:dataExtractionRules="@xml/data_extraction_rules"',
        'android:usesCleartextTraffic="false"',
        'android:networkSecurityConfig="@xml/network_security_config"',
        'android:autoVerify="true"',
        'android:host="zivosmedia.com"',
        'android:host="www.zivosmedia.com"',
        'android:scheme="com.hizovo.app"',
      ]) {
        requireContains(this.id, androidManifest, needle, androidManifestPath);
      }
      for (const legacyDomain of ["hizovo.com", "www.hizovo.com"]) {
        requireNotContains(this.id, androidManifest, `android:host="${legacyDomain}"`, androidManifestPath);
      }
      requireContains(this.id, androidNetwork, 'cleartextTrafficPermitted="false"', androidNetworkPath);

      for (const needle of [
        "NSCameraUsageDescription",
        "NSMicrophoneUsageDescription",
        "NSLocationWhenInUseUsageDescription",
        "NSUserTrackingUsageDescription",
        "CFBundleURLSchemes",
        "com.hizovo.app",
        "UIBackgroundModes",
        "remote-notification",
      ]) {
        requireContains(this.id, iosInfo, needle, iosInfoPath);
      }
      for (const needle of [
        "applinks:zivosmedia.com",
        "applinks:www.zivosmedia.com",
        "webcredentials:zivosmedia.com",
        "com.apple.developer.usernotifications.communication",
      ]) {
        requireContains(this.id, iosEntitlements, needle, iosEntitlementsPath);
      }
      for (const legacyDomain of ["hizovo.com", "www.hizovo.com"]) {
        requireNotContains(this.id, iosEntitlements, `applinks:${legacyDomain}`, iosEntitlementsPath);
        requireNotContains(this.id, iosEntitlements, `webcredentials:${legacyDomain}`, iosEntitlementsPath);
      }
      for (const needle of [
        "UNUserNotificationCenter.current().delegate = self",
        ".capacitorDidRegisterForRemoteNotifications",
        ".capacitorDidFailToRegisterForRemoteNotifications",
        "ApplicationDelegateProxy.shared.application(app, open: url",
        "ApplicationDelegateProxy.shared.application(application, continue: userActivity",
      ]) {
        requireContains(this.id, iosAppDelegate, needle, iosAppDelegatePath);
      }
      for (const needle of [
        "NotificationServiceExtension.appex in Embed App Extensions",
        "PRODUCT_BUNDLE_IDENTIFIER = com.hizovo.app.NotificationServiceExtension",
        "NotificationService.swift in Sources",
      ]) {
        requireContains(this.id, iosProject, needle, iosProjectPath);
      }
      requireContains(this.id, iosExtensionInfo, "com.apple.usernotifications.service", iosExtensionInfoPath);
      requireContains(this.id, iosExtensionInfo, "$(PRODUCT_MODULE_NAME).NotificationService", iosExtensionInfoPath);
      requireContains(this.id, iosExtensionSwift, "INSendMessageIntent", iosExtensionSwiftPath);
      requireContains(this.id, iosExtensionSwift, "isAllowedImageURL", iosExtensionSwiftPath);
      requireContains(this.id, iosExtensionSwift, "serviceExtensionTimeWillExpire", iosExtensionSwiftPath);
    },
  },
  {
    id: "ota-update-safety",
    category: "ota",
    check() {
      const hookPath = "src/hooks/useOTAUpdate.ts";
      const docsPath = "docs/OTA_LIVE_UPDATES.md";
      const deployPath = "scripts/deploy-update.mjs";
      const packagePath = "package.json";
      const configPath = "capacitor.config.ts";
      const hook = source(hookPath);
      const docs = source(docsPath);
      const deploy = source(deployPath);
      const pkg = source(packagePath);
      const config = source(configPath);

      for (const needle of [
        "MANIFEST_URL",
        "latest.json",
        "MANIFEST_FETCH_TIMEOUT_MS",
        "new AbortController()",
        "fetchController.abort()",
        "signal: fetchController.signal",
        "window.clearTimeout(fetchTimeout)",
        "cache: \"no-store\"",
        "Accept: \"application/json\"",
        "headers.get(\"content-type\")",
        "includes(\"application/json\")",
        "isManifestRecord",
        "!Array.isArray",
        "manifestJson",
        "CHECK_INTERVAL_MS",
        "MIN_CHECK_GAP_MS",
        "MAX_BUNDLE_SIZE_BYTES",
        "MAX_MANIFEST_FUTURE_SKEW_MS",
        "MAX_MANIFEST_AGE_MS",
        "MAX_RELEASE_MESSAGE_LENGTH",
        "Capacitor.isNativePlatform()",
        "isValidSemver",
        "manifest.version",
        "isValidOptionalMessage",
        "message.trim() === message",
        "message.length > 0",
        "manifest.message",
        "isValidManifestTimestamp",
        "manifest.createdAt",
        "Date.parse(createdAt)",
        "Number.isFinite(timestamp)",
        "timestamp >= now - MAX_MANIFEST_AGE_MS",
        "isAllowedBundleUrl",
        "new URL(SUPABASE_URL)",
        "bundleUrl.protocol === \"https:\"",
        "bundleUrl.host === supabaseUrl.host",
        "bundleUrl.search === \"\"",
        "bundleUrl.hash === \"\"",
        "expectedPath",
        "decodeURIComponent(bundleUrl.pathname) === expectedPath",
        "isAllowedBundleUrl(manifest.url, manifest.version)",
        "decodeURIComponent",
        "zivo-v${version}.zip",
        "isValidSha256Checksum",
        "/^[a-f0-9]{64}$/i",
        "manifest.checksum",
        "isValidActivation",
        "manifest.activation",
        "activation === \"prompt\"",
        "activation === \"next_launch\"",
        "activation === \"immediate\"",
        "isValidBoolean",
        "typeof value === \"boolean\"",
        "isValidMandatoryActivation",
        "manifest.mandatory",
        "!mandatory || activation === \"next_launch\" || activation === \"immediate\"",
        "activation !== \"immediate\" || mandatory === true",
        "bundleSizeBytes",
        "isAllowedBundleSize",
        "Number.isFinite(bundleSizeBytes)",
        "manifest.bundleSizeBytes",
        "isValidOptionalSemver",
        "/^\\d+\\.\\d+\\.\\d+$/",
        "manifest.minNativeVersion",
        "minNativeVersion",
        "CapacitorUpdater.download",
        "newBundle.version !== manifest.version",
        "CapacitorUpdater.delete",
        "CapacitorUpdater.next",
        "CapacitorUpdater.set",
        "App.addListener(\"resume\"",
      ]) {
        requireContains(this.id, hook, needle, hookPath);
      }
      for (const needle of [
        "Do not use OTA updates for new native plugins",
        "SHA-256 checksum",
        "--min-native-version",
        "app-updates",
      ]) {
        requireContains(this.id, docs, needle, docsPath);
      }
      for (const needle of ["sha256", "latest.json", "contentType: \"application/zip\"", "cacheControl: \"31536000\"", "contentType: \"application/json\"", "cacheControl: \"0\"", "app-updates", "minNativeVersion", "bundleSizeBytes", "Bundle size:", "DEFAULT_MAX_BUNDLE_SIZE_BYTES", "ZIVO_OTA_MAX_BUNDLE_SIZE_BYTES", "readMaxBundleSizeBytes", "maxBundleSizeBytes", "ZIVO_ALLOW_LARGE_OTA_BUNDLE", "I_UNDERSTAND_THE_OTA_SIZE_RISK", "assertBundleSize", "assertValidManifestPayload", "assertValidManifestVersion", "Invalid OTA version value", "assertValidManifestUrl", "Invalid OTA dry-run URL value", "decodeURIComponent", "assertValidBundleSizeBytes", "Invalid OTA bundleSizeBytes value", "assertValidOptionalMinNativeVersion", "Invalid OTA minNativeVersion value", "assertValidOptionalMessage", "Invalid OTA message value", "assertAllowedBundleUrl", "new URL(SUPABASE_URL)", "bundleUrl.search !== \"\"", "bundleUrl.hash !== \"\"", "expectedObjectPath", "decodeURIComponent(bundleUrl.pathname) !== expectedObjectPath", "Unexpected OTA bundle URL", "/storage/v1/object/public/${BUCKET}/${zipName}", "assertValidActivation", "Invalid OTA activation value", "assertValidCreatedAt", "Invalid OTA manifest createdAt timestamp", "Date.parse(value)", "assertValidMandatory", "Invalid OTA mandatory value", "typeof value !== \"boolean\"", "assertValidActivationConsistency", "immediate updates must be mandatory", "assertValidChecksum", "Invalid OTA checksum value", "/^[a-f0-9]{64}$/i", "MAX_RELEASE_MESSAGE_LENGTH", "OTA release message must be", "prompt", "next_launch", "immediate", "parseSemver", "package.json version", "--min-native-version", "valid semver version like 1.2.3", "activationModeFlags", "Choose only one OTA activation mode flag", "--mandatory requires an explicit OTA activation mode", "releaseMessage", "immediate or mandatory OTA updates require", "dryRun", "Running local dry-run preflight", "--skip-build --skip-type-check", "--strict --skip-build", "Manifest preview", "dry-run://", "No package.json changes were written", "ZIVO_ALLOW_OTA_SKIP_PREFLIGHT", "I_UNDERSTAND_THE_RELEASE_RISK", "originalPackageJson", "uploadedBundle", "remove([zipName])", "local zip cleanup failed", "Restored package.json version bump"]) {
        requireContains(this.id, deploy, needle, deployPath);
      }
      for (const scriptName of ["deploy:update", "deploy:update:dry-run", "deploy:update:next", "deploy:update:immediate"]) {
        requireContains(this.id, pkg, `"${scriptName}": "npm run security:scan && node scripts/deploy-update.mjs`, packagePath);
      }
      requireContains(this.id, pkg, '"deploy:update:dry-run": "npm run security:scan && node scripts/deploy-update.mjs --dry-run"', packagePath);
      requireContains(this.id, config, "autoUpdate: false", configPath);
    },
  },
  {
    id: "native-release-gate-wiring",
    category: "wiring",
    check() {
      const packagePath = "package.json";
      const doctorPath = "scripts/native/doctor.mjs";
      const storeSigningPath = "scripts/native/store-signing-preflight.mjs";
      const releaseSecretsGuidePath = "scripts/native/release-secrets-guide.mjs";
      const pushSecretsPreflightPath = "scripts/native/push-secrets-preflight.mjs";
      const pushSecretsPreflightTestPath = "scripts/native/push-secrets-preflight.test.mjs";
      const appStoreUploadPath = "scripts/upload-to-app-store.mjs";
      const playUploadPath = "scripts/upload-to-play.mjs";
      const mobileWorkflowPath = ".github/workflows/mobile-build.yml";
      const mobileCiPath = ".github/workflows/mobile-ci.yml";
      const iosExportOptionsPath = "ios/App/ExportOptions.plist";
      const androidKeystoreTemplatePath = "android/keystore.properties.example";
      const matrixPath = "scripts/qa/platform-readiness-matrix.mjs";
      const coveragePath = "scripts/qa/workflow-coverage.mjs";
      const checkCoveragePath = "scripts/qa/check-workflow-coverage.mjs";
      const workflowPath = "src/test/workflows/native-app-release.test.ts";
      const storeListingUrlTestPath = "src/test/nativeStoreListingCanonicalUrls.test.ts";
      const packageJson = source(packagePath);
      const doctor = source(doctorPath);
      const storeSigning = source(storeSigningPath);
      const releaseSecretsGuide = source(releaseSecretsGuidePath);
      const pushSecretsPreflight = source(pushSecretsPreflightPath);
      const pushSecretsPreflightTest = source(pushSecretsPreflightTestPath);
      const appStoreUpload = source(appStoreUploadPath);
      const playUpload = source(playUploadPath);
      const mobileWorkflow = source(mobileWorkflowPath);
      const mobileCi = source(mobileCiPath);
      const iosExportOptions = source(iosExportOptionsPath);
      const androidKeystoreTemplate = source(androidKeystoreTemplatePath);
      const matrix = source(matrixPath);
      const coverage = source(coveragePath);
      const checkCoverage = source(checkCoveragePath);
      const workflow = source(workflowPath);
      const storeListingUrlTest = source(storeListingUrlTestPath);

      for (const scriptName of [
        "qa:native-app-contracts",
        "qa:platform-readiness:check",
        "qa:workflow-coverage:check",
        "qa:workflow-test-plan:check",
        "native:doctor",
        "native:store-signing:preflight",
        "native:release-secrets:guide",
        "native:push-secrets:preflight",
        "native:push-secrets:test",
        "native:sync",
        "ios:build:sim",
        "ios:upload:app-store",
        "android:build:debug",
        "android:upload:play:draft",
      ]) {
        requireContains(this.id, packageJson, `"${scriptName}"`, packagePath);
      }
      requireContains(this.id, packageJson, "npm run qa:native-app-contracts", packagePath);
      requireContains(this.id, packageJson, '"platform:audit": "npm run security:scan && npm run qa:platform-readiness', packagePath);
      requireContains(this.id, packageJson, '"ios:build:sim": "npm run native:doctor -- --ios-only && xcodebuild -project ios/App/App.xcodeproj -scheme App -configuration Debug -destination', packagePath);
      requireContains(this.id, packageJson, '"android:build:debug": "npm run native:doctor -- --android-only && node scripts/native/run-android-gradle.mjs assembleDebug"', packagePath);
      requireContains(this.id, packageJson, '"android:build:release": "npm run native:doctor -- --android-only && node scripts/native/run-android-gradle.mjs bundleRelease"', packagePath);
      requireContains(this.id, packageJson, '"native:store-signing:preflight": "node scripts/native/store-signing-preflight.mjs"', packagePath);
      requireContains(this.id, packageJson, '"native:release-secrets:guide": "node scripts/native/release-secrets-guide.mjs"', packagePath);
      requireContains(this.id, packageJson, '"native:push-secrets:preflight": "node scripts/native/push-secrets-preflight.mjs"', packagePath);
      requireContains(this.id, packageJson, '"native:push-secrets:test": "node --test scripts/native/push-secrets-preflight.test.mjs"', packagePath);
      requireContains(this.id, packageJson, '"ios:upload:app-store": "node scripts/upload-to-app-store.mjs"', packagePath);
      requireContains(this.id, packageJson, '"android:upload:play:draft": "node scripts/upload-to-play.mjs"', packagePath);
      requireContains(this.id, packageJson, "npm run qa:platform-readiness && npm run qa:platform-readiness:check", packagePath);
      requireContains(this.id, packageJson, "npm run qa:workflow-coverage && npm run qa:workflow-coverage:check", packagePath);
      requireContains(this.id, packageJson, "npm run qa:workflow-test-plan && npm run qa:workflow-test-plan:check", packagePath);
      for (const needle of [
        "Capacitor config found",
        "Android SDK configured",
        "Android platform-tools found",
        "Java 21 available for Android builds",
        "Android debug build preflights the SDK",
        "iOS simulator build preflights Xcode",
        "--ios-only",
        "const includeAndroid = !iosOnly",
        "const includeIos = !androidOnly",
        "Android versionName aligned",
        "iOS marketing version aligned",
        "iOS bundle id",
      ]) {
        requireContains(this.id, doctor, needle, doctorPath);
      }
      for (const needle of [
        'bundleId: "com.hizovo.app"',
        'teamId: "9KWY67J6LX"',
        "android/keystore.properties",
        "Android keystore template present",
        "isPlaceholder",
        "Android store password is not a placeholder",
        "Android key alias is not a placeholder",
        "Android key password is not a placeholder",
        "Android Firebase config present",
        "Android Firebase config parses as JSON",
        "Android Firebase project id present",
        "Android Firebase package matches app",
        "jarsigner",
        "Android release AAB is signed",
        "iOS App Store export options present",
        "Apple Distribution",
        "iPhone Distribution",
        "App Store provisioning profile installed",
        "process.exitCode = 1",
      ]) {
        requireContains(this.id, storeSigning, needle, storeSigningPath);
      }
      for (const needle of [
        "ZIVO_APP_STORE_UPLOAD_CONFIRM",
        "UPLOAD_APP",
        "APP_STORE_CONNECT_API_KEY_ID",
        "APP_STORE_CONNECT_API_ISSUER_ID",
        "APP_STORE_CONNECT_API_KEY_PATH",
        "APP_STORE_CONNECT_USERNAME",
        "APP_SPECIFIC_PASSWORD",
        "Missing App Store Connect upload credentials",
        "--upload-package",
        "does not submit for review",
        "process.exitCode = 1",
      ]) {
        requireContains(this.id, appStoreUpload, needle, appStoreUploadPath);
      }
      for (const needle of [
        "ZIVO_PLAY_UPLOAD_CONFIRM",
        "UPLOAD_DRAFT",
        "PLAY_CONSOLE_RELEASE_URL",
        "waitForEvent(\"filechooser\"",
        "This script intentionally does not click rollout",
        "process.exitCode = 1",
      ]) {
        requireContains(this.id, playUpload, needle, playUploadPath);
      }
      for (const needle of [
        'bundleId: "com.hizovo.app"',
        'teamId: "9KWY67J6LX"',
        "Safe GitHub secret commands",
        "do not print secret values",
        "gh secret set ANDROID_KEYSTORE_BASE64",
        "gh secret set GOOGLE_SERVICES_JSON_BASE64",
        "gh secret set VITE_VAPID_PUBLIC_KEY",
        "gh secret set IOS_P12_BASE64",
        "gh secret set IOS_PROVISIONING_PROFILE_B64",
        "Supabase Edge push delivery secrets",
        "FCM_SERVICE_ACCOUNT_JSON",
        "APNS_ENV=production",
        "VAPID_PRIVATE_KEY",
        "supabase secrets set --env-file .env.push.production.local",
        "npm run native:push-secrets:preflight",
        "npm run native:store-signing:preflight",
      ]) {
        requireContains(this.id, releaseSecretsGuide, needle, releaseSecretsGuidePath);
      }
      for (const needle of [
        'bundleId: "com.hizovo.app"',
        'teamId: "9KWY67J6LX"',
        ".env.push.production.local",
        "FCM_SERVICE_ACCOUNT_JSON",
        "APNS_ENV",
        "production",
        "VAPID_PUBLIC_KEY",
        "VITE_VAPID_PUBLIC_KEY",
        "No secret values were printed",
        "process.exitCode = 1",
      ]) {
        requireContains(this.id, pushSecretsPreflight, needle, pushSecretsPreflightPath);
      }
      for (const needle of [
        "customer push secret preflight accepts valid test-only shapes",
        "customer push secret preflight rejects production APNs mismatch",
        "customer push secret preflight rejects mismatched browser VAPID key",
        "TEST_KEY_FOR_PREFLIGHT_ONLY",
        "assert.doesNotMatch",
      ]) {
        requireContains(this.id, pushSecretsPreflightTest, needle, pushSecretsPreflightTestPath);
      }
      for (const needle of [
        "VITE_VAPID_PUBLIC_KEY",
        "Missing web VAPID public key",
        "Missing Android release signing secrets",
        "ANDROID_KEYSTORE_BASE64",
        "ANDROID_KEYSTORE_PASSWORD",
        "ANDROID_KEY_ALIAS",
        "ANDROID_KEY_PASSWORD",
        "GOOGLE_SERVICES_JSON_BASE64",
        "Install Android Firebase config",
        "Missing Android Firebase config",
        "android/app/google-services.json",
        "ORG_GRADLE_PROJECT_ZIVO_KEYSTORE_FILE",
        "java-version: \"21\"",
        "Missing iOS release signing secrets",
        "IOS_P12_BASE64",
        "IOS_P12_PASSWORD",
        "IOS_PROVISIONING_PROFILE_B64",
        "IOS_TEAM_ID",
        "-project App.xcodeproj",
        "CODE_SIGNING_ALLOWED=NO",
        "Export iOS IPA",
        "-exportArchive",
        "-exportOptionsPlist ExportOptions.plist",
        "$RUNNER_TEMP/ios-export",
      ]) {
        requireContains(this.id, mobileWorkflow, needle, mobileWorkflowPath);
      }
      for (const needle of [
        "<key>method</key>",
        "<string>app-store-connect</string>",
        "<key>teamID</key>",
        "<string>9KWY67J6LX</string>",
        "<key>signingStyle</key>",
        "<string>automatic</string>",
      ]) {
        requireContains(this.id, iosExportOptions, needle, iosExportOptionsPath);
      }
      for (const needle of [
        "storeFile=app/release.keystore",
        "storePassword=<owner-controlled password>",
        "keyAlias=<owner-controlled alias>",
        "keyPassword=<owner-controlled password>",
      ]) {
        requireContains(this.id, androidKeystoreTemplate, needle, androidKeystoreTemplatePath);
      }
      requireNotContains(this.id, mobileWorkflow, "App.xcworkspace", mobileWorkflowPath);
      requireNotContains(this.id, mobileWorkflow, "pod install", mobileWorkflowPath);
      requireContains(this.id, mobileCi, "Set up JDK 21", mobileCiPath);
      requireContains(this.id, mobileCi, "java-version: \"21\"", mobileCiPath);
      requireContains(this.id, matrix, "native-mobile-release", matrixPath);
      requireContains(this.id, matrix, "qa:native-app-contracts", matrixPath);
      requireContains(this.id, coverage, "native-mobile-release", coveragePath);
      requireContains(this.id, coverage, "qa:native-app-contracts", coveragePath);
      requireContains(this.id, checkCoverage, "native-mobile-release", checkCoveragePath);
      requireContains(this.id, workflow, "native app release workflow", workflowPath);
      requireContains(this.id, storeListingUrlTest, "native store listing canonical URLs", storeListingUrlTestPath);
    },
  },
  {
    id: "native-submission-command-alignment",
    category: "submission",
    check() {
      const packagePath = "package.json";
      const appStorePath = "ios/store-listing/APP_STORE.md";
      const playStorePath = "android/store-listing/PLAY_STORE.md";
      const doctorPath = "scripts/native/doctor.mjs";
      const matrixPath = "scripts/qa/platform-readiness-matrix.mjs";
      const testPath = "src/test/nativeSubmissionCommands.test.ts";
      const packageJson = source(packagePath);
      const appStore = source(appStorePath);
      const playStore = source(playStorePath);
      const doctor = source(doctorPath);
      const matrix = source(matrixPath);
      const test = source(testPath);

      for (const scriptName of [
        "native:sync",
        "ios:sync",
        "ios:build:sim",
        "ios:upload:app-store",
        "android:sync",
        "android:build:debug",
        "android:build:release",
        "android:upload:play:draft",
      ]) {
        requireContains(this.id, packageJson, `"${scriptName}"`, packagePath);
      }
      requireContains(this.id, appStore, "Open Xcode", appStorePath);
      requireContains(this.id, appStore, "Upload build via Xcode", appStorePath);
      requireContains(this.id, appStore, "App Store Connect", appStorePath);
      requireContains(this.id, playStore, "npm run android:sync", playStorePath);
      requireContains(this.id, playStore, "Generate Signed App Bundle", playStorePath);
      requireContains(this.id, playStore, "Play Console", playStorePath);
      requireContains(this.id, playStore, "upload `.aab`", playStorePath);
      requireNotContains(this.id, playStore, "bun run build", playStorePath);
      for (const command of ["npm run native:sync", "npm run ios:build:sim", "npm run android:build:debug"]) {
        requireContains(this.id, matrix, command, matrixPath);
      }
      requireContains(this.id, doctor, "Android Gradle wrapper found", doctorPath);
      requireContains(this.id, doctor, "Xcode available", doctorPath);
      requireContains(this.id, test, "native submission commands", testPath);
    },
  },
  {
    id: "native-store-release-assets",
    category: "assets",
    check() {
      const assetTestPath = "src/test/nativeStoreAssets.test.ts";
      const assetTest = source(assetTestPath);

      for (const relativePath of [
        "ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json",
        "ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-512@2x.png",
        "ios/App/App/Assets.xcassets/SplashV2.imageset/Contents.json",
        "ios/App/App/Assets.xcassets/SplashV2.imageset/zivo-splash.png",
        "ios/App/App/Assets.xcassets/SplashV2.imageset/zivo-splash@2x.png",
        "ios/App/App/Assets.xcassets/SplashV2.imageset/zivo-splash@3x.png",
        "android/store-listing/icon-512.png",
        "android/store-listing/feature-graphic.jpg",
        "android/store-listing/from-zip/zivo-icon-512.png",
      ]) {
        requireFile(this.id, relativePath);
      }

      for (const density of ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"]) {
        requireFile(this.id, `android/app/src/main/res/mipmap-${density}/ic_launcher.png`);
        requireFile(this.id, `android/app/src/main/res/mipmap-${density}/ic_launcher_round.png`);
        requireFile(this.id, `android/app/src/main/res/drawable-port-${density}/splash.png`);
        requireFile(this.id, `android/app/src/main/res/drawable-land-${density}/splash.png`);
      }

      requireContains(this.id, assetTest, "native store release assets", assetTestPath);
      requireContains(this.id, assetTest, "iosScreenshots.length", assetTestPath);
      requireContains(this.id, assetTest, "feature-graphic.jpg", assetTestPath);
    },
  },
  {
    id: "native-store-screenshot-specs",
    category: "assets",
    check() {
      const appStorePath = "ios/store-listing/APP_STORE.md";
      const playStorePath = "android/store-listing/PLAY_STORE.md";
      const testPath = "src/test/nativeStoreScreenshotSpecs.test.ts";
      const appStore = source(appStorePath);
      const playStore = source(playStorePath);
      const test = source(testPath);

      requireContains(this.id, appStore, "Screenshot Assets", appStorePath);
      requireContains(this.id, appStore, "at least 6 iPhone screenshots", appStorePath);
      requireContains(this.id, appStore, "ios/store-listing/sim-home-now.png", appStorePath);
      requireContains(this.id, appStore, "ios/store-listing/sim-profile-now.png", appStorePath);
      requireContains(this.id, playStore, "Phone screenshots:  min 2, max 8", playStorePath);
      requireContains(this.id, playStore, "Icon:               512", playStorePath);
      requireContains(this.id, playStore, "Feature graphic:    1024", playStorePath);
      requireContains(this.id, test, "native store screenshot specs", testPath);
      requireContains(this.id, test, "sharp", testPath);
      requireContains(this.id, test, "toBeGreaterThanOrEqual(6)", testPath);
    },
  },
  {
    id: "native-version-release-alignment",
    category: "versioning",
    check() {
      const packagePath = "package.json";
      const iosProjectPath = "ios/App/App.xcodeproj/project.pbxproj";
      const androidBuildPath = "android/app/build.gradle";
      const appStorePath = "ios/store-listing/APP_STORE.md";
      const playStorePath = "android/store-listing/PLAY_STORE.md";
      const testPath = "src/test/nativeVersionReleaseAlignment.test.ts";
      const packageJson = source(packagePath);
      const iosProject = source(iosProjectPath);
      const androidBuild = source(androidBuildPath);
      const appStore = source(appStorePath);
      const playStore = source(playStorePath);
      const test = source(testPath);

      requireContains(this.id, packageJson, '"version": "1.3.0"', packagePath);
      requireContains(this.id, iosProject, "MARKETING_VERSION = 1.3.0", iosProjectPath);
      requireContains(this.id, iosProject, "CURRENT_PROJECT_VERSION = 4", iosProjectPath);
      requireContains(this.id, androidBuild, 'versionName "1.3.0"', androidBuildPath);
      requireContains(this.id, androidBuild, "versionCode 2026082601", androidBuildPath);
      for (const listingPath of [appStorePath, playStorePath]) {
        const listing = listingPath === appStorePath ? appStore : playStore;
        requireContains(this.id, listing, "Release Metadata", listingPath);
        requireContains(this.id, listing, "Version: 1.3.0", listingPath);
      }
      requireContains(this.id, appStore, "Build: 4", appStorePath);
      requireContains(this.id, playStore, "Version code: 2026082601", playStorePath);
      requireContains(this.id, test, "native version release alignment", testPath);
      requireContains(this.id, test, "MARKETING_VERSION", testPath);
      requireContains(this.id, test, "versionCode", testPath);
    },
  },
  {
    id: "native-release-checklist",
    category: "release",
    check() {
      const checklistPath = "docs/native-release-checklist.md";
      const iosSetupPath = "docs/native-ios-setup.md";
      const matrixPath = "scripts/qa/platform-readiness-matrix.mjs";
      const testPath = "src/test/nativeReleaseChecklist.test.ts";
      const checklist = source(checklistPath);
      const iosSetup = source(iosSetupPath);
      const matrix = source(matrixPath);
      const test = source(testPath);

      for (const command of [
        "npm run qa:native-app-contracts",
        "npm run native:doctor",
        "npm run native:doctor -- --android-only",
        "npm run native:release-secrets:guide",
        "npm run native:push-secrets:preflight",
        "npm run native:sync",
        "npm run ios:sync",
        "npm run android:sync",
        "npm run ios:build:sim",
        "npm run ios:archive:store",
        "npm run ios:export:store",
        "npm run ios:upload:app-store",
        "npm run android:build:debug",
        "npm run android:build:release",
        "npm run android:upload:play:draft",
        "npm run native:store-signing:preflight",
        "npm run deploy:update:dry-run",
      ]) {
        requireContains(this.id, checklist, command, checklistPath);
      }
      for (const releaseValue of [
        "App version: 1.3.0",
        "iOS build: 4",
        "iOS bundle ID: com.hizovo.app",
        "Android versionCode: 2026082601",
        "Android package: com.hizovo.app",
      ]) {
        requireContains(this.id, checklist, releaseValue, checklistPath);
      }
      requireContains(this.id, checklist, "OTA updates must not add native plugins", checklistPath);
      requireContains(this.id, checklist, "local-only `android/local.properties` copied from", checklistPath);
      requireContains(this.id, checklist, "`android/local.properties.example`", checklistPath);
      requireContains(this.id, checklist, "must pass before claiming App Store or Google Play upload readiness", checklistPath);
      requireContains(this.id, checklist, "safe setup commands for the GitHub", checklistPath);
      requireContains(this.id, checklist, "APNS_ENV=production", checklistPath);
      requireContains(this.id, checklist, "VITE_VAPID_PUBLIC_KEY", checklistPath);
      requireContains(this.id, checklist, "native:push-secrets:preflight", checklistPath);
      requireContains(this.id, checklist, "ios/App/ExportOptions.plist", checklistPath);
      requireContains(this.id, checklist, "ZIVO_APP_STORE_UPLOAD_CONFIRM=UPLOAD_APP", checklistPath);
      requireContains(this.id, checklist, "ZIVO_PLAY_UPLOAD_CONFIRM=UPLOAD_DRAFT", checklistPath);
      requireContains(this.id, checklist, "does not submit the build for App Store review", checklistPath);
      requireContains(this.id, checklist, "does not start rollout or submit the release for", checklistPath);
      requireContains(this.id, matrix, "src/test/nativeReleaseChecklist.test.ts", matrixPath);
      requireContains(this.id, matrix, "src/test/nativeSafeAreaBridgeContracts.test.ts", matrixPath);
      requireContains(this.id, matrix, "src/test/otaDeployBypass.test.ts", matrixPath);
      requireContains(this.id, matrix, "simulator/debug builds green", matrixPath);
      requireContains(this.id, test, "native release checklist", testPath);
      for (const needle of [
        "npm run native:doctor -- --ios-only",
        "npm run ios:build:sim",
        "npm run native:store-signing:preflight",
        "npm run native:release-secrets:guide",
        "npm run native:push-secrets:preflight",
        "npm run ios:upload:app-store",
        "ZIVO_APP_STORE_UPLOAD_CONFIRM=UPLOAD_APP",
        "xcodebuild",
        "ios/App/App.xcodeproj",
        "IOS_P12_BASE64",
        "ios/App/ExportOptions.plist",
        "App Store Connect `.ipa`",
        "Apple Distribution",
        "APNS_ENV",
        "production",
        "Release workflow runs fail closed",
      ]) {
        requireContains(this.id, iosSetup, needle, iosSetupPath);
      }
    },
  },
];

for (const contract of contracts) contract.check();

console.log(JSON.stringify({
  generated: new Date().toISOString(),
  counts: {
    contracts: contracts.length,
    failures: failures.length,
  },
  contracts: contracts.map(({ id, category }) => ({ id, category })),
  failures,
}, null, 2));

if (failures.length > 0) {
  process.exitCode = 1;
}
