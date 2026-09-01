import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  path.join(process.cwd(), "src/pages/admin/AdminAuthShieldPage.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("admin Auth Shield truthfulness", () => {
  it("labels legacy telemetry and removes controls that no longer enforce sign-in", () => {
    expect(source).toContain("Custom Auth Shield enforcement is unavailable");
    expect(source).toContain("not enforced on direct password sign-in");
    expect(source).toContain("Supabase Auth provider");
    expect(source).toMatch(/historical and\s+may\s+be stale/);

    expect(source).not.toContain('rpc("admin_force_auth_quarantine"');
    expect(source).not.toContain('rpc("admin_clear_auth_lockout"');
    expect(source).not.toContain("Force 6h");
    expect(source).not.toContain("Clear Lock");
    expect(source).not.toContain("Active Lockouts");
  });
});
