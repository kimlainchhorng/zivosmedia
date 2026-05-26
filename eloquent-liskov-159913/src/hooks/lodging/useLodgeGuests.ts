/**
 * useLodgeGuests - guest CRM.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LodgeGuest {
  id: string;
  store_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  country: string | null;
  id_number: string | null;
  vip: boolean;
  notes: string | null;
  total_stays: number;
  lifetime_spend_cents: number;
  last_visit: string | null;
  created_at: string;
}

export function useLodgeGuests(storeId: string) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["lodge-guests", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lodge_guests" as any)
        .select("*")
        .eq("store_id", storeId)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as LodgeGuest[];
    },
    enabled: !!storeId,
  });

  const upsert = useMutation({
    mutationFn: async (g: Partial<LodgeGuest> & { store_id: string; name: string }) => {
      const payload: any = { ...g };
      if (payload.id) {
        const { error } = await supabase.from("lodge_guests" as any).update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lodge_guests" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge-guests", storeId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lodge_guests" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge-guests", storeId] }),
  });

  return { ...list, upsert, remove };
}
