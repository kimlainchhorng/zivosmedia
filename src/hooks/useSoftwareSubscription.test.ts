import { describe, expect, it } from "vitest";

import { normalizeSoftwareSubscription } from "./useSoftwareSubscription";

describe("normalizeSoftwareSubscription", () => {
  it("fills shared billing fields for the dedicated Software response", () => {
    expect(normalizeSoftwareSubscription({
      plan: "gold",
      cycle: "annual",
      status: "active",
      current_period_end: "2026-09-01T00:00:00.000Z",
      trial_end: null,
      cancel_at_period_end: false,
      amount_cents: null,
      interval: "year",
    })).toMatchObject({
      id: "legacy-software-subscription",
      plan: "gold",
      cycle: "annual",
      status: "active",
      billing_portal_available: true,
      reconciliation_required: false,
      access_granted: true,
    });
  });

  it("preserves explicit shared response flags", () => {
    expect(normalizeSoftwareSubscription({
      id: "entitlement-1",
      plan_id: "gold",
      plan: "Gold",
      cycle: null,
      status: "expired",
      interval: null,
      billing_portal_available: false,
      reconciliation_required: true,
      access_granted: false,
    })).toEqual({
      id: "entitlement-1",
      plan_id: "gold",
      plan: "Gold",
      cycle: null,
      status: "expired",
      current_period_end: null,
      trial_end: null,
      cancel_at_period_end: false,
      amount_cents: null,
      currency: null,
      interval: null,
      billing_portal_available: false,
      reconciliation_required: true,
      access_granted: false,
    });
  });

  it("does not grant access for a legacy billing-blocking status", () => {
    expect(normalizeSoftwareSubscription({
      plan: "gold",
      status: "past_due",
      cycle: "monthly",
    })).toMatchObject({
      billing_portal_available: true,
      access_granted: false,
    });
  });

  it("fails closed for an empty or malformed response", () => {
    expect(normalizeSoftwareSubscription(null)).toBeNull();
    expect(normalizeSoftwareSubscription({ plan: "gold" })).toBeNull();
  });
});
