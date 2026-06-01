-- Gate salon loyalty settings and manual events through salon-loyalty-manage.
-- Client self-read of their own loyalty events remains in the customer portal
-- migration policy; this file only replaces owner/admin write access.

ALTER TABLE public.salon_loyalty_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.salon_loyalty_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage loyalty settings - all" ON public.salon_loyalty_settings;
DROP POLICY IF EXISTS "Owners manage loyalty events - all" ON public.salon_loyalty_events;

DROP POLICY IF EXISTS "Owners read loyalty settings" ON public.salon_loyalty_settings;
CREATE POLICY "Owners read loyalty settings"
  ON public.salon_loyalty_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_loyalty_settings.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Owners read loyalty events" ON public.salon_loyalty_events;
CREATE POLICY "Owners read loyalty events"
  ON public.salon_loyalty_events
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_loyalty_events.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Salon loyalty settings inserts require trusted server-side validation" ON public.salon_loyalty_settings;
CREATE POLICY "Salon loyalty settings inserts require trusted server-side validation"
  ON public.salon_loyalty_settings
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon loyalty settings updates require trusted server-side validation" ON public.salon_loyalty_settings;
CREATE POLICY "Salon loyalty settings updates require trusted server-side validation"
  ON public.salon_loyalty_settings
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon loyalty settings deletes require trusted server-side validation" ON public.salon_loyalty_settings;
CREATE POLICY "Salon loyalty settings deletes require trusted server-side validation"
  ON public.salon_loyalty_settings
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

DROP POLICY IF EXISTS "Salon loyalty event inserts require trusted server-side validation" ON public.salon_loyalty_events;
CREATE POLICY "Salon loyalty event inserts require trusted server-side validation"
  ON public.salon_loyalty_events
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon loyalty event updates require trusted server-side validation" ON public.salon_loyalty_events;
CREATE POLICY "Salon loyalty event updates require trusted server-side validation"
  ON public.salon_loyalty_events
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon loyalty event deletes require trusted server-side validation" ON public.salon_loyalty_events;
CREATE POLICY "Salon loyalty event deletes require trusted server-side validation"
  ON public.salon_loyalty_events
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_loyalty_settings FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_loyalty_events FROM anon, authenticated;

GRANT SELECT ON TABLE public.salon_loyalty_settings TO authenticated;
GRANT SELECT ON TABLE public.salon_loyalty_events TO authenticated;
GRANT ALL ON TABLE public.salon_loyalty_settings TO service_role;
GRANT ALL ON TABLE public.salon_loyalty_events TO service_role;
