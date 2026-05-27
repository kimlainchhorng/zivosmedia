/**
 * useLodgeReservations - CRUD for lodge_reservations.
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ReservationStatus =
  | "hold" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";

export interface LodgeReservation {
  id: string;
  store_id: string;
  room_id: string | null;
  guest_id: string | null;
  number: string;
  guest_name: string | null;
  guest_phone: string | null;
  guest_email: string | null;
  guest_country: string | null;
  adults: number;
  children: number;
  check_in: string;
  check_out: string;
  nights: number;
  room_number: string | null;
  status: ReservationStatus;
  source: string;
  rate_cents: number;
  extras_cents: number;
  tax_cents: number;
  total_cents: number;
  paid_cents: number;
  payment_status: string;
  notes: string | null;
  signature_url: string | null;
  id_photo_url: string | null;
  room?: { check_in_time: string | null; check_out_time: string | null } | null;
  created_at: string;
  updated_at: string;
}

export function useLodgeReservations(storeId: string, status?: ReservationStatus | "all") {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["lodge-reservations", storeId, status],
    queryFn: async () => {
      let q = supabase
        .from("lodge_reservations" as any)
        .select("*, room:lodge_rooms(check_in_time, check_out_time)")
        .eq("store_id", storeId)
        .order("check_in", { ascending: false });
      if (status && status !== "all") q = q.eq("status", status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as unknown as LodgeReservation[];
    },
    enabled: !!storeId,
  });

  const upsert = useMutation({
    mutationFn: async (r: Partial<LodgeReservation> & { store_id: string; check_in: string; check_out: string; number?: string }) => {
      const payload: any = { ...r };
      if (!payload.number) payload.number = `RES-${Date.now().toString().slice(-6)}`;
      if (payload.id) {
        const { error } = await supabase.from("lodge_reservations" as any).update(payload).eq("id", payload.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("lodge_reservations" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge-reservations", storeId] }),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: ReservationStatus }) => {
      const { error } = await supabase.from("lodge_reservations" as any).update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge-reservations", storeId] }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lodge_reservations" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge-reservations", storeId] }),
  });

  return { ...list, upsert, setStatus, remove };
}
