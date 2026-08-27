const CUTLUY_PAYMENT_ID_PATTERN = /^[A-Za-z0-9_-]{16,128}$/;
const ZIVO_LODGING_REFERENCE_PATTERN =
  /^zivo:lodging:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

const CUTLUY_EVENT_TYPES = new Set([
  "payment.completed",
  "payment.scanned",
  "payment.expired",
  "payment.failed",
]);

const CUTLUY_PAYMENT_STATUSES = new Set([
  "pending",
  "scanned",
  "paid",
  "expired",
  "failed",
]);

function plainRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value
    : null;
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function isValidCutluyPaymentId(value) {
  const paymentId = nonEmptyString(value);
  return Boolean(paymentId && CUTLUY_PAYMENT_ID_PATTERN.test(paymentId));
}

export function createCutluyLodgingReference(reservationId) {
  const reference = `zivo:lodging:${reservationId}`;
  return ZIVO_LODGING_REFERENCE_PATTERN.test(reference)
    ? reference.toLowerCase()
    : null;
}

export function parseCutluyLodgingReference(value) {
  const match = nonEmptyString(value)?.match(ZIVO_LODGING_REFERENCE_PATTERN);
  return match ? { reservationId: match[1].toLowerCase() } : null;
}

export function createCutluyProviderReference(paymentId) {
  const normalized = nonEmptyString(paymentId);
  return normalized && CUTLUY_PAYMENT_ID_PATTERN.test(normalized)
    ? `cutluy:${normalized}`
    : null;
}

export function parseCutluyProviderReference(value) {
  const normalized = nonEmptyString(value);
  if (!normalized?.startsWith("cutluy:")) return null;
  const paymentId = normalized.slice("cutluy:".length);
  return CUTLUY_PAYMENT_ID_PATTERN.test(paymentId) ? paymentId : null;
}

/** Convert CutLuy's strict positive USD decimal shape to integer cents. */
export function decimalUsdToCents(value) {
  const normalized =
    typeof value === "number" || typeof value === "string"
      ? String(value).trim()
      : "";
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null;

  const [whole, fraction = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

/** Format server-owned integer cents for CutLuy without floating-point math. */
export function centsToDecimalUsd(value) {
  if (!Number.isSafeInteger(value) || value <= 0) return null;
  return `${Math.floor(value / 100)}.${String(value % 100).padStart(2, "0")}`;
}

export function isTrustedCutluyCheckoutUrl(value, paymentId) {
  if (
    typeof value !== "string" ||
    value.length === 0 ||
    value.length > 2_048 ||
    !CUTLUY_PAYMENT_ID_PATTERN.test(paymentId)
  ) {
    return false;
  }

  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.origin === "https://cutluy.com" &&
      url.pathname === `/pay/${paymentId}` &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password &&
      !url.port
    );
  } catch {
    return false;
  }
}

/** Only printable, bounded EMVCo payloads may reach a QR renderer. */
export function isValidCutluyQrString(value) {
  const candidate = nonEmptyString(value);
  return Boolean(
    candidate &&
    candidate.length <= 1_024 &&
    /^000201/.test(candidate) &&
    /^[\x20-\x7E]+$/.test(candidate),
  );
}

function normalizeCutluyPaymentShape(
  value,
  requireLodgingReference,
  requireReference = true,
) {
  const payment = plainRecord(value);
  if (!payment) return null;

  const id = nonEmptyString(payment.id);
  const status = nonEmptyString(payment.status)?.toLowerCase();
  const currency = nonEmptyString(payment.currency)?.toUpperCase();
  const referenceId = nonEmptyString(payment.reference_id);
  const amountCents = decimalUsdToCents(payment.amount);

  if (
    !id ||
    !CUTLUY_PAYMENT_ID_PATTERN.test(id) ||
    !status ||
    !CUTLUY_PAYMENT_STATUSES.has(status) ||
    currency !== "USD" ||
    (requireReference && !referenceId) ||
    (referenceId &&
      requireLodgingReference &&
      !parseCutluyLodgingReference(referenceId)) ||
    amountCents === null
  ) {
    return null;
  }

  const checkoutUrl = nonEmptyString(payment.checkout_url);
  const expiresAt = nonEmptyString(payment.expires_at);
  const qrStringCandidate = nonEmptyString(payment.qr_string);
  const qrString = isValidCutluyQrString(qrStringCandidate)
    ? qrStringCandidate
    : null;

  if (checkoutUrl !== null && !isTrustedCutluyCheckoutUrl(checkoutUrl, id)) {
    return null;
  }
  if (expiresAt !== null && !Number.isFinite(Date.parse(expiresAt)))
    return null;

  return {
    id,
    status,
    amountCents,
    currency,
    referenceId,
    checkoutUrl,
    expiresAt,
    qrString,
  };
}

/** Strict payment shape for persisted ZIVO lodging attempts and webhooks. */
export function normalizeCutluyPayment(value) {
  return normalizeCutluyPaymentShape(value, true);
}

/**
 * CutLuy may omit optional reference/expiry fields from compact create/read
 * responses. If a reference is present, it must still be a ZIVO lodging one.
 */
export function normalizeCutluyPaymentResponse(value) {
  return normalizeCutluyPaymentShape(value, true, false);
}

export function normalizeCutluyWebhookEvent(value, eventHeader) {
  const event = plainRecord(value);
  const data = plainRecord(event?.data);
  const rawPayment =
    plainRecord(data?.payment) ?? plainRecord(event?.payment) ?? data ?? event;
  const payment = normalizeCutluyPaymentShape(rawPayment, false);
  const type = nonEmptyString(event?.type);
  const headerType = nonEmptyString(eventHeader);

  if (
    !event ||
    !payment ||
    !type ||
    !headerType ||
    type !== headerType ||
    !CUTLUY_EVENT_TYPES.has(type)
  ) {
    return null;
  }

  const expectedStatus = {
    "payment.completed": "paid",
    "payment.scanned": "scanned",
    "payment.expired": "expired",
    "payment.failed": "failed",
  }[type];

  return payment.status === expectedStatus ? { type, payment } : null;
}

/** Parse `X-CutLuy-Signature: t=<unix>,v1=<hex hmac>`. */
export function parseCutluySignatureHeader(value) {
  const header = nonEmptyString(value);
  if (!header) return null;

  const values = {};
  for (const part of header.split(",")) {
    const separator = part.indexOf("=");
    if (separator <= 0) return null;
    const key = part.slice(0, separator).trim();
    const fieldValue = part.slice(separator + 1).trim();
    if (!key || !fieldValue || key in values) return null;
    values[key] = fieldValue;
  }

  if (
    !/^\d{10,13}$/.test(values.t ?? "") ||
    !/^[a-f0-9]{64}$/i.test(values.v1 ?? "")
  ) {
    return null;
  }

  const timestampSeconds = Number(values.t);
  return Number.isSafeInteger(timestampSeconds)
    ? { timestampSeconds, signatureHex: values.v1.toLowerCase() }
    : null;
}
