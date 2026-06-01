/**
 * usePayPalPayout — Send wallet balance to a PayPal email via PayPal Payouts API.
 * Works globally including Cambodia, Vietnam, and other regions Stripe doesn't cover.
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function usePayPalPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { amount_cents: number; paypal_email: string }) => {
      const idempotencyKey = `paypal-payout-${crypto.randomUUID()}`;
      const { data, error } = await supabase.functions.invoke("paypal-payout", {
        headers: { "Idempotency-Key": idempotencyKey },
        body: params,
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      toast.success("PayPal payout sent! 💸", {
        description: "Funds typically arrive in your PayPal account within minutes.",
      });
    },
    onError: (e: any) => toast.error(e?.message || "PayPal payout failed"),
  });
}

export function useSavePayPalEmail() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { userId?: string; paypal_email: string }) => {
      const idempotencyKey = `creator-paypal-method-${crypto.randomUUID()}`;
      const { data, error } = await supabase.functions.invoke("creator-payout-method-record", {
        headers: { "Idempotency-Key": idempotencyKey },
        body: { method: "paypal", paypal_email: params.paypal_email },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-profile"] });
      queryClient.invalidateQueries({ queryKey: ["creator-profile-setup"] });
      toast.success("PayPal email saved");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save PayPal email"),
  });
}
