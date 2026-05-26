/**
 * useLodgeReservationAudit — append-only audit log for reservation status changes.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LodgeReservationAudit {
  id: string;
  reservation_id: string;
  store_id: string;
  from_status: string | null;
  to_status: string;
  note: string | null;
  actor_id: string | null;
  created_at: string;
}

export function useLodgeReservationAudit(reservationId: string | undefined) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["lodge-reservation-audit", reservationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lodge_reservation_audit" as any)
        .select("*")
        .eq("reservation_id", reservationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LodgeReservationAudit[];
    },
    enabled: !!reservationId,
  });

  const append = useMutation({
    mutationFn: async (entry: {
      reservation_id: string;
      store_id: string;
      from_status: string | null;
      to_status: string;
      note?: string | null;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("lodge_reservation_audit" as any).insert({
        ...entry,
        actor_id: user.id,
        note: entry.note || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lodge-reservation-audit", reservationId] });
    },
  });

  return { ...list, append };
}
