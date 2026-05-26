import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LodgingNotificationAuditItem {
  id: string;
  channel: string;
  event_type: string | null;
  status: string;
  destination_masked: string | null;
  provider_id: string | null;
  skip_reason: string | null;
  error: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

const isPermissionError = (error: { code?: string; message?: string } | null) => {
  const message = String(error?.message || "").toLowerCase();
  return error?.code === "42501" || message.includes("permission") || message.includes("row-level security") || message.includes("rls");
};

export function useLodgingNotificationAudit(reservationId: string | undefined, channel = "sms") {
  return useQuery({
    queryKey: ["lodging-notification-audit", reservationId, channel],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_audit" as any)
        .select("id, channel, event_type, status, destination_masked, provider_id, skip_reason, error, metadata, created_at")
        .eq("channel", channel)
        .filter("metadata->>reservation_id", "eq", reservationId!)
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) {
        if (isPermissionError(error)) return [] as LodgingNotificationAuditItem[];
        throw error;
      }
      return (data || []) as unknown as LodgingNotificationAuditItem[];
    },
    enabled: !!reservationId,
    retry: (failureCount, error: any) => !isPermissionError(error) && failureCount < 2,
  });
}