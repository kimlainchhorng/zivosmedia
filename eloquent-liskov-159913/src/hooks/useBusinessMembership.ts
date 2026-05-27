/**
 * useBusinessMembership Hook
 * Fetch and manage user's business account membership
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface BusinessMembership {
  isMember: boolean;
  company: {
    id: string;
    name: string;
    billingEmail: string | null;
  } | null;
  role: "admin" | "member" | "viewer";
  paymentPreference: "personal" | "company";
  joinedAt: string | null;
  membershipId: string | null;
}

export function useBusinessMembership() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["business-membership", user?.id],
    queryFn: async (): Promise<BusinessMembership> => {
      if (!user?.id) {
        return {
          isMember: false,
          company: null,
          role: "member",
          paymentPreference: "personal",
          joinedAt: null,
          membershipId: null,
        };
      }

      // Fetch user's business membership with company info
      const { data, error } = await supabase
        .from("business_account_users")
        .select(`
          id,
          role,
          payment_preference,
          joined_at,
          business_id,
          business_accounts!inner (
            id,
            company_name,
            billing_email
          )
        `)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching business membership:", error);
        throw error;
      }

      if (!data) {
        return {
          isMember: false,
          company: null,
          role: "member",
          paymentPreference: "personal",
          joinedAt: null,
          membershipId: null,
        };
      }

      // Handle the joined business_accounts data
      const businessAccount = data.business_accounts as unknown as {
        id: string;
        company_name: string;
        billing_email: string | null;
      };

      return {
        isMember: true,
        company: {
          id: businessAccount.id,
          name: businessAccount.company_name,
          billingEmail: businessAccount.billing_email,
        },
        role: data.role as "admin" | "member" | "viewer",
        paymentPreference: (data.payment_preference || "personal") as "personal" | "company",
        joinedAt: data.joined_at,
        membershipId: data.id,
      };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

export function useUpdatePaymentPreference() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (preference: "personal" | "company") => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("business_account_users")
        .update({ payment_preference: preference })
        .eq("user_id", user.id);

      if (error) throw error;
      return preference;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-membership", user?.id] });
    },
  });
}

export function useLeaveCompany() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("business_account_users")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["business-membership", user?.id] });
    },
  });
}
