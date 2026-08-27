import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/cars/CarRentalCheckoutPage.tsx"),
  "utf8",
);

describe("car rental checkout read boundary", () => {
  it("does not render booking controls or prices without a verified car", () => {
    expect(source).toContain(
      "const vehicleUnavailable = !isLoading && !vehicle;",
    );
    expect(source).toContain(
      'aria-labelledby="car-checkout-unavailable-title"',
    );
    expect(source).toContain("No price or booking is shown");
    expect(source).toContain("{vehicle && (");
  });

  it("guards the booking write against missing vehicle state", () => {
    const handlerStart = source.indexOf("const handleConfirm");
    const insertStart = source.indexOf('.from("p2p_bookings")', handlerStart);
    const handlerBeforeInsert = source.slice(handlerStart, insertStart);

    expect(handlerStart).toBeGreaterThan(-1);
    expect(insertStart).toBeGreaterThan(handlerStart);
    expect(handlerBeforeInsert).toContain("if (!vehicle)");
    expect(handlerBeforeInsert).toContain("No booking was created");
  });
});
