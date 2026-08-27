import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Loader2, QrCode, RefreshCw, ShieldCheck } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type CutluyPayment = {
  id: string;
  status: "pending" | "scanned";
  amount_cents: number;
  currency: "USD";
  checkout_url: string;
  qr_string: string | null;
  expires_at: string | null;
};

type CheckoutState =
  | { kind: "loading" }
  | { kind: "ready"; payment: CutluyPayment }
  | { kind: "error"; message: string; retryAfterSeconds: number };

type InvokeFailure = {
  code: string;
  message: string;
  retryAfterSeconds: number;
};

interface LodgingCutluyCheckoutProps {
  reservationId: string;
  reservationRef?: string | null;
  amountCents: number;
  paymentStatus?: string | null;
  reservationStatus?: string | null;
  manualReviewRequired?: boolean;
  manualRefundRequired?: boolean;
}

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  currencyDisplay: "narrowSymbol",
});

const retrySecondsFromHeader = (value: string | null) => {
  if (!value) return 0;
  if (/^\d+$/.test(value.trim())) return Math.max(0, Number(value.trim()));
  const retryAt = Date.parse(value);
  return Number.isFinite(retryAt)
    ? Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))
    : 0;
};

async function describeInvokeFailure(error: unknown): Promise<InvokeFailure> {
  const err = error as {
    message?: string;
    context?: Response & { body?: unknown };
  };
  const response = err?.context;
  let body: Record<string, unknown> = {};

  if (response && typeof response.clone === "function") {
    try {
      const parsed = await response.clone().json();
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed as Record<string, unknown>;
      }
    } catch {
      // A malformed provider/upstream response stays unavailable; no raw body is surfaced.
    }
  }

  const status = typeof response?.status === "number" ? response.status : 0;
  const code =
    typeof body.error === "string" ? body.error : "payment_unavailable";
  const responseRetryAfter = response?.headers?.get?.("Retry-After") ?? null;
  const bodyRetryAfter = Number(body.retry_after_seconds);
  const retryAfterSeconds = Math.max(
    0,
    Number.isFinite(bodyRetryAfter) ? Math.ceil(bodyRetryAfter) : 0,
    retrySecondsFromHeader(responseRetryAfter),
  );

  const message = (() => {
    if (code === "unauthorized" || code === "payment_provider_unauthorized") {
      return "Bakong KHQR is temporarily unavailable while ZIVO reconnects the payment service.";
    }
    if (
      status === 402 ||
      code === "quota_exceeded" ||
      code === "payment_provider_quota_exceeded"
    ) {
      return "Bakong KHQR has reached its current payment limit. Choose another payment method or try again later.";
    }
    if (
      status === 403 ||
      code === "account_suspended" ||
      code === "payment_provider_account_suspended"
    ) {
      return "Bakong KHQR is temporarily unavailable for this property. Choose another payment method.";
    }
    if (
      status === 429 ||
      code === "rate_limited" ||
      code === "payment_provider_rate_limited"
    ) {
      return "Bakong KHQR is receiving too many requests. Wait a moment before trying again.";
    }
    if (
      status === 409 ||
      status === 423 ||
      code === "payment_in_progress" ||
      code === "payment_creation_in_progress"
    ) {
      return "Your secure QR is still being prepared. Try again when the short wait ends.";
    }
    if (status === 401 || code === "authentication_required") {
      return "Sign in again to continue this held reservation with Bakong KHQR.";
    }
    if (status === 404) {
      return "This held reservation is not available for Bakong KHQR payment.";
    }
    return "ZIVO could not prepare a secure Bakong KHQR payment. No payment was completed.";
  })();

  return {
    code,
    message,
    retryAfterSeconds: Math.max(retryAfterSeconds, status === 429 ? 5 : 0),
  };
}

