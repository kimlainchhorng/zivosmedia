/**
 * Salon clients (customers) CRUD + search.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SalonClient {
  id: string;
  store_id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  birthday: string | null;
  notes: string | null;
  preferred_stylist_id: string | null;
  user_id: string | null;
  is_blocked: boolean;
  visits_count: number;
  total_spent_cents: number;
  last_visit_at: string | null;
  loyalty_points: number;
  no_show_count: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export type SalonClientDraft = Omit<
  SalonClient,
  | "id"
  | "store_id"
  | "created_at"
  | "updated_at"
  | "user_id"
  | "visits_count"
  | "total_spent_cents"
  | "last_visit_at"
  | "loyalty_points"
  | "no_show_count"
  | "tags"
>;

interface UseSalonClientsResult {
  clients: SalonClient[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  create: (draft: SalonClientDraft) => Promise<SalonClient | null>;
  update: (id: string, patch: Partial<SalonClientDraft & { tags: string[] }>) => Promise<boolean>;
  remove: (id: string) => Promise<boolean>;
  refresh: () => Promise<void>;
}

export function useSalonClients(storeId: string | undefined): UseSalonClientsResult {
  const [clients, setClients] = useState<SalonClient[]>([]);
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
      .from("salon_clients")
      .select("*")
      .eq("store_id", storeId)
      .order("display_name", { ascending: true });
    if (err) {
      console.error("[useSalonClients] load failed", err);
      setError("Couldn't load clients.");
      setLoading(false);
      return;
    }
    setClients((data ?? []) as unknown as SalonClient[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async (draft: SalonClientDraft): Promise<SalonClient | null> => {
    if (!storeId) return null;
    setSaving(true);
    setError(null);
    const payload = {
      store_id: storeId,
      display_name: draft.display_name.trim(),
      phone: draft.phone?.trim() || null,
      email: draft.email?.trim() || null,
      birthday: draft.birthday || null,
      notes: draft.notes?.trim() || null,
      preferred_stylist_id: draft.preferred_stylist_id,
      is_blocked: draft.is_blocked,
    };
    const { data, error: err } = await supabase
      .from("salon_clients")
      .insert(payload as never)
      .select("*")
      .single();
    if (err) {
      console.error("[useSalonClients] create failed", err);
      setError("Couldn't add client.");
      setSaving(false);
      return null;
    }
    const created = data as unknown as SalonClient;
    setClients((prev) => [...prev, created].sort((a, b) => a.display_name.localeCompare(b.display_name)));
    setSaving(false);
    return created;
  }, [storeId]);

  const update = useCallback(async (id: string, patch: Partial<SalonClientDraft & { tags: string[] }>): Promise<boolean> => {
    setSaving(true);
    setError(null);
    const cleanPatch: Record<string, unknown> = {};
    if (patch.display_name !== undefined) cleanPatch.display_name = patch.display_name.trim();
    if (patch.phone !== undefined) cleanPatch.phone = patch.phone?.trim() || null;
    if (patch.email !== undefined) cleanPatch.email = patch.email?.trim() || null;
    if (patch.birthday !== undefined) cleanPatch.birthday = patch.birthday || null;
    if (patch.notes !== undefined) cleanPatch.notes = patch.notes?.trim() || null;
    if (patch.preferred_stylist_id !== undefined) cleanPatch.preferred_stylist_id = patch.preferred_stylist_id;
    if (patch.is_blocked !== undefined) cleanPatch.is_blocked = patch.is_blocked;
    if (patch.tags !== undefined) cleanPatch.tags = patch.tags;

    setClients((prev) =>
      prev.map((c) => (c.id === id ? ({ ...c, ...cleanPatch } as SalonClient) : c))
    );

    const { error: err } = await supabase
      .from("salon_clients")
      .update(cleanPatch as never)
      .eq("id", id);
    if (err) {
      console.error("[useSalonClients] update failed", err);
      setError("Couldn't save changes — refreshing.");
      await load();
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [load]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    const previous = clients;
    setClients((prev) => prev.filter((c) => c.id !== id));
    const { error: err } = await supabase
      .from("salon_clients")
      .delete()
      .eq("id", id);
    if (err) {
      console.error("[useSalonClients] delete failed", err);
      setError("Couldn't delete client.");
      setClients(previous);
      setSaving(false);
      return false;
    }
    setSaving(false);
    return true;
  }, [clients]);

  return { clients, loading, saving, error, create, update, remove, refresh: load };
}
