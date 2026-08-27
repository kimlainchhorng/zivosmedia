import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/cars/CarRentalCheckoutPage.tsx"),
  "utf8",
);

describe("car rental checkout date boundary", () => {
  it("resolves the URL dates through the shared fail-closed validator", () => {
    expect(source).toContain('from "@/lib/cars/rentalDateWindow"');
    expect(source).toContain("const dateWindow = resolveRentalDateWindow(");
    expect(source).not.toContain("Math.max(1, differenceInDays");
  });

  it("does not show price or booking controls for an invalid date window", () => {
    expect(source).toContain(
      'aria-labelledby="car-checkout-date-window-title"',
    );
    expect(source).toContain("No price or booking form is shown");
    expect(source).toContain("Choose dates");
    expect(source).toContain("{vehicle && dateWindow.ok && (");
  });

  it("rejects invalid dates before the booking insert", () => {
    const handlerStart = source.indexOf("const handleConfirm");
    const insertStart = source.indexOf('.from("p2p_bookings")', handlerStart);
    const handlerBeforeInsert = source.slice(handlerStart, insertStart);

    expect(handlerStart).toBeGreaterThan(-1);
    expect(insertStart).toBeGreaterThan(handlerStart);
    expect(handlerBeforeInsert).toContain("if (dateWindow.ok === false)");
    expect(handlerBeforeInsert).toContain("No booking was created");
    expect(handlerBeforeInsert).toContain(
      "pickup_date: confirmedDateWindow.pickup.toISOString()",
    );
    expect(handlerBeforeInsert).toContain(
      "return_date: confirmedDateWindow.return.toISOString()",
    );
    expect(handlerBeforeInsert).not.toContain("pickupDate?.toISOString()");
    expect(handlerBeforeInsert).not.toContain("returnDate?.toISOString()");
  });
});
