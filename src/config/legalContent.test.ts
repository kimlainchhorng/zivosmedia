import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import * as legalContent from "./legalContent";
import {
  ADVANCED_LEGAL_CLAUSES,
  COMPANY_INFO,
  formatPostalAddress,
  hasPostalAddress,
  type PostalAddress,
} from "./legalContent";

const read = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

/**
 * Every string reachable from this module's exports -- clause bodies, FAQ
 * answers, disclosure lists, and the nested policy objects alike.
 *
 * Walked generically rather than enumerated, because the point is to cover the
 * clauses nobody remembered to add to a list. New policy blocks get checked the
 * day they are added, without anyone wiring them up.
 */
function everyLegalString(): string[] {
  const found: string[] = [];
  const seen = new Set<unknown>();

  const walk = (value: unknown) => {
    if (typeof value === "string") {
      found.push(value);
      return;
    }
    if (typeof value !== "object" || value === null) return;
    if (seen.has(value)) return;
    seen.add(value);
    for (const nested of Object.values(value)) walk(nested);
  };

  walk(legalContent);
  return found;
}

const EMPTY_ADDRESS: PostalAddress = {
  line1: "",
  line2: "",
  city: "",
  region: "",
  postalCode: "",
  country: "",
};

describe("postal address formatting", () => {
  it("drops fields that have not been filled in", () => {
    expect(
      formatPostalAddress({
        ...EMPTY_ADDRESS,
        line1: "12 Street 240",
        city: "Phnom Penh",
        country: "Cambodia",
      }),
    ).toEqual(["12 Street 240", "Phnom Penh", "Cambodia"]);
  });

  it("treats a jurisdiction without a street line as unknown", () => {
    // The failure this guards, caught by looking at the rendered page: a
    // heading reading "Registered office" above the words "Delaware / United
    // States". Those are the shipped defaults in COMPANY_INFO -- jurisdiction
    // hints for the surrounding prose, not somewhere a letter can be sent.
    // Presenting them as the merchant's address is worse than showing nothing.
    for (const jurisdictionOnly of [
      { ...EMPTY_ADDRESS, country: "United States" },
      { ...EMPTY_ADDRESS, region: "Delaware", country: "United States" },
      { ...EMPTY_ADDRESS, city: "Phnom Penh", country: "Cambodia" },
      { ...EMPTY_ADDRESS, city: "Phnom Penh", postalCode: "12000", country: "Cambodia" },
    ]) {
      expect(formatPostalAddress(jurisdictionOnly)).toEqual([]);
      expect(hasPostalAddress(jurisdictionOnly)).toBe(false);
    }
  });

  it("is satisfied by the shipped defaults only once a street line is added", () => {
    // Directly pins the two real COMPANY_INFO values, so filling in line1 is
    // what flips these blocks on -- and nothing else can.
    expect(hasPostalAddress(COMPANY_INFO.registeredAddress)).toBe(
      COMPANY_INFO.registeredAddress.line1.trim() !== "",
    );
    expect(hasPostalAddress(COMPANY_INFO.operationsAddress)).toBe(
      COMPANY_INFO.operationsAddress.line1.trim() !== "",
    );
  });

  it("treats a wholly empty address as unknown", () => {
    expect(formatPostalAddress(EMPTY_ADDRESS)).toEqual([]);
    expect(hasPostalAddress(EMPTY_ADDRESS)).toBe(false);
  });

  it("is satisfied once a street line is known", () => {
    expect(
      hasPostalAddress({ ...EMPTY_ADDRESS, line1: "12 Street 240", country: "Cambodia" }),
    ).toBe(true);
  });
});

describe("published business identity", () => {
  it("never ships a bracketed placeholder in legal text", () => {
    // A clause that routes a user to "[Address]" gives them a right they cannot
    // exercise. This caught exactly that in the arbitration opt-out clause.
    //
    // Asserted over the exported VALUES rather than the source text, so that
    // source comments discussing placeholders do not trip it and so that a
    // placeholder reaching a user is what fails -- which is the thing that
    // actually matters.
    const offenders = everyLegalString().filter((value) =>
      /\[(address|insert|your|company|tbd|todo)\b/i.test(value),
    );
    expect(offenders).toEqual([]);
  });

  it("routes the arbitration opt-out somewhere a user can actually reach", () => {
    expect(ADVANCED_LEGAL_CLAUSES.classActionOptOut.content).toContain(COMPANY_INFO.legalEmail);
  });

  it("declares both the incorporating country and the operating country", () => {
    // The pairing a processor reconciles: a Delaware entity charging cards
    // while trading on Khmer payment rails. Both halves must be stated.
    expect(COMPANY_INFO.registeredAddress.country).toBeTruthy();
    expect(COMPANY_INFO.operationsAddress.country).toBeTruthy();
    expect(COMPANY_INFO.registeredAddress.country).not.toBe(
      COMPANY_INFO.operationsAddress.country,
    );
  });

  it("publishes a statement descriptor for customers to recognise", () => {
    // An unrecognised statement line is the origin of most disputes. The
    // descriptor must be published, and must match what the payment account is
    // configured with.
    expect(COMPANY_INFO.statementDescriptor.trim()).not.toBe("");
  });

  it("keeps a support, billing, and legal address that are all reachable", () => {
    for (const address of [
      COMPANY_INFO.supportEmail,
      COMPANY_INFO.billingEmail,
      COMPANY_INFO.legalEmail,
    ]) {
      expect(address).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i);
    }
  });
});

describe("contact reachability", () => {
  it("keeps the contact page outside the authenticated shell", () => {
    // The defect this exists for: every support surface sat behind
    // ProtectedRoute, so a reviewer, a regulator, or a locked-out customer met
    // a login wall when trying to reach the business. If /contact is ever
    // wrapped in ProtectedRoute, that returns.
    const app = read("src/App.tsx");
    const route = app.match(/<Route path="\/contact" element=\{[^}]*\} \/>/);
    expect(route).not.toBeNull();
    expect(route![0]).not.toContain("ProtectedRoute");
  });

  it("links the contact page from the footer of every page", () => {
    const footer = read("src/components/Footer.tsx");
    expect(footer).toContain('href: "/contact"');
  });

  it("puts a reachable support address in the footer itself", () => {
    // Reachable without opening /help, which a reviewer has no reason to click.
    const footer = read("src/components/Footer.tsx");
    expect(footer).toContain("COMPANY_INFO.supportEmail");
  });

  it("renders footer, contact page, and Terms from the same identity source", () => {
    // Each surface used to own its own copy of the business details, which is
    // how they drifted. Disagreement between them is what a review reads as
    // misrepresentation.
    for (const file of [
      "src/components/Footer.tsx",
      "src/pages/Contact.tsx",
      "src/pages/legal/TermsOfService.tsx",
      "src/components/seo/OrganizationSchema.tsx",
    ]) {
      expect(read(file)).toContain("@/config/legalContent");
    }
  });
});
