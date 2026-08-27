import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/cars/CarRentalCheckoutPage.tsx"),
  "utf8",
);

describe("car rental checkout payment boundary", () => {
  it("does not offer an online payment without a provider handoff", () => {
    expect(source).not.toContain("Pay Online");
    expect(source).not.toContain("Secure payment");
    expect(source).toContain("Cash at pickup");
    expect(source).toContain("Nothing is charged now");
    expect(source.replace(/\s+/g, " ")).toContain(
      "payment remains pending until pickup",
    );
  });

  it("keeps payment and license verification pending", () => {
    expect(source).toContain('payment_status: "pending"');
    expect(source).toContain("renter_license_verified: false");
    expect(source).not.toContain("payment_status: payMethod");
  });

  it("describes the pending write as a booking request", () => {
    expect(source).toContain('toast.success("Booking request sent")');
    expect(source).toContain("Send Booking Request");
    expect(source).not.toContain('toast.success("Booking confirmed!")');
  });
});
