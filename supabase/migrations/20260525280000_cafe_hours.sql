-- Cafe opening hours — one row per (store, day_of_week). When no row
-- exists for a day, the cafe is treated as closed.
--   day_of_week: 0=Sun .. 6=Sat (matches Postgres EXTRACT(DOW)).
--   opens_at / closes_at are TIME (no timezone). The cafe's local
--   timezone lives on store_profiles; for now we treat hours as the
--   server's TIMESTAMP, which is fine for single-region deployments.
--
-- A row with is_open=true and closes_at < opens_at is interpreted as
-- "wraps past midnight" (e.g., open 22:00–02:00). The is_open_now RPC
-- handles both wrap and non-wrap cases.

CREATE TABLE IF NOT EXISTS public.cafe_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_open BOOLEAN NOT NULL DEFAULT true,
  opens_at TIME,
  closes_at TIME,
  CONSTRAINT cafe_hours_times_when_open CHECK (
    is_open = false OR (opens_at IS NOT NULL AND closes_at IS NOT NULL)
  ),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS cafe_hours_store_dow_unique
  ON public.cafe_hours (store_id, day_of_week);

DROP TRIGGER IF EXISTS cafe_hours_set_updated_at ON public.cafe_hours;
CREATE TRIGGER cafe_hours_set_updated_at
  BEFORE UPDATE ON public.cafe_hours
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

ALTER TABLE public.cafe_hours ENABLE ROW LEVEL SECURITY;

-- Anyone can read the schedule (so the storefront can show it without auth).
CREATE POLICY "Public reads cafe hours"
  ON public.cafe_hours
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_hours.store_id AND sp.is_active = true)
  );

CREATE POLICY "Owners manage cafe hours - all"
  ON public.cafe_hours
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_hours.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_hours.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- "Are we open right now?" — returns a single row with a boolean + the
-- current day's window so the UI can render "Open until 9:00 PM" too.
CREATE OR REPLACE FUNCTION public.cafe_is_open_now(p_store_id UUID)
RETURNS TABLE (
  is_open_now BOOLEAN,
  opens_at TIME,
  closes_at TIME,
  next_open_day SMALLINT,
  next_open_time TIME
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMP := now() AT TIME ZONE 'UTC';
  v_today_dow SMALLINT := EXTRACT(DOW FROM v_now)::SMALLINT;
  v_now_time TIME := v_now::TIME;
  v_today RECORD;
  v_next RECORD;
  v_open BOOLEAN := false;
  v_d SMALLINT;
BEGIN
  SELECT h.opens_at, h.closes_at, h.is_open INTO v_today
    FROM public.cafe_hours h
    WHERE h.store_id = p_store_id AND h.day_of_week = v_today_dow;

  IF v_today.is_open IS TRUE AND v_today.opens_at IS NOT NULL AND v_today.closes_at IS NOT NULL THEN
    IF v_today.closes_at > v_today.opens_at THEN
      -- Same-day window.
      v_open := v_now_time >= v_today.opens_at AND v_now_time < v_today.closes_at;
    ELSE
      -- Wraps past midnight.
      v_open := v_now_time >= v_today.opens_at OR v_now_time < v_today.closes_at;
    END IF;
  END IF;

  IF v_open THEN
    RETURN QUERY SELECT true, v_today.opens_at, v_today.closes_at, NULL::SMALLINT, NULL::TIME;
    RETURN;
  END IF;

  -- Find the next day (within the coming 7) that has an open window.
  FOR i IN 0..6 LOOP
    v_d := ((v_today_dow + i) % 7)::SMALLINT;
    SELECT h.opens_at, h.closes_at, h.is_open INTO v_next
      FROM public.cafe_hours h
      WHERE h.store_id = p_store_id AND h.day_of_week = v_d AND h.is_open = true;
    IF v_next.opens_at IS NOT NULL THEN
      -- Skip today's already-passed window.
      IF i = 0 AND v_next.opens_at <= v_now_time THEN
        CONTINUE;
      END IF;
      RETURN QUERY SELECT false, v_today.opens_at, v_today.closes_at, v_d, v_next.opens_at;
      RETURN;
    END IF;
  END LOOP;

  RETURN QUERY SELECT false, v_today.opens_at, v_today.closes_at, NULL::SMALLINT, NULL::TIME;
END;
$$;

REVOKE ALL ON FUNCTION public.cafe_is_open_now(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cafe_is_open_now(UUID) TO anon, authenticated;
