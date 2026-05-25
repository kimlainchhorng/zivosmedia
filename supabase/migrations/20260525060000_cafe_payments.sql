-- Cafe order payments — split-tender friendly (cash + card on one ticket).
-- Updating cafe_orders.paid_cents is handled by a trigger so callers only
-- need to insert/refund here.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cafe_payment_method') THEN
    CREATE TYPE public.cafe_payment_method AS ENUM (
      'cash',
      'card',
      'qr',          -- KHQR / generic merchant QR
      'wallet',      -- in-app credit / wallet balance
      'gift_card',
      'other'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cafe_payment_status') THEN
    CREATE TYPE public.cafe_payment_status AS ENUM (
      'pending',
      'authorized',
      'captured',
      'refunded',
      'voided',
      'failed'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.cafe_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.cafe_orders(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  method public.cafe_payment_method NOT NULL,
  status public.cafe_payment_status NOT NULL DEFAULT 'captured',

  amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
  tip_cents INTEGER NOT NULL DEFAULT 0 CHECK (tip_cents >= 0),
  -- Positive for refunds; tracked separately so reports keep gross + net split.
  refunded_cents INTEGER NOT NULL DEFAULT 0 CHECK (refunded_cents >= 0),

  -- Free-form details: e.g. last4 for card, KHQR receipt id, wallet txn id.
  reference TEXT CHECK (reference IS NULL OR char_length(reference) <= 120),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),

  taken_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_payments_order_idx
  ON public.cafe_payments (order_id);
CREATE INDEX IF NOT EXISTS cafe_payments_store_created_idx
  ON public.cafe_payments (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS cafe_payments_method_idx
  ON public.cafe_payments (store_id, method);

DROP TRIGGER IF EXISTS cafe_payments_set_updated_at ON public.cafe_payments;
CREATE TRIGGER cafe_payments_set_updated_at
  BEFORE UPDATE ON public.cafe_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

-- Keep cafe_orders.paid_cents in sync. paid = sum(captured amount - refunded).
CREATE OR REPLACE FUNCTION public.tg_cafe_payments_sync_order_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
  new_paid INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_id := OLD.order_id;
  ELSE
    target_id := NEW.order_id;
  END IF;

  SELECT COALESCE(SUM(
    CASE
      WHEN status IN ('captured', 'authorized') THEN amount_cents - refunded_cents
      ELSE 0
    END
  ), 0)
    INTO new_paid
    FROM public.cafe_payments
    WHERE order_id = target_id;

  UPDATE public.cafe_orders
    SET paid_cents = new_paid
    WHERE id = target_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS cafe_payments_sync_order_paid ON public.cafe_payments;
CREATE TRIGGER cafe_payments_sync_order_paid
  AFTER INSERT OR UPDATE OR DELETE ON public.cafe_payments
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_payments_sync_order_paid();

ALTER TABLE public.cafe_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage cafe payments - all"
  ON public.cafe_payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_payments.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = cafe_payments.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Customers read payments on their own orders"
  ON public.cafe_payments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cafe_orders o
      WHERE o.id = cafe_payments.order_id
        AND o.customer_user_id = (SELECT auth.uid())
    )
  );
