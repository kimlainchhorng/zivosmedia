/**
 * useLodgingSidebarBadges - lightweight head counts to power sidebar badges.
 * Single hook so we never fan out duplicate count queries.
 * Subscribes to Supabase Realtime to invalidate on insert/update/delete.
 */
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export interface LodgingSidebarBadges {
  inboxUnread: number;
  conciergeOpen: number;
  lostFoundUnclaimed: number;
  frontDeskToday: number;
}

const ZERO: LodgingSidebarBadges = { inboxUnread: 0, conciergeOpen: 0, lostFoundUnclaimed: 0, frontDeskToday: 0 };

const REALTIME_TABLES = ["lodging_messages", "lodging_concierge_tasks", "lodging_lost_found", "lodge_reservations"] as const;

export function useLodgingSidebarBadges(storeId?: string, enabled = true) {
  const qc = useQueryClient();
  const queryKey = ["lodging-sidebar-badges", storeId];

  // Realtime: invalidate when any of the 4 source tables change for this store
  useEffect(() => {
    if (!storeId || !enabled) return;
    const channels = REALTIME_TABLES.map((table) => {
      return supabase
        .channel(`lodging-badges-${table}-${storeId}-${crypto.randomUUID()}`)
        .on("postgres_changes", { event: "*", schema: "public", table, filter: `store_id=eq.${storeId}` }, () => {
          qc.invalidateQueries({ queryKey });
        })
        .subscribe();
    });
    return () => { channels.forEach((c) => { try { supabase.removeChannel(c); } catch {} }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId, enabled]);

  return useQuery<LodgingSidebarBadges>({
    queryKey,
    enabled: Boolean(storeId) && enabled,
    staleTime: 60 * 1000,
    queryFn: async () => {
      if (!storeId) return ZERO;
      // Cambodia-local day (UTC+7, no DST). toISOString().slice(0,10) is the UTC day,
      // which reads as yesterday before 07:00 ICT — the badge would then count
      // yesterday's arrivals/departures and miss today's, since check_in / check_out
      // are stored as local calendar dates (exactly the early-morning window when
      // night-shift staff handle check-ins/outs).
      const today = format(new Date(), "yyyy-MM-dd");
      const tomorrow = format(new Date(Date.now() + 86400000), "yyyy-MM-dd");

      const headCount = async (table: string, build: (q: any) => any) => {
        try {
          let q: any = (supabase as any).from(table).select("id", { count: "exact", head: true }).eq("store_id", storeId);
          q = build(q);
          const { count } = await q;
          return count || 0;
        } catch {
          return 0;
        }
      };

      const [inboxUnread, conciergeOpen, lostFoundUnclaimed, arrivals, departures] = await Promise.all([
        headCount("lodging_messages", (q) => q.eq("sender_role", "guest").is("read_at", null)),
        headCount("lodging_concierge_tasks", (q) => q.in("status", ["open", "in_progress"])),
        headCount("lodging_lost_found", (q) => q.eq("status", "found")),
        headCount("lodge_reservations", (q) => q.gte("check_in", today).lt("check_in", tomorrow).in("status", ["confirmed", "checked_in"])),
        headCount("lodge_reservations", (q) => q.gte("check_out", today).lt("check_out", tomorrow).in("status", ["checked_in", "checked_out"])),
      ]);

      return {
        inboxUnread,
        conciergeOpen,
        lostFoundUnclaimed,
        frontDeskToday: arrivals + departures,
      };
    },
  });
}
