/**
 * Salon stylists CRUD plus per-stylist service assignment.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SalonStylist {
  id: string;
  store_id: string;
  display_name: string;
  title: string | null;
  bio: string | null;
  photo_url: string | null;
  email: string | null;
  phone: string | null;
  commission_percent: number;
  user_id: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  service_ids: string[];
}

export type SalonStylistDraft = Omit<
  SalonStylist,
  "id" | "store_id" | "created_at" | "updated_at" | "sort_order"
>;

interface UseSalonStylistsResult {
  stylists: SalonStylist[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  create: (draft: SalonStylistDraft) => Promise<SalonStylist | null>;
  update: (id: string, patch: Partial<SalonStylistDraft>) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

async function syncStylistServices(stylistId: string, serviceIds: string[]) {
  // Replace the full set: read current, compute add/remove.
  const { data: current, error: readErr } = await supabase
    .from("salon_stylist_services")
    .select("service_id")
    .eq("stylist_id", stylistId);
  if (readErr) throw readErr;

  const currentIds = new Set((current ?? []).map((r) => (r as any).service_id as string));
  const nextIds = new Set(serviceIds);
  const toAdd = [...nextIds].filter((id) => !currentIds.has(id));
  const toRemove = [...currentIds].filter((id) => !nextIds.has(id));

  if (toAdd.length > 0) {
    const { error } = await supabase
      .from("salon_stylist_services")
      .insert(toAdd.map((service_id) => ({ stylist_id: stylistId, service_id })) as never);
    if (error) throw error;
  }
  if (toRemove.length > 0) {
    const { error } = await supabase
      .from("salon_stylist_services")
      .delete()
      .eq("stylist_id", stylistId)
      .in("service_id", toRemove);
    if (error) throw error;
  }
}

export function useSalonStylists(storeId: string | undefined): UseSalonStylistsResult {
  const [stylists, setStylists] = useState<SalonStylist[]>([]);
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
      .from("salon_stylists")
      .select("*, salon_stylist_services(service_id)")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (err) {
      console.error("[useSalonStylists] load failed", err);
      setError("Couldn't load stylists.");
      setLoading(false);
      return;
    }
    const rows = (data ?? []).map((row: any) => ({
      ...row,
      service_ids: (row.salon_stylist_services ?? []).map((j: any) => j.service_id as string),
      commission_percent: Number(row.commission_percent ?? 0),
    })) as SalonStylist[];
    setStylists(rows);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async (draft: SalonStylistDraft): Promise<SalonStylist | null> => {
    if (!storeId) return null;
    setSaving(true);
    setError(null);
    const sort_order = stylists.length > 0 ? Math.max(...stylists.map((s) => s.sort_order)) + 10 : 0;
    const payload = {
      store_id: storeId,
      display_name: draft.display_name.trim(),
      title: draft.title?.trim() || null,
      bio: draft.bio?.trim() || null,
      photo_url: draft.photo_url,
      email: draft.email?.trim() || null,
      phone: draft.phone?.trim() || null,
      commission_percent: draft.commission_percent,
      user_id: draft.user_id,
      is_active: draft.is_active,
      sort_order,
    };
    const { data, error: err } = await supabase
      .from("salon_stylists")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useSalonStylists] create failed", err);
      setError("Couldn't add stylist.");
      setSaving(false);
      return null;
    }
    const created = data as any;
    try {
      await syncStylistServices(created.id, draft.service_ids);
    } catch (e) {
      console.error("[useSalonStylists] create — service link failed", e);
    }
    const final: SalonStylist = {
      ...created,
      service_ids: draft.service_ids,
      commission_percent: Number(created.commission_percent ?? 0),
    };
    setStylists((prev) => [...prev, final]);
    setSaving(false);
    return final;
  }, [storeId, stylists]);

  const update = useCallback(async (id: string, patch: Partial<SalonStylistDraft>): Promise<boolean> => {
    setSaving(true);
    setError(null);
    const cleanPatch: Record<string, unknown> = {};
    if (patch.display_name !== undefined) cleanPatch.display_name = patch.display_name.trim();
    if (patch.title !== undefined) cleanPatch.title = patch.title?.trim() || null;
    if (patch.bio !== undefined) cleanPatch.bio = patch.bio?.trim() || null;
    if (patch.photo_url !== undefined) cleanPatch.photo_url = patch.photo_url;
    if (patch.email !== undefined) cleanPatch.email = patch.email?.trim() || null;
    if (patch.phone !== undefined) cleanPatch.phone = patch.phone?.trim() || null;
    if (patch.commission_percent !== undefined) cleanPatch.commission_percent = patch.commission_percent;
    if (patch.is_active !== undefined) cleanPatch.is_active = patch.is_active;

    // Optimistic local merge
    setStylists((prev) =>
      prev.map((s) =>
        s.id === id
          ? ({
              ...s,
              ...cleanPatch,
              ...(patch.service_ids !== undefined ? { service_ids: patch.service_ids } : {}),
            } as SalonStylist)
          : s
      )
    );

    let ok = true;
    if (Object.keys(cleanPatch).length > 0) {
      const { error: err } = await supabase
        .from("salon_stylists")
        .update(cleanPatch as never)
        .eq("id", id);
      if (err) {
        console.error("[useSalonStylists] update failed", err);
        setError("Couldn't save changes — refreshing.");
        await load();
        setSaving(false);
        return false;
      }
    }
    if (patch.service_ids !== undefined) {
      try {
        await syncStylistServices(id, patch.service_ids);
      } catch (e) {
        console.error("[useSalonStylists] service sync failed", e);
        setError("Couldn't update services — refreshing.");
        await load();
        ok = false;
      }
    }
    setSaving(false);
    return ok;
  }, [load]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    const previous = stylists;
    setStylists((prev) => prev.filter((s) => s.id !== id));
    const { error: err } = await supabase
      .from("salon_stylists")
      .delete()
      .eq("id", id);
    if (err) {
      console.error("[useSalonStylists] delete failed", err);
      setError("Couldn't delete stylist.");
      setStylists(previous);
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [stylists]);

  return { stylists, loading, saving, error, create, update, remove, refresh: load };
}
