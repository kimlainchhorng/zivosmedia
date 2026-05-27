/**
 * useLodgeHousekeeping - per-room status board.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type HousekeepingStatus = "clean" | "dirty" | "in_progress" | "inspected" | "out_of_service";

export interface LodgeHousekeeping {
  id: string;
  store_id: string;
  room_id: string;
  room_number: string | null;
  status: HousekeepingStatus;
  assignee_id: string | null;
  notes: string | null;
  last_cleaned_at: string | null;
  updated_at: string;
}

export function useLodgeHousekeeping(storeId: string) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["lodge-housekeeping", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lodge_housekeeping" as any)
        .select("*")
        .eq("store_id", storeId)
        .order("room_number", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as LodgeHousekeeping[];
    },
    enabled: !!storeId,
  });

  const upsert = useMutation({
    mutationFn: async (h: Partial<LodgeHousekeeping> & { store_id: string; room_id: string }) => {
      const payload: any = { ...h };
      if (payload.id) {
        const { error } = await supabase.from("lodge_housekeeping" as any).update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lodge_housekeeping" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge-housekeeping", storeId] }),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: HousekeepingStatus }) => {
      const update: any = { status };
      if (status === "clean" || status === "inspected") update.last_cleaned_at = new Date().toISOString();
      const { error } = await supabase.from("lodge_housekeeping" as any).update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge-housekeeping", storeId] }),
  });

  return { ...list, upsert, setStatus };
}
