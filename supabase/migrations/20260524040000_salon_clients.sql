-- Salon clients (customers) — the address book the salon uses to attach
-- bookings, service history, loyalty, and reminders to a real person.

CREATE TABLE IF NOT EXISTS public.salon_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 120),
  phone TEXT CHECK (phone IS NULL OR char_length(phone) <= 30),
  email TEXT CHECK (email IS NULL OR char_length(email) <= 254),
  birthday DATE,
  notes TEXT CHECK (notes IS NULL OR char_length(notes) <= 2000),

  preferred_stylist_id UUID REFERENCES public.salon_stylists(id) ON DELETE SET NULL,

  -- Optional link to the client's user account (if they book through the app).
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Soft flags
  is_blocked BOOLEAN NOT NULL DEFAULT false,

  -- Aggregates kept up to date by the bookings flow when we build it; manual
  -- edits via UI are also allowed so owners can pre-seed loyalty totals.
  visits_count INTEGER NOT NULL DEFAULT 0 CHECK (visits_count >= 0),
  total_spent_cents INTEGER NOT NULL DEFAULT 0 CHECK (total_spent_cents >= 0),
  last_visit_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_clients_store_id_idx
  ON public.salon_clients (store_id);
CREATE INDEX IF NOT EXISTS salon_clients_search_idx
  ON public.salon_clients USING gin (
    to_tsvector('simple', coalesce(display_name, '') || ' ' || coalesce(phone, '') || ' ' || coalesce(email, ''))
  );
CREATE INDEX IF NOT EXISTS salon_clients_user_id_idx
  ON public.salon_clients (user_id) WHERE user_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.tg_salon_clients_set_updated_at()
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

DROP TRIGGER IF EXISTS salon_clients_set_updated_at ON public.salon_clients;
CREATE TRIGGER salon_clients_set_updated_at
  BEFORE UPDATE ON public.salon_clients
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_salon_clients_set_updated_at();

ALTER TABLE public.salon_clients ENABLE ROW LEVEL SECURITY;

-- Clients are private to the salon — no public read.
CREATE POLICY "Owners manage their clients - select"
  ON public.salon_clients
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_clients.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage their clients - insert"
  ON public.salon_clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_clients.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage their clients - update"
  ON public.salon_clients
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_clients.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_clients.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage their clients - delete"
  ON public.salon_clients
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_clients.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- The client themselves can read their own row (when user_id is linked).
CREATE POLICY "Clients can view their own row"
  ON public.salon_clients
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));
