#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(new URL("../..", import.meta.url).pathname);
const ok = [];
const warn = [];

const exists = (relativePath) => fs.existsSync(path.join(root, relativePath));

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

const run = (cmd, args) => {
  try {
    return execFileSync(cmd, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
};

const mark = (passed, label, detail = "") => {
  const line = `${passed ? "OK" : "WARN"} ${label}${detail ? ` - ${detail}` : ""}`;
  (passed ? ok : warn).push(line);
};

const androidSdkCandidates = [
  process.env.ANDROID_HOME,
  process.env.ANDROID_SDK_ROOT,
  exists("android/local.properties") ? read("android/local.properties").match(/^sdk\.dir=(.+)$/m)?.[1] : "",
  path.join(process.env.HOME || "", "Library/Android/sdk"),
  path.join(process.env.HOME || "", "Android/Sdk"),
].filter(Boolean);

const firstExistingDirectory = (candidates) =>
  candidates.find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) || "";

const packageJson = JSON.parse(read("package.json"));
const capacitorConfig = read("capacitor.config.ts");

mark(exists("capacitor.config.ts"), "Capacitor config found", "capacitor.config.ts");
mark(Boolean(packageJson.dependencies?.["@capacitor/core"]), "Capacitor core dependency", packageJson.dependencies?.["@capacitor/core"]);
mark(Boolean(packageJson.dependencies?.["@capacitor/ios"]), "Capacitor iOS dependency", packageJson.dependencies?.["@capacitor/ios"]);
mark(Boolean(packageJson.dependencies?.["@capacitor/android"]), "Capacitor Android dependency", packageJson.dependencies?.["@capacitor/android"]);
mark(capacitorConfig.includes("webDir: 'dist'") || capacitorConfig.includes('webDir: "dist"'), "Native webDir points to dist");
mark(capacitorConfig.includes("overlaysWebView: true"), "iOS edge-to-edge status bar configured");

const xcodeVersion = run("xcodebuild", ["-version"]).split("\n")[0];
mark(Boolean(xcodeVersion), "Xcode available", xcodeVersion || "install Xcode from the App Store");
mark(exists("ios/App/App.xcodeproj/project.pbxproj"), "iOS Xcode project found", "ios/App/App.xcodeproj");
mark(exists("ios/App/CapApp-SPM/Package.swift"), "iOS Capacitor SwiftPM package found");

const androidSdk = firstExistingDirectory(androidSdkCandidates);
mark(
  Boolean(androidSdk),
  "Android SDK configured",
  androidSdk ||
    "install Android Studio/SDK, then add android/local.properties with sdk.dir=/Users/kimlain/Library/Android/sdk or export ANDROID_HOME",
);
mark(exists("android/app/build.gradle"), "Android app Gradle file found");
mark(exists("android/gradlew"), "Android Gradle wrapper found");

if (exists("android/app/build.gradle")) {
  const gradle = read("android/app/build.gradle");
  mark(Boolean(gradle.match(/versionName\s+"1\.3\.0"/)), "Android versionName aligned", gradle.match(/versionName\s+"([^"]+)"/)?.[1] || "missing");
  mark(Boolean(gradle.match(/versionCode\s+2026053101/)), "Android versionCode updated", gradle.match(/versionCode\s+(\d+)/)?.[1] || "missing");
}

const iosSettings = run("xcodebuild", [
  "-project",
  "ios/App/App.xcodeproj",
  "-scheme",
  "App",
  "-showBuildSettings",
]);
mark(iosSettings.includes("MARKETING_VERSION = 1.3.0"), "iOS marketing version aligned", "1.3.0");
mark(iosSettings.includes("PRODUCT_BUNDLE_IDENTIFIER = com.hizovo.app"), "iOS bundle id", "com.hizovo.app");

console.log("Native readiness check\n");
for (const line of ok) console.log(`✓ ${line.replace(/^OK /, "")}`);
for (const line of warn) console.log(`! ${line.replace(/^WARN /, "")}`);

if (warn.length > 0) {
  console.log(`\n${warn.length} warning${warn.length === 1 ? "" : "s"} found.`);
  process.exitCode = 1;
} else {
  console.log("\nAll native checks passed.");
}
