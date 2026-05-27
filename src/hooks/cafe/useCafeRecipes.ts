/**
 * Cafe recipes — load the (menu_item × inventory_item) join + helpers
 * for true-cost-per-drink rollups. Mutations: addIngredient / setQty /
 * removeIngredient — all keyed on the (menu, inventory) pair.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafeRecipe {
  id: string;
  store_id: string;
  menu_item_id: string;
  inventory_item_id: string;
  quantity_per_serving: number;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface UseCafeRecipesResult {
  recipes: CafeRecipe[];
  byMenuItem: Record<string, CafeRecipe[]>;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addIngredient: (menuItemId: string, inventoryItemId: string, qtyPerServing: number, note?: string) => Promise<CafeRecipe | null>;
  setQuantity: (recipeId: string, qty: number, note?: string | null) => Promise<void>;
  removeIngredient: (recipeId: string) => Promise<void>;
}

export function useCafeRecipes(storeId: string | undefined): UseCafeRecipesResult {
  const [recipes, setRecipes] = useState<CafeRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from("cafe_recipes" as never)
      .select("*")
      .eq("store_id", storeId);
    if (err) {
      console.error("[useCafeRecipes] load", err);
      setError("Couldn't load recipes.");
      setLoading(false);
      return;
    }
    setRecipes((data ?? []) as unknown as CafeRecipe[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const byMenuItem = useMemo(() => {
    const map: Record<string, CafeRecipe[]> = {};
    for (const r of recipes) {
      map[r.menu_item_id] = map[r.menu_item_id] ?? [];
      map[r.menu_item_id].push(r);
    }
    return map;
  }, [recipes]);

  const addIngredient = useCallback(async (menuItemId: string, inventoryItemId: string, qtyPerServing: number, note?: string) => {
    if (!storeId) return null;
    if (qtyPerServing <= 0) { setError("Quantity must be positive."); return null; }
    setSaving(true);
    const payload = {
      store_id: storeId,
      menu_item_id: menuItemId,
      inventory_item_id: inventoryItemId,
      quantity_per_serving: qtyPerServing,
      note: note?.trim() || null,
    };
    const { data, error: err } = await supabase
      .from("cafe_recipes" as never).insert(payload as never).select("*").single();
    setSaving(false);
    if (err) {
      console.error("[useCafeRecipes] addIngredient", err);
      setError(err.message?.includes("unique") ? "Ingredient already in this recipe." : "Couldn't add ingredient.");
      return null;
    }
    const created = data as unknown as CafeRecipe;
    setRecipes((p) => [...p, created]);
    return created;
  }, [storeId]);

  const setQuantity = useCallback(async (recipeId: string, qty: number, note?: string | null) => {
    setSaving(true);
    const patch: Record<string, unknown> = { quantity_per_serving: qty };
    if (note !== undefined) patch.note = note?.trim() || null;
    setRecipes((p) => p.map((r) => r.id === recipeId ? ({ ...r, ...patch } as CafeRecipe) : r));
    const { error: err } = await supabase.from("cafe_recipes" as never).update(patch as never).eq("id", recipeId);
    setSaving(false);
    if (err) { console.error("[useCafeRecipes] setQuantity", err); await load(); }
  }, [load]);

  const removeIngredient = useCallback(async (recipeId: string) => {
    const prev = recipes;
    setRecipes((p) => p.filter((r) => r.id !== recipeId));
    const { error: err } = await supabase.from("cafe_recipes" as never).delete().eq("id", recipeId);
    if (err) { console.error("[useCafeRecipes] removeIngredient", err); setRecipes(prev); }
  }, [recipes]);

  return { recipes, byMenuItem, loading, saving, error, refresh: load, addIngredient, setQuantity, removeIngredient };
}