function normalizePayment(
  value: unknown,
  expectedCents: number,
): CutluyPayment | null {
  const root =
    value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : null;
  const nested =
    root?.payment &&
    typeof root.payment === "object" &&
    !Array.isArray(root.payment)
      ? (root.payment as Record<string, unknown>)
      : root;
  if (!nested) return null;

  const id =
    typeof nested.id === "string"
      ? nested.id
      : typeof nested.payment_id === "string"
        ? nested.payment_id
        : "";
  const status = nested.status;
  const amountCents = Number(nested.amount_cents);
  const currency = nested.currency;
  const checkoutUrl =
    typeof nested.checkout_url === "string" ? nested.checkout_url : "";
  const qrCandidate =
    typeof nested.qr_string === "string" ? nested.qr_string.trim() : "";
  const expiresAt =
    typeof nested.expires_at === "string" &&
    Number.isFinite(Date.parse(nested.expires_at))
      ? nested.expires_at
      : null;

  if (
    !/^[A-Za-z0-9_-]{16,128}$/.test(id) ||
    (status !== "pending" && status !== "scanned") ||
    !Number.isSafeInteger(amountCents) ||
    amountCents !== expectedCents ||
    currency !== "USD"
  ) {
    return null;
  }

  try {
    const url = new URL(checkoutUrl);
    if (
      url.origin !== "https://cutluy.com" ||
      url.pathname !== `/pay/${id}` ||
      url.search ||
      url.hash ||
      url.username ||
      url.password ||
      url.port
    ) {
      return null;
    }
  } catch {
    return null;
  }

  const qrString = /^000201[\x20-\x7E]{0,1018}$/.test(qrCandidate)
    ? qrCandidate
    : null;
  if (!qrString) return null;

  return {
    id,
    status,
    amount_cents: amountCents,
    currency: "USD",
    checkout_url: checkoutUrl,
    qr_string: qrString,
    expires_at: expiresAt,
  };
}

