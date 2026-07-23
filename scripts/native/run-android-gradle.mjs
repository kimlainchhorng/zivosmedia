#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import path from "node:path";
import { findJava21Home, javaVersionText } from "./java21.mjs";

const root = path.resolve(new URL("../..", import.meta.url).pathname);
const androidRoot = path.join(root, "android");
const gradleArgs = process.argv.slice(2);

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

execFileSync("sh", [path.join(androidRoot, "gradlew"), ...gradleArgs], {
  cwd: androidRoot,
  env: {
    ...process.env,
    JAVA_HOME: javaHome,
    PATH: `${path.join(javaHome, "bin")}:${process.env.PATH || ""}`,
  },
  stdio: "inherit",
});
