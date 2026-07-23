import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const ipaPath = path.resolve(root, "ios/build/export/zivosmedia/App.ipa");
const summaryPath = path.resolve(root, "ios/build/export/zivosmedia/DistributionSummary.plist");
const confirmUpload = process.env.ZIVO_APP_STORE_UPLOAD_CONFIRM === "UPLOAD_APP";

const apiKey = process.env.APP_STORE_CONNECT_API_KEY_ID || process.env.ASC_API_KEY_ID || "";
const apiIssuer = process.env.APP_STORE_CONNECT_API_ISSUER_ID || process.env.ASC_API_ISSUER_ID || "";
const apiKeyPath = process.env.APP_STORE_CONNECT_API_KEY_PATH || process.env.ASC_API_KEY_PATH || "";
const username = process.env.APP_STORE_CONNECT_USERNAME || process.env.ASC_USERNAME || "";
const passwordEnv = [
  "APP_STORE_CONNECT_PASSWORD",
  "APP_SPECIFIC_PASSWORD",
  "FASTLANE_APPLE_APPLICATION_SPECIFIC_PASSWORD",
].find((name) => process.env[name]);
const providerPublicId = process.env.APP_STORE_CONNECT_PROVIDER_PUBLIC_ID || process.env.ASC_PROVIDER_PUBLIC_ID || "";

function readPlistJson(plistPath) {
  if (!fs.existsSync(plistPath)) {
    return null;
  }

  const result = spawnSync("plutil", ["-convert", "json", "-o", "-", plistPath], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    throw new Error(`Could not read ${path.relative(root, plistPath)}: ${result.stderr || result.stdout}`);
  }

  return JSON.parse(result.stdout);
}

function assertReady() {
  if (!fs.existsSync(ipaPath)) {
    throw new Error(`Missing App Store IPA: ${path.relative(root, ipaPath)}`);
  }

  const altool = spawnSync("xcrun", ["altool", "--help"], {
    encoding: "utf8",
  });

  if (altool.status !== 0) {
    throw new Error("Missing xcrun altool. Install/select Xcode before uploading to App Store Connect.");
  }
}

function buildAuthArgs() {
  if (apiKey && apiIssuer) {
    const args = ["--api-key", apiKey, "--api-issuer", apiIssuer];
    if (apiKeyPath) {
      if (!fs.existsSync(apiKeyPath)) {
        throw new Error(`APP_STORE_CONNECT_API_KEY_PATH does not exist: ${apiKeyPath}`);
      }
      args.push("--p8-file-path", apiKeyPath);
    }
    return {
      description: apiKeyPath ? "App Store Connect API key with explicit p8 path" : "App Store Connect API key",
      args,
    };
  }

  if (username && passwordEnv) {
    const args = ["--username", username, "--password", `@env:${passwordEnv}`];
    if (providerPublicId) {
      args.push("--provider-public-id", providerPublicId);
    }
    return {
      description: `Apple ID username with app-specific password from ${passwordEnv}`,
      args,
    };
  }

  return null;
}

function getExportedAppSummary() {
  const summary = readPlistJson(summaryPath);
  const app = summary?.["App.ipa"]?.find?.((item) => item?.name === "App.app") || summary?.["App.ipa"]?.[0];
  return {
    name: app?.name || "App.app",
    version: app?.versionNumber || "unknown",
    build: app?.buildNumber || "unknown",
    teamId: app?.team?.id || "unknown",
    certificate: app?.certificate?.type || "unknown",
    profile: app?.profile?.name || "unknown",
  };
}

function main() {
  assertReady();
  const app = getExportedAppSummary();
  const auth = buildAuthArgs();

  console.log("App Store Connect IPA upload helper");
  console.log(`IPA: ${path.relative(root, ipaPath)}`);
  console.log(`Bundle: com.hizovo.app`);
  console.log(`Release: ${app.version} (${app.build})`);
  console.log(`Team: ${app.teamId}`);
  console.log(`Signing: ${app.certificate}`);
  console.log(`Profile: ${app.profile}`);
  console.log(`Upload auth: ${auth ? auth.description : "missing"}`);

  if (!confirmUpload) {
    console.log("\nDry run only. To upload the IPA to App Store Connect processing, rerun with:");
    console.log("ZIVO_APP_STORE_UPLOAD_CONFIRM=UPLOAD_APP npm run ios:upload:app-store");
    console.log("\nSupported auth:");
    console.log("- APP_STORE_CONNECT_API_KEY_ID + APP_STORE_CONNECT_API_ISSUER_ID");
    console.log("- optional APP_STORE_CONNECT_API_KEY_PATH for the AuthKey .p8 file");
    console.log("- or APP_STORE_CONNECT_USERNAME + APP_SPECIFIC_PASSWORD");
    return;
  }

  if (!auth) {
    throw new Error("Missing App Store Connect upload credentials. Refusing to upload.");
  }

  const args = [
    "altool",
    "--upload-package",
    ipaPath,
    ...auth.args,
    "--output-format",
    "json",
    "--show-progress",
  ];

  console.log("\nUploading IPA to App Store Connect. This creates a build for processing; it does not submit for review.");
  const result = spawnSync("xcrun", args, {
    cwd: root,
    stdio: "inherit",
    env: process.env,
  });

  if (result.status !== 0) {
    process.exitCode = result.status || 1;
    return;
  }

  console.log("\nUpload finished. Wait for App Store Connect processing, then review TestFlight/App Store metadata manually.");
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
