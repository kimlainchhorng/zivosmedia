-- Gate owner/admin salon service menu mutations through salon-service-manage.
-- Public active-service reads remain available for booking and salon profile
-- surfaces; owner/admin full reads remain available for the dashboard.

ALTER TABLE public.salon_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their salon services - insert" ON public.salon_services;
DROP POLICY IF EXISTS "Owners manage their salon services - update" ON public.salon_services;
DROP POLICY IF EXISTS "Owners manage their salon services - delete" ON public.salon_services;

DROP POLICY IF EXISTS "Salon service inserts require trusted server-side validation" ON public.salon_services;
CREATE POLICY "Salon service inserts require trusted server-side validation"
  ON public.salon_services
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon service updates require trusted server-side validation" ON public.salon_services;
CREATE POLICY "Salon service updates require trusted server-side validation"
  ON public.salon_services
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon service deletes require trusted server-side validation" ON public.salon_services;
CREATE POLICY "Salon service deletes require trusted server-side validation"
  ON public.salon_services
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_services FROM anon, authenticated;
GRANT SELECT ON TABLE public.salon_services TO anon, authenticated;
GRANT ALL ON TABLE public.salon_services TO service_role;
