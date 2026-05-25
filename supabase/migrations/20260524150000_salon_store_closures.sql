-- Store-level closure windows (holidays, vacation, special hours-off).
-- Bookings that overlap an active closure are rejected at the DB level via
-- tg_salon_booking_store_closure_guard so the rule holds regardless of
-- whether the booking came from admin, app, or a public link.

CREATE TABLE IF NOT EXISTS public.salon_store_closures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT CHECK (reason IS NULL OR char_length(reason) <= 200),
  CONSTRAINT salon_store_closures_time_range CHECK (end_at > start_at),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_store_closures_store_idx
  ON public.salon_store_closures (store_id, start_at);

-- No overlapping closures for the same store.
ALTER TABLE public.salon_store_closures
  DROP CONSTRAINT IF EXISTS salon_store_closures_no_overlap;
ALTER TABLE public.salon_store_closures
  ADD CONSTRAINT salon_store_closures_no_overlap
  EXCLUDE USING gist (
    store_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  );

DROP TRIGGER IF EXISTS salon_store_closures_set_updated_at ON public.salon_store_closures;
CREATE TRIGGER salon_store_closures_set_updated_at
  BEFORE UPDATE ON public.salon_store_closures
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_set_updated_at_generic();

ALTER TABLE public.salon_store_closures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage store closures - all"
  ON public.salon_store_closures
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_store_closures.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_store_closures.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- Cross-table guard: reject a booking insert/update if it overlaps an active
-- store closure (only checked for pending/confirmed bookings; completed and
-- historical ones can sit inside closures without complaint).
CREATE OR REPLACE FUNCTION public.tg_salon_booking_store_closure_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NEW.status NOT IN ('pending', 'confirmed') THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_count
    FROM public.salon_store_closures c
    WHERE c.store_id = NEW.store_id
      AND tstzrange(c.start_at, c.end_at, '[)') && tstzrange(NEW.start_at, NEW.end_at, '[)');
  IF v_count > 0 THEN
    RAISE EXCEPTION 'The salon is closed during that time.'
      USING ERRCODE = '23P01';  -- exclusion_violation
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS salon_bookings_store_closure_guard ON public.salon_bookings;
CREATE TRIGGER salon_bookings_store_closure_guard
  BEFORE INSERT OR UPDATE OF start_at, end_at, status ON public.salon_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_salon_booking_store_closure_guard();

-- RPC for the public booking site — returns only (start_at, end_at, reason)
-- for the store on a given day window so the customer site can grey-out
-- closed days/times without exposing other admin data.
CREATE OR REPLACE FUNCTION public.salon_public_store_closures(
  p_store_id UUID,
  p_window_start TIMESTAMPTZ,
  p_window_end TIMESTAMPTZ
)
RETURNS TABLE (start_at TIMESTAMPTZ, end_at TIMESTAMPTZ, reason TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.start_at, c.end_at, c.reason
  FROM public.salon_store_closures c
  JOIN public.store_profiles sp ON sp.id = c.store_id
  WHERE c.store_id = p_store_id
    AND sp.is_active = true
    AND c.start_at < p_window_end
    AND c.end_at > p_window_start;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_store_closures(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;
