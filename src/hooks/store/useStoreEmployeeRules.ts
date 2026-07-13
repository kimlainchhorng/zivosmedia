/**
 * useStoreEmployeeRules — CRUD for the per-store employee rule book.
 * Backed by `public.store_employee_rules` (RLS: store owners + platform admins only).
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RuleSeverity = "low" | "medium" | "high" | "critical";

export interface StoreEmployeeRule {
  id: string;
  store_id: string;
  title: string;
  category: string;
  description: string;
  severity: RuleSeverity;
  applies_to: string;
  is_active: boolean;
  position: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RuleDraft {
  id?: string;
  title: string;
  category: string;
  description: string;
  severity: RuleSeverity;
  applies_to: string;
  is_active?: boolean;
  position?: number;
}

const KEY = (storeId: string) => ["store-employee-rules", storeId] as const;

export function useStoreEmployeeRules(storeId: string) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: KEY(storeId),
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_employee_rules")
        .select("*")
        .eq("store_id", storeId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as StoreEmployeeRule[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (draft: RuleDraft) => {
      const { error } = await supabase.functions.invoke("employee-rule-manage", {
        body: {
          action: draft.id ? "update" : "create",
          rulebook: "store_employee_rules",
          store_id: storeId,
          rule: draft,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(storeId) }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke("employee-rule-manage", {
        body: {
          action: "delete",
          rulebook: "store_employee_rules",
          rule_id: id,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(storeId) }),
  });

  const toggleActive = useMutation({
    mutationFn: async (rule: Pick<StoreEmployeeRule, "id" | "is_active">) => {
      const { error } = await supabase.functions.invoke("employee-rule-manage", {
        body: {
          action: "set_active",
          rulebook: "store_employee_rules",
          rule_id: rule.id,
          active: !rule.is_active,
        },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(storeId) }),
  });

  const seedDefaults = useMutation({
    mutationFn: async (defaults: RuleDraft[]) => {
      const { error } = await supabase.functions.invoke("employee-rule-manage", {
        body: {
          action: "seed_defaults",
          rulebook: "store_employee_rules",
          store_id: storeId,
          rules: defaults.map((d, i) => ({ ...d, position: d.position ?? i })),
        },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(storeId) }),
  });

  return { list, upsert, remove, toggleActive, seedDefaults };
}
