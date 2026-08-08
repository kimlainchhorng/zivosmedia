import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";

import Contact from "./Contact";
import { COMPANY_INFO, hasPostalAddress } from "@/config/legalContent";

afterEach(cleanup);

const renderContact = () =>
  render(
    <MemoryRouter>
      <Contact />
    </MemoryRouter>,
  );

describe("public contact page", () => {
  it("names the contracting entity", () => {
    renderContact();
    expect(screen.getAllByText(COMPANY_INFO.name).length).toBeGreaterThan(0);
  });

  it("offers separate, reachable routes for support, billing, and legal", () => {
    // A single catch-all address is what leaves billing questions unanswered
    // long enough to become chargebacks. Each route is a real mailto link.
    renderContact();
    for (const address of [
      COMPANY_INFO.supportEmail,
      COMPANY_INFO.billingEmail,
      COMPANY_INFO.legalEmail,
    ]) {
      // Each address appears twice by design -- once on its routing card and
      // once in the business-details block -- so assert every occurrence is a
      // working mailto rather than that there is exactly one.
      const links = screen.getAllByRole("link", { name: new RegExp(address, "i") });
      expect(links.length).toBeGreaterThan(0);
      for (const link of links) {
        expect(link).toHaveAttribute("href", `mailto:${address}`);
      }
    }
  });

  it("states both where we are incorporated and where we trade", () => {
    renderContact();
    const body = document.body.textContent ?? "";
    expect(body).toContain(COMPANY_INFO.registeredAddress.country);
    expect(body).toContain(COMPANY_INFO.operationsAddress.country);
  });

  it("publishes the statement descriptor customers will see on their card", () => {
    renderContact();
    expect(document.body.textContent).toContain(COMPANY_INFO.statementDescriptor);
  });

  it("points customers at us before their bank", () => {
    // A dispute filed without contacting the merchant first costs a chargeback
    // fee and counts against the account's dispute rate either way.
    renderContact();
    expect(document.body.textContent).toMatch(/before disputing a charge with your bank/i);
  });

  it("shows no address block until a real address is configured", () => {
    // The guard against a half-filled COMPANY_INFO rendering an empty or
    // placeholder address. Publishing an invented address to satisfy a review
    // is worse than publishing none, so absence must stay absence.
    renderContact();
    const body = document.body.textContent ?? "";

    if (hasPostalAddress(COMPANY_INFO.registeredAddress)) {
      expect(body).toContain("Registered office");
    } else {
      expect(body).not.toContain("Registered office");
    }

    if (hasPostalAddress(COMPANY_INFO.operationsAddress)) {
      expect(body).toContain("Operations");
    } else {
      expect(body).not.toContain("Operations");
    }
  });

  it("never renders a bracketed placeholder", () => {
    renderContact();
    expect(document.body.textContent).not.toMatch(/\[(address|insert|your|company|tbd)\b/i);
  });
});
