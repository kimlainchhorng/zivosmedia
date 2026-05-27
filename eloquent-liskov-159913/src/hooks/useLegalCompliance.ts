/**
 * ZIVO Legal Compliance Hooks
 * Manages policies, consents, role terms, and disputes
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { LegalPolicy, UserConsentLog, RoleTerms, RoleTermsAcceptance, SellerOfTravelStatus, LegalDispute, LegalAuditLog, PolicyType, RoleType, ConsentRequest } from "@/types/legal";
import type { LegalSummary } from "@/types/legal";

// ============================================
// LEGAL POLICIES
// ============================================

export function useLegalPolicies(activeOnly = true) {
  return useQuery({
    queryKey: ["legal-policies", activeOnly],
    queryFn: async () => {
      let query = supabase.from("legal_policies").select("*");
      if (activeOnly) {
        query = query.eq("is_active", true);
      }
      const { data, error } = await query.order("policy_type");
      if (error) throw error;
      return (data || []) as unknown as LegalPolicy[];
    },
  });
}

export function useLegalPolicy(policyType: PolicyType) {
  return useQuery({
    queryKey: ["legal-policy", policyType],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_policies")
        .select("*")
        .eq("policy_type", policyType)
        .eq("is_active", true)
        .order("effective_at", { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== "PGRST116") throw error;
      return data as unknown as LegalPolicy | null;
    },
  });
}

export function useUpdateLegalPolicy() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<LegalPolicy>;
    }) => {
      const { error } = await supabase
        .from("legal_policies")
        .update({ ...updates, updated_by: user?.id })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-policies"] });
      queryClient.invalidateQueries({ queryKey: ["legal-policy"] });
      toast.success("Policy updated");
    },
  });
}

// ============================================
// USER CONSENTS
// ============================================

export function useUserConsents() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["user-consents", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("user_consent_logs")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as UserConsentLog[];
    },
    enabled: !!user?.id,
  });
}

export function useHasAcceptedPolicy(policyType: PolicyType) {
  const { user } = useAuth();
  const { data: policies } = useLegalPolicies(true);
  const { data: consents } = useUserConsents();

  const currentPolicy = policies?.find((p) => p.policy_type === policyType);
  const hasAccepted = consents?.some(
    (c) =>
      c.policy_type === policyType &&
      c.policy_version === currentPolicy?.version &&
      c.consent_given
  );

  return { hasAccepted: !!hasAccepted, currentPolicy };
}

export function useRecordConsent() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (request: ConsentRequest) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase.from("user_consent_logs").insert({
        user_id: user.id,
        policy_type: request.policyType,
        policy_version: request.policyVersion,
        consent_given: true,
        consent_method: "checkbox",
        page_url: request.pageUrl || window.location.href,
        user_agent: navigator.userAgent,
        device_type: /mobile/i.test(navigator.userAgent) ? "mobile" : "desktop",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-consents"] });
    },
  });
}

// ============================================
// ROLE TERMS
// ============================================

export function useRoleTerms(roleType?: RoleType) {
  return useQuery({
    queryKey: ["role-terms", roleType],
    queryFn: async () => {
      let query = supabase.from("role_terms").select("*").eq("is_active", true);
      if (roleType) {
        query = query.eq("role_type", roleType);
      }
      const { data, error } = await query.order("role_type");
      if (error) throw error;
      return (data || []) as unknown as RoleTerms[];
    },
  });
}

export function useRoleTermsAcceptance() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["role-terms-acceptance", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("role_terms_acceptance")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return (data || []) as unknown as RoleTermsAcceptance[];
    },
    enabled: !!user?.id,
  });
}

export function useAcceptRoleTerms() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      roleType,
      termsVersion,
      roleTermsId,
    }: {
      roleType: RoleType;
      termsVersion: string;
      roleTermsId?: string;
    }) => {
      if (!user?.id) throw new Error("User not authenticated");

      const { error } = await supabase.from("role_terms_acceptance").insert({
        user_id: user.id,
        role_type: roleType,
        terms_version: termsVersion,
        role_terms_id: roleTermsId || null,
        user_agent: navigator.userAgent,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["role-terms-acceptance"] });
      toast.success("Terms accepted");
    },
  });
}

// ============================================
// SELLER OF TRAVEL STATUS
// ============================================

export function useSOTStatus() {
  return useQuery({
    queryKey: ["sot-status"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("seller_of_travel_status")
        .select("*")
        .order("state_name");

      if (error) throw error;
      return (data || []) as unknown as SellerOfTravelStatus[];
    },
  });
}

export function useUpdateSOTStatus() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      stateCode,
      updates,
    }: {
      stateCode: string;
      updates: Partial<SellerOfTravelStatus>;
    }) => {
      const { error } = await supabase
        .from("seller_of_travel_status")
        .update({ ...updates, updated_by: user?.id })
        .eq("state_code", stateCode);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sot-status"] });
      toast.success("SOT status updated");
    },
  });
}

// ============================================
// DISPUTES
// ============================================

export function useLegalDisputes(status?: string) {
  return useQuery({
    queryKey: ["legal-disputes", status],
    queryFn: async () => {
      let query = supabase
        .from("legal_disputes")
        .select("*")
        .order("created_at", { ascending: false });

      if (status) {
        query = query.eq("status", status);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as LegalDispute[];
    },
  });
}

export function useFileDispute() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (
      dispute: Omit<LegalDispute, "id" | "created_at" | "updated_at" | "status">
    ) => {
      const { error } = await supabase.from("legal_disputes").insert({
        ...dispute,
        complainant_id: user?.id,
        status: "open",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["legal-disputes"] });
      toast.success("Dispute filed");
    },
  });
}

// ============================================
// AUDIT LOGS
// ============================================

export function useLegalAuditLogs(limit = 50) {
  return useQuery({
    queryKey: ["legal-audit-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("legal_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as unknown as LegalAuditLog[];
    },
  });
}

// ============================================
// LEGAL SUMMARY
// ============================================

export function useLegalSummary() {
  return useQuery({
    queryKey: ["legal-summary"],
    queryFn: async () => {
      const [policiesRes, disputesRes, sotRes, auditRes] = await Promise.all([
        supabase.from("legal_policies").select("id").eq("is_active", true),
        supabase.from("legal_disputes").select("id").eq("status", "open"),
        supabase.from("seller_of_travel_status").select("status"),
        supabase
          .from("legal_audit_log")
          .select("id")
          .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      ]);

      const sotStatuses = (sotRes.data || []) as { status: string }[];

      const summary: LegalSummary = {
        activePolicies: policiesRes.data?.length || 0,
        pendingConsents: 0,
        openDisputes: disputesRes.data?.length || 0,
        sotStatesActive: sotStatuses.filter((s) => s.status === "active").length,
        sotStatesPending: sotStatuses.filter((s) => s.status === "pending").length,
        recentAuditLogs: auditRes.data?.length || 0,
      };

      return summary;
    },
  });
}

// ============================================
// ALL CONSENT LOGS (Admin)
// ============================================

export function useAllConsentLogs(limit = 100) {
  return useQuery({
    queryKey: ["all-consent-logs", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_consent_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;
      return (data || []) as unknown as UserConsentLog[];
    },
  });
}
