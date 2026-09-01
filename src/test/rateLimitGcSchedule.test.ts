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

describe("authoritative rate-limit retention", () => {
  it("removes stale buckets and schedules bounded cleanup", () => {
    expect(migration).toContain("where updated_at < now() - interval '1 day';");
    expect(migration).toContain("jobname = 'zivo-rate-limit-gc-hourly'");
    expect(migration).toContain("perform cron.unschedule(existing_job_id);");
    expect(migration).toContain("'select public.rate_limit_gc();'");
  });

  it("keeps the cleanup RPC service-only", () => {
    expect(migration).toContain(
      "revoke all on function public.rate_limit_gc() from public, anon, authenticated;",
    );
    expect(migration).toContain(
      "grant execute on function public.rate_limit_gc() to service_role;",
    );
  });
});
