import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8").replace(
    /\r\n/g,
    "\n",
  );

const hook = source("src/hooks/useRealCarSearch.ts");
const page = source("src/pages/CarResultsPage.tsx");

describe("car rental affiliate truthfulness", () => {
  it("does not manufacture rental inventory, providers, features, or prices", () => {
    expect(hook).not.toContain("generateIndicativeCars");
    expect(hook).not.toContain("Math.random");
    expect(hook).not.toContain("setTimeout");

    for (const inventedProvider of [
      "Europcar",
      "Hertz",
      "Avis",
      "Budget",
      "Enterprise",
      "National",
      "Sixt",
      "Alamo",
    ]) {
      expect(hook).not.toContain(inventedProvider);
    }

    expect(hook).toContain("setResults([])");
    expect(hook).toContain("cars: []");
    expect(hook).toContain("totalResults: 0");
    expect(hook).toContain(
      'message: "Live inventory and prices are available on partner sites."',
    );
  });

  it("explains the provider handoff without implying that ZIVO loaded live results", () => {
    expect(page).not.toContain("Searching partner inventory...");
    expect(page).not.toContain("From $");
    expect(page).toContain("data-car-provider-handoff");
    expect(page).toContain("Check live rental availability");
    expect(page).toContain(
      "ZIVO does not receive live car inventory or prices on this screen.",
    );
    expect(page).toMatch(
      /ZIVO shows a confirmation screen before\s+you open the partner site/,
    );
    expect(page).toContain("Next, ZIVO shows a confirmation screen.");
    expect(page).not.toContain("Opens the partner site.");
    expect(page).toMatch(/The partner then confirms\s+availability, rental/);
    expect(page).toContain("terms, and final price before booking.");
  });

  it("uses configured partners and the guarded outbound route", () => {
    expect(page).toContain("const activePartners = useMemo");
    expect(page).toContain("activePartners.map((partner)");
    expect(page).toContain("Continue with {partner.name}");
    expect(page).toContain("Continue to ZIVO confirmation before opening");
    expect(page).toContain("buildOutRedirectUrl(");
    expect(page).toContain('"car-results-provider-handoff"');
    expect(page).toContain("partner.trackingUrl");
    expect(page.match(/navigate\(outboundUrl\);/g)).toHaveLength(2);
    expect(page).not.toContain('import("@/lib/openExternalUrl")');
  });

  it("hides irrelevant result controls while preserving app and Travel shells", () => {
    expect(page).toContain("!isLoading && results.length > 0 && (");
    expect(page).toContain(
      "!isLoading && results.length > 0 && <CarPartnerTrustStrip />",
    );
    expect(page).toContain("if (results.length === 0)");
    expect(page).toContain("<PartnerHandoffPanel appShell={appShell} />");
    expect(page).toContain("data-car-results-app-shell");
    expect(page).toContain("<TravelPageFrame>");
    expect(page).toContain("<Header />");
    expect(page).toContain('<ResultsFAQ service="cars" />');
    expect(page).toContain("<Footer />");
  });
});
