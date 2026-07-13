import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AffiliateAttribution {
  hasAffiliateAttribution: boolean;
  affiliateCode: string | null;
  partnerName: string;
  capturedAt: string | null;
  isLoading: boolean;
}

/**
 * Hook to fetch affiliate attribution status for the current user.
 * 
 * Returns whether the user was referred by a partner and displays
 * this information on the Profile page.
 */
export function useAffiliateAttribution(): AffiliateAttribution {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["affiliate-attribution", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      // Owner-only RPC: affiliate columns are no longer SELECT-able directly
      // from profiles (post 2026-04 PII hardening). The RPC returns only the
      // current user's attribution row.
      const { data, error } = await (supabase as any)
        .rpc("get_my_affiliate_attribution")
        .maybeSingle();

      if (error) {
        console.error("Error fetching affiliate attribution:", error);
        return null;
      }

      return {
        hasAffiliateAttribution: !!data?.affiliate_code,
        affiliateCode: data?.affiliate_code || null,
        partnerName: data?.affiliate_partner_name || "a partner",
        capturedAt: data?.affiliate_captured_at || null,
      };
    },
    enabled: !!user?.id,
    staleTime: Infinity, // Attribution never changes after signup
    gcTime: Infinity,
  });

  return {
    hasAffiliateAttribution: data?.hasAffiliateAttribution ?? false,
    affiliateCode: data?.affiliateCode ?? null,
    partnerName: data?.partnerName ?? "a partner",
    capturedAt: data?.capturedAt ?? null,
    isLoading,
  };
}
