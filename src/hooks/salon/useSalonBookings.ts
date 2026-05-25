/**
 * Salon bookings CRUD scoped to a date range.
 * Snapshots client/stylist/service display strings on insert so historical
 * records survive catalog edits.
 */
import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export type SalonBookingStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export interface SalonBooking {
  id: string;
  store_id: string;
  client_id: string | null;
  stylist_id: string | null;
  service_id: string | null;
  service_name: string;
  stylist_name: string | null;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  price_cents: number;
  duration_minutes: number;
  start_at: string;
  end_at: string;
  status: SalonBookingStatus;
  source: "walk_in" | "phone" | "app" | "admin";
  tip_cents: number;
  tax_cents: number;
  deposit_cents: number;
  deposit_paid_at: string | null;
  deposit_paid_cents: number;
  referral_source: string | null;
  client_notes: string | null;
  internal_notes: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  no_show_fee_charged_cents: number;
  created_at: string;
  updated_at: string;
}

export interface SalonBookingDraft {
  client_id: string | null;
  stylist_id: string | null;
  service_id: string | null;
  service_name: string;
  stylist_name: string | null;
  client_name: string;
  client_phone: string | null;
  client_email: string | null;
  price_cents: number;
  duration_minutes: number;
  start_at: string; // ISO
  status: SalonBookingStatus;
  source: SalonBooking["source"];
  client_notes: string | null;
  internal_notes: string | null;
  referral_source?: string | null;
}

interface UseSalonBookingsArgs {
  storeId: string | undefined;
  /** Inclusive day boundary, ISO date e.g. "2026-05-24". */
  date: string;
}

