#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
export const DEFAULT_REPO_ROOT = path.resolve(path.dirname(scriptPath), "../..");
export const CAPACITOR_GENERATED_PUBLIC_FILES = new Set([
  "cordova.js",
  "cordova_plugins.js",
]);
export const NATIVE_WEB_ROOTS = Object.freeze({
  android: "android/app/src/main/assets/public",
  ios: "ios/App/App/public",
});

function webPath(relativePath) {
  return relativePath.split(path.sep).join("/");
}

function sha256(contents) {
  return createHash("sha256").update(contents).digest("hex");
}

export async function readWebPayload(
  directory,
  { ignoredFiles = new Set() } = {},
) {
  const payload = new Map();

  async function visit(currentDirectory) {
    const entries = await readdir(currentDirectory, { withFileTypes: true });
    for (const entry of entries) {
      const absolutePath = path.join(currentDirectory, entry.name);
      const relativePath = webPath(path.relative(directory, absolutePath));

      if (entry.isDirectory()) {
        await visit(absolutePath);
        continue;
      }

      if (entry.isFile()) {
        if (ignoredFiles.has(relativePath)) continue;

        const contents = await readFile(absolutePath);
        payload.set(relativePath, {
          bytes: contents.byteLength,
          sha256: sha256(contents),
        });
        continue;
      }

      throw new Error(`Unsupported web payload entry: ${relativePath}`);
    }
  }

  await visit(directory);
  return payload;
}

export function compareWebPayloads(sourcePayload, nativePayload) {
  const missingFromNative = [];
  const unexpectedInNative = [];
  const changed = [];

  for (const [relativePath, sourceFile] of sourcePayload) {
    const nativeFile = nativePayload.get(relativePath);
    if (!nativeFile) {
      missingFromNative.push(relativePath);
      continue;
    }

    if (
      sourceFile.bytes !== nativeFile.bytes ||
      sourceFile.sha256 !== nativeFile.sha256
    ) {
      changed.push(relativePath);
    }
  }

  for (const relativePath of nativePayload.keys()) {
    if (!sourcePayload.has(relativePath)) unexpectedInNative.push(relativePath);
  }

  missingFromNative.sort();
  unexpectedInNative.sort();
  changed.sort();

  return {
    inSync:
      missingFromNative.length === 0 &&
      unexpectedInNative.length === 0 &&
      changed.length === 0,
    sourceFileCount: sourcePayload.size,
    nativeFileCount: nativePayload.size,
    missingFromNative,
    unexpectedInNative,
    changed,
  };
}

export function parsePlatforms(args = []) {
  const platforms = [];

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    let platform = "";

    if (argument === "--platform") {
      platform = args[index + 1] ?? "";
      index += 1;
    } else if (argument.startsWith("--platform=")) {
      platform = argument.slice("--platform=".length);
    } else {
      throw new Error(
        `Unknown argument: ${argument}. Use --platform android or --platform ios.`,
      );
    }

    if (!platform) {
      throw new Error(
        "Missing platform value. Use --platform android or --platform ios.",
      );
    }
    if (!Object.hasOwn(NATIVE_WEB_ROOTS, platform)) {
      throw new Error(`Unsupported platform: ${platform}. Use android or ios.`);
    }
    if (!platforms.includes(platform)) platforms.push(platform);
  }

  return platforms.length > 0 ? platforms : Object.keys(NATIVE_WEB_ROOTS);
}

function resolveNativeRoot(repoRoot, nativeRoot) {
  return path.isAbsolute(nativeRoot)
    ? nativeRoot
    : path.join(repoRoot, nativeRoot);
}

export async function checkNativeWebSync({
  repoRoot = DEFAULT_REPO_ROOT,
  platforms = Object.keys(NATIVE_WEB_ROOTS),
  nativeRoots = NATIVE_WEB_ROOTS,
} = {}) {
  const sourceRoot = path.join(repoRoot, "dist");
  let sourcePayload;

  try {
    sourcePayload = await readWebPayload(sourceRoot);
  } catch (error) {
    return platforms.map((platform) => ({
      platform,
      inSync: false,
      sourceFileCount: 0,
      nativeFileCount: 0,
      missingFromNative: [],
      unexpectedInNative: [],
      changed: [],
      error: `Could not read dist: ${error.message}`,
    }));
  }

  return Promise.all(
    platforms.map(async (platform) => {
      const nativeRootValue = nativeRoots[platform];
      if (!nativeRootValue) {
        return {
          platform,
          inSync: false,
          sourceFileCount: sourcePayload.size,
          nativeFileCount: 0,
          missingFromNative: [],
          unexpectedInNative: [],
          changed: [],
          error: `No native web root configured for ${platform}`,
        };
      }

      const nativeRoot = resolveNativeRoot(repoRoot, nativeRootValue);
      try {
        const nativePayload = await readWebPayload(nativeRoot, {
          ignoredFiles: CAPACITOR_GENERATED_PUBLIC_FILES,
        });
        return {
          platform,
          ...compareWebPayloads(sourcePayload, nativePayload),
        };
      } catch (error) {
        return {
          platform,
          inSync: false,
          sourceFileCount: sourcePayload.size,
          nativeFileCount: 0,
          missingFromNative: [],
          unexpectedInNative: [],
          changed: [],
          error: `Could not read ${nativeRoot}: ${error.message}`,
        };
      }
    }),
  );
}

function nativeRootsFromEnvironment() {
  return {
    android:
      process.env.ZIVO_NATIVE_WEB_ROOT_ANDROID || NATIVE_WEB_ROOTS.android,
    ios: process.env.ZIVO_NATIVE_WEB_ROOT_IOS || NATIVE_WEB_ROOTS.ios,
  };
}

function platformLabel(platform) {
  return platform === "ios" ? "iOS" : "Android";
}

export async function main(args = process.argv.slice(2)) {
  let platforms;
  try {
    platforms = parsePlatforms(args);
  } catch (error) {
    console.error(`! ${error.message}`);
    process.exitCode = 1;
    return;
  }

  const checks = await checkNativeWebSync({
    platforms,
    nativeRoots: nativeRootsFromEnvironment(),
  });
  for (const check of checks) {
    const label = platformLabel(check.platform);
    if (check.error) {
      console.error(`! ${label} native web payload check failed: ${check.error}`);
      process.exitCode = 1;
      continue;
    }
    if (check.inSync) {
      console.log(
        `✓ ${label} native web payload matches dist (${check.sourceFileCount} files).`,
      );
      continue;
    }

    console.error(
      `! ${label} native web payload does not match dist ` +
        `(missing ${check.missingFromNative.length}, unexpected ${check.unexpectedInNative.length}, changed ${check.changed.length}). ` +
        `Run npm run ${check.platform}:sync.`,
    );
    process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === scriptPath) {
  main().catch((error) => {
    console.error(`! Native web payload check failed: ${error.message}`);
    process.exitCode = 1;
  });
}
