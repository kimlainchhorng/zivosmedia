/**
 * useLodgeMaintenance - hotel-side maintenance/repair tickets.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MaintenanceStatus = "open" | "in_progress" | "blocked" | "done";
export type MaintenancePriority = "low" | "normal" | "high" | "urgent";

export interface LodgeMaintenance {
  id: string;
  store_id: string;
  room_id: string | null;
  room_number: string | null;
  title: string;
  category: string | null;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  assignee_id: string | null;
  assignee_name: string | null;
  reported_by: string | null;
  notes: string | null;
  photos: any[];
  cost_cents: number;
  reported_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useLodgeMaintenance(storeId: string) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["lodge-maintenance", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lodge_maintenance" as any)
        .select("*")
        .eq("store_id", storeId)
        .order("reported_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LodgeMaintenance[];
    },
    enabled: !!storeId,
  });

  const upsert = useMutation({
    mutationFn: async (t: Partial<LodgeMaintenance> & { store_id: string; title: string }) => {
      const payload: any = { ...t };
      if (payload.id) {
        const { error } = await supabase.from("lodge_maintenance" as any).update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lodge_maintenance" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge-maintenance", storeId] }),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: MaintenanceStatus }) => {
      const update: any = { status };
      if (status === "done") update.resolved_at = new Date().toISOString();
      const { error } = await supabase.from("lodge_maintenance" as any).update(update).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge-maintenance", storeId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lodge_maintenance" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge-maintenance", storeId] }),
  });

  return { ...list, upsert, setStatus, remove };
}
