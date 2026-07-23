import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(new URL("./zivo-ride-production-boundary-contracts.mjs", import.meta.url));
const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

test("canonical Ride production boundary contracts pass", () => {
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  const report = JSON.parse(result.stdout);
  assert.ok(report.counts.checks >= 90);
  assert.equal(report.counts.failures, 0);
});
