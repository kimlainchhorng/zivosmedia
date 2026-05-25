-- Cafe inventory items — the raw stock the cafe buys (beans, milk, cups,
-- syrups). on_hand_qty is updated by triggers on cafe_inventory_movements
-- so direct UPDATEs by the app aren't required.
--
-- Quantity is a numeric (3 decimals) because some items are weight-based
-- (kg of beans) and others count (number of cups). The UI converts via
-- the chosen unit label.

CREATE TABLE IF NOT EXISTS public.cafe_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  sku TEXT CHECK (sku IS NULL OR char_length(sku) <= 40),
  category TEXT CHECK (category IS NULL OR char_length(category) <= 40),
  unit TEXT NOT NULL DEFAULT 'unit' CHECK (char_length(unit) BETWEEN 1 AND 12),

  on_hand_qty NUMERIC(12,3) NOT NULL DEFAULT 0,
  low_stock_threshold NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (low_stock_threshold >= 0),

  -- Average unit cost in cents (rolling). Updated on receive via the
  -- movement trigger (weighted by quantity).
  cost_per_unit_cents INTEGER NOT NULL DEFAULT 0 CHECK (cost_per_unit_cents >= 0),

  -- Optional default supplier (free-text for now; a separate
  -- cafe_suppliers table comes with the Purchasing tab in a later phase).
  default_supplier TEXT,

  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_inventory_items_store_idx
  ON public.cafe_inventory_items (store_id, sort_order);
CREATE INDEX IF NOT EXISTS cafe_inventory_items_low_stock_idx
  ON public.cafe_inventory_items (store_id) WHERE is_active = true AND on_hand_qty <= low_stock_threshold;
CREATE UNIQUE INDEX IF NOT EXISTS cafe_inventory_items_store_sku_unique
  ON public.cafe_inventory_items (store_id, upper(sku)) WHERE sku IS NOT NULL;

DROP TRIGGER IF EXISTS cafe_inventory_items_set_updated_at ON public.cafe_inventory_items;
CREATE TRIGGER cafe_inventory_items_set_updated_at
  BEFORE UPDATE ON public.cafe_inventory_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

ALTER TABLE public.cafe_inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage cafe inventory items - all"
  ON public.cafe_inventory_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_inventory_items.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_inventory_items.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
