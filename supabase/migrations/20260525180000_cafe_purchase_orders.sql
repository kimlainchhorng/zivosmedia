-- Cafe purchase orders + line items.
-- Lifecycle: draft → sent → (partial → ) received | cancelled.
-- Receiving is per-line: incrementing qty_received fires a trigger that
-- inserts a matching cafe_inventory_movement row (reason='received'),
-- which in turn updates on_hand_qty and the rolling weighted cost.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cafe_po_status') THEN
    CREATE TYPE public.cafe_po_status AS ENUM (
      'draft', 'sent', 'partial', 'received', 'cancelled'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.cafe_purchase_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES public.cafe_suppliers(id) ON DELETE SET NULL,

  -- Auto-assigned per-store PO number.
  po_number INTEGER NOT NULL,

  status public.cafe_po_status NOT NULL DEFAULT 'draft',
  expected_at DATE,
  sent_at TIMESTAMPTZ,
  received_at TIMESTAMPTZ,

  -- Snapshot totals; updated by trigger when lines change.
  subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  tax_cents INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  shipping_cents INTEGER NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),

  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),

  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_purchase_orders_store_idx
  ON public.cafe_purchase_orders (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cafe_purchase_orders_status_idx
  ON public.cafe_purchase_orders (store_id, status);
CREATE INDEX IF NOT EXISTS cafe_purchase_orders_supplier_idx
  ON public.cafe_purchase_orders (supplier_id) WHERE supplier_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cafe_purchase_orders_store_number_unique
  ON public.cafe_purchase_orders (store_id, po_number);

DROP TRIGGER IF EXISTS cafe_purchase_orders_set_updated_at ON public.cafe_purchase_orders;
CREATE TRIGGER cafe_purchase_orders_set_updated_at
  BEFORE UPDATE ON public.cafe_purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

CREATE OR REPLACE FUNCTION public.tg_cafe_po_assign_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE next_num INTEGER;
BEGIN
  IF NEW.po_number IS NOT NULL AND NEW.po_number > 0 THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(MAX(po_number), 0) + 1 INTO next_num
    FROM public.cafe_purchase_orders WHERE store_id = NEW.store_id;
  NEW.po_number := next_num;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS cafe_po_assign_number ON public.cafe_purchase_orders;
CREATE TRIGGER cafe_po_assign_number
  BEFORE INSERT ON public.cafe_purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_po_assign_number();

CREATE TABLE IF NOT EXISTS public.cafe_purchase_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id UUID NOT NULL REFERENCES public.cafe_purchase_orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  inventory_item_id UUID NOT NULL REFERENCES public.cafe_inventory_items(id) ON DELETE SET NULL,

  -- Snapshot name + unit at PO time so receipts survive catalog edits.
  item_name TEXT NOT NULL CHECK (char_length(item_name) BETWEEN 1 AND 120),
  unit TEXT NOT NULL,

  qty_ordered NUMERIC(12,3) NOT NULL CHECK (qty_ordered > 0),
  qty_received NUMERIC(12,3) NOT NULL DEFAULT 0 CHECK (qty_received >= 0),
  unit_cost_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_cost_cents >= 0),
  line_total_cents INTEGER NOT NULL DEFAULT 0 CHECK (line_total_cents >= 0),

  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_purchase_order_items_po_idx
  ON public.cafe_purchase_order_items (purchase_order_id, sort_order);
CREATE INDEX IF NOT EXISTS cafe_purchase_order_items_store_idx
  ON public.cafe_purchase_order_items (store_id);
CREATE INDEX IF NOT EXISTS cafe_purchase_order_items_inv_idx
  ON public.cafe_purchase_order_items (inventory_item_id) WHERE inventory_item_id IS NOT NULL;

DROP TRIGGER IF EXISTS cafe_purchase_order_items_set_updated_at ON public.cafe_purchase_order_items;
CREATE TRIGGER cafe_purchase_order_items_set_updated_at
  BEFORE UPDATE ON public.cafe_purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

-- line_total_cents = qty_ordered * unit_cost_cents (snapshot of order plan).
CREATE OR REPLACE FUNCTION public.tg_cafe_po_items_compute_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.line_total_cents := ROUND(NEW.qty_ordered * NEW.unit_cost_cents)::INTEGER;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS cafe_po_items_compute_total ON public.cafe_purchase_order_items;
CREATE TRIGGER cafe_po_items_compute_total
  BEFORE INSERT OR UPDATE OF qty_ordered, unit_cost_cents ON public.cafe_purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_po_items_compute_total();

