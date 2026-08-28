#!/usr/bin/env node
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);

export const ANDROID_RESTORE_CREDENTIAL_PATHS = Object.freeze({
  buildGradle: "android/app/build.gradle",
  mainActivity: "android/app/src/main/java/com/hizovo/app/MainActivity.java",
  plugin:
    "android/app/src/main/java/com/hizovo/app/RestoreCredentialsPlugin.java",
  assetLinks: "public/.well-known/assetlinks.json",
  supabaseClient: "src/integrations/supabase/client.ts",
  runtime: "src/lib/nativeRestoreCredentials.ts",
  authContext: "src/contexts/AuthContext.tsx",
  loginHistory: "src/components/auth/LoginHistorySection.tsx",
  accountSecurity: "src/pages/account/AccountSecurity.tsx",
  packageJson: "package.json",
  documentation: "docs/native-android-setup.md",
});

export const ZIVO_ANDROID_PACKAGE = "com.hizovo.app";
export const ZIVO_ANDROID_PLAY_CERT_FINGERPRINT =
  "EA:45:99:1E:91:8A:9F:30:F9:EE:C2:99:1A:7F:72:66:0E:AC:49:68:18:4B:74:16:A8:C4:0C:1E:00:EE:FA:52";
export const ZIVO_ANDROID_UPLOAD_CERT_FINGERPRINT =
  "2C:B4:10:12:26:FB:4F:C9:55:84:39:E4:82:74:EE:3C:0C:19:55:A1:FB:87:7E:46:B3:ED:6E:84:0B:8B:D9:7E";
export const ZIVO_ANDROID_CERT_FINGERPRINTS = Object.freeze([
  ZIVO_ANDROID_PLAY_CERT_FINGERPRINT,
  ZIVO_ANDROID_UPLOAD_CERT_FINGERPRINT,
]);

function fail(label, failures) {
  if (failures.length > 0) {
    throw new Error(`${label} failed: ${failures.join("; ")}`);
  }
}

function compareVersions(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] - right[index];
  }
  return 0;
}

function parseStableVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return null;
  return match.slice(1).map(Number);
}

