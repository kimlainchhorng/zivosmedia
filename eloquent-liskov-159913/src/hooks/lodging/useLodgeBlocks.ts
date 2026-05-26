/**
 * useLodgeBlocks - per-date blocks / rate overrides for rooms.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LodgeBlock {
  id: string;
  store_id: string;
  room_id: string;
  block_date: string;
  reason: string;
  rate_override_cents: number | null;
  created_at: string;
}

export function useLodgeBlocks(storeId: string, roomId?: string) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["lodge-blocks", storeId, roomId],
    queryFn: async () => {
      let q = supabase
        .from("lodge_room_blocks" as any)
        .select("*")
        .eq("store_id", storeId);
      if (roomId) q = q.eq("room_id", roomId);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as LodgeBlock[];
    },
    enabled: !!storeId,
  });

  const upsert = useMutation({
    mutationFn: async (b: Partial<LodgeBlock> & { store_id: string; room_id: string; block_date: string }) => {
      const { error } = await supabase.from("lodge_room_blocks" as any).upsert(b as any, { onConflict: "room_id,block_date" });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge-blocks", storeId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lodge_room_blocks" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge-blocks", storeId] }),
  });

  return { ...list, upsert, remove };
}
