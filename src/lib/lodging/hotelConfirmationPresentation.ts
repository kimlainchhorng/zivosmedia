export type HotelConfirmationTone =
  "success" | "warning" | "destructive" | "muted";

export interface HotelConfirmationPresentation {
  headline: string;
  subcopy: string;
  reservationLabel: string;
  paymentLabel: string;
  badgeLabel: string;
  tone: HotelConfirmationTone;
  isVerifiedConfirmation: boolean;
}

const normalize = (value: string | null | undefined) =>
  String(value || "")
    .trim()
    .toLowerCase();

const titleize = (value: string) =>
  value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());

const RESERVATION_LABELS: Record<string, string> = {
  hold: "On hold",
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  checked_out: "Checked out",
  completed: "Completed",
  cancelled: "Cancelled",
  canceled: "Cancelled",
  no_show: "No-show",
};

const PAYMENT_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  pending: "Pending",
  pending_cash: "Pay at check-in",
  pending_bank_transfer: "Bank transfer pending",
  processing: "Processing",
  authorized: "Card authorized",
  requires_capture: "Card authorized",
  paid: "Paid",
  captured: "Paid",
  requires_payment: "Payment required",
  failed: "Payment failed",
  payment_failed: "Payment failed",
  past_due: "Past due",
  refund_pending: "Refund pending",
  partially_refunded: "Partially refunded",
  refunded: "Refunded",
  cancelled_no_refund: "Cancelled — no refund",
};

const CONFIRMED_CASH_PAYMENT_STATUSES = new Set(["pending_cash"]);
const CONFIRMED_AUTHORIZED_PAYMENT_STATUSES = new Set([
  "authorized",
  "requires_capture",
]);
const CONFIRMED_PAID_PAYMENT_STATUSES = new Set(["paid", "captured"]);
const PAYMENT_WAITING_STATUSES = new Set([
  "unpaid",
  "pending",
  "pending_bank_transfer",
  "processing",
]);
const PAYMENT_ATTENTION_STATUSES = new Set([
  "requires_payment",
  "failed",
  "payment_failed",
  "past_due",
]);
const PAYMENT_REFUND_STATUSES = new Set([
  "refund_pending",
  "partially_refunded",
  "refunded",
  "cancelled_no_refund",
]);

export function hotelReservationStatusLabel(
  status: string | null | undefined,
): string {
  const normalized = normalize(status);
  return RESERVATION_LABELS[normalized] || titleize(normalized || "unknown");
}

export function hotelPaymentStatusLabel(
  status: string | null | undefined,
): string {
  const normalized = normalize(status);
  return PAYMENT_LABELS[normalized] || titleize(normalized || "unknown");
}

export function getHotelConfirmationPresentation(
  reservationStatus: string | null | undefined,
  paymentStatus: string | null | undefined,
): HotelConfirmationPresentation {
  const reservation = normalize(reservationStatus);
  const payment = normalize(paymentStatus);
  const reservationLabel = hotelReservationStatusLabel(reservation);
  const paymentLabel = hotelPaymentStatusLabel(payment);
  const base = {
    reservationLabel,
    paymentLabel,
    isVerifiedConfirmation: false,
  };

  if (reservation === "cancelled" || reservation === "canceled") {
    return {
      ...base,
      headline: "Reservation cancelled",
      subcopy: PAYMENT_REFUND_STATUSES.has(payment)
        ? "This stay is cancelled. Review My Trips for the current refund status."
        : "This stay is cancelled. No active reservation is being confirmed on this page.",
      badgeLabel: "Cancelled",
      tone: "destructive",
    };
  }

  if (reservation === "no_show") {
    return {
      ...base,
      headline: "Reservation marked as no-show",
      subcopy:
        "The property marked this stay as a no-show. Review My Trips or contact support if this is unexpected.",
      badgeLabel: "No-show",
      tone: "destructive",
    };
  }

  if (reservation === "checked_out" || reservation === "completed") {
    return {
      ...base,
      headline: "Stay complete",
      subcopy:
        "This stay is complete. Open My Trips for the final reservation and payment record.",
      badgeLabel: "Complete",
      tone: "muted",
    };
  }

  if (PAYMENT_ATTENTION_STATUSES.has(payment)) {
    return {
      ...base,
      headline: "Payment needs attention",
      subcopy:
        "Payment did not complete. Open My Trips to review the reservation before relying on this stay.",
      badgeLabel: "Needs attention",
      tone: "destructive",
    };
  }

  if (PAYMENT_REFUND_STATUSES.has(payment)) {
    return {
      ...base,
      headline: "Payment status changed",
      subcopy:
        "This payment has a refund or cancellation state. Open My Trips for the current reservation outcome.",
      badgeLabel: paymentLabel,
      tone: "warning",
    };
  }

  if (reservation === "hold" || reservation === "pending") {
    const paymentRequired =
      !payment ||
      PAYMENT_WAITING_STATUSES.has(payment) ||
      payment === "requires_payment";
    return {
      ...base,
      headline: paymentRequired
        ? "Room held — payment required"
        : "Room held — confirmation pending",
      subcopy: paymentRequired
        ? "The room is temporarily held, but the stay is not confirmed. Complete or verify payment from My Trips."
        : "The reservation is still on hold. A payment state alone does not confirm the stay.",
      badgeLabel: "On hold",
      tone: "warning",
    };
  }

  if (reservation === "confirmed") {
    if (CONFIRMED_CASH_PAYMENT_STATUSES.has(payment)) {
      return {
        ...base,
        headline: "Room confirmed",
        subcopy:
          "Your room is confirmed. Pay the full amount at the front desk when you check in.",
        badgeLabel: "Confirmed",
        tone: "success",
        isVerifiedConfirmation: true,
      };
    }

    if (CONFIRMED_AUTHORIZED_PAYMENT_STATUSES.has(payment)) {
      return {
        ...base,
        headline: "Card authorized",
        subcopy: "Your card is authorized and the server confirms your stay.",
        badgeLabel: "Confirmed",
        tone: "success",
        isVerifiedConfirmation: true,
      };
    }

    if (CONFIRMED_PAID_PAYMENT_STATUSES.has(payment)) {
      return {
        ...base,
        headline: "Payment received",
        subcopy: "Your payment was received and the server confirms your stay.",
        badgeLabel: "Confirmed",
        tone: "success",
        isVerifiedConfirmation: true,
      };
    }

    if (PAYMENT_WAITING_STATUSES.has(payment)) {
      return {
        ...base,
        headline: "Reservation confirmed — payment pending",
        subcopy:
          "The reservation is confirmed, but payment has not completed. Review My Trips for the current payment state.",
        badgeLabel: "Payment pending",
        tone: "warning",
      };
    }

    return {
      ...base,
      headline: "Confirmation status needs review",
      subcopy:
        "The reservation is marked confirmed, but its payment state is unknown. Review My Trips before relying on this stay.",
      badgeLabel: "Needs review",
      tone: "muted",
    };
  }

  if (reservation === "checked_in") {
    return {
      ...base,
      headline: "Stay in progress",
      subcopy:
        "This reservation is already checked in. Open My Trips for its current details.",
      badgeLabel: "Checked in",
      tone: "muted",
    };
  }

  return {
    ...base,
    headline: "Reservation status unavailable",
    subcopy:
      "This reservation has an unrecognized server state. Open My Trips before relying on this stay.",
    badgeLabel: "Unavailable",
    tone: "muted",
  };
}
