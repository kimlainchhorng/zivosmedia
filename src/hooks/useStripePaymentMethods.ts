/**
 * Hook for real Stripe payment methods via manage-payment-methods edge function
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { CardReadError, cardReadRetryDelay, cardSessionKey, classifyCardReadError } from '@/lib/walletCardRead';

export interface StripeCard {
  id: string;
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  is_default: boolean;
}

export function useStripePaymentMethods() {
  const { user, session } = useAuth();

  const query = useQuery({
    queryKey: ["stripe-payment-methods", user?.id, cardSessionKey(session?.access_token, user?.last_sign_in_at)],
    queryFn: async ({ signal }) => {
      const { data, error } = await supabase.functions.invoke("manage-payment-methods", {
        body: { action: "list" },
        signal,
      });
      if (error || data?.error || data?.ok !== true) throw await classifyCardReadError(error, data);
      if (!Array.isArray(data.cards) || data.cards.some((card: StripeCard) =>
        !card || typeof card.id !== 'string' || !card.id.startsWith('pm_') ||
        typeof card.brand !== 'string' || !/^\d{4}$/.test(card.last4) ||
        !Number.isInteger(card.exp_month) || card.exp_month < 1 || card.exp_month > 12 ||
        !Number.isInteger(card.exp_year))) throw new CardReadError('unavailable');
      return data.cards.map((card: StripeCard) => ({ id: card.id, brand: card.brand, last4: card.last4,
        exp_month: card.exp_month, exp_year: card.exp_year, is_default: card.is_default === true })) as StripeCard[];
    },
    enabled: !!user,
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
    refetchOnMount: false,
    retryOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    throwOnError: false,
    retry: (attempt, error) => attempt < 2 && error instanceof CardReadError &&
      (error.kind === 'rate-limited' || error.kind === 'unavailable'),
    retryDelay: (attempt, error) => cardReadRetryDelay(attempt, error instanceof CardReadError ? error : new CardReadError('unavailable')),
  });
  const failure = query.error || query.failureReason;
  const denied = failure instanceof CardReadError && ['unauthorized', 'forbidden'].includes(failure.kind);
  return { ...query, data: denied ? undefined : query.data };
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
