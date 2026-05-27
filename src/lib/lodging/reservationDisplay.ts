export type LodgingTripTone = "success" | "warning" | "destructive" | "muted";

export interface LodgingTripStateCopy {
  title: string;
  badge: string;
  description: string;
  tone: LodgingTripTone;
}

const normalize = (value: string | null | undefined) =>
  String(value || "").trim().toLowerCase();

const titleize = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const RESERVATION_STATUS_LABELS: Record<string, string> = {
  hold: "On hold",
  confirmed: "Confirmed",
  checked_in: "Checked in",
  checked_out: "Checked out",
  cancelled: "Cancelled",
  no_show: "No-show",
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  unpaid: "Unpaid",
  pending: "Pending",
  pending_cash: "Pay at front desk",
  processing: "Processing",
  authorized: "Card authorized",
  requires_capture: "Card authorized",
  paid: "Paid",
  captured: "Paid",
  refund_pending: "Refund pending",
  refunded: "Refunded",
  failed: "Payment failed",
  past_due: "Past due",
  requires_payment: "Payment required",
  cancelled_no_refund: "Cancelled - no refund",
};

const FINAL_RESERVATION_STATUSES = new Set(["checked_out", "cancelled", "no_show"]);
const PAYMENT_ATTENTION_STATUSES = new Set(["failed", "past_due", "requires_payment"]);
const PAYMENT_AUTHORIZED_STATUSES = new Set(["authorized", "requires_capture"]);
const PAYMENT_PAID_STATUSES = new Set(["paid", "captured"]);
const PAYMENT_WAITING_STATUSES = new Set(["pending", "processing", "unpaid"]);

export function humanizeLodgingStatus(status: string | null | undefined): string {
  const key = normalize(status);
  return RESERVATION_STATUS_LABELS[key] || titleize(key || "unknown");
}

export function lodgingReservationStatusLabel(status: string | null | undefined): string {
  return humanizeLodgingStatus(status);
}

export function lodgingPaymentStatusLabel(status: string | null | undefined): string {
  const key = normalize(status);
  return PAYMENT_STATUS_LABELS[key] || titleize(key || "unknown");
}

export function isFinalLodgingReservationStatus(status: string | null | undefined): boolean {
  return FINAL_RESERVATION_STATUSES.has(normalize(status));
}

export function getLodgingTripStateCopy(
  reservationStatus: string | null | undefined,
  paymentStatus: string | null | undefined,
): LodgingTripStateCopy {
  const reservation = normalize(reservationStatus) || "hold";
  const payment = normalize(paymentStatus) || "pending";
  const reservationLabel = lodgingReservationStatusLabel(reservation);
  const paymentLabel = lodgingPaymentStatusLabel(payment);

  if (reservation === "cancelled") {
    const refundTone = payment.includes("refund") ? "warning" : "muted";
    return {
      title: "Reservation cancelled",
      badge: paymentLabel,
      description: payment.includes("refund")
        ? "The stay is cancelled and the refund workflow is in progress."
        : "The stay is cancelled. Review the payment section for the final outcome.",
      tone: refundTone,
    };
  }

  if (reservation === "no_show") {
    return {
      title: "Marked as no-show",
      badge: paymentLabel,
      description: "The property marked this reservation as a no-show.",
      tone: "destructive",
    };
  }

  if (reservation === "checked_out") {
    return {
      title: "Stay complete",
      badge: paymentLabel,
      description: "This reservation is complete. Receipts and review options are available below.",
      tone: "muted",
    };
  }

  if (payment === "pending_cash") {
    return {
      title: "Room confirmed",
      badge: paymentLabel,
      description: "Your room is confirmed. Pay at the front desk when you arrive.",
      tone: "success",
    };
  }

  if (PAYMENT_AUTHORIZED_STATUSES.has(payment)) {
    return {
      title: "Card authorized",
      badge: reservationLabel,
      description: "Your card has been authorized and your stay is confirmed.",
      tone: "success",
    };
  }

  if (PAYMENT_PAID_STATUSES.has(payment)) {
    return {
      title: "Payment received",
      badge: reservationLabel,
      description: "Payment has been received for this stay. Trip actions and receipts are available below.",
      tone: "success",
    };
  }

  if (PAYMENT_ATTENTION_STATUSES.has(payment)) {
    return {
      title: "Payment needs attention",
      badge: paymentLabel,
      description: "The reservation is still active, but the saved payment method needs review.",
      tone: "destructive",
    };
  }

  if (PAYMENT_WAITING_STATUSES.has(payment)) {
    return {
      title: "Payment pending",
      badge: paymentLabel,
      description: "Payment is still being processed. Use the payment summary below for the current state.",
      tone: "warning",
    };
  }

  if (payment === "refund_pending") {
    return {
      title: "Refund in progress",
      badge: reservationLabel,
      description: "The refund has started and may take a few business days to settle.",
      tone: "warning",
    };
  }

  if (reservation === "checked_in") {
    return {
      title: "You are checked in",
      badge: paymentLabel,
      description: "Your stay is active. Use this page for receipts, add-ons, and property messages.",
      tone: "success",
    };
  }

  if (reservation === "confirmed") {
    return {
      title: "Your stay is confirmed",
      badge: paymentLabel,
      description: "Your reservation is confirmed. Check-in details and trip actions are below.",
      tone: "success",
    };
  }

  if (reservation === "hold") {
    return {
      title: "Reservation on hold",
      badge: paymentLabel,
      description: "The property is holding this reservation while payment or confirmation finishes.",
      tone: PAYMENT_AUTHORIZED_STATUSES.has(payment) || PAYMENT_PAID_STATUSES.has(payment) ? "success" : "warning",
    };
  }

  return {
    title: reservationLabel,
    badge: paymentLabel,
    description: "Review your reservation details and payment state below.",
    tone: "muted",
  };
}
