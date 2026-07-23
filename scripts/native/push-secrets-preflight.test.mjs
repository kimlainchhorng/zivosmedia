#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const root = path.resolve(new URL("../..", import.meta.url).pathname);
const script = path.join(root, "scripts/native/push-secrets-preflight.mjs");

function runWithEnvFile(contents, extraEnv = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "zivosmedia-push-preflight-"));
  const envFile = path.join(dir, ".env.push.production.local");
  fs.writeFileSync(envFile, contents);
  return spawnSync(process.execPath, [script, "--env-file", envFile], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, ...extraEnv },
  });
}

const fakeFcm = JSON.stringify({
  type: "service_account",
  project_id: "zivo-test-project",
  client_email: "firebase-adminsdk-test@zivo-test-project.iam.gserviceaccount.com",
  private_key: "-----BEGIN PRIVATE KEY-----\nTEST_KEY_FOR_PREFLIGHT_ONLY\n-----END PRIVATE KEY-----\n",
});

const validFixture = `
FCM_SERVICE_ACCOUNT_JSON='${fakeFcm}'
APNS_KEY_ID=ABC123DEFG
APNS_TEAM_ID=9KWY67J6LX
APNS_PRIVATE_KEY='-----BEGIN PRIVATE KEY-----\\nTEST_APNS_KEY_FOR_PREFLIGHT_ONLY\\n-----END PRIVATE KEY-----'
APNS_BUNDLE_ID=com.hizovo.app
APNS_ENV=production
VAPID_PUBLIC_KEY=BN_TEST_PUBLIC_KEY_FOR_PREFLIGHT_ONLY_1234567890
VAPID_PRIVATE_KEY=TEST_PRIVATE_KEY_FOR_PREFLIGHT_ONLY_1234567890
VAPID_SUBJECT=mailto:owner@example.com
VITE_VAPID_PUBLIC_KEY=BN_TEST_PUBLIC_KEY_FOR_PREFLIGHT_ONLY_1234567890
`;

test("customer push secret preflight accepts valid test-only shapes", () => {
  const result = runWithEnvFile(validFixture);

  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /READY: push secret shapes are valid/);
  assert.doesNotMatch(result.stdout, /TEST_KEY_FOR_PREFLIGHT_ONLY/);
  assert.doesNotMatch(result.stdout, /TEST_PRIVATE_KEY_FOR_PREFLIGHT_ONLY/);
});

test("customer push secret preflight rejects production APNs mismatch", () => {
  const result = runWithEnvFile(validFixture.replace("APNS_ENV=production", "APNS_ENV=development"));

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /APNs environment is production/);
  assert.match(result.stdout, /push secret blockers found/);
});

test("customer push secret preflight rejects mismatched browser VAPID key", () => {
  const result = runWithEnvFile(validFixture, {
    VITE_VAPID_PUBLIC_KEY: "BN_DIFFERENT_PUBLIC_KEY_FOR_PREFLIGHT_ONLY_1234567890",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stdout, /GitHub\/browser VAPID public key matches Supabase/);
});
