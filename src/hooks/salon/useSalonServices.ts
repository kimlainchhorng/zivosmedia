/**
 * Salon services CRUD for the Service Menu UI.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase as _supabaseTyped } from "@/integrations/supabase/client";
const supabase: any = _supabaseTyped;

export interface SalonService {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  category: string | null;
  duration_minutes: number;
  price_cents: number;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type SalonServiceDraft = Omit<SalonService, "id" | "store_id" | "created_at" | "updated_at" | "sort_order">;

interface UseSalonServicesResult {
  services: SalonService[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  create: (draft: SalonServiceDraft) => Promise<SalonService | null>;
  update: (id: string, patch: Partial<SalonServiceDraft & { sort_order: number }>) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useSalonServices(storeId: string | undefined): UseSalonServicesResult {
  const [services, setServices] = useState<SalonService[]>([]);
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
      .from("salon_services")
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (err) {
      console.error("[useSalonServices] load failed", err);
      setError("Couldn't load services.");
      setLoading(false);
      return;
    }
    setServices((data ?? []) as unknown as SalonService[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async (draft: SalonServiceDraft): Promise<SalonService | null> => {
    if (!storeId) return null;
    setSaving(true);
    setError(null);
    const payload = {
      name: draft.name.trim(),
      description: draft.description?.trim() || null,
      category: draft.category?.trim() || null,
      duration_minutes: draft.duration_minutes,
      price_cents: draft.price_cents,
      image_url: draft.image_url,
      is_active: draft.is_active,
    };
    const { data, error: err } = await supabase.functions.invoke("salon-service-manage", {
      body: { action: "create", store_id: storeId, service: payload },
    });
    if (err || data?.error) {
      console.error("[useSalonServices] create failed", err);
      setError("Couldn't create service.");
      setSaving(false);
      return null;
    }
    const created = data.service as SalonService;
    setServices((prev) => [...prev, created]);
    setSaving(false);
    return created;
  }, [storeId, services]);

  const update = useCallback(async (id: string, patch: Partial<SalonServiceDraft & { sort_order: number }>): Promise<boolean> => {
    setSaving(true);
    setError(null);
    const cleanPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) cleanPatch.name = patch.name.trim();
    if (patch.description !== undefined) cleanPatch.description = patch.description?.trim() || null;
    if (patch.category !== undefined) cleanPatch.category = patch.category?.trim() || null;
    if (patch.duration_minutes !== undefined) cleanPatch.duration_minutes = patch.duration_minutes;
    if (patch.price_cents !== undefined) cleanPatch.price_cents = patch.price_cents;
    if (patch.image_url !== undefined) cleanPatch.image_url = patch.image_url;
    if (patch.is_active !== undefined) cleanPatch.is_active = patch.is_active;
    if (patch.sort_order !== undefined) cleanPatch.sort_order = patch.sort_order;

    // Optimistic local update
    setServices((prev) => prev.map((s) => (s.id === id ? ({ ...s, ...cleanPatch } as SalonService) : s)));

    const { data, error: err } = await supabase.functions.invoke("salon-service-manage", {
      body: { action: "update", service_id: id, service: cleanPatch },
    });
    if (err || data?.error) {
      console.error("[useSalonServices] update failed", err);
      setError("Couldn't save changes — refreshing.");
      await load();
      setSaving(false);
      return false;
    }
    if (data?.service) {
      setServices((prev) => prev.map((s) => (s.id === id ? data.service as SalonService : s)));
    }
    setSaving(false);
    return true;
  }, [load]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    const previous = services;
    setServices((prev) => prev.filter((s) => s.id !== id));
    const { data, error: err } = await supabase.functions.invoke("salon-service-manage", {
      body: { action: "delete", service_id: id },
    });
    if (err || data?.error) {
      console.error("[useSalonServices] delete failed", err);
      setError("Couldn't delete service.");
      setServices(previous);
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [services]);

  return { services, loading, saving, error, create, update, remove, refresh: load };
}
