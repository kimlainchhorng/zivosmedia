-- Gate salon package mutations through salon-package-manage.
-- Public active-package reads remain available for storefronts.

ALTER TABLE public.salon_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_package_services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage packages - all" ON public.salon_packages;
DROP POLICY IF EXISTS "Owners manage package services - all" ON public.salon_package_services;

DROP POLICY IF EXISTS "Owners read packages" ON public.salon_packages;
CREATE POLICY "Owners read packages"
  ON public.salon_packages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_packages.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Owners read package services" ON public.salon_package_services;
CREATE POLICY "Owners read package services"
  ON public.salon_package_services
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.salon_packages p
      JOIN public.store_profiles sp ON sp.id = p.store_id
      WHERE p.id = salon_package_services.package_id
        AND (sp.owner_id = (SELECT auth.uid()) OR public.has_role((SELECT auth.uid()), 'admin'))
    )
  );

DROP POLICY IF EXISTS "Salon package inserts require trusted server-side validation" ON public.salon_packages;
CREATE POLICY "Salon package inserts require trusted server-side validation"
  ON public.salon_packages
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon package updates require trusted server-side validation" ON public.salon_packages;
CREATE POLICY "Salon package updates require trusted server-side validation"
  ON public.salon_packages
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon package deletes require trusted server-side validation" ON public.salon_packages;
CREATE POLICY "Salon package deletes require trusted server-side validation"
  ON public.salon_packages
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Salon package service inserts require trusted server-side validation" ON public.salon_package_services;
CREATE POLICY "Salon package service inserts require trusted server-side validation"
  ON public.salon_package_services
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon package service updates require trusted server-side validation" ON public.salon_package_services;
CREATE POLICY "Salon package service updates require trusted server-side validation"
  ON public.salon_package_services
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon package service deletes require trusted server-side validation" ON public.salon_package_services;
CREATE POLICY "Salon package service deletes require trusted server-side validation"
  ON public.salon_package_services
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_packages FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_package_services FROM anon, authenticated;

GRANT SELECT ON TABLE public.salon_packages TO anon, authenticated;
GRANT SELECT ON TABLE public.salon_package_services TO anon, authenticated;
GRANT ALL ON TABLE public.salon_packages TO service_role;
GRANT ALL ON TABLE public.salon_package_services TO service_role;
