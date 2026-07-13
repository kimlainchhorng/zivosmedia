/**
 * useLodgeReports - compute occupancy, ADR, RevPAR client-side.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface LodgeReport {
  occupancyPct: number;
  adrCents: number;
  revparCents: number;
  totalRevenueCents: number;
  nightsSold: number;
  avgLos: number;
  topRoomType: string | null;
  topSource: string | null;
  perRoomType: { name: string; nights: number; revenue: number }[];
  perSource: { source: string; nights: number; revenue: number }[];
}

export function useLodgeReports(storeId: string, fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ["lodge-reports", storeId, fromDate, toDate],
    queryFn: async (): Promise<LodgeReport> => {
      const [{ data: rooms }, { data: reservations }] = await Promise.all([
        supabase.from("lodge_rooms" as any).select("id,name,units_total").eq("store_id", storeId).eq("is_active", true),
        supabase.from("lodge_reservations" as any).select("*").eq("store_id", storeId)
          .gte("check_in", fromDate).lte("check_out", toDate)
          .in("status", ["confirmed", "checked_in", "checked_out"]),
      ]);

      const roomsList: any[] = (rooms as any) || [];
      const reservationsList: any[] = (reservations as any) || [];
      const totalUnits = roomsList.reduce((s: number, r: any) => s + (r.units_total || 1), 0);
      const days = Math.max(1, (new Date(toDate).getTime() - new Date(fromDate).getTime()) / 86400000);
      const availableNights = totalUnits * days;

      let nightsSold = 0;
      let revenue = 0;
      const byRoom: Record<string, { nights: number; revenue: number; name: string }> = {};
      const bySource: Record<string, { nights: number; revenue: number }> = {};

      reservationsList.forEach((r: any) => {
        nightsSold += r.nights || 0;
        revenue += r.total_cents || 0;
        const room = roomsList.find((rm: any) => rm.id === r.room_id);
        const key = room?.name || "Unassigned";
        byRoom[key] = byRoom[key] || { nights: 0, revenue: 0, name: key };
        byRoom[key].nights += r.nights || 0;
        byRoom[key].revenue += r.total_cents || 0;
        const src = r.source || "direct";
        bySource[src] = bySource[src] || { nights: 0, revenue: 0 };
        bySource[src].nights += r.nights || 0;
        bySource[src].revenue += r.total_cents || 0;
      });

      const occupancyPct = availableNights > 0 ? (nightsSold / availableNights) * 100 : 0;
      const adrCents = nightsSold > 0 ? revenue / nightsSold : 0;
      const revparCents = availableNights > 0 ? revenue / availableNights : 0;
      const avgLos = reservationsList.length > 0 ? nightsSold / reservationsList.length : 0;

      const perRoomType = Object.values(byRoom).sort((a, b) => b.revenue - a.revenue);
      const perSource = Object.entries(bySource)
        .map(([source, v]) => ({ source, ...v }))
        .sort((a, b) => b.revenue - a.revenue);

      return {
        occupancyPct,
        adrCents,
        revparCents,
        totalRevenueCents: revenue,
        nightsSold,
        avgLos,
        topRoomType: perRoomType[0]?.name || null,
        topSource: perSource[0]?.source || null,
        perRoomType,
        perSource,
      };
    },
    enabled: !!storeId && !!fromDate && !!toDate,
  });
}
