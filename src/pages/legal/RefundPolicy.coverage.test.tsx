import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/home/NavBar", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));

import RefundPolicy from "./RefundPolicy";

afterEach(cleanup);

const renderPolicy = () =>
  render(
    <MemoryRouter>
      <RefundPolicy />
    </MemoryRouter>,
  );

/**
 * Radix activates a tab on mousedown, not on the synthetic click alone, and
 * mounts only the selected panel. Firing just `click` leaves Hotels selected,
 * so every assertion below would search an empty panel and pass vacuously.
 */
const selectRidesTab = () => {
  const tab = screen.getByRole("tab", { name: /rides & eats/i });
  fireEvent.mouseDown(tab);
  fireEvent.click(tab);
  expect(tab).toHaveAttribute("aria-selected", "true");
};

/**
 * This page documented only Hotels, Car Rentals, and Flights, while the
 * business also charges for rides, food, package delivery, and shopping — the
 * services behind every cash, ABA PayWay, and KHQR payment in its operating
 * market.
 *
 * A refund policy that omits most of what a merchant sells is read, by a
 * customer and by anyone reviewing the payment account, as those services
 * having no refund terms at all. These tests keep the page's coverage matched
 * to what is actually sold.
 */
describe("refund policy service coverage", () => {
  it("names every service ZIVO refunds directly, not only travel", () => {
    renderPolicy();
    const body = document.body.textContent ?? "";
    for (const service of ["Rides", "Eats", "Delivery", "Shopping"]) {
      expect(body).toContain(service);
    }
  });

  it("states the refund route for each tender the market actually pays with", () => {
    // Cash is the one that matters most and the easiest to get wrong: there is
    // no ZIVO-held payment to reverse, so a blanket "refunded to your original
    // payment method" would be a term that cannot be honoured for the most
    // common tender in the operating market.
    //
    // The tab must be activated first — Radix mounts only the selected panel,
    // so asserting against the default Hotels view would silently pass on an
    // empty search rather than checking anything.
    renderPolicy();
    selectRidesTab();

    const body = document.body.textContent ?? "";
    expect(body).toMatch(/ABA PayWay/i);
    expect(body).toMatch(/KHQR/i);
    expect(body).toMatch(/cash fare is paid straight to the driver/i);
    expect(body).toMatch(/ZIVO credit/i);
  });

  it("gives the rides tab its own eligibility terms rather than borrowing the hotel ones", () => {
    renderPolicy();
    selectRidesTab();

    const body = document.body.textContent ?? "";
    expect(body).toMatch(/no driver arrived/i);
    expect(body).toMatch(/Order never delivered/i);
    expect(body).toMatch(/48 hours/i);
    // Hotel-specific rate language must not leak into the rides panel.
    expect(body).not.toMatch(/minus 1 night/i);
  });

  it("does not claim the merchant of record is travel-only", () => {
    // The summary block is what a reader takes away. Listing only travel under
    // "we are the merchant of record" understated what ZIVO is answerable for.
    renderPolicy();
    expect(document.body.textContent).toMatch(
      /Rides, Eats, Delivery & Shopping:\s*Refunds processed by ZIVO/i,
    );
  });

  it("routes every ZIVO-processed refund to a reachable address", () => {
    renderPolicy();
    const links = screen.getAllByRole("link", { name: /support@/i });
    expect(links.length).toBeGreaterThan(0);
  });
});
