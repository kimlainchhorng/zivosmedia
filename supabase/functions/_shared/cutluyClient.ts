import {
  centsToDecimalUsd,
  createCutluyLodgingReference,
  isTrustedCutluyCheckoutUrl,
  normalizeCutluyPaymentResponse,
} from "./cutluyPolicy.mjs";

export const CUTLUY_API_BASE_URL = "https://cutluy.com";

const MAX_RESPONSE_BYTES = 64 * 1024;
const REQUEST_TIMEOUT_MS = 10_000;
// CutLuy documents an approximately five-minute QR lifetime. Some compact
// create responses omit expires_at, so use a shorter local reuse window rather
// than rejecting an otherwise valid checkout or guessing a longer lifetime.
const FALLBACK_QR_REUSE_MS = 4 * 60 * 1_000;

export type CutluyProviderErrorCode =
  | "unauthorized"
  | "quota_exceeded"
  | "account_suspended"
  | "rate_limited"
  | "provider_rejected"
  | "provider_unavailable"
  | "invalid_provider_response";

export class CutluyProviderError extends Error {
  readonly code: CutluyProviderErrorCode;
  readonly providerStatus: number | null;
  readonly retryAfterSeconds: number | null;
  readonly retryable: boolean;

  constructor(
    code: CutluyProviderErrorCode,
    message: string,
    options: {
      providerStatus?: number | null;
      retryAfterSeconds?: number | null;
      retryable?: boolean;
    } = {},
  ) {
    super(message);
    this.name = "CutluyProviderError";
    this.code = code;
    this.providerStatus = options.providerStatus ?? null;
    this.retryAfterSeconds = options.retryAfterSeconds ?? null;
    this.retryable = options.retryable ?? false;
  }
}

export interface CreateCutluyLodgingPaymentInput {
  apiKey: string;
  reservationId: string;
  storeId: string;
  amountCents: number;
  idempotencyKey: string;
  nowMs?: number;
  fetchImpl?: typeof fetch;
}

export interface CreatedCutluyLodgingPayment {
  id: string;
  status: "pending" | "scanned";
  amountCents: number;
  currency: "USD";
  referenceId: string;
  checkoutUrl: string;
  qrString: string;
  /** Provider-authoritative expiry, null only for a compact 201 response. */
  providerExpiresAt: string | null;
  /** Short display deadline; never authorizes minting a replacement QR. */
  expiresAt: string;
}

function parseRetryAfterSeconds(value: string | null, nowMs: number): number | null {
  const header = value?.trim();
  if (!header) return null;

  if (/^\d+$/.test(header)) {
    const seconds = Number(header);
    return Number.isSafeInteger(seconds) ? Math.max(1, seconds) : null;
  }

  const retryAtMs = Date.parse(header);
  if (!Number.isFinite(retryAtMs)) return null;
  return Math.max(1, Math.ceil((retryAtMs - nowMs) / 1_000));
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const advertised = response.headers.get("Content-Length")?.trim() ?? "";
  if (advertised) {
    if (!/^\d+$/.test(advertised)) return null;
    const advertisedLength = Number(advertised);
    if (
      !Number.isSafeInteger(advertisedLength) ||
      advertisedLength < 1 ||
      advertisedLength > MAX_RESPONSE_BYTES
    ) {
      await response.body?.cancel();
      return null;
    }
  }

  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  if (totalBytes === 0) return null;

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch {
    return null;
  }
}

function providerErrorCode(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const code = (value as Record<string, unknown>).error;
  return typeof code === "string" && code.trim() ? code.trim() : null;
}

function requestError(
  status: number,
  body: unknown,
  retryAfterSeconds: number | null,
): CutluyProviderError {
  const code = providerErrorCode(body);
  if (status === 401) {
    return new CutluyProviderError(
      "unauthorized",
      "CutLuy rejected the configured API key.",
      { providerStatus: status, retryable: false },
    );
  }
  if (status === 402 || code === "quota_exceeded") {
    return new CutluyProviderError(
      "quota_exceeded",
      "The CutLuy payment quota is exhausted.",
      { providerStatus: status, retryable: false },
    );
  }
  if (status === 403 || code === "account_suspended") {
    return new CutluyProviderError(
      "account_suspended",
      "The CutLuy account is suspended.",
      { providerStatus: status, retryable: false },
    );
  }
  if (status === 429 || code === "rate_limited") {
    return new CutluyProviderError(
      "rate_limited",
      "CutLuy is rate limiting payment creation.",
      { providerStatus: status, retryAfterSeconds, retryable: true },
    );
  }
  if (status >= 500) {
    return new CutluyProviderError(
      "provider_unavailable",
      "CutLuy is temporarily unavailable.",
      { providerStatus: status, retryable: true },
    );
  }
  return new CutluyProviderError(
    "provider_rejected",
    "CutLuy rejected the payment request.",
    { providerStatus: status, retryable: false },
  );
}

