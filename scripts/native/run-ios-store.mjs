#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  inspectIosSourceRelease,
  validateIosArchive,
  validateIosIpa,
  validateIosNativeSourcePayload,
} from "../upload-to-app-store.mjs";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "../..");
const action = process.argv[2] || "all";
const teamId = process.env.IOS_DEVELOPMENT_TEAM || "9KWY67J6LX";
const archiveName =
  process.env.IOS_ARCHIVE_NAME ||
  path.basename(root).replace(/[^a-z0-9_-]+/gi, "_");

const projectPath = path.join(root, "ios/App/App.xcodeproj");
const exportOptionsPlist = path.join(root, "ios/App/ExportOptions.plist");
const archivePath = path.join(root, "ios/build", `${archiveName}.xcarchive`);
const exportPath = path.join(root, "ios/build/export", archiveName);
const ipaPath = path.join(exportPath, "App.ipa");

if (!["archive", "export", "all"].includes(action)) {
  console.error("Pass one of: archive, export, all");
  process.exit(1);
}

if (!fs.existsSync(projectPath)) {
  console.error(`Missing Xcode project: ${path.relative(root, projectPath)}`);
  process.exit(1);
}

if (!fs.existsSync(exportOptionsPlist)) {
  console.error(
    `Missing export options: ${path.relative(root, exportOptionsPlist)}`,
  );
  process.exit(1);
}

function run(command, args) {
  console.log(`\n${command} ${args.join(" ")}`);
  execFileSync(command, args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });
}

async function main() {
  const source = inspectIosSourceRelease({ repoRoot: root });
  console.log(
    `Validated iOS source release ${source.identity.marketingVersion} (${source.identity.buildNumber}), including App target privacy-manifest packaging.`,
  );

  let archiveValidation = null;
  if (action === "archive" || action === "all") {
    const payload = await validateIosNativeSourcePayload({ repoRoot: root });
    console.log(
      `Validated current iOS native web payload (${payload.sourceFileCount} dist files).`,
    );

    run("xcodebuild", [
      "-project",
      projectPath,
      "-scheme",
      "App",
      "-configuration",
      "Release",
      "-destination",
      "generic/platform=iOS",
      "-archivePath",
      archivePath,
      "-allowProvisioningUpdates",
      "archive",
      `DEVELOPMENT_TEAM=${teamId}`,
      "CODE_SIGN_STYLE=Automatic",
    ]);

    archiveValidation = await validateIosArchive({
      repoRoot: root,
      archivePath,
    });
    console.log(
      `Validated archive app root manifest and current web payload at ${path.relative(root, archiveValidation.appPath)}.`,
    );
  }

  if (action === "export" || action === "all") {
    if (!archiveValidation) {
      archiveValidation = await validateIosArchive({
        repoRoot: root,
        archivePath,
      });
      console.log(
        `Validated existing archive release, app-root manifest, and web payload before export (${archiveValidation.identity.marketingVersion} (${archiveValidation.identity.buildNumber})).`,
      );
    }

    run("xcodebuild", [
      "-exportArchive",
      "-archivePath",
      archivePath,
      "-exportPath",
      exportPath,
      "-exportOptionsPlist",
      exportOptionsPlist,
      "-allowProvisioningUpdates",
    ]);

    const ipaValidation = await validateIosIpa({
      repoRoot: root,
      ipaPath,
    });
    console.log(
      `Validated exported IPA version, app-root manifest, and current web payload (${ipaValidation.webFileCount} dist files).`,
    );
  }
}

main().catch((error) => {
  console.error(`iOS store release stopped: ${error.message}`);
  process.exitCode = 1;
});
