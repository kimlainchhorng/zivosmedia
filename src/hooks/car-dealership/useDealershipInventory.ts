/**
 * Car dealership inventory (vehicles) CRUD hook.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type DealershipVehicleStatus =
  | "available"
  | "reserved"
  | "pending_sale"
  | "sold"
  | "in_transit"
  | "service"
  | "retired";

export type DealershipCondition = "new" | "used" | "certified_preowned";
export type DealershipTransmission = "automatic" | "manual" | "cvt" | "dual_clutch" | "other";
export type DealershipFuel =
  | "gasoline" | "diesel" | "hybrid" | "plugin_hybrid" | "electric" | "flex_fuel" | "lpg" | "other";
export type DealershipDrivetrain = "fwd" | "rwd" | "awd" | "4wd";

export interface DealershipVehicle {
  id: string;
  store_id: string;
  stock_number: string | null;
  vin: string | null;
  make: string;
  model: string;
  trim: string | null;
  year: number | null;
  body_type: string | null;
  exterior_color: string | null;
  interior_color: string | null;
  license_plate: string | null;
  condition: DealershipCondition;
  transmission: DealershipTransmission;
  fuel_type: DealershipFuel;
  drivetrain: DealershipDrivetrain | null;
  engine: string | null;
  cylinders: number | null;
  doors: number | null;
  seats: number | null;
  mileage: number | null;
  mileage_unit: "mi" | "km";
  cost_cents: number;
  asking_price_cents: number;
  msrp_cents: number;
  min_price_cents: number;
  photo_url: string | null;
  photo_urls: string[];
  video_url: string | null;
  features: string[];
  description: string | null;
  acquired_at: string | null;
  acquired_from: string | null;
  location_label: string | null;
  days_on_lot: number;
  status: DealershipVehicleStatus;
  is_active: boolean;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export type DealershipVehicleDraft = Omit<
  DealershipVehicle,
  "id" | "store_id" | "created_at" | "updated_at" | "days_on_lot"
>;

interface UseDealershipInventoryResult {
  vehicles: DealershipVehicle[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  create: (draft: DealershipVehicleDraft) => Promise<DealershipVehicle | null>;
  /** Bulk-insert multiple vehicles in a single round trip. Returns the
   *  count actually inserted (0 if the request failed). */
  createMany: (drafts: DealershipVehicleDraft[]) => Promise<number>;
  update: (id: string, patch: Partial<DealershipVehicleDraft>) => Promise<boolean>;
  /** Apply the same patch to many vehicles in a single round trip. Returns
   *  the number of rows actually updated (0 on failure). */
  updateMany: (ids: string[], patch: Partial<DealershipVehicleDraft>) => Promise<number>;
  remove: (id: string) => Promise<boolean>;
  /** Delete many vehicles in a single round trip. Returns count deleted. */
  removeMany: (ids: string[]) => Promise<number>;
  refresh: () => Promise<void>;
}

export function useDealershipInventory(storeId: string | undefined): UseDealershipInventoryResult {
  const [vehicles, setVehicles] = useState<DealershipVehicle[]>([]);
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
      .from("car_dealership_vehicles")
      .select("*")
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (err) {
      console.error("[useDealershipInventory] load failed", err);
      setError("Couldn't load inventory.");
      setLoading(false);
      return;
    }
    setVehicles((data ?? []) as unknown as DealershipVehicle[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: DealershipVehicleDraft) => {
    if (!storeId) return null;
    setSaving(true); setError(null);
    const payload = { store_id: storeId, ...draft };
    const { data, error: err } = await supabase
      .from("car_dealership_vehicles")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useDealershipInventory] create failed", err);
      setError(err.message || "Couldn't add vehicle.");
      setSaving(false);
      return null;
    }
    const created = data as unknown as DealershipVehicle;
    setVehicles((prev) => [created, ...prev]);
    setSaving(false);
    return created;
  }, [storeId]);

  const createMany = useCallback(async (drafts: DealershipVehicleDraft[]) => {
    if (!storeId || drafts.length === 0) return 0;
    setSaving(true); setError(null);
    const payload = drafts.map((d) => ({ store_id: storeId, ...d }));
    const { data, error: err } = await supabase
      .from("car_dealership_vehicles")
      .insert(payload as never)
      .select("*");
    if (err) {
      console.error("[useDealershipInventory] createMany failed", err);
      setError(err.message || "Bulk insert failed.");
      setSaving(false);
      return 0;
    }
    const created = (data ?? []) as unknown as DealershipVehicle[];
    // Prepend in source order so the newest batch shows first.
    setVehicles((prev) => [...created, ...prev]);
    setSaving(false);
    return created.length;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<DealershipVehicleDraft>) => {
    setSaving(true); setError(null);
    setVehicles((prev) => prev.map((v) => (v.id === id ? ({ ...v, ...patch } as DealershipVehicle) : v)));
    const { error: err } = await supabase
      .from("car_dealership_vehicles")
      .update(patch as never)
      .eq("id", id);
    if (err) {
      console.error("[useDealershipInventory] update failed", err);
      setError("Couldn't update vehicle.");
      setSaving(false);
      void load();
      return false;
    }
    setSaving(false);
    return true;
  }, [load]);

  const updateMany = useCallback(async (
    ids: string[],
    patch: Partial<DealershipVehicleDraft>,
  ) => {
    if (ids.length === 0) return 0;
    setSaving(true); setError(null);
    const idSet = new Set(ids);
    // Optimistic local update
    setVehicles((prev) => prev.map((v) =>
      idSet.has(v.id) ? ({ ...v, ...patch } as DealershipVehicle) : v,
    ));
    const { error: err, count } = await supabase
      .from("car_dealership_vehicles")
      .update(patch as never, { count: "exact" })
      .in("id", ids);
    if (err) {
      console.error("[useDealershipInventory] updateMany failed", err);
      setError("Bulk update failed.");
      setSaving(false);
      void load(); // refetch to recover
      return 0;
    }
    setSaving(false);
    return count ?? ids.length;
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setSaving(true); setError(null);
    const prev = vehicles;
    setVehicles((p) => p.filter((v) => v.id !== id));
    const { error: err } = await supabase
      .from("car_dealership_vehicles")
      .delete()
      .eq("id", id);
    if (err) {
      console.error("[useDealershipInventory] remove failed", err);
      setError("Couldn't delete vehicle.");
      setVehicles(prev);
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [vehicles]);

  const removeMany = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return 0;
    setSaving(true); setError(null);
    const snapshot = vehicles;
    const idSet = new Set(ids);
    setVehicles((p) => p.filter((v) => !idSet.has(v.id)));
    const { error: err, count } = await supabase
      .from("car_dealership_vehicles")
      .delete({ count: "exact" })
      .in("id", ids);
    if (err) {
      console.error("[useDealershipInventory] removeMany failed", err);
      setError("Bulk delete failed.");
      setVehicles(snapshot);
      setSaving(false);
      return 0;
    }
    setSaving(false);
    return count ?? ids.length;
  }, [vehicles]);

  return { vehicles, loading, saving, error, create, createMany, update, updateMany, remove, removeMany, refresh: load };
}