/**
 * Create one CutLuy checkout from server-owned lodging facts.
 *
 * This function deliberately performs no retry loop. The caller persists one
 * stable idempotency key and may retry later after a provider or rate-limit
 * failure. The browser never supplies the amount, store, reference, or key.
 */
export async function createCutluyLodgingPayment(
  input: CreateCutluyLodgingPaymentInput,
): Promise<CreatedCutluyLodgingPayment> {
  const referenceId = createCutluyLodgingReference(input.reservationId);
  const amount = centsToDecimalUsd(input.amountCents);
  const apiKey = input.apiKey.trim();
  if (
    !apiKey ||
    !referenceId ||
    !amount ||
    !input.storeId ||
    !input.idempotencyKey ||
    input.idempotencyKey.length > 200
  ) {
    throw new CutluyProviderError(
      "provider_rejected",
      "Invalid server-owned CutLuy payment input.",
      { retryable: false },
    );
  }

  const nowMs = input.nowMs ?? Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  let responseBody: unknown;
  try {
    response = await (input.fetchImpl ?? fetch)(`${CUTLUY_API_BASE_URL}/v1/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        amount: Number(amount),
        reference_id: referenceId,
        metadata: {
          zivo_reservation_id: input.reservationId,
          zivo_store_id: input.storeId,
        },
        idempotency_key: input.idempotencyKey,
      }),
      redirect: "error",
      referrerPolicy: "no-referrer",
      signal: controller.signal,
    });
    responseBody = await readBoundedJson(response);
  } catch {
    throw new CutluyProviderError(
      "provider_unavailable",
      "CutLuy payment creation could not be reached.",
      { retryable: true },
    );
  } finally {
    clearTimeout(timeout);
  }

  if (response.status !== 200 && response.status !== 201) {
    throw requestError(
      response.status,
      responseBody,
      parseRetryAfterSeconds(response.headers.get("Retry-After"), input.nowMs ?? Date.now()),
    );
  }

  const payment = normalizeCutluyPaymentResponse(responseBody);
  const providerExpiresAtMs = payment?.expiresAt
    ? Date.parse(payment.expiresAt)
    : null;
  // Only a newly-created 201 may use the local fallback. A 200 is an
  // idempotent replay; starting a fresh clock there could re-display an old QR
  // beyond its provider lifetime after an earlier response was lost.
  const expiresAtMs =
    providerExpiresAtMs ??
    (response.status === 201 ? nowMs + FALLBACK_QR_REUSE_MS : Number.NaN);
  if (
    !payment ||
    (payment.status !== "pending" && payment.status !== "scanned") ||
    payment.amountCents !== input.amountCents ||
    payment.currency !== "USD" ||
    (payment.referenceId !== null && payment.referenceId !== referenceId) ||
    !payment.checkoutUrl ||
    !payment.qrString ||
    !isTrustedCutluyCheckoutUrl(payment.checkoutUrl, payment.id) ||
    !Number.isFinite(expiresAtMs) ||
    expiresAtMs <= nowMs
  ) {
    throw new CutluyProviderError(
      "invalid_provider_response",
      "CutLuy returned an invalid payment checkout.",
      { providerStatus: response.status, retryable: true },
    );
  }

  return {
    id: payment.id,
    status: payment.status as "pending" | "scanned",
    amountCents: payment.amountCents,
    currency: "USD",
    referenceId,
    checkoutUrl: payment.checkoutUrl,
    qrString: payment.qrString,
    providerExpiresAt:
      providerExpiresAtMs === null
        ? null
        : new Date(providerExpiresAtMs).toISOString(),
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}
