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
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");

      if (draft.id) {
        const { error } = await supabase
          .from("store_employee_rules")
          .update({
            title: draft.title,
            category: draft.category,
            description: draft.description,
            severity: draft.severity,
            applies_to: draft.applies_to,
            ...(draft.is_active !== undefined ? { is_active: draft.is_active } : {}),
            ...(draft.position !== undefined ? { position: draft.position } : {}),
          })
          .eq("id", draft.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("store_employee_rules").insert({
          store_id: storeId,
          title: draft.title,
          category: draft.category,
          description: draft.description,
          severity: draft.severity,
          applies_to: draft.applies_to,
          is_active: draft.is_active ?? true,
          position: draft.position ?? 0,
          created_by: uid,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(storeId) }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("store_employee_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(storeId) }),
  });

  const toggleActive = useMutation({
    mutationFn: async (rule: Pick<StoreEmployeeRule, "id" | "is_active">) => {
      const { error } = await supabase
        .from("store_employee_rules")
        .update({ is_active: !rule.is_active })
        .eq("id", rule.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(storeId) }),
  });

  const seedDefaults = useMutation({
    mutationFn: async (defaults: RuleDraft[]) => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth.user?.id;
      if (!uid) throw new Error("Not signed in");
      const rows = defaults.map((d, i) => ({
        store_id: storeId,
        title: d.title,
        category: d.category,
        description: d.description,
        severity: d.severity,
        applies_to: d.applies_to,
        is_active: d.is_active ?? true,
        position: d.position ?? i,
        created_by: uid,
      }));
      const { error } = await supabase.from("store_employee_rules").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY(storeId) }),
  });

  return { list, upsert, remove, toggleActive, seedDefaults };
}
