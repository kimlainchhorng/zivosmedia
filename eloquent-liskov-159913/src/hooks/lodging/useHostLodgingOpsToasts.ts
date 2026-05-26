import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function useHostLodgingOpsToasts(storeId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`host-lodging-ops-${storeId}-${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "lodge_reservations", filter: `store_id=eq.${storeId}` }, (payload) => {
        const row = (payload.new || payload.old) as any;
        qc.invalidateQueries({ queryKey: ["lodge-reservations", storeId] });
        if (payload.eventType === "UPDATE") {
          if (row?.payment_status === "failed") toast.error("Lodging payment failed", { description: row.number });
          if (row?.status === "cancelled") toast("Reservation cancelled", { description: row.number });
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "lodge_reservation_change_requests", filter: `store_id=eq.${storeId}` }, (payload) => {
        const row = (payload.new || payload.old) as any;
        qc.invalidateQueries({ queryKey: ["lodge-change-requests-inbox", storeId] });
        qc.invalidateQueries({ queryKey: ["lodge-reservations", storeId] });
        if (payload.eventType === "INSERT" && row?.status === "pending") toast("New guest request", { description: String(row.type || "request").replace(/_/g, " ") });
        if (row?.type === "addon" && row?.status === "failed") toast.error("Add-on charge failed", { description: row.addon_payload?.failure_reason || "Saved card was not charged." });
        if (row?.type === "addon" && ["auto_approved", "approved"].includes(row?.status)) toast.success("Add-on charged", { description: "Reservation total was updated." });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "lodge_refund_disputes", filter: `store_id=eq.${storeId}` }, (payload) => {
        const row = (payload.new || payload.old) as any;
        qc.invalidateQueries({ queryKey: ["lodge-refund-disputes"] });
        qc.invalidateQueries({ queryKey: ["lodge-reservations", storeId] });
        if (payload.eventType === "INSERT") toast("New refund dispute", { description: row?.reason_category });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [storeId, qc]);
}