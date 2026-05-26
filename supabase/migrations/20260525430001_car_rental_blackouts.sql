-- Car rental — vehicle blackout windows (holidays, off-the-road periods).

CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS public.car_rental_vehicle_blackouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.car_rental_vehicles(id) ON DELETE CASCADE,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  reason TEXT CHECK (reason IS NULL OR char_length(reason) <= 250),
  category TEXT NOT NULL DEFAULT 'other'
    CHECK (category IN ('maintenance', 'reserved', 'holiday', 'personal', 'other')),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT car_rental_blackouts_range CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS car_rental_blackouts_vehicle_idx
  ON public.car_rental_vehicle_blackouts (vehicle_id, starts_at);
CREATE INDEX IF NOT EXISTS car_rental_blackouts_store_idx
  ON public.car_rental_vehicle_blackouts (store_id, starts_at);

-- Prevent overlapping blackouts on the same vehicle
ALTER TABLE public.car_rental_vehicle_blackouts
  DROP CONSTRAINT IF EXISTS car_rental_blackouts_no_overlap;
ALTER TABLE public.car_rental_vehicle_blackouts
  ADD CONSTRAINT car_rental_blackouts_no_overlap
  EXCLUDE USING gist (
    vehicle_id WITH =,
    tstzrange(starts_at, ends_at, '[)') WITH &&
  );

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'car_rental_blackouts_set_updated_at') THEN
    CREATE TRIGGER car_rental_blackouts_set_updated_at BEFORE UPDATE ON public.car_rental_vehicle_blackouts
      FOR EACH ROW EXECUTE FUNCTION public.tg_car_rental_set_updated_at();
  END IF;
END$$;

ALTER TABLE public.car_rental_vehicle_blackouts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  EXECUTE $f$
    CREATE POLICY "Owners manage blackouts - select" ON public.car_rental_vehicle_blackouts FOR SELECT TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.store_profiles sp
                WHERE sp.id = car_rental_vehicle_blackouts.store_id AND sp.owner_id = (SELECT auth.uid()))
        OR public.has_role((SELECT auth.uid()), 'admin')
      );
  $f$;
  EXECUTE $f$
    CREATE POLICY "Owners manage blackouts - insert" ON public.car_rental_vehicle_blackouts FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.store_profiles sp
                WHERE sp.id = car_rental_vehicle_blackouts.store_id AND sp.owner_id = (SELECT auth.uid()))
        OR public.has_role((SELECT auth.uid()), 'admin')
      );
  $f$;
  EXECUTE $f$
    CREATE POLICY "Owners manage blackouts - update" ON public.car_rental_vehicle_blackouts FOR UPDATE TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.store_profiles sp
                WHERE sp.id = car_rental_vehicle_blackouts.store_id AND sp.owner_id = (SELECT auth.uid()))
        OR public.has_role((SELECT auth.uid()), 'admin')
      );
  $f$;
  EXECUTE $f$
    CREATE POLICY "Owners manage blackouts - delete" ON public.car_rental_vehicle_blackouts FOR DELETE TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.store_profiles sp
                WHERE sp.id = car_rental_vehicle_blackouts.store_id AND sp.owner_id = (SELECT auth.uid()))
        OR public.has_role((SELECT auth.uid()), 'admin')
      );
  $f$;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END$$;

-- Publicly readable so the booking flow can show "unavailable" windows.
CREATE POLICY IF NOT EXISTS "Public read blackouts"
  ON public.car_rental_vehicle_blackouts FOR SELECT TO anon, authenticated
  USING (true);
