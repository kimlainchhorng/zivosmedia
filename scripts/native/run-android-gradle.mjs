#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { findJava21Home, javaVersionText } from "./java21.mjs";

const root = path.resolve(new URL("../..", import.meta.url).pathname);
const androidRoot = path.join(root, "android");
const gradleArgs = process.argv.slice(2);
const GOOGLE_PLAY_MIN_TARGET_SDK = 36;

if (gradleArgs.length === 0) {
  console.error("Pass a Gradle task, for example: assembleDebug");
  process.exit(1);
}

const javaHome = findJava21Home();
if (!javaHome) {
  console.error("Java 21 is required for Android builds. Install JDK 21 or set JAVA_HOME to a JDK 21+ install.");
  process.exit(1);
}

console.log(`Using Java for Android build: ${javaVersionText(javaHome).split("\n")[0]}`);

const androidVariablesPath = path.join(androidRoot, "variables.gradle");
let androidVariables;
try {
  androidVariables = fs.readFileSync(androidVariablesPath, "utf8");
} catch (error) {
  console.error(`Android build stopped: could not read ${androidVariablesPath}.`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const targetSdkVersion = Number(androidVariables.match(/\btargetSdkVersion\s*=\s*(\d+)/)?.[1]);
if (!Number.isInteger(targetSdkVersion) || targetSdkVersion < GOOGLE_PLAY_MIN_TARGET_SDK) {
  console.error(
    `Android build stopped: targetSdkVersion must be ${GOOGLE_PLAY_MIN_TARGET_SDK} or higher for Google Play updates; found ${Number.isInteger(targetSdkVersion) ? targetSdkVersion : "no valid value"}.`,
  );
  process.exit(1);
}

// A Gradle-only build packages whatever Capacitor last copied into android/.
// Always rebuild and sync first so a store bundle cannot silently ship stale
// web assets or an old generated capacitor.config.json.
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
console.log("Rebuilding and synchronizing the Android Capacitor payload...");
execFileSync(npmCommand, ["run", "android:sync"], {
  cwd: root,
  stdio: "inherit",
});

const generatedConfigPath = path.join(androidRoot, "app", "src", "main", "assets", "capacitor.config.json");
let generatedConfig;
try {
  generatedConfig = JSON.parse(fs.readFileSync(generatedConfigPath, "utf8"));
} catch (error) {
  console.error(`Android build stopped: could not read the synchronized Capacitor config at ${generatedConfigPath}.`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

if (generatedConfig.appId !== "com.hizovo.app") {
  console.error(`Android build stopped: generated appId is ${generatedConfig.appId || "missing"}, expected com.hizovo.app.`);
  process.exit(1);
}

if (generatedConfig.plugins?.SplashScreen?.launchAutoHide !== true) {
  console.error(
    "Android build stopped: generated SplashScreen.launchAutoHide must be true so a failed web boot cannot leave a permanent splash.",
  );
  process.exit(1);
}

if (generatedConfig.plugins?.SplashScreen?.launchShowDuration !== 0) {
  console.error(
    "Android build stopped: generated SplashScreen.launchShowDuration must be 0 so Android cannot hold the first app draw behind an extra splash timer.",
  );
  process.exit(1);
}

const generatedIndexPath = path.join(androidRoot, "app", "src", "main", "assets", "public", "index.html");
let generatedIndex;
try {
  generatedIndex = fs.readFileSync(generatedIndexPath, "utf8");
} catch (error) {
  console.error(`Android build stopped: could not read the synchronized web entry at ${generatedIndexPath}.`);
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

const generatedBootShellIndex = generatedIndex.indexOf("<div data-zivo-boot-shell");
const generatedReactRootIndex = generatedIndex.indexOf('<div id="root"></div>');
if (
  generatedBootShellIndex === -1 ||
  generatedReactRootIndex === -1 ||
  generatedBootShellIndex > generatedReactRootIndex
) {
  console.error(
    "Android build stopped: synchronized index.html must keep the static ZIVO boot shell outside and before the empty React root.",
  );
  process.exit(1);
}

execFileSync("sh", [path.join(androidRoot, "gradlew"), ...gradleArgs], {
  cwd: androidRoot,
  env: {
    ...process.env,
    JAVA_HOME: javaHome,
    PATH: `${path.join(javaHome, "bin")}:${process.env.PATH || ""}`,
  },
  stdio: "inherit",
});
