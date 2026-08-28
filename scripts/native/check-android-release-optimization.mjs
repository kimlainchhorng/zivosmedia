#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);

export const ANDROID_RELEASE_OPTIMIZATION_PATHS = Object.freeze({
  buildGradle: "android/app/build.gradle",
  aab: "android/app/build/outputs/bundle/release/app-release.aab",
  mapping: "android/app/build/outputs/mapping/release/mapping.txt",
  usage: "android/app/build/outputs/mapping/release/usage.txt",
  configuration: "android/app/build/outputs/mapping/release/configuration.txt",
  seeds: "android/app/build/outputs/mapping/release/seeds.txt",
});

const EMBEDDED_MAPPING_PATH =
  "BUNDLE-METADATA/com.android.tools.build.obfuscation/proguard.map";
const EMBEDDED_R8_METADATA_PATH = "BUNDLE-METADATA/com.android.tools/r8.json";

function stripGradleComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

function extractBlock(source, blockName) {
  const match = new RegExp(`\\b${blockName}\\s*\\{`).exec(source);
  if (!match) return "";

  const openingBrace = source.indexOf("{", match.index);
  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] === "}") depth -= 1;
    if (depth === 0) return source.slice(openingBrace + 1, index);
  }
  return "";
}

export function validateAndroidReleaseOptimizationConfig(source) {
  const uncommented = stripGradleComments(String(source || ""));
  const buildTypes = extractBlock(uncommented, "buildTypes");
  const release = extractBlock(buildTypes, "release");
  const failures = [];

  if (!buildTypes || !release) {
    failures.push("could not find android.buildTypes.release");
  } else {
    if (!/\bminifyEnabled\s*(?:=\s*)?true\b/.test(release)) {
      failures.push("release minifyEnabled must be true");
    }
    if (/\bminifyEnabled\s*(?:=\s*)?false\b/.test(release)) {
      failures.push("release must not disable minification");
    }
    if (!/\bshrinkResources\s*(?:=\s*)?true\b/.test(release)) {
      failures.push("release shrinkResources must be true");
    }
    if (/\bshrinkResources\s*(?:=\s*)?false\b/.test(release)) {
      failures.push("release must not disable resource shrinking");
    }
    if (
      !/getDefaultProguardFile\s*\(\s*["']proguard-android-optimize\.txt["']\s*\)/.test(
        release,
      )
    ) {
      failures.push(
        "release must use the optimized Android default ProGuard configuration",
      );
    }
    if (!/["']proguard-rules\.pro["']/.test(release)) {
      failures.push("release must include the app ProGuard rules");
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Android release optimization config failed: ${failures.join("; ")}`,
    );
  }

  return {
    minifyEnabled: true,
    shrinkResources: true,
    optimizedDefaultRules: true,
  };
}

export function parseArchiveEntriesFromUnzipList(output) {
  const entries = [];
  const linePattern = /^\s*(\d+)\s+\S+\s+\S+\s+(\S+)\s*$/gm;
  let match;
  while ((match = linePattern.exec(String(output || ""))) !== null) {
    entries.push({ path: match[2], bytes: Number(match[1]) });
  }
  return entries;
}

export function parseDexEntriesFromUnzipList(output) {
  return parseArchiveEntriesFromUnzipList(output).filter((entry) =>
    /^base\/dex\/[^/]+\.dex$/.test(entry.path),
  );
}

export function validateAndroidReleaseOptimizationEvidence(evidence) {
  const failures = [];
  const dexEntries = Array.isArray(evidence.dexEntries)
    ? evidence.dexEntries
    : [];
  const mappingText = String(evidence.mappingText || "");
  const usageText = String(evidence.usageText || "");
  const configurationText = String(evidence.configurationText || "");
  const seedsText = String(evidence.seedsText || "");

  if (!Number.isFinite(evidence.aabBytes) || evidence.aabBytes <= 0) {
    failures.push("release AAB is missing or empty");
  }
  if (
    dexEntries.length === 0 ||
    dexEntries.some(
      (entry) =>
        !entry ||
        !/^base\/dex\/[^/]+\.dex$/.test(String(entry.path)) ||
        !Number.isFinite(entry.bytes) ||
        entry.bytes <= 0,
    )
  ) {
    failures.push("release AAB has no valid base DEX entries");
  }
  if (!/^[^#\s].* -> .*:$/m.test(mappingText)) {
    failures.push("R8 mapping report has no obfuscated class mappings");
  }
  if (!/^[^#\s].+$/m.test(usageText)) {
    failures.push("R8 usage report has no removed code entries");
  }
  if (!/^\s*-[a-z]/m.test(configurationText)) {
    failures.push("R8 merged configuration report is missing or empty");
  }
  if (
    !Number.isFinite(evidence.embeddedMappingBytes) ||
    evidence.embeddedMappingBytes <= 0
  ) {
    failures.push("release AAB is missing its embedded deobfuscation mapping");
  }
  if (
    !Number.isFinite(evidence.r8MetadataBytes) ||
    evidence.r8MetadataBytes <= 0
  ) {
    failures.push("release AAB is missing its embedded R8 metadata");
  }
  for (const className of [
    "com.hizovo.app.MainActivity",
    "com.hizovo.app.PlayIntegrityPlugin",
    "com.hizovo.app.RestoreCredentialsPlugin",
  ]) {
    if (!seedsText.split(/\r?\n/).includes(className)) {
      failures.push(`R8 seeds do not preserve ${className}`);
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Android release optimization artifact check failed: ${failures.join("; ")}`,
    );
  }

  return {
    aabBytes: evidence.aabBytes,
    dexBytes: dexEntries.reduce((total, entry) => total + entry.bytes, 0),
    dexFiles: dexEntries.length,
    embeddedMappingBytes: evidence.embeddedMappingBytes,
  };
}

function readRequiredFile(rootDir, relativePath) {
  const absolutePath = path.join(rootDir, relativePath);
  try {
    return readFileSync(absolutePath, "utf8");
  } catch (error) {
    throw new Error(
      `Android release optimization artifact check failed: ${relativePath} could not be read (${error.message})`,
    );
  }
}

function formatMiB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MiB`;
}

export function checkAndroidReleaseOptimization({
  rootDir = process.cwd(),
  runCommand = execFileSync,
} = {}) {
  const paths = ANDROID_RELEASE_OPTIMIZATION_PATHS;
  validateAndroidReleaseOptimizationConfig(
    readRequiredFile(rootDir, paths.buildGradle),
  );

  const aabPath = path.join(rootDir, paths.aab);
  let aabBytes = 0;
  try {
    aabBytes = statSync(aabPath).size;
  } catch (error) {
    throw new Error(
      `Android release optimization artifact check failed: ${paths.aab} could not be read (${error.message})`,
    );
  }

  let unzipOutput = "";
  try {
    unzipOutput = runCommand(
      "unzip",
      [
        "-l",
        aabPath,
        "base/dex/*.dex",
        EMBEDDED_MAPPING_PATH,
        EMBEDDED_R8_METADATA_PATH,
      ],
      {
        cwd: rootDir,
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
  } catch (error) {
    const detail = String(error.stderr || error.message || error).trim();
    throw new Error(
      `Android release optimization artifact check failed: could not inspect ${paths.aab}${detail ? ` (${detail})` : ""}`,
    );
  }

  const archiveEntries = parseArchiveEntriesFromUnzipList(unzipOutput);
  const entryBytes = (entryPath) =>
    archiveEntries.find((entry) => entry.path === entryPath)?.bytes || 0;
  const result = validateAndroidReleaseOptimizationEvidence({
    aabBytes,
    dexEntries: archiveEntries.filter((entry) =>
      /^base\/dex\/[^/]+\.dex$/.test(entry.path),
    ),
    mappingText: readRequiredFile(rootDir, paths.mapping),
    usageText: readRequiredFile(rootDir, paths.usage),
    configurationText: readRequiredFile(rootDir, paths.configuration),
    seedsText: readRequiredFile(rootDir, paths.seeds),
    embeddedMappingBytes: entryBytes(EMBEDDED_MAPPING_PATH),
    r8MetadataBytes: entryBytes(EMBEDDED_R8_METADATA_PATH),
  });

  console.log("Android release optimization verified:");
  console.log(
    "✓ R8 optimization, code shrinking, obfuscation, and resource shrinking are enabled.",
  );
  console.log(`✓ Release AAB: ${formatMiB(result.aabBytes)}`);
  console.log(
    `✓ Packaged DEX: ${formatMiB(result.dexBytes)} across ${result.dexFiles} file${result.dexFiles === 1 ? "" : "s"}`,
  );
  console.log(
    "✓ R8 mapping, removed-code, merged-rule, and preserved-plugin reports are non-empty.",
  );
  console.log(
    `✓ Deobfuscation mapping is embedded in the AAB (${formatMiB(result.embeddedMappingBytes)}).`,
  );
  console.log(
    "Google Play Bundle Explorer remains authoritative for the exact optimization percentages reported for an uploaded bundle.",
  );

  return result;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
if (invokedPath === scriptPath) {
  try {
    checkAndroidReleaseOptimization();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
