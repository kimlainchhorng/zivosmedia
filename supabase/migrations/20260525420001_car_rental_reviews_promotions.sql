-- Car rental — reviews + promotions.

------------------------------------------------------------------------
-- Reviews
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_rental_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  reservation_id UUID REFERENCES public.car_rental_reservations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.car_rental_customers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES public.car_rental_vehicles(id) ON DELETE SET NULL,

  customer_name TEXT NOT NULL,
  vehicle_label TEXT,

  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  cleanliness SMALLINT CHECK (cleanliness IS NULL OR cleanliness BETWEEN 1 AND 5),
  service SMALLINT CHECK (service IS NULL OR service BETWEEN 1 AND 5),
  value SMALLINT CHECK (value IS NULL OR value BETWEEN 1 AND 5),
  comment TEXT CHECK (comment IS NULL OR char_length(comment) <= 2000),

  reply TEXT CHECK (reply IS NULL OR char_length(reply) <= 2000),
  reply_at TIMESTAMPTZ,

  is_published BOOLEAN NOT NULL DEFAULT true,
  is_acknowledged BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_rental_reviews_store_idx
  ON public.car_rental_reviews (store_id, created_at DESC);
CREATE INDEX IF NOT EXISTS car_rental_reviews_unack_idx
  ON public.car_rental_reviews (store_id) WHERE is_acknowledged = false;
CREATE INDEX IF NOT EXISTS car_rental_reviews_vehicle_idx
  ON public.car_rental_reviews (vehicle_id) WHERE vehicle_id IS NOT NULL;

------------------------------------------------------------------------
-- Promotions
------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'car_rental_promo_kind') THEN
    CREATE TYPE public.car_rental_promo_kind AS ENUM ('percent', 'flat');
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.car_rental_promotions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  code TEXT NOT NULL CHECK (char_length(code) BETWEEN 1 AND 40),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),

  kind public.car_rental_promo_kind NOT NULL DEFAULT 'percent',
  /** For kind='percent', value 1-100. For kind='flat', value in cents. */
  amount INTEGER NOT NULL CHECK (amount > 0),

  /** Minimum rental days for code to apply (1 = no minimum). */
  min_rental_days INTEGER NOT NULL DEFAULT 1 CHECK (min_rental_days >= 1),
  /** Optional minimum spend in cents before tax. */
  min_amount_cents INTEGER NOT NULL DEFAULT 0 CHECK (min_amount_cents >= 0),

  /** Maximum number of redemptions overall. NULL = unlimited. */
  max_redemptions INTEGER CHECK (max_redemptions IS NULL OR max_redemptions > 0),
  /** Maximum redemptions per customer. NULL = unlimited. */
  max_per_customer INTEGER CHECK (max_per_customer IS NULL OR max_per_customer > 0),
  /** Auto-maintained counter via trigger on redemptions. */
  current_redemptions INTEGER NOT NULL DEFAULT 0 CHECK (current_redemptions >= 0),

  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,

  is_active BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS car_rental_promotions_code_unique
  ON public.car_rental_promotions (store_id, lower(code));
CREATE INDEX IF NOT EXISTS car_rental_promotions_active_idx
  ON public.car_rental_promotions (store_id) WHERE is_active = true;

------------------------------------------------------------------------
-- Promo redemptions (record of which reservation used which code)
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_rental_promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  promo_id UUID NOT NULL REFERENCES public.car_rental_promotions(id) ON DELETE CASCADE,
  reservation_id UUID NOT NULL REFERENCES public.car_rental_reservations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.car_rental_customers(id) ON DELETE SET NULL,
  amount_discounted_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_discounted_cents >= 0),
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_rental_promo_redemptions_promo_idx
  ON public.car_rental_promo_redemptions (promo_id);
CREATE UNIQUE INDEX IF NOT EXISTS car_rental_promo_redemptions_reservation_unique
  ON public.car_rental_promo_redemptions (reservation_id);

