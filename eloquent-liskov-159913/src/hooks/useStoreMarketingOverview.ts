/**
 * useStoreMarketingOverview — Single parallel fetch for the Marketing tab.
 * Returns aggregate stats, channel status, recent campaigns, segments, templates.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MarketingStats {
  sent: { current: number; previous: number };
  delivered: { current: number; previous: number };
  opened: { current: number; previous: number };
  clicked: { current: number; previous: number };
  conversions: { current: number; previous: number };
  revenue_cents: { current: number; previous: number };
}

export interface ChannelStatus {
  channel: "push" | "email" | "sms" | "inapp";
  status: "configured" | "needs_setup" | "disabled";
  last_sent_at: string | null;
  volume_7d: number[];
}

export interface MarketingCampaignSummary {
  id: string;
  name: string;
  status: string;
  channel?: string;
  audience_size?: number;
  open_rate?: number;
  click_rate?: number;
  sparkline?: number[];
  created_at: string;
  start_date?: string | null;
  end_date?: string | null;
}

const empty7 = () => Array(7).fill(0);

function delta(arr: { event_type: string; created_at: string }[], type: string, days: number) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return arr.filter((e) => e.event_type === type && new Date(e.created_at).getTime() >= cutoff).length;
}

function deltaRev(arr: { event_type: string; created_at: string; revenue_cents: number }[], days: number) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return arr
    .filter((e) => e.event_type === "converted" && new Date(e.created_at).getTime() >= cutoff)
    .reduce((sum, e) => sum + (e.revenue_cents || 0), 0);
}

export function useStoreMarketingOverview(storeId: string | undefined) {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["store-marketing-overview", storeId],
    enabled: !!storeId,
    staleTime: 1000 * 30,
    queryFn: async () => {
      if (!storeId) throw new Error("No store");
      const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

      const [eventsRes, campaignsRes, segmentsRes, templatesRes] = await Promise.all([
        supabase
          .from("marketing_campaign_events" as any)
          .select("event_type, channel, created_at, revenue_cents")
          .eq("store_id", storeId)
          .gte("created_at", since14)
          .order("created_at", { ascending: false })
          .limit(5000),
        supabase
          .from("ad_campaigns")
          .select("id, name, status, platform, created_at, total_spend_cents, conversions")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("marketing_segments" as any)
          .select("id, name, member_count, last_refreshed_at")
          .eq("store_id", storeId)
          .order("created_at", { ascending: false }),
        supabase
          .from("marketing_templates" as any)
          .select("id, name, channel, usage_count, last_used_at")
          .eq("store_id", storeId)
          .order("created_at", { ascending: false }),
      ]);

      const events = ((eventsRes.data as any) || []) as any[];

      const stats: MarketingStats = {
        sent: { current: delta(events, "sent", 7), previous: delta(events, "sent", 14) - delta(events, "sent", 7) },
        delivered: { current: delta(events, "delivered", 7), previous: delta(events, "delivered", 14) - delta(events, "delivered", 7) },
        opened: { current: delta(events, "opened", 7), previous: delta(events, "opened", 14) - delta(events, "opened", 7) },
        clicked: { current: delta(events, "clicked", 7), previous: delta(events, "clicked", 14) - delta(events, "clicked", 7) },
        conversions: { current: delta(events, "converted", 7), previous: delta(events, "converted", 14) - delta(events, "converted", 7) },
        revenue_cents: { current: deltaRev(events, 7), previous: deltaRev(events, 14) - deltaRev(events, 7) },
      };

      const channelLastSent = (ch: string) => {
        const ev = events.find((e) => e.channel === ch && e.event_type === "sent");
        return ev?.created_at || null;
      };
      const channelVolume = (ch: string) => {
        const arr = empty7();
        events.forEach((e) => {
          if (e.channel !== ch || e.event_type !== "sent") return;
          const days = Math.floor((Date.now() - new Date(e.created_at).getTime()) / (24 * 60 * 60 * 1000));
          if (days >= 0 && days < 7) arr[6 - days] += 1;
        });
        return arr;
      };

      const channels: ChannelStatus[] = (["push", "email", "sms", "inapp"] as const).map((c) => ({
        channel: c,
        status: channelLastSent(c) ? "configured" : "needs_setup",
        last_sent_at: channelLastSent(c),
        volume_7d: channelVolume(c),
      }));

      const campaigns: MarketingCampaignSummary[] = ((campaignsRes.data as any[]) || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        channel: c.platform,
        created_at: c.created_at,
        sparkline: empty7(),
        audience_size: 0,
        open_rate: 0,
        click_rate: 0,
      }));

      return {
        stats,
        channels,
        campaigns,
        segments: ((segmentsRes.data as any[]) || []),
        templates: ((templatesRes.data as any[]) || []),
        rawEvents: events,
      };
    },
  });

  // Realtime: invalidate on new marketing events
  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`marketing-overview-${storeId}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "marketing_campaign_events", filter: `store_id=eq.${storeId}` },
        () => qc.invalidateQueries({ queryKey: ["store-marketing-overview", storeId] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, qc]);

  return {
    ...query,
    invalidate: () => qc.invalidateQueries({ queryKey: ["store-marketing-overview", storeId] }),
  };
}
