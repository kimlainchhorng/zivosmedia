import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  path.join(
    process.cwd(),
    "supabase/migrations/20260830161008_release_backend_security_reconciliation.sql",
  ),
  "utf8",
);

const adminFunctions = [
  "admin_ack_security_incident(uuid)",
  "admin_audit_unforced_rls()",
  "admin_auth_lockouts(integer)",
  "admin_clear_auth_lockout(text)",
  "admin_clear_chat_sender_block(uuid)",
  "admin_force_auth_quarantine(text, integer, text)",
];

describe("Admin SECURITY DEFINER execution privileges", () => {
  it.each(adminFunctions)("removes anonymous access to %s", (signature) => {
    expect(migration).toContain(
      `revoke execute on function public.${signature}\n  from public, anon, authenticated;`,
    );
    expect(migration).toContain(
      `grant execute on function public.${signature}\n  to authenticated, service_role;`,
    );
  });
});
