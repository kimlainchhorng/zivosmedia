#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);

export const ANDROID_INSTALLABILITY_PATHS = Object.freeze({
  buildGradle: "android/app/build.gradle",
  variablesGradle: "android/variables.gradle",
  localProperties: "android/local.properties",
  webIndex: "dist/index.html",
  aab: "android/app/build/outputs/bundle/release/app-release.aab",
  universalApk:
    "android/app/build/outputs/apk_from_bundle/release/app-release-universal.apk",
});

const EXPECTED_APP_LABEL = "Zivo Media - All in one";
const EXPECTED_LAUNCHABLE_ACTIVITY = "com.hizovo.app.MainActivity";
const SUPPORTED_UNIVERSAL_APK_TASK = "packageReleaseUniversalApk";
const MIN_ARTIFACT_BYTES = 1024 * 1024;
const REQUIRED_APK_ENTRIES = Object.freeze([
  "AndroidManifest.xml",
  "classes.dex",
  "resources.arsc",
  "assets/public/index.html",
]);

function requiredMatch(source, pattern, fieldName) {
  const value = String(source || "").match(pattern)?.[1];
  if (!value) {
    throw new Error(`could not read ${fieldName} from Android release config`);
  }
  return value;
}

export function parseAndroidReleaseIdentity({ buildGradle, variablesGradle }) {
  return {
    packageName: requiredMatch(
      buildGradle,
      /\bapplicationId\s+["']([^"']+)["']/,
      "applicationId",
    ),
    versionCode: requiredMatch(
      buildGradle,
      /\bversionCode\s+(\d+)/,
      "versionCode",
    ),
    versionName: requiredMatch(
      buildGradle,
      /\bversionName\s+["']([^"']+)["']/,
      "versionName",
    ),
    minSdk: requiredMatch(
      variablesGradle,
      /\bminSdkVersion\s*=\s*(\d+)/,
      "minSdkVersion",
    ),
    targetSdk: requiredMatch(
      variablesGradle,
      /\btargetSdkVersion\s*=\s*(\d+)/,
      "targetSdkVersion",
    ),
    appLabel: EXPECTED_APP_LABEL,
    launchableActivity: EXPECTED_LAUNCHABLE_ACTIVITY,
  };
}

export function parseApkBadging(output) {
  const text = String(output || "");
  const packageLine = text.match(/^package:\s+(.+)$/m)?.[1] || "";
  const attribute = (name) =>
    packageLine.match(new RegExp(`${name}='([^']*)'`))?.[1] || "";
  const lineValue = (name) =>
    text.match(new RegExp(`^${name}:'([^']*)'$`, "m"))?.[1] || "";
  const nativeCode = text.match(/^native-code:\s+(.+)$/m)?.[1] || "";

  return {
    packageName: attribute("name"),
    versionCode: attribute("versionCode"),
    versionName: attribute("versionName"),
    minSdk: lineValue("minSdkVersion"),
    targetSdk: lineValue("targetSdkVersion"),
    appLabel: lineValue("application-label"),
    launchableActivity:
      text.match(/^launchable-activity:\s+name='([^']+)'/m)?.[1] || "",
    nativeAbis: [...nativeCode.matchAll(/'([^']+)'/g)].map((match) => match[1]),
  };
}

