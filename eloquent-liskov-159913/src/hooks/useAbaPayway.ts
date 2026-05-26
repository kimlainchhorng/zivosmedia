/**
 * useAbaPayway — triggers ABA Payway payment link for Cambodia checkout
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface AbaPaymentRequest {
  amount: number;
  currency?: "USD" | "KHR";
  description?: string;
  reference?: string;
}

export function useAbaPayway() {
  const [isLoading, setIsLoading] = useState(false);

  const createPaymentLink = async (request: AbaPaymentRequest) => {
    setIsLoading(true);
    try {
      const returnUrl = `${window.location.origin}/payment/success`;

      const { data, error } = await supabase.functions.invoke("aba-payway-checkout", {
        body: {
          amount: request.amount,
          currency: request.currency || "USD",
          description: request.description || "ZIVO Payment",
          return_url: returnUrl,
          reference: request.reference,
        },
      });

      if (error) throw error;

      if (data?.payment_url) {
        // Redirect to ABA Payway checkout
        import("@/lib/openExternalUrl").then(({ openExternalUrl: oe }) => oe(data.payment_url));
      } else if (data?.checkout_data) {
        // Fallback: build form submission to ABA
        submitAbaForm(data.checkout_data);
      }

      return data;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Payment failed";
      toast.error(msg);
      console.error("ABA Payway error:", err);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { createPaymentLink, isLoading };
}

/** Submit a hidden form to ABA Payway checkout (fallback) */
function submitAbaForm(checkoutData: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "https://checkout.payway.com.kh/api/payment-gateway/v1/payments/purchase";
  form.target = "_blank";

  for (const [key, value] of Object.entries(checkoutData)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = String(value);
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  document.body.removeChild(form);
}
