import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/cars/CarRentalConfirmedPage.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("car rental confirmation server boundary", () => {
  it("fails closed when the booking id is missing or the owner-scoped read is unavailable", () => {
    expect(source).toContain('setLoadState("unavailable")');
    expect(source).toContain('if (error || !data)');
    expect(source).toContain('.eq("id", bookingId)');
    expect(source).toContain('.eq("vehicle_id", id)');
    expect(source).toContain('role="alert"');
    expect(source).toContain("Booking unavailable");
    expect(source).toContain("No booking or payment status is being claimed");
  });

  it("keeps loading neutral until the booking read succeeds", () => {
    expect(source).toContain("Checking booking");
    expect(source).toContain("before showing a confirmation");
    expect(source).toContain('setBooking(data as unknown as BookingSummary)');
    expect(source).toContain('setLoadState("ready")');
  });

  it("derives booking and payment copy from the returned server statuses", () => {
    for (const status of ["pending", "confirmed", "active", "completed", "cancelled", "disputed"]) {
      expect(source).toContain(`case "${status}"`);
    }
    for (const paymentStatus of ["pending", "authorized", "captured", "refunded", "failed"]) {
      expect(source).toContain(`case "${paymentStatus}"`);
    }

    const capturedCase = source.match(/case "captured":[\s\S]*?case "authorized"/)?.[0] ?? "";
    expect(capturedCase).toContain("Payment received");
    expect(source).toContain("Payment is pending. No completed payment is shown.");
    expect(source).not.toContain("Your payment was received. Your car is ready to go!");
    expect(source).not.toContain('const isCash = booking?.payment_status === "pending"');
    expect(source).not.toContain(">Ready<");
  });

  it("preserves RLS and gives the user safe recovery paths", () => {
    expect(source).toContain("Try Again");
    expect(source).toContain('navigate("/my-trips")');
    expect(source).toContain('navigate("/cars")');
    expect(source).not.toContain("service_role");
    expect(source).not.toContain("auth.admin");
    expect(source).not.toContain("security definer");
  });
});
