/**
 * useTravelCheckout Hook
 * Creates Stripe checkout session and redirects to payment
 */
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { isAllowedCheckoutUrl } from "@/lib/urlSafety";

export function useTravelCheckout() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startCheckout = useCallback(
    async (orderId: string, options?: { successUrl?: string; cancelUrl?: string }) => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: invokeError } = await supabase.functions.invoke(
          "create-travel-checkout",
          {
            body: {
              orderId,
              successUrl: options?.successUrl,
              cancelUrl: options?.cancelUrl,
            },
          }
        );

        if (invokeError) throw invokeError;
        if (!data?.success) throw new Error(data?.error || "Failed to create checkout session");

        // Redirect to Stripe Checkout — validate domain to prevent open redirect
        if (data.url) {
          if (!isAllowedCheckoutUrl(data.url)) {
            throw new Error("Invalid checkout URL returned");
          }
          window.location.href = data.url;
        }

        return data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to start checkout";
        setError(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { startCheckout, isLoading, error };
}
