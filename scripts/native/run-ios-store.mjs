#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(new URL("../..", import.meta.url).pathname);
const action = process.argv[2] || "all";
const teamId = process.env.IOS_DEVELOPMENT_TEAM || "9KWY67J6LX";
const archiveName = process.env.IOS_ARCHIVE_NAME || path.basename(root).replace(/[^a-z0-9_-]+/gi, "_");

const projectPath = path.join(root, "ios/App/App.xcodeproj");
const exportOptionsPlist = path.join(root, "ios/App/ExportOptions.plist");
const archivePath = path.join(root, "ios/build", `${archiveName}.xcarchive`);
const exportPath = path.join(root, "ios/build/export", archiveName);

if (!["archive", "export", "all"].includes(action)) {
  console.error("Pass one of: archive, export, all");
  process.exit(1);
}

if (!fs.existsSync(projectPath)) {
  console.error(`Missing Xcode project: ${path.relative(root, projectPath)}`);
  process.exit(1);
}

if (!fs.existsSync(exportOptionsPlist)) {
  console.error(`Missing export options: ${path.relative(root, exportOptionsPlist)}`);
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

if (action === "archive" || action === "all") {
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
}
if (action === "export" || action === "all") {
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
}
