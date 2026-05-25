-- Salon bookings — the central appointment table.
-- Snapshots price/duration at booking time so later edits to the service
-- catalog don't rewrite history.

CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'salon_booking_status') THEN
    CREATE TYPE public.salon_booking_status AS ENUM (
      'pending',
      'confirmed',
      'completed',
      'cancelled',
      'no_show'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.salon_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.salon_clients(id) ON DELETE SET NULL,
  stylist_id UUID REFERENCES public.salon_stylists(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.salon_services(id) ON DELETE SET NULL,

  -- Snapshots so history stays intact even if catalog rows change.
  service_name TEXT NOT NULL,
  stylist_name TEXT,
  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 5 AND 480),

  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT salon_bookings_time_range CHECK (end_at > start_at),

  status public.salon_booking_status NOT NULL DEFAULT 'pending',
  source TEXT NOT NULL DEFAULT 'admin'
    CHECK (source IN ('walk_in', 'phone', 'app', 'admin')),

  tip_cents INTEGER NOT NULL DEFAULT 0 CHECK (tip_cents >= 0),
  tax_cents INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  deposit_cents INTEGER NOT NULL DEFAULT 0 CHECK (deposit_cents >= 0),
  deposit_paid_at TIMESTAMPTZ,

  client_notes TEXT CHECK (client_notes IS NULL OR char_length(client_notes) <= 1000),
  internal_notes TEXT CHECK (internal_notes IS NULL OR char_length(internal_notes) <= 1000),

  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  no_show_fee_charged_cents INTEGER NOT NULL DEFAULT 0 CHECK (no_show_fee_charged_cents >= 0),

  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_bookings_store_start_idx
  ON public.salon_bookings (store_id, start_at);
CREATE INDEX IF NOT EXISTS salon_bookings_stylist_start_idx
  ON public.salon_bookings (stylist_id, start_at) WHERE stylist_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS salon_bookings_client_idx
  ON public.salon_bookings (client_id) WHERE client_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS salon_bookings_status_idx
  ON public.salon_bookings (store_id, status);

-- No double-booking for the same stylist (only for active bookings).
ALTER TABLE public.salon_bookings
  DROP CONSTRAINT IF EXISTS salon_bookings_no_overlap;
ALTER TABLE public.salon_bookings
  ADD CONSTRAINT salon_bookings_no_overlap
  EXCLUDE USING gist (
    stylist_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  )
  WHERE (status IN ('pending', 'confirmed') AND stylist_id IS NOT NULL);

CREATE OR REPLACE FUNCTION public.tg_salon_bookings_set_updated_at()
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

DROP TRIGGER IF EXISTS salon_bookings_set_updated_at ON public.salon_bookings;
CREATE TRIGGER salon_bookings_set_updated_at
  BEFORE UPDATE ON public.salon_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_salon_bookings_set_updated_at();

ALTER TABLE public.salon_bookings ENABLE ROW LEVEL SECURITY;

-- Owners / admins manage everything.
CREATE POLICY "Owners manage their bookings - select"
  ON public.salon_bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_bookings.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage their bookings - insert"
  ON public.salon_bookings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_bookings.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage their bookings - update"
  ON public.salon_bookings
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_bookings.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_bookings.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage their bookings - delete"
  ON public.salon_bookings
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_bookings.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- A client can view their own bookings (when linked via salon_clients.user_id).
CREATE POLICY "Clients can view their own bookings"
  ON public.salon_bookings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_clients c
      WHERE c.id = salon_bookings.client_id
        AND c.user_id = (SELECT auth.uid())
    )
  );
