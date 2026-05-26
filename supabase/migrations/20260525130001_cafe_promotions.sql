-- Cafe promotions — discounts that apply at checkout. Two kinds:
--   • percent   : % off the order subtotal (1–100)
--   • fixed_cents : a flat amount off (in cents)
--
-- A promo is active during [start_at, end_at) for the listed weekdays/hours.
-- An optional `code` makes it a coupon (entered at checkout); otherwise it
-- auto-applies when the conditions are met.
--
-- Per-promo redemption counters are owned by the till and incremented from
-- the app, not via a DB trigger — keeping the schema flexible for future
-- "use once per customer" rules without forcing the data model now.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cafe_promo_kind') THEN
    CREATE TYPE public.cafe_promo_kind AS ENUM ('percent', 'fixed_cents');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.cafe_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),

  kind public.cafe_promo_kind NOT NULL,
  -- Percent: 1–100; fixed: cents (>0).
  amount INTEGER NOT NULL CHECK (amount > 0),

  -- Optional customer-typed code (e.g. "HAPPY10"). When NULL the promo
  -- auto-applies when active.
  code TEXT,

  -- Time window. NULL = open-ended.
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  CONSTRAINT cafe_promotions_window CHECK (start_at IS NULL OR end_at IS NULL OR end_at > start_at),

  -- Day-of-week filter (0=Sun..6=Sat). Empty array = every day.
  weekdays SMALLINT[] NOT NULL DEFAULT '{}',
  -- Hour-of-day window (0..23 inclusive). When both NULL → all hours.
  hour_start SMALLINT CHECK (hour_start IS NULL OR hour_start BETWEEN 0 AND 23),
  hour_end SMALLINT CHECK (hour_end IS NULL OR hour_end BETWEEN 0 AND 23),

  -- Optional min order subtotal in cents.
  min_subtotal_cents INTEGER NOT NULL DEFAULT 0 CHECK (min_subtotal_cents >= 0),

  -- Optional cap on total redemptions across the cafe.
  max_redemptions INTEGER CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  redemption_count INTEGER NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),

  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_promotions_store_idx
  ON public.cafe_promotions (store_id, sort_order);
CREATE INDEX IF NOT EXISTS cafe_promotions_active_idx
  ON public.cafe_promotions (store_id) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS cafe_promotions_store_code_unique
  ON public.cafe_promotions (store_id, upper(code)) WHERE code IS NOT NULL;

DROP TRIGGER IF EXISTS cafe_promotions_set_updated_at ON public.cafe_promotions;
CREATE TRIGGER cafe_promotions_set_updated_at
  BEFORE UPDATE ON public.cafe_promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

ALTER TABLE public.cafe_promotions ENABLE ROW LEVEL SECURITY;

-- Public can read active promos so the storefront can show them.
CREATE POLICY "Public reads active cafe promotions"
  ON public.cafe_promotions
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_promotions.store_id AND sp.is_active = true)
  );

CREATE POLICY "Owners manage cafe promotions - all"
  ON public.cafe_promotions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_promotions.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_promotions.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
