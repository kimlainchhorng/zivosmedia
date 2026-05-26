/**
 * useReservationLive subscribes to one reservation and related audit rows.
 * Invalidates relevant queries so timelines, badges, and history refresh live.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LiveReservation {
  id: string;
  status: "hold" | "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";
  payment_status: string | null;
  total_cents: number | null;
  paid_cents: number | null;
  deposit_cents: number | null;
  stripe_payment_intent_id: string | null;
  stripe_session_id: string | null;
  store_id: string;
  room_id: string | null;
  guest_name: string | null;
}

export function useReservationLive(reservationId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["lodge-reservation-live", reservationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lodge_reservations" as any)
        .select("id, status, payment_status, total_cents, paid_cents, deposit_cents, stripe_payment_intent_id, stripe_session_id, store_id, room_id, guest_name")
        .eq("id", reservationId!)
        .maybeSingle();
      if (error) throw error;
      return (data || null) as unknown as LiveReservation | null;
    },
    enabled: !!reservationId,
  });

  useEffect(() => {
    if (!reservationId) return;
    const invalidateReservation = () => {
      qc.invalidateQueries({ queryKey: ["lodge-reservation-live", reservationId] });
      qc.invalidateQueries({ queryKey: ["lodge-reservation-full", reservationId] });
    };
    const channel = supabase
      .channel(`lodge-res-${reservationId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lodge_reservations", filter: `id=eq.${reservationId}` },
        invalidateReservation
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lodge_reservation_change_requests", filter: `reservation_id=eq.${reservationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["lodge-change-requests", reservationId] });
          invalidateReservation();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lodge_reservation_receipts", filter: `reservation_id=eq.${reservationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["lodge-receipt-history", reservationId] });
          invalidateReservation();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lodge_refund_disputes", filter: `reservation_id=eq.${reservationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["lodge-refund-disputes", reservationId] });
          invalidateReservation();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lodge_reservation_audit", filter: `reservation_id=eq.${reservationId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["lodge-reservation-audit", reservationId] });
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [reservationId, qc]);

  return query;
}
