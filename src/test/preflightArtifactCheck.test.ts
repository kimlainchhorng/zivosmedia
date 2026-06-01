import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const checker = join(root, "scripts/deploy/check-preflight-artifacts.mjs");

describe("preflight artifact checker", () => {
  it("reports the requested alternate summary path when the file is missing", () => {
    const file = join(mkdtempSync(join(tmpdir(), "zivo-artifacts-")), "missing-summary.json");
    const result = spawnSync(process.execPath, [checker, "--summary-path", file], {
      cwd: root,
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "" },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Missing");
    expect(result.stderr).toContain(file);
  });

  it("reports the requested alternate summary path when JSON is invalid", () => {
    const file = join(mkdtempSync(join(tmpdir(), "zivo-artifacts-")), "bad-summary.json");
    writeFileSync(file, "{not-json\n");

    const result = spawnSync(process.execPath, [checker, "--summary-path", file], {
      cwd: root,
      encoding: "utf8",
      env: { PATH: process.env.PATH ?? "" },
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Could not parse");
    expect(result.stderr).toContain(file);
  });
});
