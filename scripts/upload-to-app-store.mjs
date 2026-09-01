#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkNativeWebSync } from "./native/check-web-sync.mjs";

const scriptPath = fileURLToPath(import.meta.url);
export const DEFAULT_REPO_ROOT = path.resolve(path.dirname(scriptPath), "..");
export const EXPECTED_IOS_BUNDLE_IDENTIFIER = "com.hizovo.app";
export const IOS_RELEASE_PATHS = Object.freeze({
  project: "ios/App/App.xcodeproj/project.pbxproj",
  privacyManifest: "ios/App/App/PrivacyInfo.xcprivacy",
  nativePublic: "ios/App/App/public",
  ipa: "ios/build/export/zivosmedia/App.ipa",
  distributionSummary:
    "ios/build/export/zivosmedia/DistributionSummary.plist",
});
export const REQUIRED_USER_CONTENT_DATA_TYPES = Object.freeze([
  "NSPrivacyCollectedDataTypeEmailsOrTextMessages",
  "NSPrivacyCollectedDataTypePhotosorVideos",
  "NSPrivacyCollectedDataTypeAudioData",
  "NSPrivacyCollectedDataTypeOtherUserContent",
]);

function commandDetail(result) {
  return [result?.stderr, result?.stdout]
    .filter((value) => typeof value === "string" && value.trim())
    .map((value) => value.trim())
    .join("\n");
}

function runCheckedCommand(
  command,
  args,
  { spawn = spawnSync, label = path.basename(command), ...options } = {},
) {
  const result = spawn(command, args, options);
  if (result?.error) {
    throw new Error(`${label} could not start: ${result.error.message}`);
  }
  if (result?.status !== 0) {
    const detail = commandDetail(result);
    throw new Error(`${label} failed${detail ? `:\n${detail}` : "."}`);
  }
  return result;
}

function requiredFile(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`${label} is missing: ${filePath}`);
  }
  const fileInfo = lstatSync(filePath);
  if (!fileInfo.isFile() || fileInfo.isSymbolicLink()) {
    throw new Error(`${label} must be a regular non-symlink file: ${filePath}`);
  }
  return filePath;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return value.map(canonicalJson);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort((left, right) => left.localeCompare(right))
        .map((key) => [key, canonicalJson(value[key])]),
    );
  }
  return value;
}

function privacyManifestFingerprint(manifest) {
  return createHash("sha256")
    .update(JSON.stringify(canonicalJson(manifest)))
    .digest("hex");
}

function readPlistJson(plistPath, { spawn = spawnSync, label } = {}) {
  requiredFile(plistPath, label || "Property list");
  const result = runCheckedCommand(
    "/usr/bin/plutil",
    ["-convert", "json", "-o", "-", plistPath],
    {
      spawn,
      label: label ? `${label} validation` : "Property-list validation",
      encoding: "utf8",
    },
  );

  try {
    return JSON.parse(result.stdout);
  } catch (error) {
    throw new Error(
      `${label || "Property list"} could not be decoded as JSON: ${error.message}`,
    );
  }
}

function parsePbxObjects(projectSource) {
  const objects = [];
  const expression =
    /^\t\t([A-F0-9]{24})(?: \/\* (.*?) \*\/)? = \{\n([\s\S]*?)^\t\t\};$/gm;
  for (const match of projectSource.matchAll(expression)) {
    objects.push({ id: match[1], name: match[2] || "", body: match[3] });
  }
  return objects;
}

function requiredPbxObject(objects, id, label) {
  const object = objects.find((candidate) => candidate.id === id);
  if (!object) throw new Error(`Xcode project is missing ${label}.`);
  return object;
}

function appTargetObject(projectSource) {
  const target = parsePbxObjects(projectSource).find(
    (object) =>
      object.name === "App" && /^\s*isa = PBXNativeTarget;$/m.test(object.body),
  );
  if (!target) throw new Error("Xcode project is missing the App native target.");
  return target;
}

