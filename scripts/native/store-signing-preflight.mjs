#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(new URL("../..", import.meta.url).pathname);
const app = {
  name: "Zivosmedia",
  bundleId: "com.hizovo.app",
  iosBundleIds: ["com.hizovo.app", "com.hizovo.app.NotificationServiceExtension"],
  teamId: "9KWY67J6LX",
  aab: "android/app/build/outputs/bundle/release/app-release.aab",
  iosExport: {
    ipa: "ios/build/export/zivosmedia/App.ipa",
    summary: "ios/build/export/zivosmedia/DistributionSummary.plist",
  },
};

const ok = [];
const warn = [];

const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const isPlaceholder = (value) => /<[^>]+>|\b(owner-controlled|todo|replace|changeme)\b/i.test(value);
const mark = (passed, label, detail = "") => {
  const line = `${label}${detail ? ` - ${detail}` : ""}`;
  (passed ? ok : warn).push(line);
};

function parseProperties(text) {
  const values = new Map();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    values.set(trimmed.slice(0, index).trim(), trimmed.slice(index + 1).trim());
  }
  return values;
}

function commandOutput(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    }).trim();
  } catch (error) {
    return `${error.stdout || ""}\n${error.stderr || ""}`.trim();
  }
}

function readPlistJson(relativePath) {
  const plistPath = path.join(root, relativePath);
  if (!fs.existsSync(plistPath)) return null;
  try {
    const output = execFileSync("plutil", ["-convert", "json", "-o", "-", plistPath], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return JSON.parse(output);
  } catch {
    return null;
  }
}

function collectDistributionItems(summary) {
  const items = [];
  const visit = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    if (value.certificate || value.profile || value.entitlements) items.push(value);
    for (const child of Object.values(value)) {
      if (child && typeof child === "object") visit(child);
    }
  };
  visit(summary);
  return items;
}

const keystorePropertiesPath = "android/keystore.properties";
const googleServicesPath = "android/app/google-services.json";
const hasKeystoreProperties = exists(keystorePropertiesPath);
const hasGoogleServices = exists(googleServicesPath);
mark(exists("android/keystore.properties.example"), "Android keystore template present", "android/keystore.properties.example");
mark(hasKeystoreProperties, "Android keystore properties present", keystorePropertiesPath);
mark(hasGoogleServices, "Android Firebase config present", googleServicesPath);

if (hasGoogleServices) {
  let googleServicesJson = null;
  try {
    googleServicesJson = JSON.parse(read(googleServicesPath));
  } catch {
    // Shape only; never print file contents.
  }
  mark(Boolean(googleServicesJson), "Android Firebase config parses as JSON", googleServicesPath);
  const firebaseProjectId = googleServicesJson?.project_info?.project_id;
  mark(Boolean(firebaseProjectId), "Android Firebase project id present", "project_info.project_id");
  const packageNames = Array.isArray(googleServicesJson?.client)
    ? googleServicesJson.client
      .map((client) => client?.client_info?.android_client_info?.package_name)
      .filter(Boolean)
    : [];
  mark(packageNames.includes(app.bundleId), "Android Firebase package matches app", `must include ${app.bundleId}`);
}

let keystoreFileExists = false;
if (hasKeystoreProperties) {
  const properties = parseProperties(read(keystorePropertiesPath));
  const storeFile = properties.get("storeFile") || "";
  const storePassword = properties.get("storePassword") || "";
  const keyAlias = properties.get("keyAlias") || "";
  const keyPassword = properties.get("keyPassword") || "";
  keystoreFileExists = Boolean(storeFile && fs.existsSync(path.join(root, "android", storeFile)));
  mark(Boolean(storeFile), "Android keystore storeFile set");
  mark(keystoreFileExists, "Android keystore file exists", storeFile || "missing");
  mark(Boolean(storePassword), "Android store password set");
  mark(Boolean(storePassword) && !isPlaceholder(storePassword), "Android store password is not a placeholder");
  mark(Boolean(keyAlias), "Android key alias set");
  mark(Boolean(keyAlias) && !isPlaceholder(keyAlias), "Android key alias is not a placeholder");
  mark(Boolean(keyPassword), "Android key password set");
  mark(Boolean(keyPassword) && !isPlaceholder(keyPassword), "Android key password is not a placeholder");
}