export function LodgingCutluyCheckout({
  reservationId,
  reservationRef,
  amountCents,
  paymentStatus,
  reservationStatus,
  manualReviewRequired = false,
  manualRefundRequired = false,
}: LodgingCutluyCheckoutProps) {
  const [state, setState] = useState<CheckoutState>({ kind: "loading" });
  const [now, setNow] = useState(() => Date.now());
  const [retryUntil, setRetryUntil] = useState(0);
  const requestRef = useRef(0);

  const createPayment = useCallback(async () => {
    const requestId = requestRef.current + 1;
    requestRef.current = requestId;
    setState({ kind: "loading" });

    const { data, error } = await supabase.functions.invoke(
      "create-lodging-cutluy-payment",
      {
        body: { reservation_id: reservationId },
      },
    );
    if (requestRef.current !== requestId) return;

    if (error) {
      const failure = await describeInvokeFailure(error);
      if (requestRef.current !== requestId) return;
      setRetryUntil(Date.now() + failure.retryAfterSeconds * 1000);
      setState({
        kind: "error",
        message: failure.message,
        retryAfterSeconds: failure.retryAfterSeconds,
      });
      return;
    }

    const payment = normalizePayment(data, amountCents);
    if (!payment) {
      setState({
        kind: "error",
        message:
          "ZIVO received an invalid payment response. No payment was completed.",
        retryAfterSeconds: 0,
      });
      return;
    }

    setRetryUntil(0);
    setState({ kind: "ready", payment });
  }, [amountCents, reservationId]);

  useEffect(() => {
    void createPayment();
    return () => {
      requestRef.current += 1;
    };
  }, [createPayment]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, []);

  const secondsRemaining = useMemo(() => {
    if (state.kind !== "ready" || !state.payment.expires_at) return null;
    return Math.max(
      0,
      Math.ceil((Date.parse(state.payment.expires_at) - now) / 1000),
    );
  }, [now, state]);
  const retrySecondsRemaining = Math.max(
    0,
    Math.ceil((retryUntil - now) / 1000),
  );
  const expired = secondsRemaining === 0;
  const paymentRecorded = paymentStatus === "paid";
  const bookingConfirmed = paymentRecorded && reservationStatus === "confirmed";
  const confirmed =
    bookingConfirmed && !manualReviewRequired && !manualRefundRequired;

  if (confirmed) {
    return (
      <div
        role="status"
        className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.07] p-4 text-center"
      >
        <ShieldCheck className="mx-auto h-8 w-8 text-emerald-600" aria-hidden />
        <p className="mt-2 text-sm font-bold text-foreground">
          Payment confirmed
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          CutLuy reported the Bakong payment as paid. Your booking is confirmed.
        </p>
      </div>
    );
  }

  if (bookingConfirmed && (manualReviewRequired || manualRefundRequired)) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-center"
      >
        <ShieldCheck className="mx-auto h-8 w-8 text-amber-600" aria-hidden />
        <p className="mt-2 text-sm font-bold text-foreground">
          Booking confirmed — payment review required
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Your stay remains confirmed. Do not pay again. ZIVO support is
          reviewing the payment and any refund that may be required.
        </p>
      </div>
    );
  }

  if (paymentRecorded || manualRefundRequired) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-center"
      >
        <ShieldCheck className="mx-auto h-8 w-8 text-amber-600" aria-hidden />
        <p className="mt-2 text-sm font-bold text-foreground">
          Payment received — booking under review
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Money was recorded, but this booking is not confirmed. Do not travel
          yet; ZIVO support must review the booking and any required refund.
        </p>
      </div>
    );
  }

  if (manualReviewRequired) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-center"
      >
        <ShieldCheck className="mx-auto h-8 w-8 text-amber-600" aria-hidden />
        <p className="mt-2 text-sm font-bold text-foreground">
          Payment setup needs review
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          This booking is not confirmed and this QR is no longer available. ZIVO
          support must review the changed booking before payment continues.
        </p>
      </div>
    );
  }

  if (state.kind === "loading") {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-border bg-card p-5 text-center"
      >
        <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden />
        <p className="mt-3 text-sm font-bold text-foreground">
          Preparing secure Bakong KHQR…
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          ZIVO is using the saved reservation total. Do not close the page yet.
        </p>
      </div>
    );
  }

  if (state.kind === "error") {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.07] p-4 text-center"
      >
        <QrCode className="mx-auto h-7 w-7 text-amber-600" aria-hidden />
        <p className="mt-2 text-sm font-bold text-foreground">
          KHQR is not ready
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {state.message}
        </p>
        <Button
          type="button"
          variant="outline"
          className="mt-3 h-10 rounded-xl"
          disabled={retrySecondsRemaining > 0}
          onClick={() => void createPayment()}
        >
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
          {retrySecondsRemaining > 0
            ? `Try again in ${retrySecondsRemaining}s`
            : "Try again"}
        </Button>
      </div>
    );
  }

  const { payment } = state;
  return (
    <section
      aria-labelledby="hotel-cutluy-heading"
      className="rounded-2xl border border-sky-500/25 bg-sky-500/[0.05] p-4"
    >
      <div className="text-center">
        <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">
          Bakong KHQR via CutLuy
        </p>
        <h2
          id="hotel-cutluy-heading"
          className="mt-1 text-base font-bold text-foreground"
        >
          {payment.status === "scanned" ? "Finish" : "Scan to pay"}{" "}
          {usd.format(payment.amount_cents / 100)} USD
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Reservation {reservationRef || reservationId.slice(0, 8)} remains on
          hold until CutLuy reports{" "}
          <strong className="text-foreground">paid</strong>.
        </p>
      </div>

      {payment.qr_string && !expired && (
        <div className="mx-auto mt-4 w-fit rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/10">
          <QRCodeSVG
            value={payment.qr_string}
            size={208}
            level="H"
            includeMargin={false}
            title="Bakong KHQR payment code"
          />
        </div>
      )}

      <div className="mt-3 text-center text-xs text-muted-foreground">
        {expired ? (
          <p
            role="status"
            className="font-semibold text-amber-700 dark:text-amber-300"
          >
            This QR is no longer shown. Do not pay from a saved image; refresh
            to check payment availability.
          </p>
        ) : payment.status === "scanned" ? (
          <p
            role="status"
            className="rounded-xl border border-amber-500/20 bg-amber-500/[0.08] px-3 py-2 leading-relaxed text-amber-800 dark:text-amber-200"
          >
            <strong>Scan detected — payment is not complete.</strong> Finish
            approval in your banking app. Keep this page open; ZIVO will confirm
            only after CutLuy reports paid.
          </p>
        ) : (
          <p>
            Open any KHQR-supported Cambodian banking app and scan the code.
            {secondsRemaining !== null &&
              ` Payment display refreshes in ${Math.floor(secondsRemaining / 60)}:${String(secondsRemaining % 60).padStart(2, "0")}.`}
          </p>
        )}
      </div>

      <div className="mt-4">
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-xl"
          onClick={() => void createPayment()}
        >
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden />
          Refresh payment
        </Button>
      </div>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted-foreground">
        On one phone, take a screenshot first if your banking app supports
        scanning KHQR from photos.
      </p>

      <p
        role="note"
        className="mt-3 text-[11px] leading-relaxed text-muted-foreground"
      >
        Scanning alone does not complete payment. ZIVO confirms the room only
        after the signed CutLuy webhook reports that money moved. Refunds for
        this pilot are reviewed manually.
      </p>
    </section>
  );
}
