export type LodgingPaymentMode = "deposit" | "full";
export const LODGING_PAYMENT_AUTHORITY_VERSION = "v2";

const PAYMENT_INTENT_ALLOWED_CURRENT_STATUSES: Record<
  string,
  readonly string[]
> = {
  "payment_intent.amount_capturable_updated": ["pending", "processing"],
  "payment_intent.processing": ["pending"],
  "payment_intent.succeeded": ["pending", "processing", "failed", "authorized"],
  "payment_intent.payment_failed": ["pending", "processing"],
  "payment_intent.canceled": ["pending", "processing", "failed", "authorized"],
};

/**
 * Reservation states from which a Stripe PaymentIntent event may advance the
 * lodging payment. These guards make delayed events monotonic even when Stripe
 * delivers distinct event IDs out of order.
 */
export function allowedCurrentLodgingPaymentStatuses(
  eventType: string,
): readonly string[] {
  return PAYMENT_INTENT_ALLOWED_CURRENT_STATUSES[eventType] ?? [];
}

/**
 * A manual-capture retry may recover from `failed` on the same PaymentIntent.
 * That one backward-looking database edge requires a live provider-state proof.
 */
export function requiredStripeStatusForLodgingRecovery(input: {
  eventType: string;
  currentPaymentStatus: unknown;
}): string | null {
  return input.eventType === "payment_intent.amount_capturable_updated" &&
    input.currentPaymentStatus === "failed"
    ? "requires_capture"
    : null;
}

/**
 * Default/legacy hosted callers need the stored provider generation so a later
 * click can replace an expired Session. Explicit client attempt IDs stay stable
 * across transport retries even after the reservation pointer is updated.
 */
export function lodgingPaymentAttemptScope(input: {
  clientAttemptId: string;
  currentSessionId: unknown;
  currentPaymentIntentId: unknown;
}): string {
  if (input.clientAttemptId !== "default") {
    return `client:${input.clientAttemptId}`;
  }
  const providerGeneration =
    (typeof input.currentSessionId === "string" && input.currentSessionId) ||
    (typeof input.currentPaymentIntentId === "string" &&
      input.currentPaymentIntentId) ||
    "none";
  return `provider:${providerGeneration}`;
}

/** Returns the proportional connected-account reversal for one Stripe refund. */
export function calculateLodgingTransferReversalCents(input: {
  transferCents: number;
  settledCents: number;
  refundCents: number;
}): number | null {
  if (
    !Number.isSafeInteger(input.transferCents) ||
    input.transferCents <= 0 ||
    !Number.isSafeInteger(input.settledCents) ||
    input.settledCents <= 0 ||
    !Number.isSafeInteger(input.refundCents) ||
    input.refundCents <= 0
  ) {
    return null;
  }
  return Math.min(
    input.transferCents,
    Math.round(
      (input.transferCents * Math.min(input.refundCents, input.settledCents)) /
        input.settledCents,
    ),
  );
}

export interface LodgingPaymentReservation {
  store_id: unknown;
  guest_details: unknown;
  total_cents: unknown;
  deposit_cents: unknown;
  paid_cents: unknown;
}

export type LodgingPaymentAuthorityFailure =
  | "store_mismatch"
  | "payment_method_unavailable"
  | "mode_mismatch"
  | "amount_unavailable"
  | "requested_amount_invalid"
  | "amount_mismatch";

export type LodgingPaymentAuthorityResult =
  | {
      ok: true;
      mode: LodgingPaymentMode;
      authorizedCents: number;
      payableCents: number;
    }
  | {
      ok: false;
      reason: LodgingPaymentAuthorityFailure;
    };

export function isAuthorizedLodgingPaymentCaller(input: {
  reservationGuestId: unknown;
  userId: unknown;
  isGlobalAdmin: boolean;
}): boolean {
  if (typeof input.userId !== "string" || !input.userId) return false;
  return input.reservationGuestId === input.userId || input.isGlobalAdmin;
}

export function isAuthoritativeLodgingCheckoutSession(input: {
  session: unknown;
  reservationId: string;
  storeId: string;
  mode: LodgingPaymentMode;
  payableCents: number;
}): boolean {
  if (!input.session || typeof input.session !== "object") return false;
  const session = input.session as Record<string, unknown>;
  const metadata = paymentMetadataFrom(session.metadata);
  return (
    Number(session.amount_total) === input.payableCents &&
    String(session.currency || "").toLowerCase() === "usd" &&
    hasCurrentLodgingPaymentAuthorityMetadata(metadata) &&
    metadata.reservation_id === input.reservationId &&
    metadata.store_id === input.storeId &&
    metadata.mode === input.mode
  );
}

