/**
 * Contract tests for the pure export of car-rental csv.ts —
 * buildReservationsCsv. Only buildReservationsCsv is exported (esc/dollars are
 * module-private), so every assertion goes THROUGH it; downloadCsv (Blob +
 * dynamic import) is impure and intentionally untested.
 *
 * Expected values are grounded by an independent oracle that does NOT import the
 * module: a clean-room reimplementation re-derived from the documented rules
 * (the CWE-1236 formula-trigger prefix-unless-numeric-literal, RFC-4180
 * quote-wrapping, dollars = (cents/100).toFixed(2), CRLF row joins). RegExp /
 * String.replace / Array.join / toFixed are shared JS primitives; this vitest
 * run against the real module is the cross-check.
 *
 * LOAD-BEARING, non-obvious contracts pinned:
 *   - formula injection: a leading "=+-@\t\r" is apostrophe-prefixed FIRST, then
 *     RFC-4180-quoted only if the (prefixed) value contains a quote/comma/newline;
 *   - the numeric-literal exemption lets a legit negative like "-5" / "-5.00"
 *     through UN-prefixed, while "-5x" is prefixed;
 *   - TAB vs CR asymmetry: a leading TAB is prefixed but NOT wrapped (\t is not in
 *     the quote-set), a leading CR is prefixed AND wrapped (\r is in the set);
 *   - rows join to the header with a CRLF "\r\n", the header line is unterminated,
 *     and null fields collapse to an empty cell "".
 */
import { describe, it, expect } from "vitest";
import { buildReservationsCsv, type CsvReservation } from "./csv";

const base: CsvReservation = {
  confirmation_code: "ABC123",
  customer_name: "Jane Doe",
  customer_phone: "555-1234",
  customer_email: "jane@example.com",
  vehicle_label: "Toyota Camry",
  vehicle_category: "Sedan",
  pickup_at: "2024-01-01T10:00",
  dropoff_at: "2024-01-05T10:00",
  pickup_location_name: "Downtown",
  dropoff_location_name: "Airport",
  rental_days: 4,
  daily_rate_cents: 5000,
  base_total_cents: 20000,
  addons_total_cents: 0,
  fees_cents: 1000,
  taxes_cents: 2000,
  discount_cents: 0,
  security_deposit_cents: 5000,
  total_cents: 23000,
  amount_paid_cents: 23000,
  status: "completed",
  source: "online",
  cancellation_reason: null,
  created_at: "2024-01-01T08:00",
};

function make(overrides: Partial<CsvReservation>): CsvReservation {
  return { ...base, ...overrides };
}

const HEADER_LINE =
  "Confirmation Code,Customer Name,Customer Phone,Customer Email,Vehicle,Category,Pickup,Dropoff,Pickup Location,Dropoff Location,Rental Days,Daily Rate,Base Total,Add-ons Total,Extra Fees,Taxes,Discount,Security Deposit,Total,Amount Paid,Status,Source,Cancellation Reason,Created At";

describe("buildReservationsCsv — structure", () => {
  it("emits only the header line for empty rows (no trailing CRLF)", () => {
    expect(buildReservationsCsv([])).toBe(HEADER_LINE);
  });

  it("joins the header and a safe row with a single CRLF", () => {
    const rowLine = [
      "ABC123", "Jane Doe", "555-1234", "jane@example.com",
      "Toyota Camry", "Sedan", "2024-01-01T10:00", "2024-01-05T10:00",
      "Downtown", "Airport", "4", "50.00", "200.00", "0.00", "10.00", "20.00",
      "0.00", "50.00", "230.00", "230.00", "completed", "online", "",
      "2024-01-01T08:00",
    ].join(",");
    expect(buildReservationsCsv([make({})])).toBe(HEADER_LINE + "\r\n" + rowLine);
  });
});

describe("buildReservationsCsv — CSV formula injection (CWE-1236)", () => {
  const cell = (overrides: Partial<CsvReservation>) =>
    buildReservationsCsv([make(overrides)]).split("\r\n")[1];

  it("prefixes AND quotes a formula that contains a comma", () => {
    expect(cell({ customer_name: "=1+2,3" })).toContain(`"'=1+2,3"`);
  });

  it("prefixes (without quoting) a formula with no comma/quote", () => {
    expect(cell({ customer_name: "=SUM(A1)" })).toContain(`'=SUM(A1)`);
  });

  it("prefixes a leading '@'", () => {
    expect(cell({ customer_email: "@handle" })).toContain(`'@handle`);
  });

  it("prefixes a leading '+'", () => {
    expect(cell({ customer_phone: "+1 (650) 555" })).toContain(`'+1 (650) 555`);
  });
});

describe("buildReservationsCsv — numeric-literal exemption", () => {
  const cell = (overrides: Partial<CsvReservation>) =>
    buildReservationsCsv([make(overrides)]).split("\r\n")[1];

  it("leaves a negative dollar amount un-prefixed", () => {
    expect(cell({ discount_cents: -500 })).toContain(",-5.00,");
  });

  it("leaves a bare negative integer un-prefixed", () => {
    expect(cell({ customer_name: "-5" })).toContain(",-5,");
  });

  it("prefixes a near-numeric value that is not a pure literal", () => {
    expect(cell({ customer_name: "-5x" })).toContain(`'-5x`);
  });
});

describe("buildReservationsCsv — RFC-4180 quoting", () => {
  const cell = (overrides: Partial<CsvReservation>) =>
    buildReservationsCsv([make(overrides)]).split("\r\n")[1];

  it("doubles and wraps an embedded double-quote", () => {
    expect(cell({ customer_name: 'John "JD" Doe' })).toContain(`"John ""JD"" Doe"`);
  });

  it("wraps a value containing a comma", () => {
    expect(cell({ customer_name: "Doe, John" })).toContain(`"Doe, John"`);
  });

  it("wraps a value containing a newline", () => {
    expect(cell({ customer_phone: "a\nb" })).toContain("\"a\nb\"");
  });

  it("prefixes but does NOT wrap a leading TAB (\\t not in the quote-set)", () => {
    expect(cell({ customer_name: "\tfoo" })).toContain("'\tfoo");
  });

  it("prefixes AND wraps a leading CR (\\r is in the quote-set)", () => {
    expect(cell({ customer_name: "\rfoo" })).toContain("\"'\rfoo\"");
  });
});

describe("buildReservationsCsv — null fields", () => {
  it("renders empty cells for null phone/email/category/locations/reason", () => {
    const row = make({
      customer_phone: null,
      customer_email: null,
      vehicle_category: null,
      pickup_location_name: null,
      dropoff_location_name: null,
      cancellation_reason: null,
    });
    const expected = [
      "ABC123", "Jane Doe", "", "", "Toyota Camry", "", "2024-01-01T10:00",
      "2024-01-05T10:00", "", "", "4", "50.00", "200.00", "0.00", "10.00",
      "20.00", "0.00", "50.00", "230.00", "230.00", "completed", "online",
      "", "2024-01-01T08:00",
    ].join(",");
    expect(buildReservationsCsv([row]).split("\r\n")[1]).toBe(expected);
  });
});

describe("buildReservationsCsv — dollars formatting", () => {
  it("formats cents to two decimals", () => {
    const line = buildReservationsCsv([make({ daily_rate_cents: 12345, discount_cents: 0 })]).split("\r\n")[1];
    expect(line).toContain(",123.45,");
    expect(line).toContain(",0.00,");
  });
});
