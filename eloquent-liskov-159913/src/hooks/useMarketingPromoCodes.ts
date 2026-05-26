/**
 * Marketing Promo Codes hook — list / upsert / delete / bulk-generate.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PromoCode {
  id: string;
  store_id: string;
  code: string;
  type: "percent" | "flat" | "free_shipping";
  value: number;
  min_order_cents: number;
  max_redemptions: number | null;
  per_customer_limit: number;
  redemption_count: number;
  revenue_cents: number;
  expires_at: string | null;
  campaign_id: string | null;
  status: "active" | "paused" | "expired";
  created_at: string;
}

function randomCode(prefix = "ZIVO", len = 6) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = prefix;
  for (let i = 0; i < len; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export function useMarketingPromoCodes(storeId: string | undefined) {
  return useQuery({
    queryKey: ["marketing-promo-codes", storeId],
    enabled: !!storeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketing_promo_codes" as any)
        .select("*")
        .eq("store_id", storeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return ((data as any[]) || []) as PromoCode[];
    },
  });
}

export function useUpsertPromoCode(storeId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<PromoCode> & { code: string }) => {
      if (!storeId) throw new Error("No store");
      const payload: any = {
        store_id: storeId,
        code: input.code.toUpperCase(),
        type: input.type ?? "percent",
        value: input.value ?? 10,
        min_order_cents: input.min_order_cents ?? 0,
        max_redemptions: input.max_redemptions ?? null,
        per_customer_limit: input.per_customer_limit ?? 1,
        expires_at: input.expires_at ?? null,
        campaign_id: input.campaign_id ?? null,
        status: input.status ?? "active",
      };
      if (input.id) {
        const { data, error } = await supabase
          .from("marketing_promo_codes" as any)
          .update(payload)
          .eq("id", input.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("marketing_promo_codes" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-promo-codes", storeId] });
      toast.success("Promo code saved");
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });
}

export function useBulkGeneratePromoCodes(storeId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      count: number;
      prefix: string;
      type: "percent" | "flat" | "free_shipping";
      value: number;
      expires_at?: string | null;
    }) => {
      if (!storeId) throw new Error("No store");
      const rows = Array.from({ length: Math.min(input.count, 1000) }, () => ({
        store_id: storeId,
        code: randomCode(input.prefix),
        type: input.type,
        value: input.value,
        per_customer_limit: 1,
        max_redemptions: 1,
        expires_at: input.expires_at ?? null,
      }));
      const { error } = await supabase.from("marketing_promo_codes" as any).insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["marketing-promo-codes", storeId] });
      toast.success(`Generated ${count} promo codes`);
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });
}

export function useDeletePromoCode(storeId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketing_promo_codes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marketing-promo-codes", storeId] });
      toast.success("Deleted");
    },
    onError: (e: any) => toast.error(e.message || "Failed"),
  });
}
