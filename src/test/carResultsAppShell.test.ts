import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/CarResultsPage.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("car rental results app shell", () => {
  it("uses the existing ZIVO app chrome outside the Travel host", () => {
    expect(source).toContain(
      'import AppLayout from "@/components/app/AppLayout"',
    );
    expect(source).toContain("const isTravelHost =");
    expect(source).toContain("if (!isTravelHost)");
    expect(source).toContain("data-car-results-app-shell");
    expect(source).toContain('title="Rental Cars"');
    expect(source).toContain("showBack");
    expect(source).toContain('aria-label="Rental car results"');
    expect(source).toContain('className="bg-muted/20 lg:!pt-[88px]"');
  });

  it("keeps back, modify, filters, sorting, and provider booking connected", () => {
    expect(source).toContain("window.history.state?.idx");
    expect(source).toContain("navigate(-1)");
    expect(source).toContain('navigate("/car-rental", { replace: true })');
    expect(source).toContain('aria-label="Modify rental search"');
    expect(source).toContain("handleEditSearch");
    expect(source).toContain("<EditSearchModal");
    expect(source).toContain("<FiltersSheet");
    expect(source).toContain("<SortDropdown />");
    expect(source).toContain("<RampCarCard");
    expect(source).toContain("onViewDeal={handleViewDeal}");
    expect(source).toContain("[&_button]:whitespace-normal");
    expect(source).toContain("trackAffiliateClick");
    expect(source).toContain("Continue with {partner.name}");
    expect(source).toContain("Continue to ZIVO confirmation before opening");
    expect(source.match(/navigate\(outboundUrl\);/g)).toHaveLength(2);
    expect(source).not.toContain('import("@/lib/openExternalUrl")');
  });

  it("keeps price language honest and preserves the complete Travel result surface", () => {
    expect(source).toContain("data-car-results-price-notice");
    expect(source).toContain("Compare indicative prices.");
    expect(source).toContain(
      "Final availability and price are confirmed on the",
    );
    expect(source).toContain("provider&apos;s");
    expect(source).toContain("secure booking page.");
    expect(source).toContain("renderResultsPanel(false)");
    expect(source).toContain("<TravelPageFrame>");
    expect(source).toContain("<Header />");
    expect(source).toContain('<ResultsBreadcrumbs service="cars" />');
    expect(source).toContain("<CarPartnerTrustStrip />");
    expect(source).toContain("<P2PResultsCrossSell city={locationName} />");
    expect(source).toContain('<ResultsFAQ service="cars" />');
    expect(source).toContain("<Footer />");
  });

  it("shows every search criterion before the provider handoff", () => {
    expect(source).toContain("data-car-search-details");
    expect(source).toContain('aria-label="Rental search details"');
    expect(source).toContain("Pickup location:");
    expect(source).toContain("Rental dates:");
    expect(source).toContain("Pickup {pickupTime} · Return {dropoffTime}");
    expect(source).toContain("Driver age {driverAge}");
  });
});
