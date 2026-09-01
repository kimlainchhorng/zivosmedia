import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

const root = process.cwd();
const script = path.join(root, "scripts/qa/edge-function-slot-readiness.mjs");
const temporaryDirectories: string[] = [];

function runWithSnapshot(
  functions: Array<{ slug: string; verify_jwt?: boolean }>,
) {
  const directory = mkdtempSync(path.join(tmpdir(), "zivo-edge-policy-"));
  temporaryDirectories.push(directory);
  const snapshot = path.join(directory, "functions.json");
  writeFileSync(snapshot, `${JSON.stringify({ functions })}\n`);
  return spawnSync(
    process.execPath,
    [script, "--ignore-known-live-gap", `--live-snapshot=${snapshot}`],
    { cwd: root, encoding: "utf8" },
  );
}

afterEach(() => {
  while (temporaryDirectories.length) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe("critical Edge Function verify_jwt drift", () => {
  const expected = [
    { slug: "supplier-proxy", verify_jwt: true },
    { slug: "send-transactional-email", verify_jwt: false },
    { slug: "software-subscription-intent", verify_jwt: false },
  ];

  it("accepts the exact source/live policy contract", () => {
    const result = runWithSnapshot(expected);

    expect(result.status, result.stderr || result.stdout).toBe(0);
    const report = JSON.parse(result.stdout);
    for (const entry of expected) {
      expect(report.readiness).toContainEqual(
        expect.objectContaining({
          slug: entry.slug,
          configVerifyJwt: entry.verify_jwt,
          liveVerifyJwt: entry.verify_jwt,
        }),
      );
    }
  });

  it.each([
    ["send-transactional-email", true, false],
    ["software-subscription-intent", true, false],
  ] as const)(
    "blocks release when %s live verify_jwt=%s instead of %s",
    (slug, liveValue, expectedValue) => {
      const result = runWithSnapshot(
        expected.map((entry) =>
          entry.slug === slug ? { ...entry, verify_jwt: liveValue } : entry,
        ),
      );

      expect(result.status).toBe(1);
      const report = JSON.parse(result.stdout);
      expect(report.failures).toContain(
        `${slug}: live verify_jwt=${liveValue} does not match source expectation ${expectedValue}`,
      );
    },
  );

  it("blocks release when a live snapshot omits verify_jwt evidence", () => {
    const result = runWithSnapshot([
      { slug: "supplier-proxy", verify_jwt: true },
      { slug: "send-transactional-email" },
      { slug: "software-subscription-intent", verify_jwt: false },
    ]);

    expect(result.status).toBe(1);
    const report = JSON.parse(result.stdout);
    expect(report.failures).toContain(
      "send-transactional-email: live snapshot is missing verify_jwt policy data",
    );
  });
});
