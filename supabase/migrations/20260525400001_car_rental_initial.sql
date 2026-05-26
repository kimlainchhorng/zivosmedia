-- Car Rental module — initial schema.
-- Mirrors the salon module pattern: store-scoped tables, owner-only RLS,
-- snapshots of catalog fields on each reservation so later edits to vehicles
-- or rates don't rewrite history.

CREATE EXTENSION IF NOT EXISTS btree_gist;

------------------------------------------------------------------------
-- Enums
------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'car_rental_reservation_status') THEN
    CREATE TYPE public.car_rental_reservation_status AS ENUM (
      'pending',
      'confirmed',
      'picked_up',
      'returned',
      'cancelled',
      'no_show'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'car_rental_vehicle_status') THEN
    CREATE TYPE public.car_rental_vehicle_status AS ENUM (
      'available',
      'rented',
      'maintenance',
      'retired'
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'car_rental_transmission') THEN
    CREATE TYPE public.car_rental_transmission AS ENUM ('automatic', 'manual');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'car_rental_fuel') THEN
    CREATE TYPE public.car_rental_fuel AS ENUM ('gasoline', 'diesel', 'hybrid', 'electric');
  END IF;
END$$;

------------------------------------------------------------------------
-- Locations (pickup / dropoff branches)
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_rental_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,
  latitude NUMERIC(9, 6),
  longitude NUMERIC(9, 6),
  phone TEXT,
  open_time TIME,
  close_time TIME,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_rental_locations_store_idx
  ON public.car_rental_locations (store_id) WHERE is_active;

------------------------------------------------------------------------
-- Vehicles (the fleet)
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_rental_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  home_location_id UUID REFERENCES public.car_rental_locations(id) ON DELETE SET NULL,

  -- Vehicle identity
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER CHECK (year IS NULL OR year BETWEEN 1900 AND 2100),
  color TEXT,
  license_plate TEXT,
  vin TEXT,

  -- Classification
  category TEXT NOT NULL DEFAULT 'standard'
    CHECK (category IN ('economy', 'compact', 'standard', 'fullsize', 'suv', 'minivan', 'truck', 'luxury', 'convertible', 'sports')),
  transmission public.car_rental_transmission NOT NULL DEFAULT 'automatic',
  fuel_type public.car_rental_fuel NOT NULL DEFAULT 'gasoline',
  seats INTEGER NOT NULL DEFAULT 5 CHECK (seats BETWEEN 1 AND 20),
  doors INTEGER NOT NULL DEFAULT 4 CHECK (doors BETWEEN 1 AND 10),
  luggage_capacity INTEGER NOT NULL DEFAULT 2 CHECK (luggage_capacity >= 0),
  air_conditioning BOOLEAN NOT NULL DEFAULT true,

  -- Pricing (the default; rate rows override per-vehicle)
  daily_rate_cents INTEGER NOT NULL DEFAULT 0 CHECK (daily_rate_cents >= 0),
  weekly_rate_cents INTEGER NOT NULL DEFAULT 0 CHECK (weekly_rate_cents >= 0),
  monthly_rate_cents INTEGER NOT NULL DEFAULT 0 CHECK (monthly_rate_cents >= 0),
  hourly_rate_cents INTEGER NOT NULL DEFAULT 0 CHECK (hourly_rate_cents >= 0),

  -- Limits
  mileage_limit_per_day INTEGER CHECK (mileage_limit_per_day IS NULL OR mileage_limit_per_day >= 0),
  extra_mile_cents INTEGER NOT NULL DEFAULT 0 CHECK (extra_mile_cents >= 0),
  security_deposit_cents INTEGER NOT NULL DEFAULT 0 CHECK (security_deposit_cents >= 0),

  -- Photos
  photo_url TEXT,
  photo_urls JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Odometer (rolled forward at each return)
  current_odometer INTEGER NOT NULL DEFAULT 0 CHECK (current_odometer >= 0),

  status public.car_rental_vehicle_status NOT NULL DEFAULT 'available',
  description TEXT CHECK (description IS NULL OR char_length(description) <= 2000),
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_rental_vehicles_store_idx
  ON public.car_rental_vehicles (store_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS car_rental_vehicles_status_idx
  ON public.car_rental_vehicles (store_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS car_rental_vehicles_plate_unique
  ON public.car_rental_vehicles (store_id, lower(license_plate))
  WHERE license_plate IS NOT NULL AND license_plate <> '';

------------------------------------------------------------------------
-- Add-ons (insurance, GPS, child seats, drivers, etc.)
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_rental_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  /** How the price applies. per_day multiplies by rental days; per_rental is flat. */
  billing TEXT NOT NULL DEFAULT 'per_day'
    CHECK (billing IN ('per_day', 'per_rental')),
  icon TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_rental_addons_store_idx
  ON public.car_rental_addons (store_id) WHERE is_active;

------------------------------------------------------------------------
-- Customers (renter book)
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_rental_customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 120),
  email TEXT,
  phone TEXT,
  date_of_birth DATE,

  driver_license_number TEXT,
  driver_license_state TEXT,
  driver_license_country TEXT,
  driver_license_expiry DATE,
  driver_license_photo_url TEXT,

  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT,

  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 1000),
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_blocked BOOLEAN NOT NULL DEFAULT false,

  total_rentals INTEGER NOT NULL DEFAULT 0 CHECK (total_rentals >= 0),
  last_rental_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_rental_customers_store_idx
  ON public.car_rental_customers (store_id);
