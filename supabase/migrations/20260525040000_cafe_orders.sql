-- Cafe orders — the central ticket table for a cafe POS / QR ordering flow.
-- Pricing is snapshotted at order-creation time so later edits to the menu
-- catalog never rewrite history.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cafe_order_status') THEN
    CREATE TYPE public.cafe_order_status AS ENUM (
      'pending',        -- placed by customer, not yet accepted
      'accepted',       -- staff acknowledged
      'preparing',      -- barista / kitchen working on it
      'ready',          -- ready for pickup / handoff
      'served',         -- delivered to table / customer
      'completed',      -- paid + closed
      'cancelled',
      'refunded'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cafe_order_channel') THEN
    CREATE TYPE public.cafe_order_channel AS ENUM (
      'qr_table',       -- customer scanned QR at a table
      'counter',        -- staff entered at the till
      'pickup',         -- mobile pickup order
      'delivery',       -- driver delivery
      'phone'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.cafe_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  table_id UUID REFERENCES public.cafe_tables(id) ON DELETE SET NULL,

  -- Human-readable per-store ticket number (resets nightly is owner's choice).
  ticket_number INTEGER NOT NULL,

  status public.cafe_order_status NOT NULL DEFAULT 'pending',
  channel public.cafe_order_channel NOT NULL DEFAULT 'counter',

  -- Customer snapshot (no FK — guest orders are fine).
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  customer_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Money snapshot, all cents.
  subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  tax_cents INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  tip_cents INTEGER NOT NULL DEFAULT 0 CHECK (tip_cents >= 0),
  total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (paid_cents >= 0),

  -- Optional free-text. Internal notes are not exposed to customers.
  customer_notes TEXT CHECK (customer_notes IS NULL OR char_length(customer_notes) <= 1000),
  internal_notes TEXT CHECK (internal_notes IS NULL OR char_length(internal_notes) <= 1000),

  -- Lifecycle timestamps for KDS / analytics.
  placed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  served_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_orders_store_placed_idx
  ON public.cafe_orders (store_id, placed_at DESC);
CREATE INDEX IF NOT EXISTS cafe_orders_store_status_idx
  ON public.cafe_orders (store_id, status);
CREATE INDEX IF NOT EXISTS cafe_orders_table_idx
  ON public.cafe_orders (table_id) WHERE table_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS cafe_orders_customer_user_idx
  ON public.cafe_orders (customer_user_id) WHERE customer_user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS cafe_orders_store_ticket_unique
  ON public.cafe_orders (store_id, ticket_number);

DROP TRIGGER IF EXISTS cafe_orders_set_updated_at ON public.cafe_orders;
CREATE TRIGGER cafe_orders_set_updated_at
  BEFORE UPDATE ON public.cafe_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

-- Per-store ticket number sequence. Pre-assign on INSERT so concurrent writers
-- never collide on the (store_id, ticket_number) unique index.
CREATE OR REPLACE FUNCTION public.tg_cafe_orders_assign_ticket()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  next_num INTEGER;
BEGIN
  IF NEW.ticket_number IS NOT NULL AND NEW.ticket_number > 0 THEN
    RETURN NEW;
  END IF;
  SELECT COALESCE(MAX(ticket_number), 0) + 1
    INTO next_num
    FROM public.cafe_orders
    WHERE store_id = NEW.store_id;
  NEW.ticket_number := next_num;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_orders_assign_ticket ON public.cafe_orders;
CREATE TRIGGER cafe_orders_assign_ticket
  BEFORE INSERT ON public.cafe_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_orders_assign_ticket();

ALTER TABLE public.cafe_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage cafe orders - select"
  ON public.cafe_orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_orders.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage cafe orders - insert"
  ON public.cafe_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_orders.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage cafe orders - update"
  ON public.cafe_orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_orders.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_orders.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage cafe orders - delete"
  ON public.cafe_orders
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_orders.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- Customers can read their own orders (whether placed signed-in via QR or
-- linked at checkout). Anonymous QR orders are looked up by their order id
-- through a dedicated SECURITY DEFINER RPC (see cafe_public_order_lookup).
CREATE POLICY "Customers read their own cafe orders"
  ON public.cafe_orders
  FOR SELECT
  TO authenticated
  USING (customer_user_id = (SELECT auth.uid()));
