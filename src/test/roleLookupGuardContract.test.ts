/**
 * Pins two database hardening changes so a later migration cannot quietly
 * undo them.
 *
 * 1. has_role(uuid, ...) and is_admin(uuid) used to answer for ANY user id with
 *    no auth check, and both were reachable by anon. Since user ids appear on
 *    public profiles, that was an unauthenticated way to test which accounts
 *    are admins.
 *
 *    The guard has to key off auth.uid()/auth.role(). It cannot use
 *    current_user: inside a SECURITY DEFINER function that is always the
 *    owner, so such a guard passes for everyone — the first attempt did
 *    exactly that and let the probe straight through.
 *
 * 2. prune_phone_otps() was SECURITY DEFINER with a mutable search_path and an
 *    EXECUTE grant reaching anon via PUBLIC.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const roleGuard = read(
  "supabase/migrations/20260829192614_restrict_role_lookups_to_self_or_server.sql",
);
const otpHardening = read(
  "supabase/migrations/20260829185141_harden_prune_phone_otps.sql",
);
const otpPublicRevoke = read(
  "supabase/migrations/20260829185221_revoke_prune_phone_otps_from_public.sql",
);

describe("role lookup guard", () => {
  it.each([
    "public.has_role(_user_id uuid, _role app_role)",
    "public.has_role(_user_id uuid, _role text)",
    "public.is_admin(user_uuid uuid default null::uuid)",
  ])("redefines %s", (signature) => {
    expect(roleGuard.toLowerCase()).toContain(`create or replace function ${signature}`);
  });

  it("answers only for the caller, a service_role caller, or a non-HTTP context", () => {
    // Self, server-side, and trigger/cron/direct-SQL respectively.
    expect(roleGuard).toContain("is not distinct from auth.uid()");
    expect(roleGuard).toContain("auth.role() = 'service_role'");
    expect(roleGuard).toContain("auth.role() is null");
  });

  it("does not guard on current_user, which is the owner inside SECURITY DEFINER", () => {
    expect(roleGuard).not.toMatch(/current_user\s+in\s*\(/i);
  });

  it("resolves is_admin's NULL default before comparing, so is_admin() still means self", () => {
    expect(roleGuard).toContain("coalesce(user_uuid, auth.uid()) is not distinct from auth.uid()");
  });

  it("drops the temporary verification probe", () => {
    expect(roleGuard).toContain("drop function if exists public.has_role_probe");
  });
});

describe("prune_phone_otps hardening", () => {
  it("pins the search_path on the SECURITY DEFINER function", () => {
    expect(otpHardening).toContain(
      "alter function public.prune_phone_otps() set search_path = public, pg_temp",
    );
  });

  it("revokes the PUBLIC grant, which is what anon actually inherited", () => {
    // Revoking from anon/authenticated alone was a no-op: neither held an
    // explicit grant.
    expect(otpPublicRevoke).toContain(
      "revoke execute on function public.prune_phone_otps() from public",
    );
  });
});
