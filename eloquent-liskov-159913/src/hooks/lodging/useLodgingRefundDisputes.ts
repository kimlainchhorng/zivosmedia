import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LodgingRefundDispute {
  id: string;
  reservation_id: string;
  store_id: string;
  guest_id: string;
  change_request_id: string | null;
  reason_category: string;
  description: string;
  requested_amount_cents: number;
  status: "pending" | "under_review" | "approved" | "declined" | "paid" | "closed";
  admin_response: string | null;
  resolution_amount_cents: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export function useLodgingRefundDisputes(reservationId: string | undefined) {
  return useQuery({
    queryKey: ["lodge-refund-disputes", reservationId],
    queryFn: async () => {
      const { data, error } = await supabase.from("lodge_refund_disputes" as any).select("*").eq("reservation_id", reservationId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as LodgingRefundDispute[];
    },
    enabled: !!reservationId,
  });
}

export function useSubmitLodgingRefundDispute(reservationId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { reason_category: string; description: string; requested_amount_cents?: number }) => {
      const { data, error } = await supabase.functions.invoke("submit-lodging-refund-dispute", { body: { reservation_id: reservationId, ...payload } });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Could not submit refund request");
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lodge-refund-disputes", reservationId] }),
  });
}
