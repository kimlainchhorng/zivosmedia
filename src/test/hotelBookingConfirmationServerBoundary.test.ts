import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getHotelConfirmationPresentation,
  hotelPaymentStatusLabel,
} from "@/lib/lodging/hotelConfirmationPresentation";

const pageSource = readFileSync(
  resolve(process.cwd(), "src/pages/lodging/HotelBookingConfirmedPage.tsx"),
  "utf8",
).replace(/\r\n/g, "\n");

describe("hotel booking confirmation server boundary", () => {
  it("uses success presentation only for confirmed reservations with verified payment combinations", () => {
    const verifiedPaymentStatuses = [
      "pending_cash",
      "authorized",
      "requires_capture",
      "paid",
      "captured",
    ] as const;

    for (const paymentStatus of verifiedPaymentStatuses) {
      expect(
        getHotelConfirmationPresentation("confirmed", paymentStatus),
      ).toMatchObject({
        tone: "success",
        isVerifiedConfirmation: true,
        badgeLabel: "Confirmed",
      });
    }

    const reservationStatuses = [
      "hold",
      "pending",
      "confirmed",
      "checked_in",
      "checked_out",
      "completed",
      "cancelled",
      "no_show",
      "unknown_state",
      null,
    ] as const;
    const paymentStatuses = [
      ...verifiedPaymentStatuses,
      "unpaid",
      "pending",
      "pending_bank_transfer",
      "processing",
      "requires_payment",
      "failed",
      "payment_failed",
      "past_due",
      "refund_pending",
      "partially_refunded",
      "refunded",
      "cancelled_no_refund",
      "unknown_state",
      null,
    ] as const;

    for (const reservationStatus of reservationStatuses) {
      for (const paymentStatus of paymentStatuses) {
        const presentation = getHotelConfirmationPresentation(
          reservationStatus,
          paymentStatus,
        );
        const shouldConfirm =
          reservationStatus === "confirmed" &&
          verifiedPaymentStatuses.includes(
            paymentStatus as (typeof verifiedPaymentStatuses)[number],
          );

        expect(presentation.isVerifiedConfirmation).toBe(shouldConfirm);
        expect(presentation.tone === "success").toBe(shouldConfirm);
      }
    }
  });

  it("keeps live held and pending combinations explicitly unconfirmed", () => {
    expect(getHotelConfirmationPresentation("hold", "pending")).toMatchObject({
      headline: "Room held — payment required",
      reservationLabel: "On hold",
      paymentLabel: "Pending",
      badgeLabel: "On hold",
      tone: "warning",
      isVerifiedConfirmation: false,
    });
    expect(getHotelConfirmationPresentation("hold", "paid")).toMatchObject({
      headline: "Room held — confirmation pending",
      tone: "warning",
      isVerifiedConfirmation: false,
    });
  });

  it("lets cancelled, failed, and refund states override any positive payment wording", () => {
    expect(getHotelConfirmationPresentation("cancelled", "paid")).toMatchObject(
      {
        headline: "Reservation cancelled",
        badgeLabel: "Cancelled",
        tone: "destructive",
        isVerifiedConfirmation: false,
      },
    );
    expect(
      getHotelConfirmationPresentation("no_show", "authorized"),
    ).toMatchObject({
      headline: "Reservation marked as no-show",
      tone: "destructive",
    });
    expect(
      getHotelConfirmationPresentation("confirmed", "failed"),
    ).toMatchObject({
      headline: "Payment needs attention",
      tone: "destructive",
      isVerifiedConfirmation: false,
    });
    expect(
      getHotelConfirmationPresentation("confirmed", "refunded"),
    ).toMatchObject({
      headline: "Payment status changed",
      badgeLabel: "Refunded",
      tone: "warning",
      isVerifiedConfirmation: false,
    });
  });

  it("fails closed for unknown server states while preserving readable labels", () => {
    expect(
      getHotelConfirmationPresentation("new_state", "provider_wait"),
    ).toMatchObject({
      headline: "Reservation status unavailable",
      reservationLabel: "New State",
      paymentLabel: "Provider Wait",
      badgeLabel: "Unavailable",
      tone: "muted",
      isVerifiedConfirmation: false,
    });
    expect(hotelPaymentStatusLabel("pending_bank_transfer")).toBe(
      "Bank transfer pending",
    );
  });

  it("renders the owner-scoped read through the fail-closed presentation and recovery path", () => {
    expect(pageSource).toContain('.from("lodge_reservations")');
    expect(pageSource).toContain('.eq("id", reservationId)');
    expect(pageSource).toContain('.eq("store_id", storeId)');
    expect(pageSource).toContain("getHotelConfirmationPresentation(");
    expect(pageSource).toContain("presentation.reservationLabel");
    expect(pageSource).toContain("presentation.paymentLabel");
    expect(pageSource).toContain("presentation.badgeLabel");
    expect(pageSource).toContain("Try Again");
    expect(pageSource).toContain("View My Trips");
    expect(pageSource).toContain("presentation.isVerifiedConfirmation && (");
    expect(pageSource).toContain('aria-label="Share confirmed stay"');
    expect(pageSource).not.toContain("Booking Confirmed!");
    expect(pageSource).not.toContain(">Ready<");
    expect(pageSource).not.toContain("service_role");
    expect(pageSource).not.toContain("auth.admin");
  });
});