function unquoteBuildSetting(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function requiredBuildSetting(buildConfiguration, key) {
  const value = buildConfiguration.body.match(
    new RegExp(`^\\s*${key}\\s*=\\s*([^;\\n]+);$`, "m"),
  )?.[1];
  if (!value) throw new Error(`App Release configuration is missing ${key}.`);
  return unquoteBuildSetting(value);
}

export function parseIosProjectIdentity(projectSource) {
  const objects = parsePbxObjects(projectSource);
  const target = appTargetObject(projectSource);
  const configurationListId = target.body.match(
    /buildConfigurationList = ([A-F0-9]{24})/,
  )?.[1];
  if (!configurationListId) {
    throw new Error("App target is missing its build-configuration list.");
  }

  const configurationList = requiredPbxObject(
    objects,
    configurationListId,
    "App build-configuration list",
  );
  const releaseConfigurationId = configurationList.body.match(
    /([A-F0-9]{24}) \/\* Release \*\//,
  )?.[1];
  if (!releaseConfigurationId) {
    throw new Error("App target is missing its Release build configuration.");
  }

  const releaseConfiguration = requiredPbxObject(
    objects,
    releaseConfigurationId,
    "App Release build configuration",
  );
  return {
    bundleIdentifier: requiredBuildSetting(
      releaseConfiguration,
      "PRODUCT_BUNDLE_IDENTIFIER",
    ),
    marketingVersion: requiredBuildSetting(
      releaseConfiguration,
      "MARKETING_VERSION",
    ),
    buildNumber: requiredBuildSetting(
      releaseConfiguration,
      "CURRENT_PROJECT_VERSION",
    ),
  };
}

export function assertIosPrivacyManifestProjectWiring(projectSource) {
  const fileReferences = [
    ...projectSource.matchAll(
      /^\t\t([A-F0-9]{24}) \/\* PrivacyInfo\.xcprivacy \*\/ = \{isa = PBXFileReference;[^\n]*path = PrivacyInfo\.xcprivacy;[^\n]*\};$/gm,
    ),
  ];
  if (fileReferences.length !== 1) {
    throw new Error(
      `Xcode project must contain exactly one PrivacyInfo.xcprivacy file reference; found ${fileReferences.length}.`,
    );
  }
  const fileReferenceId = fileReferences[0][1];

  const resourceBuildFiles = [
    ...projectSource.matchAll(
      /^\t\t([A-F0-9]{24}) \/\* PrivacyInfo\.xcprivacy in Resources \*\/ = \{isa = PBXBuildFile; fileRef = ([A-F0-9]{24}) \/\* PrivacyInfo\.xcprivacy \*\/; \};$/gm,
    ),
  ];
  if (
    resourceBuildFiles.length !== 1 ||
    resourceBuildFiles[0][2] !== fileReferenceId
  ) {
    throw new Error(
      "Xcode project must contain one PrivacyInfo.xcprivacy Resources build-file entry pointing to the app manifest.",
    );
  }
  const resourceBuildFileId = resourceBuildFiles[0][1];

  const objects = parsePbxObjects(projectSource);
  const appGroup = objects.find(
    (object) =>
      object.name === "App" &&
      /^\s*isa = PBXGroup;$/m.test(object.body) &&
      /^\s*path = App;$/m.test(object.body),
  );
  if (!appGroup?.body.includes(`${fileReferenceId} /* PrivacyInfo.xcprivacy */`)) {
    throw new Error(
      "PrivacyInfo.xcprivacy must be a member of the App project group.",
    );
  }

  const appTarget = appTargetObject(projectSource);
  const resourcesPhaseId = appTarget.body.match(
    /([A-F0-9]{24}) \/\* Resources \*\//,
  )?.[1];
  if (!resourcesPhaseId) {
    throw new Error("App target is missing its Resources build phase.");
  }
  const resourcesPhase = requiredPbxObject(
    objects,
    resourcesPhaseId,
    "App Resources build phase",
  );
  if (
    !resourcesPhase.body.includes(
      `${resourceBuildFileId} /* PrivacyInfo.xcprivacy in Resources */`,
    )
  ) {
    throw new Error(
      "PrivacyInfo.xcprivacy must be included in the App target Resources build phase.",
    );
  }

  return { fileReferenceId, resourceBuildFileId, resourcesPhaseId };
}

export function collectPrivacyManifestFindings(manifest) {
  const findings = [];
  if (manifest?.NSPrivacyTracking !== false) {
    findings.push("NSPrivacyTracking must be false");
  }
  if (
    !Array.isArray(manifest?.NSPrivacyTrackingDomains) ||
    manifest.NSPrivacyTrackingDomains.length !== 0
  ) {
    findings.push("NSPrivacyTrackingDomains must be an empty array");
  }

  const collectedData = Array.isArray(manifest?.NSPrivacyCollectedDataTypes)
    ? manifest.NSPrivacyCollectedDataTypes
    : [];
  if (!Array.isArray(manifest?.NSPrivacyCollectedDataTypes)) {
    findings.push("NSPrivacyCollectedDataTypes must be an array");
  }

  const entriesByType = new Map();
  for (const entry of collectedData) {
    const type = entry?.NSPrivacyCollectedDataType;
    if (typeof type !== "string" || !type) continue;
    if (entriesByType.has(type)) findings.push(`${type} is declared more than once`);
    entriesByType.set(type, entry);
    if (entry.NSPrivacyCollectedDataTypeTracking !== false) {
      findings.push(`${type} must not be declared for tracking`);
    }
    if (
      entry.NSPrivacyCollectedDataTypePurposes?.includes(
        "NSPrivacyCollectedDataTypePurposeThirdPartyAdvertising",
      )
    ) {
      findings.push(`${type} must not declare third-party advertising`);
    }
  }

  for (const type of REQUIRED_USER_CONTENT_DATA_TYPES) {
    const entry = entriesByType.get(type);
    if (!entry) {
      findings.push(`${type} is missing`);
      continue;
    }
    if (entry.NSPrivacyCollectedDataTypeLinked !== true) {
      findings.push(`${type} must be linked to the signed-in account`);
    }
    if (
      !entry.NSPrivacyCollectedDataTypePurposes?.includes(
        "NSPrivacyCollectedDataTypePurposeAppFunctionality",
      )
    ) {
      findings.push(`${type} must declare app functionality`);
    }
  }

  return findings;
}

function assertPrivacyManifest(manifest, label) {
  const findings = collectPrivacyManifestFindings(manifest);
  if (findings.length > 0) {
    throw new Error(
      `${label} is not release-ready:\n  - ${findings.join("\n  - ")}`,
    );
  }
}

export function inspectIosSourceRelease({
  repoRoot = DEFAULT_REPO_ROOT,
  spawn = spawnSync,
} = {}) {
  const projectPath = path.join(repoRoot, IOS_RELEASE_PATHS.project);
  const privacyManifestPath = path.join(
    repoRoot,
    IOS_RELEASE_PATHS.privacyManifest,
  );
  const projectSource = readFileSync(
    requiredFile(projectPath, "Xcode project file"),
    "utf8",
  );
  const identity = parseIosProjectIdentity(projectSource);
  if (identity.bundleIdentifier !== EXPECTED_IOS_BUNDLE_IDENTIFIER) {
    throw new Error(
      `App Release PRODUCT_BUNDLE_IDENTIFIER must be ${EXPECTED_IOS_BUNDLE_IDENTIFIER}; found ${identity.bundleIdentifier}.`,
    );
  }
  assertIosPrivacyManifestProjectWiring(projectSource);

  const privacyManifest = readPlistJson(privacyManifestPath, {
    spawn,
    label: "Source PrivacyInfo.xcprivacy",
  });
  assertPrivacyManifest(privacyManifest, "Source PrivacyInfo.xcprivacy");

  return {
    identity,
    privacyManifest,
    privacyManifestPath,
    privacyManifestFingerprint: privacyManifestFingerprint(privacyManifest),
  };
}

function webPayloadFinding(label, check) {
  if (check?.error) return `${label} could not be read: ${check.error}`;
  if (check?.inSync) return "";
  return (
    `${label} does not match current dist ` +
    `(missing ${check?.missingFromNative?.length || 0}, ` +
    `unexpected ${check?.unexpectedInNative?.length || 0}, ` +
    `changed ${check?.changed?.length || 0})`
  );
}

async function inspectWebPayload({ repoRoot, nativeRoot }) {
  const [check] = await checkNativeWebSync({
    repoRoot,
    platforms: ["ios"],
    nativeRoots: { ios: nativeRoot },
  });
  return check;
}

export async function validateIosNativeSourcePayload({
  repoRoot = DEFAULT_REPO_ROOT,
} = {}) {
  const nativeRoot = path.join(repoRoot, IOS_RELEASE_PATHS.nativePublic);
  const check = await inspectWebPayload({ repoRoot, nativeRoot });
  const finding = webPayloadFinding("iOS native public payload", check);
  if (finding) {
    throw new Error(
      `iOS archive preflight failed: ${finding}. Run npm run ios:sync before archiving.`,
    );
  }
  return check;
}

export function collectIosReleaseCandidateFindings({
  expectedIdentity,
  appIdentity,
  manifestPresent,
  manifestMatchesSource,
  privacyManifest,
  webCheck,
}) {
  const findings = [];
  if (appIdentity?.bundleIdentifier !== expectedIdentity.bundleIdentifier) {
    findings.push(
      `CFBundleIdentifier mismatch (expected ${expectedIdentity.bundleIdentifier}, got ${appIdentity?.bundleIdentifier || "missing"})`,
    );
  }
  if (appIdentity?.marketingVersion !== expectedIdentity.marketingVersion) {
    findings.push(
      `CFBundleShortVersionString mismatch (expected ${expectedIdentity.marketingVersion}, got ${appIdentity?.marketingVersion || "missing"})`,
    );
  }
  if (appIdentity?.buildNumber !== expectedIdentity.buildNumber) {
    findings.push(
      `CFBundleVersion mismatch (expected ${expectedIdentity.buildNumber}, got ${appIdentity?.buildNumber || "missing"})`,
    );
  }
  if (!manifestPresent) {
    findings.push("app bundle root is missing PrivacyInfo.xcprivacy");
  } else {
    if (!manifestMatchesSource) {
      findings.push("app bundle PrivacyInfo.xcprivacy is stale or differs from source");
    }
    findings.push(
      ...collectPrivacyManifestFindings(privacyManifest).map(
        (finding) => `bundled PrivacyInfo.xcprivacy: ${finding}`,
      ),
    );
  }
  const webFinding = webPayloadFinding("app bundle public payload", webCheck);
  if (webFinding) findings.push(webFinding);
  return findings;
}

function singleAppBundle(parentDirectory, label) {
  let entries;
  try {
    entries = readdirSync(parentDirectory, { withFileTypes: true });
  } catch (error) {
    throw new Error(`${label} could not be read: ${error.message}`);
  }
  const appDirectories = entries
    .filter((entry) => entry.isDirectory() && entry.name.endsWith(".app"))
    .map((entry) => path.join(parentDirectory, entry.name))
    .filter((entryPath) => !lstatSync(entryPath).isSymbolicLink())
    .sort((left, right) => left.localeCompare(right));
  if (appDirectories.length !== 1) {
    throw new Error(
      `${label} must contain exactly one regular top-level .app bundle; found ${appDirectories.length}.`,
    );
  }
  return appDirectories[0];
}

async function validateIosAppBundle({
  repoRoot,
  appPath,
  label,
  spawn = spawnSync,
}) {
  const source = inspectIosSourceRelease({ repoRoot, spawn });
  const infoPlistPath = path.join(appPath, "Info.plist");
  const privacyManifestPath = path.join(appPath, "PrivacyInfo.xcprivacy");
  const appInfo = readPlistJson(infoPlistPath, {
    spawn,
    label: `${label} Info.plist`,
  });
  const appIdentity = {
    bundleIdentifier: appInfo.CFBundleIdentifier,
    marketingVersion: appInfo.CFBundleShortVersionString,
    buildNumber: appInfo.CFBundleVersion,
  };
  const manifestPresent = existsSync(privacyManifestPath);
  const privacyManifest = manifestPresent
    ? readPlistJson(privacyManifestPath, {
        spawn,
        label: `${label} PrivacyInfo.xcprivacy`,
      })
    : null;
  const webCheck = await inspectWebPayload({
    repoRoot,
    nativeRoot: path.join(appPath, "public"),
  });
  const findings = collectIosReleaseCandidateFindings({
    expectedIdentity: source.identity,
    appIdentity,
    manifestPresent,
    manifestMatchesSource:
      manifestPresent &&
      privacyManifestFingerprint(privacyManifest) ===
        source.privacyManifestFingerprint,
    privacyManifest,
    webCheck,
  });
  if (findings.length > 0) {
    throw new Error(
      `${label} validation failed:\n  - ${findings.join("\n  - ")}`,
    );
  }

  return {
    appPath,
    identity: appIdentity,
    privacyManifestPath,
    webFileCount: webCheck.sourceFileCount,
  };
}

export async function validateIosArchive({
  repoRoot = DEFAULT_REPO_ROOT,
  archivePath,
  spawn = spawnSync,
} = {}) {
  const applicationsDirectory = path.join(
    archivePath,
    "Products",
    "Applications",
  );
  const appPath = singleAppBundle(
    applicationsDirectory,
    "iOS archive Products/Applications",
  );
  return validateIosAppBundle({
    repoRoot,
    appPath,
    label: "iOS archive app",
    spawn,
  });
}

function validateArchiveEntryNames(entries) {
  for (const entry of entries) {
    const normalized = entry.replaceAll("\\", "/");
    if (normalized.startsWith("/") || normalized.split("/").includes("..")) {
      throw new Error("IPA contains an unsafe archive path.");
    }
  }
}

export async function validateIosIpa({
  repoRoot = DEFAULT_REPO_ROOT,
  ipaPath,
  spawn = spawnSync,
  temporaryRoot = os.tmpdir(),
} = {}) {
  const resolvedIpaPath =
    ipaPath || path.join(repoRoot, IOS_RELEASE_PATHS.ipa);
  requiredFile(resolvedIpaPath, "App Store IPA");
  runCheckedCommand("/usr/bin/unzip", ["-tq", resolvedIpaPath], {
    spawn,
    label: "IPA ZIP integrity check",
    encoding: "utf8",
  });
  const listing = runCheckedCommand(
    "/usr/bin/unzip",
    ["-Z1", resolvedIpaPath],
    {
      spawn,
      label: "IPA archive listing",
      encoding: "utf8",
    },
  );
  validateArchiveEntryNames(
    listing.stdout.split(/\r?\n/).filter((entry) => entry.length > 0),
  );

  const temporaryDirectory = mkdtempSync(
    path.join(temporaryRoot, "zivo-ios-release-"),
  );
  try {
    runCheckedCommand(
      "/usr/bin/unzip",
      ["-qq", resolvedIpaPath, "-d", temporaryDirectory],
      { spawn, label: "IPA extraction", encoding: "utf8" },
    );
    const appPath = singleAppBundle(
      path.join(temporaryDirectory, "Payload"),
      "IPA Payload",
    );
    const validation = await validateIosAppBundle({
      repoRoot,
      appPath,
      label: "App Store IPA app",
      spawn,
    });
    return { ...validation, ipaPath: resolvedIpaPath };
  } finally {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
}

function readOptionalPlistJson(plistPath) {
  if (!existsSync(plistPath)) return null;
  return readPlistJson(plistPath, { label: "DistributionSummary.plist" });
}

function getExportedAppSummary(summaryPath) {
  const summary = readOptionalPlistJson(summaryPath);
  const app =
    summary?.["App.ipa"]?.find?.((item) => item?.name === "App.app") ||
    summary?.["App.ipa"]?.[0];
  return {
    version: app?.versionNumber || "unknown",
    build: app?.buildNumber || "unknown",
    teamId: app?.team?.id || "unknown",
    certificate: app?.certificate?.type || "unknown",
    profile: app?.profile?.name || "unknown",
  };
}

function assertUploadToolAvailable() {
  const altool = spawnSync("xcrun", ["altool", "--help"], {
    encoding: "utf8",
  });
  if (altool.status !== 0) {
    throw new Error(
      "Missing xcrun altool. Install/select Xcode before uploading to App Store Connect.",
    );
  }
}

function buildAuthArgs(env) {
  const apiKey =
    env.APP_STORE_CONNECT_API_KEY_ID || env.ASC_API_KEY_ID || "";
  const apiIssuer =
    env.APP_STORE_CONNECT_API_ISSUER_ID || env.ASC_API_ISSUER_ID || "";
  const apiKeyPath =
    env.APP_STORE_CONNECT_API_KEY_PATH || env.ASC_API_KEY_PATH || "";
  const username = env.APP_STORE_CONNECT_USERNAME || env.ASC_USERNAME || "";
  const passwordEnv = [
    "APP_STORE_CONNECT_PASSWORD",
    "APP_SPECIFIC_PASSWORD",
    "FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD",
  ].find((name) => env[name]);
  const providerPublicId =
    env.APP_STORE_CONNECT_PROVIDER_PUBLIC_ID || env.ASC_PROVIDER_PUBLIC_ID || "";

  if (apiKey && apiIssuer) {
    const args = ["--api-key", apiKey, "--api-issuer", apiIssuer];
    if (apiKeyPath) {
      requiredFile(apiKeyPath, "App Store Connect API key");
      args.push("--p8-file-path", apiKeyPath);
    }
    return {
      description: apiKeyPath
        ? "App Store Connect API key with explicit p8 path"
        : "App Store Connect API key",
      args,
    };
  }

  if (username && passwordEnv) {
    const args = ["--username", username, "--password", `@env:${passwordEnv}`];
    if (providerPublicId) {
      args.push("--provider-public-id", providerPublicId);
    }
    return {
      description: `Apple ID username with app-specific password from ${passwordEnv}`,
      args,
    };
  }
  return null;
}

export async function main({
  env = process.env,
  repoRoot = DEFAULT_REPO_ROOT,
} = {}) {
  const ipaPath = path.join(repoRoot, IOS_RELEASE_PATHS.ipa);
  const summaryPath = path.join(
    repoRoot,
    IOS_RELEASE_PATHS.distributionSummary,
  );
  const confirmUpload = env.ZIVO_APP_STORE_UPLOAD_CONFIRM === "UPLOAD_APP";

  const candidate = await validateIosIpa({ repoRoot, ipaPath });
  assertUploadToolAvailable();
  const summary = getExportedAppSummary(summaryPath);
  const auth = buildAuthArgs(env);

  if (
    summary.version !== "unknown" &&
    summary.version !== candidate.identity.marketingVersion
  ) {
    throw new Error(
      "DistributionSummary.plist version does not match the validated IPA.",
    );
  }
  if (
    summary.build !== "unknown" &&
    String(summary.build) !== String(candidate.identity.buildNumber)
  ) {
    throw new Error(
      "DistributionSummary.plist build number does not match the validated IPA.",
    );
  }

  console.log("App Store Connect IPA upload helper");
  console.log(`IPA: ${path.relative(repoRoot, ipaPath)}`);
  console.log(`Bundle: ${candidate.identity.bundleIdentifier}`);
  console.log(
    `Release: ${candidate.identity.marketingVersion} (${candidate.identity.buildNumber})`,
  );
  console.log(
    `Privacy manifest: ${path.basename(candidate.privacyManifestPath)} at app bundle root`,
  );
  console.log(`Web payload: current (${candidate.webFileCount} dist files)`);
  console.log(`Team: ${summary.teamId}`);
  console.log(`Signing: ${summary.certificate}`);
  console.log(`Profile: ${summary.profile}`);
  console.log(`Upload auth: ${auth ? auth.description : "missing"}`);

  if (!confirmUpload) {
    console.log(
      "\nDry run only. To upload the validated IPA to App Store Connect, rerun with:",
    );
    console.log(
      "ZIVO_APP_STORE_UPLOAD_CONFIRM=UPLOAD_APP npm run ios:upload:app-store",
    );
    console.log("\nSupported auth:");
    console.log(
      "- APP_STORE_CONNECT_API_KEY_ID + APP_STORE_CONNECT_API_ISSUER_ID",
    );
    console.log(
      "- optional APP_STORE_CONNECT_API_KEY_PATH for the AuthKey .p8 file",
    );
    console.log(
      "- or APP_STORE_CONNECT_USERNAME + APP_SPECIFIC_PASSWORD",
    );
    return 0;
  }
  if (!auth) {
    throw new Error("Missing App Store Connect upload credentials. Refusing to upload.");
  }

  const args = [
    "altool",
    "--upload-package",
    ipaPath,
    ...auth.args,
    "--output-format",
    "json",
    "--show-progress",
  ];
  console.log(
    "\nUploading IPA to App Store Connect. This creates a build for processing; it does not submit for review.",
  );
  const result = spawnSync("xcrun", args, {
    cwd: repoRoot,
    stdio: "inherit",
    env,
  });
  if (result.status !== 0) return result.status || 1;
  console.log(
    "\nUpload finished. Wait for App Store Connect processing, then review TestFlight/App Store metadata manually.",
  );
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main()
    .then((status) => {
      process.exitCode = status;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
