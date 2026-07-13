#!/usr/bin/env node
/**
 * ZIVO OTA Update Deploy Script
 * Usage: npm run deploy:update
 *        npm run deploy:update:immediate -- --message="Critical fix"
 *
 * Requires .env.deploy with:
 *   SUPABASE_URL=https://<project-ref>.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY=eyJ...
 */

import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// Load deploy env vars
config({ path: join(ROOT, ".env.deploy") });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "app-updates";
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const activationModeFlags = ["--immediate", "--next-launch"].filter((flag) => args.includes(flag));
const DEFAULT_MAX_BUNDLE_SIZE_BYTES = 50 * 1024 * 1024;
const ALLOW_LARGE_BUNDLE_ACK = "I_UNDERSTAND_THE_OTA_SIZE_RISK";
const MAX_RELEASE_MESSAGE_LENGTH = 240;

function readOption(name) {
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);

  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1] && !args[index + 1].startsWith("--")) return args[index + 1];

  return null;
}

const activation = args.includes("--immediate")
  ? "immediate"
  : args.includes("--next-launch")
    ? "next_launch"
    : "prompt";
const mandatory = args.includes("--mandatory") || activation === "immediate";
const message = readOption("--message");
const releaseMessage = message?.trim() ?? "";
const minNativeVersion = readOption("--min-native-version");

function parseSemver(value, label) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(String(value ?? ""));
  if (!match) {
    throw new Error(`${label} must be a valid semver version like 1.2.3.`);
  }

  return match.slice(1).map(Number);
}

function formatBytes(value) {
  return `${value} bytes`;
}

function readMaxBundleSizeBytes() {
  const value = Number(process.env.ZIVO_OTA_MAX_BUNDLE_SIZE_BYTES || DEFAULT_MAX_BUNDLE_SIZE_BYTES);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("ZIVO_OTA_MAX_BUNDLE_SIZE_BYTES must be a positive number.");
  }

  return value;
}

const maxBundleSizeBytes = (() => {
  try {
    return readMaxBundleSizeBytes();
  } catch (error) {
    console.error(`\nERROR: ${error instanceof Error ? error.message : String(error)}\n`);
    process.exit(1);
  }
})();

function assertBundleSize(bundleSizeBytes) {
  if (bundleSizeBytes <= maxBundleSizeBytes) return;
  if (process.env.ZIVO_ALLOW_LARGE_OTA_BUNDLE === ALLOW_LARGE_BUNDLE_ACK) {
    console.warn(`Warning: OTA bundle size ${formatBytes(bundleSizeBytes)} exceeds limit ${formatBytes(maxBundleSizeBytes)}; override acknowledged.`);
    return;
  }

  throw new Error(`OTA bundle size ${formatBytes(bundleSizeBytes)} exceeds limit ${formatBytes(maxBundleSizeBytes)}. Set ZIVO_ALLOW_LARGE_OTA_BUNDLE=${ALLOW_LARGE_BUNDLE_ACK} only for an approved emergency release.`);
}

if (activationModeFlags.length > 1) {
  console.error(`\nERROR: Choose only one OTA activation mode flag: ${activationModeFlags.join(", ")}.`);
  console.error("Use prompt mode with no activation flag, --next-launch for quiet install, or --immediate for urgent reloads.\n");
  process.exit(1);
}

if (args.includes("--mandatory") && activation === "prompt") {
  console.error("\nERROR: --mandatory requires an explicit OTA activation mode.");
  console.error("Use --next-launch --mandatory for a required next-launch install or --immediate for an urgent forced reload.\n");
  process.exit(1);
}

if (!dryRun && (!SUPABASE_URL || !SERVICE_ROLE_KEY)) {
  console.error("\nERROR: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not found.");
  console.error("Create .env.deploy with:");
  console.error("  SUPABASE_URL=https://<project-ref>.supabase.co");
  console.error("  SUPABASE_SERVICE_ROLE_KEY=<service-role-key>\n");
  process.exit(1);
}

if (args.includes("--skip-preflight") && process.env.ZIVO_ALLOW_OTA_SKIP_PREFLIGHT !== "I_UNDERSTAND_THE_RELEASE_RISK") {
  console.error("\nERROR: --skip-preflight requires ZIVO_ALLOW_OTA_SKIP_PREFLIGHT=I_UNDERSTAND_THE_RELEASE_RISK.");
  console.error("Run the strict preflight gate for normal OTA releases. Use this bypass only for documented emergency recovery.\n");
  process.exit(1);
}

if (mandatory && !releaseMessage) {
  console.error("\nERROR: immediate or mandatory OTA updates require --message=\"Release reason\".");
  console.error("Use the message to describe the customer-visible reason for the forced reload.\n");
  process.exit(1);
}

if (releaseMessage.length > MAX_RELEASE_MESSAGE_LENGTH) {
  console.error(`\nERROR: OTA release message must be ${MAX_RELEASE_MESSAGE_LENGTH} characters or fewer.\n`);
  process.exit(1);
}

