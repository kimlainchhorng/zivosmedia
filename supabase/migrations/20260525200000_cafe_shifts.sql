-- Cafe shifts — planned schedule blocks. Distinct from cafe_time_entries
-- (which is the actual clock-in/out log). The dashboard pairs scheduled
-- vs. actual to highlight late / no-show.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cafe_shift_status') THEN
    CREATE TYPE public.cafe_shift_status AS ENUM (
      'scheduled', 'in_progress', 'completed', 'no_show', 'cancelled'
    );
  END IF;
END$$;

CREATE TABLE IF NOT EXISTS public.cafe_shifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  barista_id UUID NOT NULL REFERENCES public.cafe_baristas(id) ON DELETE CASCADE,

  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT cafe_shifts_time_range CHECK (ends_at > starts_at),

  -- Optional role override for this shift ("barista" vs "kitchen" today).
  role TEXT CHECK (role IS NULL OR char_length(role) <= 40),

  status public.cafe_shift_status NOT NULL DEFAULT 'scheduled',

  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 500),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_shifts_store_starts_idx
  ON public.cafe_shifts (store_id, starts_at);
CREATE INDEX IF NOT EXISTS cafe_shifts_barista_starts_idx
  ON public.cafe_shifts (barista_id, starts_at);
CREATE INDEX IF NOT EXISTS cafe_shifts_upcoming_idx
  ON public.cafe_shifts (store_id, starts_at)
  WHERE status IN ('scheduled', 'in_progress');

DROP TRIGGER IF EXISTS cafe_shifts_set_updated_at ON public.cafe_shifts;
CREATE TRIGGER cafe_shifts_set_updated_at
  BEFORE UPDATE ON public.cafe_shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

ALTER TABLE public.cafe_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage cafe shifts - all"
  ON public.cafe_shifts
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_shifts.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_shifts.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Baristas read their own shifts"
  ON public.cafe_shifts
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.cafe_baristas b
      WHERE b.id = cafe_shifts.barista_id
        AND b.user_id = (SELECT auth.uid())
    )
  );
