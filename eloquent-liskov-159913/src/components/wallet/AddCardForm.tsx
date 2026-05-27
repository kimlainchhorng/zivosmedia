/**
 * Add Card Form — Stripe Elements in-app card entry
 * Uses SetupIntent for secure card saving
 */
import { useState } from "react";
import { Elements, CardElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { getStripe } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CreditCard, X, Shield } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: "16px",
      color: "hsl(var(--foreground))",
      fontFamily: "'Inter', system-ui, sans-serif",
      "::placeholder": { color: "hsl(var(--muted-foreground))" },
      backgroundColor: "transparent",
    },
    invalid: { color: "hsl(var(--destructive))" },
  },
  hidePostalCode: false,
};

function CardForm({ onClose }: { onClose: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setLoading(true);
    try {
      // 1. Create SetupIntent via edge function
      const { data, error } = await supabase.functions.invoke("manage-payment-methods", {
        body: { action: "create_setup_intent" },
      });

      if (error || !data?.client_secret) {
        throw new Error(error?.message || "Failed to initialize card setup");
      }

      // 2. Confirm the SetupIntent with card details
      const cardElement = elements.getElement(CardElement);
      if (!cardElement) throw new Error("Card element not found");

      const { error: confirmError, setupIntent } = await stripe.confirmCardSetup(
        data.client_secret,
        { payment_method: { card: cardElement } }
      );

      if (confirmError) {
        throw new Error(confirmError.message || "Card verification failed");
      }

      if (setupIntent?.status === "succeeded") {
        toast.success("Card added successfully!");
        queryClient.invalidateQueries({ queryKey: ["stripe-payment-methods"] });
        queryClient.invalidateQueries({ queryKey: ["zivo-payment-methods"] });
        onClose();
      }
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
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold">Card Details</span>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={onClose} className="rounded-xl -mr-2">
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="rounded-xl border border-border/60 p-3 bg-muted/20">
            <CardElement options={CARD_ELEMENT_OPTIONS} />
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[10px] text-muted-foreground">
            <Shield className="w-3 h-3" />
            Secured by Stripe. Your card info never touches our servers.
          </div>
        </CardContent>
      </Card>
      <Button
        type="submit"
        disabled={!stripe || loading}
        className="w-full rounded-xl font-bold shadow-sm"
      >
        {loading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving card…
          </>
        ) : (
          "Save Card"
        )}
      </Button>
    </form>
  );
}

export default function AddCardForm({ onClose }: { onClose: () => void }) {
  return (
    <Elements stripe={getStripe()}>
      <CardForm onClose={onClose} />
    </Elements>
  );
}
