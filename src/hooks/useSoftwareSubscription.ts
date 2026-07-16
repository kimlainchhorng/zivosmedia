import { useQuery } from "@tanstack/react-query";

import { supabase } from "@/integrations/supabase/client";

/** Webhook-reconciled provider state returned after owner/admin validation. */
export interface SoftwareSubscription {
  id: string;
  plan_id: string | null;
  plan: string | null;
  cycle: string | null;
  status: string;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  amount_cents: number | null;
  currency: string | null;
  interval: string | null;
  billing_portal_available: boolean;
  reconciliation_required: boolean;
  access_granted: boolean;
}

export function useSoftwareSubscription(businessId: string | undefined) {
  return useQuery({
    queryKey: ["software-subscription", businessId],
    enabled: Boolean(businessId),
    staleTime: 60_000,
    queryFn: async (): Promise<SoftwareSubscription | null> => {
      const { data, error } = await supabase.functions.invoke("software-subscription-status", {
        body: { business_id: businessId },
      });
      if (error) throw error;
      return (data as { subscription: SoftwareSubscription | null })?.subscription ?? null;
    },
  });
}
