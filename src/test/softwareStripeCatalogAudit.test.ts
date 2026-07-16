import { describe, expect, it, vi } from "vitest";

import {
  STRIPE_API_VERSION,
  buildCatalogAudit,
  createStripeReadOnlyClient,
  redactSecretValues,
  renderHumanAudit,
  resolveStripeAuditMode,
} from "../../scripts/stripe/audit-software-catalog.mjs";
import { softwareStripeCatalogFixture } from "./fixtures/softwareStripeCatalogFixture";

function fixtureReport() {
  return buildCatalogAudit({
    mode: "test",
    products: [...softwareStripeCatalogFixture.products],
    prices: [...softwareStripeCatalogFixture.prices],
    subscriptions: [...softwareStripeCatalogFixture.subscriptions],
    generatedAt: softwareStripeCatalogFixture.generatedAt,
  });
}

describe("ZIVO Software Stripe catalog read-only audit", () => {
  it("finds name and metadata candidates, usage, duplicate products, and orphan prices", () => {
    const report = fixtureReport();

    expect(report.summary.softwareProducts).toBe(5);
    expect(report.products.map((product: { id: string }) => product.id)).not.toContain("prod_fixture_unrelated");
    expect(report.products.find((product: { id: string }) => product.id === "prod_fixture_gold")?.heuristicReasons)
      .toContain("metadata:zivo-software");
    expect(report.products.find((product: { id: string }) => product.id === "prod_fixture_gold")?.metadata.support_email)
      .toBe("[REDACTED]");
    expect(report.products.find((product: { id: string }) => product.id === "prod_fixture_base_primary")?.metadata.api_key)
      .toBe("[REDACTED]");

    expect(report.duplicateProducts).toEqual([
      expect.objectContaining({ tier: "base", subscriptionUsageCount: 3 }),
    ]);
    expect(report.orphanPrices).toEqual([
      expect.objectContaining({
        priceId: "price_fixture_platinum_month_orphan",
        reasons: expect.arrayContaining(["product_reference_deleted", "product_not_returned_by_catalog"]),
      }),
    ]);

    const baseMonthly = report.prices.find((price: { id: string }) => price.id === "price_fixture_base_month");
    expect(baseMonthly?.usage).toEqual({
      subscriptionCount: 2,
      quantity: 2,
      statuses: { active: 1, canceled: 1 },
    });
  });

  it("compares all eight stable lookup keys to safe database mappings", () => {
    const report = fixtureReport();
    const statuses = Object.fromEntries(
      report.expectedDatabasePlanMapping.map((mapping: { expectedLookupKey: string; status: string }) => [
        mapping.expectedLookupKey,
        mapping.status,
      ]),
    );

    expect(statuses).toEqual({
      software_base_monthly: "ready",
      software_base_annual: "ready",
      software_gold_monthly: "duplicate_lookup_key",
      software_gold_annual: "missing",
      software_platinum_monthly: "missing_product",
      software_platinum_annual: "inactive_price",
      software_pro_monthly: "cadence_mismatch",
      software_pro_annual: "ready",
    });

    const baseMonthly = report.expectedDatabasePlanMapping.find(
      (mapping: { expectedLookupKey: string }) => mapping.expectedLookupKey === "software_base_monthly",
    );
    expect(baseMonthly?.expectedDatabaseRow).toEqual(expect.objectContaining({
      table: "public.software_pricing_plans",
      softwareProductSlug: "zivo-auto-repair",
      provider: "stripe",
      providerPriceId: "price_fixture_base_month",
      planName: "Base",
      billingInterval: "month",
      amount: 999,
      currency: "usd",
      active: true,
    }));
    expect(
      report.expectedDatabasePlanMapping.find(
        (mapping: { expectedLookupKey: string }) => mapping.expectedLookupKey === "software_gold_monthly",
      )?.expectedDatabaseRow.providerPriceId,
    ).toBeNull();
  });

  it("redacts provider ids and sensitive metadata in human output while JSON remains structured", () => {
    const report = fixtureReport();
    const human = renderHumanAudit(report);

    expect(human).toContain("GET requests only");
    expect(human).toContain("software_base_monthly");
    expect(human).toContain("[REDACTED]");
    expect(human).not.toContain("prod_fixture_base_primary");
    expect(human).not.toContain("price_fixture_base_month");
    expect(JSON.parse(JSON.stringify(report))).toEqual(expect.objectContaining({
      schemaVersion: 1,
      safety: expect.objectContaining({ mutationsSupported: false }),
    }));
  });

  it("refuses live keys without the explicit read-only live flag", () => {
    const testKey = ["sk", "test", "fixture"].join("_");
    const liveKey = ["sk", "live", "fixture"].join("_");

    expect(resolveStripeAuditMode(testKey)).toBe("test");
    expect(() => resolveStripeAuditMode(liveKey)).toThrow("--allow-live-read-only");
    expect(resolveStripeAuditMode(liveKey, true)).toBe("live");
    expect(redactSecretValues(`provider rejected ${liveKey}`)).not.toContain(liveKey);
  });

  it("paginates through an allowlisted GET-only client and exposes no secret", async () => {
    const secretKey = ["sk", "test", "fixture"].join("_");
    const requests: Array<{ url: URL; init: RequestInit }> = [];
    const fetchImpl = vi.fn(async (input: URL | RequestInfo, init?: RequestInit) => {
      const url = new URL(String(input));
      requests.push({ url, init: init ?? {} });
      const secondPage = url.searchParams.has("starting_after");
      return {
        ok: true,
        status: 200,
        json: async () => secondPage
          ? { object: "list", data: [{ id: "prod_page_two", livemode: false }], has_more: false }
          : { object: "list", data: [{ id: "prod_page_one", livemode: false }], has_more: true },
      } as Response;
    });
    const client = createStripeReadOnlyClient({ secretKey, fetchImpl });

    await expect(client.list("products")).resolves.toHaveLength(2);
    expect(requests).toHaveLength(2);
    expect(requests.every((request) => request.init.method === "GET")).toBe(true);
    expect(requests[0].init.body).toBeUndefined();
    expect((requests[0].init.headers as Record<string, string>)["Stripe-Version"]).toBe(STRIPE_API_VERSION);
    expect(requests[1].url.searchParams.get("starting_after")).toBe("prod_page_one");
    expect(JSON.stringify(client)).not.toContain(secretKey);
    await expect(client.list("customers")).rejects.toThrow("read-only allowlist");
  });

  it("rejects a payload whose livemode contradicts the selected audit mode", () => {
    expect(() => buildCatalogAudit({
      mode: "test",
      products: [{ id: "prod_fixture_wrong_mode", active: true, livemode: true, name: "ZIVO Software Base" }],
      prices: [],
      subscriptions: [],
    })).toThrow("returned live data");
  });
});
