/**
 * Policy Consent Hook
 * Tracks user acceptance of terms, privacy policy, etc.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { PolicyConsent, PolicyType, PolicyVersion } from "@/types/security";

/**
 * Get all policy versions
 */
export function usePolicyVersions() {
  return useQuery({
    queryKey: ["policy-versions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("policy_versions")
        .select("*")
        .order("policy_type");

      if (error) throw error;
      return (data || []) as PolicyVersion[];
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
}

/**
 * Get user's consent status for all policies
 */
export function useUserConsents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-consents", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from("policy_consents")
        .select("*")
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .order("accepted_at", { ascending: false });

      if (error) throw error;
      return (data || []) as PolicyConsent[];
    },
    enabled: !!user?.id,
  });
}

/**
 * Check if user has accepted current version of a policy
 */
export function useHasPolicyConsent(policyType: PolicyType) {
  const { user } = useAuth();
  const { data: versions } = usePolicyVersions();
  const { data: consents } = useUserConsents();

  if (!user || !versions || !consents) return { hasConsent: false, isLoading: true };

  const currentVersion = versions.find(v => v.policy_type === policyType);
  if (!currentVersion) return { hasConsent: true, isLoading: false };

  const hasConsent = consents.some(
    c => c.policy_type === policyType && c.policy_version === currentVersion.current_version
  );

  return { hasConsent, isLoading: false };
}

/**
 * Get pending consents (policies user hasn't accepted current version)
 */
export function usePendingConsents() {
  const { user } = useAuth();
  const { data: versions, isLoading: versionsLoading } = usePolicyVersions();
  const { data: consents, isLoading: consentsLoading } = useUserConsents();

  if (!user || versionsLoading || consentsLoading) {
    return { pendingPolicies: [], isLoading: true };
  }

  const pendingPolicies = (versions || []).filter(version => {
    const hasCurrentConsent = (consents || []).some(
      c => c.policy_type === version.policy_type && c.policy_version === version.current_version
    );
    return !hasCurrentConsent;
  });

  // Filter to only required policies
  const requiredPolicies = pendingPolicies.filter(p => 
    ['terms', 'privacy', 'seller_of_travel'].includes(p.policy_type)
  );

  return { pendingPolicies: requiredPolicies, isLoading: false };
}

/**
 * Accept a policy
 */
export function useAcceptPolicy() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      policy_type: PolicyType;
      policy_version: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("policy_consents")
        .insert({
          user_id: user.id,
          policy_type: params.policy_type,
          policy_version: params.policy_version,
        })
        .select()
        .single();

      if (error) throw error;
      return data as PolicyConsent;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-consents"] });
    },
    onError: (error: Error) => {
      toast.error(`Failed to record consent: ${error.message}`);
    },
  });
}

/**
 * Accept multiple policies at once
 */
export function useAcceptMultiplePolicies() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (policies: Array<{ policy_type: PolicyType; policy_version: string }>) => {
      if (!user?.id) throw new Error("User not authenticated");

      const consents = policies.map(p => ({
        user_id: user.id,
        policy_type: p.policy_type,
        policy_version: p.policy_version,
      }));

      const { error } = await supabase
        .from("policy_consents")
        .insert(consents);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-consents"] });
      toast.success("Policies accepted");
    },
    onError: (error: Error) => {
      toast.error(`Failed to record consents: ${error.message}`);
    },
  });
}

/**
 * Revoke a consent (for privacy reasons)
 */
export function useRevokeConsent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (params: {
      consent_id: string;
      reason: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase
        .from("policy_consents")
        .update({
          revoked_at: new Date().toISOString(),
          revoked_reason: params.reason,
        })
        .eq("id", params.consent_id)
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-consents"] });
      toast.success("Consent revoked");
    },
    onError: (error: Error) => {
      toast.error(`Failed to revoke consent: ${error.message}`);
    },
  });
}
