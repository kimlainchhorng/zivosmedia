/**
 * Marketing Templates hook — list / upsert / delete / record-usage.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MarketingTemplate {
  id: string;
  store_id: string;
  channel: "push" | "email" | "sms" | "inapp" | "ad";
  name: string;
  subject?: string | null;
  body?: string | null;
  preview_image_url?: string | null;
  variables_jsonb: string[];
  usage_count: number;
  last_used_at: string | null;
  last_campaign_id?: string | null;
  created_at: string;
  updated_at: string;
}

export function useMarketingTemplates(storeId: string | undefined, channel?: string) {
  return useQuery({
    queryKey: ["marketing-templates", storeId, channel],
    enabled: !!storeId,
    queryFn: async () => {
      let q = supabase
        .from("marketing_templates" as any)
        .select("*")
        .eq("store_id", storeId!)
        .order("updated_at", { ascending: false });
      if (channel) q = q.eq("channel", channel);
      const { data, error } = await q;
      if (error) throw error;
      return ((data as any[]) || []) as MarketingTemplate[];
    },
  });
}

export function useUpsertTemplate(storeId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<MarketingTemplate> & { name: string; channel: string }) => {
      if (!storeId) throw new Error("No store");
      const payload: any = {
        store_id: storeId,
        channel: input.channel,
        name: input.name,
        subject: input.subject ?? null,
        body: input.body ?? null,
        preview_image_url: input.preview_image_url ?? null,
        variables_jsonb: input.variables_jsonb ?? [],
      };
      if (input.id) {
        const { data, error } = await supabase
          .from("marketing_templates" as any)
          .update(payload)
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("marketing_templates" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-templates", storeId] });
      toast.success("Template saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed to save template"),
  });
}

export function useDeleteTemplate(storeId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_templates" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-templates", storeId] });
      toast.success("Template deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });
}
