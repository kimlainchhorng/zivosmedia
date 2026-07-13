import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const migration = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260605030807_lockdown_scheduled_maintenance_function_grants.sql",
  ),
  "utf8",
);

const maintenanceFunctions = [
  "cleanup_expired_device_link_tokens",
  "cafe_auto_expire_pending_orders",
  "salon_auto_expire_pending_bookings",
  "run_ad_boost_auction",
];

describe("scheduled maintenance function grant lockdown", () => {
  it.each(maintenanceFunctions)(
    "removes direct browser execution for %s",
    (functionName) => {
      expect(migration).toContain(`revoke execute on function public.${functionName}() from public`);
      expect(migration).toContain(`revoke execute on function public.${functionName}() from anon`);
      expect(migration).toContain(
        `revoke execute on function public.${functionName}() from authenticated`,
      );
      expect(migration).toContain(`grant execute on function public.${functionName}() to service_role`);
    },
  );
});
