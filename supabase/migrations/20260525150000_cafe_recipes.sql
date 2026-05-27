-- Cafe recipes — link a menu item to the ingredients it consumes.
-- Each row says "this menu item uses N units of this inventory item per
-- serving." The Reports tab can roll true cost per drink from this.
--
-- Auto-deduction of stock on order isn't enforced by a DB trigger yet —
-- refund edge cases and per-store policy ("do we deduct on order or on
-- pour?") are best handled by the application layer for now.

CREATE TABLE IF NOT EXISTS public.cafe_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.cafe_menu_items(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.cafe_inventory_items(id) ON DELETE CASCADE,

  quantity_per_serving NUMERIC(12,4) NOT NULL CHECK (quantity_per_serving > 0),

  -- Free-text note ("18g espresso shot", "split shot ok").
  note TEXT CHECK (note IS NULL OR char_length(note) <= 200),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_recipes_store_idx
  ON public.cafe_recipes (store_id);
CREATE INDEX IF NOT EXISTS cafe_recipes_menu_idx
  ON public.cafe_recipes (menu_item_id);
CREATE INDEX IF NOT EXISTS cafe_recipes_inventory_idx
  ON public.cafe_recipes (inventory_item_id);
-- One row per (menu item, ingredient). Owners change quantity by updating
-- this row rather than stacking duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS cafe_recipes_unique_pair
  ON public.cafe_recipes (menu_item_id, inventory_item_id);

DROP TRIGGER IF EXISTS cafe_recipes_set_updated_at ON public.cafe_recipes;
CREATE TRIGGER cafe_recipes_set_updated_at
  BEFORE UPDATE ON public.cafe_recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

ALTER TABLE public.cafe_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage cafe recipes - all"
  ON public.cafe_recipes
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_recipes.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_recipes.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
