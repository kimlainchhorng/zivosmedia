import assert from "node:assert/strict";
import test from "node:test";

import {
  parseAndroidReleaseIdentity,
  parseApkBadging,
  validateAndroidInstallabilityEvidence,
} from "./check-android-installability.mjs";

const expected = Object.freeze({
  packageName: "com.hizovo.app",
  versionCode: "2026083001",
  versionName: "1.3.0",
  minSdk: "24",
  targetSdk: "36",
  appLabel: "ZIVO",
  launchableActivity: "com.hizovo.app.MainActivity",
});

const badgingOutput = [
  "package: name='com.hizovo.app' versionCode='2026083001' versionName='1.3.0' compileSdkVersion='36'",
  "minSdkVersion:'24'",
  "targetSdkVersion:'36'",
  "application-label:'ZIVO'",
  "launchable-activity: name='com.hizovo.app.MainActivity' label='ZIVO' icon=''",
  "native-code: 'arm64-v8a' 'armeabi-v7a' 'x86' 'x86_64'",
].join("\n");

const signatureOutput = [
  "Verifies",
  "Verified using v1 scheme (JAR signing): false",
  "Verified using v2 scheme (APK Signature Scheme v2): true",
  "Verified using v3 scheme (APK Signature Scheme v3): true",
  "Number of signers: 1",
].join("\n");

function validEvidence(overrides = {}) {
  return {
    expected,
    badging: parseApkBadging(badgingOutput),
    aabBytes: 140 * 1024 * 1024,
    apkBytes: 141 * 1024 * 1024,
    aabMtimeMs: 1000,
    apkMtimeMs: 2000,
    aabPayloadHash: "same-payload",
    apkPayloadHash: "same-payload",
    webPayloadHash: "same-payload",
    apkEntries: [
      "AndroidManifest.xml",
      "classes.dex",
      "resources.arsc",
      "assets/public/index.html",
    ],
    signatureOutput,
    zipVerified: true,
    ...overrides,
  };
}

test("parses the Android release identity from Gradle sources", () => {
  assert.deepEqual(
    parseAndroidReleaseIdentity({
      buildGradle: `
        applicationId "com.hizovo.app"
        versionCode 2026083001
        versionName "1.3.0"
      `,
      variablesGradle: `
        minSdkVersion = 24
        targetSdkVersion = 36
      `,
    }),
    expected,
  );
});

test("parses package, launch, SDK, and native ABI evidence from aapt2", () => {
  assert.deepEqual(parseApkBadging(badgingOutput), {
    ...expected,
    nativeAbis: ["arm64-v8a", "armeabi-v7a", "x86", "x86_64"],
  });
});

test("accepts a signed universal APK generated from the current release AAB", () => {
  const result = validateAndroidInstallabilityEvidence(validEvidence());
  assert.equal(result.packageName, "com.hizovo.app");
  assert.equal(result.payloadHash, "same-payload");
});

test("rejects stale or payload-mismatched release artifacts", () => {
  assert.throws(
    () =>
      validateAndroidInstallabilityEvidence(
        validEvidence({
          aabMtimeMs: 5000,
          apkMtimeMs: 1000,
          apkPayloadHash: "different-payload",
          webPayloadHash: "current-payload",
        }),
      ),
    /older than the release AAB.*does not match the release AAB.*does not match current dist\/index\.html/,
  );
});

test("rejects package, version, SDK, label, or launch identity drift", () => {
  assert.throws(
    () =>
      validateAndroidInstallabilityEvidence(
        validEvidence({
          badging: {
            ...parseApkBadging(badgingOutput),
            packageName: "com.example.wrong",
            versionCode: "1",
            targetSdk: "35",
            appLabel: "Zivo",
            launchableActivity: "com.example.WrongActivity",
          },
        }),
      ),
    /packageName mismatch.*versionCode mismatch.*targetSdk mismatch.*appLabel mismatch.*launchableActivity mismatch/,
  );
});

test("rejects corrupt or incomplete APK archives", () => {
  assert.throws(
    () =>
      validateAndroidInstallabilityEvidence(
        validEvidence({
          apkEntries: ["AndroidManifest.xml", "classes.dex"],
          zipVerified: false,
        }),
      ),
    /missing resources\.arsc.*missing assets\/public\/index\.html.*ZIP integrity/,
  );
});

test("rejects unsigned APKs and native builds without arm64", () => {
  assert.throws(
    () =>
      validateAndroidInstallabilityEvidence(
        validEvidence({
          badging: {
            ...parseApkBadging(badgingOutput),
            nativeAbis: ["armeabi-v7a", "x86"],
          },
          signatureOutput: "DOES NOT VERIFY\nNumber of signers: 0",
        }),
      ),
    /no arm64-v8a.*signature verification.*signature scheme v2 or v3.*no verified signer/,
  );
});
