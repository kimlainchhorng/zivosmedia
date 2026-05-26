/**
 * Car-rental reservations CRUD + realtime.
 * Snapshots vehicle / customer / location labels on insert so historical
 * records survive catalog edits.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CarRentalReservationStatus =
  | "pending"
  | "confirmed"
  | "picked_up"
  | "returned"
  | "cancelled"
  | "no_show";

export interface CarRentalReservation {
  id: string;
  store_id: string;
  vehicle_id: string | null;
  customer_id: string | null;
  pickup_location_id: string | null;
  dropoff_location_id: string | null;

  vehicle_label: string;
  vehicle_category: string | null;
  customer_name: string;
  customer_phone: string | null;
  customer_email: string | null;
  pickup_location_name: string | null;
  dropoff_location_name: string | null;

  pickup_at: string;
  dropoff_at: string;
  rental_days: number;

  daily_rate_cents: number;
  base_total_cents: number;
  addons_total_cents: number;
  insurance_total_cents: number;
  taxes_cents: number;
  fees_cents: number;
  discount_cents: number;
  security_deposit_cents: number;
  total_cents: number;

  deposit_paid_cents: number;
  amount_paid_cents: number;

  pickup_odometer: number | null;
  dropoff_odometer: number | null;
  pickup_fuel_level: number | null;
  dropoff_fuel_level: number | null;
  picked_up_at: string | null;
  returned_at: string | null;

  status: CarRentalReservationStatus;
  source: "walk_in" | "phone" | "app" | "admin";

  customer_notes: string | null;
  internal_notes: string | null;
  damage_notes: string | null;

  cancelled_at: string | null;
  cancellation_reason: string | null;
  refund_amount_cents: number;
  refund_at: string | null;
  refund_method: "original_payment" | "cash" | "store_credit" | "other" | null;

  confirmation_code: string;
  created_at: string;
  updated_at: string;

  payment_status?:
    | "unpaid" | "authorized" | "processing" | "captured" | "paid"
    | "refund_pending" | "refunded" | "failed" | null;
  payment_provider?: string | null;
  stripe_customer_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_balance_payment_intent_id?: string | null;
  stripe_payment_method_id?: string | null;
  stripe_charge_id?: string | null;
  stripe_refund_id?: string | null;
  last_payment_error?: string | null;
  stripe_last_event_at?: string | null;
  stripe_last_event_type?: string | null;
}

export interface CarRentalReservationDraft {
  vehicle_id: string | null;
  customer_id: string | null;
  pickup_location_id: string | null;
  dropoff_location_id: string | null;
  vehicle_label: string;
  vehicle_category?: string | null;
  customer_name: string;
  customer_phone?: string | null;
  customer_email?: string | null;
  pickup_location_name?: string | null;
  dropoff_location_name?: string | null;
  pickup_at: string;
  dropoff_at: string;
  rental_days: number;
  daily_rate_cents: number;
  base_total_cents: number;
  insurance_total_cents?: number;
  taxes_cents?: number;
  fees_cents?: number;
  discount_cents?: number;
  security_deposit_cents?: number;
  total_cents: number;
  status?: CarRentalReservationStatus;
  source?: "walk_in" | "phone" | "app" | "admin";
  customer_notes?: string | null;
  internal_notes?: string | null;
}

interface UseArgs {
  storeId: string | undefined;
  /** Optional ISO date filter for the pickup_at window e.g. "2026-05-24" */
  date?: string;
}

function dayBoundsIso(date: string): { from: string; to: string } {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { from: start.toISOString(), to: end.toISOString() };
}

