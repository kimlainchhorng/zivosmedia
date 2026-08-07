import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const cancellationPolicy = read("src/pages/legal/CancellationPolicy.tsx");
const refundPolicy = read("src/pages/legal/RefundPolicy.tsx");

/**
 * A waiting charge is a SECOND charge.
 *
 * The rider's fare is captured when the ride is booked, so waiting can never be
 * added to it — it arrives separately after the trip. This page is the
 * Stripe-facing surface, and an undisclosed second charge is the shape of a
 * dispute the platform loses and a question a reviewer will ask.
 */
describe("pickup waiting is disclosed on the Stripe-facing policy page", () => {
  it("states that waiting is billed separately from the fare", () => {
    expect(cancellationPolicy).toMatch(/Waiting at the Pickup/);
    expect(cancellationPolicy).toMatch(
      /fare is charged when the ride is booked[\s\S]{0,120}billed\s+separately after the trip/i,
    );
  });

  it("names the tenders that are never charged", () => {
    // Cash never reaches ZIVO; PayWay and KHQR settle through manual operator
    // review with nothing saved to re-charge. Presenting waiting as universal
    // would misdescribe what the platform actually bills.
    expect(cancellationPolicy).toMatch(
      /Cash, ABA PayWay and KHQR rides are never charged for waiting/i,
    );
    expect(cancellationPolicy).toMatch(/On card rides/i);
  });

  it("promises a free window no shorter than the no-cancel window", () => {
    // Billing inside the five minutes a customer cannot cancel during is the
    // one shape of this feature that cannot be defended to a card network.
    expect(cancellationPolicy).toMatch(
      /never fewer than the five minutes[\s\S]{0,120}cannot cancel/i,
    );
    expect(cancellationPolicy).toMatch(/not\s+allowed to escape/i);
  });

  it("promises a cap, an itemised line, and that the driver keeps it", () => {
    expect(cancellationPolicy).toMatch(/capped/i);
    expect(cancellationPolicy).toMatch(/own line\s+on the receipt with the minutes it covers/i);
    expect(cancellationPolicy).toMatch(/paid in full to the driver/i);
  });

  it("keeps the disclosure inside the rides section, not the flights one", () => {
    // Flights are ticketed under different terms; a waiting promise landing
    // there would be describing a service that has no pickup.
    const waitingAt = cancellationPolicy.indexOf("Waiting at the Pickup");
    const flightsAt = cancellationPolicy.indexOf("Flights (Partner Ticketing)");
    expect(waitingAt).toBeGreaterThan(-1);
    expect(flightsAt).toBeGreaterThan(-1);
    expect(waitingAt).toBeLessThan(flightsAt);
  });
});


describe("a waiting charge has a stated refund route", () => {
  it("says when it is refunded in full", () => {
    // Waiting is billed separately from the fare, so it is disputed separately.
    // ZIVO only bills it when the arrival was verified against the driver's
    // recorded position; where that check did not pass, the charge should not
    // have been made — and a rider needs that written down before they dispute
    // it with their bank instead.
    expect(refundPolicy).toMatch(
      /Charged for waiting on a ride where the driver[^<]*arrival was not verified/i,
    );
    expect(refundPolicy).toMatch(/full refund of the waiting amount/i);
  });

  it("says when it is not refunded, on the same terms the code enforces", () => {
    // Verified arrival plus a wait past the free window is exactly what
    // computePickupWaitCharge requires before it bills anything. The policy
    // must not promise a refund the platform would then decline.
    expect(refundPolicy).toMatch(/Waiting time past the free window on a card ride/i);
    expect(refundPolicy).toMatch(/arrival was verified and the free window had already passed/i);
  });

  it("keeps both statements in the rides tab, not hotels or flights", () => {
    const ridesAt = refundPolicy.indexOf('TabsContent value="rides"');
    const waitingAt = refundPolicy.indexOf("Charged for waiting on a ride");
    expect(ridesAt).toBeGreaterThan(-1);
    expect(waitingAt).toBeGreaterThan(ridesAt);
  });
});