const pkgPath = join(ROOT, "package.json");
const originalPackageJson = readFileSync(pkgPath, "utf8");
const pkg = JSON.parse(originalPackageJson);
let currentVersionParts;
try {
  currentVersionParts = parseSemver(pkg.version, "package.json version");
  if (minNativeVersion) parseSemver(minNativeVersion, "--min-native-version");
} catch (error) {
  console.error(`\nERROR: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exit(1);
}

if (!args.includes("--skip-preflight")) {
  const preflightCommand = dryRun
    ? "node scripts/deploy/preflight.mjs --skip-build --skip-type-check"
    : "node scripts/deploy/preflight.mjs --strict --skip-build";
  console.log(dryRun ? "\nRunning local dry-run preflight..." : "\nRunning production preflight...");
  execSync(preflightCommand, { cwd: ROOT, stdio: "inherit" });
}

// ── 1. Bump patch version ────────────────────────────────────────────────────
const [major, minor, patch] = currentVersionParts;
const newVersion = `${major}.${minor}.${patch + 1}`;
if (dryRun) {
  console.log(`\nDry run: validating ZIVO v${newVersion} without package write or Supabase upload...`);
} else {
  pkg.version = newVersion;
  writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`\nDeploying ZIVO v${newVersion}...`);
}

const zipName = `zivo-v${newVersion}.zip`;
const zipPath = join(ROOT, zipName);
let supabase = null;
let uploadedBundle = false;

function assertValidActivation(value) {
  if (!["prompt", "next_launch", "immediate"].includes(value)) {
    throw new Error(`Invalid OTA activation value: ${value}`);
  }
}

function assertValidManifestVersion(value) {
  try {
    parseSemver(value, "OTA version");
  } catch {
    throw new Error(`Invalid OTA version value: ${String(value)}`);
  }
}

function assertValidManifestUrl(value) {
  if (typeof value !== "string") {
    throw new Error(`Invalid OTA manifest URL value: ${String(value)}`);
  }

  if (dryRun) {
    const expectedDryRunUrl = `dry-run://${zipName}`;
    if (value !== expectedDryRunUrl) {
      throw new Error(`Invalid OTA dry-run URL value: ${value}`);
    }
    return;
  }

  assertAllowedBundleUrl(value);
}

function assertValidCreatedAt(value) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp > Date.now() + 5 * 60 * 1000) {
    throw new Error(`Invalid OTA manifest createdAt timestamp: ${value}`);
  }
}

function assertValidMandatory(value) {
  if (typeof value !== "boolean") {
    throw new Error(`Invalid OTA mandatory value: ${String(value)}`);
  }
}

function assertValidActivationConsistency(value, activationValue) {
  if (value && activationValue === "prompt") {
    throw new Error("Invalid OTA activation consistency: mandatory prompt updates are not allowed");
  }
  if (activationValue === "immediate" && value !== true) {
    throw new Error("Invalid OTA activation consistency: immediate updates must be mandatory");
  }
}

function assertValidChecksum(value) {
  if (typeof value !== "string" || !/^[a-f0-9]{64}$/i.test(value)) {
    throw new Error(`Invalid OTA checksum value: ${String(value)}`);
  }
}

