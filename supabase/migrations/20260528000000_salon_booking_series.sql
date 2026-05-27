-- Recurring / standing appointments
--
-- A salon's regular clients often have a standing slot — "every other Thursday
-- at 10am with Sarah for a haircut". This migration introduces a series row
-- + a function that materializes the next N weeks of occurrences as real
-- salon_bookings rows. Materializing (vs. lazy generation at query time)
-- keeps the owner's day/week calendar honest: rescheduling, cancellations,
-- and the existing salon_bookings_no_overlap exclusion constraint all work
-- with no special-casing.
--
-- Pattern:
--   1) Owner clicks "Make standing" on a confirmed booking (the anchor).
--   2) UI inserts a salon_booking_series row. The AFTER INSERT trigger
--      generates the next 12 weeks (skipping conflicts).
--   3) Each generated row points back via salon_bookings.series_id.
--   4) Owner can pause / resume / end the series. End optionally cancels
--      any already-generated future occurrences.
--
-- The first occurrence (the anchor booking) is NOT regenerated — it lives
-- as its own salon_bookings row and gets its series_id stamped manually by
-- the UI when the series is created. The trigger starts generating from
-- anchor_start + 1*cadence.

------------------------------------------------------------------------------
-- 1. Series table
------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.salon_booking_series (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  client_id UUID REFERENCES public.salon_clients(id) ON DELETE SET NULL,
  stylist_id UUID REFERENCES public.salon_stylists(id) ON DELETE SET NULL,
  service_id UUID REFERENCES public.salon_services(id) ON DELETE SET NULL,

  -- First occurrence's exact timestamp. Future occurrences are computed as
  -- anchor_start + n*cadence_weeks*INTERVAL '1 week'. Storing the full
  -- TIMESTAMPTZ (rather than day_of_week + time_of_day) sidesteps tz/DST
  -- edge cases — clients reading the booking see whatever wall-clock time
  -- the original anchor was. DST transitions will shift the wall clock by
  -- an hour twice a year; that's acceptable for v1.
  anchor_start TIMESTAMPTZ NOT NULL,

  -- Interval between occurrences. Capped to the realistic salon cadences.
  cadence_weeks INTEGER NOT NULL
    CHECK (cadence_weeks IN (1, 2, 3, 4, 5, 6, 8, 12)),

  -- Snapshots so a price/duration change in the catalog doesn't retroactively
  -- alter every future generated booking. Mirrors salon_bookings snapshots.
  service_name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0 CHECK (price_cents >= 0),
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes BETWEEN 5 AND 480),

  client_name TEXT NOT NULL,
  client_phone TEXT,
  client_email TEXT,
  stylist_name TEXT,

  -- Pause / end state. Both are nullable timestamps so we know when it
  -- happened (audit). Generation function honors these: paused or ended
  -- series produce no new occurrences.
  paused_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,

  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
  created_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_booking_series_store_idx
  ON public.salon_booking_series (store_id, anchor_start);
CREATE INDEX IF NOT EXISTS salon_booking_series_active_idx
  ON public.salon_booking_series (store_id)
  WHERE paused_at IS NULL AND ended_at IS NULL;
CREATE INDEX IF NOT EXISTS salon_booking_series_client_idx
  ON public.salon_booking_series (client_id)
  WHERE client_id IS NOT NULL;

-- Reuse the generic updated_at trigger declared by the schedules migration.
DROP TRIGGER IF EXISTS salon_booking_series_set_updated_at ON public.salon_booking_series;
CREATE TRIGGER salon_booking_series_set_updated_at
  BEFORE UPDATE ON public.salon_booking_series
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_set_updated_at_generic();

ALTER TABLE public.salon_booking_series ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage booking series - all"
  ON public.salon_booking_series
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_booking_series.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_booking_series.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- Clients linked through salon_clients.user_id can see their own series
-- (read-only) — handy for any future client-facing "your standing
-- appointments" view, mirrors the existing payouts policy.
CREATE POLICY "Clients can read their own series"
  ON public.salon_booking_series
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_clients sc
      WHERE sc.id = salon_booking_series.client_id
        AND sc.user_id = (SELECT auth.uid())
    )
  );

