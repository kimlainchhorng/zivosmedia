/**
 * Maintenance log CRUD for the car-rental module.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type CarRentalMaintenanceServiceType =
  | "oil_change" | "tire_rotation" | "tire_replacement" | "brake_service"
  | "battery" | "inspection" | "cleaning" | "detailing" | "body_work"
  | "engine" | "transmission" | "recall" | "other";

export interface CarRentalMaintenance {
  id: string;
  store_id: string;
  vehicle_id: string;
  service_type: CarRentalMaintenanceServiceType;
  description: string;
  notes: string | null;
  cost_cents: number;
  shop: string | null;
  odometer: number | null;
  service_date: string;
  next_service_due_date: string | null;
  next_service_due_odometer: number | null;
  took_vehicle_offline: boolean;
  created_at: string;
  updated_at: string;
}

export interface CarRentalMaintenanceDraft {
  vehicle_id: string;
  service_type: CarRentalMaintenanceServiceType;
  description: string;
  notes?: string | null;
  cost_cents: number;
  shop?: string | null;
  odometer?: number | null;
  service_date: string;
  next_service_due_date?: string | null;
  next_service_due_odometer?: number | null;
  took_vehicle_offline?: boolean;
}

export function useCarRentalMaintenance(storeId: string | undefined) {
  const [records, setRecords] = useState<CarRentalMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    const { data, error: err } = await supabase
      .from("car_rental_maintenance")
      .select("*")
      .eq("store_id", storeId)
      .order("service_date", { ascending: false });
    if (err) {
      console.error("[useCarRentalMaintenance] load failed", err);
      setError("Couldn't load maintenance log.");
      setLoading(false);
      return;
    }
    setRecords((data ?? []) as unknown as CarRentalMaintenance[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: CarRentalMaintenanceDraft): Promise<CarRentalMaintenance | null> => {
    if (!storeId) return null;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const payload = {
      store_id: storeId,
      vehicle_id: draft.vehicle_id,
      service_type: draft.service_type,
      description: draft.description.trim(),
      notes: draft.notes?.trim() || null,
      cost_cents: draft.cost_cents,
      shop: draft.shop?.trim() || null,
      odometer: draft.odometer ?? null,
      service_date: draft.service_date,
      next_service_due_date: draft.next_service_due_date ?? null,
      next_service_due_odometer: draft.next_service_due_odometer ?? null,
      took_vehicle_offline: draft.took_vehicle_offline ?? false,
      created_by_user_id: user?.id ?? null,
    };
    const { data, error: err } = await supabase
      .from("car_rental_maintenance")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useCarRentalMaintenance] create failed", err);
      setError("Couldn't add maintenance record.");
      setSaving(false);
      return null;
    }
    const created = data as unknown as CarRentalMaintenance;
    setRecords((prev) => [created, ...prev]);
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<CarRentalMaintenanceDraft>) => {
    setSaving(true);
    setRecords((prev) => prev.map((r) => (r.id === id ? ({ ...r, ...patch } as CarRentalMaintenance) : r)));
    const { error: err } = await supabase.from("car_rental_maintenance").update(patch as never).eq("id", id);
    if (err) {
      console.error("[useCarRentalMaintenance] update failed", err);
      setError("Couldn't save changes — refreshing.");
      await load();
    }
    setSaving(false);
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setSaving(true);
    const prev = records;
    setRecords((p) => p.filter((r) => r.id !== id));
    const { error: err } = await supabase.from("car_rental_maintenance").delete().eq("id", id);
    if (err) {
      console.error("[useCarRentalMaintenance] delete failed", err);
      setError("Couldn't delete record.");
      setRecords(prev);
    }
    setSaving(false);
  }, [records]);

  return { records, loading, saving, error, create, update, remove, refresh: load };
}
