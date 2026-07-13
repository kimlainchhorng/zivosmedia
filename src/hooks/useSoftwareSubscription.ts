/**
 * useSoftwareSubscription — the store's current ZIVO Software plan, read live
 * from Stripe via the `software-subscription-status` Edge Function. Returns null
 * when the store has no active/trialing subscription.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface SoftwareSubscription {
  plan: string | null;
  cycle: string | null;
  status: string;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  amount_cents: number | null;
  interval: string | null;
}

export function useSoftwareSubscription(storeId: string | undefined) {
  return useQuery({
    queryKey: ["software-subscription", storeId],
    enabled: !!storeId,
    staleTime: 60_000,
    queryFn: async (): Promise<SoftwareSubscription | null> => {
      const { data, error } = await supabase.functions.invoke("software-subscription-status", {
        body: { store_id: storeId },
      });
      if (error) return null;
      return (data as { subscription: SoftwareSubscription | null })?.subscription ?? null;
    },
  });
}
