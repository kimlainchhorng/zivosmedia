/**
 * Car dealership test drives CRUD.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DealershipTestDriveStatus =
  | "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";

export interface DealershipTestDrive {
  id: string;
  store_id: string;
  lead_id: string | null;
  vehicle_id: string | null;
  customer_id: string | null;
  salesperson_user_id: string | null;
  customer_name: string;
  customer_phone: string | null;
  vehicle_label: string;
  scheduled_at: string;
  duration_minutes: number;
  status: DealershipTestDriveStatus;
  start_odometer: number | null;
  end_odometer: number | null;
  start_fuel_level: number | null;
  end_fuel_level: number | null;
  notes: string | null;
  cancellation_reason: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type DealershipTestDriveDraft = Omit<
  DealershipTestDrive,
  "id" | "store_id" | "created_at" | "updated_at"
>;

export function useDealershipTestDrives(storeId: string | undefined) {
  const [drives, setDrives] = useState<DealershipTestDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true); setError(null);
    const { data, error: err } = await supabase
      .from("car_dealership_test_drives")
      .select("*")
      .eq("store_id", storeId)
      .order("scheduled_at", { ascending: false });
    if (err) {
      console.error("[useDealershipTestDrives] load failed", err);
      setError("Couldn't load test drives.");
      setLoading(false);
      return;
    }
    setDrives((data ?? []) as unknown as DealershipTestDrive[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: DealershipTestDriveDraft) => {
    if (!storeId) return null;
    setSaving(true); setError(null);
    const payload = { store_id: storeId, ...draft };
    const { data, error: err } = await supabase
      .from("car_dealership_test_drives")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useDealershipTestDrives] create failed", err);
      setError(err.message || "Couldn't schedule test drive.");
      setSaving(false);
      return null;
    }
    const created = data as unknown as DealershipTestDrive;
    setDrives((prev) => [created, ...prev]);
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<DealershipTestDriveDraft>) => {
    setSaving(true); setError(null);
    setDrives((prev) => prev.map((d) => (d.id === id ? ({ ...d, ...patch } as DealershipTestDrive) : d)));
    const { error: err } = await supabase
      .from("car_dealership_test_drives")
      .update(patch as never)
      .eq("id", id);
    if (err) {
      console.error("[useDealershipTestDrives] update failed", err);
      setError("Couldn't update test drive.");
      setSaving(false);
      void load();
      return false;
    }
    setSaving(false);
    return true;
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setSaving(true); setError(null);
    const prev = drives;
    setDrives((p) => p.filter((d) => d.id !== id));
    const { error: err } = await supabase
      .from("car_dealership_test_drives")
      .delete()
      .eq("id", id);
    if (err) {
      console.error("[useDealershipTestDrives] remove failed", err);
      setError("Couldn't delete test drive.");
      setDrives(prev);
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [drives]);

  return { drives, loading, saving, error, create, update, remove, refresh: load };
}
