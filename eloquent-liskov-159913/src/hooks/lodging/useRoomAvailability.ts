/**
 * useRoomAvailability — merge manual blocks + active reservations into a per-date map.
 * Returns a Map<dateISO, { unavailable, reason }> + a disabledDates array for shadcn Calendar.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, addMonths, addDays } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export type AvailabilityReason = "sold_out" | "restricted" | "past";

export interface DayAvailability {
  unavailable: boolean;
  reason: AvailabilityReason;
}

const ACTIVE_STATUSES = ["hold", "confirmed", "checked_in", "checked_out"];

export function useRoomAvailability(roomId: string | undefined, monthsAhead = 6) {
  const horizon = useMemo(() => addMonths(new Date(), monthsAhead), [monthsAhead]);

  const blocksQ = useQuery({
    queryKey: ["room-blocks", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lodge_room_blocks" as any)
        .select("block_date, reason")
        .eq("room_id", roomId!);
      if (error) throw error;
      return (data || []) as unknown as { block_date: string; reason: string | null }[];
    },
    enabled: !!roomId,
  });

  const resQ = useQuery({
    queryKey: ["room-active-reservations", roomId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lodge_reservations" as any)
        .select("check_in, check_out, status")
        .eq("room_id", roomId!)
        .in("status", ACTIVE_STATUSES)
        .gte("check_out", format(new Date(), "yyyy-MM-dd"))
        .lte("check_in", format(horizon, "yyyy-MM-dd"));
      if (error) throw error;
      return (data || []) as unknown as { check_in: string; check_out: string; status: string }[];
    },
    enabled: !!roomId,
  });

  const { availabilityMap, disabledDates } = useMemo(() => {
    const map = new Map<string, DayAvailability>();
    const disabled: Date[] = [];

    (blocksQ.data || []).forEach((b) => {
      map.set(b.block_date, { unavailable: true, reason: "restricted" });
      disabled.push(new Date(b.block_date));
    });

    (resQ.data || []).forEach((r) => {
      const start = new Date(r.check_in);
      const end = new Date(r.check_out); // exclusive
      for (let d = start; d < end; d = addDays(d, 1)) {
        const iso = format(d, "yyyy-MM-dd");
        if (!map.has(iso)) {
          map.set(iso, { unavailable: true, reason: "sold_out" });
          disabled.push(new Date(d));
        }
      }
    });

    return { availabilityMap: map, disabledDates: disabled };
  }, [blocksQ.data, resQ.data]);

  return {
    availabilityMap,
    disabledDates,
    isLoading: blocksQ.isLoading || resQ.isLoading,
  };
}

/** Returns true if any night in [checkIn, checkOut) is unavailable. */
export function hasUnavailableNight(
  map: Map<string, DayAvailability>,
  checkIn: string,
  checkOut: string,
): { invalid: boolean; firstReason?: AvailabilityReason } {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  for (let d = start; d < end; d = addDays(d, 1)) {
    const iso = format(d, "yyyy-MM-dd");
    const hit = map.get(iso);
    if (hit?.unavailable) return { invalid: true, firstReason: hit.reason };
  }
  return { invalid: false };
}
