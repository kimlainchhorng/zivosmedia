/**
 * useSalonReminders — read-only list of recent salon_reminders rows for the
 * activity log on SalonRemindersSection. Joins the booking + client snapshot
 * fields needed to render a meaningful row description.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SalonReminderType = "booking_lead" | "birthday" | "winback";
export type SalonReminderStatus = "pending" | "sent" | "cancelled" | "failed";

export interface SalonReminderRow {
  id: string;
  store_id: string;
  client_id: string | null;
  booking_id: string | null;
  reminder_type: SalonReminderType;
  scheduled_for: string;
  status: SalonReminderStatus;
  channel_sms: boolean;
  channel_email: boolean;
  sent_at: string | null;
  error: string | null;
  created_at: string;
  /** Hours-before-appointment lead (only set on booking_lead rows). */
  lead_minutes: number | null;
  // Joined for display — may be null when client/booking has been deleted.
  client_name: string | null;
  service_name: string | null;
}

interface UseResult {
  rows: SalonReminderRow[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Count of pending reminders due within the next 24h — drives the sidebar badge. */
  pendingTodayCount: number;
}

export function useSalonReminders(storeId: string | undefined): UseResult {
  const [rows, setRows] = useState<SalonReminderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingTodayCount, setPendingTodayCount] = useState(0);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true); setError(null);

    // Pull the 50 most recent reminders + join the booking and client
    // snapshots needed to render each row.
    const { data, error: err } = await supabase
      .from("salon_reminders")
      .select(`
        id, store_id, client_id, booking_id, reminder_type, scheduled_for,
        status, channel_sms, channel_email, sent_at, error, created_at, lead_minutes,
        salon_clients ( display_name ),
        salon_bookings ( client_name, service_name )
      `)
      .eq("store_id", storeId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (err) {
      console.error("[useSalonReminders] load failed", err);
      setError("Couldn't load reminder history.");
      setLoading(false);
      return;
    }
    const mapped: SalonReminderRow[] = ((data ?? []) as any[]).map((r) => ({
      id: r.id,
      store_id: r.store_id,
      client_id: r.client_id,
      booking_id: r.booking_id,
      reminder_type: r.reminder_type,
      scheduled_for: r.scheduled_for,
      status: r.status,
      channel_sms: r.channel_sms,
      channel_email: r.channel_email,
      sent_at: r.sent_at,
      error: r.error,
      created_at: r.created_at,
      lead_minutes: r.lead_minutes ?? null,
      client_name: r.salon_clients?.display_name ?? r.salon_bookings?.client_name ?? null,
      service_name: r.salon_bookings?.service_name ?? null,
    }));
    setRows(mapped);
    setLoading(false);

    // Separate light query for the sidebar badge — counts pending reminders
    // due in the next 24h. Cheap enough to do alongside the main load.
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("salon_reminders")
      .select("id", { count: "exact", head: true })
      .eq("store_id", storeId)
      .eq("status", "pending")
      .lte("scheduled_for", tomorrow);
    setPendingTodayCount(count ?? 0);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  return { rows, loading, error, refresh: load, pendingTodayCount };
}
