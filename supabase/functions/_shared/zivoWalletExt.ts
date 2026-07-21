/**
 * ZIVO Wallet cross-application payment ingress client — server-side only.
 *
 * Speaks the wallet's /api/wallet/ext/* contract (ZIVO-wallet repo,
 * lib/wallet/ext/contract.ts + auth.ts):
 *   - POST {base}/api/wallet/ext/payment          → request a payment obligation
 *   - POST {base}/api/wallet/ext/payment/confirm  → provider-confirmed capture
 *   - POST {base}/api/wallet/ext/refund           → refund a confirmed payment
 *
 * Every request is signed with hex HMAC-SHA256 over
 * `${product}.${timestamp}.${rawBody}` using the shared secret the wallet
 * holds as WALLET_EXT_SIGNING_SECRET__MEDIA. Required headers:
 *   X-Zivo-Product / X-Zivo-Timestamp / X-Zivo-Signature
 *
 * Fail-closed: if ZIVO_WALLET_BASE_URL or ZIVO_WALLET_SIGNING_SECRET is unset
 * (or the secret is shorter than 32 chars) the client reports not-configured
 * and never sends a request. Amounts are integer minor units — never floats.
 */

export const WALLET_SOURCE_PRODUCT = "media" as const;

export type WalletSupportedCurrency = "USD" | "KHR" | "THB";
export type WalletMoney = { amountMinor: number; currency: WalletSupportedCurrency };
export type WalletExternalProvider = "stripe" | "authorize_net" | "paypal" | "square" | "manual";
export type WalletEntityType = "booking" | "order" | "trip" | "invoice" | "subscription" | "delivery";

export type WalletPaymentStatus = {
  paymentId: string;
  status: "pending" | "authorized" | "held" | "captured" | "succeeded" | "failed" | "canceled" | "refunded";
  amount: WalletMoney;
  idempotencyKey: string;
  providerConfirmed: boolean;
};

export type WalletExtPaymentRequest = {
  idempotencyKey: string;
  /** The zivosmedia user id of the payer; the wallet resolves it via an audited identity link. */
  payerExternalUserId?: string;
  payeeWalletId: string;
  amount: WalletMoney;
  reference: { type: WalletEntityType; id: string };
  metadata?: Record<string, unknown>;
};

export type WalletExtPaymentConfirm = {
  idempotencyKey: string;
  provider: WalletExternalProvider;
  /** Provider event id (Stripe event.id, ...). Confirm is idempotent per (payment, providerEventId). */
  providerEventId: string;
  description?: string;
};

export type WalletExtRefundRequest = {
  /** The ORIGINAL payment's idempotency key. */
  idempotencyKey: string;
  refundIdempotencyKey: string;
  provider: WalletExternalProvider;
  reason?: string;
};

export type WalletExtResult<T = unknown> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string };

const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9:_.-]{8,160}$/;

function walletBaseUrl(): string {
  return (Deno.env.get("ZIVO_WALLET_BASE_URL") || "").replace(/\/$/, "");
}

function signingSecret(): string {
  const value = Deno.env.get("ZIVO_WALLET_SIGNING_SECRET") || "";
  return value.length >= 32 ? value : "";
}

export function isWalletExtConfigured(): boolean {
  return Boolean(walletBaseUrl() && signingSecret());
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function postSigned<T>(path: string, body: Record<string, unknown>): Promise<WalletExtResult<T>> {
  const base = walletBaseUrl();
  const secret = signingSecret();
  if (!base || !secret) return { ok: false, status: 503, error: "wallet_ext_not_configured" };

  const rawBody = JSON.stringify(body);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = await hmacSha256Hex(secret, `${WALLET_SOURCE_PRODUCT}.${timestamp}.${rawBody}`);

  try {
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Zivo-Product": WALLET_SOURCE_PRODUCT,
        "X-Zivo-Timestamp": timestamp,
        "X-Zivo-Signature": signature,
      },
      body: rawBody,
    });
    const text = await response.text();
    let data: unknown = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }
    if (!response.ok) {
      const message =
        data && typeof data === "object" && typeof (data as { error?: unknown }).error === "string"
          ? (data as { error: string }).error
          : `wallet_ext_http_${response.status}`;
      return { ok: false, status: response.status, error: message };
    }
    return { ok: true, status: response.status, data: data as T };
  } catch (_error) {
    return { ok: false, status: 502, error: "wallet_ext_unreachable" };
  }
}

function idempotencyKeyError(value: string, field: string): string | null {
  return IDEMPOTENCY_KEY_PATTERN.test(value) ? null : `${field} must match ^[A-Za-z0-9:_.-]{8,160}$`;
}

export async function walletExtRequestPayment(
  input: WalletExtPaymentRequest,
): Promise<WalletExtResult<WalletPaymentStatus>> {
  const keyError = idempotencyKeyError(input.idempotencyKey, "idempotencyKey");
  if (keyError) return { ok: false, status: 400, error: keyError };
  if (!Number.isInteger(input.amount.amountMinor) || input.amount.amountMinor < 1) {
    return { ok: false, status: 400, error: "amount.amountMinor must be a positive integer in minor units" };
  }
  return postSigned("/api/wallet/ext/payment", {
    idempotencyKey: input.idempotencyKey,
    ...(input.payerExternalUserId ? { payerExternalUserId: input.payerExternalUserId } : {}),
    payeeWalletId: input.payeeWalletId,
    amount: input.amount,
    sourceProduct: WALLET_SOURCE_PRODUCT,
    reference: { type: input.reference.type, id: input.reference.id, product: WALLET_SOURCE_PRODUCT },
    ...(input.metadata ? { metadata: input.metadata } : {}),
  });
}

export async function walletExtConfirmPayment(
  input: WalletExtPaymentConfirm,
): Promise<WalletExtResult<WalletPaymentStatus>> {
  const keyError = idempotencyKeyError(input.idempotencyKey, "idempotencyKey");
  if (keyError) return { ok: false, status: 400, error: keyError };
  return postSigned("/api/wallet/ext/payment/confirm", {
    idempotencyKey: input.idempotencyKey,
    sourceProduct: WALLET_SOURCE_PRODUCT,
    provider: input.provider,
    providerEventId: input.providerEventId,
    ...(input.description ? { description: input.description } : {}),
  });
}

export async function walletExtRefundPayment(
  input: WalletExtRefundRequest,
): Promise<WalletExtResult<WalletPaymentStatus>> {
  const keyError = idempotencyKeyError(input.idempotencyKey, "idempotencyKey") ??
    idempotencyKeyError(input.refundIdempotencyKey, "refundIdempotencyKey");
  if (keyError) return { ok: false, status: 400, error: keyError };
  return postSigned("/api/wallet/ext/refund", {
    idempotencyKey: input.idempotencyKey,
    refundIdempotencyKey: input.refundIdempotencyKey,
    sourceProduct: WALLET_SOURCE_PRODUCT,
    provider: input.provider,
    ...(input.reason ? { reason: input.reason } : {}),
  });
}
