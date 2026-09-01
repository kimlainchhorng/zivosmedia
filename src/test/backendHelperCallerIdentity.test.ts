import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migration = readFileSync(
  path.join(
    root,
    "supabase/migrations/20260831000607_harden_backend_helper_caller_identity.sql",
  ),
  "utf8",
)
  .replace(/\r\n/g, "\n")
  .toLowerCase();

function functionBody(startMarker: string, endMarker: string): string {
  const start = migration.indexOf(startMarker);
  const end = migration.indexOf(endMarker, start);

  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return migration.slice(start, end);
}

describe("backend helper caller identity", () => {
  it("moves the lodging implementation out of the exposed schema and gates its wrapper", () => {
    const wrapper = functionBody(
      "create or replace function public.lodging_wiring_report()",
      "revoke all on function public.lodging_wiring_report()",
    );

    expect(migration).toContain(
      "alter function public.lodging_wiring_report_internal() set schema private",
    );
    expect(migration).toContain(
      "revoke all on function private.lodging_wiring_report_internal()\n  from public, anon, authenticated, service_role",
    );
    expect(wrapper).toContain("v_caller_role <> 'service_role'");
    expect(wrapper).toContain(
      "public.has_role(v_actor_id, 'admin'::public.app_role)",
    );
    expect(wrapper).toContain(
      "public.has_role(v_actor_id, 'super_admin'::public.app_role)",
    );
    expect(wrapper).toContain(
      "return private.lodging_wiring_report_internal()",
    );
  });

  it.each([
    [
      "get_or_create_referral_code",
      "create or replace function public.get_or_create_referral_code(p_user_id uuid)",
      "revoke all on function public.get_or_create_referral_code(uuid)",
      "referral_user_mismatch",
    ],
    [
      "track_user_interest",
      "create or replace function public.track_user_interest(",
      "revoke all on function public.track_user_interest(uuid, text, text, numeric)",
      "interest_user_mismatch",
    ],
  ])(
    "binds %s to the authenticated subject",
    (_name, start, end, errorCode) => {
      const body = functionBody(start, end);

      expect(body).toContain("v_caller_role <> 'service_role'");
      expect(body).toContain(
        "v_actor_id is null or p_user_id is distinct from v_actor_id",
      );
      expect(body).toContain(`raise exception '${errorCode}'`);
      expect(body).toContain("using errcode = '42501'");
    },
  );

  it("rejects anonymous cafe forecasts while preserving owner and service operation", () => {
    const body = functionBody(
      "create or replace function public.cafe_prep_forecast(",
      "revoke all on function public.cafe_prep_forecast(uuid, date, integer)",
    );

    expect(body).toContain("v_caller_role <> 'service_role'");
    expect(body).toContain("v_actor_id is null");
    expect(body).toContain("stores.owner_id = v_actor_id");
    expect(body).toContain(
      "raise exception 'cafe_prep_forecast_store_owner_required'",
    );
    expect(body).not.toContain("if auth.uid() is not null then");
  });

  it("removes inherited anonymous execution from every hardened endpoint", () => {
    for (const signature of [
      "public.lodging_wiring_report()",
      "public.get_or_create_referral_code(uuid)",
      "public.track_user_interest(uuid, text, text, numeric)",
      "public.cafe_prep_forecast(uuid, date, integer)",
    ]) {
      expect(migration).toContain(`revoke all on function ${signature}`);
    }

    expect(migration).toContain(
      "pg_catalog.has_function_privilege('anon', v_signature, 'execute')",
    );
    expect(migration).not.toMatch(
      /grant execute[\s\S]{0,160}\bto\s+(public|anon)\b/,
    );
  });

  it("keeps the existing frontend RPC signatures compatible", () => {
    const referrals = readFileSync(
      path.join(root, "src/hooks/useReferrals.ts"),
      "utf8",
    );
    const interests = readFileSync(
      path.join(root, "src/hooks/useTrackInterest.ts"),
      "utf8",
    );
    const cafe = readFileSync(
      path.join(root, "src/hooks/cafe/useCafePrepForecast.ts"),
      "utf8",
    );

    expect(referrals).toContain("p_user_id: user.id");
    expect(interests).toContain("p_user_id: user.id");
    expect(cafe).toContain("p_store_id: storeId");
  });
});
