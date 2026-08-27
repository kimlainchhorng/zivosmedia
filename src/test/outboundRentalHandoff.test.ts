import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/OutboundRedirect.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("rental provider handoff", () => {
  it("reconstructs a direct-entry return from rental search fields only", () => {
    expect(source).toContain("const RENTAL_SEARCH_KEYS = [");
    expect(source).toContain('"pickup"');
    expect(source).toContain('"pickup_date"');
    expect(source).toContain('"pickup_time"');
    expect(source).toContain('"dropoff_date"');
    expect(source).toContain('"dropoff_time"');
    expect(source).toContain('"age"');
    expect(source).toContain("for (const key of RENTAL_SEARCH_KEYS)");
    expect(source).toContain("if (value) rentalParams.set(key, value)");
    expect(source).toContain("`/rent-car/results?${query}`");
    expect(source).toContain("return query ?");
    expect(source).toContain(': "/rent-car";');
    expect(source).not.toContain("new URLSearchParams(searchParams)");
  });

  it("returns through history first and uses the reconstructed path for direct entry", () => {
    expect(source).toContain("window.history.state?.idx");
    expect(source).toContain("navigate(-1)");
    expect(source).toContain(
      "navigate(rentalResultsReturnPath, { replace: true })",
    );
    expect(source).toContain('aria-label="Back to rental results"');
    expect(source).toContain("Back to rental results");
    expect(source).toContain("min-h-[44px]");
  });

  it("uses truthful rental availability language without changing generic handoffs", () => {
    expect(source).toContain(
      'searchParams.get("page") === "car-results-provider-handoff"',
    );
    expect(source).toContain(
      "Open ${partnerName} to see current vehicles, exact rental terms, and the final price.",
    );
    expect(source).toContain('"Opens the partner site"');
    expect(source).toContain(
      "You're leaving ZIVO to complete your booking on a trusted partner website.",
    );
    expect(source).toContain('"Opens in a new tab"');
  });

  it("keeps the zivosmedia rental handoff inside the app shell with a skip target", () => {
    expect(source).toContain(
      'import AppLayout from "@/components/app/AppLayout"',
    );
    expect(source).toContain(
      'import { isZivoTravelHost } from "@/config/zivoTravelDomain"',
    );
    expect(source).toContain("const useAppShell =");
    expect(source).toContain("!isZivoTravelHost()");
    expect(source).toContain("data-rental-provider-app-shell");
    expect(source).toContain("<AppLayout");
    expect(source).toContain('title="Rental Partner"');
    expect(source).toContain('className="bg-muted/20 lg:!pt-[88px]"');
    expect(source).toContain('id="main-content"');
    expect(source).toContain("tabIndex={-1}");
    expect(source).toContain('const StatusHeading = useAppShell ? "h2" : "h1"');
  });

  it("preserves validation, tracking, disclosure, and the guarded partner launch", () => {
    expect(source).toContain("isAllowedPartnerUrl(decodedUrl)");
    expect(source).toContain("logOutboundClick({");
    expect(source).toContain("await openExternalUrl(finalUrl)");
    expect(source).toMatch(
      /await openExternalUrl\(finalUrl\);\s+setStatus\("ready"\);/,
    );
    expect(source).toContain(
      "ZIVO may earn a commission when you book through partner links.",
    );
  });
});
