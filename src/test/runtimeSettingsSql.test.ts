import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const runtimeSettings = path.join(root, "scripts/supabase/runtime-settings-sql.mjs");

function fakeJwt(payload: Record<string, unknown>) {
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value), "utf8").toString("base64url");

  return `${encode({ alg: "HS256", typ: "JWT" })}.${encode(payload)}.signature`;
}

describe("Supabase runtime settings SQL", () => {
  it("renders redacted SQL from project ref and anon JWT", () => {
    const result = spawnSync(
      process.execPath,
      [runtimeSettings, "--project-ref", "example", "--anon-key", fakeJwt({ role: "anon" })],
      { cwd: root, encoding: "utf8", env: { PATH: process.env.PATH ?? "" } },
    );

    expect(result.status).toBe(0);
    expect(result.stdout).toContain("https://example.supabase.co");
    expect(result.stdout).toContain("app.settings.supabase_url");
    expect(result.stdout).toContain("app.settings.supabase_anon_key");
    expect(result.stdout).toContain("<redacted: set SUPABASE_ANON_KEY and rerun with --emit-secrets>");
    expect(result.stdout).not.toContain(".signature");
  });

  it("rejects Supabase management tokens as database cron anon auth", () => {
    const result = spawnSync(
      process.execPath,
      [runtimeSettings, "--strict", "--url", "https://example.supabase.co", "--anon-key", `sbp_${"a".repeat(40)}`],
      { cwd: root, encoding: "utf8", env: { PATH: process.env.PATH ?? "" } },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Refusing to use a Supabase management access token");
  });

  it("rejects service-role JWTs as database cron anon auth", () => {
    const result = spawnSync(
      process.execPath,
      [runtimeSettings, "--strict", "--url", "https://example.supabase.co", "--anon-key", fakeJwt({ role: "service_role" })],
      { cwd: root, encoding: "utf8", env: { PATH: process.env.PATH ?? "" } },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Refusing to use a Supabase secret/service_role key");
  });
});