interface UseSalonBookingsResult {
  bookings: SalonBooking[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  create: (draft: SalonBookingDraft) => Promise<SalonBooking | null>;
  update: (id: string, patch: Partial<SalonBookingDraft & { tip_cents: number; tax_cents: number }>) => Promise<void>;
  changeStatus: (id: string, status: SalonBookingStatus, opts?: { reason?: string; noShowFeeCents?: number }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

function dayBoundsIso(date: string): { from: string; to: string } {
  // Construct a local-day range as ISO. Browser local timezone is fine here —
  // calendar UI works in the user's tz; storage is timestamptz.
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function useSalonBookings({ storeId, date }: UseSalonBookingsArgs): UseSalonBookingsResult {
  const [bookings, setBookings] = useState<SalonBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const range = useMemo(() => dayBoundsIso(date), [date]);

  const load = useCallback(async () => {
    if (!storeId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("salon_bookings")
      .select("*")
      .eq("store_id", storeId)
      .gte("start_at", range.from)
      .lt("start_at", range.to)
      .order("start_at", { ascending: true });
    if (err) {
      console.error("[useSalonBookings] load failed", err);
      setError("Couldn't load bookings.");
      setLoading(false);
      return;
    }
    setBookings((data ?? []) as unknown as SalonBooking[]);
    setLoading(false);
  }, [storeId, range.from, range.to]);

  useEffect(() => {
    void load();
  }, [load]);

  // Realtime: refresh when any booking for this store changes (covers new
  // public requests, status flips made elsewhere, etc.). Cheap re-fetch.
  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`salon-bookings:${storeId}:${range.from}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "salon_bookings", filter: `store_id=eq.${storeId}` },
        () => { void load(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [storeId, range.from, load]);

  const create = useCallback(async (draft: SalonBookingDraft): Promise<SalonBooking | null> => {
    if (!storeId) return null;
    setSaving(true);
    setError(null);
    const end = new Date(new Date(draft.start_at).getTime() + draft.duration_minutes * 60 * 1000);
    const payload = {
      store_id: storeId,
      client_id: draft.client_id,
      stylist_id: draft.stylist_id,
      service_id: draft.service_id,
      service_name: draft.service_name,
      stylist_name: draft.stylist_name,
      client_name: draft.client_name.trim(),
      client_phone: draft.client_phone?.trim() || null,
      client_email: draft.client_email?.trim() || null,
      price_cents: draft.price_cents,
      duration_minutes: draft.duration_minutes,
      start_at: draft.start_at,
      end_at: end.toISOString(),
      status: draft.status,
      source: draft.source,
      client_notes: draft.client_notes?.trim() || null,
      internal_notes: draft.internal_notes?.trim() || null,
      referral_source: draft.referral_source?.trim() || null,
    };
    const { data, error: err } = await supabase
      .from("salon_bookings")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useSalonBookings] create failed", err);
      if ((err as any).code === "23P01") {
        setError("That time slot is already booked for this stylist. Pick another time.");
      } else {
        setError("Couldn't save booking.");
      }
      setSaving(false);
      return null;
    }
    const created = data as unknown as SalonBooking;
    // Only add to local state if it falls into the visible day.
    if (created.start_at >= range.from && created.start_at < range.to) {
      setBookings((prev) => [...prev, created].sort((a, b) => a.start_at.localeCompare(b.start_at)));
    }
    setSaving(false);
    return created;
  }, [storeId, range.from, range.to]);

  const update = useCallback(async (id: string, patch: Partial<SalonBookingDraft & { tip_cents: number; tax_cents: number; deposit_paid_cents: number; deposit_paid_at: string | null }>) => {
    setSaving(true);
    setError(null);
    const cleanPatch: Record<string, unknown> = {};
    if (patch.client_id !== undefined) cleanPatch.client_id = patch.client_id;
    if (patch.stylist_id !== undefined) cleanPatch.stylist_id = patch.stylist_id;
    if (patch.service_id !== undefined) cleanPatch.service_id = patch.service_id;
    if (patch.service_name !== undefined) cleanPatch.service_name = patch.service_name;
    if (patch.stylist_name !== undefined) cleanPatch.stylist_name = patch.stylist_name;
    if (patch.client_name !== undefined) cleanPatch.client_name = patch.client_name.trim();
    if (patch.client_phone !== undefined) cleanPatch.client_phone = patch.client_phone?.trim() || null;
    if (patch.client_email !== undefined) cleanPatch.client_email = patch.client_email?.trim() || null;
    if (patch.price_cents !== undefined) cleanPatch.price_cents = patch.price_cents;
    if (patch.duration_minutes !== undefined) cleanPatch.duration_minutes = patch.duration_minutes;
    if (patch.start_at !== undefined) cleanPatch.start_at = patch.start_at;
    if (patch.status !== undefined) cleanPatch.status = patch.status;
    if (patch.tip_cents !== undefined) cleanPatch.tip_cents = patch.tip_cents;
    if (patch.tax_cents !== undefined) cleanPatch.tax_cents = patch.tax_cents;
    if (patch.deposit_paid_cents !== undefined) cleanPatch.deposit_paid_cents = patch.deposit_paid_cents;
    if (patch.deposit_paid_at !== undefined) cleanPatch.deposit_paid_at = patch.deposit_paid_at;
    if (patch.client_notes !== undefined) cleanPatch.client_notes = patch.client_notes?.trim() || null;
    if (patch.internal_notes !== undefined) cleanPatch.internal_notes = patch.internal_notes?.trim() || null;
    if (patch.referral_source !== undefined) cleanPatch.referral_source = patch.referral_source?.trim() || null;

    if (patch.start_at !== undefined || patch.duration_minutes !== undefined) {
      const current = bookings.find((b) => b.id === id);
      if (current) {
        const start = new Date(patch.start_at ?? current.start_at);
        const duration = patch.duration_minutes ?? current.duration_minutes;
        cleanPatch.end_at = new Date(start.getTime() + duration * 60 * 1000).toISOString();
      }
    }

    setBookings((prev) =>
      prev.map((b) => (b.id === id ? ({ ...b, ...cleanPatch } as SalonBooking) : b))
    );

    const { error: err } = await supabase
      .from("salon_bookings")
      .update(cleanPatch as never)
      .eq("id", id);
    if (err) {
      console.error("[useSalonBookings] update failed", err);
      if ((err as any).code === "23P01") {
        setError("That time slot is already booked for this stylist.");
      } else {
        setError("Couldn't save changes — refreshing.");
      }
      await load();
    }
    setSaving(false);
  }, [bookings, load]);

  const changeStatus = useCallback(async (
    id: string,
    status: SalonBookingStatus,
    opts?: { reason?: string; noShowFeeCents?: number }
  ) => {
    setSaving(true);
    setError(null);
    const cleanPatch: Record<string, unknown> = { status };
    if (status === "cancelled") {
      cleanPatch.cancelled_at = new Date().toISOString();
      if (opts?.reason) cleanPatch.cancellation_reason = opts.reason;
    }
    if (status === "no_show" && opts?.noShowFeeCents != null) {
      cleanPatch.no_show_fee_charged_cents = opts.noShowFeeCents;
    }
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? ({ ...b, ...cleanPatch } as SalonBooking) : b))
    );
    const { error: err } = await supabase
      .from("salon_bookings")
      .update(cleanPatch as never)
      .eq("id", id);
    if (err) {
      console.error("[useSalonBookings] changeStatus failed", err);
      setError("Couldn't change status — refreshing.");
      await load();
    }
    setSaving(false);
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setSaving(true);
    setError(null);
    const previous = bookings;
    setBookings((prev) => prev.filter((b) => b.id !== id));
    const { error: err } = await supabase
      .from("salon_bookings")
      .delete()
      .eq("id", id);
    if (err) {
      console.error("[useSalonBookings] delete failed", err);
      setError("Couldn't delete booking.");
      setBookings(previous);
    }
    setSaving(false);
  }, [bookings]);

  return { bookings, loading, saving, error, create, update, changeStatus, remove, refresh: load };
}
