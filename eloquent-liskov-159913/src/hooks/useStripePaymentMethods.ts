/**
 * Hook for real Stripe payment methods via manage-payment-methods edge function
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface StripeCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

export function useStripePaymentMethods() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["stripe-payment-methods", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-payment-methods", {
        body: { action: "list" },
      });
      if (error) throw new Error(typeof error === 'string' ? error : error?.message || "Failed to fetch cards");
      if (data?.error) throw new Error(data.error);
      if (!data?.ok) throw new Error("Failed to fetch cards");
      return (data.cards || []) as StripeCard[];
    },
    enabled: !!user,
  });
}

export function useSetDefaultStripeCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-payment-methods", {
        body: { action: "set_default", payment_method_id: paymentMethodId },
      });
      if (error || !data?.ok) throw new Error("Failed to set default card");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stripe-payment-methods"] });
      toast.success("Default card updated");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteStripeCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (paymentMethodId: string) => {
      const { data, error } = await supabase.functions.invoke("manage-payment-methods", {
        body: { action: "delete", payment_method_id: paymentMethodId },
      });
      if (error || !data?.ok) throw new Error("Failed to remove card");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stripe-payment-methods"] });
      toast.success("Card removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
