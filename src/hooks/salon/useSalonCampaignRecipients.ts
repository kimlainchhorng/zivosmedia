/**
 * useSalonCampaignRecipients — read-only per-campaign drilldown.
 * Used by the campaign history drawer to show owners exactly which clients
 * received the message, were skipped, or failed.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SalonCampaignRecipientStatus =
  | "pending"
  | "sent"
  | "failed"
  | "skipped_no_contact"
  | "skipped_opt_out"
  | "skipped_blocked";

export interface SalonCampaignRecipient {
  id: string;
  campaign_id: string;
  client_id: string | null;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  status: SalonCampaignRecipientStatus;
  error: string | null;
  sent_at: string | null;
  created_at: string;
}

interface UseResult {
  rows: SalonCampaignRecipient[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useSalonCampaignRecipients(campaignId: string | null): UseResult {
  const [rows, setRows] = useState<SalonCampaignRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!campaignId) { setRows([]); setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("salon_campaign_recipients")
      .select("*")
      .eq("campaign_id", campaignId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (err) {
      console.error("[useSalonCampaignRecipients] load failed", err);
      setError("Couldn't load recipients.");
      setLoading(false);
      return;
    }
    setRows((data ?? []) as unknown as SalonCampaignRecipient[]);
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { void load(); }, [load]);

  return { rows, loading, error, refresh: load };
}
