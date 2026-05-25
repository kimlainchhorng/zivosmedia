-- Salon services catalog — the menu of services a salon offers
-- (haircut, manicure, color, etc.) with duration and pricing. Used by
-- the Service Menu UI and, later, by Bookings and Checkout.

CREATE TABLE IF NOT EXISTS public.salon_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,

  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  description TEXT CHECK (description IS NULL OR char_length(description) <= 500),
  category TEXT CHECK (category IS NULL OR char_length(category) <= 40),

  duration_minutes INTEGER NOT NULL DEFAULT 30
    CHECK (duration_minutes BETWEEN 5 AND 480),
  price_cents INTEGER NOT NULL DEFAULT 0
    CHECK (price_cents >= 0),

  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS salon_services_store_id_idx
  ON public.salon_services (store_id, sort_order);
CREATE INDEX IF NOT EXISTS salon_services_active_idx
  ON public.salon_services (store_id) WHERE is_active = true;

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.tg_salon_services_set_updated_at()
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

DROP TRIGGER IF EXISTS salon_services_set_updated_at ON public.salon_services;
CREATE TRIGGER salon_services_set_updated_at
  BEFORE UPDATE ON public.salon_services
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_salon_services_set_updated_at();

ALTER TABLE public.salon_services ENABLE ROW LEVEL SECURITY;

-- Public can read ACTIVE services for active stores (for the client-facing site).
CREATE POLICY "Public can view active salon services"
  ON public.salon_services
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_services.store_id
        AND sp.is_active = true
    )
  );

-- Owners (and admins) can fully manage their own services.
CREATE POLICY "Owners manage their salon services - select"
  ON public.salon_services
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_services.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage their salon services - insert"
  ON public.salon_services
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_services.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage their salon services - update"
  ON public.salon_services
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_services.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_services.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

CREATE POLICY "Owners manage their salon services - delete"
  ON public.salon_services
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_services.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );
