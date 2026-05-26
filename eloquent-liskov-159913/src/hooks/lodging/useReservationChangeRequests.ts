/**
 * useReservationChangeRequests — list & mutate change requests for a reservation
 * (guest side) or a store (host inbox).
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ChangeType = "reschedule" | "cancel" | "addon";
export type ChangeStatus = "pending" | "auto_approved" | "approved" | "declined" | "cancelled" | "failed";

export interface ReservationChangeRequest {
  id: string;
  reservation_id: string;
  store_id: string;
  type: ChangeType;
  status: ChangeStatus;
  proposed_check_in: string | null;
  proposed_check_out: string | null;
  proposed_total_cents: number | null;
  price_delta_cents: number;
  refund_cents: number;
  addon_payload: any;
  reason: string | null;
  host_response: string | null;
  requested_by: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
  updated_at: string;
  payment_status?: string | null;
  stripe_payment_intent_id?: string | null;
  applied_at?: string | null;
  reservation?: {
    id: string;
    number: string;
    guest_name: string | null;
    guest_phone: string | null;
    guest_email: string | null;
    check_in: string;
    check_out: string;
    nights: number;
    room_number: string | null;
    total_cents: number;
    paid_cents: number;
    payment_status: string;
    room?: { name: string | null } | null;
  } | null;
}

/** Guest-facing: requests for one reservation. */
export function useReservationChangeRequests(reservationId: string | undefined) {
  return useQuery({
    queryKey: ["lodge-change-requests", reservationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lodge_reservation_change_requests" as any)
        .select("*")
        .eq("reservation_id", reservationId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ReservationChangeRequest[];
    },
    enabled: !!reservationId,
  });
}

/** Host-facing: pending requests across the store. */
export function useStoreChangeRequestInbox(storeId: string | undefined) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["lodge-change-requests-inbox", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lodge_reservation_change_requests" as any)
        .select("*, reservation:lodge_reservations(id, number, guest_name, guest_phone, guest_email, check_in, check_out, nights, room_number, total_cents, paid_cents, payment_status, room:lodge_rooms(name))")
        .eq("store_id", storeId!)
        .in("status", ["pending"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as ReservationChangeRequest[];
    },
    enabled: !!storeId,
  });

  const decide = useMutation({
    mutationFn: async ({ id, action, response }: { id: string; action: "approve" | "decline"; response?: string }) => {
      const { data, error } = await supabase.functions.invoke("approve-lodging-change", {
        body: { change_request_id: id, action, host_response: response },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lodge-change-requests-inbox", storeId] });
      qc.invalidateQueries({ queryKey: ["lodge-reservations", storeId] });
    },
  });

  return { ...list, decide };
}

/** Mutations a guest can run from the trip detail page. */
export function useReservationActions(reservationId: string | undefined) {
  const qc = useQueryClient();

  const requestReschedule = useMutation({
    mutationFn: async (payload: { check_in: string; check_out: string; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke("request-lodging-change", {
        body: { reservation_id: reservationId, type: "reschedule", ...payload },
      });
      if (error) throw error;
      return data as { request_id: string; auto_approved: boolean; price_delta_cents: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lodge-change-requests", reservationId] });
      qc.invalidateQueries({ queryKey: ["lodge-reservation-live", reservationId] });
    },
  });

  const requestCancel = useMutation({
    mutationFn: async (payload: { reason?: string }) => {
      const { data, error } = await supabase.functions.invoke("cancel-lodging-reservation", {
        body: { reservation_id: reservationId, ...payload },
      });
      if (error) throw error;
      return data as { refund_cents: number; refund_percent?: number; refund_label?: string; payment_status?: string; status: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lodge-change-requests", reservationId] });
      qc.invalidateQueries({ queryKey: ["lodge-reservation-live", reservationId] });
    },
  });

  const purchaseAddons = useMutation({
    mutationFn: async (payload: { selections: Array<{ id: string; quantity: number }> }) => {
      const { data, error } = await supabase.functions.invoke("purchase-lodging-addons", {
        body: { reservation_id: reservationId, ...payload },
      });
      if (error) throw error;
      return data as { charged_cents: number; payment_intent_id: string };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lodge-change-requests", reservationId] });
      qc.invalidateQueries({ queryKey: ["lodge-reservation-live", reservationId] });
      qc.invalidateQueries({ queryKey: ["lodge-reservation-full", reservationId] });
    },
  });

  return { requestReschedule, requestCancel, purchaseAddons };
}
