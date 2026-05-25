-- Waitlist (clients hoping for an open slot) + per-stylist weekly schedule
-- (used to validate booking times and surface available slots on the public site).

CREATE TABLE IF NOT EXISTS public.salon_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.salon_clients(id) ON DELETE SET NULL,
  client_name TEXT NOT NULL CHECK (char_length(client_name) BETWEEN 1 AND 120),
  client_phone TEXT CHECK (client_phone IS NULL OR char_length(client_phone) <= 30),
  requested_service_id UUID REFERENCES public.salon_services(id) ON DELETE SET NULL,
  requested_service_name TEXT,
  requested_stylist_id UUID REFERENCES public.salon_stylists(id) ON DELETE SET NULL,
  requested_stylist_name TEXT,
  preferred_window TEXT CHECK (preferred_window IS NULL OR char_length(preferred_window) <= 80),
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
  status TEXT NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting', 'notified', 'booked', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_waitlist_store_status_idx
  ON public.salon_waitlist (store_id, status, created_at DESC);

-- Per-stylist weekly working hours. One row per (stylist, weekday).
CREATE TABLE IF NOT EXISTS public.salon_stylist_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  stylist_id UUID NOT NULL REFERENCES public.salon_stylists(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun ... 6=Sat
  is_working BOOLEAN NOT NULL DEFAULT true,
  start_time TIME,
  end_time TIME,
  CONSTRAINT salon_stylist_schedules_time_order CHECK (
    (is_working = false) OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (stylist_id, day_of_week)
);

CREATE INDEX IF NOT EXISTS salon_stylist_schedules_store_idx
  ON public.salon_stylist_schedules (store_id);

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.tg_salon_set_updated_at_generic()
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

DROP TRIGGER IF EXISTS salon_waitlist_set_updated_at ON public.salon_waitlist;
CREATE TRIGGER salon_waitlist_set_updated_at
  BEFORE UPDATE ON public.salon_waitlist
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_set_updated_at_generic();

DROP TRIGGER IF EXISTS salon_stylist_schedules_set_updated_at ON public.salon_stylist_schedules;
CREATE TRIGGER salon_stylist_schedules_set_updated_at
  BEFORE UPDATE ON public.salon_stylist_schedules
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_set_updated_at_generic();

ALTER TABLE public.salon_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_stylist_schedules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage waitlist - all"
  ON public.salon_waitlist
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_waitlist.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_waitlist.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- Schedules: public can read (for booking site to compute availability).
CREATE POLICY "Public can view stylist schedules"
  ON public.salon_stylist_schedules
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_stylists st
      WHERE st.id = salon_stylist_schedules.stylist_id AND st.is_active = true
    )
  );

CREATE POLICY "Owners manage stylist schedules - all"
  ON public.salon_stylist_schedules
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_stylist_schedules.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_stylist_schedules.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
