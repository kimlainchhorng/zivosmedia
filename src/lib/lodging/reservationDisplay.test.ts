/**
 * Contract tests for the lodging reservation-display helpers. These turn raw
 * reservation/payment status strings into the labels, the "is this trip over"
 * predicate, and the title/badge/tone state-copy a guest sees on their stay page.
 * getLodgingTripStateCopy is the correctness-load-bearing piece: it is an ORDERED
 * branch cascade, so the precedence is the contract — a terminal reservation
 * (cancelled/no_show/checked_out) overrides any payment state, and for an active
 * reservation the PAYMENT branches are evaluated BEFORE the reservation branches, so
 * e.g. a confirmed+paid stay renders "Payment received" (not "Your stay is
 * confirmed"). The branch also decides whether the badge shows the payment label or
 * the reservation label. Expected values were produced by an independent re-derivation
 * of the documented label maps + branch order, not by importing the module.
 *
 * Scope: title/badge/tone are the semantic routing and are asserted. The long
 * editorial `description` copy is intentionally NOT pinned — it is prose that can be
 * reworded without changing behavior, so asserting it would only create churn.
 */
import { describe, it, expect } from "vitest";
import {
  humanizeLodgingStatus,
  lodgingReservationStatusLabel,
  lodgingPaymentStatusLabel,
  isFinalLodgingReservationStatus,
  getLodgingTripStateCopy,
} from "./reservationDisplay";

describe("humanizeLodgingStatus / lodgingReservationStatusLabel", () => {
  it("maps known statuses, normalizes case/whitespace, and titleizes the rest", () => {
    expect(humanizeLodgingStatus("hold")).toBe("On hold");
    expect(humanizeLodgingStatus("no_show")).toBe("No-show");
    expect(humanizeLodgingStatus("  CONFIRMED  ")).toBe("Confirmed");
    expect(humanizeLodgingStatus("vip_suite")).toBe("Vip Suite"); // unmapped -> titleized
  });

  it("falls back to 'Unknown' for null/empty/whitespace", () => {
    expect(humanizeLodgingStatus(null)).toBe("Unknown");
    expect(humanizeLodgingStatus(undefined)).toBe("Unknown");
    expect(humanizeLodgingStatus("   ")).toBe("Unknown");
  });

  it("lodgingReservationStatusLabel is an alias of humanizeLodgingStatus", () => {
    expect(lodgingReservationStatusLabel("checked_in")).toBe("Checked in");
    expect(lodgingReservationStatusLabel("checked_in")).toBe(humanizeLodgingStatus("checked_in"));
  });
});

describe("lodgingPaymentStatusLabel", () => {
  it("maps known payment statuses (incl. synonyms) and titleizes the rest", () => {
    expect(lodgingPaymentStatusLabel("pending_cash")).toBe("Pay at front desk");
    expect(lodgingPaymentStatusLabel("requires_capture")).toBe("Card authorized");
    expect(lodgingPaymentStatusLabel("captured")).toBe("Paid");
    expect(lodgingPaymentStatusLabel("cancelled_no_refund")).toBe("Cancelled - no refund");
    expect(lodgingPaymentStatusLabel("weird_state")).toBe("Weird State"); // unmapped
  });

  it("falls back to 'Unknown' for null", () => {
    expect(lodgingPaymentStatusLabel(null)).toBe("Unknown");
  });
});

describe("isFinalLodgingReservationStatus", () => {
  it("is true only for checked_out/cancelled/no_show (case/whitespace-insensitive)", () => {
    expect(isFinalLodgingReservationStatus("checked_out")).toBe(true);
    expect(isFinalLodgingReservationStatus("  CANCELLED ")).toBe(true);
    expect(isFinalLodgingReservationStatus("no_show")).toBe(true);
    expect(isFinalLodgingReservationStatus("confirmed")).toBe(false);
    expect(isFinalLodgingReservationStatus(null)).toBe(false);
  });
});

describe("getLodgingTripStateCopy precedence", () => {
  it("lets a terminal reservation override any payment state", () => {
    // cancelled wins over paid; tone depends on whether payment mentions a refund.
    expect(getLodgingTripStateCopy("cancelled", "refunded")).toMatchObject({
      title: "Reservation cancelled",
      badge: "Refunded",
      tone: "warning",
    });
    expect(getLodgingTripStateCopy("cancelled", "paid")).toMatchObject({
      title: "Reservation cancelled",
      badge: "Paid",
      tone: "muted",
    });
    expect(getLodgingTripStateCopy("no_show", "paid")).toMatchObject({
      title: "Marked as no-show",
      tone: "destructive",
    });
    expect(getLodgingTripStateCopy("checked_out", "paid")).toMatchObject({
      title: "Stay complete",
      tone: "muted",
    });
  });

  it("evaluates payment branches before the active-reservation branches", () => {
    // pending_cash, authorized, and paid each pre-empt the confirmed-reservation copy.
    expect(getLodgingTripStateCopy("confirmed", "pending_cash")).toMatchObject({
      title: "Room confirmed",
      tone: "success",
    });
    // When the payment branch fires for an active reservation the badge shows the
    // RESERVATION label, not the payment label.
    expect(getLodgingTripStateCopy("confirmed", "authorized")).toMatchObject({
      title: "Card authorized",
      badge: "Confirmed",
      tone: "success",
    });
    expect(getLodgingTripStateCopy("confirmed", "paid")).toMatchObject({
      title: "Payment received",
      badge: "Confirmed",
      tone: "success",
    });
    expect(getLodgingTripStateCopy("confirmed", "failed")).toMatchObject({
      title: "Payment needs attention",
      tone: "destructive",
    });
    expect(getLodgingTripStateCopy("confirmed", "pending")).toMatchObject({
      title: "Payment pending",
      tone: "warning",
    });
  });

  it("falls through to the reservation branches only when no payment branch matched", () => {
    // "custom" payment matches no payment set, so the reservation branch decides.
    expect(getLodgingTripStateCopy("checked_in", "custom")).toMatchObject({
      title: "You are checked in",
      badge: "Custom",
      tone: "success",
    });
    expect(getLodgingTripStateCopy("confirmed", "custom")).toMatchObject({
      title: "Your stay is confirmed",
      tone: "success",
    });
    expect(getLodgingTripStateCopy("hold", "custom")).toMatchObject({
      title: "Reservation on hold",
      tone: "warning",
    });
  });

  it("defaults null reservation->hold and null payment->pending (renders 'Payment pending')", () => {
    expect(getLodgingTripStateCopy(null, null)).toMatchObject({
      title: "Payment pending",
      badge: "Pending",
      tone: "warning",
    });
  });

  it("uses the muted fallback for an unrecognized reservation+payment pair", () => {
    expect(getLodgingTripStateCopy("unknown_res", "custom")).toMatchObject({
      title: "Unknown Res",
      badge: "Custom",
      tone: "muted",
    });
  });
});
