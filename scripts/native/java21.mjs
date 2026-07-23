import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function directoriesAt(basePath) {
  try {
    return fs
      .readdirSync(basePath, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(basePath, entry.name));
  } catch {
    return [];
  }
}

function javaHomeCandidates() {
  const localJdkRoots = [
    path.join(process.env.HOME || "", ".local/jdks"),
    path.join(process.env.HOME || "", "Library/Java/JavaVirtualMachines"),
    "/Library/Java/JavaVirtualMachines",
  ];
  const installedHomes = localJdkRoots.flatMap((root) =>
    directoriesAt(root).map((candidate) => path.join(candidate, "Contents/Home")),
  );

  let macJavaHome = "";
  try {
    macJavaHome = execFileSync("/usr/libexec/java_home", ["-v", "21"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    macJavaHome = "";
  }

  return [process.env.JAVA_HOME, macJavaHome, ...installedHomes].filter(Boolean);
}

export function javaVersionText(javaHome) {
  const javaBin = path.join(javaHome, "bin/java");
  const result = spawnSync(javaBin, ["-version"], { encoding: "utf8" });
  return `${result.stdout || ""}${result.stderr || ""}`.trim();
}

export function javaMajorVersion(javaHome) {
  const versionText = javaVersionText(javaHome);
  const match = versionText.match(/version "(\d+)(?:\.|")/);
  return match ? Number(match[1]) : 0;
}

export function findJava21Home() {
  return javaHomeCandidates().find((candidate) => javaMajorVersion(candidate) >= 21) || "";
}