CREATE INDEX IF NOT EXISTS car_rental_customers_phone_idx
  ON public.car_rental_customers (store_id, lower(phone)) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS car_rental_customers_email_idx
  ON public.car_rental_customers (store_id, lower(email)) WHERE email IS NOT NULL;

------------------------------------------------------------------------
-- Reservations
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_rental_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  vehicle_id UUID REFERENCES public.car_rental_vehicles(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.car_rental_customers(id) ON DELETE SET NULL,
  pickup_location_id UUID REFERENCES public.car_rental_locations(id) ON DELETE SET NULL,
  dropoff_location_id UUID REFERENCES public.car_rental_locations(id) ON DELETE SET NULL,

  -- Snapshots so history stays intact even if catalog rows change.
  vehicle_label TEXT NOT NULL,
  vehicle_category TEXT,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  pickup_location_name TEXT,
  dropoff_location_name TEXT,

  pickup_at TIMESTAMPTZ NOT NULL,
  dropoff_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT car_rental_reservations_time_range CHECK (dropoff_at > pickup_at),

  rental_days INTEGER NOT NULL CHECK (rental_days >= 1),

  -- Pricing snapshot
  daily_rate_cents INTEGER NOT NULL DEFAULT 0 CHECK (daily_rate_cents >= 0),
  base_total_cents INTEGER NOT NULL DEFAULT 0 CHECK (base_total_cents >= 0),
  addons_total_cents INTEGER NOT NULL DEFAULT 0 CHECK (addons_total_cents >= 0),
  insurance_total_cents INTEGER NOT NULL DEFAULT 0 CHECK (insurance_total_cents >= 0),
  taxes_cents INTEGER NOT NULL DEFAULT 0 CHECK (taxes_cents >= 0),
  fees_cents INTEGER NOT NULL DEFAULT 0 CHECK (fees_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  security_deposit_cents INTEGER NOT NULL DEFAULT 0 CHECK (security_deposit_cents >= 0),
  total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),

  -- Payment status
  deposit_paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (deposit_paid_cents >= 0),
  amount_paid_cents INTEGER NOT NULL DEFAULT 0 CHECK (amount_paid_cents >= 0),

  -- Pickup / return readings
  pickup_odometer INTEGER CHECK (pickup_odometer IS NULL OR pickup_odometer >= 0),
  dropoff_odometer INTEGER CHECK (dropoff_odometer IS NULL OR dropoff_odometer >= 0),
  pickup_fuel_level INTEGER CHECK (pickup_fuel_level IS NULL OR pickup_fuel_level BETWEEN 0 AND 100),
  dropoff_fuel_level INTEGER CHECK (dropoff_fuel_level IS NULL OR dropoff_fuel_level BETWEEN 0 AND 100),
  picked_up_at TIMESTAMPTZ,
  returned_at TIMESTAMPTZ,

  status public.car_rental_reservation_status NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'admin'
    CHECK (source IN ('walk_in', 'phone', 'app', 'admin')),

  customer_notes TEXT CHECK (customer_notes IS NULL OR char_length(customer_notes) <= 1000),
  internal_notes TEXT CHECK (internal_notes IS NULL OR char_length(internal_notes) <= 1000),
  damage_notes TEXT CHECK (damage_notes IS NULL OR char_length(damage_notes) <= 2000),

  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  confirmation_code TEXT NOT NULL DEFAULT upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_rental_reservations_store_idx
  ON public.car_rental_reservations (store_id, pickup_at);
CREATE INDEX IF NOT EXISTS car_rental_reservations_vehicle_idx
  ON public.car_rental_reservations (vehicle_id, pickup_at) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS car_rental_reservations_customer_idx
  ON public.car_rental_reservations (customer_id) WHERE customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS car_rental_reservations_status_idx
  ON public.car_rental_reservations (store_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS car_rental_reservations_confirmation_code_unique
  ON public.car_rental_reservations (confirmation_code);

-- No double-booking the same vehicle for overlapping active reservations.
ALTER TABLE public.car_rental_reservations
  DROP CONSTRAINT IF EXISTS car_rental_reservations_no_overlap;
ALTER TABLE public.car_rental_reservations
  ADD CONSTRAINT car_rental_reservations_no_overlap
  EXCLUDE USING gist (
    vehicle_id WITH =,
    tstzrange(pickup_at, dropoff_at, '[)') WITH &&
  )
  WHERE (status IN ('pending', 'confirmed', 'picked_up') AND vehicle_id IS NOT NULL);

------------------------------------------------------------------------
-- Reservation add-ons (junction)
------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.car_rental_reservation_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reservation_id UUID NOT NULL REFERENCES public.car_rental_reservations(id) ON DELETE CASCADE,
  addon_id UUID REFERENCES public.car_rental_addons(id) ON DELETE SET NULL,
  -- Snapshot
  name TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL DEFAULT 0 CHECK (unit_price_cents >= 0),
  billing TEXT NOT NULL DEFAULT 'per_day'
    CHECK (billing IN ('per_day', 'per_rental')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  total_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS car_rental_reservation_addons_res_idx
  ON public.car_rental_reservation_addons (reservation_id);

------------------------------------------------------------------------
-- Updated-at triggers
------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_car_rental_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'car_rental_locations_set_updated_at') THEN
    CREATE TRIGGER car_rental_locations_set_updated_at BEFORE UPDATE ON public.car_rental_locations
      FOR EACH ROW EXECUTE FUNCTION public.tg_car_rental_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'car_rental_vehicles_set_updated_at') THEN
    CREATE TRIGGER car_rental_vehicles_set_updated_at BEFORE UPDATE ON public.car_rental_vehicles
      FOR EACH ROW EXECUTE FUNCTION public.tg_car_rental_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'car_rental_addons_set_updated_at') THEN
    CREATE TRIGGER car_rental_addons_set_updated_at BEFORE UPDATE ON public.car_rental_addons
      FOR EACH ROW EXECUTE FUNCTION public.tg_car_rental_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'car_rental_customers_set_updated_at') THEN
    CREATE TRIGGER car_rental_customers_set_updated_at BEFORE UPDATE ON public.car_rental_customers
      FOR EACH ROW EXECUTE FUNCTION public.tg_car_rental_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'car_rental_reservations_set_updated_at') THEN
    CREATE TRIGGER car_rental_reservations_set_updated_at BEFORE UPDATE ON public.car_rental_reservations
      FOR EACH ROW EXECUTE FUNCTION public.tg_car_rental_set_updated_at();
  END IF;
