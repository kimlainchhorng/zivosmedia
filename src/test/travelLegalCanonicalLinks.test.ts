import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

const travelFiles = [
  "src/components/hotel/HotelComplianceFooter.tsx",
  "src/components/car/CarComplianceFooter.tsx",
  "src/components/flight/FlightConsentCheckbox.tsx",
  "src/components/shared/TravelFAQ.tsx",
  "src/components/booking/TravelerInfoForm.tsx",
];

describe("travel legal canonical links", () => {
  it("keeps shared travel compliance links on canonical legal routes", () => {
    const combined = travelFiles.map((file) => read(file)).join("\n");

    for (const canonical of [
      'to="/legal/terms"',
      'to="/legal/privacy"',
      'to="/legal/partner-disclosure"',
    ]) {
      expect(combined).toContain(canonical);
    }

    for (const legacy of [
      'to="/terms"',
      'to="/privacy"',
      'to="/partner-disclosure"',
      'to="/privacy-policy"',
    ]) {
      expect(combined).not.toContain(legacy);
    }
  });

  it("keeps travel consent and disclosure copy present next to those links", () => {
    const flightConsent = read("src/components/flight/FlightConsentCheckbox.tsx");
    const hotelFooter = read("src/components/hotel/HotelComplianceFooter.tsx");
    const carFooter = read("src/components/car/CarComplianceFooter.tsx");
    const travelerForm = read("src/components/booking/TravelerInfoForm.tsx");

    expect(flightConsent).toContain("FLIGHT_CONSENT.checkboxLabel");
    expect(flightConsent).toContain("FLIGHT_DISCLAIMERS.ticketing");
    expect(hotelFooter).toContain("licensed accommodation partners");
    expect(carFooter).toContain("licensed rental partners");
    expect(travelerForm).toContain("FLIGHT_DISCLAIMERS.checkout");
  });
});
