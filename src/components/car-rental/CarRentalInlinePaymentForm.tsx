/**
 * CarRentalInlinePaymentForm — embedded Stripe PaymentElement for the
 * customer-facing car rental booking flow. Forks FlightInlinePaymentForm so
 * the visual + UX bar matches other ZIVO payment surfaces.
 */
import { useEffect, useState, type FormEvent } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStripe } from "@/lib/stripe";
import { toast } from "sonner";

const stripePromise = getStripe();

interface CarRentalInlinePaymentFormProps {
  clientSecret: string;
  amountCents: number;
  currency: string;
  /** Label under the Pay button: "Hold deposit of $X" vs "Pay $X". */
  captureMode: "manual" | "immediate";
  onCancel: () => void;
  onSuccess: (paymentIntentId: string) => Promise<void> | void;
}

function InnerPaymentForm({
  amountCents,
  currency,
  captureMode,
  onCancel,
  onSuccess,
}: Omit<CarRentalInlinePaymentFormProps, "clientSecret">) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isElementReady, setIsElementReady] = useState(false);
  const [loadTimedOut, setLoadTimedOut] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      if (!isElementReady) setLoadTimedOut(true);
    }, 8000);
    return () => window.clearTimeout(timeout);
  }, [isElementReady, renderKey]);

  const handleRetryElement = () => {
    setIsElementReady(false);
    setLoadTimedOut(false);
    setRenderKey((prev) => prev + 1);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setIsProcessing(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message || "Please check your card details");
      }

      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: "if_required",
      });

      if (error) throw new Error(error.message || "Payment failed");

      if (
        !paymentIntent?.id
        || !["succeeded", "processing", "requires_capture"].includes(paymentIntent.status)
      ) {
        throw new Error("Unexpected payment status");
      }

      await onSuccess(paymentIntent.id);
    } catch (err: any) {
      toast.error(err?.message || "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const displayAmount = (amountCents / 100).toFixed(2);
  const cur = (currency || "USD").toUpperCase();
  const currencySymbol = cur === "USD" ? "$" : `${cur} `;
  const ctaLabel =
    captureMode === "manual"
      ? `Hold ${currencySymbol}${displayAmount}`
      : `Pay ${currencySymbol}${displayAmount}`;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Lock className="w-4 h-4 text-emerald-500" />
        <span className="text-sm font-semibold">Enter Payment Details</span>
      </div>

      <div className="relative rounded-2xl bg-card border border-border/30 p-4 min-h-[180px]">
        {!isElementReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
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
              paymentMethodOrder: ["card", "apple_pay", "google_pay"],
              wallets: { applePay: "auto", googlePay: "auto" },
            }}
          />
        </div>
      </div>

      {captureMode === "manual" && (
        <p className="text-[11px] text-muted-foreground text-center px-2">
          We&apos;ll authorise the security deposit now. Your card isn&apos;t charged
          until the rental balance is captured at pickup.
        </p>
      )}

      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <Shield className="h-3 w-3" />
        <span>Secured by Stripe · 256-bit encryption</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-12 rounded-xl font-semibold"
          onClick={onCancel}
          disabled={isProcessing}
        >
          Back
        </Button>
        <Button
          type="submit"
          className="h-12 rounded-xl font-bold gap-2"
          disabled={!stripe || isProcessing || !isElementReady}
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing…
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              {ctaLabel}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function CarRentalInlinePaymentForm({
  clientSecret,
  amountCents,
  currency,
  captureMode,
  onCancel,
  onSuccess,
}: CarRentalInlinePaymentFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: { borderRadius: "12px" },
        },
      }}
    >
      <InnerPaymentForm
        amountCents={amountCents}
        currency={currency}
        captureMode={captureMode}
        onCancel={onCancel}
        onSuccess={onSuccess}
      />
    </Elements>
  );
}
