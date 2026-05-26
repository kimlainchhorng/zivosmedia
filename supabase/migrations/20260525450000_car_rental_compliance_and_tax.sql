-- Car rental — vehicle compliance, store tax, damage marks, license back photo.

------------------------------------------------------------------------
-- Vehicle compliance: registration / insurance / inspection expirations
------------------------------------------------------------------------

ALTER TABLE public.car_rental_vehicles
  ADD COLUMN IF NOT EXISTS registration_expires_at DATE,
  ADD COLUMN IF NOT EXISTS insurance_expires_at DATE,
  ADD COLUMN IF NOT EXISTS inspection_due_at DATE,
  ADD COLUMN IF NOT EXISTS registration_number TEXT,
  ADD COLUMN IF NOT EXISTS insurance_provider TEXT,
  ADD COLUMN IF NOT EXISTS insurance_policy_number TEXT;

CREATE INDEX IF NOT EXISTS car_rental_vehicles_compliance_idx
  ON public.car_rental_vehicles (store_id, registration_expires_at)
  WHERE is_active = true;

------------------------------------------------------------------------
-- Damage marks on reservations (returned vehicles)
-- JSONB array of { x: 0-100, y: 0-100, severity: 'minor'|'major', note?: string }
------------------------------------------------------------------------

ALTER TABLE public.car_rental_reservations
  ADD COLUMN IF NOT EXISTS damage_marks JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'car_rental_reservations_damage_marks_is_array'
  ) THEN
    ALTER TABLE public.car_rental_reservations
      ADD CONSTRAINT car_rental_reservations_damage_marks_is_array
      CHECK (jsonb_typeof(damage_marks) = 'array');
  END IF;
END$$;

------------------------------------------------------------------------
-- Store-level car-rental settings (tax rate, currency, etc.)
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_rental_settings (
  store_id UUID PRIMARY KEY REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  /** Tax rate in basis points (10000 = 100%). 875 = 8.75% sales tax. */
  tax_rate_bps INTEGER NOT NULL DEFAULT 0 CHECK (tax_rate_bps BETWEEN 0 AND 10000),
  tax_label TEXT NOT NULL DEFAULT 'Tax',
  currency_code CHAR(3) NOT NULL DEFAULT 'USD',
  /** Hours past pickup_at after which we suggest flipping pending → no_show. */
  no_show_grace_hours INTEGER NOT NULL DEFAULT 4 CHECK (no_show_grace_hours BETWEEN 0 AND 72),
  /** Whether new app-source bookings auto-confirm or stay pending until owner approval. */
  auto_confirm_app_bookings BOOLEAN NOT NULL DEFAULT false,
  /** Hours of free grace before late-return fees kick in. */
  late_grace_hours INTEGER NOT NULL DEFAULT 12 CHECK (late_grace_hours BETWEEN 0 AND 48),
  cancellation_policy TEXT CHECK (cancellation_policy IS NULL OR char_length(cancellation_policy) <= 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'car_rental_settings_set_updated_at') THEN
    CREATE TRIGGER car_rental_settings_set_updated_at BEFORE UPDATE ON public.car_rental_settings
      FOR EACH ROW EXECUTE FUNCTION public.tg_car_rental_set_updated_at();
  END IF;
END$$;

ALTER TABLE public.car_rental_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  EXECUTE $f$
    CREATE POLICY "Owners manage car-rental settings - all" ON public.car_rental_settings
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.store_profiles sp
                WHERE sp.id = car_rental_settings.store_id AND sp.owner_id = (SELECT auth.uid()))
        OR public.has_role((SELECT auth.uid()), 'admin')
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.store_profiles sp
                WHERE sp.id = car_rental_settings.store_id AND sp.owner_id = (SELECT auth.uid()))
        OR public.has_role((SELECT auth.uid()), 'admin')
      );
  $f$;
EXCEPTION WHEN duplicate_object THEN NULL;
END$$;

CREATE POLICY IF NOT EXISTS "Public read car-rental settings"
  ON public.car_rental_settings FOR SELECT TO anon, authenticated
  USING (true);
-- Tax rate is non-sensitive and needed by the public booking flow.

------------------------------------------------------------------------
-- Customer: driver license back photo
------------------------------------------------------------------------

ALTER TABLE public.car_rental_customers
  ADD COLUMN IF NOT EXISTS driver_license_photo_back_url TEXT;
