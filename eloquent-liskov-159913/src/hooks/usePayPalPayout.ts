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
      const { data, error } = await supabase.functions.invoke("paypal-payout", {
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
    mutationFn: async (params: { userId: string; paypal_email: string }) => {
      const { data: existing } = await (supabase as any)
        .from("creator_profiles")
        .select("id, payout_details")
        .eq("user_id", params.userId)
        .maybeSingle();

      const newDetails = {
        ...(existing?.payout_details || {}),
        paypal_email: params.paypal_email,
      };

      if (existing) {
        const { error } = await (supabase as any)
          .from("creator_profiles")
          .update({ payout_method: "paypal", payout_details: newDetails })
          .eq("user_id", params.userId);
        if (error) throw error;
      } else {
        const { error } = await (supabase as any)
          .from("creator_profiles")
          .insert({ user_id: params.userId, payout_method: "paypal", payout_details: newDetails });
        if (error) throw error;
      }
      return newDetails;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["creator-profile"] });
      queryClient.invalidateQueries({ queryKey: ["creator-profile-setup"] });
      toast.success("PayPal email saved");
    },
    onError: (e: any) => toast.error(e?.message || "Failed to save PayPal email"),
  });
}
