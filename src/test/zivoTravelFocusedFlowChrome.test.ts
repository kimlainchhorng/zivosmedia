import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const readSource = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

const flowHeaderSource = readSource(
  "src/components/zivo-travel/TravelFlowHeader.tsx",
);
const barrelSource = readSource("src/components/zivo-travel/index.ts");
const directorySource = readSource(
  "src/pages/lodging/HotelsResortsDirectoryPage.tsx",
);
const partnerCheckoutSource = readSource("src/pages/CarCheckoutPage.tsx");
const p2pCheckoutSource = readSource(
  "src/pages/cars/CarRentalCheckoutPage.tsx",
);
const orderDetailSource = readSource("src/pages/TravelOrderDetailPage.tsx");

describe("focused Zivo Travel flow chrome", () => {
  it("provides one reusable compact header with official branding and browser-safe spacing", () => {
    expect(barrelSource).toContain(
      'export { TravelFlowHeader } from "./TravelFlowHeader"',
    );
    expect(flowHeaderSource).toContain("ZivoTravelLogo");
    expect(flowHeaderSource).toContain('aria-label="Zivo Travel home"');
    expect(flowHeaderSource).toContain('getZivoHeaderSafeTop("0.4375rem")');
    expect(flowHeaderSource).toContain("zivo-safe-top-guard-off");
    expect(flowHeaderSource).toContain("data-travel-flow-header");
    expect(flowHeaderSource).toContain('backLabel = "Go back"');
    expect(flowHeaderSource).not.toContain("Footer");
  });

  it("repairs the public Hotels directory shell without changing the non-Travel branch", () => {
    expect(directorySource).toContain("isZivoTravelHost");
    expect(directorySource).toContain("<TravelFlowHeader");
    expect(directorySource).toContain('title="Hotels & Resorts"');
    expect(directorySource).toContain("sticky={false}");
    expect(directorySource).toContain("<Footer forceTravelBrand />");
    expect(directorySource).toContain("<ZivoMobileNav />");
    expect(directorySource).toContain("zt-on-media bg-ig-gradient text-white");
    expect(directorySource).toContain("safe-area-top");
  });

  it("uses focused branded chrome on the remaining clean car checkout and order-detail surfaces", () => {
    for (const source of [
      partnerCheckoutSource,
      p2pCheckoutSource,
      orderDetailSource,
    ]) {
      expect(source).toContain("isZivoTravelHost");
      expect(source).toContain("<TravelFlowHeader");
    }

    expect(partnerCheckoutSource).toContain(
      'backLabel="Back to traveler information"',
    );
    expect(p2pCheckoutSource).toContain('title="Confirm Booking"');
    expect(orderDetailSource).toContain('backHref="/my-trips"');
    expect(orderDetailSource).toContain('title="Trip details"');
  });

  it("keeps marketing footers out of active checkout and order-detail chrome", () => {
    expect(partnerCheckoutSource).not.toContain("forceTravelBrand");
    expect(p2pCheckoutSource).not.toContain("forceTravelBrand");
    expect(orderDetailSource).not.toContain("forceTravelBrand");
  });
});
