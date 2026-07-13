/**
 * useStoreCampaigns — the store's own marketing campaigns (the ones created by the
 * "New campaign" wizard and sent via send-marketing-campaign), read from
 * `marketing_campaigns` by target_restaurant_id. Each campaign is enriched with
 * live delivery counts aggregated from `marketing_campaign_events` so the history
 * list can show real "sent / opened / clicked" numbers — this is the surface the
 * "Campaign sending" toast points to.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface StoreCampaignStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
  recipients: number;
}

export interface StoreCampaign {
  id: string;
  name: string;
  status: string;
  campaignType: string;
  channels: ("push" | "email" | "sms" | "inapp")[];
  audienceLabel: string;
  subject: string | null;
  body: string | null;
  createdAt: string | null;
  scheduledAt: string | null;
  sentAt: string | null;
  isRecurring: boolean;
  recurrenceInterval: string | null;
  triggerType: string | null;
  stats: StoreCampaignStats;
}

function deriveChannels(c: any): StoreCampaign["channels"] {
  const out: StoreCampaign["channels"] = [];
  if (c.push_enabled) out.push("push");
  if (c.email_enabled) out.push("email");
  if (c.sms_enabled) out.push("sms");
  if (c.campaign_type === "inapp") out.push("inapp");
  if (!out.length) out.push("push");
  return out;
}

export function useStoreCampaigns(storeId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["store-campaigns", storeId],
    enabled: !!storeId,
    staleTime: 1000 * 20,
    queryFn: async (): Promise<StoreCampaign[]> => {
      if (!storeId) return [];

      const [campaignsRes, segmentsRes, eventsRes] = await Promise.all([
        supabase
          .from("marketing_campaigns")
          .select(
            "id, name, status, campaign_type, push_enabled, email_enabled, sms_enabled, " +
              "notification_title, notification_body, title, message, target_segment_id, " +
              "target_city, target_audience, start_date, next_run_at, sent_at, created_at, " +
              "is_recurring, recurrence_interval, trigger_type",
          )
          .eq("target_restaurant_id", storeId)
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("marketing_segments" as any)
          .select("id, name")
          .eq("store_id", storeId),
        supabase
          .from("marketing_campaign_events" as any)
          .select("campaign_id, event_type, user_id")
          .eq("store_id", storeId)
          .gte("created_at", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())
          .limit(20000),
      ]);

      if (campaignsRes.error) throw campaignsRes.error;

      const segmentName = new Map<string, string>(
        ((segmentsRes.data as any[]) || []).map((s: any) => [s.id, s.name]),
      );

      // Aggregate per-campaign delivery counts + distinct recipients from events.
      const agg = new Map<string, StoreCampaignStats & { _recipients: Set<string> }>();
      for (const e of ((eventsRes.data as any[]) || [])) {
        const cid = e.campaign_id as string;
        if (!cid) continue;
        let row = agg.get(cid);
        if (!row) {
          row = { sent: 0, delivered: 0, opened: 0, clicked: 0, failed: 0, recipients: 0, _recipients: new Set() };
          agg.set(cid, row);
        }
        if (e.user_id) row._recipients.add(e.user_id);
        switch (e.event_type) {
          case "sent": row.sent++; break;
          case "delivered": row.delivered++; break;
          case "opened": row.opened++; break;
          case "clicked": row.clicked++; break;
          case "failed": row.failed++; break;
        }
      }

      return ((campaignsRes.data as any[]) || []).map((c: any): StoreCampaign => {
        const a = agg.get(c.id);
        const audienceLabel = c.target_segment_id
          ? segmentName.get(c.target_segment_id) || "Saved segment"
          : c.target_city
          ? c.target_city
          : c.target_audience
          ? c.target_audience
          : "All customers";
        return {
          id: c.id,
          name: c.name,
          status: c.status || "draft",
          campaignType: c.campaign_type || "broadcast",
          channels: deriveChannels(c),
          audienceLabel,
          subject: c.notification_title || c.title || null,
          body: c.notification_body || c.message || null,
          createdAt: c.created_at,
          scheduledAt: c.start_date || c.next_run_at || null,
          sentAt: c.sent_at,
          isRecurring: !!c.is_recurring,
          recurrenceInterval: c.recurrence_interval,
          triggerType: c.trigger_type,
          stats: {
            sent: a?.sent || 0,
            delivered: a?.delivered || 0,
            opened: a?.opened || 0,
            clicked: a?.clicked || 0,
            failed: a?.failed || 0,
            recipients: a?._recipients.size || 0,
          },
        };
      });
    },
  });

  // Realtime: refresh when new campaigns are inserted/updated or events land.
  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`store-campaigns-${storeId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketing_campaigns", filter: `target_restaurant_id=eq.${storeId}` },
        () => qc.invalidateQueries({ queryKey: ["store-campaigns", storeId] }),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketing_campaign_events", filter: `store_id=eq.${storeId}` },
        () => qc.invalidateQueries({ queryKey: ["store-campaigns", storeId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, qc]);

  return query;
}
