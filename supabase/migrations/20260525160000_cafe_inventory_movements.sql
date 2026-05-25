-- Cafe inventory movements — the source of truth for stock-on-hand. Every
-- change to inventory must go through this table; a trigger updates
-- cafe_inventory_items.on_hand_qty accordingly.
--
-- Reasons:
--   received   : new stock arrived (positive qty; updates rolling cost)
--   sold       : auto-deduct from a customer order (negative)
--   wastage    : thrown out (negative)
--   adjust     : manual stocktake correction (can be ± in qty)
--   transfer   : moved between locations / between stores (negative)
--   return     : returned to supplier (negative)
--
-- Use POSITIVE qty for additions, NEGATIVE qty for deductions. The trigger
-- adds NEW.qty_change directly to on_hand_qty.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cafe_movement_reason') THEN
    CREATE TYPE public.cafe_movement_reason AS ENUM (
      'received', 'sold', 'wastage', 'adjust', 'transfer', 'return'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.cafe_inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.cafe_inventory_items(id) ON DELETE CASCADE,

  reason public.cafe_movement_reason NOT NULL,
  qty_change NUMERIC(12,3) NOT NULL CHECK (qty_change <> 0),

  -- Unit cost when this movement happened. Only meaningful for 'received'
  -- but stored on every row so the audit log is self-contained.
  unit_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0),

  -- Optional linkage so an audit can answer "why did this drop?"
  order_id UUID REFERENCES public.cafe_orders(id) ON DELETE SET NULL,
  reference TEXT CHECK (reference IS NULL OR char_length(reference) <= 120),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),

  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_inventory_movements_store_idx
  ON public.cafe_inventory_movements (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cafe_inventory_movements_item_idx
  ON public.cafe_inventory_movements (inventory_item_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cafe_inventory_movements_order_idx
  ON public.cafe_inventory_movements (order_id) WHERE order_id IS NOT NULL;

-- Sync on_hand_qty. For 'received' rows also roll the weighted-average
-- cost so cost_per_unit_cents trends with the latest purchase prices.
CREATE OR REPLACE FUNCTION public.tg_cafe_inventory_movement_apply()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old_qty NUMERIC(12,3);
  v_old_cost INTEGER;
  v_new_qty NUMERIC(12,3);
  v_blended_cost INTEGER;
  v_total_old_value NUMERIC;
  v_added_value NUMERIC;
BEGIN
  IF TG_OP = 'INSERT' THEN
    SELECT on_hand_qty, cost_per_unit_cents INTO v_old_qty, v_old_cost
      FROM public.cafe_inventory_items
      WHERE id = NEW.inventory_item_id
      FOR UPDATE;
    IF v_old_qty IS NULL THEN
      RAISE EXCEPTION 'inventory item not found';
    END IF;
    v_new_qty := v_old_qty + NEW.qty_change;

    IF NEW.reason = 'received' AND NEW.qty_change > 0 AND NEW.unit_cost_cents > 0 AND v_new_qty > 0 THEN
      v_total_old_value := GREATEST(v_old_qty, 0) * v_old_cost;
      v_added_value := NEW.qty_change * NEW.unit_cost_cents;
      v_blended_cost := ROUND((v_total_old_value + v_added_value) / v_new_qty)::INTEGER;
      UPDATE public.cafe_inventory_items
        SET on_hand_qty = v_new_qty,
            cost_per_unit_cents = v_blended_cost,
            updated_at = now()
        WHERE id = NEW.inventory_item_id;
    ELSE
      UPDATE public.cafe_inventory_items
        SET on_hand_qty = v_new_qty,
            updated_at = now()
        WHERE id = NEW.inventory_item_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.cafe_inventory_items
      SET on_hand_qty = on_hand_qty - OLD.qty_change,
          updated_at = now()
      WHERE id = OLD.inventory_item_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS cafe_inventory_movement_apply ON public.cafe_inventory_movements;
CREATE TRIGGER cafe_inventory_movement_apply
  AFTER INSERT OR DELETE ON public.cafe_inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_inventory_movement_apply();

ALTER TABLE public.cafe_inventory_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage cafe inventory movements - all"
  ON public.cafe_inventory_movements
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_inventory_movements.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_inventory_movements.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
