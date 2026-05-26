/**
 * useRoomConflictCheck — fresh DB query for active overlapping reservations.
 * Returns the actual conflicting rows so the UI can explain WHY Confirm is disabled.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const ACTIVE = ["hold", "confirmed", "checked_in"];

export interface ConflictReservation {
  id: string;
  reference: string | null;
  status: string;
  check_in: string;
  check_out: string;
  guest_first_name: string | null;
}

export interface ConflictResult {
  conflict: boolean;
  rows: ConflictReservation[];
}

const mapRow = (r: any): ConflictReservation => ({
  id: r.id,
  reference: r.number ?? null,
  status: r.status,
  check_in: r.check_in,
  check_out: r.check_out,
  guest_first_name: r.guest_name ? String(r.guest_name).split(/\s+/)[0] : null,
});

export function useRoomConflictCheck(
  roomId: string | undefined,
  checkIn: string,
  checkOut: string,
  enabled: boolean = true,
  excludeReservationId?: string,
) {
  return useQuery<ConflictResult>({
    queryKey: ["room-conflict", roomId, checkIn, checkOut, excludeReservationId],
    queryFn: async () => {
      if (!roomId || !checkIn || !checkOut) return { conflict: false, rows: [] };
      let q = supabase
        .from("lodge_reservations" as any)
        .select("id, number, check_in, check_out, status, guest_name")
        .eq("room_id", roomId)
        .in("status", ACTIVE)
        .lt("check_in", checkOut)
        .gt("check_out", checkIn);
      if (excludeReservationId) q = q.neq("id", excludeReservationId);
      const { data, error } = await q.order("check_in", { ascending: true }).limit(5);
      if (error) throw error;
      const rows = (data || []).map(mapRow);
      return { conflict: rows.length > 0, rows };
    },
    enabled: enabled && !!roomId && !!checkIn && !!checkOut,
    staleTime: 0,
    gcTime: 0,
  });
}

/** One-shot fresh check, used immediately before insert. */
export async function checkRoomConflictNow(
  roomId: string,
  checkIn: string,
  checkOut: string,
): Promise<ConflictResult> {
  const { data, error } = await supabase
    .from("lodge_reservations" as any)
    .select("id, number, check_in, check_out, status, guest_name")
    .eq("room_id", roomId)
    .in("status", ACTIVE)
    .lt("check_in", checkOut)
    .gt("check_out", checkIn)
    .order("check_in", { ascending: true })
    .limit(5);
  if (error) throw error;
  const rows = (data || []).map(mapRow);
  return { conflict: rows.length > 0, rows };
}