END$$;

------------------------------------------------------------------------
-- Reservation add-ons rollup → reservation.addons_total_cents
------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_car_rental_addons_rollup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  target_id UUID;
  total_sum INTEGER;
BEGIN
  target_id := COALESCE(NEW.reservation_id, OLD.reservation_id);
  SELECT COALESCE(SUM(total_cents), 0) INTO total_sum
    FROM public.car_rental_reservation_addons
    WHERE reservation_id = target_id;
  UPDATE public.car_rental_reservations
    SET addons_total_cents = total_sum,
        total_cents = base_total_cents + total_sum + insurance_total_cents + taxes_cents + fees_cents - discount_cents
    WHERE id = target_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS car_rental_reservation_addons_rollup
  ON public.car_rental_reservation_addons;
CREATE TRIGGER car_rental_reservation_addons_rollup
  AFTER INSERT OR UPDATE OR DELETE ON public.car_rental_reservation_addons
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_rental_addons_rollup();

------------------------------------------------------------------------
-- Customer rentals counter sync (status flips to 'returned')
------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_car_rental_customers_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.customer_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Increment on first transition into 'returned'.
  IF NEW.status = 'returned' AND (OLD.status IS DISTINCT FROM 'returned') THEN
    UPDATE public.car_rental_customers
      SET total_rentals = total_rentals + 1,
          last_rental_at = COALESCE(NEW.returned_at, now())
      WHERE id = NEW.customer_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS car_rental_reservations_customer_sync
  ON public.car_rental_reservations;
