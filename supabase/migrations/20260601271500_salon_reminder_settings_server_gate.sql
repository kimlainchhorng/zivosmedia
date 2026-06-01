-- Gate owner/admin salon reminder setting writes through salon-reminder-settings-update.
-- Owner/admin reads remain Data API-backed for the Reminders settings screen.

ALTER TABLE public.salon_reminder_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owners manage reminder settings - all" ON public.salon_reminder_settings;

DROP POLICY IF EXISTS "Owners read reminder settings" ON public.salon_reminder_settings;
CREATE POLICY "Owners read reminder settings"
  ON public.salon_reminder_settings
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_profiles sp
      WHERE sp.id = salon_reminder_settings.store_id
        AND sp.owner_id = (SELECT auth.uid())
    )
    OR public.has_role((SELECT auth.uid()), 'admin')
  );

DROP POLICY IF EXISTS "Salon reminder settings inserts require trusted server-side validation" ON public.salon_reminder_settings;
CREATE POLICY "Salon reminder settings inserts require trusted server-side validation"
  ON public.salon_reminder_settings
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon reminder settings updates require trusted server-side validation" ON public.salon_reminder_settings;
CREATE POLICY "Salon reminder settings updates require trusted server-side validation"
  ON public.salon_reminder_settings
  AS RESTRICTIVE
  FOR UPDATE
  TO authenticated
  USING (false)
  WITH CHECK (false);

DROP POLICY IF EXISTS "Salon reminder settings deletes require trusted server-side validation" ON public.salon_reminder_settings;
CREATE POLICY "Salon reminder settings deletes require trusted server-side validation"
  ON public.salon_reminder_settings
  AS RESTRICTIVE
  FOR DELETE
  TO authenticated
  USING (false);

REVOKE INSERT, UPDATE, DELETE ON TABLE public.salon_reminder_settings FROM anon, authenticated;
GRANT SELECT ON TABLE public.salon_reminder_settings TO authenticated;
GRANT ALL ON TABLE public.salon_reminder_settings TO service_role;
