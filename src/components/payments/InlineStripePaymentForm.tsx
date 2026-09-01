/**
 * InlineStripePaymentForm — the single embedded Stripe PaymentElement used by
 * every ZIVO inline checkout (flights, bus, car rental, grocery).
 *
 * Before this existed each vertical carried its own near-identical copy, and
 * they had drifted in ways that mattered:
 *
 *  - Amount display. Three copies formatted with
 *    `code === "USD" ? "$" : code + " "`, and grocery hardcoded "$" with no
 *    currency prop at all. That prints "$" on a non-USD supplier fare and
 *    divides zero-decimal currencies (JPY, KRW, VND, KHR) by 100. The CTA
 *    amount now goes through `formatStripeAmount`, which reads the
 *    PaymentIntent's own minor-unit integer.
 *  - Failures were reported by toast only, so the message disappeared on a
 *    timer and was never announced. The error is now persistent, sits directly
 *    above the submit button, and is exposed as `role="alert"`.
 *  - Touch targets ranged from h-11 to h-12. All actions are h-12 (48px).
 *
 * What deliberately stays per-vertical is the *copy*: bus authorises and car
 * rental holds under manual capture, and saying "Pay" there would be untrue.
 * Callers pass the verb and the accompanying notice.
 */
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { AlertCircle, Loader2, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStripe } from "@/lib/stripe";
import { formatStripeAmount } from "@/lib/currency";
import { cn } from "@/lib/utils";

const stripePromise = getStripe();

/** PaymentIntent statuses that mean "the money side is done, hand off now". */
const SETTLED_STATUSES = ["succeeded", "processing", "requires_capture"];

const ELEMENT_LOAD_TIMEOUT_MS = 8000;

export interface InlineStripePaymentFormProps {
  /** PaymentIntent client secret from the server. */
  clientSecret: string;
  /** Amount exactly as Stripe holds it: an integer in the currency's smallest unit. */
  amountMinorUnits: number;
  /** ISO code of the PaymentIntent. Defaults to USD. */
  currency?: string;
  /** Same-origin route Stripe should restore after an authentication redirect. */
  returnUrl?: string;
  onCancel: () => void;
  onSuccess: (paymentIntentId: string) => Promise<void> | void;
  /**
   * CTA verb. Use "Pay" for immediate capture; "Authorise" or "Hold" when the
   * intent is manual-capture, so the button does not promise a charge that has
   * not happened.
   */
  ctaVerb?: string;
  /** Short truthful line about what pressing the button does. */
  captureNotice?: ReactNode;
  /** Vertical accent for the submit button. */
  submitClassName?: string;
  /** Heading above the element. `null` hides it. */
  heading?: string | null;
  cancelLabel?: string;
  /** Order shown in the PaymentElement tabs. */
  paymentMethodOrder?: string[];
  securityNote?: string;
}

function InnerPaymentForm({
  amountMinorUnits,
  currency = "USD",
  returnUrl,
  onCancel,
  onSuccess,
  ctaVerb = "Pay",
  captureNotice,
  submitClassName,
  heading = "Enter payment details",
  cancelLabel = "Back",
  paymentMethodOrder = ["card", "apple_pay", "google_pay"],
  securityNote = "Secured by Stripe · 256-bit encryption",
}: Omit<InlineStripePaymentFormProps, "clientSecret">) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isElementReady, setIsElementReady] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [renderKey, setRenderKey] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!isElementReady) setLoadTimedOut(true);
    }, ELEMENT_LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [isElementReady, renderKey]);

  const handleRetryElement = () => {
    setIsElementReady(false);
    setLoadTimedOut(false);
    setErrorMessage(null);
    setRenderKey((prev) => prev + 1);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message || "Please check your card details");
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: resolveReturnUrl(returnUrl) },
        redirect: "if_required",
      });

      if (error) throw new Error(error.message || "Payment failed");

      if (!paymentIntent?.id || !SETTLED_STATUSES.includes(paymentIntent.status)) {
        throw new Error("Unexpected payment status");
      }

      await onSuccess(paymentIntent.id);
    } catch (err: unknown) {
      const message = err instanceof Error && err.message ? err.message : "Payment failed";
      setErrorMessage(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formattedAmount = formatStripeAmount(amountMinorUnits, currency);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {heading !== null && (
        <div className="mb-1 flex items-center gap-2">
          <Lock className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          <span className="text-sm font-semibold">{heading}</span>
        </div>
      )}

      <div className="relative min-h-[180px] rounded-2xl border border-border/30 bg-card p-4">
        {!isElementReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span>Loading secure payment form…</span>
            {loadTimedOut && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-lg"
                onClick={handleRetryElement}
              >
                Retry
              </Button>
            )}
          </div>
        )}

        <div className={isElementReady ? "opacity-100 transition-opacity" : "opacity-0"}>
          <PaymentElement
            key={renderKey}
            onReady={() => {
              setIsElementReady(true);
              setLoadTimedOut(false);
            }}
            options={{
              layout: "tabs",
              paymentMethodOrder,
              wallets: { applePay: "auto", googlePay: "auto" },
            }}
          />
        </div>
      </div>

      {captureNotice && (
        <p className="px-2 text-center text-[11px] text-muted-foreground">{captureNotice}</p>
      )}

      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <Shield className="h-3 w-3" aria-hidden="true" />
        <span>{securityNote}</span>
      </div>

      {/* Persistent, announced failure state. A toast would time out and never
          reach a screen reader on the one screen where the reason matters. */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive"
        >
          <AlertCircle className="mt-px h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-xl font-semibold"
          onClick={onCancel}
          disabled={isProcessing}
        >
          {cancelLabel}
        </Button>
        <Button
          type="submit"
          className={cn("h-12 rounded-xl font-bold gap-2", submitClassName)}
          disabled={!stripe || isProcessing || !isElementReady}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Processing…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" aria-hidden="true" />
              {ctaVerb} {formattedAmount}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

function resolveReturnUrl(value?: string): string {
  if (!value) return window.location.href;
  try {
    const resolved = new URL(value, window.location.origin);
    return resolved.origin === window.location.origin
      ? resolved.toString()
      : window.location.href;
  } catch {
    return window.location.href;
  }
}

export default function InlineStripePaymentForm({
  clientSecret,
  ...inner
}: InlineStripePaymentFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: { theme: "stripe", variables: { borderRadius: "12px" } },
      }}
    >
      <InnerPaymentForm {...inner} />
    </Elements>
  );
}
