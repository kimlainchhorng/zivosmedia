-- cafe_reservations: lightweight table-booking ledger. The owner records
-- a future reserved_for time, optionally assigns a table, and tracks the
-- status as the booking moves through its lifecycle.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'cafe_reservation_status') THEN
    CREATE TYPE public.cafe_reservation_status AS ENUM
      ('pending', 'confirmed', 'seated', 'cancelled', 'no_show');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.cafe_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  table_id uuid REFERENCES public.cafe_tables(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  party_size integer NOT NULL DEFAULT 1 CHECK (party_size > 0),
  reserved_for timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60 CHECK (duration_minutes > 0),
  status public.cafe_reservation_status NOT NULL DEFAULT 'confirmed',
  notes text,
  created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_reservations_store_when_idx
  ON public.cafe_reservations(store_id, reserved_for);
CREATE INDEX IF NOT EXISTS cafe_reservations_table_idx
  ON public.cafe_reservations(table_id) WHERE table_id IS NOT NULL;

ALTER TABLE public.cafe_reservations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cafe_reservations_owner_manage ON public.cafe_reservations;
CREATE POLICY cafe_reservations_owner_manage ON public.cafe_reservations
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.store_profiles s WHERE s.id = cafe_reservations.store_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.store_profiles s WHERE s.id = cafe_reservations.store_id AND s.owner_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.cafe_reservations_touch_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS cafe_reservations_touch ON public.cafe_reservations;
CREATE TRIGGER cafe_reservations_touch
  BEFORE UPDATE ON public.cafe_reservations
  FOR EACH ROW EXECUTE FUNCTION public.cafe_reservations_touch_updated_at();