export function validateAndroidInstallabilityEvidence(evidence) {
  const failures = [];
  const expected = evidence.expected || {};
  const badging = evidence.badging || {};
  const entries = new Set(evidence.apkEntries || []);

  if (
    !Number.isFinite(evidence.aabBytes) ||
    evidence.aabBytes < MIN_ARTIFACT_BYTES
  ) {
    failures.push("release AAB is missing or unexpectedly small");
  }
  if (
    !Number.isFinite(evidence.apkBytes) ||
    evidence.apkBytes < MIN_ARTIFACT_BYTES
  ) {
    failures.push("universal release APK is missing or unexpectedly small");
  }
  if (
    !Number.isFinite(evidence.aabMtimeMs) ||
    !Number.isFinite(evidence.apkMtimeMs) ||
    evidence.apkMtimeMs + 1000 < evidence.aabMtimeMs
  ) {
    failures.push("universal release APK is older than the release AAB");
  }
  if (
    !evidence.aabPayloadHash ||
    !evidence.apkPayloadHash ||
    evidence.aabPayloadHash !== evidence.apkPayloadHash
  ) {
    failures.push("universal APK web payload does not match the release AAB");
  }
  if (
    !evidence.webPayloadHash ||
    !evidence.aabPayloadHash ||
    evidence.webPayloadHash !== evidence.aabPayloadHash
  ) {
    failures.push(
      "release AAB web payload does not match current dist/index.html",
    );
  }

  for (const field of [
    "packageName",
    "versionCode",
    "versionName",
    "minSdk",
    "targetSdk",
    "appLabel",
    "launchableActivity",
  ]) {
    if (!expected[field] || badging[field] !== expected[field]) {
      failures.push(
        `${field} mismatch (expected ${JSON.stringify(expected[field] || "")}, got ${JSON.stringify(badging[field] || "")})`,
      );
    }
  }

  for (const entry of REQUIRED_APK_ENTRIES) {
    if (!entries.has(entry)) {
      failures.push(`universal APK is missing ${entry}`);
    }
  }
  if (
    badging.nativeAbis?.length > 0 &&
    !badging.nativeAbis.includes("arm64-v8a")
  ) {
    failures.push(
      "universal APK contains native code but no arm64-v8a libraries",
    );
  }
  if (!evidence.zipVerified) {
    failures.push("universal APK ZIP integrity check did not pass");
  }

  const signature = String(evidence.signatureOutput || "");
  if (!/^Verifies$/m.test(signature)) {
    failures.push("APK signature verification did not pass");
  }
  if (
    !/^Verified using v2 scheme .*:\s*true$/m.test(signature) &&
    !/^Verified using v3 scheme .*:\s*true$/m.test(signature)
  ) {
    failures.push("APK is not verified with signature scheme v2 or v3");
  }
  if (!/^Number of signers:\s*[1-9]\d*$/m.test(signature)) {
    failures.push("APK has no verified signer");
  }

  if (failures.length > 0) {
    throw new Error(
      `Android installability artifact check failed: ${failures.join("; ")}`,
    );
  }

  return {
    ...badging,
    aabBytes: evidence.aabBytes,
    apkBytes: evidence.apkBytes,
    payloadHash: evidence.apkPayloadHash,
  };
}

function readRequiredFile(rootDir, relativePath) {
  try {
    return readFileSync(path.join(rootDir, relativePath), "utf8");
  } catch (error) {
    throw new Error(
      `Android installability artifact check failed: ${relativePath} could not be read (${error.message})`,
    );
  }
}

function statRequiredFile(rootDir, relativePath) {
  try {
    return statSync(path.join(rootDir, relativePath));
  } catch (error) {
    throw new Error(
      `Android installability artifact check failed: ${relativePath} could not be read (${error.message})`,
    );
  }
}

function androidSdkRoot(rootDir) {
  for (const value of [
    process.env.ANDROID_SDK_ROOT,
    process.env.ANDROID_HOME,
  ]) {
    if (value && existsSync(value)) return value;
  }

  const localPropertiesPath = path.join(
    rootDir,
    ANDROID_INSTALLABILITY_PATHS.localProperties,
  );
  if (existsSync(localPropertiesPath)) {
    const sdkDir = readFileSync(localPropertiesPath, "utf8").match(
      /^sdk\.dir\s*=\s*(.+)$/m,
    )?.[1];
    if (sdkDir) {
      const decoded = sdkDir.trim().replace(/\\:/g, ":").replace(/\\\\/g, "\\");
      if (existsSync(decoded)) return decoded;
    }
  }

  throw new Error(
    "Android installability artifact check failed: Android SDK path is unavailable; set ANDROID_SDK_ROOT or configure android/local.properties",
  );
}

function latestBuildTool(sdkRoot, binaryName) {
  const buildToolsRoot = path.join(sdkRoot, "build-tools");
  const versions = readdirSync(buildToolsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) =>
      right.localeCompare(left, undefined, { numeric: true }),
    );

  for (const version of versions) {
    const candidate = path.join(buildToolsRoot, version, binaryName);
    if (existsSync(candidate)) return candidate;
  }
  throw new Error(
    `Android installability artifact check failed: ${binaryName} is missing from the Android SDK build-tools`,
  );
}