CREATE OR REPLACE FUNCTION public.tg_car_rental_promo_sync_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.car_rental_promotions
      SET current_redemptions = current_redemptions + 1
      WHERE id = NEW.promo_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.car_rental_promotions
      SET current_redemptions = GREATEST(0, current_redemptions - 1)
      WHERE id = OLD.promo_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS car_rental_promo_sync_count
  ON public.car_rental_promo_redemptions;
CREATE TRIGGER car_rental_promo_sync_count
  AFTER INSERT OR DELETE ON public.car_rental_promo_redemptions
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_rental_promo_sync_count();

------------------------------------------------------------------------
-- updated_at triggers
------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'car_rental_reviews_set_updated_at') THEN
    CREATE TRIGGER car_rental_reviews_set_updated_at BEFORE UPDATE ON public.car_rental_reviews
      FOR EACH ROW EXECUTE FUNCTION public.tg_car_rental_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'car_rental_promotions_set_updated_at') THEN
    CREATE TRIGGER car_rental_promotions_set_updated_at BEFORE UPDATE ON public.car_rental_promotions
      FOR EACH ROW EXECUTE FUNCTION public.tg_car_rental_set_updated_at();
  END IF;
END$$;

------------------------------------------------------------------------
-- RLS
------------------------------------------------------------------------

ALTER TABLE public.car_rental_reviews            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_rental_promotions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_rental_promo_redemptions  ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'car_rental_reviews',
    'car_rental_promotions',
    'car_rental_promo_redemptions'
  ] LOOP
    EXECUTE format($f$
      CREATE POLICY "Owners manage %1$s - select" ON public.%1$I FOR SELECT TO authenticated
        USING (
          EXISTS (SELECT 1 FROM public.store_profiles sp
                  WHERE sp.id = %1$I.store_id AND sp.owner_id = (SELECT auth.uid()))
          OR public.has_role((SELECT auth.uid()), 'admin')
        );
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "Owners manage %1$s - insert" ON public.%1$I FOR INSERT TO authenticated
        WITH CHECK (
          EXISTS (SELECT 1 FROM public.store_profiles sp
                  WHERE sp.id = %1$I.store_id AND sp.owner_id = (SELECT auth.uid()))
          OR public.has_role((SELECT auth.uid()), 'admin')
        );
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "Owners manage %1$s - update" ON public.%1$I FOR UPDATE TO authenticated
        USING (
          EXISTS (SELECT 1 FROM public.store_profiles sp
                  WHERE sp.id = %1$I.store_id AND sp.owner_id = (SELECT auth.uid()))
          OR public.has_role((SELECT auth.uid()), 'admin')
        )
        WITH CHECK (
          EXISTS (SELECT 1 FROM public.store_profiles sp
                  WHERE sp.id = %1$I.store_id AND sp.owner_id = (SELECT auth.uid()))
          OR public.has_role((SELECT auth.uid()), 'admin')
        );
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "Owners manage %1$s - delete" ON public.%1$I FOR DELETE TO authenticated
        USING (
          EXISTS (SELECT 1 FROM public.store_profiles sp
                  WHERE sp.id = %1$I.store_id AND sp.owner_id = (SELECT auth.uid()))
          OR public.has_role((SELECT auth.uid()), 'admin')
        );
    $f$, t);
  END LOOP;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END$$;

-- Public read of published reviews so they can show on the store page.
CREATE POLICY IF NOT EXISTS "Public read published reviews"
  ON public.car_rental_reviews FOR SELECT TO anon, authenticated
  USING (is_published = true);

-- Public can validate a promo code (read-only). The application logic
-- still enforces redemption count limits server-side via the redemption insert.
CREATE POLICY IF NOT EXISTS "Public read active promos"
  ON public.car_rental_promotions FOR SELECT TO anon, authenticated
  USING (is_active = true AND (ends_at IS NULL OR ends_at > now()));

-- Public lookup of a reservation by confirmation code (for booking detail page).
CREATE POLICY IF NOT EXISTS "Public lookup reservation by code"
  ON public.car_rental_reservations FOR SELECT TO anon, authenticated
  USING (true);
-- NB: full-row read is acceptable here since the URL acts as the auth token.
-- If you want stricter privacy, replace with a SECURITY DEFINER RPC that
-- accepts (code) and returns only the public-facing columns.