------------------------------------------------------------------------------
-- 2. Link generated bookings back to their series
------------------------------------------------------------------------------

ALTER TABLE public.salon_bookings
  ADD COLUMN IF NOT EXISTS series_id UUID
    REFERENCES public.salon_booking_series(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS series_occurrence_number INTEGER
    CHECK (series_occurrence_number IS NULL OR series_occurrence_number >= 0);

CREATE INDEX IF NOT EXISTS salon_bookings_series_idx
  ON public.salon_bookings (series_id, series_occurrence_number)
  WHERE series_id IS NOT NULL;

-- A series can only have one booking per occurrence number. Prevents the
-- generation function from inserting duplicates on a retry.
DROP INDEX IF EXISTS salon_bookings_series_unique_idx;
CREATE UNIQUE INDEX salon_bookings_series_unique_idx
  ON public.salon_bookings (series_id, series_occurrence_number)
  WHERE series_id IS NOT NULL AND series_occurrence_number IS NOT NULL;

------------------------------------------------------------------------------
-- 3. Generation function — materializes the next p_horizon_weeks of
--    occurrences. Idempotent: re-running produces no new rows for slots
--    that are already filled. Robust: each insert is wrapped in a sub-tx
--    so one collision (no_overlap, store closure, blockout) doesn't abort
--    the whole batch.
--
--    Returns the count of rows actually inserted.
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.salon_generate_series_bookings(
  p_series_id UUID,
  p_horizon_weeks INTEGER DEFAULT 12
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_series RECORD;
  v_occ INTEGER;
  v_start TIMESTAMPTZ;
  v_end TIMESTAMPTZ;
  v_max_start TIMESTAMPTZ;
  v_inserted INTEGER := 0;
BEGIN
  SELECT *
    INTO v_series
    FROM public.salon_booking_series
    WHERE id = p_series_id;

  IF v_series.id IS NULL THEN
    RAISE EXCEPTION 'series % not found', p_series_id;
  END IF;

  -- Paused or ended series don't generate anything.
  IF v_series.paused_at IS NOT NULL OR v_series.ended_at IS NOT NULL THEN
    RETURN 0;
  END IF;

  -- Cap horizon defensively — owner-driven UI passes 12, but a programmatic
  -- caller mustn't blow the bookings table up by passing 10000.
  IF COALESCE(p_horizon_weeks, 12) > 52 THEN
    p_horizon_weeks := 52;
  ELSIF COALESCE(p_horizon_weeks, 12) < 1 THEN
    p_horizon_weeks := 1;
  END IF;

  v_max_start := now() + make_interval(weeks => p_horizon_weeks);

  -- Iterate occurrence numbers starting at 1 (occurrence 0 is the anchor
  -- booking itself, which the UI inserted with series_id already set).
  v_occ := 1;
  LOOP
    v_start := v_series.anchor_start
      + make_interval(weeks => v_occ * v_series.cadence_weeks);

    -- Stop once we're past the horizon.
    EXIT WHEN v_start > v_max_start;

    -- Skip occurrences already in the past — for any horizon update calls,
    -- we only project forward from "now". The original anchor occurrence
    -- (in the past after a few cadence cycles) still exists as occurrence 0.
    IF v_start <= now() THEN
      v_occ := v_occ + 1;
      CONTINUE;
    END IF;

    v_end := v_start + make_interval(mins => v_series.duration_minutes);

    BEGIN
      INSERT INTO public.salon_bookings (
        store_id, client_id, stylist_id, service_id,
        service_name, stylist_name,
        client_name, client_phone, client_email,
        price_cents, duration_minutes,
        start_at, end_at,
        status, source,
        series_id, series_occurrence_number,
        created_by_user_id
      ) VALUES (
        v_series.store_id, v_series.client_id, v_series.stylist_id, v_series.service_id,
        v_series.service_name, v_series.stylist_name,
        v_series.client_name, v_series.client_phone, v_series.client_email,
        v_series.price_cents, v_series.duration_minutes,
        v_start, v_end,
        'confirmed', 'admin',
        v_series.id, v_occ,
        v_series.created_by_user_id
      );
      v_inserted := v_inserted + 1;
    EXCEPTION
      -- Unique-violation on the (series_id, occurrence_number) partial idx
      -- means we already filled this slot on a prior pass — skip silently.
      WHEN unique_violation THEN NULL;
      -- Exclusion-violation: the slot conflicts with another booking or a
      -- blockout. Skip and continue — owner can manually resolve via the
      -- regular booking UI.
      WHEN exclusion_violation THEN NULL;
      -- Custom guard raised by tg_salon_booking_store_closure_guard: skip.
      WHEN raise_exception THEN NULL;
      WHEN OTHERS THEN
        -- Don't swallow truly unexpected errors silently — log via NOTICE
        -- so the function caller can see them in the Supabase logs, but
        -- continue with the next occurrence so one bad date doesn't kill
        -- the whole horizon.
        RAISE NOTICE 'salon_generate_series_bookings: skip occurrence % at %: %',
          v_occ, v_start, SQLERRM;
    END;

    v_occ := v_occ + 1;
    -- Safety belt — a malformed cadence should never get us into a loop,
    -- but cap iterations to be sure.
    EXIT WHEN v_occ > 200;
  END LOOP;

  RETURN v_inserted;
END;
$$;

GRANT EXECUTE ON FUNCTION public.salon_generate_series_bookings(UUID, INTEGER) TO authenticated;

------------------------------------------------------------------------------
-- 4. Auto-generate on series INSERT — owner inserts the row, trigger does
--    the work without a second client roundtrip.
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.tg_salon_booking_series_generate()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.salon_generate_series_bookings(NEW.id, 12);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS salon_booking_series_generate ON public.salon_booking_series;
CREATE TRIGGER salon_booking_series_generate
  AFTER INSERT ON public.salon_booking_series
  FOR EACH ROW EXECUTE FUNCTION public.tg_salon_booking_series_generate();

------------------------------------------------------------------------------
-- 5. Pause / resume / end RPCs. All gated by the owner-or-admin RLS on
--    salon_booking_series (we're using SECURITY DEFINER but pre-checking
--    ownership via has_role + store_profiles).
------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.salon_series_pause(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id UUID;
BEGIN
  SELECT store_id INTO v_store_id FROM public.salon_booking_series WHERE id = p_id;
  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'series not found';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.store_profiles sp
    WHERE sp.id = v_store_id
      AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.salon_booking_series
    SET paused_at = now()
    WHERE id = p_id AND paused_at IS NULL AND ended_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.salon_series_resume(p_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id UUID;
BEGIN
  SELECT store_id INTO v_store_id FROM public.salon_booking_series WHERE id = p_id;
  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'series not found';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.store_profiles sp
    WHERE sp.id = v_store_id
      AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.salon_booking_series
    SET paused_at = NULL
    WHERE id = p_id AND ended_at IS NULL;
  -- Top up the horizon once resumed.
  PERFORM public.salon_generate_series_bookings(p_id, 12);
END;
$$;

-- End the series. If p_cancel_future = true, cancel any future-dated
-- generated bookings still in active status. Past + completed occurrences
-- are left untouched.
CREATE OR REPLACE FUNCTION public.salon_series_end(
  p_id UUID,
  p_cancel_future BOOLEAN DEFAULT true
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_store_id UUID;
  v_cancelled INTEGER := 0;
BEGIN
  SELECT store_id INTO v_store_id FROM public.salon_booking_series WHERE id = p_id;
  IF v_store_id IS NULL THEN
    RAISE EXCEPTION 'series not found';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.store_profiles sp
    WHERE sp.id = v_store_id
      AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
  ) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  UPDATE public.salon_booking_series
    SET ended_at = now()
    WHERE id = p_id AND ended_at IS NULL;

  IF p_cancel_future THEN
    WITH cancelled AS (
      UPDATE public.salon_bookings
        SET status = 'cancelled',
            cancelled_at = now(),
            cancellation_reason = 'Series ended'
        WHERE series_id = p_id
          AND start_at > now()
          AND status IN ('pending', 'confirmed')
        RETURNING id
    )
    SELECT COUNT(*) INTO v_cancelled FROM cancelled;
  END IF;
  RETURN v_cancelled;
END;
$$;

GRANT EXECUTE ON FUNCTION public.salon_series_pause(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salon_series_resume(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.salon_series_end(UUID, BOOLEAN) TO authenticated;