export function isAuthoritativeLodgingPaymentIntent(input: {
  paymentIntent: unknown;
  paymentIntentId: string;
  reservationId: string;
  storeId: string;
  mode: LodgingPaymentMode;
  payableCents: number;
}): boolean {
  if (!input.paymentIntent || typeof input.paymentIntent !== "object")
    return false;
  const paymentIntent = input.paymentIntent as Record<string, unknown>;
  const metadata = paymentMetadataFrom(paymentIntent.metadata);
  const expectedCaptureMethod =
    input.mode === "deposit" ? "manual" : "automatic";
  return (
    paymentIntent.id === input.paymentIntentId &&
    Number(paymentIntent.amount) === input.payableCents &&
    String(paymentIntent.currency || "").toLowerCase() === "usd" &&
    paymentIntent.capture_method === expectedCaptureMethod &&
    hasCurrentLodgingPaymentAuthorityMetadata(metadata) &&
    metadata.reservation_id === input.reservationId &&
    metadata.store_id === input.storeId &&
    metadata.mode === input.mode
  );
}

export function isCompleteLodgingPaymentIntentTransition(input: {
  eventType: string;
  paymentIntent: unknown;
  payableCents: number;
}): boolean {
  if (!input.paymentIntent || typeof input.paymentIntent !== "object")
    return false;
  const paymentIntent = input.paymentIntent as Record<string, unknown>;
  if (input.eventType === "payment_intent.amount_capturable_updated") {
    return Number(paymentIntent.amount_capturable) === input.payableCents;
  }
  if (input.eventType === "payment_intent.succeeded") {
    return Number(paymentIntent.amount_received) === input.payableCents;
  }
  return true;
}

type PaymentMetadata = Record<string, unknown>;

const paymentMetadataFrom = (value: unknown): PaymentMetadata =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as PaymentMetadata)
    : {};

export function hasCurrentLodgingPaymentAuthorityMetadata(
  value: unknown,
): boolean {
  return (
    paymentMetadataFrom(value).lodging_payment_authority ===
    LODGING_PAYMENT_AUTHORITY_VERSION
  );
}

const toCents = (value: unknown): number | null => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const cents = Number(value);
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
};

const paymentMethodFrom = (guestDetails: unknown): string | null => {
  if (
    !guestDetails ||
    typeof guestDetails !== "object" ||
    Array.isArray(guestDetails)
  ) {
    return null;
  }
  const value = (guestDetails as Record<string, unknown>).pay_method;
  return typeof value === "string" ? value.trim().toLowerCase() : null;
};

/** Derives the only payment terms the persisted reservation permits. */
export function deriveLodgingPaymentAuthority(
  reservation: LodgingPaymentReservation,
): LodgingPaymentAuthorityResult {
  const totalCents = toCents(reservation.total_cents);
  const depositCents = toCents(reservation.deposit_cents);
  const paidCents = toCents(reservation.paid_cents);
  if (paidCents == null) {
    return { ok: false, reason: "amount_unavailable" };
  }
  const paymentMethod = paymentMethodFrom(reservation.guest_details);

  let mode: LodgingPaymentMode;
  if (paymentMethod === "card") {
    mode = "full";
  } else if (paymentMethod === "card_on_arrival") {
    if (depositCents == null)
      return { ok: false, reason: "amount_unavailable" };
    mode = depositCents > 0 ? "deposit" : "full";
  } else {
    return { ok: false, reason: "payment_method_unavailable" };
  }

  const authorizedCents = mode === "deposit" ? depositCents : totalCents;
  if (authorizedCents == null) {
    return { ok: false, reason: "amount_unavailable" };
  }
  const payableCents = authorizedCents - paidCents;
  if (
    !Number.isSafeInteger(payableCents) ||
    payableCents < 0 ||
    (payableCents > 0 && payableCents < 50)
  ) {
    return { ok: false, reason: "amount_unavailable" };
  }
  return { ok: true, mode, authorizedCents, payableCents };
}

/**
 * Resolves the server-owned charge while treating browser terms only as
 * consent/staleness assertions. Browser values never select the Stripe charge.
 */
export function resolveLodgingPaymentAuthority(input: {
  reservation: LodgingPaymentReservation;
  requestedStoreId: unknown;
  requestedMode: unknown;
  requestedCents: unknown;
}): LodgingPaymentAuthorityResult {
  const { reservation } = input;
  if (
    typeof reservation.store_id !== "string" ||
    typeof input.requestedStoreId !== "string" ||
    input.requestedStoreId !== reservation.store_id
  ) {
    return { ok: false, reason: "store_mismatch" };
  }

  const authority = deriveLodgingPaymentAuthority(reservation);
  if (!authority.ok) return authority;
  if (input.requestedMode !== authority.mode) {
    return { ok: false, reason: "mode_mismatch" };
  }

  const requestedCents = toCents(input.requestedCents);
  if (requestedCents == null) {
    return { ok: false, reason: "requested_amount_invalid" };
  }
  if (requestedCents !== authority.authorizedCents) {
    return { ok: false, reason: "amount_mismatch" };
  }

  return authority;
}
