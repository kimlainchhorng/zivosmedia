-- Block-off windows for a stylist (lunch, training, time off). The owner
-- creates these manually; bookings overlapping them are rejected at the
-- database level. Public availability calc also reads these to exclude
-- blocked slots from the customer site.

CREATE TABLE IF NOT EXISTS public.salon_blockouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  stylist_id UUID NOT NULL REFERENCES public.salon_stylists(id) ON DELETE CASCADE,
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  reason TEXT CHECK (reason IS NULL OR char_length(reason) <= 120),
  CONSTRAINT salon_blockouts_time_range CHECK (end_at > start_at),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_blockouts_stylist_idx
  ON public.salon_blockouts (stylist_id, start_at);
CREATE INDEX IF NOT EXISTS salon_blockouts_store_idx
  ON public.salon_blockouts (store_id, start_at);

-- No overlapping blockouts for the same stylist.
ALTER TABLE public.salon_blockouts
  DROP CONSTRAINT IF EXISTS salon_blockouts_no_overlap;
ALTER TABLE public.salon_blockouts
  ADD CONSTRAINT salon_blockouts_no_overlap
  EXCLUDE USING gist (
    stylist_id WITH =,
    tstzrange(start_at, end_at, '[)') WITH &&
  );

DROP TRIGGER IF EXISTS salon_blockouts_set_updated_at ON public.salon_blockouts;
CREATE TRIGGER salon_blockouts_set_updated_at
  BEFORE UPDATE ON public.salon_blockouts
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_set_updated_at_generic();

ALTER TABLE public.salon_blockouts ENABLE ROW LEVEL SECURITY;

-- Public can read blockouts so the booking site can subtract them from open slots.
-- Don't expose the reason — it might be private (e.g. "doctor's appointment").
-- Easiest: only expose minimal fields via a view, OR just allow read of the
-- whole row but with the reason redacted. For simplicity here we let the
-- public read the times only via a SECURITY DEFINER RPC instead of opening
-- the table to anon.

CREATE POLICY "Owners manage blockouts - all"
  ON public.salon_blockouts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_blockouts.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = salon_blockouts.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- RPC for the public booking site — returns only (start_at, end_at) for a
-- stylist on a given day. No private fields exposed.
CREATE OR REPLACE FUNCTION public.salon_public_stylist_blockouts(p_stylist_id UUID, p_day_start TIMESTAMPTZ, p_day_end TIMESTAMPTZ)
RETURNS TABLE (start_at TIMESTAMPTZ, end_at TIMESTAMPTZ)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.start_at, b.end_at
  FROM public.salon_blockouts b
  JOIN public.salon_stylists st ON st.id = b.stylist_id
  WHERE b.stylist_id = p_stylist_id
    AND b.start_at < p_day_end
    AND b.end_at > p_day_start
    AND st.is_active = true;
$$;

GRANT EXECUTE ON FUNCTION public.salon_public_stylist_blockouts(UUID, TIMESTAMPTZ, TIMESTAMPTZ) TO anon, authenticated;

-- Cross-table guard: reject a booking insert/update if it overlaps an existing
-- blockout for the same stylist (only checked for active bookings).
CREATE OR REPLACE FUNCTION public.tg_salon_booking_blockout_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER;
BEGIN
  IF NEW.stylist_id IS NULL THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('pending', 'confirmed') THEN RETURN NEW; END IF;
  SELECT COUNT(*) INTO v_count
    FROM public.salon_blockouts b
    WHERE b.stylist_id = NEW.stylist_id
      AND tstzrange(b.start_at, b.end_at, '[)') && tstzrange(NEW.start_at, NEW.end_at, '[)');
  IF v_count > 0 THEN
    RAISE EXCEPTION 'Stylist is unavailable during that time (block-off in place).'
      USING ERRCODE = '23P01';  -- exclusion_violation, same code as overlap
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS salon_bookings_blockout_guard ON public.salon_bookings;
CREATE TRIGGER salon_bookings_blockout_guard
  BEFORE INSERT OR UPDATE OF start_at, end_at, stylist_id, status ON public.salon_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_salon_booking_blockout_guard();
