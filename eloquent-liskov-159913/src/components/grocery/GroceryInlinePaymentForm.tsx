import { useEffect, useState, type FormEvent } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { Loader2, Lock, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStripe } from "@/lib/stripe";
import { toast } from "sonner";

const stripePromise = getStripe();

interface GroceryInlinePaymentFormProps {
  clientSecret: string;
  totalCents: number;
  onCancel: () => void;
  onSuccess: (paymentIntentId: string) => Promise<void> | void;
}

function InnerPaymentForm({ totalCents, onCancel, onSuccess }: Omit<GroceryInlinePaymentFormProps, "clientSecret">) {
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

      if (!paymentIntent?.id || !["succeeded", "processing", "requires_capture"].includes(paymentIntent.status)) {
        throw new Error("Unexpected payment status");
      }

      await onSuccess(paymentIntent.id);
    } catch (err: any) {
      toast.error(err?.message || "Payment failed");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative rounded-2xl bg-card border border-border/20 p-3.5 min-h-[170px]">
        {!isElementReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading secure card & wallet options…</span>
            {loadTimedOut && (
              <Button type="button" variant="outline" size="sm" className="h-8 rounded-lg" onClick={handleRetryElement}>
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
              paymentMethodOrder: ["apple_pay", "google_pay", "card"],
              wallets: { applePay: "auto", googlePay: "auto" },
            }}
          />
        </div>
      </div>

      <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground">
        <Shield className="h-3 w-3" />
        <span>Secured by Stripe · Card, Apple Pay, Google Pay (when available)</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" className="h-11 rounded-xl font-semibold" onClick={onCancel} disabled={isProcessing}>
          Back
        </Button>
        <Button type="submit" className="h-11 rounded-xl font-bold gap-2" disabled={!stripe || isProcessing || !isElementReady}>
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Lock className="h-4 w-4" />
              Pay ${(totalCents / 100).toFixed(2)}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default function GroceryInlinePaymentForm({ clientSecret, totalCents, onCancel, onSuccess }: GroceryInlinePaymentFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: "stripe",
          variables: {
            borderRadius: "12px",
          },
        },
      }}
    >
      <InnerPaymentForm totalCents={totalCents} onCancel={onCancel} onSuccess={onSuccess} />
    </Elements>
  );
}
