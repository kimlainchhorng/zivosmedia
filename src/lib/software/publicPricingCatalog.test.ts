import { describe, expect, it } from "vitest";

import {
  parseSoftwarePricingCatalog,
  SoftwarePricingCatalogError,
} from "./publicPricingCatalog";

const validRow = {
  id: "gold",
  display_name: "Gold",
  currency: "usd",
  monthly_plan_id: "7f7816a2-020f-4cca-91f8-2ca52decb3eb",
  annual_plan_id: "dfadbf9b-e70c-4054-a4ec-b3e546a2c890",
  monthly_amount_cents: 2_999,
  annual_amount_cents: 29_990,
  trial_days: 14,
  tagline: "For a growing repair operation.",
  features: ["Customer and vehicle records"],
  limits: { workspace: "One auto-repair workspace" },
  support: "Email support",
  cancellation_terms: "Cancel at period end; access continues through the current billing period.",
  featured: true,
  sort_order: 20,
};

describe("parseSoftwarePricingCatalog", () => {
  it("normalizes and sorts a strictly valid server catalog", () => {
    const plans = parseSoftwarePricingCatalog([
      validRow,
      {
        ...validRow,
        id: "base",
        display_name: "Base",
        monthly_plan_id: "35a1a617-2a37-4bb5-91be-8518c1425390",
        annual_plan_id: "71703a39-970c-4973-a931-f589b22cbc2a",
        featured: false,
        sort_order: 10,
      },
    ]);

    expect(plans.map((plan) => plan.id)).toEqual(["base", "gold"]);
    expect(plans[1]).toMatchObject({
      currency: "USD",
      monthlyPlanId: "7f7816a2-020f-4cca-91f8-2ca52decb3eb",
      annualPlanId: "dfadbf9b-e70c-4054-a4ec-b3e546a2c890",
      monthlyAmountCents: 2_999,
      annualAmountCents: 29_990,
      trialDays: 14,
      cancellationTerms: "Cancel at period end; access continues through the current billing period.",
    });
  });

  it.each([
    ["empty", []],
    ["missing currency", [{ ...validRow, currency: undefined }]],
    ["unsupported currency", [{ ...validRow, currency: "eur" }]],
    ["invalid monthly plan id", [{ ...validRow, monthly_plan_id: "gold-monthly" }]],
    ["reused interval id", [{ ...validRow, annual_plan_id: validRow.monthly_plan_id }]],
    ["fractional amount", [{ ...validRow, monthly_amount_cents: 29.99 }]],
    ["duplicate plan", [validRow, validRow]],
    ["missing features", [{ ...validRow, features: [] }]],
    ["missing cancellation terms", [{ ...validRow, cancellation_terms: undefined }]],
  ])("rejects a %s catalog without creating a browser fallback", (_label, payload) => {
    expect(() => parseSoftwarePricingCatalog(payload)).toThrow(SoftwarePricingCatalogError);
  });
});