CREATE TRIGGER car_rental_reservations_customer_sync
  AFTER UPDATE OF status ON public.car_rental_reservations
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_rental_customers_sync();

------------------------------------------------------------------------
-- Vehicle status auto-sync to active rental state
------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_car_rental_vehicle_status_sync()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.vehicle_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'picked_up' AND (OLD.status IS DISTINCT FROM 'picked_up') THEN
    UPDATE public.car_rental_vehicles
      SET status = 'rented'
      WHERE id = NEW.vehicle_id AND status NOT IN ('maintenance', 'retired');
  END IF;

  IF NEW.status IN ('returned', 'cancelled', 'no_show') AND OLD.status = 'picked_up' THEN
    UPDATE public.car_rental_vehicles
      SET status = 'available',
          current_odometer = GREATEST(current_odometer, COALESCE(NEW.dropoff_odometer, current_odometer))
      WHERE id = NEW.vehicle_id AND status NOT IN ('maintenance', 'retired');
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS car_rental_reservations_vehicle_status_sync
  ON public.car_rental_reservations;
CREATE TRIGGER car_rental_reservations_vehicle_status_sync
  AFTER UPDATE OF status ON public.car_rental_reservations
  FOR EACH ROW EXECUTE FUNCTION public.tg_car_rental_vehicle_status_sync();

------------------------------------------------------------------------
-- RLS — owners manage all; admins always; public can SELECT vehicles &
-- locations & addons for booking; public can INSERT reservations as 'app'.
------------------------------------------------------------------------

ALTER TABLE public.car_rental_locations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_rental_vehicles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_rental_addons       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_rental_customers    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_rental_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.car_rental_reservation_addons ENABLE ROW LEVEL SECURITY;

-- Helper: shared "owns store" predicate (inlined per policy for clarity).
-- For each table, owner can do everything; admin role can do everything.

DO $$
DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'car_rental_locations',
    'car_rental_vehicles',
    'car_rental_addons',
    'car_rental_customers',
    'car_rental_reservations'
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
  -- Policies already exist; ignore on re-run.
  NULL;
END$$;

-- Reservation add-ons rely on the parent reservation's policy.
CREATE POLICY IF NOT EXISTS "Owners manage reservation addons - all"
  ON public.car_rental_reservation_addons
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.car_rental_reservations r
      JOIN public.store_profiles sp ON sp.id = r.store_id
      WHERE r.id = car_rental_reservation_addons.reservation_id
        AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.car_rental_reservations r
      JOIN public.store_profiles sp ON sp.id = r.store_id
      WHERE r.id = car_rental_reservation_addons.reservation_id
        AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
    )
  );

-- Public read for the booking flow: vehicles + locations + addons of active stores.
CREATE POLICY IF NOT EXISTS "Public read active vehicles"
  ON public.car_rental_vehicles FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY IF NOT EXISTS "Public read active locations"
  ON public.car_rental_locations FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE POLICY IF NOT EXISTS "Public read active addons"
  ON public.car_rental_addons FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- Public can insert a 'app' source reservation. The defaults force source='app'
-- when no auth user is attached so customers can't impersonate owner inserts.
CREATE POLICY IF NOT EXISTS "Public can create app reservations"
  ON public.car_rental_reservations
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (source = 'app');

-- A customer linked via car_rental_customers.user_id can view their own reservations.
CREATE POLICY IF NOT EXISTS "Customers view their own reservations"
  ON public.car_rental_reservations
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.car_rental_customers c
      WHERE c.id = car_rental_reservations.customer_id
        AND c.user_id = (SELECT auth.uid())
    )
  );

-- Looking up a reservation by confirmation code (anonymous):
-- handled by a dedicated RPC in a follow-up migration if needed.
