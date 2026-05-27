/**
 * Marketing Automations hook — list / upsert / delete / toggle status.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type AutomationTriggerType =
  | "cart_abandoned"
  | "first_order"
  | "no_order_in_days"
  | "birthday"
  | "loyalty_tier_change"
  | "wishlist_price_drop";

export type AutomationActionType =
  | "send_push"
  | "send_email"
  | "send_sms"
  | "apply_promo"
  | "add_to_segment"
  | "wait";

export interface AutomationStep {
  id: string;
  type: AutomationActionType;
  config: Record<string, any>;
}

export interface Automation {
  id: string;
  store_id: string;
  name: string;
  description?: string | null;
  trigger_json: { type: AutomationTriggerType; config: Record<string, any> };
  steps_json: AutomationStep[];
  status: "draft" | "active" | "paused" | "archived";
  enrolled_count: number;
  completed_count: number;
  created_at: string;
  updated_at: string;
}

export function useMarketingAutomations(storeId: string | undefined) {
  return useQuery({
    queryKey: ["marketing-automations", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_automations" as any)
        .select("*")
        .eq("store_id", storeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data as any[]) || []) as Automation[];
    },
  });
}

export function useUpsertAutomation(storeId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Automation> & { name: string }) => {
      if (!storeId) throw new Error("No store");
      const payload: any = {
        store_id: storeId,
        name: input.name,
        description: input.description ?? null,
        trigger_json: input.trigger_json ?? { type: "cart_abandoned", config: {} },
        steps_json: input.steps_json ?? [],
        status: input.status ?? "draft",
      };
      if (input.id) {
        const { data, error } = await supabase
          .from("marketing_automations" as any)
          .update(payload)
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("marketing_automations" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-automations", storeId] });
      toast.success("Automation saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });
}

export function useToggleAutomationStatus(storeId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Automation["status"] }) => {
      const { error } = await supabase
        .from("marketing_automations" as any)
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-automations", storeId] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });
}

export function useDeleteAutomation(storeId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_automations" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-automations", storeId] });
      toast.success("Deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });
}
