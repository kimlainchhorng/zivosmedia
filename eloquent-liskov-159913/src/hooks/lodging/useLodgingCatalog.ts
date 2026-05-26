import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Generic CRUD hook for the new Hotels & Resorts catalog tables.
 *
 * All target tables share the same shape contract:
 *   - id (uuid PK)
 *   - store_id (uuid)
 *   - active (boolean)
 *   - sort_order (integer, optional)
 *   - created_at / updated_at (timestamptz)
 *
 * Tables wired here:
 *   - lodging_meal_plans
 *   - lodging_experiences
 *   - lodging_wellness_services
 *   - lodging_transfers
 *   - lodging_promotions
 *   - lodging_taxes_fees
 *   - lodging_channel_connections
 *   - lodging_reviews
 */
export type LodgingCatalogTable =
  | "lodging_meal_plans"
  | "lodging_experiences"
  | "lodging_wellness_services"
  | "lodging_transfers"
  | "lodging_promotions"
  | "lodging_taxes_fees"
  | "lodging_channel_connections"
  | "lodging_reviews"
  | "lodging_concierge_tasks"
  | "lodging_lost_found";

export interface LodgingCatalogRow {
  id: string;
  store_id: string;
  active?: boolean;
}

export function useLodgingCatalog<T extends { id: string } = LodgingCatalogRow>(
  table: LodgingCatalogTable,
  storeId: string,
) {
  const qc = useQueryClient();
  const queryKey = [table, storeId] as const;

  const list = useQuery({
    queryKey,
    enabled: Boolean(storeId),
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from(table)
        .select("*")
        .eq("store_id", storeId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as T[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (row: Partial<T> & { id?: string }) => {
      const payload = { ...row, store_id: storeId } as any;
      const { data, error } = await (supabase as any)
        .from(table)
        .upsert(payload)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as T;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Saved");
    },
    onError: (err: any) => toast.error(err?.message || "Save failed"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from(table).delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey });
      toast.success("Deleted");
    },
    onError: (err: any) => toast.error(err?.message || "Delete failed"),
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await (supabase as any)
        .from(table)
        .update({ active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey }),
    onError: (err: any) => toast.error(err?.message || "Update failed"),
  });

  return { list, upsert, remove, toggleActive };
}
