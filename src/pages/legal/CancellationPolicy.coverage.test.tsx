import { cleanup, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/home/NavBar", () => ({ default: () => null }));
vi.mock("@/components/Footer", () => ({ default: () => null }));
vi.mock("@/components/SEOHead", () => ({ default: () => null }));

import CancellationPolicy from "./CancellationPolicy";

afterEach(cleanup);

const renderPolicy = () => {
  render(
    <MemoryRouter>
      <CancellationPolicy />
    </MemoryRouter>,
  );
  return document.body.textContent ?? "";
};

/**
 * This page documented only Hotels, Car Rentals, and Flights, while ride
 * cancellation is by far the most common cancellation a ZIVO customer makes —
 * and the one most likely to end up disputed.
 *
 * The figures asserted here are the live ones: the seeded
 * `public.cancellation_rules` rows for ride/delivery/eats, matching DEFAULT_RULE
 * in supabase/functions/cancel-order. A published fee that disagrees with the
 * fee actually charged is a chargeback the platform loses, so these are pinned
 * rather than left to prose drift.
 */
describe("cancellation policy service coverage", () => {
  it("covers rides, eats, and delivery, not only travel", () => {
    const body = renderPolicy();
    expect(body).toMatch(/Rides, Eats & Delivery/i);
  });

  it("publishes the same free window and fees the server charges", () => {
    const body = renderPolicy();
    expect(body).toMatch(/Within 2 minutes of booking/i); // free_cancel_seconds: 120
    expect(body).toContain("$2.00"); // fee_after_free
    expect(body).toContain("$5.00"); // fee_if_driver_arrived
    expect(body).toContain("$3.00"); // driver_comp_if_arrived
  });

  it("states that a cash booking is never charged a cancellation fee", () => {
    // The exception that matters most, and the easiest to omit. cancel-order
    // deliberately charges nothing on a cash booking because the fare never
    // passes through ZIVO, so there is no payment to deduct from. Publishing
    // the fee table without this states a charge that is never made.
    const body = renderPolicy();
    expect(body).toMatch(/no cancellation fee applies/i);
    expect(body).toMatch(/paid directly to the driver/i);
  });

  it("does not charge the customer when the driver cancels or none is found", () => {
    const body = renderPolicy();
    expect(body).toMatch(/Cancelled by the driver, or no driver found/i);
  });
});
