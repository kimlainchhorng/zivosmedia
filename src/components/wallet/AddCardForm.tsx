/**
 * Add Card Form - Stripe Payment Element in-app card entry.
 * Uses a SetupIntent for secure card saving without raw card data touching ZIVO.
 */
import { useEffect, useState, type FormEvent } from "react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useQueryClient } from "@tanstack/react-query";
import { CreditCard, Loader2, Shield, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getStripe, STRIPE_PUBLISHABLE_KEY } from "@/lib/stripe";

type AddCardFormProps = {
  onClose: () => void;
  makeDefault?: boolean;
  onSaved?: () => void;
};

function returnUrl() {
  if (typeof window === "undefined") return undefined;
  return `${window.location.origin}${window.location.pathname}${window.location.search}`;
}

function CardForm({
  clientSecret,
  makeDefault,
  onClose,
  onSaved,
}: AddCardFormProps & { clientSecret: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements || !ready) return;

    setLoading(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        throw new Error(submitError.message || "Please check your card details");
      }

      const result = await stripe.confirmSetup({
        elements,
        clientSecret,
        confirmParams: {
          return_url: returnUrl(),
        },
        redirect: "if_required",
      });

      if (result.error) {
        throw new Error(result.error.message || "Card verification failed");
      }

      const paymentMethodId = result.setupIntent?.payment_method;
      if (makeDefault && typeof paymentMethodId === "string") {
        await supabase.functions.invoke("manage-payment-methods", {
          body: { action: "set_default", payment_method_id: paymentMethodId },
        });
      }

      toast.success("Card added successfully");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["stripe-payment-methods"] }),
        queryClient.invalidateQueries({ queryKey: ["zivo-payment-methods"] }),
        queryClient.invalidateQueries({ queryKey: ["payment-methods"] }),
      ]);
      onSaved?.();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to add card");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Card className="border-border/40">
        <CardContent className="p-4">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">Card details</span>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose} className="-mr-2 rounded-xl">
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
            <PaymentElement
              onReady={() => {
                setReady(true);
                setLoadError(null);
              }}
              onLoadError={(event) => {
                setReady(false);
                setLoadError(event.error.message || "Payment form could not load");
              }}
              options={{
                layout: "tabs",
                paymentMethodOrder: ["card"],
                wallets: { applePay: "never", googlePay: "never" },
              }}
            />
          </div>

          {!ready && !loadError && (
            <p className="mt-3 text-[11px] font-medium text-muted-foreground">Loading secure card form...</p>
          )}
          {loadError && (
            <p className="mt-3 rounded-xl bg-destructive/10 px-3 py-2 text-[12px] font-medium text-destructive">
              {loadError}
            </p>
          )}
          <div className="mt-3 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <Shield className="h-3 w-3" />
            Secured by Stripe. Your card info never touches our servers.
          </div>
        </CardContent>
      </Card>

      <Button
        type="submit"
        disabled={!stripe || !elements || !ready || loading}
        className="w-full rounded-xl font-bold shadow-sm"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving card...
          </>
        ) : (
          "Save card"
        )}
      </Button>
    </form>
  );
}

export default function AddCardForm({ onClose, makeDefault = false, onSaved }: AddCardFormProps) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const createSetupIntent = async () => {
      if (!STRIPE_PUBLISHABLE_KEY) {
        setError("Card setup is not configured for this build.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("manage-payment-methods", {
          body: { action: "create_setup_intent" },
        });
        if (fnError || !data?.client_secret) {
          throw new Error(fnError?.message || data?.error || "Failed to initialize card setup");
        }
        if (!cancelled) {
          setClientSecret(String(data.client_secret));
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to initialize card setup");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void createSetupIntent();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-5 text-center text-sm text-muted-foreground">
        <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin" />
        Preparing secure card form...
      </div>
    );
  }

  if (error || !clientSecret) {
    return (
      <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-5 text-center">
        <p className="text-sm font-semibold text-destructive">{error || "Card setup is unavailable"}</p>
        <Button type="button" variant="outline" size="sm" className="mt-4 rounded-xl" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <Elements
      stripe={getStripe()}
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
      <CardForm clientSecret={clientSecret} makeDefault={makeDefault} onClose={onClose} onSaved={onSaved} />
    </Elements>
  );
}
