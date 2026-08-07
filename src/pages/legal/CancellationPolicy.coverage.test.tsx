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

  it("leads with cash, because that is what the operating market pays with", () => {
    // Cambodia is seeded digital_payments_enabled = false, and cancel-order
    // treats cash as free_cancel unconditionally (`|| isCashSettlement`), so
    // the timing table is unreachable for rides there.
    //
    // Ordering is the assertion: this page first led with the $2/$5 fees and
    // relegated cash to a footnote, which read as though Cambodian riders were
    // routinely charged to cancel — and directly contradicted the Ride app,
    // whose own policy states Cambodia Ride has no cancellation fee. A rider
    // could read either and be told opposite things about their own money.
    const body = renderPolicy();
    const cashRule = body.search(/Cancelling is always free/i);
    const feeTable = body.search(/Within 2 minutes of booking/i);

    expect(cashRule).toBeGreaterThan(-1);
    expect(feeTable).toBeGreaterThan(-1);
    expect(cashRule).toBeLessThan(feeTable);
  });

  it("says plainly that rides in Cambodia are cash, so the fees do not apply there", () => {
    const body = renderPolicy();
    expect(body).toMatch(/paid directly to the driver/i);
    expect(body).toMatch(/Rides in Cambodia are cash/i);
  });

  it("scopes the fee table to markets that actually offer a digital tender", () => {
    const body = renderPolicy();
    expect(body).toMatch(/Where a market offers card, ABA PayWay, or KHQR/i);
  });

  it("does not charge the customer when the driver cancels or none is found", () => {
    const body = renderPolicy();
    expect(body).toMatch(/Cancelled by the driver, or no driver found/i);
  });
});
