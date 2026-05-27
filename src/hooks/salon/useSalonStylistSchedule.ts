/**
 * Fetch a stylist's weekly schedule. Cached in-component; lightweight.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface DaySchedule {
  day_of_week: number;
  is_working: boolean;
  start_time: string | null;
  end_time: string | null;
}

export function useSalonStylistSchedule(stylistId: string | null | undefined) {
  const [schedule, setSchedule] = useState<DaySchedule[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!stylistId) {
      setSchedule([]);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("salon_stylist_schedules")
        .select("day_of_week, is_working, start_time, end_time")
        .eq("stylist_id", stylistId);
      if (cancelled) return;
      if (error) {
        console.error("[useSalonStylistSchedule] load failed", error);
        setLoading(false);
        return;
      }
      setSchedule((data ?? []) as unknown as DaySchedule[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [stylistId]);

  return { schedule, loading };
}

/**
 * Returns null if the slot is inside the stylist's working window for that
 * day, or a human-readable description of the problem if it's outside.
 */
export function describeScheduleConflict(
  schedule: DaySchedule[],
  date: string, // YYYY-MM-DD
  startTime: string, // HH:MM (24h)
  durationMinutes: number,
): string | null {
  if (schedule.length === 0) return null; // No schedule defined → don't warn.
  const target = new Date(`${date}T${startTime}:00`);
  const end = new Date(target.getTime() + durationMinutes * 60 * 1000);
  const dow = target.getDay();
  const row = schedule.find((s) => s.day_of_week === dow);
  if (!row) return null;
  if (!row.is_working) {
    return `Stylist is off on ${target.toLocaleDateString(undefined, { weekday: "long" })}.`;
  }
  if (!row.start_time || !row.end_time) return null;
  const [sh, sm] = row.start_time.split(":").map(Number);
  const [eh, em] = row.end_time.split(":").map(Number);
  const windowStart = new Date(target); windowStart.setHours(sh, sm, 0, 0);
  const windowEnd = new Date(target); windowEnd.setHours(eh, em, 0, 0);
  const fmt = (d: Date) => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (target < windowStart) {
    return `Stylist starts at ${fmt(windowStart)} on this day.`;
  }
  if (end > windowEnd) {
    return `Appointment ends at ${fmt(end)} but stylist finishes at ${fmt(windowEnd)}.`;
  }
  return null;
}
