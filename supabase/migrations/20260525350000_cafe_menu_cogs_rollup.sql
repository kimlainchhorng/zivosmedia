-- Recipe-driven menu cost rollup. cafe_menu_items.cost_cents is now the
-- canonical COGS computed from cafe_recipes × cafe_inventory_items.cost
-- whenever a recipe row or ingredient cost changes. Manual edits stay
-- possible (no rule prevents it) but they'll be overwritten next time a
-- recipe or ingredient cost changes, which is the right behaviour.

CREATE OR REPLACE FUNCTION public.cafe_recompute_menu_item_cost(p_menu_item_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE v_new_cost INTEGER;
BEGIN
  SELECT COALESCE(SUM(r.quantity_per_serving * i.cost_per_unit_cents), 0)::INTEGER
    INTO v_new_cost
    FROM public.cafe_recipes r
    JOIN public.cafe_inventory_items i ON i.id = r.inventory_item_id
   WHERE r.menu_item_id = p_menu_item_id;
  UPDATE public.cafe_menu_items SET cost_cents = v_new_cost
   WHERE id = p_menu_item_id AND cost_cents IS DISTINCT FROM v_new_cost;
END;
$$;

-- Trigger on cafe_recipes: any change recomputes the affected menu item(s).
CREATE OR REPLACE FUNCTION public.tg_cafe_recipes_recompute_cost()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM public.cafe_recompute_menu_item_cost(OLD.menu_item_id);
    RETURN OLD;
  END IF;
  PERFORM public.cafe_recompute_menu_item_cost(NEW.menu_item_id);
  -- If the recipe row moved between menu items, recompute the old target too.
  IF TG_OP = 'UPDATE' AND OLD.menu_item_id IS DISTINCT FROM NEW.menu_item_id THEN
    PERFORM public.cafe_recompute_menu_item_cost(OLD.menu_item_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_recipes_recompute_cost ON public.cafe_recipes;
CREATE TRIGGER cafe_recipes_recompute_cost
  AFTER INSERT OR UPDATE OR DELETE ON public.cafe_recipes
  FOR EACH ROW EXECUTE FUNCTION public.tg_cafe_recipes_recompute_cost();

-- Trigger on cafe_inventory_items: when the unit cost changes, recompute
-- every menu item whose recipe references this ingredient.
CREATE OR REPLACE FUNCTION public.tg_cafe_inv_cost_change_recompute_menus()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE r_id UUID;
BEGIN
  IF NEW.cost_per_unit_cents IS NOT DISTINCT FROM OLD.cost_per_unit_cents THEN
    RETURN NEW;
  END IF;
  FOR r_id IN
    SELECT DISTINCT menu_item_id FROM public.cafe_recipes WHERE inventory_item_id = NEW.id
  LOOP
    PERFORM public.cafe_recompute_menu_item_cost(r_id);
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_inv_cost_change_recompute_menus ON public.cafe_inventory_items;
CREATE TRIGGER cafe_inv_cost_change_recompute_menus
  AFTER UPDATE ON public.cafe_inventory_items
  FOR EACH ROW EXECUTE FUNCTION public.tg_cafe_inv_cost_change_recompute_menus();

-- Backfill: roll up costs for any menu item that already has a recipe.
DO $$
DECLARE m_id UUID;
BEGIN
  FOR m_id IN SELECT DISTINCT menu_item_id FROM public.cafe_recipes LOOP
    PERFORM public.cafe_recompute_menu_item_cost(m_id);
  END LOOP;
END $$;
