import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import {
  createCutluyLodgingPayment,
  CutluyProviderError,
  type CreatedCutluyLodgingPayment,
} from "../_shared/cutluyClient.ts";
import {
  createCutluyLodgingReference,
  isTrustedCutluyCheckoutUrl,
  isValidCutluyPaymentId,
  isValidCutluyQrString,
} from "../_shared/cutluyPolicy.mjs";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PAYMENT_AUTHORITY_VERSION = "cutluy-lodging-v1";
const CREATION_LEASE_SECONDS = 30;
const READY_STATUSES = new Set(["pending", "scanned"]);
const PAYABLE_RESERVATION_STATES = new Set(["pending", "processing", "unpaid"]);

type JsonRecord = Record<string, unknown>;

type Reservation = {
  id: string;
  store_id: string;
  guest_id: string | null;
  status: string | null;
  payment_status: string | null;
  payment_provider: string | null;
  total_cents: number | string | null;
  paid_cents: number | string | null;
};

type Claim = {
  action: "acquired" | "ready" | "busy";
  attemptId: string;
  idempotencyKey: string;
  reservationId: string;
  storeId: string;
  guestId: string;
  amountCents: number;
  currency: "USD";
  referenceId: string;
  providerPaymentId: string | null;
  status: string | null;
  checkoutUrl: string | null;
  qrString: string | null;
  expiresAt: string | null;
  retryAfterSeconds: number | null;
};

function json(
  cors: Record<string, string>,
  status: number,
  body: JsonRecord,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", ...headers },
  });
}

