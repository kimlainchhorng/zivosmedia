-- Gate owner/admin salon reminder template override writes through
-- salon-reminder-template-manage.

ALTER TABLE public.salon_notification_template_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage their template overrides" ON public.salon_notification_template_overrides;

DROP POLICY IF EXISTS "Owners read notification template overrides" ON public.salon_notification_template_overrides;
CREATE POLICY "Owners read notification template overrides"
  ON public.salon_notification_template_overrides
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_notification_template_overrides.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Salon notification template override inserts require trusted server-side validation" ON public.salon_notification_template_overrides;
CREATE POLICY "Salon notification template override inserts require trusted server-side validation"
  ON public.salon_notification_template_overrides
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon notification template override updates require trusted server-side validation" ON public.salon_notification_template_overrides;
CREATE POLICY "Salon notification template override updates require trusted server-side validation"
  ON public.salon_notification_template_overrides
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon notification template override deletes require trusted server-side validation" ON public.salon_notification_template_overrides;
CREATE POLICY "Salon notification template override deletes require trusted server-side validation"
  ON public.salon_notification_template_overrides
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_notification_template_overrides FROM anon, authenticated;
GRANT SELECT ON TABLE public.salon_notification_template_overrides TO authenticated;
GRANT ALL ON TABLE public.salon_notification_template_overrides TO service_role;
