/**
 * Cafe bundles (combos) — header + lines loaded together. On update we
 * replace all lines rather than diff, because bundles are small and the
 * extra round-trip cost is negligible vs the complexity savings.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafeBundle {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_cents: number;
  is_active: boolean;
  sort_order: number;
  // Phase 64: optional active window. Both NULL = always active.
  // Stored as TIME (HH:MM[:SS]) — wrap past midnight when end < start.
  active_start_time: string | null;
  active_end_time: string | null;
  created_at: string;
}

export interface CafeBundleItem {
  id: string;
  bundle_id: string;
  menu_item_id: string;
  quantity: number;
  sort_order: number;
}

export interface CafeBundleDraft {
  name: string;
  description: string | null;
  image_url: string | null;
  price_cents: number;
  is_active: boolean;
  active_start_time: string | null;
  active_end_time: string | null;
  items: Array<{ menu_item_id: string; quantity: number }>;
}

export function useCafeBundles(storeId: string | undefined) {
  const [bundles, setBundles] = useState<CafeBundle[]>([]);
  const [items, setItems] = useState<CafeBundleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data: bData, error: bErr } = await supabase
      .from("cafe_bundles" as never)
      .select("*")
      .eq("store_id", storeId)
      .order("sort_order", { ascending: true });
    if (bErr) {
      console.error("[useCafeBundles] load bundles", bErr);
      setError("Couldn't load bundles.");
      setLoading(false);
      return;
    }
    const bundleRows = (bData ?? []) as unknown as CafeBundle[];
    setBundles(bundleRows);
    if (bundleRows.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }
    const { data: iData, error: iErr } = await supabase
      .from("cafe_bundle_items" as never)
      .select("*")
      .in("bundle_id", bundleRows.map((b) => b.id))
      .order("sort_order", { ascending: true });
    if (iErr) {
      console.error("[useCafeBundles] load items", iErr);
      setError("Couldn't load bundle items.");
    } else {
      setItems((iData ?? []) as unknown as CafeBundleItem[]);
    }
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  // Convenience: group items per bundle_id for the UI.
  const itemsByBundle = useMemo(() => {
    const m = new Map<string, CafeBundleItem[]>();
    for (const r of items) {
      const arr = m.get(r.bundle_id) ?? [];
      arr.push(r);
      m.set(r.bundle_id, arr);
    }
    return m;
  }, [items]);

  // Replace the items of a bundle wholesale — simpler than diffing.
  const writeItems = useCallback(async (bundleId: string, lines: CafeBundleDraft["items"]) => {
    await supabase.from("cafe_bundle_items" as never).delete().eq("bundle_id", bundleId);
    if (lines.length === 0) return;
    const payload = lines.map((l, idx) => ({
      bundle_id: bundleId,
      menu_item_id: l.menu_item_id,
      quantity: Math.max(1, l.quantity),
      sort_order: idx * 10,
    }));
    const { error: err } = await supabase
      .from("cafe_bundle_items" as never).insert(payload as never);
    if (err) throw err;
  }, []);

  const create = useCallback(async (draft: CafeBundleDraft): Promise<boolean> => {
    if (!storeId) return false;
    setSaving(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("cafe_bundles" as never)
      .insert({
        store_id: storeId,
        name: draft.name.trim(),
        description: draft.description?.trim() || null,
        image_url: draft.image_url || null,
        price_cents: Math.max(0, draft.price_cents),
        is_active: draft.is_active,
        active_start_time: draft.active_start_time,
        active_end_time: draft.active_end_time,
        sort_order: bundles.length * 10,
      } as never)
      .select("id")
      .single();
    if (err || !data) {
      console.error("[useCafeBundles] create", err);
      setError("Couldn't create bundle.");
      setSaving(false);
      return false;
    }
    try {
      await writeItems((data as { id: string }).id, draft.items);
    } catch (e) {
      console.error("[useCafeBundles] create items", e);
      // Best-effort cleanup so we don't leave an empty header.
      void supabase.from("cafe_bundles" as never).delete().eq("id", (data as { id: string }).id);
      setError("Couldn't save bundle items.");
      setSaving(false);
      return false;
    }
    setSaving(false);
    await load();
    return true;
  }, [storeId, bundles.length, writeItems, load]);

  const update = useCallback(async (id: string, patch: Partial<CafeBundleDraft>): Promise<boolean> => {
    setSaving(true);
    setError(null);
    const headerPatch: Record<string, unknown> = {};
    if (patch.name !== undefined) headerPatch.name = patch.name.trim();
    if (patch.description !== undefined) headerPatch.description = patch.description?.trim() || null;
    if (patch.image_url !== undefined) headerPatch.image_url = patch.image_url || null;
    if (patch.price_cents !== undefined) headerPatch.price_cents = Math.max(0, patch.price_cents);
    if (patch.is_active !== undefined) headerPatch.is_active = patch.is_active;
    if (patch.active_start_time !== undefined) headerPatch.active_start_time = patch.active_start_time;
    if (patch.active_end_time !== undefined) headerPatch.active_end_time = patch.active_end_time;
    if (Object.keys(headerPatch).length > 0) {
      const { error: err } = await supabase
        .from("cafe_bundles" as never).update(headerPatch as never).eq("id", id);
      if (err) {
        console.error("[useCafeBundles] update header", err);
        setError("Couldn't save changes.");
        setSaving(false);
        return false;
      }
    }
    if (patch.items !== undefined) {
      try { await writeItems(id, patch.items); }
      catch (e) {
        console.error("[useCafeBundles] update items", e);
        setError("Couldn't save bundle items.");
        setSaving(false);
        return false;
      }
    }
    setSaving(false);
    await load();
    return true;
  }, [writeItems, load]);

  const remove = useCallback(async (id: string): Promise<boolean> => {
    const prev = bundles;
    setBundles((p) => p.filter((b) => b.id !== id));
    const { error: err } = await supabase
      .from("cafe_bundles" as never).delete().eq("id", id);
    if (err) {
      console.error("[useCafeBundles] remove", err);
      setBundles(prev);
      return false;
    }
    return true;
  }, [bundles]);

  return { bundles, items, itemsByBundle, loading, saving, error, create, update, remove, refresh: load };
}
