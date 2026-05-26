-- Cafe time entries — one row per clock-in / clock-out pair. While a shift
-- is in progress `clock_out` is NULL. A trigger keeps `minutes_worked` in
-- sync when both ends are set so reports can read it directly.

CREATE TABLE IF NOT EXISTS public.cafe_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  barista_id UUID NOT NULL REFERENCES public.cafe_baristas(id) ON DELETE CASCADE,

  clock_in TIMESTAMPTZ NOT NULL DEFAULT now(),
  clock_out TIMESTAMPTZ,
  CONSTRAINT cafe_time_entries_order CHECK (clock_out IS NULL OR clock_out >= clock_in),

  -- Unpaid break time (minutes), subtracted from minutes_worked.
  break_minutes INTEGER NOT NULL DEFAULT 0 CHECK (break_minutes >= 0),

  -- Snapshotted from cafe_baristas.hourly_rate_cents at clock-in so a later
  -- rate change doesn't rewrite historical wages.
  hourly_rate_cents_snapshot INTEGER NOT NULL DEFAULT 0 CHECK (hourly_rate_cents_snapshot >= 0),

  -- Persisted so reports / Reports tab can sum without re-computing.
  minutes_worked INTEGER NOT NULL DEFAULT 0 CHECK (minutes_worked >= 0),

  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_time_entries_store_idx
  ON public.cafe_time_entries (store_id, clock_in DESC);
CREATE INDEX IF NOT EXISTS cafe_time_entries_barista_idx
  ON public.cafe_time_entries (barista_id, clock_in DESC);
-- At most one open shift per barista — the till "clock in" button can rely
-- on this to detect the current open entry.
CREATE UNIQUE INDEX IF NOT EXISTS cafe_time_entries_one_open_per_barista
  ON public.cafe_time_entries (barista_id) WHERE clock_out IS NULL;

DROP TRIGGER IF EXISTS cafe_time_entries_set_updated_at ON public.cafe_time_entries;
CREATE TRIGGER cafe_time_entries_set_updated_at
  BEFORE UPDATE ON public.cafe_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

-- Compute minutes_worked = (clock_out − clock_in − break_minutes) when
-- closed. Snapshot the barista's current hourly rate on insert.
CREATE OR REPLACE FUNCTION public.tg_cafe_time_entries_compute()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate INTEGER;
BEGIN
  IF TG_OP = 'INSERT' AND (NEW.hourly_rate_cents_snapshot IS NULL OR NEW.hourly_rate_cents_snapshot = 0) THEN
    SELECT hourly_rate_cents INTO v_rate
      FROM public.cafe_baristas
      WHERE id = NEW.barista_id;
    NEW.hourly_rate_cents_snapshot := COALESCE(v_rate, 0);
  END IF;

  IF NEW.clock_out IS NOT NULL THEN
    NEW.minutes_worked := GREATEST(0,
      FLOOR(EXTRACT(EPOCH FROM (NEW.clock_out - NEW.clock_in)) / 60.0)::INTEGER
      - COALESCE(NEW.break_minutes, 0)
    );
  ELSE
    NEW.minutes_worked := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_time_entries_compute ON public.cafe_time_entries;
CREATE TRIGGER cafe_time_entries_compute
  BEFORE INSERT OR UPDATE OF clock_in, clock_out, break_minutes, hourly_rate_cents_snapshot ON public.cafe_time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_time_entries_compute();

ALTER TABLE public.cafe_time_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage cafe time entries - all"
  ON public.cafe_time_entries
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_time_entries.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_time_entries.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Baristas can read their own time entries"
  ON public.cafe_time_entries
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cafe_baristas b
      WHERE b.id = cafe_time_entries.barista_id
        AND b.user_id = (SELECT auth.uid())
    )
  );
