-- cafe_till_sessions: cash drawer lifecycle. Manager opens the till with a
-- starting float and closes it with a counted amount; we record what we
-- *expected* (start + net cash payments during the session) so the
-- variance can be audited.

CREATE TABLE IF NOT EXISTS public.cafe_till_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  opened_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  opened_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  closed_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  starting_cash_cents integer NOT NULL DEFAULT 0 CHECK (starting_cash_cents >= 0),
  expected_cash_cents integer,
  counted_cash_cents integer CHECK (counted_cash_cents IS NULL OR counted_cash_cents >= 0),
  variance_cents integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_till_sessions_store_idx ON public.cafe_till_sessions(store_id, opened_at DESC);
-- One open session per store at a time.
CREATE UNIQUE INDEX IF NOT EXISTS cafe_till_sessions_one_open_per_store
  ON public.cafe_till_sessions(store_id) WHERE status = 'open';

ALTER TABLE public.cafe_till_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cafe_till_sessions_owner_manage ON public.cafe_till_sessions;
CREATE POLICY cafe_till_sessions_owner_manage ON public.cafe_till_sessions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = cafe_till_sessions.store_id AND s.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles s
      WHERE s.id = cafe_till_sessions.store_id AND s.owner_id = auth.uid()
    )
  );

CREATE OR REPLACE FUNCTION public.cafe_till_sessions_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cafe_till_sessions_touch ON public.cafe_till_sessions;
CREATE TRIGGER cafe_till_sessions_touch
  BEFORE UPDATE ON public.cafe_till_sessions
  FOR EACH ROW EXECUTE FUNCTION public.cafe_till_sessions_touch_updated_at();