function assertValidBundleSizeBytes(value) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Invalid OTA bundleSizeBytes value: ${String(value)}`);
  }
}

function assertValidOptionalMinNativeVersion(value) {
  if (value === undefined) return;
  try {
    parseSemver(value, "OTA minNativeVersion");
  } catch {
    throw new Error(`Invalid OTA minNativeVersion value: ${String(value)}`);
  }
}

function assertValidOptionalMessage(value) {
  if (value === undefined) return;
  if (typeof value !== "string" || value.trim() !== value || value.length === 0 || value.length > MAX_RELEASE_MESSAGE_LENGTH) {
    throw new Error(`Invalid OTA message value: ${String(value)}`);
  }
}

function assertValidManifestPayload(payload) {
  assertValidManifestVersion(payload.version);
  assertValidManifestUrl(payload.url);
  assertValidActivation(payload.activation);
  assertValidMandatory(payload.mandatory);
  assertValidActivationConsistency(payload.mandatory, payload.activation);
  assertValidChecksum(payload.checksum);
  assertValidBundleSizeBytes(payload.bundleSizeBytes);
  assertValidCreatedAt(payload.createdAt);
  assertValidOptionalMinNativeVersion(payload.minNativeVersion);
  assertValidOptionalMessage(payload.message);
}

function createManifestPayload(url, checksum, bundleSizeBytes) {
  const manifestPayload = {
    version: newVersion,
    url,
    checksum,
    bundleSizeBytes,
    createdAt: new Date().toISOString(),
    activation,
    mandatory,
    ...(releaseMessage ? { message: releaseMessage } : {}),
    ...(minNativeVersion ? { minNativeVersion } : {}),
  };
  assertValidManifestPayload(manifestPayload);
  return manifestPayload;
}

function assertAllowedBundleUrl(url) {
  try {
    const bundleUrl = new URL(url);
    const supabaseUrl = new URL(SUPABASE_URL);
    const expectedObjectPath = `/storage/v1/object/public/${BUCKET}/${zipName}`;

    if (
      bundleUrl.protocol !== "https:"
      || bundleUrl.host !== supabaseUrl.host
      || bundleUrl.search !== ""
      || bundleUrl.hash !== ""
      || decodeURIComponent(bundleUrl.pathname) !== expectedObjectPath
    ) {
      throw new Error(`Unexpected OTA bundle URL: ${url}`);
    }
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Unexpected OTA bundle URL")) throw error;
    throw new Error(`Invalid OTA bundle URL: ${url}`);
  }
}

try {
  // ── 2. Build ─────────────────────────────────────────────────────────────────
  console.log("\nBuilding...");
  execSync("npm run build", { cwd: ROOT, stdio: "inherit" });

  // ── 3. Zip dist/ ─────────────────────────────────────────────────────────────
  if (existsSync(zipPath)) unlinkSync(zipPath);

  console.log("\nZipping dist/...");
  const distPath = join(ROOT, "dist");
  if (process.platform === "win32") {
    execSync(
      `powershell -command "Compress-Archive -Path '${distPath}\\*' -DestinationPath '${zipPath}' -Force"`,
      { stdio: "inherit" }
    );
  } else {
    execSync(`cd "${distPath}" && zip -r "${zipPath}" .`, { stdio: "inherit", shell: true });
  }

  const zipData = await readFile(zipPath);
  const checksum = createHash("sha256").update(zipData).digest("hex");
  const bundleSizeBytes = zipData.byteLength;
  assertBundleSize(bundleSizeBytes);
  if (dryRun) {
    const manifestPayload = createManifestPayload(`dry-run://${zipName}`, checksum, bundleSizeBytes);
    try {
      unlinkSync(zipPath);
    } catch (cleanupError) {
      console.warn(`Warning: dry run completed but local zip cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
    }

    console.log(`
OTA dry run complete. No package.json changes were written and nothing was uploaded.

Bundle: ${zipName}
Bundle size: ${bundleSizeBytes} bytes
Checksum: ${checksum}
Manifest preview:
${JSON.stringify(manifestPayload, null, 2)}
`);
  } else {
    // ── 4. Upload bundle to Supabase Storage ─────────────────────────────────────
    supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Ensure bucket exists and is public
    const { data: buckets } = await supabase.storage.listBuckets();
    if (!buckets?.find((b) => b.name === BUCKET)) {
      console.log(`\nCreating storage bucket '${BUCKET}'...`);
      await supabase.storage.createBucket(BUCKET, { public: true });
    }

    console.log("\nUploading bundle...");
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(zipName, zipData, {
        contentType: "application/zip",
        cacheControl: "31536000",
        upsert: true,
      });

    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    uploadedBundle = true;

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(zipName);
    assertAllowedBundleUrl(publicUrl);

    // ── 5. Update latest.json ─────────────────────────────────────────────────────
    console.log("\nUpdating latest.json...");
    const manifestPayload = createManifestPayload(publicUrl, checksum, bundleSizeBytes);
    const manifest = JSON.stringify(manifestPayload, null, 2);
    const { error: manifestError } = await supabase.storage
      .from(BUCKET)
      .upload("latest.json", Buffer.from(manifest), {
        contentType: "application/json",
        cacheControl: "0",
        upsert: true,
      });

    if (manifestError) {
      throw new Error(`Failed to update manifest: ${manifestError.message}`);
    }

    // ── 6. Cleanup ────────────────────────────────────────────────────────────────
    try {
      unlinkSync(zipPath);
    } catch (cleanupError) {
      console.warn(`Warning: update published but local zip cleanup failed: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`);
    }

    console.log(`
Done! ZIVO v${newVersion} is now live.

Users on iOS & Android will download the update silently
in the background and get it on next app launch.

Bundle URL: ${publicUrl}
Bundle size: ${bundleSizeBytes} bytes
Checksum: ${checksum}
Activation: ${activation}${mandatory ? " (required)" : ""}
`);
  }
} catch (error) {
  if (!dryRun) writeFileSync(pkgPath, originalPackageJson);
  if (existsSync(zipPath)) unlinkSync(zipPath);
  if (uploadedBundle && supabase) {
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([zipName]);
    if (removeError) {
      console.error(`Failed to remove uploaded OTA bundle ${zipName}: ${removeError.message}`);
    } else {
      console.error(`Removed uploaded OTA bundle ${zipName}.`);
    }
  }
  console.error(dryRun ? "\nOTA dry run failed. No package.json changes were written." : "\nOTA deploy failed. Restored package.json version bump.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
