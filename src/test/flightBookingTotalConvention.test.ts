/**
 * `flight_bookings.total_amount` is the WHOLE-BOOKING total — price per
 * passenger already multiplied by the passenger count.
 *
 * It has not always been. create-flight-payment-intent stored the multiplied
 * total while create-flight-checkout stored the per-passenger figure, so the
 * same column meant two different things depending on which path created the
 * row. Readers then disagreed, and two of them were wrong in ways a customer
 * could see:
 *
 *  - confirm-flight-payment sent Duffel `total_amount * passengers`, N x the
 *    offer price, so Duffel rejected every multi-passenger order and the card
 *    authorisation was cancelled.
 *  - FlightConfirmation rendered "Total Paid" as
 *    `total_amount * passengers`, showing double for two passengers and
 *    triple for three.
 *
 * These assertions pin the single convention. If the column ever legitimately
 * changes meaning, change it in both writers and update this file — do not
 * reintroduce a per-reader multiplication.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (p: string) => readFileSync(resolve(process.cwd(), p), "utf8");

const WRITERS = [
  "supabase/functions/create-flight-payment-intent/index.ts",
  "supabase/functions/create-flight-checkout/index.ts",
];

const READERS = [
  "src/pages/FlightConfirmation.tsx",
  "supabase/functions/confirm-flight-payment/index.ts",
  "supabase/functions/process-flight-refund/index.ts",
];

describe("flight_bookings.total_amount convention", () => {
  it("both writers store the passenger-multiplied total", () => {
    for (const writer of WRITERS) {
      const src = read(writer);
      // The inserted total_amount must be derived from a passenger multiple,
      // never the raw per-passenger figure.
      expect(
        /total_amount:\s*(?:Number\(\()?[A-Za-z]+\s*\*\s*(?:passengers\.length|passengerCount)|total_amount:\s*totalBookingAmount/.test(src),
        `${writer} must store the whole-booking total`,
      ).toBe(true);
    }
  });

  it("both writers also record the per-passenger price separately", () => {
    for (const writer of WRITERS) {
      expect(read(writer), `${writer} should keep price_per_passenger`).toContain(
        "price_per_passenger",
      );
    }
  });

  it("no reader multiplies total_amount by the passenger count again", () => {
    const offenders: string[] = [];
    for (const reader of READERS) {
      const src = read(reader);
      const re = /total_amount[^\n]{0,40}\*\s*(?:Number\()?\s*(?:booking\.)?(?:passengers|dbPassengers|passengerCount)/g;
      for (const m of src.matchAll(re)) {
        offenders.push(`${reader}: ${m[0].trim()}`);
      }
    }
    expect(offenders, "total_amount is already multiplied").toEqual([]);
  });

  it("the flight trip detail reads a column that exists", () => {
    // flight_bookings has `total_amount` (decimal) and `currency`. It has no
    // `total_amount_cents`. MyFlightTripPage used to read that name and divide
    // it by 100, producing NaN, so the fare rendered as "—" on every booking.
    // select("*") hides this from supabaseSelectColumnContract, which only
    // inspects explicit column lists.
    const types = read("src/integrations/supabase/types.ts");
    const start = types.indexOf("      flight_bookings: {");
    const rowBlock = types.slice(start, types.indexOf("Insert: {", start));
    expect(rowBlock).toContain("total_amount:");
    expect(rowBlock).not.toContain("total_amount_cents:");

    const page = read("src/pages/MyFlightTripPage.tsx");
    expect(page).not.toMatch(/booking\.total_amount_cents/);
    expect(page).toMatch(/formatPrice\(booking\.total_amount, booking\.currency\)/);
  });

  it("the flight trip detail does not hardcode a dollar sign or round off cents", () => {
    const page = read("src/pages/MyFlightTripPage.tsx");
    // Duffel quotes in many currencies; the old formatter was
    // `$${amount.toFixed(0)}`, which both assumed USD and dropped the cents.
    expect(page).toContain("formatCurrencyAmount");
    expect(page).not.toMatch(/`\$\$\{amount\.toFixed\(0\)\}`/);
  });

  it("the confirmation screen shows Total Paid unmultiplied", () => {
    const src = read("src/pages/FlightConfirmation.tsx");
    expect(src).toContain("Total Paid");
    expect(src).not.toMatch(/Number\(booking\.total_amount\)\s*\*\s*Number\(booking\.passengers/);
  });
});