const aabPath = path.join(root, app.aab);
const aabExists = fs.existsSync(aabPath);
let aabSigned = false;
mark(aabExists, "Android release AAB exists (compile-only)", app.aab);
if (aabExists) {
  const verifyOutput = commandOutput("jarsigner", ["-verify", aabPath]);
  aabSigned = verifyOutput.includes("jar verified");
  mark(aabSigned, "Android release AAB is signed for Google Play upload", app.aab);
}

mark(exists("ios/App/ExportOptions.plist"), "iOS App Store export options present", "ios/App/ExportOptions.plist");

const identities = commandOutput("security", ["find-identity", "-v", "-p", "codesigning"]);
const hasLocalDistributionIdentity = /Apple Distribution|iPhone Distribution/.test(identities);
const exportIpaExists = exists(app.iosExport.ipa);
const exportSummary = readPlistJson(app.iosExport.summary);
const exportItems = collectDistributionItems(exportSummary);
const exportedDistributionBundleIds = new Set();
let exportHasDistributionCertificate = false;
for (const item of exportItems) {
  const certificateType = item?.certificate?.type || "";
  if (/Distribution/i.test(certificateType)) exportHasDistributionCertificate = true;
  const appIdentifier = item?.entitlements?.["application-identifier"] || "";
  const isReleaseSigned = item?.entitlements?.["get-task-allow"] === false;
  const prefix = `${app.teamId}.`;
  if (/Distribution/i.test(certificateType) && isReleaseSigned && appIdentifier.startsWith(prefix)) {
    exportedDistributionBundleIds.add(appIdentifier.slice(prefix.length));
  }
}
const exportCoversRequiredBundles = app.iosBundleIds.every((bundleId) => exportedDistributionBundleIds.has(bundleId));
const hasCloudManagedDistributionExport = exportIpaExists && exportHasDistributionCertificate && exportCoversRequiredBundles;
mark(exportIpaExists, "iOS App Store IPA export exists", app.iosExport.ipa);
mark(
  Boolean(exportSummary),
  "iOS export summary readable",
  app.iosExport.summary,
);
mark(
  hasLocalDistributionIdentity || hasCloudManagedDistributionExport,
  "Apple Distribution signing available",
  hasLocalDistributionIdentity
    ? "local keychain identity"
    : hasCloudManagedDistributionExport
      ? "cloud managed distribution export"
      : identities.includes("Apple Development")
        ? "development identity only"
        : "missing",
);

const profilesDirs = [
  path.join(os.homedir(), "Library/MobileDevice/Provisioning Profiles"),
  path.join(os.homedir(), "Library/Developer/Xcode/UserData/Provisioning Profiles"),
];
const matchingProfiles = new Set();
const isAppStoreProfile = (profileXml) => (
  !profileXml.includes("<key>ProvisionedDevices</key>")
  && /<key>get-task-allow<\/key>\s*<false\/>/.test(profileXml)
);

for (const profilesDir of profilesDirs) {
  if (!fs.existsSync(profilesDir)) continue;
  for (const fileName of fs.readdirSync(profilesDir)) {
    if (!fileName.endsWith(".mobileprovision")) continue;
    const profilePath = path.join(profilesDir, fileName);
    const profileXml = commandOutput("security", ["cms", "-D", "-i", profilePath], { cwd: profilesDir });
    if (!isAppStoreProfile(profileXml)) continue;
    for (const bundleId of app.iosBundleIds) {
      if (profileXml.includes(`<string>${app.teamId}.${bundleId}</string>`)) {
        matchingProfiles.add(bundleId);
      }
    }
  }
}
for (const bundleId of app.iosBundleIds) {
  mark(matchingProfiles.has(bundleId), "App Store provisioning profile installed", `${bundleId} / ${app.teamId}`);
}

console.log(`${app.name} store signing preflight\n`);
for (const line of ok) console.log(`✓ ${line}`);
for (const line of warn) console.log(`! ${line}`);

if (warn.length > 0) {
  if (aabExists && !aabSigned) {
    console.log("\nCompile-only Android release bundle exists, but Google Play upload signing is still missing.");
  }
  console.log(`\n${warn.length} blocker${warn.length === 1 ? "" : "s"} found before store upload.`);
  process.exitCode = 1;
} else {
  console.log("\nStore signing is ready.");
}
