-- Cafe baristas — the staff roster for a cafe. Used by the shift schedule,
-- time clock, and tip pool. PIN is a short numeric secret the barista taps
-- at the till to identify themselves (optional — the owner may decide
-- everyone shares a login).

CREATE TABLE IF NOT EXISTS public.cafe_baristas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  role TEXT NOT NULL DEFAULT 'barista'
    CHECK (role IN ('owner', 'manager', 'barista', 'kitchen', 'server', 'other')),

  email TEXT,
  phone TEXT,
  photo_url TEXT,

  -- Hourly rate in cents — drives payroll. 0 is allowed for owners/volunteers.
  hourly_rate_cents INTEGER NOT NULL DEFAULT 0 CHECK (hourly_rate_cents >= 0),

  -- 4-digit till PIN. Stored as plain text; this is not a security boundary
  -- (the user must already be at the cafe's terminal), it's a quick-switch
  -- identifier. Marked unique per store so two staff can't collide.
  till_pin TEXT CHECK (till_pin IS NULL OR till_pin ~ '^[0-9]{4,6}$'),

  -- Optional link to a real Zivo user account (e.g. when staff log in via
  -- their phone and we want to attribute orders / time entries to them).
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Self-rating: e.g. "espresso", "latte art", "pastry". Free-form tags.
  specialties TEXT[] NOT NULL DEFAULT '{}',

  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,

  hired_on DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cafe_baristas_store_idx
  ON public.cafe_baristas (store_id, sort_order);
CREATE INDEX IF NOT EXISTS cafe_baristas_active_idx
  ON public.cafe_baristas (store_id) WHERE is_active = true;
CREATE UNIQUE INDEX IF NOT EXISTS cafe_baristas_store_pin_unique
  ON public.cafe_baristas (store_id, till_pin) WHERE till_pin IS NOT NULL;

DROP TRIGGER IF EXISTS cafe_baristas_set_updated_at ON public.cafe_baristas;
CREATE TRIGGER cafe_baristas_set_updated_at
  BEFORE UPDATE ON public.cafe_baristas
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_cafe_set_updated_at_generic();

ALTER TABLE public.cafe_baristas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage cafe baristas - all"
  ON public.cafe_baristas
  FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_baristas.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.store_profiles sp WHERE sp.id = cafe_baristas.store_id AND sp.owner_id = (SELECT auth.uid()))
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- A linked staff member can read their own row (for self-service later).
CREATE POLICY "Baristas can read their own row"
  ON public.cafe_baristas
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