export function validateCredentialDependencyConfig(source) {
  const text = String(source || "");
  const dependencies = new Map();
  const pattern =
    /androidx\.credentials:(credentials(?:-play-services-auth)?):([^'"\s]+)/g;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    dependencies.set(match[1], match[2]);
  }

  const failures = [];
  for (const artifact of ["credentials", "credentials-play-services-auth"]) {
    const version = dependencies.get(artifact);
    if (!version) {
      failures.push(`${artifact} dependency is missing`);
      continue;
    }
    const parsed = parseStableVersion(version);
    if (!parsed) {
      failures.push(`${artifact} must use a stable semantic version`);
    } else if (compareVersions(parsed, [1, 5, 0]) < 0) {
      failures.push(`${artifact} must be version 1.5.0 or newer`);
    }
  }

  if (
    dependencies.get("credentials") &&
    dependencies.get("credentials-play-services-auth") &&
    dependencies.get("credentials") !==
      dependencies.get("credentials-play-services-auth")
  ) {
    failures.push("Credential Manager dependencies must use the same version");
  }

  fail("Android Restore Credentials dependency check", failures);
  return { version: dependencies.get("credentials") };
}

export function validateRestoreCredentialsPluginSource(
  pluginSource,
  mainActivitySource,
) {
  const plugin = String(pluginSource || "");
  const mainActivity = String(mainActivitySource || "");
  const failures = [];
  const requiredPluginPatterns = [
    [
      /@CapacitorPlugin\(name = "RestoreCredentials"\)/,
      "Capacitor plugin annotation",
    ],
    [/@PluginMethod\s+public void getAvailability\s*\(/, "availability method"],
    [/@PluginMethod\s+public void create\s*\(/, "create method"],
    [/@PluginMethod\s+public void get\s*\(/, "get method"],
    [/@PluginMethod\s+public void clear\s*\(/, "clear method"],
    [/CreateRestoreCredentialRequest/, "restore-key creation request"],
    [/CreateRestoreCredentialResponse/, "restore-key creation response"],
    [/GetRestoreCredentialOption/, "restore-key retrieval option"],
    [/RestoreCredential/, "restore-key response"],
    [/TYPE_CLEAR_RESTORE_CREDENTIAL/, "restore-key deletion request"],
    [/E2eeUnavailableException/, "cloud-backup fallback exception"],
    [
      /createRestoreCredential\(call, requestJson, false\)/,
      "local fallback after E2EE failure",
    ],
    [/Build\.VERSION_CODES\.P/, "Android 9 runtime guard"],
    [/MINIMUM_GMS_VERSION\s*=\s*24_220_000L/, "minimum GMS core guard"],
    [/MAX_REQUEST_JSON_LENGTH/, "request-size guard"],
  ];

  for (const [pattern, label] of requiredPluginPatterns) {
    if (!pattern.test(plugin)) failures.push(`${label} is missing`);
  }
  if (!/registerPlugin\(RestoreCredentialsPlugin\.class\)/.test(mainActivity)) {
    failures.push("MainActivity does not register RestoreCredentialsPlugin");
  }
  if (/call\.reject\([^\n]*error\.getMessage\s*\(/.test(plugin)) {
    failures.push(
      "native errors must not expose provider details to JavaScript",
    );
  }

  fail("Android Restore Credentials plugin source check", failures);
  return { registered: true };
}

export function computeAndroidAppOrigin(fingerprint) {
  const hex = String(fingerprint || "").replace(/:/g, "");
  if (!/^[0-9a-f]{64}$/i.test(hex)) {
    throw new Error("Android certificate fingerprint must be a SHA-256 value");
  }
  const encoded = Buffer.from(hex, "hex")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
  return `android:apk-key-hash:${encoded}`;
}

export function validateAssetLinks(assetLinksSource) {
  let statements;
  try {
    statements = JSON.parse(String(assetLinksSource || ""));
  } catch {
    throw new Error(
      "Android Digital Asset Links check failed: JSON is invalid",
    );
  }

  const statement = Array.isArray(statements)
    ? statements.find(
        (candidate) =>
          candidate?.target?.namespace === "android_app" &&
          candidate?.target?.package_name === ZIVO_ANDROID_PACKAGE,
      )
    : null;
  const failures = [];
  if (!statement) {
    failures.push(`statement for ${ZIVO_ANDROID_PACKAGE} is missing`);
  } else {
    const relations = Array.isArray(statement.relation)
      ? statement.relation
      : [];
    if (!relations.includes("delegate_permission/common.handle_all_urls")) {
      failures.push("verified-link relation is missing");
    }
    if (!relations.includes("delegate_permission/common.get_login_creds")) {
      failures.push("login-credentials relation is missing");
    }
    const fingerprints = Array.isArray(
      statement.target.sha256_cert_fingerprints,
    )
      ? statement.target.sha256_cert_fingerprints
      : [];
    for (const fingerprint of ZIVO_ANDROID_CERT_FINGERPRINTS) {
      if (!fingerprints.includes(fingerprint)) {
        failures.push(
          `required Android signing fingerprint is missing: ${fingerprint}`,
        );
      }
    }
  }

  fail("Android Digital Asset Links check", failures);
  return {
    androidOrigins: ZIVO_ANDROID_CERT_FINGERPRINTS.map(computeAndroidAppOrigin),
  };
}

function assertClearBeforeSignOut(source, label) {
  const clearIndex = source.indexOf("clearNativeRestoreCredential(");
  const signOutIndex = source.indexOf("auth.signOut(", clearIndex);
  if (clearIndex < 0 || signOutIndex < 0 || clearIndex > signOutIndex) {
    return `${label} must clear restore credentials before Supabase sign-out`;
  }
  return null;
}

export function validateWebAuthSourceContracts({
  clientSource,
  runtimeSource,
  authContextSource,
  loginHistorySource,
  accountSecuritySource,
}) {
  const client = String(clientSource || "");
  const runtime = String(runtimeSource || "");
  const authContext = String(authContextSource || "");
  const loginHistory = String(loginHistorySource || "");
  const accountSecurity = String(accountSecuritySource || "");
  const failures = [];

  if (!/experimental\s*:\s*\{\s*passkey\s*:\s*true\s*,?\s*\}/s.test(client)) {
    failures.push("Supabase passkey API opt-in is missing");
  }
  const runtimeRequirements = [
    [
      /VITE_ANDROID_RESTORE_CREDENTIALS_ENABLED\s*===\s*"true"/,
      "explicit off-by-default feature flag",
    ],
    [/Capacitor\.getPlatform\(\) === "android"/, "native Android gate"],
    [/startRegistration\(\)/, "server registration challenge"],
    [/verifyRegistration/, "server registration verification"],
    [/startAuthentication\(\)/, "server authentication challenge"],
    [/verifyAuthentication/, "server authentication verification"],
    [
      /ANDROID_RESTORE_CREDENTIAL_SUPPRESSION_KEY/,
      "sign-out suppression marker",
    ],
    [
      /friendly_name === ANDROID_RESTORE_CREDENTIAL_LABEL/,
      "restore-key classification",
    ],
    [/dependencies\.plugin\.clear\(\)/, "native key deletion"],
  ];
  for (const [pattern, label] of runtimeRequirements) {
    if (!pattern.test(runtime)) failures.push(`${label} is missing`);
  }

  for (const required of [
    "tryRestoreNativeSession()",
    "provisionNativeRestoreCredential(restoredSession.user.id)",
    "clearNativeRestoreCredential(currentUser?.id)",
  ]) {
    if (!authContext.includes(required)) {
      failures.push(`AuthContext is missing ${required}`);
    }
  }

  const authOrderFailure = assertClearBeforeSignOut(authContext, "AuthContext");
  if (authOrderFailure) failures.push(authOrderFailure);
  for (const [source, label] of [
    [loginHistory, "Login history"],
    [accountSecurity, "Account security"],
  ]) {
    if (!source.includes("{ allDevices: true }")) {
      failures.push(
        `${label} global sign-out must remove all labeled restore keys`,
      );
    }
    const orderFailure = assertClearBeforeSignOut(source, label);
    if (orderFailure) failures.push(orderFailure);
  }

  fail("Android Restore Credentials web auth source check", failures);
  return { disabledByDefault: true, signOutProtected: true };
}

function readRequiredFile(rootDir, relativePath) {
  try {
    return readFileSync(path.join(rootDir, relativePath), "utf8");
  } catch (error) {
    throw new Error(
      `Android Restore Credentials check failed: ${relativePath} could not be read (${error.message})`,
    );
  }
}

export function checkAndroidRestoreCredentials({
  rootDir = process.cwd(),
} = {}) {
  const paths = ANDROID_RESTORE_CREDENTIAL_PATHS;
  const buildGradle = readRequiredFile(rootDir, paths.buildGradle);
  const mainActivity = readRequiredFile(rootDir, paths.mainActivity);
  const plugin = readRequiredFile(rootDir, paths.plugin);
  const assetLinks = readRequiredFile(rootDir, paths.assetLinks);
  const client = readRequiredFile(rootDir, paths.supabaseClient);
  const runtime = readRequiredFile(rootDir, paths.runtime);
  const authContext = readRequiredFile(rootDir, paths.authContext);
  const loginHistory = readRequiredFile(rootDir, paths.loginHistory);
  const accountSecurity = readRequiredFile(rootDir, paths.accountSecurity);
  const packageJson = readRequiredFile(rootDir, paths.packageJson);
  const documentation = readRequiredFile(rootDir, paths.documentation);

  const dependencyResult = validateCredentialDependencyConfig(buildGradle);
  validateRestoreCredentialsPluginSource(plugin, mainActivity);
  const { androidOrigins } = validateAssetLinks(assetLinks);
  validateWebAuthSourceContracts({
    clientSource: client,
    runtimeSource: runtime,
    authContextSource: authContext,
    loginHistorySource: loginHistory,
    accountSecuritySource: accountSecurity,
  });

  const failures = [];
  let scripts;
  try {
    scripts = JSON.parse(packageJson).scripts;
  } catch {
    failures.push("package.json is invalid");
  }
  if (
    scripts?.["android:restore-credentials:check"] !==
    "node scripts/native/check-android-restore-credentials.mjs"
  ) {
    failures.push("restore-credentials check command is missing");
  }
  if (
    !scripts?.["android:build:release"]?.includes(
      "npm run android:restore-credentials:check",
    )
  ) {
    failures.push("Android release build does not run the restore guard");
  }
  for (const androidOrigin of androidOrigins) {
    if (!documentation.includes(androidOrigin)) {
      failures.push(
        `Android passkey origin is missing from setup documentation: ${androidOrigin}`,
      );
    }
  }
  if (
    !documentation.includes("VITE_ANDROID_RESTORE_CREDENTIALS_ENABLED=true")
  ) {
    failures.push("activation flag is missing from setup documentation");
  }
  fail("Android Restore Credentials release contract check", failures);

  console.log("Android Restore Credentials foundation verified:");
  console.log(
    `✓ Credential Manager ${dependencyResult.version} bridge supports create, get, E2EE fallback, and delete.`,
  );
  console.log(
    "✓ Supabase challenges are verified server-side and restore keys are cleared before sign-out.",
  );
  for (const androidOrigin of androidOrigins) {
    console.log(`✓ Digital Asset Links Android origin: ${androidOrigin}`);
  }
  console.log(
    "Activation remains disabled until Supabase relying-party settings and device-transfer/cloud-restore QA are complete.",
  );
  console.log(
    "The source assetlinks.json change is not live until the website is deployed separately.",
  );

  return { androidOrigins, dependencyVersion: dependencyResult.version };
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === scriptPath) {
  try {
    checkAndroidRestoreCredentials();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
