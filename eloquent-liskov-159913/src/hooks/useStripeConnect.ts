/**
 * useStripeConnect — Stripe Connect Express + Instant Payouts
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ConnectStatus {
  connected: boolean;
  account_id?: string;
  country?: string | null;
  charges_enabled?: boolean;
  details_submitted?: boolean;
  payouts_enabled?: boolean;
  instant_eligible?: boolean;
  requirements?: string[];
  requirements_past_due?: string[];
  disabled_reason?: string | null;
}

export function useConnectStatus() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["stripe-connect-status", user?.id],
    queryFn: async (): Promise<ConnectStatus> => {
      const { data, error } = await supabase.functions.invoke("connect-status", { body: {} });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });
}

export function useConnectOnboard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (country: string = "US") => {
      // Return to the EXACT page user started on so it feels in-app
      const sep = window.location.search ? "&" : "?";
      const returnUrl = `${window.location.origin}${window.location.pathname}${window.location.search}${sep}connect=done`;
      const { data, error } = await supabase.functions.invoke("connect-onboard", {
        body: { country, return_url: returnUrl },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { url: string; account_id: string };
    },
    onSuccess: (data) => {
      // Stripe blocks iframe embedding (X-Frame-Options) and popups are
      // unreliable inside the Lovable preview iframe + mobile Safari.
      // Same-tab navigation is the only reliable path. Stripe returns the
      // user to `return_url` (the exact page they started on) so the flow
      // feels in-app.
      queryClient.invalidateQueries({ queryKey: ["stripe-connect-status"] });
      toast.info("Opening Stripe…");
      window.location.assign(data.url);
    },
    onError: (e: any) => toast.error(e?.message || "Onboarding failed"),
  });
}

export function useInstantPayout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { amount_cents: number; method?: "instant" | "standard" }) => {
      const { data, error } = await supabase.functions.invoke("connect-instant-payout", {
        body: { amount_cents: params.amount_cents, method: params.method ?? "instant" },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["customer-wallet"] });
      queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      const arrival = data?.arrival_date ? new Date(data.arrival_date * 1000).toLocaleDateString() : "soon";
      toast.success(
        data?.method === "instant" ? "Instant payout sent! ⚡" : "Standard payout submitted",
        { description: `Funds arrive ${arrival}` }
      );
    },
    onError: (e: any) => toast.error(e?.message || "Payout failed"),
  });
}