function record(value: unknown): JsonRecord | null {
  if (Array.isArray(value) && value.length === 1) return record(value[0]);
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function positiveCents(value: unknown): number | null {
  const cents =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function nonNegativeCents(value: unknown): number | null {
  const cents =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d+$/.test(value)
        ? Number(value)
        : Number.NaN;
  return Number.isSafeInteger(cents) && cents >= 0 ? cents : null;
}

function boundedRetryAfter(value: unknown, fallback = 2): number {
  const seconds = typeof value === "number" ? value : Number(value);
  return Number.isFinite(seconds) && seconds > 0
    ? Math.max(1, Math.ceil(seconds))
    : fallback;
}

function parseStoreAllowlist(value: string | undefined): Set<string> | null {
  const entries = (value ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
  if (
    entries.length === 0 ||
    entries.some((entry) => !UUID_PATTERN.test(entry))
  )
    return null;
  return new Set(entries);
}

function parseClaim(value: unknown): Claim | null {
  const row = record(value);
  const action = stringValue(row?.action);
  const attemptId = stringValue(row?.payment_attempt_id);
  const idempotencyKey = stringValue(row?.idempotency_key);
  const reservationId = stringValue(row?.reservation_id);
  const storeId = stringValue(row?.store_id);
  const guestId = stringValue(row?.guest_id);
  const amountCents = positiveCents(row?.amount_cents);
  const currency = stringValue(row?.currency)?.toUpperCase();
  const referenceId = stringValue(row?.reference_id);
  if (
    (action !== "acquired" && action !== "ready" && action !== "busy") ||
    !attemptId ||
    !UUID_PATTERN.test(attemptId) ||
    !idempotencyKey ||
    !/^[A-Za-z0-9._:-]{8,200}$/.test(idempotencyKey) ||
    !reservationId ||
    !UUID_PATTERN.test(reservationId) ||
    !storeId ||
    !UUID_PATTERN.test(storeId) ||
    !guestId ||
    !UUID_PATTERN.test(guestId) ||
    amountCents === null ||
    currency !== "USD" ||
    !referenceId
  )
    return null;

  return {
    action,
    attemptId,
    idempotencyKey,
    reservationId: reservationId.toLowerCase(),
    storeId: storeId.toLowerCase(),
    guestId: guestId.toLowerCase(),
    amountCents,
    currency: "USD",
    referenceId,
    providerPaymentId: stringValue(row?.payment_id),
    status: stringValue(row?.status)?.toLowerCase() ?? null,
    checkoutUrl: stringValue(row?.checkout_url),
    qrString: stringValue(row?.qr_string),
    expiresAt: stringValue(row?.expires_at),
    retryAfterSeconds:
      row?.retry_after_seconds == null
        ? null
        : boundedRetryAfter(row.retry_after_seconds),
  };
}

function validateClaimIdentity(
  claim: Claim,
  reservation: Reservation,
  amountCents: number,
): boolean {
  const expectedReference = createCutluyLodgingReference(reservation.id);
  return Boolean(
    expectedReference &&
    claim.reservationId === reservation.id.toLowerCase() &&
    claim.storeId === reservation.store_id.toLowerCase() &&
    claim.guestId === reservation.guest_id?.toLowerCase() &&
    claim.amountCents === amountCents &&
    claim.currency === "USD" &&
    claim.referenceId === expectedReference,
  );
}

function readyPayment(
  claim: Claim,
  nowMs = Date.now(),
): CreatedCutluyLodgingPayment | null {
  const expiresAtMs = claim.expiresAt
    ? Date.parse(claim.expiresAt)
    : Number.NaN;
  if (
    !claim.providerPaymentId ||
    !isValidCutluyPaymentId(claim.providerPaymentId) ||
    !claim.status ||
    !READY_STATUSES.has(claim.status) ||
    !claim.checkoutUrl ||
    !isTrustedCutluyCheckoutUrl(claim.checkoutUrl, claim.providerPaymentId) ||
    !claim.qrString ||
    !isValidCutluyQrString(claim.qrString) ||
    !Number.isFinite(expiresAtMs) ||
    expiresAtMs <= nowMs
  )
    return null;

  return {
    id: claim.providerPaymentId,
    status: claim.status as "pending" | "scanned",
    amountCents: claim.amountCents,
    currency: "USD",
    referenceId: claim.referenceId,
    checkoutUrl: claim.checkoutUrl,
    qrString: claim.qrString,
    // Claim responses expose a display deadline. Only the direct provider
    // response may supply the provider-authoritative expiry persisted below.
    providerExpiresAt: null,
    expiresAt: new Date(expiresAtMs).toISOString(),
  };
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  );
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function publicPayment(
  payment: CreatedCutluyLodgingPayment,
  reused: boolean,
): JsonRecord {
  return {
    payment_id: payment.id,
    status: payment.status,
    amount_cents: payment.amountCents,
    amount: (payment.amountCents / 100).toFixed(2),
    currency: payment.currency,
    checkout_url: payment.checkoutUrl,
    qr_string: payment.qrString,
    expires_at: payment.expiresAt,
    reused,
  };
}

function safeProviderResponse(
  cors: Record<string, string>,
  error: CutluyProviderError,
): Response {
  if (error.code === "rate_limited") {
    const retryAfter = boundedRetryAfter(error.retryAfterSeconds, 60);
    return json(
      cors,
      429,
      {
        error: "payment_provider_rate_limited",
        message: "KHQR is busy. Please wait before trying again.",
        retry_after_seconds: retryAfter,
      },
      { "Retry-After": String(retryAfter) },
    );
  }
  if (error.code === "unauthorized") {
    return json(cors, 503, {
      error: "payment_provider_unauthorized",
      message:
        "KHQR payment setup needs attention. Please use another payment method.",
    });
  }
  if (error.code === "quota_exceeded") {
    return json(cors, 503, {
      error: "payment_provider_quota_exceeded",
      message:
        "KHQR payment capacity is temporarily unavailable. Please use another payment method.",
    });
  }
  if (error.code === "account_suspended") {
    return json(cors, 503, {
      error: "payment_provider_account_suspended",
      message:
        "KHQR payments are temporarily unavailable. Please use another payment method.",
    });
  }
  return json(cors, 502, {
    error: error.retryable
      ? "payment_provider_unavailable"
      : "payment_provider_rejected",
    message: error.retryable
      ? "KHQR could not be reached. Please try again later."
      : "KHQR could not create this payment. Please use another payment method.",
  });
}

Deno.serve(
  withSecurity(
    "create-lodging-cutluy-payment",
    async (req, ctx) => {
      const cors = ctx.corsHeaders;
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      const apiKey = Deno.env.get("CUTLUY_API_KEY")?.trim();
      const allowedStoreIds = parseStoreAllowlist(
        Deno.env.get("CUTLUY_LODGING_STORE_IDS"),
      );

      if (
        !supabaseUrl ||
        !anonKey ||
        !serviceKey ||
        !apiKey ||
        !allowedStoreIds
      ) {
        return json(cors, 503, {
          error: "khqr_not_configured",
          message: "KHQR payments are not configured.",
        });
      }

      const authHeader = req.headers.get("authorization") ?? "";
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const {
        data: { user },
        error: authError,
      } = await userClient.auth.getUser();
      if (authError || !user) {
        return json(cors, 401, {
          error: "authentication_required",
          message: "Sign in to create a KHQR payment.",
        });
      }

      let body: JsonRecord | null = null;
      try {
        body = record(await req.json());
      } catch {
        body = null;
      }
      const reservationId =
        stringValue(body?.reservation_id)?.toLowerCase() ?? null;
      if (!reservationId || !UUID_PATTERN.test(reservationId)) {
        return json(cors, 400, {
          error: "invalid_reservation",
          message: "A valid reservation is required.",
        });
      }

      const admin = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: reservationData, error: reservationError } = await admin
        .from("lodge_reservations")
        .select(
          "id,store_id,guest_id,status,payment_status,payment_provider,total_cents,paid_cents",
        )
        .eq("id", reservationId)
        .maybeSingle();
      if (reservationError) {
        ctx.log.error("cutluy_reservation_read_failed");
        return json(cors, 503, {
          error: "reservation_unavailable",
          message: "The reservation could not be checked. Please try again.",
        });
      }
      const reservation = reservationData as Reservation | null;
      if (
        !reservation ||
        reservation.guest_id?.toLowerCase() !== user.id.toLowerCase()
      ) {
        return json(cors, 404, {
          error: "reservation_not_found",
          message: "Reservation not found.",
        });
      }
      if (
        !UUID_PATTERN.test(reservation.id) ||
        !UUID_PATTERN.test(reservation.store_id) ||
        !reservation.guest_id ||
        !UUID_PATTERN.test(reservation.guest_id)
      ) {
        ctx.log.error("cutluy_reservation_identity_invalid");
        return json(cors, 503, {
          error: "reservation_unavailable",
          message: "The reservation could not be checked. Please try again.",
        });
      }
      if (!allowedStoreIds.has(reservation.store_id.toLowerCase())) {
        return json(cors, 409, {
          error: "khqr_not_available_for_hotel",
          message: "KHQR is not available for this hotel.",
        });
      }

      const totalCents = positiveCents(reservation.total_cents);
      const paidCents = nonNegativeCents(reservation.paid_cents ?? 0);
      const amountCents =
        totalCents !== null && paidCents !== null && paidCents < totalCents
          ? totalCents - paidCents
          : null;
      if (
        reservation.status !== "hold" ||
        reservation.payment_provider !== "khqr" ||
        !reservation.payment_status ||
        !PAYABLE_RESERVATION_STATES.has(reservation.payment_status) ||
        amountCents === null
      ) {
        return json(cors, 409, {
          error: "reservation_not_payable",
          message: "This reservation is not awaiting a KHQR payment.",
        });
      }

      const referenceId = createCutluyLodgingReference(reservation.id);
      if (!referenceId) {
        return json(cors, 409, {
          error: "reservation_not_payable",
          message: "This reservation cannot be paid by KHQR.",
        });
      }
      const identity = [
        PAYMENT_AUTHORITY_VERSION,
        reservation.id.toLowerCase(),
        reservation.store_id.toLowerCase(),
        String(amountCents),
      ].join(":");
      const baseIdempotencyKey = `${PAYMENT_AUTHORITY_VERSION}-${await sha256Hex(identity)}`;
      const leaseToken = crypto.randomUUID();

      const { data: claimData, error: claimError } = await admin.rpc(
        "claim_lodging_cutluy_payment",
        {
          p_reservation_id: reservation.id,
          p_idempotency_key: baseIdempotencyKey,
          p_lease_token: leaseToken,
          p_lease_seconds: CREATION_LEASE_SECONDS,
        },
      );
      if (claimError) {
        ctx.log.error("cutluy_attempt_claim_failed");
        return json(cors, 503, {
          error: "payment_attempt_unavailable",
          message: "KHQR could not start safely. Please try again.",
        });
      }
      const claim = parseClaim(claimData);
      if (!claim || !validateClaimIdentity(claim, reservation, amountCents)) {
        ctx.log.error("cutluy_attempt_claim_invalid");
        return json(cors, 503, {
          error: "payment_attempt_unavailable",
          message: "KHQR could not start safely. Please try again.",
        });
      }
      if (claim.action === "busy") {
        const retryAfter = boundedRetryAfter(claim.retryAfterSeconds, 2);
        return json(
          cors,
          423,
          {
            error: "payment_creation_in_progress",
            message: "A KHQR payment is already being prepared.",
            retry_after_seconds: retryAfter,
          },
          { "Retry-After": String(retryAfter) },
        );
      }
      if (claim.action === "ready") {
        const payment = readyPayment(claim);
        if (!payment) {
          ctx.log.error("cutluy_ready_attempt_invalid");
          return json(cors, 503, {
            error: "payment_attempt_unavailable",
            message:
              "The existing KHQR payment is unavailable. Please try again.",
          });
        }
        return json(cors, 200, publicPayment(payment, true));
      }

      const providerIdempotencyKey = claim.idempotencyKey;

      try {
        const payment = await createCutluyLodgingPayment({
          apiKey,
          reservationId: reservation.id,
          storeId: reservation.store_id,
          amountCents,
          idempotencyKey: providerIdempotencyKey,
        });
        const { data: completedData, error: completedError } = await admin.rpc(
          "complete_lodging_cutluy_payment_creation",
          {
            p_idempotency_key: providerIdempotencyKey,
            p_lease_token: leaseToken,
            p_payment: {
              id: payment.id,
              status: payment.status,
              amount_cents: payment.amountCents,
              currency: payment.currency,
              reference_id: payment.referenceId,
              checkout_url: payment.checkoutUrl,
              qr_string: payment.qrString,
              expires_at: payment.providerExpiresAt,
            },
          },
        );
        if (completedError) {
          ctx.log.error("cutluy_attempt_complete_failed");
          return json(cors, 503, {
            error: "payment_confirmation_unavailable",
            message:
              "The KHQR payment was created but could not be confirmed safely. Please retry.",
          });
        }
        const completedClaim = parseClaim(completedData);
        const completedPayment =
          completedClaim &&
          validateClaimIdentity(completedClaim, reservation, amountCents)
            ? readyPayment(completedClaim)
            : null;
        if (!completedPayment || completedPayment.id !== payment.id) {
          ctx.log.error("cutluy_attempt_complete_invalid");
          return json(cors, 503, {
            error: "payment_confirmation_unavailable",
            message:
              "The KHQR payment was created but could not be confirmed safely. Please retry.",
          });
        }
        return json(cors, 201, publicPayment(completedPayment, false));
      } catch (error) {
        const providerError =
          error instanceof CutluyProviderError
            ? error
            : new CutluyProviderError(
                "provider_unavailable",
                "CutLuy payment creation failed.",
                { retryable: true },
              );
        try {
          await admin.rpc("fail_lodging_cutluy_payment_creation", {
            p_idempotency_key: providerIdempotencyKey,
            p_lease_token: leaseToken,
            p_error_code: providerError.code,
            p_retryable: providerError.retryable,
            p_retry_after_seconds: providerError.retryAfterSeconds,
          });
        } catch {
          // The original provider result remains authoritative for this response.
          // A lease timeout permits later recovery if this best-effort release fails.
        }
        ctx.log.error("cutluy_provider_create_failed", {
          code: providerError.code,
          providerStatus: providerError.providerStatus,
        });
        return safeProviderResponse(cors, providerError);
      }
    },
    {
      rateLimit: "payment",
      strictCors: true,
      allowedMethods: ["POST"],
      trackNetwork: "suspicious",
      blockNetworkRiskAt: 80,
    },
  ),
);
