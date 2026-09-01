import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("password login attempt authority", () => {
  it("keeps account existence and login outcomes out of the browser", () => {
    const auth = source("src/contexts/AuthContext.tsx");
    const login = source("src/pages/Login.tsx");

    expect(auth).toContain("supabase.auth.signInWithPassword");
    expect(auth).toContain('supabase.functions.invoke("log-login"');
    expect(auth).not.toContain('rpc("auth_precheck_login"');
    expect(auth).not.toContain('rpc("auth_record_login_attempt"');
    expect(auth).not.toContain("_emailExists");

    expect(login).toContain("Email or password is incorrect.");
    expect(login).not.toContain("No account found for this email.");
    expect(login).not.toContain("Wrong password — please try again.");
    expect(login).not.toContain("_emailExists");
  });

  it("removes every browser role from the legacy privileged helpers", () => {
    const migration = source(
      "supabase/migrations/20260831000449_harden_auth_login_attempt_boundary.sql",
    );

    expect(migration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.auth_precheck_login(TEXT, TEXT)",
    );
    expect(migration).toContain(
      "REVOKE EXECUTE ON FUNCTION public.auth_record_login_attempt(TEXT, BOOLEAN, TEXT)",
    );
    expect(migration.match(/FROM PUBLIC, anon, authenticated;/g)).toHaveLength(
      2,
    );
    expect(migration.match(/TO service_role;/g)).toHaveLength(2);
  });
});