-- Refresh the PO header's subtotal/total from its items.
CREATE OR REPLACE FUNCTION public.tg_cafe_po_recalc_header()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
  new_sub INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN target_id := OLD.purchase_order_id;
  ELSE target_id := NEW.purchase_order_id;
  END IF;
  SELECT COALESCE(SUM(line_total_cents), 0) INTO new_sub
    FROM public.cafe_purchase_order_items WHERE purchase_order_id = target_id;
  UPDATE public.cafe_purchase_orders
    SET subtotal_cents = new_sub,
        total_cents = new_sub + tax_cents + shipping_cents
    WHERE id = target_id;
  RETURN COALESCE(NEW, OLD);
END;$$;
DROP TRIGGER IF EXISTS cafe_po_items_recalc_header ON public.cafe_purchase_order_items;
CREATE TRIGGER cafe_po_items_recalc_header
  AFTER INSERT OR UPDATE OR DELETE ON public.cafe_purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_po_recalc_header();

-- When qty_received grows, push the delta into cafe_inventory_movements so
-- stock auto-syncs. Triggers cascade: that movement's own trigger updates
-- on_hand_qty and the rolling weighted cost.
CREATE OR REPLACE FUNCTION public.tg_cafe_po_items_post_receive()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_delta NUMERIC(12,3);
BEGIN
  v_delta := NEW.qty_received - COALESCE(OLD.qty_received, 0);
  IF v_delta > 0 AND NEW.inventory_item_id IS NOT NULL THEN
    INSERT INTO public.cafe_inventory_movements (
      store_id, inventory_item_id, reason, qty_change, unit_cost_cents,
      reference, notes
    ) VALUES (
      NEW.store_id, NEW.inventory_item_id, 'received', v_delta, NEW.unit_cost_cents,
      'PO ' || (SELECT po_number::TEXT FROM public.cafe_purchase_orders WHERE id = NEW.purchase_order_id),
      NULL
    );
  END IF;
  RETURN NEW;
END;$$;
DROP TRIGGER IF EXISTS cafe_po_items_post_receive ON public.cafe_purchase_order_items;
CREATE TRIGGER cafe_po_items_post_receive
  AFTER UPDATE OF qty_received ON public.cafe_purchase_order_items
  FOR EACH ROW
  WHEN (NEW.qty_received > COALESCE(OLD.qty_received, 0))
  EXECUTE FUNCTION public.tg_cafe_po_items_post_receive();

-- When every line is fully received, flip the PO header to 'received';
-- when at least one line has any received qty but not all, mark 'partial'.
CREATE OR REPLACE FUNCTION public.tg_cafe_po_items_sync_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_po_id UUID;
  v_total NUMERIC; v_received NUMERIC;
BEGIN
  v_po_id := COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  SELECT COALESCE(SUM(qty_ordered), 0), COALESCE(SUM(qty_received), 0)
    INTO v_total, v_received
    FROM public.cafe_purchase_order_items
    WHERE purchase_order_id = v_po_id;
  IF v_total = 0 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF v_received >= v_total THEN
    UPDATE public.cafe_purchase_orders
      SET status = 'received', received_at = COALESCE(received_at, now())
      WHERE id = v_po_id AND status <> 'cancelled';
  ELSIF v_received > 0 THEN
    UPDATE public.cafe_purchase_orders
      SET status = 'partial'
      WHERE id = v_po_id AND status IN ('sent', 'partial');
  END IF;
  RETURN COALESCE(NEW, OLD);
END;$$;
DROP TRIGGER IF EXISTS cafe_po_items_sync_status ON public.cafe_purchase_order_items;
CREATE TRIGGER cafe_po_items_sync_status
  AFTER UPDATE OF qty_received ON public.cafe_purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_po_items_sync_status();

ALTER TABLE public.cafe_purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cafe_purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage cafe POs - all"
  ON public.cafe_purchase_orders
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_purchase_orders.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_purchase_orders.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage cafe PO items - all"
  ON public.cafe_purchase_order_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_purchase_order_items.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_purchase_order_items.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
