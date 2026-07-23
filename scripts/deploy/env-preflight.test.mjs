import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("./env-preflight.mjs", import.meta.url));
const publishableKeyPrefix = "sb_" + "publishable_";
const baseEnv = {
  VITE_SUPABASE_URL: "https://slirphzzwcogdbkeicff.supabase.co",
  VITE_SUPABASE_PUBLISHABLE_KEY: `${publishableKeyPrefix}test`,
};

function runPreflight(rideAppUrl) {
  const cwd = mkdtempSync(path.join(tmpdir(), "zivo-env-preflight-"));
  const env = { ...baseEnv };
  if (rideAppUrl !== undefined) env.VITE_ZIVO_RIDE_APP_URL = rideAppUrl;

  try {
    const result = spawnSync(process.execPath, [scriptPath], {
      cwd,
      env,
      encoding: "utf8",
    });
    return {
      status: result.status,
      summary: JSON.parse(result.stdout),
      stderr: result.stderr,
    };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test("accepts the canonical Ride subdomain", () => {
  const result = runPreflight("https://ride.zivosmedia.com");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.summary.checked.zivoRideAppUrl, true);
});

test("fails closed when the Ride URL is missing", () => {
  const result = runPreflight();
  assert.equal(result.status, 1);
  assert.ok(result.summary.findings.some(({ id }) => id === "zivo-ride-app-url-missing"));
});

test("rejects an untrusted Ride host", () => {
  const result = runPreflight("https://ride.example.com");
  assert.equal(result.status, 1);
  assert.ok(result.summary.findings.some(({ id }) => id === "zivo-ride-app-url-untrusted-host"));

  const siblingResult = runPreflight("https://preview.zivosmedia.com");
  assert.equal(siblingResult.status, 1);
  assert.ok(siblingResult.summary.findings.some(({ id }) => id === "zivo-ride-app-url-untrusted-host"));
});

test("rejects every alternate Ride path, including canonical-host variants", () => {
  for (const value of [
    "https://zivosmedia.com/ride",
    "https://www.zivosmedia.com/ride",
    "https://ride.zivosmedia.com/ride",
    "https://ride.zivosmedia.com/",
  ]) {
    const result = runPreflight(value);
    assert.equal(result.status, 1);
    assert.ok(result.summary.findings.some(({ id }) => id === "zivo-ride-app-url-not-canonical"));
  }
});

test("rejects Ride base URLs with ambient query or fragment state", () => {
  for (const value of [
    "https://ride.zivosmedia.com?redirect=https://evil.example",
    "https://ride.zivosmedia.com/#/unexpected",
  ]) {
    const result = runPreflight(value);
    assert.equal(result.status, 1);
    assert.ok(result.summary.findings.some(({ id }) => id === "zivo-ride-app-url-state"));
  }
});
