import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  manualSoftwareAccessGranted,
  stripeSoftwareAccessGranted,
} from "../../supabase/functions/_shared/softwareAccess";

const root = process.cwd();
const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("ZIVO Software workspace access", () => {
  it("grants provider access only for active and trialing Stripe state", () => {
    expect(stripeSoftwareAccessGranted("active")).toBe(true);
    expect(stripeSoftwareAccessGranted("trialing")).toBe(true);
    for (const status of ["past_due", "unpaid", "incomplete", "paused", "cancelled", "expired"]) {
      expect(stripeSoftwareAccessGranted(status), status).toBe(false);
    }
  });

  it("accepts only unexpired manual active or trialing entitlements", () => {
    const now = Date.parse("2026-07-14T12:00:00.000Z");
    const future = "2026-07-15T12:00:00.000Z";
    const past = "2026-07-13T12:00:00.000Z";

    expect(manualSoftwareAccessGranted({ status: "active" }, now)).toBe(true);
    expect(manualSoftwareAccessGranted({ status: "active", current_period_end: future }, now)).toBe(true);
    expect(manualSoftwareAccessGranted({ status: "active", current_period_end: past }, now)).toBe(false);
    expect(manualSoftwareAccessGranted({ status: "trialing", trial_end: future }, now)).toBe(true);
    expect(manualSoftwareAccessGranted({ status: "trialing" }, now)).toBe(false);
    expect(manualSoftwareAccessGranted({ status: "past_due", current_period_end: future }, now)).toBe(false);
    expect(manualSoftwareAccessGranted({
      status: "active",
      provider_subscription_id: "sub_not_manual",
    }, now)).toBe(false);
    expect(manualSoftwareAccessGranted({
      status: "active",
      payment_subscription_id: "123e4567-e89b-42d3-a456-426614174000",
    }, now)).toBe(false);
  });

  it("checks tenant category and owner before the server-derived paid gate", () => {
    const guard = source("src/components/auth/ProtectedRoute.tsx");
    const status = source("supabase/functions/software-subscription-status/index.ts");

    expect(guard).toContain('select("id, category")');
    expect(guard).toContain("softwareStoreScopeAllowed");
    expect(guard).toContain("ownerAccessAllowed &&");
    expect(guard).toContain("softwareAccessQuery.data?.access_granted === true");
    expect(guard).toContain("isSoftwareSubscriptionRoute");
    expect(guard).toMatch(
      /getZivoSoftwareSubscriptionPath\(\s*storeId,\s*location\.search,\s*location\.hash,?\s*\)/,
    );
    expect(status).toContain("await assertBusinessOwner(admin, user.id, businessId)");
    expect(status).toContain("stripeSoftwareAccessGranted(subscription?.status)");
    expect(status).toContain("manualSoftwareAccessGranted(entitlement)");
  });
});