export function useCarRentalReservations({ storeId, date }: UseArgs) {
  const [reservations, setReservations] = useState<CarRentalReservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    let query = supabase
      .from("car_rental_reservations")
      .select("*")
      .eq("store_id", storeId);
    if (date) {
      const { from, to } = dayBoundsIso(date);
      query = query.gte("pickup_at", from).lt("pickup_at", to);
    }
    const { data, error: err } = await query.order("pickup_at", { ascending: true });
    if (err) {
      console.error("[useCarRentalReservations] load failed", err);
      setError("Couldn't load reservations.");
      setLoading(false);
      return;
    }
    setReservations((data ?? []) as unknown as CarRentalReservation[]);
    setLoading(false);
  }, [storeId, date]);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!storeId) return;
    const channel = supabase
      .channel(`car-rental-reservations:${storeId}:${date ?? "all"}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "car_rental_reservations", filter: `store_id=eq.${storeId}` },
        () => { void load(); }
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [storeId, date, load]);

  const create = useCallback(async (draft: CarRentalReservationDraft): Promise<CarRentalReservation | null> => {
    if (!storeId) return null;
    setSaving(true);
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      store_id: storeId,
      vehicle_id: draft.vehicle_id,
      customer_id: draft.customer_id,
      pickup_location_id: draft.pickup_location_id,
      dropoff_location_id: draft.dropoff_location_id,
      vehicle_label: draft.vehicle_label.trim(),
      vehicle_category: draft.vehicle_category ?? null,
      customer_name: draft.customer_name.trim(),
      customer_phone: draft.customer_phone?.trim() || null,
      customer_email: draft.customer_email?.trim() || null,
      pickup_location_name: draft.pickup_location_name?.trim() || null,
      dropoff_location_name: draft.dropoff_location_name?.trim() || null,
      pickup_at: draft.pickup_at,
      dropoff_at: draft.dropoff_at,
      rental_days: draft.rental_days,
      daily_rate_cents: draft.daily_rate_cents,
      base_total_cents: draft.base_total_cents,
      insurance_total_cents: draft.insurance_total_cents ?? 0,
      taxes_cents: draft.taxes_cents ?? 0,
      fees_cents: draft.fees_cents ?? 0,
      discount_cents: draft.discount_cents ?? 0,
      security_deposit_cents: draft.security_deposit_cents ?? 0,
      total_cents: draft.total_cents,
      status: draft.status ?? "confirmed",
      source: draft.source ?? "admin",
      customer_notes: draft.customer_notes?.trim() || null,
      internal_notes: draft.internal_notes?.trim() || null,
      created_by_user_id: user?.id ?? null,
    };
    const { data, error: err } = await supabase
      .from("car_rental_reservations")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useCarRentalReservations] create failed", err);
      const message = (err as { message?: string }).message ?? "";
      if ((err as any).code === "23P01") {
        setError("That vehicle is already booked for the overlapping time. Pick another vehicle or change the dates.");
      } else if (message.startsWith("CUSTOMER_BLOCKED:")) {
        setError(message.replace(/^CUSTOMER_BLOCKED:\s*/, ""));
      } else {
        setError("Couldn't save reservation.");
      }
      setSaving(false);
      return null;
    }
    const created = data as unknown as CarRentalReservation;
    setReservations((prev) => [...prev, created].sort((a, b) => a.pickup_at.localeCompare(b.pickup_at)));
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<CarRentalReservation>) => {
    setSaving(true);
    setError(null);
    setReservations((prev) => prev.map((r) => (r.id === id ? ({ ...r, ...patch } as CarRentalReservation) : r)));
    const { error: err } = await supabase.from("car_rental_reservations").update(patch as never).eq("id", id);
    if (err) {
      console.error("[useCarRentalReservations] update failed", err);
      const m = (err as { message?: string }).message ?? "";
      if (m.startsWith("CUSTOMER_BLOCKED:")) setError(m.replace(/^CUSTOMER_BLOCKED:\s*/, ""));
      else setError("Couldn't save changes — refreshing.");
      await load();
    }
    setSaving(false);
  }, [load]);

  const changeStatus = useCallback(async (
    id: string,
    status: CarRentalReservationStatus,
    extras?: Partial<CarRentalReservation>
  ) => {
    const patch: Partial<CarRentalReservation> = { status, ...extras };
    if (status === "picked_up" && !extras?.picked_up_at) patch.picked_up_at = new Date().toISOString();
    if (status === "returned" && !extras?.returned_at) patch.returned_at = new Date().toISOString();
    if (status === "cancelled") patch.cancelled_at = new Date().toISOString();
    await update(id, patch);
  }, [update]);

  const remove = useCallback(async (id: string) => {
    setSaving(true);
    setError(null);
    const prev = reservations;
    setReservations((p) => p.filter((r) => r.id !== id));
    const { error: err } = await supabase.from("car_rental_reservations").delete().eq("id", id);
    if (err) {
      console.error("[useCarRentalReservations] delete failed", err);
      setError("Couldn't delete reservation.");
      setReservations(prev);
    }
    setSaving(false);
  }, [reservations]);

  return { reservations, loading, saving, error, create, update, changeStatus, remove, refresh: load };
}
