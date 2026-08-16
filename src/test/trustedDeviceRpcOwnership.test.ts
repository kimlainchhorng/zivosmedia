import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260809185000_harden_trusted_device_rpc_ownership.sql";
const migration = readFileSync(path.join(root, migrationPath), "utf8").replace(/\r\n/g, "\n");

function functionBody(name: string) {
  const match = migration.match(
    new RegExp(`CREATE OR REPLACE FUNCTION public\\.${name}[\\s\\S]*?AS \\$\\$([\\s\\S]*?)\\$\\$;`),
  );

  expect(match, `${name} must be defined by the trusted-device ownership migration`).not.toBeNull();
  return match?.[1] ?? "";
}

describe("trusted-device RPC ownership migration", () => {
  it("removes the vulnerable legacy registration overload and preserves the current client signature", () => {
    expect(migration).toContain(
      "DROP FUNCTION IF EXISTS public.register_trusted_device(uuid, text, text, text);",
    );
    expect(migration).toMatch(
      /CREATE OR REPLACE FUNCTION public\.register_trusted_device\(\s*_user_id uuid,\s*_device_fingerprint text,\s*_device_name text DEFAULT NULL,\s*_device_type text DEFAULT NULL,\s*_ip_address text DEFAULT NULL/s,
    );
  });

  it.each([
    ["register_trusted_device", "INSERT INTO public.trusted_devices"],
    ["remove_trusted_device", "DELETE FROM public.trusted_devices"],
  ])("rejects cross-account %s before the database mutation", (name, mutation) => {
    const body = functionBody(name);
    const guard = "IF (SELECT auth.uid()) IS DISTINCT FROM _user_id THEN";

    expect(body).toContain(guard);
    expect(body).toContain("RAISE EXCEPTION 'Can only");
    expect(body.indexOf(guard)).toBeLessThan(body.indexOf(mutation));
  });

  it("keeps both SECURITY DEFINER RPCs unavailable to anonymous callers", () => {
    for (const signature of [
      "public.register_trusted_device(uuid, text, text, text, text)",
      "public.remove_trusted_device(uuid, text)",
    ]) {
      expect(migration).toContain(`REVOKE ALL ON FUNCTION ${signature} FROM PUBLIC;`);
      expect(migration).toContain(`REVOKE ALL ON FUNCTION ${signature} FROM anon;`);
      expect(migration).toContain(`GRANT EXECUTE ON FUNCTION ${signature} TO authenticated;`);
      expect(migration).toContain(`GRANT EXECUTE ON FUNCTION ${signature} TO service_role;`);
    }
  });
});
