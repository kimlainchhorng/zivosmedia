-- Salon stylists & specialists — the team that performs services.
-- Each stylist belongs to a store and can perform a subset of the store's
-- service menu (via salon_stylist_services). Bookings will link a customer to
-- a stylist + service + time slot.

CREATE TABLE IF NOT EXISTS public.salon_stylists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 1 AND 80),
  title TEXT CHECK (title IS NULL OR char_length(title) <= 60),
  bio TEXT CHECK (bio IS NULL OR char_length(bio) <= 500),
  photo_url TEXT,
  email TEXT CHECK (email IS NULL OR char_length(email) <= 254),
  phone TEXT CHECK (phone IS NULL OR char_length(phone) <= 30),

  commission_percent NUMERIC(5, 2) NOT NULL DEFAULT 0
    CHECK (commission_percent >= 0 AND commission_percent <= 100),

  -- Optional link to a user account when the stylist signs in via the app.
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_stylists_store_id_idx
  ON public.salon_stylists (store_id, sort_order);
CREATE INDEX IF NOT EXISTS salon_stylists_active_idx
  ON public.salon_stylists (store_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS salon_stylists_user_id_idx
  ON public.salon_stylists (user_id) WHERE user_id IS NOT NULL;

-- Junction: which services each stylist can perform.
CREATE TABLE IF NOT EXISTS public.salon_stylist_services (
  stylist_id UUID NOT NULL REFERENCES public.salon_stylists(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES public.salon_services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (stylist_id, service_id)
);

CREATE INDEX IF NOT EXISTS salon_stylist_services_service_idx
  ON public.salon_stylist_services (service_id);

-- Auto-update updated_at on stylists
CREATE OR REPLACE FUNCTION public.tg_salon_stylists_set_updated_at()
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

DROP TRIGGER IF EXISTS salon_stylists_set_updated_at ON public.salon_stylists;
CREATE TRIGGER salon_stylists_set_updated_at
  BEFORE UPDATE ON public.salon_stylists
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_salon_stylists_set_updated_at();

ALTER TABLE public.salon_stylists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_stylist_services ENABLE ROW LEVEL SECURITY;

-- Public read: active stylists at active stores (for the client-facing booking site).
CREATE POLICY "Public can view active salon stylists"
  ON public.salon_stylists
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_stylists.store_id
        AND sp.is_active = true
    )
  );

-- Owner / admin full management.
CREATE POLICY "Owners manage their stylists - select"
  ON public.salon_stylists
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_stylists.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage their stylists - insert"
  ON public.salon_stylists
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_stylists.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage their stylists - update"
  ON public.salon_stylists
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_stylists.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_stylists.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage their stylists - delete"
  ON public.salon_stylists
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_stylists.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

-- Junction-table RLS: same gate based on the parent stylist's store.
CREATE POLICY "Public can view stylist services"
  ON public.salon_stylist_services
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_stylists st
      WHERE st.id = salon_stylist_services.stylist_id
        AND st.is_active = true
    )
  );

CREATE POLICY "Owners manage stylist services - all"
  ON public.salon_stylist_services
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.salon_stylists st
      JOIN public.store_profiles sp ON sp.id = st.store_id
      WHERE st.id = salon_stylist_services.stylist_id
        AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.salon_stylists st
      JOIN public.store_profiles sp ON sp.id = st.store_id
      WHERE st.id = salon_stylist_services.stylist_id
        AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
    )
  );
