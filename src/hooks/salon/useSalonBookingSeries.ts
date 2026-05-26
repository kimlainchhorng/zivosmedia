/**
 * Manage recurring/standing salon appointments. A series is a row in
 * salon_booking_series; its INSERT trigger materializes the next 12 weeks of
 * occurrences as real salon_bookings rows so the owner's calendar shows
 * concrete slots. Operators: pause, resume, end (with optional cancel-future).
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SalonBookingSeries {
  id: string;
  store_id: string;
  client_id: string | null;
  stylist_id: string | null;
  service_id: string | null;
  anchor_start: string;
  cadence_weeks: number;
  service_name: string;
  price_cents: number;
  duration_minutes: number;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  stylist_name: string | null;
  paused_at: string | null;
  ended_at: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface SalonBookingSeriesDraft {
  client_id: string | null;
  stylist_id: string | null;
  service_id: string | null;
  anchor_start: string;
  cadence_weeks: number;
  service_name: string;
  price_cents: number;
  duration_minutes: number;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  stylist_name: string | null;
  notes: string | null;
}

interface UseSalonBookingSeriesResult {
  series: SalonBookingSeries[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  create: (draft: SalonBookingSeriesDraft) => Promise<SalonBookingSeries | null>;
  pause: (id: string) => Promise<boolean>;
  resume: (id: string) => Promise<boolean>;
  end: (id: string, cancelFuture: boolean) => Promise<number | null>;
  refresh: () => Promise<void>;
}

export function useSalonBookingSeries(storeId: string | undefined): UseSalonBookingSeriesResult {
  const [series, setSeries] = useState<SalonBookingSeries[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("salon_booking_series")
      .select("*")
      .eq("store_id", storeId)
      .order("anchor_start", { ascending: true });
    if (err) {
      console.error("[useSalonBookingSeries] load failed", err);
      setError("Couldn't load standing appointments.");
      setLoading(false);
      return;
    }
    setSeries((data ?? []) as unknown as SalonBookingSeries[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: SalonBookingSeriesDraft): Promise<SalonBookingSeries | null> => {
    if (!storeId) return null;
    setSaving(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    const { data, error: err } = await supabase
      .from("salon_booking_series")
      .insert({
        store_id: storeId,
        ...draft,
        created_by_user_id: user?.id ?? null,
      } as never)
      .select("*")
      .single();
    setSaving(false);
    if (err) {
      console.error("[useSalonBookingSeries] create failed", err);
      setError(err.message);
      return null;
    }
    const row = data as unknown as SalonBookingSeries;
    setSeries((prev) => [...prev, row].sort((a, b) => a.anchor_start.localeCompare(b.anchor_start)));
    return row;
  }, [storeId]);

  const pause = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    const { error: err } = await supabase.rpc("salon_series_pause", { p_id: id } as never);
    setSaving(false);
    if (err) {
      console.error("[useSalonBookingSeries] pause failed", err);
      setError(err.message);
      return false;
    }
    await load();
    return true;
  }, [load]);

  const resume = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    const { error: err } = await supabase.rpc("salon_series_resume", { p_id: id } as never);
    setSaving(false);
    if (err) {
      console.error("[useSalonBookingSeries] resume failed", err);
      setError(err.message);
      return false;
    }
    await load();
    return true;
  }, [load]);

  const end = useCallback(async (id: string, cancelFuture: boolean): Promise<number | null> => {
    setSaving(true);
    const { data, error: err } = await supabase.rpc("salon_series_end", {
      p_id: id,
      p_cancel_future: cancelFuture,
    } as never);
    setSaving(false);
    if (err) {
      console.error("[useSalonBookingSeries] end failed", err);
      setError(err.message);
      return null;
    }
    await load();
    return (data as unknown as number) ?? 0;
  }, [load]);

  return { series, loading, saving, error, create, pause, resume, end, refresh: load };
}
