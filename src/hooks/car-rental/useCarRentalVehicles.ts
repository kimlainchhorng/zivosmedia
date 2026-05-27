/**
 * Car-rental fleet (vehicles) CRUD scoped by store.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CarRentalVehicleStatus = "available" | "rented" | "maintenance" | "retired";
export type CarRentalTransmission = "automatic" | "manual";
export type CarRentalFuel = "gasoline" | "diesel" | "hybrid" | "electric";
export type CarRentalCategory =
  | "economy" | "compact" | "standard" | "fullsize"
  | "suv" | "minivan" | "truck" | "luxury" | "convertible" | "sports";

export interface CarRentalVehicle {
  id: string;
  store_id: string;
  home_location_id: string | null;
  make: string;
  model: string;
  year: number | null;
  color: string | null;
  license_plate: string | null;
  vin: string | null;
  category: CarRentalCategory;
  transmission: CarRentalTransmission;
  fuel_type: CarRentalFuel;
  seats: number;
  doors: number;
  luggage_capacity: number;
  air_conditioning: boolean;
  daily_rate_cents: number;
  weekly_rate_cents: number;
  monthly_rate_cents: number;
  hourly_rate_cents: number;
  mileage_limit_per_day: number | null;
  extra_mile_cents: number;
  security_deposit_cents: number;
  photo_url: string | null;
  photo_urls: string[];
  current_odometer: number;
  status: CarRentalVehicleStatus;
  description: string | null;
  features: string[];
  is_active: boolean;
  registration_expires_at: string | null;
  insurance_expires_at: string | null;
  inspection_due_at: string | null;
  registration_number: string | null;
  insurance_provider: string | null;
  insurance_policy_number: string | null;
  created_at: string;
  updated_at: string;
}

export interface CarRentalVehicleDraft {
  make: string;
  model: string;
  year?: number | null;
  color?: string | null;
  license_plate?: string | null;
  vin?: string | null;
  category: CarRentalCategory;
  transmission: CarRentalTransmission;
  fuel_type: CarRentalFuel;
  seats: number;
  doors: number;
  luggage_capacity: number;
  air_conditioning: boolean;
  daily_rate_cents: number;
  weekly_rate_cents?: number;
  monthly_rate_cents?: number;
  hourly_rate_cents?: number;
  mileage_limit_per_day?: number | null;
  extra_mile_cents?: number;
  security_deposit_cents?: number;
  photo_url?: string | null;
  photo_urls?: string[];
  home_location_id?: string | null;
  description?: string | null;
  features?: string[];
  is_active?: boolean;
  registration_expires_at?: string | null;
  insurance_expires_at?: string | null;
  inspection_due_at?: string | null;
  registration_number?: string | null;
  insurance_provider?: string | null;
  insurance_policy_number?: string | null;
}

export function useCarRentalVehicles(storeId: string | undefined) {
  const [vehicles, setVehicles] = useState<CarRentalVehicle[]>([]);
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
      .from("car_rental_vehicles")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (err) {
      console.error("[useCarRentalVehicles] load failed", err);
      setError("Couldn't load fleet.");
      setLoading(false);
      return;
    }
    setVehicles((data ?? []) as unknown as CarRentalVehicle[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: CarRentalVehicleDraft): Promise<CarRentalVehicle | null> => {
    if (!storeId) return null;
    setSaving(true);
    setError(null);
    const payload = {
      store_id: storeId,
      make: draft.make.trim(),
      model: draft.model.trim(),
      year: draft.year ?? null,
      color: draft.color?.trim() || null,
      license_plate: draft.license_plate?.trim() || null,
      vin: draft.vin?.trim() || null,
      category: draft.category,
      transmission: draft.transmission,
      fuel_type: draft.fuel_type,
      seats: draft.seats,
      doors: draft.doors,
      luggage_capacity: draft.luggage_capacity,
      air_conditioning: draft.air_conditioning,
      daily_rate_cents: draft.daily_rate_cents,
      weekly_rate_cents: draft.weekly_rate_cents ?? draft.daily_rate_cents * 6,
      monthly_rate_cents: draft.monthly_rate_cents ?? draft.daily_rate_cents * 25,
      hourly_rate_cents: draft.hourly_rate_cents ?? Math.round(draft.daily_rate_cents / 24),
      mileage_limit_per_day: draft.mileage_limit_per_day ?? null,
      extra_mile_cents: draft.extra_mile_cents ?? 0,
      security_deposit_cents: draft.security_deposit_cents ?? 0,
      photo_url: draft.photo_url ?? null,
      photo_urls: draft.photo_urls ?? [],
      registration_expires_at: draft.registration_expires_at ?? null,
      insurance_expires_at: draft.insurance_expires_at ?? null,
      inspection_due_at: draft.inspection_due_at ?? null,
      registration_number: draft.registration_number?.trim() || null,
      insurance_provider: draft.insurance_provider?.trim() || null,
      insurance_policy_number: draft.insurance_policy_number?.trim() || null,
      home_location_id: draft.home_location_id ?? null,
      description: draft.description?.trim() || null,
      features: draft.features ?? [],
      is_active: draft.is_active ?? true,
    };
    const { data, error: err } = await supabase
      .from("car_rental_vehicles")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useCarRentalVehicles] create failed", err);
      setError("Couldn't add vehicle.");
      setSaving(false);
      return null;
    }
    const created = data as unknown as CarRentalVehicle;
    setVehicles((prev) => [created, ...prev]);
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<CarRentalVehicleDraft & { status: CarRentalVehicleStatus; current_odometer: number }>) => {
    setSaving(true);
    setError(null);
    setVehicles((prev) => prev.map((v) => (v.id === id ? ({ ...v, ...patch } as CarRentalVehicle) : v)));
    const { error: err } = await supabase
      .from("car_rental_vehicles")
      .update(patch as never)
      .eq("id", id);
    if (err) {
      console.error("[useCarRentalVehicles] update failed", err);
      setError("Couldn't save changes — refreshing.");
      await load();
    }
    setSaving(false);
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setSaving(true);
    setError(null);
    const prev = vehicles;
    setVehicles((p) => p.filter((v) => v.id !== id));
    const { error: err } = await supabase.from("car_rental_vehicles").delete().eq("id", id);
    if (err) {
      console.error("[useCarRentalVehicles] delete failed", err);
      setError("Couldn't delete vehicle.");
      setVehicles(prev);
    }
    setSaving(false);
  }, [vehicles]);

  return { vehicles, loading, saving, error, create, update, remove, refresh: load };
}