function runInspection(runCommand, command, args, rootDir, label) {
  try {
    return runCommand(command, args, {
      cwd: rootDir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 16 * 1024 * 1024,
    });
  } catch (error) {
    const detail = String(error.stderr || error.message || error).trim();
    throw new Error(
      `Android installability artifact check failed: ${label}${detail ? ` (${detail})` : ""}`,
    );
  }
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function formatMiB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

export function checkAndroidInstallability({
  rootDir = process.cwd(),
  runCommand = execFileSync,
} = {}) {
  const paths = ANDROID_INSTALLABILITY_PATHS;
  const expected = parseAndroidReleaseIdentity({
    buildGradle: readRequiredFile(rootDir, paths.buildGradle),
    variablesGradle: readRequiredFile(rootDir, paths.variablesGradle),
  });
  const aabStat = statRequiredFile(rootDir, paths.aab);
  const apkStat = statRequiredFile(rootDir, paths.universalApk);
  const webIndex = readRequiredFile(rootDir, paths.webIndex);
  const aabPath = path.join(rootDir, paths.aab);
  const apkPath = path.join(rootDir, paths.universalApk);
  const sdkRoot = androidSdkRoot(rootDir);
  const aapt2 = latestBuildTool(sdkRoot, "aapt2");
  const apksigner = latestBuildTool(sdkRoot, "apksigner");

  const badgingOutput = runInspection(
    runCommand,
    aapt2,
    ["dump", "badging", apkPath],
    rootDir,
    "could not inspect universal APK manifest",
  );
  const signatureOutput = runInspection(
    runCommand,
    apksigner,
    ["verify", "--verbose", "--print-certs", apkPath],
    rootDir,
    "universal APK signature verification failed",
  );
  runInspection(
    runCommand,
    "unzip",
    ["-tqq", apkPath],
    rootDir,
    "universal APK ZIP integrity verification failed",
  );
  const apkEntries = runInspection(
    runCommand,
    "unzip",
    ["-Z1", apkPath],
    rootDir,
    "could not list universal APK entries",
  )
    .split(/\r?\n/)
    .filter(Boolean);
  const aabIndex = runInspection(
    runCommand,
    "unzip",
    ["-p", aabPath, "base/assets/public/index.html"],
    rootDir,
    "could not read the release AAB web entrypoint",
  );
  const apkIndex = runInspection(
    runCommand,
    "unzip",
    ["-p", apkPath, "assets/public/index.html"],
    rootDir,
    "could not read the universal APK web entrypoint",
  );

  const result = validateAndroidInstallabilityEvidence({
    expected,
    badging: parseApkBadging(badgingOutput),
    aabBytes: aabStat.size,
    apkBytes: apkStat.size,
    aabMtimeMs: aabStat.mtimeMs,
    apkMtimeMs: apkStat.mtimeMs,
    aabPayloadHash: sha256(aabIndex),
    apkPayloadHash: sha256(apkIndex),
    webPayloadHash: sha256(webIndex),
    apkEntries,
    signatureOutput,
    zipVerified: true,
  });

  console.log("Android release installability artifact verified:");
  console.log(
    `✓ ${result.appLabel} ${result.versionName} (${result.versionCode}), ${result.packageName}`,
  );
  console.log(
    `✓ SDK ${result.minSdk}-${result.targetSdk}; launch activity ${result.launchableActivity}.`,
  );
  console.log(`✓ Release AAB: ${formatMiB(result.aabBytes)}`);
  console.log(`✓ Signed universal APK: ${formatMiB(result.apkBytes)}`);
  console.log(
    `✓ Generated by the supported ${SUPPORTED_UNIVERSAL_APK_TASK} release task.`,
  );
  console.log(
    `✓ Current dist, AAB, and universal APK contain the same web entrypoint (${result.payloadHash.slice(0, 12)}…).`,
  );
  console.log(
    `✓ APK archive, signature, launch metadata, required files, and native ABI coverage passed.`,
  );
  console.log(
    "No device was changed. Install and launch this exact release through a Play test track on a real supported device before submission.",
  );

  return result;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === scriptPath) {
  try {
    checkAndroidInstallability();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
