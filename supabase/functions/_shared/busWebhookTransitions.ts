/**
 * Pure, side-effect-free reconciliation logic for the bus Stripe webhook.
 *
 * Deliberately has NO Deno/npm imports so it can be imported by both the Deno edge
 * function (stripe-bus-webhook) and a Node/vitest unit test — the transition rules are the
 * part worth testing, and this keeps them honestly exercised rather than source-grepped.
 */

export type BusPaymentStatus =
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded"
  | "voided";

export type BusBookingStatus = "hold" | "confirmed" | "cancelled";

/**
 * Monotonic rank: a webhook must never move a booking's payment_status to a lower rank.
 * captured(3) outranks authorized(2); the terminal voided/refunded(4) outrank captured.
 * failed(1) is low so a stray failure cannot clobber an authorized/captured booking.
 */
export const PAYMENT_RANK: Record<BusPaymentStatus, number> = {
  pending: 0,
  failed: 1,
  authorized: 2,
  captured: 3,
  voided: 4,
  refunded: 4,
};

export interface ReconcileInput {
  eventType: string;
  currentPaymentStatus: BusPaymentStatus;
  currentBookingStatus: BusBookingStatus;
  /** For charge.refund.updated, whether the refund actually succeeded. */
  refundSucceeded?: boolean;
}

export interface ReconcileDecision {
  apply: boolean;
  targetPay: BusPaymentStatus | null;
  targetBooking: BusBookingStatus | null;
  reason:
    | "applied"
    | "unhandled_event"
    | "already_at_target"
    | "would_regress"
    | "booking_locked"
    | "refund_not_succeeded";
}

/** What terminal state does this Stripe event map a bus booking toward? */
export function targetForEvent(
  eventType: string,
  refundSucceeded = true,
): { pay: BusPaymentStatus | null; booking: BusBookingStatus | null } {
  switch (eventType) {
    case "payment_intent.amount_capturable_updated":
      return { pay: "authorized", booking: null }; // awaiting operator capture; stays 'hold'
    case "payment_intent.succeeded":
      return { pay: "captured", booking: "confirmed" };
    case "payment_intent.payment_failed":
      return { pay: "failed", booking: null };
    case "payment_intent.canceled":
      return { pay: "voided", booking: "cancelled" };
    case "charge.refunded":
      return { pay: "refunded", booking: "cancelled" };
    case "charge.refund.updated":
      return refundSucceeded
        ? { pay: "refunded", booking: "cancelled" }
        : { pay: null, booking: null };
    default:
      return { pay: null, booking: null };
  }
}

/**
 * Decide whether/how to reconcile a bus booking for a verified Stripe event. Idempotent:
 * replaying the same event (already at target) returns apply=false; out-of-order events
 * that would regress a more-advanced state return apply=false.
 */
export function decideBusReconciliation(input: ReconcileInput): ReconcileDecision {
  const { eventType, currentPaymentStatus, currentBookingStatus } = input;
  const { pay: targetPay, booking: targetBooking } = targetForEvent(
    eventType,
    input.refundSucceeded ?? true,
  );

  if (targetPay === null) {
    const reason =
      eventType === "charge.refund.updated" ? "refund_not_succeeded" : "unhandled_event";
    return { apply: false, targetPay: null, targetBooking, reason };
  }

  // Never resurrect a cancelled booking (unless the event itself cancels it).
  if (currentBookingStatus === "cancelled" && targetBooking !== "cancelled") {
    return { apply: false, targetPay, targetBooking, reason: "booking_locked" };
  }

  // Never regress to a lower-ranked payment state.
  if (PAYMENT_RANK[targetPay] < PAYMENT_RANK[currentPaymentStatus]) {
    return { apply: false, targetPay, targetBooking, reason: "would_regress" };
  }

  const alreadyAtTarget =
    currentPaymentStatus === targetPay &&
    (targetBooking === null || currentBookingStatus === targetBooking);
  if (alreadyAtTarget) {
    return { apply: false, targetPay, targetBooking, reason: "already_at_target" };
  }

  return { apply: true, targetPay, targetBooking, reason: "applied" };
}
