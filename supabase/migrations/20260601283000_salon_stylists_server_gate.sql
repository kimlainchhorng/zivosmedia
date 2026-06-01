-- Gate owner/admin salon stylist roster and service-assignment mutations
-- through salon-stylist-manage.
-- Public active-stylist and stylist-service reads remain available for
-- booking surfaces.

ALTER TABLE public.salon_stylists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_stylist_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their stylists - insert" ON public.salon_stylists;
DROP POLICY IF EXISTS "Owners manage their stylists - update" ON public.salon_stylists;
DROP POLICY IF EXISTS "Owners manage their stylists - delete" ON public.salon_stylists;
DROP POLICY IF EXISTS "Owners manage stylist services - all" ON public.salon_stylist_services;

DROP POLICY IF EXISTS "Salon stylist inserts require trusted server-side validation" ON public.salon_stylists;
CREATE POLICY "Salon stylist inserts require trusted server-side validation"
  ON public.salon_stylists
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon stylist updates require trusted server-side validation" ON public.salon_stylists;
CREATE POLICY "Salon stylist updates require trusted server-side validation"
  ON public.salon_stylists
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon stylist deletes require trusted server-side validation" ON public.salon_stylists;
CREATE POLICY "Salon stylist deletes require trusted server-side validation"
  ON public.salon_stylists
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Salon stylist service inserts require trusted server-side validation" ON public.salon_stylist_services;
CREATE POLICY "Salon stylist service inserts require trusted server-side validation"
  ON public.salon_stylist_services
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon stylist service updates require trusted server-side validation" ON public.salon_stylist_services;
CREATE POLICY "Salon stylist service updates require trusted server-side validation"
  ON public.salon_stylist_services
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon stylist service deletes require trusted server-side validation" ON public.salon_stylist_services;
CREATE POLICY "Salon stylist service deletes require trusted server-side validation"
  ON public.salon_stylist_services
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_stylists FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_stylist_services FROM anon, authenticated;
GRANT SELECT ON TABLE public.salon_stylists TO anon, authenticated;
GRANT SELECT ON TABLE public.salon_stylist_services TO anon, authenticated;
GRANT ALL ON TABLE public.salon_stylists TO service_role;
GRANT ALL ON TABLE public.salon_stylist_services TO service_role;
