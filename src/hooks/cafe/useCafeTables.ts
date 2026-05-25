/**
 * Cafe tables CRUD — used for the floor-plan + QR-code section. Mirrors the
 * salon services hook shape so the UI stays consistent.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafeTable {
  id: string;
  store_id: string;
  label: string;
  capacity: number;
  zone: string | null;
  is_active: boolean;
  sort_order: number;
  qr_token: string;
  created_at: string;
  updated_at: string;
}

export type CafeTableDraft = Omit<CafeTable, "id" | "store_id" | "qr_token" | "created_at" | "updated_at" | "sort_order">;

export interface UseCafeTablesResult {
  tables: CafeTable[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  create: (draft: CafeTableDraft) => Promise<CafeTable | null>;
  update: (id: string, patch: Partial<CafeTableDraft & { sort_order: number }>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  regenerateQr: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useCafeTables(storeId: string | undefined): UseCafeTablesResult {
  const [tables, setTables] = useState<CafeTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("cafe_tables" as never).select("*").eq("store_id", storeId)
      .order("sort_order", { ascending: true }).order("created_at", { ascending: true });
    if (err) {
      console.error("[useCafeTables] load", err);
      setError("Couldn't load tables.");
      setLoading(false);
      return;
    }
    setTables((data ?? []) as unknown as CafeTable[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const create = useCallback(async (draft: CafeTableDraft) => {
    if (!storeId) return null;
    setSaving(true);
    const sortOrder = tables.length > 0 ? Math.max(...tables.map((t) => t.sort_order)) + 10 : 0;
    const payload = { store_id: storeId, sort_order: sortOrder, ...draft, label: draft.label.trim() };
    const { data, error: err } = await supabase
      .from("cafe_tables" as never).insert(payload as never).select("*").single();
    setSaving(false);
    if (err) {
      console.error("[useCafeTables] create", err);
      setError("Couldn't add table.");
      return null;
    }
    const created = data as unknown as CafeTable;
    setTables((p) => [...p, created]);
    return created;
  }, [storeId, tables]);

  const update = useCallback(async (id: string, patch: Partial<CafeTableDraft & { sort_order: number }>) => {
    setSaving(true);
    setTables((p) => p.map((t) => (t.id === id ? ({ ...t, ...patch } as CafeTable) : t)));
    const { error: err } = await supabase.from("cafe_tables" as never).update(patch as never).eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafeTables] update", err); await load(); }
  }, [load]);

  const remove = useCallback(async (id: string) => {
    setSaving(true);
    const prev = tables;
    setTables((p) => p.filter((t) => t.id !== id));
    const { error: err } = await supabase.from("cafe_tables" as never).delete().eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafeTables] remove", err); setTables(prev); }
  }, [tables]);

  const regenerateQr = useCallback(async (id: string) => {
    setSaving(true);
    // Postgres gen_random_uuid() is available via a trivial UPDATE — but the JS
    // client can't call it directly, so we generate one client-side.
    const fresh = (crypto?.randomUUID?.() ?? (() => {
      const arr = new Uint8Array(16);
      crypto.getRandomValues(arr);
      arr[6] = (arr[6] & 0x0f) | 0x40;
      arr[8] = (arr[8] & 0x3f) | 0x80;
      const hex = Array.from(arr).map((b) => b.toString(16).padStart(2, "0")).join("");
      return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
    })());
    setTables((p) => p.map((t) => (t.id === id ? ({ ...t, qr_token: fresh } as CafeTable) : t)));
    const { error: err } = await supabase
      .from("cafe_tables" as never).update({ qr_token: fresh } as never).eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafeTables] regenerateQr", err); await load(); }
  }, [load]);

  return { tables, loading, saving, error, create, update, remove, regenerateQr, refresh: load };
}
