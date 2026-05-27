-- Cafe order line items + per-line modifier snapshots.
-- Each item snapshots its name, base price and chosen modifiers so the order
-- prints exactly as placed even if the menu changes later.

CREATE TABLE IF NOT EXISTS public.cafe_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.cafe_orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.cafe_menu_items(id) ON DELETE SET NULL,

  -- Snapshot of the menu item at order time.
  item_name TEXT NOT NULL CHECK (char_length(item_name) BETWEEN 1 AND 120),
  unit_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 99),

  -- Sum of all modifier price deltas for this line (snapshotted).
  modifiers_total_cents INTEGER NOT NULL DEFAULT 0 CHECK (modifiers_total_cents >= 0),

  -- Computed line total = (unit_price + modifiers_total) * quantity. Stored
  -- so reports & receipt printing don't need to recompute repeatedly.
  line_total_cents INTEGER NOT NULL DEFAULT 0 CHECK (line_total_cents >= 0),

  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),

  -- KDS station hint, e.g., "bar", "kitchen", "pastry".
  station TEXT CHECK (station IS NULL OR char_length(station) <= 40),

  -- Per-line fulfillment so a single item can be marked ready ahead of others.
  fulfilled_at TIMESTAMPTZ,

  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_order_items_order_idx
  ON public.cafe_order_items (order_id, sort_order);
CREATE INDEX IF NOT EXISTS cafe_order_items_store_idx
  ON public.cafe_order_items (store_id);
CREATE INDEX IF NOT EXISTS cafe_order_items_menu_idx
  ON public.cafe_order_items (menu_item_id) WHERE menu_item_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.cafe_order_item_modifiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id UUID NOT NULL REFERENCES public.cafe_order_items(id) ON DELETE CASCADE,
  modifier_id UUID REFERENCES public.cafe_modifiers(id) ON DELETE SET NULL,
  group_id UUID REFERENCES public.cafe_modifier_groups(id) ON DELETE SET NULL,

  -- Snapshots so receipts survive catalog edits.
  group_name TEXT NOT NULL CHECK (char_length(group_name) BETWEEN 1 AND 60),
  modifier_name TEXT NOT NULL CHECK (char_length(modifier_name) BETWEEN 1 AND 60),
  price_delta_cents INTEGER NOT NULL DEFAULT 0,

  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_order_item_modifiers_item_idx
  ON public.cafe_order_item_modifiers (order_item_id, sort_order);

DROP TRIGGER IF EXISTS cafe_order_items_set_updated_at ON public.cafe_order_items;
CREATE TRIGGER cafe_order_items_set_updated_at
  BEFORE UPDATE ON public.cafe_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

-- Keep line_total_cents consistent with the inputs without forcing callers to
-- compute it. (Caller-supplied values are ignored; the trigger always wins.)
CREATE OR REPLACE FUNCTION public.tg_cafe_order_items_compute_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.line_total_cents := (NEW.unit_price_cents + NEW.modifiers_total_cents) * NEW.quantity;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_order_items_compute_total ON public.cafe_order_items;
CREATE TRIGGER cafe_order_items_compute_total
  BEFORE INSERT OR UPDATE OF unit_price_cents, modifiers_total_cents, quantity ON public.cafe_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_order_items_compute_total();

-- After any item changes, refresh the parent order's subtotal/total snapshots
-- so the orders list always shows the current ticket value.
CREATE OR REPLACE FUNCTION public.tg_cafe_recalc_order_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
  new_subtotal INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_id := OLD.order_id;
  ELSE
    target_id := NEW.order_id;
  END IF;

  SELECT COALESCE(SUM(line_total_cents), 0)
    INTO new_subtotal
    FROM public.cafe_order_items
    WHERE order_id = target_id;

  UPDATE public.cafe_orders
    SET subtotal_cents = new_subtotal,
        total_cents = GREATEST(new_subtotal - discount_cents, 0) + tax_cents + tip_cents
    WHERE id = target_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS cafe_order_items_recalc_totals ON public.cafe_order_items;
CREATE TRIGGER cafe_order_items_recalc_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.cafe_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_recalc_order_totals();

ALTER TABLE public.cafe_order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_order_item_modifiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage cafe order items - all"
  ON public.cafe_order_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_order_items.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_order_items.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Customers read items on their own orders"
  ON public.cafe_order_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cafe_orders o
      WHERE o.id = cafe_order_items.order_id
        AND o.customer_user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Owners manage cafe order item modifiers - all"
  ON public.cafe_order_item_modifiers
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cafe_order_items oi
      JOIN public.store_profiles sp ON sp.id = oi.store_id
      WHERE oi.id = cafe_order_item_modifiers.order_item_id
        AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.cafe_order_items oi
      JOIN public.store_profiles sp ON sp.id = oi.store_id
      WHERE oi.id = cafe_order_item_modifiers.order_item_id
        AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
    )
  );

CREATE POLICY "Customers read modifiers on their own orders"
  ON public.cafe_order_item_modifiers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cafe_order_items oi
      JOIN public.cafe_orders o ON o.id = oi.order_id
      WHERE oi.id = cafe_order_item_modifiers.order_item_id
        AND o.customer_user_id = (SELECT auth.uid())
    )
  );
