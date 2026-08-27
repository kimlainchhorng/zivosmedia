import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/lodging/HotelRoomCheckoutPage.tsx"),
  "utf8",
);
const compactSource = source.replace(/\s+/g, " ");

describe("hotel checkout date boundary", () => {
  it("resolves URL dates through the shared fail-closed validator", () => {
    expect(source).toContain('from "@/lib/lodging/hotelDateWindow"');
    expect(source).toContain("const dateWindow = resolveHotelDateWindow(");
    expect(source).not.toContain("const parseParamDate");
    expect(source).not.toContain("?? today()");
    expect(source).not.toContain(
      "Math.max(1, differenceInCalendarDays(checkOut, checkIn))",
    );
  });

  it("hides dates, price, guest, payment, and booking controls for an invalid stay", () => {
    expect(compactSource).toContain(
      "const checkoutDetailsReady = dateWindow.ok &&",
    );
    expect(compactSource).toContain(
      "loadError || !room || !dateWindow.ok ? null",
    );
    expect(source).toContain('aria-labelledby="hotel-checkout-blocked-title"');
    expect(compactSource).toContain(
      'dateWindow.ok ? "Back to rooms" : "Choose dates"',
    );
    expect(source).toContain(
      '"Check-out must be at least one night after check-in. Choose a valid stay."',
    );
  });

  it("rejects invalid dates again before reservation creation", () => {
    const handlerStart = source.indexOf("const handleConfirm");
    const reservationStart = source.indexOf(
      "createLodgeGuestReservation({",
      handlerStart,
    );
    const handlerBeforeReservation = source.slice(
      handlerStart,
      reservationStart,
    );

    expect(handlerStart).toBeGreaterThan(-1);
    expect(reservationStart).toBeGreaterThan(handlerStart);
    expect(handlerBeforeReservation).toContain("if (dateWindow.ok === false)");
    expect(handlerBeforeReservation).toContain("return;");
    expect(source).toContain("check_in: dateWindow.checkInIso");
    expect(source).toContain("check_out: dateWindow.checkOutIso");
  });
});
