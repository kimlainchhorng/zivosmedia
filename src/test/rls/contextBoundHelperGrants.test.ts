import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260714001218_harden_rls_helper_caller_identity.sql",
  ),
  "utf8",
);

const manageChannelPage = readFileSync(
  resolve(process.cwd(), "src/pages/channels/ManageChannelPage.tsx"),
  "utf8",
);

const notifyAppUpdate = readFileSync(
  resolve(process.cwd(), "supabase/functions/notify-app-update/index.ts"),
  "utf8",
);

const contextBoundHelpers = [
  "public.has_role(uuid,public.app_role)",
  "public.has_role(uuid,text)",
  "public.is_admin()",
  "public.is_admin(uuid)",
  "public.is_store_owner(uuid)",
  "public.is_store_owner(uuid,uuid)",
  "public.is_lodge_store_owner(uuid)",
  "public.is_trip_participant(uuid,uuid)",
];

const signedInOnlyChatHelpers = [
  "public.is_chat_member(uuid)",
  "public.is_chat_participant(uuid,uuid)",
];

describe("context-bound RLS helper grants", () => {
  it("binds parameterized role, ownership, and trip checks to the JWT subject", () => {
    expect(migration).toContain("auth.uid() as uid, auth.role() as jwt_role");
    expect(migration).toContain(
      "when _user_id is not null and _user_id is distinct from caller.uid then false",
    );
    expect(migration.match(/when caller\.uid is null then false/g)).toHaveLength(4);
    expect(migration).toContain(
      "select public.has_role(coalesce(user_uuid, auth.uid()), 'admin'::public.app_role);",
    );
  });

  it("keeps trusted server-side authorization compatible without trusting browser input", () => {
    expect(migration).toContain("when caller.jwt_role = 'service_role' then exists");
    expect(migration).toContain("grant execute on function %s to service_role");
  });

  it("removes the default PUBLIC grant and explicitly permits only the context-bound anon predicates", () => {
    for (const signature of contextBoundHelpers) {
      expect(migration).toContain(`('${signature}', true)`);
    }
    expect(migration).toContain("revoke execute on function %s from public");
    expect(migration).toContain("revoke execute on function %s from anon");
    expect(migration).toContain("grant execute on function %s to authenticated");
    expect(migration).toContain("if target.allow_anonymous then");
    expect(migration).toContain("grant execute on function %s to anon");
  });

  it("returns chat membership helpers to signed-in-only execution", () => {
    for (const signature of signedInOnlyChatHelpers) {
      expect(migration).toContain(`('${signature}', false)`);
    }
  });

  it("keeps direct is_admin RPC callers on the existing user_uuid argument contract", () => {
    expect(manageChannelPage).toContain('rpc("is_admin", { user_uuid: userId })');
    expect(notifyAppUpdate).toContain('rpc("is_admin", { user_uuid: user.id })');
  });
});
