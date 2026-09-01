import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseAuthoritativeRateLimit } from "../../supabase/functions/_shared/authoritativeRateLimit";

const root = process.cwd();
const read = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8");

describe("Duffel authoritative quota", () => {
  const now = Date.parse("2026-08-30T12:00:00.000Z");
  const resetAt = new Date(now + 60_000).toISOString();
  const malformedResults: unknown[] = [
    null,
    [],
    [{ allowed: true, remaining: "29", reset_at: resetAt }],
    [{ allowed: true, remaining: 29, reset_at: "invalid" }],
    [{ allowed: true, remaining: -1, reset_at: resetAt }],
  ];

  it("reproduces the RPC-error boundary as unavailable and denied", () => {
    expect(
      parseAuthoritativeRateLimit(
        {
          data: null,
          error: { code: "PGRST202", message: "function is missing" },
        },
        now,
      ),
    ).toEqual({
      available: false,
      allowed: false,
      remaining: 0,
      resetAt: now + 30_000,
      retryAfter: 30,
    });
  });

  it.each(malformedResults)(
    "fails closed for malformed authoritative data: %j",
    (data) => {
      expect(
        parseAuthoritativeRateLimit({ data, error: null }, now),
      ).toMatchObject({
        available: false,
        allowed: false,
      });
    },
  );

  it("preserves a legitimate allowed database decision", () => {
    expect(
      parseAuthoritativeRateLimit(
        {
          data: [{ allowed: true, remaining: 17, reset_at: resetAt }],
          error: null,
        },
        now,
      ),
    ).toEqual({
      available: true,
      allowed: true,
      remaining: 17,
      resetAt: now + 60_000,
      retryAfter: undefined,
    });
  });

  it("preserves an authoritative denial and retry window", () => {
    expect(
      parseAuthoritativeRateLimit(
        {
          data: [{ allowed: false, remaining: 0, reset_at: resetAt }],
          error: null,
        },
        now,
      ),
    ).toEqual({
      available: true,
      allowed: false,
      remaining: 0,
      resetAt: now + 60_000,
      retryAfter: 60,
    });
  });
});

describe("Duffel source and database reconciliation contract", () => {
  it("keeps paid supplier calls closed when either quota authority fails", () => {
    const source = read("supabase/functions/duffel-flights/index.ts");

    expect(source).toContain("parseAuthoritativeRateLimit(result)");
    expect(source).toContain("if (!rl.available)");
    expect(source).toContain("status: 503");
    expect(source).toContain("incrementError.code === 'P0001'");
    expect(source).toContain(
      "incrementError.message === 'flight_daily_search_cap_reached'",
    );
    expect(source).toContain("throw incrementError");
    expect(source).not.toContain("Allow on error to not block searches");
  });

  it("keeps an already-cached result available when usage accounting is unavailable", () => {
    const source = read("supabase/functions/duffel-flights/index.ts");
    const cacheHit = source.indexOf("if (cached.hit && cached.data)");
    const cachedAccounting = source.indexOf(
      "await checkAndUpdateApiUsage(false)",
      cacheHit,
    );
    const cachedReturn = source.indexOf("fromCache: true", cachedAccounting);

    expect(cacheHit).toBeGreaterThan(-1);
    expect(cachedAccounting).toBeGreaterThan(cacheHit);
    expect(cachedReturn).toBeGreaterThan(cachedAccounting);
    expect(source.slice(cacheHit, cachedReturn)).not.toContain(
      "if (!limitsCheck.allowed)",
    );
  });

  it("contains the exact service-only database authorities needed by the function", () => {
    const migration = read(
      "supabase/migrations/20260830161008_release_backend_security_reconciliation.sql",
    );

    expect(migration).toContain(
      "create or replace function public.rate_limit_check(",
    );
    expect(migration).toContain("for update;");
    expect(migration).toContain(
      "grant execute on function public.rate_limit_check(text, text, integer, integer)\n  to service_role;",
    );
    expect(migration).toContain(
      "create or replace function public.increment_flight_api_usage(is_cached boolean)",
    );
    expect(migration).toContain(
      "grant execute on function public.increment_flight_api_usage(boolean)\n  to service_role;",
    );
  });

  it("serializes concurrent live reservations before checking and incrementing the daily cap", () => {
    const migration = read(
      "supabase/migrations/20260830161008_release_backend_security_reconciliation.sql",
    );
    const start = migration.indexOf(
      "create or replace function public.increment_flight_api_usage",
    );
    const end = migration.indexOf(
      "revoke all on function public.increment_flight_api_usage",
      start,
    );
    const reservation = migration.slice(start, end);
    const rowLock = reservation.indexOf("for update;");
    const missingCap = reservation.indexOf(
      "flight_daily_search_cap_unavailable",
    );
    const capCheck = reservation.indexOf(
      "v_searches_live >= v_daily_search_cap",
    );
    const denial = reservation.indexOf("flight_daily_search_cap_reached");
    const increment = reservation.indexOf(
      "set searches_total = searches_total + 1",
    );

    expect(reservation).toContain("on conflict (date) do nothing");
    expect(reservation).toContain("select coalesce(usage.searches_live, 0)");
    expect(rowLock).toBeGreaterThan(-1);
    expect(reservation).toContain(
      "if not found or v_daily_search_cap is null then",
    );
    expect(missingCap).toBeGreaterThan(rowLock);
    expect(capCheck).toBeGreaterThan(missingCap);
    expect(denial).toBeGreaterThan(capCheck);
    expect(increment).toBeGreaterThan(denial);
    expect(reservation).toContain(
      "searches_cached = searches_cached + case when is_cached then 1 else 0 end",
    );
    expect(reservation).toContain(
      "searches_live = searches_live + case when is_cached then 0 else 1 end",
    );
  });

  it("fails a live reservation closed when no active daily cap is available", () => {
    const migration = read(
      "supabase/migrations/20260830161008_release_backend_security_reconciliation.sql",
    );
    const start = migration.indexOf(
      "create or replace function public.increment_flight_api_usage",
    );
    const end = migration.indexOf(
      "revoke all on function public.increment_flight_api_usage",
      start,
    );
    const reservation = migration.slice(start, end);
    const liveBranch = reservation.indexOf("if not is_cached then");
    const missingCapGuard = reservation.indexOf(
      "if not found or v_daily_search_cap is null then",
    );
    const unavailable = reservation.indexOf(
      "flight_daily_search_cap_unavailable",
    );
    const increment = reservation.indexOf(
      "set searches_total = searches_total + 1",
    );

    expect(liveBranch).toBeGreaterThan(-1);
    expect(missingCapGuard).toBeGreaterThan(liveBranch);
    expect(unavailable).toBeGreaterThan(missingCapGuard);
    expect(increment).toBeGreaterThan(unavailable);
  });
});
