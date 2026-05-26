/**
 * Cafe menu CRUD — categories, items, modifier groups, modifiers, and the
 * item ↔ group mapping. One hook so the Menu UI doesn't have to coordinate
 * four separate ones.
 *
 * Inserts/updates are cast through `as never` because the auto-generated
 * supabase types don't include the cafe_* tables yet (mirrors the salon hooks).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafeCategory {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CafeMenuItem {
  id: string;
  store_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  price_cents: number;
  cost_cents: number;
  prep_minutes: number;
  image_url: string | null;
  is_active: boolean;
  is_featured: boolean;
  is_sold_out: boolean;
  sort_order: number;
  tags: string[];
  is_vegetarian: boolean;
  is_vegan: boolean;
  is_gluten_free: boolean;
  allergens: string | null;
  happy_hour_price_cents: number | null;
  happy_hour_start: number | null;
  happy_hour_end: number | null;
  caffeine_mg: number | null;
  calories: number | null;
  created_at: string;
  updated_at: string;
}

export interface CafeModifierGroup {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  selection_type: "single" | "multi";
  min_select: number;
  max_select: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CafeModifier {
  id: string;
  store_id: string;
  group_id: string;
  name: string;
  price_delta_cents: number;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface CafeItemModifierLink {
  item_id: string;
  group_id: string;
  sort_order: number;
}

export type CafeCategoryDraft = Omit<CafeCategory, "id" | "store_id" | "created_at" | "updated_at" | "sort_order">;
export type CafeMenuItemDraft = Omit<CafeMenuItem, "id" | "store_id" | "created_at" | "updated_at" | "sort_order">;
export type CafeModifierGroupDraft = Omit<CafeModifierGroup, "id" | "store_id" | "created_at" | "updated_at" | "sort_order">;
export type CafeModifierDraft = Omit<CafeModifier, "id" | "store_id" | "created_at" | "updated_at" | "sort_order">;

export interface UseCafeMenuResult {
  categories: CafeCategory[];
  items: CafeMenuItem[];
  groups: CafeModifierGroup[];
  modifiers: CafeModifier[];
  links: CafeItemModifierLink[];
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  // Categories
  createCategory: (draft: CafeCategoryDraft) => Promise<CafeCategory | null>;
  updateCategory: (id: string, patch: Partial<CafeCategoryDraft & { sort_order: number }>) => Promise<void>;
  removeCategory: (id: string) => Promise<void>;

  // Items
  createItem: (draft: CafeMenuItemDraft) => Promise<CafeMenuItem | null>;
  updateItem: (id: string, patch: Partial<CafeMenuItemDraft & { sort_order: number }>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;

  // Modifier groups
  createGroup: (draft: CafeModifierGroupDraft) => Promise<CafeModifierGroup | null>;
  updateGroup: (id: string, patch: Partial<CafeModifierGroupDraft & { sort_order: number }>) => Promise<void>;
  removeGroup: (id: string) => Promise<void>;

  // Modifiers
  createModifier: (groupId: string, draft: CafeModifierDraft) => Promise<CafeModifier | null>;
  updateModifier: (id: string, patch: Partial<CafeModifierDraft & { sort_order: number }>) => Promise<void>;
  removeModifier: (id: string) => Promise<void>;

  // Item ↔ group links
  attachGroupToItem: (itemId: string, groupId: string) => Promise<void>;
  detachGroupFromItem: (itemId: string, groupId: string) => Promise<void>;
}

export function useCafeMenu(storeId: string | undefined): UseCafeMenuResult {
  const [categories, setCategories] = useState<CafeCategory[]>([]);
  const [items, setItems] = useState<CafeMenuItem[]>([]);
  const [groups, setGroups] = useState<CafeModifierGroup[]>([]);
  const [modifiers, setModifiers] = useState<CafeModifier[]>([]);
  const [links, setLinks] = useState<CafeItemModifierLink[]>([]);
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
    const [catRes, itemRes, grpRes, modRes, linkRes] = await Promise.all([
      supabase.from("cafe_categories" as never).select("*").eq("store_id", storeId).order("sort_order", { ascending: true }),
      supabase.from("cafe_menu_items" as never).select("*").eq("store_id", storeId).order("sort_order", { ascending: true }),
      supabase.from("cafe_modifier_groups" as never).select("*").eq("store_id", storeId).order("sort_order", { ascending: true }),
      supabase.from("cafe_modifiers" as never).select("*").eq("store_id", storeId).order("sort_order", { ascending: true }),
      supabase.from("cafe_menu_item_modifier_groups" as never).select("*"),
    ]);
    if (catRes.error || itemRes.error || grpRes.error || modRes.error || linkRes.error) {
      console.error("[useCafeMenu] load failed", catRes.error || itemRes.error || grpRes.error || modRes.error || linkRes.error);
      setError("Couldn't load menu.");
      setLoading(false);
      return;
    }
    setCategories((catRes.data ?? []) as unknown as CafeCategory[]);
    setItems((itemRes.data ?? []) as unknown as CafeMenuItem[]);
    setGroups((grpRes.data ?? []) as unknown as CafeModifierGroup[]);
    setModifiers((modRes.data ?? []) as unknown as CafeModifier[]);
    // Filter links down to items in this store (the join table has no store_id).
    const itemIds = new Set(((itemRes.data ?? []) as unknown as CafeMenuItem[]).map((i) => i.id));
    setLinks(((linkRes.data ?? []) as unknown as CafeItemModifierLink[]).filter((l) => itemIds.has(l.item_id)));
    setLoading(false);
  }, [storeId]);

  useEffect(() => {
    void load();
  }, [load]);

  const nextOrder = useCallback(<T extends { sort_order: number }>(rows: T[]) =>
    rows.length === 0 ? 0 : Math.max(...rows.map((r) => r.sort_order)) + 10, []);

  // ===== Categories =====
  const createCategory = useCallback(async (draft: CafeCategoryDraft) => {
    if (!storeId) return null;
    setSaving(true);
    const payload = { store_id: storeId, sort_order: nextOrder(categories), ...draft, name: draft.name.trim() };
    const { data, error: err } = await supabase
      .from("cafe_categories" as never).insert(payload as never).select("*").single();
    setSaving(false);
    if (err) {
      console.error("[useCafeMenu] createCategory", err);
      setError("Couldn't create category.");
      return null;
    }
    const created = data as unknown as CafeCategory;
    setCategories((p) => [...p, created]);
    return created;
  }, [storeId, categories, nextOrder]);

  const updateCategory = useCallback(async (id: string, patch: Partial<CafeCategoryDraft & { sort_order: number }>) => {
    setSaving(true);
    setCategories((p) => p.map((c) => (c.id === id ? ({ ...c, ...patch } as CafeCategory) : c)));
    const { error: err } = await supabase.from("cafe_categories" as never).update(patch as never).eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafeMenu] updateCategory", err); await load(); }
  }, [load]);

  const removeCategory = useCallback(async (id: string) => {
    setSaving(true);
    const prev = categories;
    setCategories((p) => p.filter((c) => c.id !== id));
    const { error: err } = await supabase.from("cafe_categories" as never).delete().eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafeMenu] removeCategory", err); setCategories(prev); }
  }, [categories]);

  // ===== Items =====
  const createItem = useCallback(async (draft: CafeMenuItemDraft) => {
    if (!storeId) return null;
    setSaving(true);
    const payload = { store_id: storeId, sort_order: nextOrder(items), ...draft, name: draft.name.trim() };
    const { data, error: err } = await supabase
      .from("cafe_menu_items" as never).insert(payload as never).select("*").single();
    setSaving(false);
    if (err) {
      console.error("[useCafeMenu] createItem", err);
      setError("Couldn't create item.");
      return null;
    }
    const created = data as unknown as CafeMenuItem;
    setItems((p) => [...p, created]);
    return created;
  }, [storeId, items, nextOrder]);

  const updateItem = useCallback(async (id: string, patch: Partial<CafeMenuItemDraft & { sort_order: number }>) => {
    setSaving(true);
    setItems((p) => p.map((i) => (i.id === id ? ({ ...i, ...patch } as CafeMenuItem) : i)));
    const { error: err } = await supabase.from("cafe_menu_items" as never).update(patch as never).eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafeMenu] updateItem", err); await load(); }
  }, [load]);

  const removeItem = useCallback(async (id: string) => {
    setSaving(true);
    const prev = items;
    setItems((p) => p.filter((i) => i.id !== id));
    const { error: err } = await supabase.from("cafe_menu_items" as never).delete().eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafeMenu] removeItem", err); setItems(prev); }
  }, [items]);

  // ===== Modifier groups =====
  const createGroup = useCallback(async (draft: CafeModifierGroupDraft) => {
    if (!storeId) return null;
    setSaving(true);
    const payload = { store_id: storeId, sort_order: nextOrder(groups), ...draft, name: draft.name.trim() };
    const { data, error: err } = await supabase
      .from("cafe_modifier_groups" as never).insert(payload as never).select("*").single();
    setSaving(false);
    if (err) {
      console.error("[useCafeMenu] createGroup", err);
      setError("Couldn't create modifier group.");
      return null;
    }
    const created = data as unknown as CafeModifierGroup;
    setGroups((p) => [...p, created]);
    return created;
  }, [storeId, groups, nextOrder]);

  const updateGroup = useCallback(async (id: string, patch: Partial<CafeModifierGroupDraft & { sort_order: number }>) => {
    setSaving(true);
    setGroups((p) => p.map((g) => (g.id === id ? ({ ...g, ...patch } as CafeModifierGroup) : g)));
    const { error: err } = await supabase.from("cafe_modifier_groups" as never).update(patch as never).eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafeMenu] updateGroup", err); await load(); }
  }, [load]);

  const removeGroup = useCallback(async (id: string) => {
    setSaving(true);
    const prev = groups;
    setGroups((p) => p.filter((g) => g.id !== id));
    const { error: err } = await supabase.from("cafe_modifier_groups" as never).delete().eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafeMenu] removeGroup", err); setGroups(prev); }
  }, [groups]);

  // ===== Modifiers =====
  const createModifier = useCallback(async (groupId: string, draft: CafeModifierDraft) => {
    if (!storeId) return null;
    setSaving(true);
    const groupMods = modifiers.filter((m) => m.group_id === groupId);
    const payload = { store_id: storeId, group_id: groupId, sort_order: nextOrder(groupMods), ...draft, name: draft.name.trim() };
    const { data, error: err } = await supabase
      .from("cafe_modifiers" as never).insert(payload as never).select("*").single();
    setSaving(false);
    if (err) {
      console.error("[useCafeMenu] createModifier", err);
      setError("Couldn't create modifier.");
      return null;
    }
    const created = data as unknown as CafeModifier;
    setModifiers((p) => [...p, created]);
    return created;
  }, [storeId, modifiers, nextOrder]);

  const updateModifier = useCallback(async (id: string, patch: Partial<CafeModifierDraft & { sort_order: number }>) => {
    setSaving(true);
    setModifiers((p) => p.map((m) => (m.id === id ? ({ ...m, ...patch } as CafeModifier) : m)));
    const { error: err } = await supabase.from("cafe_modifiers" as never).update(patch as never).eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafeMenu] updateModifier", err); await load(); }
  }, [load]);

  const removeModifier = useCallback(async (id: string) => {
    setSaving(true);
    const prev = modifiers;
    setModifiers((p) => p.filter((m) => m.id !== id));
    const { error: err } = await supabase.from("cafe_modifiers" as never).delete().eq("id", id);
    setSaving(false);
    if (err) { console.error("[useCafeMenu] removeModifier", err); setModifiers(prev); }
  }, [modifiers]);

  // ===== Item ↔ Group links =====
  const attachGroupToItem = useCallback(async (itemId: string, groupId: string) => {
    if (links.some((l) => l.item_id === itemId && l.group_id === groupId)) return;
    const order = links.filter((l) => l.item_id === itemId).length * 10;
    const optimistic: CafeItemModifierLink = { item_id: itemId, group_id: groupId, sort_order: order };
    setLinks((p) => [...p, optimistic]);
    const { error: err } = await supabase
      .from("cafe_menu_item_modifier_groups" as never)
      .insert({ item_id: itemId, group_id: groupId, sort_order: order } as never);
    if (err) {
      console.error("[useCafeMenu] attachGroup", err);
      setLinks((p) => p.filter((l) => !(l.item_id === itemId && l.group_id === groupId)));
    }
  }, [links]);

  const detachGroupFromItem = useCallback(async (itemId: string, groupId: string) => {
    const prev = links;
    setLinks((p) => p.filter((l) => !(l.item_id === itemId && l.group_id === groupId)));
    const { error: err } = await supabase
      .from("cafe_menu_item_modifier_groups" as never)
      .delete()
      .eq("item_id", itemId)
      .eq("group_id", groupId);
    if (err) { console.error("[useCafeMenu] detachGroup", err); setLinks(prev); }
  }, [links]);

  return useMemo(() => ({
    categories, items, groups, modifiers, links,
    loading, saving, error,
    refresh: load,
    createCategory, updateCategory, removeCategory,
    createItem, updateItem, removeItem,
    createGroup, updateGroup, removeGroup,
    createModifier, updateModifier, removeModifier,
    attachGroupToItem, detachGroupFromItem,
  }), [
    categories, items, groups, modifiers, links,
    loading, saving, error, load,
    createCategory, updateCategory, removeCategory,
    createItem, updateItem, removeItem,
    createGroup, updateGroup, removeGroup,
    createModifier, updateModifier, removeModifier,
    attachGroupToItem, detachGroupFromItem,
  ]);
}
