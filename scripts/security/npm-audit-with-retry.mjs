#!/usr/bin/env node
// Wrapper for `npm audit --audit-level=moderate` that retries ONLY npm-registry
// outages. On 2026-09-04 the registry advisory endpoint timed out three times in
// one day (the owner's preflight run, a local run, and CI), each turning the
// Security gate red with "audit endpoint returned an error" despite a clean
// tree. A real audit finding, or any other failure, exits non-zero on the first
// attempt — this wrapper exists for the outage case, never to soften the gate.
import { spawnSync } from "node:child_process";

const AUDIT_ARGS = ["audit", "--audit-level=moderate"];
const RETRY_DELAYS_MS = [30_000, 60_000, 120_000];
// Both signatures must appear: the timeout warning names the bulk advisory
// endpoint, and npm summarizes the same failed request as "audit endpoint
// returned an error". A findings-only run prints neither, so a vulnerable tree
// can never be mistaken for an outage.
const OUTAGE_SIGNATURE = [
  /network timeout at: https:\/\/registry\.npmjs\.org\//,
  /audit endpoint returned an error/,
];

function isRegistryOutage(output) {
  return OUTAGE_SIGNATURE.every((re) => re.test(output));
}

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

let attempt = 0;
for (;;) {
  attempt += 1;
  const result = spawnSync("npm", AUDIT_ARGS, { encoding: "utf8" });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;

  if (result.status === 0) {
    process.stdout.write(output);
    process.exit(0);
  }

  if (attempt <= RETRY_DELAYS_MS.length && isRegistryOutage(output)) {
    const delay = RETRY_DELAYS_MS[attempt - 1];
    process.stderr.write(
      `[security:audit] npm registry outage: attempt ${attempt} failed with the ` +
        `advisory-endpoint timeout (tree unchanged, no findings evaluated). ` +
        `Retrying in ${delay / 1000}s.\n`,
    );
    sleepSync(delay);
    continue;
  }

  process.stdout.write(output);
  process.exit(result.status ?? 1);
}
